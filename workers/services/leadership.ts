import { and, asc, eq, inArray } from 'drizzle-orm';
import { academicYears } from '../database/academic-years';
import type { AppDatabase } from '../database/app-database';
import { leadershipAppointments, leadershipPositions } from '../database/leadership';
import { roles } from '../database/roles';
import { schoolMemberships } from '../database/school-memberships';
import { studentEnrolments } from '../database/student-enrolments';
import { students } from '../database/students';
import {
  canSeeAppointment,
  describeAppointment,
  describeHolder,
  isCurrentHolder,
  refusalToAppoint,
  refusalToEndAppointment,
  refusalToSavePosition,
  type LeadershipAppointment,
  type LeadershipPage,
} from '../kernel/leadership';
import { requireSchoolId } from '../utils/require-owner-user';
import type { RecordScope } from './visible-records';

type LeadershipDeps = {
  scope: () => Promise<RecordScope>;
  canManage: () => Promise<boolean>;
};

type Viewer = {
  role: 'admin' | 'student' | 'other';
  studentIds: number[];
};

export default class LeadershipService {
  constructor(
    private db: AppDatabase,
    private activeSchoolId: number | null = null,
    private currentUserId: number | null = null,
    private deps: LeadershipDeps,
  ) {}

  async open(): Promise<LeadershipPage> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const viewer = await this.viewer();
    const today = new Date().toISOString().slice(0, 10);
    const rows = await this.appointmentRows(schoolId, today);
    const appointments = rows.filter((appointment) => canSeeAppointment({
      role: viewer.role,
      ownStudent: viewer.studentIds.includes(appointment.studentId),
    }));
    const holders = rows.filter((appointment) => appointment.current).map((appointment) => appointment.holderLine);
    return {
      canManage: viewer.role === 'admin',
      positions: await this.positionRows(schoolId),
      appointments,
      holders,
      students: await this.studentChoices(schoolId),
    };
  }

  async save(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    if (!(await this.deps.canManage())) return { error: 'You do not have permission to change leadership.' };
    const action = fields._action;
    if (action === 'position') return this.savePosition(fields.name ?? '', Number(fields.positionId));
    if (action === 'retire') return this.retirePosition(Number(fields.positionId));
    if (action === 'appoint') return this.appoint(fields);
    if (action === 'end') return this.endAppointment(Number(fields.appointmentId));
    return { error: 'That leadership action is not available.' };
  }

  private async savePosition(name: string, positionId: number): Promise<{ error: string } | { ok: true }> {
    const refused = refusalToSavePosition(name);
    if (refused) return { error: refused };
    const schoolId = requireSchoolId(this.activeSchoolId);
    const trimmed = name.trim();
    const taken = await this.db.select({ id: leadershipPositions.id }).from(leadershipPositions)
      .where(and(eq(leadershipPositions.schoolId, schoolId), eq(leadershipPositions.name, trimmed))).get();
    if (taken && taken.id !== positionId) return { error: 'That position name is already in use.' };
    const now = Date.now();
    if (positionId > 0) {
      await this.db.update(leadershipPositions).set({ name: trimmed, updatedAt: now }).where(and(
        eq(leadershipPositions.id, positionId),
        eq(leadershipPositions.schoolId, schoolId),
      ));
      return { ok: true };
    }
    await this.db.insert(leadershipPositions).values({
      schoolId,
      name: trimmed,
      retired: false,
      createdAt: now,
      updatedAt: now,
      createdBy: this.currentUserId,
    });
    return { ok: true };
  }

  private async retirePosition(positionId: number): Promise<{ error: string } | { ok: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    await this.db.update(leadershipPositions).set({ retired: true, updatedAt: Date.now() }).where(and(
      eq(leadershipPositions.id, positionId),
      eq(leadershipPositions.schoolId, schoolId),
    ));
    return { ok: true };
  }

  private async appoint(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const year = await this.activeYear(schoolId);
    if (!year) return { error: 'Choose an active academic year before making an appointment.' };
    const positionId = Number(fields.positionId);
    const studentId = Number(fields.studentId);
    const position = await this.db.select({ retired: leadershipPositions.retired }).from(leadershipPositions)
      .where(and(eq(leadershipPositions.id, positionId), eq(leadershipPositions.schoolId, schoolId))).get();
    if (!position) return { error: 'Choose a position.' };
    const open = await this.db.select({ id: leadershipAppointments.id }).from(leadershipAppointments).where(and(
      eq(leadershipAppointments.schoolId, schoolId),
      eq(leadershipAppointments.academicYearId, year.id),
      eq(leadershipAppointments.positionId, positionId),
      eq(leadershipAppointments.studentId, studentId),
      eq(leadershipAppointments.ended, false),
    )).get();
    const refused = refusalToAppoint({
      retired: position.retired,
      startsOn: fields.startsOn ?? '',
      endsOn: fields.endsOn ?? '',
      alreadyOpen: Boolean(open),
    });
    if (refused) return { error: refused };
    if (!studentId) return { error: 'Choose a student.' };
    const now = Date.now();
    await this.db.insert(leadershipAppointments).values({
      schoolId,
      positionId,
      studentId,
      academicYearId: year.id,
      startsOn: fields.startsOn,
      endsOn: fields.endsOn,
      ended: false,
      createdAt: now,
      updatedAt: now,
      createdBy: this.currentUserId,
    });
    return { ok: true };
  }

  private async endAppointment(appointmentId: number): Promise<{ error: string } | { ok: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const appointment = await this.db.select({
      id: leadershipAppointments.id,
      ended: leadershipAppointments.ended,
    }).from(leadershipAppointments).where(and(
      eq(leadershipAppointments.id, appointmentId),
      eq(leadershipAppointments.schoolId, schoolId),
    )).get();
    if (!appointment) return { error: 'That appointment was not found.' };
    const refused = refusalToEndAppointment(appointment.ended);
    if (refused) return { error: refused };
    await this.db.update(leadershipAppointments).set({ ended: true, updatedAt: Date.now() }).where(and(
      eq(leadershipAppointments.id, appointment.id),
      eq(leadershipAppointments.schoolId, schoolId),
    ));
    return { ok: true };
  }

  private async positionRows(schoolId: number) {
    return this.db.select({
      id: leadershipPositions.id,
      name: leadershipPositions.name,
      retired: leadershipPositions.retired,
    }).from(leadershipPositions).where(eq(leadershipPositions.schoolId, schoolId)).orderBy(asc(leadershipPositions.name));
  }

  private async appointmentRows(schoolId: number, today: string): Promise<LeadershipAppointment[]> {
    const year = await this.activeYear(schoolId);
    if (!year) return [];
    const rows = await this.db.select({
      id: leadershipAppointments.id,
      positionId: leadershipAppointments.positionId,
      studentId: leadershipAppointments.studentId,
      startsOn: leadershipAppointments.startsOn,
      endsOn: leadershipAppointments.endsOn,
      ended: leadershipAppointments.ended,
      positionName: leadershipPositions.name,
      firstName: students.firstName,
      middleName: students.middleName,
      lastName: students.lastName,
    }).from(leadershipAppointments)
      .innerJoin(leadershipPositions, eq(leadershipPositions.id, leadershipAppointments.positionId))
      .innerJoin(students, eq(students.id, leadershipAppointments.studentId))
      .where(and(
        eq(leadershipAppointments.schoolId, schoolId),
        eq(leadershipAppointments.academicYearId, year.id),
      ))
      .orderBy(asc(leadershipAppointments.startsOn));
    return rows.map((row) => {
      const studentName = [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' ');
      const current = isCurrentHolder({
        ended: row.ended,
        startsOn: row.startsOn,
        endsOn: row.endsOn,
        today,
      });
      return {
        id: row.id,
        positionId: row.positionId,
        studentId: row.studentId,
        startsOn: row.startsOn,
        endsOn: row.endsOn,
        ended: row.ended,
        current,
        line: describeAppointment({
          studentName,
          positionName: row.positionName,
          startsOn: row.startsOn,
          endsOn: row.endsOn,
          ended: row.ended,
        }),
        holderLine: describeHolder({ studentName, positionName: row.positionName }),
      };
    });
  }

  private async viewer(): Promise<Viewer> {
    if (await this.deps.canManage()) return { role: 'admin', studentIds: [] };
    const schoolId = requireSchoolId(this.activeSchoolId);
    const scope = await this.deps.scope();
    const roleKey = await this.roleKey(schoolId);
    if (roleKey === 'student' && scope.kind === 'limited') {
      return { role: 'student', studentIds: scope.studentIds };
    }
    return { role: 'other', studentIds: [] };
  }

  private async roleKey(schoolId: number): Promise<string | null> {
    if (this.currentUserId == null) return null;
    const row = await this.db.select({ key: roles.key }).from(schoolMemberships)
      .innerJoin(roles, eq(roles.id, schoolMemberships.roleId))
      .where(and(
        eq(schoolMemberships.schoolId, schoolId),
        eq(schoolMemberships.userId, this.currentUserId),
        eq(schoolMemberships.status, 'active'),
      )).get();
    return row?.key ?? null;
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
}
