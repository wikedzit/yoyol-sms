import { and, asc, eq } from 'drizzle-orm';
import { academicYears } from '../database/academic-years';
import type { AppDatabase } from '../database/app-database';
import { formClasses } from '../database/academic-levels';
import { results } from '../database/assessment';
import { roles } from '../database/roles';
import { schoolMemberships } from '../database/school-memberships';
import { subject } from '../database/subjects';
import { teachers } from '../database/teachers';
import { teachingAssignments } from '../database/teaching-assignments';
import {
  describeTeachingAssignments,
  refusalToAssignTeaching,
  refusalToInviteStaff,
  refusalToRemoveStaff,
  refusalToUseStaffType,
} from '../kernel/staff';
import { requireSchoolId } from '../utils/require-owner-user';

export type StaffInput = {
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  staffType: string;
  qualification: string;
};

export default class StaffRecordService {
  constructor(
    private db: AppDatabase,
    private activeSchoolId: number | null = null,
    private currentUserId: number | null = null,
  ) {}

  async list(staffType: string | null): Promise<{
    id: number;
    name: string;
    staffType: string;
    email: string;
    phone: string;
    status: string;
  }[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const rows = await this.db
      .select()
      .from(teachers)
      .where(eq(teachers.schoolId, schoolId))
      .orderBy(asc(teachers.lastName), asc(teachers.firstName));
    return rows
      .filter((row) => staffType == null || staffType.length === 0 || row.staffType === staffType)
      .map((row) => ({
        id: row.id,
        name: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
        staffType: row.staffType,
        email: row.email,
        phone: row.phone,
        status: row.status,
      }));
  }

  async create(input: StaffInput): Promise<{ error: string } | { id: number }> {
    const staffType = refusalToUseStaffType(input.staffType);
    if (staffType) return { error: staffType };
    const name = this.names(input);
    if ('error' in name) return name;
    const schoolId = requireSchoolId(this.activeSchoolId);
    const now = Date.now();
    const created = await this.db.insert(teachers).values({
      firstName: name.firstName,
      middleName: blank(input.middleName),
      lastName: name.lastName,
      gender: input.gender.trim() || 'Female',
      phone: input.phone.trim(),
      email: input.email.trim(),
      address: input.address.trim(),
      qualification: blank(input.qualification),
      staffType: input.staffType,
      subject: input.staffType,
      status: 'Active',
      schoolId,
      createdAt: now,
      updatedAt: now,
    }).returning({ id: teachers.id });
    return { id: created[0]?.id ?? 0 };
  }

  async update(teacherId: number, input: StaffInput): Promise<{ error: string } | { id: number }> {
    const staffType = refusalToUseStaffType(input.staffType);
    if (staffType) return { error: staffType };
    const name = this.names(input);
    if ('error' in name) return name;
    const schoolId = requireSchoolId(this.activeSchoolId);
    const owned = await this.owned(schoolId, teacherId);
    if (!owned) return { error: 'That staff member was not found.' };
    await this.db.update(teachers).set({
      firstName: name.firstName,
      middleName: blank(input.middleName),
      lastName: name.lastName,
      gender: input.gender.trim() || owned.gender,
      phone: input.phone.trim(),
      email: input.email.trim(),
      address: input.address.trim(),
      qualification: blank(input.qualification),
      staffType: input.staffType,
      updatedAt: Date.now(),
    }).where(eq(teachers.id, teacherId));
    return { id: teacherId };
  }

  async setStatus(teacherId: number, status: string): Promise<{ error: string } | { id: number }> {
    if (status !== 'Active' && status !== 'Inactive') {
      return { error: 'Choose active or inactive.' };
    }
    const schoolId = requireSchoolId(this.activeSchoolId);
    if (!(await this.owned(schoolId, teacherId))) return { error: 'That staff member was not found.' };
    await this.db.update(teachers).set({ status, updatedAt: Date.now() }).where(eq(teachers.id, teacherId));
    return { id: teacherId };
  }

