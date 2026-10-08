import { and, eq, inArray } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { roles } from '../database/roles';
import { schoolMemberships } from '../database/school-memberships';
import { guardianStudents, guardians } from '../database/guardians';
import { studentGuardians } from '../database/student-guardians';
import { studentsVisibleToParent } from '../kernel/guardian-accounts';
import { studentSubjects } from '../database/student-subjects';
import { students } from '../database/students';
import { academicYears } from '../database/academic-years';
import { studentEnrolments } from '../database/student-enrolments';
import { teachingAssignments } from '../database/teaching-assignments';
import { teacherFormClasses } from '../database/teacher-form-classes';
import { teacherSubjects } from '../database/teacher-subjects';
import { requireOwnerUserId } from 'workers/utils/require-owner-user';
import type { RecordScope } from './visible-records';

const limitedRoles = new Set(['teacher', 'student', 'parent']);

export default class RecordScopeService {
  constructor(
    private db: AppDatabase,
    private ownerUserId: number | null,
  ) {}

  async forSchool(schoolId: number): Promise<RecordScope> {
    const userId = requireOwnerUserId(this.ownerUserId);
    const membership = await this.db
      .select({
        roleKey: roles.key,
        teacherId: schoolMemberships.teacherId,
        studentId: schoolMemberships.studentId,
        userId: schoolMemberships.userId,
      })
      .from(schoolMemberships)
      .innerJoin(roles, eq(roles.id, schoolMemberships.roleId))
      .where(
        and(
          eq(schoolMemberships.schoolId, schoolId),
          eq(schoolMemberships.userId, userId),
          eq(schoolMemberships.status, 'active'),
        ),
      )
      .get();

    if (!membership || !limitedRoles.has(membership.roleKey)) {
      return { kind: 'school' };
    }

    if (membership.roleKey === 'teacher') {
      return this.teacherScope(schoolId, membership.teacherId);
    }
    if (membership.roleKey === 'student') {
      return this.studentScope(membership.studentId);
    }
    return this.parentScope(schoolId, membership.userId);
  }

  private async teacherScope(schoolId: number, teacherId: number | null): Promise<RecordScope> {
    if (teacherId == null) {
      return emptyScope();
    }

    const activeYear = await this.db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.status, 'active')))
      .get();
    if (activeYear) {
      const yearRows = await this.db
        .select({
          formClassId: teachingAssignments.formClassId,
          subjectId: teachingAssignments.subjectId,
        })
        .from(teachingAssignments)
        .where(and(
          eq(teachingAssignments.teacherId, teacherId),
          eq(teachingAssignments.academicYearId, activeYear.id),
        ));
      if (yearRows.length > 0) {
        const classIds = [...new Set(yearRows.map((row) => row.formClassId))];
        const studentRows = await this.db
          .select({ id: studentEnrolments.studentId })
          .from(studentEnrolments)
          .where(and(
            eq(studentEnrolments.academicYearId, activeYear.id),
            inArray(studentEnrolments.formClassId, classIds),
            inArray(studentEnrolments.status, ['enrolled', 'promoted']),
          ));
        return {
          kind: 'limited',
          teacherIds: [teacherId],
          classIds,
          subjectIds: [...new Set(yearRows.map((row) => row.subjectId))],
          studentIds: [...new Set(studentRows.map((row) => row.id))],
        };
      }
    }

    const classRows = await this.db
      .select({ id: teacherFormClasses.formClassId })
      .from(teacherFormClasses)
      .where(eq(teacherFormClasses.teacherId, teacherId));
    const subjectRows = await this.db
      .select({ id: teacherSubjects.subjectId })
      .from(teacherSubjects)
      .where(eq(teacherSubjects.teacherId, teacherId));
    const classIds = classRows.map((row) => row.id);
    const studentRows = classIds.length === 0
      ? []
      : await this.db
        .select({ id: students.id })
        .from(students)
        .where(inArray(students.formClassId, classIds));

    return {
      kind: 'limited',
      teacherIds: [teacherId],
      classIds,
      subjectIds: subjectRows.map((row) => row.id),
      studentIds: studentRows.map((row) => row.id),
    };
  }

  private async studentScope(studentId: number | null): Promise<RecordScope> {
    if (studentId == null) {
      return emptyScope();
    }

    const student = await this.db
      .select({ formClassId: students.formClassId })
      .from(students)
      .where(eq(students.id, studentId))
      .get();
    const subjectRows = await this.db
      .select({ id: studentSubjects.subjectId })
      .from(studentSubjects)
      .where(eq(studentSubjects.studentId, studentId));

    return {
      kind: 'limited',
      teacherIds: [],
      classIds: student?.formClassId ? [student.formClassId] : [],
      subjectIds: subjectRows.map((row) => row.id),
      studentIds: [studentId],
    };
  }

  private async parentScope(schoolId: number, userId: number): Promise<RecordScope> {
    const accountLinks = await this.db
      .select({ studentId: studentGuardians.studentId })
      .from(studentGuardians)
      .where(
        and(
          eq(studentGuardians.schoolId, schoolId),
          eq(studentGuardians.userId, userId),
        ),
      );
    const guardianLinks = await this.db
      .select({ studentId: guardianStudents.studentId })
      .from(guardianStudents)
      .innerJoin(guardians, eq(guardians.id, guardianStudents.guardianId))
      .where(and(eq(guardians.schoolId, schoolId), eq(guardians.userId, userId)));
    const schoolStudents = await this.db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.schoolId, schoolId));
    const studentIds = studentsVisibleToParent({
      linkedStudentIds: [...accountLinks, ...guardianLinks].map((link) => link.studentId),
      requestedStudentIds: schoolStudents.map((student) => student.id),
    });
    if (studentIds.length === 0) {
      return emptyScope();
    }

    const studentRows = await this.db
      .select({ id: students.id, formClassId: students.formClassId })
      .from(students)
      .where(inArray(students.id, studentIds));
    const subjectRows = await this.db
      .select({ id: studentSubjects.subjectId })
      .from(studentSubjects)
      .where(inArray(studentSubjects.studentId, studentIds));

    return {
      kind: 'limited',
      teacherIds: [],
      classIds: studentRows.flatMap((student) => student.formClassId ? [student.formClassId] : []),
      subjectIds: subjectRows.map((row) => row.id),
      studentIds: studentRows.map((student) => student.id),
    };
  }
}

function emptyScope(): RecordScope {
  return {
    kind: 'limited',
    studentIds: [],
    classIds: [],
    subjectIds: [],
    teacherIds: [],
  };
}
