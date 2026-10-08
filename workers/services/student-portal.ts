import { and, asc, eq } from 'drizzle-orm';
import { formClasses } from '../database/academic-levels';
import { academicYears } from '../database/academic-years';
import type { AppDatabase } from '../database/app-database';
import { roles } from '../database/roles';
import { schoolMemberships } from '../database/school-memberships';
import { studentEnrolments } from '../database/student-enrolments';
import { studentYearSubjects } from '../database/student-year-subjects';
import { students } from '../database/students';
import { subject } from '../database/subjects';
import {
  describeStudentPortal,
  refusalToInviteStudent,
  refusalToOpenStudentPortal,
} from '../kernel/student-portal';
import { requireSchoolId } from '../utils/require-owner-user';

export default class StudentPortalService {
  constructor(
    private db: AppDatabase,
    private activeSchoolId: number | null = null,
    private currentUserId: number | null = null,
  ) {}

  async linkedStudentId(): Promise<number | null> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    if (this.currentUserId == null) {
      return null;
    }
    const membership = await this.db
      .select({ studentId: schoolMemberships.studentId })
      .from(schoolMemberships)
      .innerJoin(roles, eq(roles.id, schoolMemberships.roleId))
      .where(and(
        eq(schoolMemberships.schoolId, schoolId),
        eq(schoolMemberships.userId, this.currentUserId),
        eq(schoolMemberships.status, 'active'),
        eq(roles.key, 'student'),
      ))
      .get();
    return membership?.studentId ?? null;
  }

  async portal(studentId: number | null): Promise<{ error: string } | { lines: string[] }> {
    const refusal = refusalToOpenStudentPortal(studentId);
    if (refusal || studentId == null) {
      return { error: refusal ?? 'This account is not linked to a student.' };
    }
    const schoolId = requireSchoolId(this.activeSchoolId);
    const student = await this.db
      .select({
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
        gender: students.gender,
        dob: students.dob,
        enrollmentDate: students.enrollmentDate,
      })
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
      .get();
    if (!student) {
      return { error: 'That student was not found.' };
    }
    const year = await this.activeYear(schoolId);
    const enrolment = year ? await this.classForYear(studentId, year.id) : null;
    const subjectNames = year ? await this.subjectsForYear(studentId, year.id) : [];
    return {
      lines: describeStudentPortal({
        name: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' '),
        gender: student.gender,
        dateOfBirth: student.dob,
        admissionDate: student.enrollmentDate,
        yearName: year?.name ?? null,
        className: enrolment?.className ?? null,
        subjects: subjectNames,
      }),
    };
  }

  async inviteChoices(): Promise<{ id: number; name: string }[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const people = await this.db
      .select({
        id: students.id,
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
        email: students.email,
      })
      .from(students)
      .where(eq(students.schoolId, schoolId))
      .orderBy(asc(students.lastName), asc(students.firstName));
    const linked = await this.db
      .select({ studentId: schoolMemberships.studentId })
      .from(schoolMemberships)
      .where(eq(schoolMemberships.schoolId, schoolId));
    const taken = new Set(linked.flatMap((row) => row.studentId == null ? [] : [row.studentId]));
    return people
      .filter((person) => person.email && person.email.trim().length > 0 && !taken.has(person.id))
      .map((person) => ({
        id: person.id,
        name: [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' '),
      }));
  }

  async prepareInvite(studentId: number): Promise<{ error: string } | { schoolId: number; email: string; roleId: number }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const student = await this.db
      .select({ email: students.email })
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
      .get();
    if (!student) {
      return { error: 'That student was not found.' };
    }
    const linked = await this.db
      .select({ id: schoolMemberships.id })
      .from(schoolMemberships)
      .where(and(
        eq(schoolMemberships.schoolId, schoolId),
        eq(schoolMemberships.studentId, studentId),
      ))
      .get();
    const refusal = refusalToInviteStudent({
      email: student.email,
      alreadyLinked: Boolean(linked),
    });
    if (refusal) {
      return { error: refusal };
    }
    const role = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.schoolId, schoolId), eq(roles.key, 'student')))
      .get();
    if (!role) {
      return { error: 'This school has no student role.' };
    }
    return { schoolId, email: (student.email ?? '').trim(), roleId: role.id };
  }

  private async activeYear(schoolId: number) {
    return this.db
      .select({ id: academicYears.id, name: academicYears.name })
      .from(academicYears)
      .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.status, 'active')))
      .get();
  }

  private async classForYear(studentId: number, yearId: number) {
    return this.db
      .select({ className: formClasses.name })
      .from(studentEnrolments)
      .leftJoin(formClasses, eq(formClasses.id, studentEnrolments.formClassId))
      .where(and(
        eq(studentEnrolments.studentId, studentId),
        eq(studentEnrolments.academicYearId, yearId),
      ))
      .get();
  }

  private async subjectsForYear(studentId: number, yearId: number) {
    const rows = await this.db
      .select({ name: subject.subjectName })
      .from(studentYearSubjects)
      .innerJoin(subject, eq(subject.id, studentYearSubjects.subjectId))
      .where(and(
        eq(studentYearSubjects.studentId, studentId),
        eq(studentYearSubjects.academicYearId, yearId),
      ))
      .orderBy(asc(subject.subjectName));
    return rows.map((row) => row.name);
  }
}