  async remove(teacherId: number): Promise<{ error: string } | { id: number }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    if (!(await this.owned(schoolId, teacherId))) return { error: 'That staff member was not found.' };
    const assignments = await this.db
      .select({ id: teachingAssignments.id })
      .from(teachingAssignments)
      .where(eq(teachingAssignments.teacherId, teacherId));
    const recorded = await this.db
      .select({ id: results.id })
      .from(results)
      .where(eq(results.teacherId, teacherId));
    const refusal = refusalToRemoveStaff({
      assignmentCount: assignments.length,
      resultCount: recorded.length,
    });
    if (refusal) return { error: refusal };
    await this.db.delete(teachers).where(eq(teachers.id, teacherId));
    return { id: teacherId };
  }

  async assignments(yearId: number | null, onlyTeacherId: number | null = null): Promise<string[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const rows = await this.db
      .select({
        teacherId: teachers.id,
        firstName: teachers.firstName,
        middleName: teachers.middleName,
        lastName: teachers.lastName,
        yearName: academicYears.name,
        yearId: academicYears.id,
        subjectName: subject.subjectName,
        className: formClasses.name,
      })
      .from(teachingAssignments)
      .innerJoin(teachers, eq(teachers.id, teachingAssignments.teacherId))
      .innerJoin(academicYears, eq(academicYears.id, teachingAssignments.academicYearId))
      .innerJoin(subject, eq(subject.id, teachingAssignments.subjectId))
      .innerJoin(formClasses, eq(formClasses.id, teachingAssignments.formClassId))
      .where(eq(teachingAssignments.schoolId, schoolId))
      .orderBy(asc(academicYears.name), asc(teachers.lastName));
    const visible = rows.filter((row) => (
      (yearId == null || row.yearId === yearId)
      && (onlyTeacherId == null || row.teacherId === onlyTeacherId)
    ));
    return describeTeachingAssignments(visible.map((row) => ({
      teacherName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
      yearName: row.yearName,
      subjectName: row.subjectName,
      className: row.className,
    })));
  }

  async assignmentRows(onlyTeacherId: number | null): Promise<{
    yearId: number;
    subjectId: number;
    formClassId: number;
  }[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const rows = await this.db
      .select({
        teacherId: teachingAssignments.teacherId,
        yearId: teachingAssignments.academicYearId,
        subjectId: teachingAssignments.subjectId,
        formClassId: teachingAssignments.formClassId,
      })
      .from(teachingAssignments)
      .where(eq(teachingAssignments.schoolId, schoolId));
    return rows.filter((row) => onlyTeacherId == null || row.teacherId === onlyTeacherId);
  }

  async assign(input: {
    teacherId: number;
    yearId: number;
    subjectId: number;
    formClassId: number;
  }): Promise<{ error: string } | { id: number }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    if (!(await this.owned(schoolId, input.teacherId))) return { error: 'That staff member was not found.' };
    const existing = await this.db
      .select({
        teacherId: teachingAssignments.teacherId,
        academicYearId: teachingAssignments.academicYearId,
        subjectId: teachingAssignments.subjectId,
        formClassId: teachingAssignments.formClassId,
      })
      .from(teachingAssignments)
      .where(eq(teachingAssignments.schoolId, schoolId));
    const refusal = refusalToAssignTeaching({
      existing,
      next: {
        teacherId: input.teacherId,
        academicYearId: input.yearId,
        subjectId: input.subjectId,
        formClassId: input.formClassId,
      },
    });
    if (refusal) return { error: refusal };
    const created = await this.db.insert(teachingAssignments).values({
      schoolId,
      teacherId: input.teacherId,
      academicYearId: input.yearId,
      subjectId: input.subjectId,
      formClassId: input.formClassId,
      createdAt: Date.now(),
    }).returning({ id: teachingAssignments.id });
    return { id: created[0]?.id ?? 0 };
  }

  async removeAssignment(assignmentId: number): Promise<{ error: string } | { id: number }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const row = await this.db
      .select({ id: teachingAssignments.id })
      .from(teachingAssignments)
      .where(and(eq(teachingAssignments.id, assignmentId), eq(teachingAssignments.schoolId, schoolId)))
      .get();
    if (!row) return { error: 'That assignment was not found.' };
    await this.db.delete(teachingAssignments).where(eq(teachingAssignments.id, assignmentId));
    return { id: assignmentId };
  }

  async assignmentChoices(): Promise<{ id: number; label: string }[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const rows = await this.db
      .select({
        id: teachingAssignments.id,
        firstName: teachers.firstName,
        lastName: teachers.lastName,
        yearName: academicYears.name,
        subjectName: subject.subjectName,
        className: formClasses.name,
      })
      .from(teachingAssignments)
      .innerJoin(teachers, eq(teachers.id, teachingAssignments.teacherId))
      .innerJoin(academicYears, eq(academicYears.id, teachingAssignments.academicYearId))
      .innerJoin(subject, eq(subject.id, teachingAssignments.subjectId))
      .innerJoin(formClasses, eq(formClasses.id, teachingAssignments.formClassId))
      .where(eq(teachingAssignments.schoolId, schoolId));
    return rows.map((row) => ({
      id: row.id,
      label: `${row.firstName} ${row.lastName}, ${row.yearName}: ${row.subjectName}, ${row.className}`,
    }));
  }

  async linkedTeacherId(): Promise<number | null> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    if (this.currentUserId == null) return null;
    const membership = await this.db
      .select({ teacherId: schoolMemberships.teacherId, roleKey: roles.key })
      .from(schoolMemberships)
      .innerJoin(roles, eq(roles.id, schoolMemberships.roleId))
      .where(and(
        eq(schoolMemberships.schoolId, schoolId),
        eq(schoolMemberships.userId, this.currentUserId),
        eq(schoolMemberships.status, 'active'),
      ))
      .get();
    if (!membership || membership.roleKey !== 'teacher') return null;
    return membership.teacherId;
  }

  async prepareInvite(teacherId: number): Promise<{ error: string } | { schoolId: number; email: string; roleId: number }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const teacher = await this.owned(schoolId, teacherId);
    if (!teacher) return { error: 'That staff member was not found.' };
    const linked = await this.db
      .select({ id: schoolMemberships.id })
      .from(schoolMemberships)
      .where(and(eq(schoolMemberships.schoolId, schoolId), eq(schoolMemberships.teacherId, teacherId)))
      .get();
    const refusal = refusalToInviteStaff({
      hasAccount: linked != null,
      email: teacher.email,
    });
    if (refusal) return { error: refusal };
    const role = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.schoolId, schoolId), eq(roles.key, 'teacher')))
      .get();
    if (!role) return { error: 'This school has no teacher role.' };
    return { schoolId, email: teacher.email.trim(), roleId: role.id };
  }

  private names(input: StaffInput): { error: string } | { firstName: string; lastName: string } {
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    if (firstName.length === 0 || lastName.length === 0) {
      return { error: 'Enter the staff name.' };
    }
    return { firstName, lastName };
  }

  private async owned(schoolId: number, teacherId: number) {
    return this.db
      .select({ id: teachers.id, email: teachers.email, gender: teachers.gender })
      .from(teachers)
      .where(and(eq(teachers.id, teacherId), eq(teachers.schoolId, schoolId)))
      .get();
  }
}

function blank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
