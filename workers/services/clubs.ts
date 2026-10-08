import { and, asc, eq, inArray } from 'drizzle-orm';
import { academicYears } from '../database/academic-years';
import type { AppDatabase } from '../database/app-database';
import { clubActivities, clubMemberships, clubs } from '../database/clubs';
import { roles } from '../database/roles';
import { schoolMemberships } from '../database/school-memberships';
import { studentEnrolments } from '../database/student-enrolments';
import { students } from '../database/students';
import { teachers } from '../database/teachers';
import {
  canSeeClub,
  describeActivity,
  describeClub,
  refusalToCloseClub,
  refusalToEnrol,
  refusalToSaveActivity,
  refusalToSaveClub,
  type ClubActivity,
  type ClubMember,
  type ClubRecord,
  type ClubsPage,
} from '../kernel/clubs';
import { requireSchoolId } from '../utils/require-owner-user';
import type { RecordScope } from './visible-records';

type ClubDeps = {
  scope: () => Promise<RecordScope>;
  canManage: () => Promise<boolean>;
};

type Viewer = {
  role: 'admin' | 'teacher' | 'student' | 'guardian' | 'other';
  teacherId: number | null;
  studentIds: number[];
};

export default class ClubService {
  constructor(
    private db: AppDatabase,
    private activeSchoolId: number | null = null,
    private currentUserId: number | null = null,
    private deps: ClubDeps,
  ) {}

  async open(): Promise<ClubsPage> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const viewer = await this.viewer(schoolId);
    const year = await this.activeYear(schoolId);
    const memberships = year ? await this.membershipRows(schoolId, year.id) : [];
    const membersByClub = new Map<number, number[]>();
    for (const member of memberships) {
      const list = membersByClub.get(member.clubId) ?? [];
      list.push(member.studentId);
      membersByClub.set(member.clubId, list);
    }
    const visible = (await this.clubRows(schoolId, viewer)).filter((club) => canSeeClub({
      role: viewer.role,
      isPatron: viewer.teacherId != null && club.patronId === viewer.teacherId,
      member: (membersByClub.get(club.id) ?? []).some((studentId) => viewer.studentIds.includes(studentId)),
    }));
    const visibleIds = new Set(visible.map((club) => club.id));
    const activities = (await this.activityRows(schoolId)).filter((activity) => visibleIds.has(activity.clubId));
    return {
      canManage: viewer.role === 'admin',
      clubs: visible,
      members: memberships.filter((member) => visibleIds.has(member.clubId)),
      activities,
      students: await this.studentChoices(schoolId),
      teachers: await this.teacherChoices(schoolId),
    };
  }

  async save(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const action = fields._action;
    if (action === 'club' || action === 'close' || action === 'enrol' || action === 'remove-member') {
      if (!(await this.deps.canManage())) return { error: 'You do not have permission to change clubs.' };
      if (action === 'club') return this.saveClub(fields);
      if (action === 'close') return this.closeClub(Number(fields.clubId));
      if (action === 'enrol') return this.enrol(Number(fields.clubId), Number(fields.studentId));
      return this.removeMember(Number(fields.membershipId));
    }
    if (action === 'activity') return this.saveActivity(fields);
    if (action === 'remove-activity') return this.removeActivity(Number(fields.activityId));
    return { error: 'That club action is not available.' };
  }

  private async saveClub(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const name = fields.name?.trim() ?? '';
    const description = fields.description?.trim() ?? '';
    const refused = refusalToSaveClub({ name, description });
    if (refused) return { error: refused };
    const schoolId = requireSchoolId(this.activeSchoolId);
    const clubId = Number(fields.clubId);
    const patronId = Number(fields.patronId);
    if (!patronId) return { error: 'Choose a patron.' };
    const taken = await this.db.select({ id: clubs.id }).from(clubs)
      .where(and(eq(clubs.schoolId, schoolId), eq(clubs.name, name))).get();
    if (taken && taken.id !== clubId) return { error: 'That club name is already in use.' };
    const now = Date.now();
    if (clubId > 0) {
      const existing = await this.oneClub(schoolId, clubId);
      if (!existing) return { error: 'That club was not found.' };
      if (existing.closed) return { error: 'This club is closed.' };
      await this.db.update(clubs).set({ name, description, patronId, updatedAt: now }).where(and(
        eq(clubs.id, clubId),
        eq(clubs.schoolId, schoolId),
      ));
      return { ok: true };
    }
    await this.db.insert(clubs).values({
      schoolId,
      name,
      description,
      patronId,
      closed: false,
      createdAt: now,
      updatedAt: now,
      createdBy: this.currentUserId,
    });
    return { ok: true };
  }

  private async closeClub(clubId: number): Promise<{ error: string } | { ok: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const club = await this.oneClub(schoolId, clubId);
    if (!club) return { error: 'That club was not found.' };
    const refused = refusalToCloseClub(club.closed);
    if (refused) return { error: refused };
    await this.db.update(clubs).set({ closed: true, updatedAt: Date.now() }).where(and(
      eq(clubs.id, club.id),
      eq(clubs.schoolId, schoolId),
    ));
    return { ok: true };
  }

  private async enrol(clubId: number, studentId: number): Promise<{ error: string } | { ok: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const year = await this.activeYear(schoolId);
    if (!year) return { error: 'Choose an active academic year before adding a member.' };
    const club = await this.oneClub(schoolId, clubId);
    if (!club) return { error: 'That club was not found.' };
    const existing = await this.db.select({ id: clubMemberships.id }).from(clubMemberships).where(and(
      eq(clubMemberships.schoolId, schoolId),
      eq(clubMemberships.clubId, clubId),
      eq(clubMemberships.studentId, studentId),
      eq(clubMemberships.academicYearId, year.id),
    )).get();
    const refused = refusalToEnrol({ closed: club.closed, alreadyMember: Boolean(existing) });
    if (refused) return { error: refused };
    if (!studentId) return { error: 'Choose a student.' };
    const now = Date.now();
    await this.db.insert(clubMemberships).values({
      schoolId,
      clubId,
      studentId,
      academicYearId: year.id,
      createdAt: now,
      updatedAt: now,
      createdBy: this.currentUserId,
    });
    return { ok: true };
  }

  private async removeMember(membershipId: number): Promise<{ error: string } | { ok: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    await this.db.delete(clubMemberships).where(and(
      eq(clubMemberships.id, membershipId),
      eq(clubMemberships.schoolId, schoolId),
    ));
    return { ok: true };
  }

  private async saveActivity(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const activityId = Number(fields.activityId);
    const existing = activityId > 0 ? await this.oneActivity(schoolId, activityId) : null;
    if (activityId > 0 && !existing) return { error: 'That activity was not found.' };
    const clubId = Number(fields.clubId || existing?.clubId);
    const club = await this.oneClub(schoolId, clubId);
    if (!club) return { error: 'That club was not found.' };
    const viewer = await this.viewer(schoolId);
    const canWrite = viewer.role === 'admin' || (viewer.role === 'teacher' && viewer.teacherId === club.patronId);
    const refused = refusalToSaveActivity({
      title: fields.title ?? '',
      description: fields.description ?? '',
      activityDate: fields.activityDate || existing?.activityDate || '',
      closed: club.closed,
      canWrite,
    });
    if (refused) return { error: refused };
    const now = Date.now();
    const values = {
      clubId,
      title: fields.title.trim(),
      description: fields.description.trim(),
      activityDate: fields.activityDate || existing?.activityDate || '',
      updatedAt: now,
    };
    if (existing) {
      await this.db.update(clubActivities).set(values).where(and(
        eq(clubActivities.id, existing.id),
        eq(clubActivities.schoolId, schoolId),
      ));
      return { ok: true };
    }
    await this.db.insert(clubActivities).values({
      ...values,
      schoolId,
      teacherId: viewer.teacherId,
      createdAt: now,
      createdBy: this.currentUserId,
    });
    return { ok: true };
  }

  private async removeActivity(activityId: number): Promise<{ error: string } | { ok: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const activity = await this.oneActivity(schoolId, activityId);
    if (!activity) return { error: 'That activity was not found.' };
    const club = await this.oneClub(schoolId, activity.clubId);
    const viewer = await this.viewer(schoolId);
    const canWrite = viewer.role === 'admin' || (club != null && viewer.role === 'teacher' && viewer.teacherId === club.patronId);
    if (!canWrite) return { error: 'Only the club patron can change its activities.' };
    await this.db.delete(clubActivities).where(and(
      eq(clubActivities.id, activity.id),
      eq(clubActivities.schoolId, schoolId),
    ));
    return { ok: true };
  }

  private async clubRows(schoolId: number, viewer: Viewer): Promise<ClubRecord[]> {
    const rows = await this.db
      .select({
        id: clubs.id,
        name: clubs.name,
        description: clubs.description,
        patronId: clubs.patronId,
        closed: clubs.closed,
        firstName: teachers.firstName,
        middleName: teachers.middleName,
        lastName: teachers.lastName,
      })
      .from(clubs)
      .innerJoin(teachers, eq(teachers.id, clubs.patronId))
      .where(eq(clubs.schoolId, schoolId))
      .orderBy(asc(clubs.name));
    return rows.map((row) => {
      const canWrite = !row.closed && (
        viewer.role === 'admin' || (viewer.role === 'teacher' && viewer.teacherId === row.patronId)
      );
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        patronId: row.patronId,
        closed: row.closed,
        canWrite,
        line: describeClub({
          name: row.name,
          patronName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
          closed: row.closed,
        }),
      };
    });
  }

  private async membershipRows(schoolId: number, yearId: number): Promise<ClubMember[]> {
    const rows = await this.db
      .select({
        id: clubMemberships.id,
        clubId: clubMemberships.clubId,
        studentId: clubMemberships.studentId,
        clubName: clubs.name,
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
      })
      .from(clubMemberships)
      .innerJoin(clubs, eq(clubs.id, clubMemberships.clubId))
      .innerJoin(students, eq(students.id, clubMemberships.studentId))
      .where(and(eq(clubMemberships.schoolId, schoolId), eq(clubMemberships.academicYearId, yearId)))
      .orderBy(asc(students.lastName));
    return rows.map((row) => ({
      id: row.id,
      clubId: row.clubId,
      studentId: row.studentId,
      line: `${[row.firstName, row.middleName, row.lastName].filter(Boolean).join(' ')}, ${row.clubName}`,
    }));
  }

  private async activityRows(schoolId: number): Promise<ClubActivity[]> {
    const rows = await this.db
      .select({
        id: clubActivities.id,
        clubId: clubActivities.clubId,
        title: clubActivities.title,
        description: clubActivities.description,
        activityDate: clubActivities.activityDate,
        clubName: clubs.name,
        closed: clubs.closed,
        patronId: clubs.patronId,
      })
      .from(clubActivities)
      .innerJoin(clubs, eq(clubs.id, clubActivities.clubId))
      .where(eq(clubActivities.schoolId, schoolId))
      .orderBy(asc(clubActivities.activityDate));
    const viewer = await this.viewer(schoolId);
    return rows.map((row) => ({
      id: row.id,
      clubId: row.clubId,
      title: row.title,
      description: row.description,
      activityDate: row.activityDate,
      canWrite: !row.closed && (viewer.role === 'admin' || (viewer.role === 'teacher' && viewer.teacherId === row.patronId)),
      line: describeActivity({ activityDate: row.activityDate, title: row.title, clubName: row.clubName }),
    }));
  }

  private async viewer(schoolId: number): Promise<Viewer> {
    const scope = await this.deps.scope();
    if (await this.deps.canManage()) return { role: 'admin', teacherId: null, studentIds: [] };
    const roleKey = await this.roleKey(schoolId);
    if (roleKey === 'teacher' && scope.kind === 'limited' && scope.teacherIds[0]) {
      return { role: 'teacher', teacherId: scope.teacherIds[0], studentIds: [] };
    }
    if ((roleKey === 'student' || roleKey === 'parent') && scope.kind === 'limited') {
      return {
        role: roleKey === 'student' ? 'student' : 'guardian',
        teacherId: null,
        studentIds: scope.studentIds,
      };
    }
    return { role: 'other', teacherId: null, studentIds: [] };
  }

  private async roleKey(schoolId: number): Promise<string | null> {
    if (this.currentUserId == null) return null;
    const row = await this.db
      .select({ key: roles.key })
      .from(schoolMemberships)
      .innerJoin(roles, eq(roles.id, schoolMemberships.roleId))
      .where(and(
        eq(schoolMemberships.schoolId, schoolId),
        eq(schoolMemberships.userId, this.currentUserId),
        eq(schoolMemberships.status, 'active'),
      ))
      .get();
    return row?.key ?? null;
  }

  private async oneClub(schoolId: number, clubId: number) {
    return this.db.select({
      id: clubs.id,
      closed: clubs.closed,
      patronId: clubs.patronId,
    }).from(clubs).where(and(eq(clubs.id, clubId), eq(clubs.schoolId, schoolId))).get();
  }

  private async oneActivity(schoolId: number, activityId: number) {
    return this.db.select({
      id: clubActivities.id,
      clubId: clubActivities.clubId,
      activityDate: clubActivities.activityDate,
    }).from(clubActivities).where(and(
      eq(clubActivities.id, activityId),
      eq(clubActivities.schoolId, schoolId),
    )).get();
  }

  private async activeYear(schoolId: number) {
    return this.db.select({ id: academicYears.id }).from(academicYears)
      .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.status, 'active'))).get();
  }

  private async studentChoices(schoolId: number) {
    const year = await this.activeYear(schoolId);
    if (!year) return [];
    const enrolled = await this.db.select({ studentId: studentEnrolments.studentId }).from(studentEnrolments).where(and(
      eq(studentEnrolments.schoolId, schoolId),
      eq(studentEnrolments.academicYearId, year.id),
      inArray(studentEnrolments.status, ['enrolled', 'promoted']),
    ));
    const ids = [...new Set(enrolled.map((row) => row.studentId))];
    if (ids.length === 0) return [];
    const rows = await this.db.select({
      id: students.id,
      firstName: students.firstName,
      middleName: students.middleName,
      lastName: students.lastName,
    }).from(students).where(inArray(students.id, ids)).orderBy(asc(students.lastName));
    return rows.map((row) => ({
      id: row.id,
      name: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
    }));
  }

  private async teacherChoices(schoolId: number) {
    const rows = await this.db.select({
      id: teachers.id,
      firstName: teachers.firstName,
      middleName: teachers.middleName,
      lastName: teachers.lastName,
    }).from(teachers).where(eq(teachers.schoolId, schoolId)).orderBy(asc(teachers.lastName));
    return rows.map((row) => ({
      id: row.id,
      name: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
    }));
  }
}
