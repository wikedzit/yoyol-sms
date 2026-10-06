import { and, eq, inArray } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { roles } from '../database/roles';
import { schoolMemberships } from '../database/school-memberships';
import { studentGuardians } from '../database/student-guardians';
import { studentSubjects } from '../database/student-subjects';
import { students } from '../database/students';
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
      return this.teacherScope(membership.teacherId);
    }
    if (membership.roleKey === 'student') {
      return this.studentScope(membership.studentId);
    }
    return this.parentScope(schoolId, membership.userId);
  }

  private async teacherScope(teacherId: number | null): Promise<RecordScope> {
    if (teacherId == null) {
      return emptyScope();
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
    const links = await this.db
      .select({ studentId: studentGuardians.studentId })
      .from(studentGuardians)
      .where(
        and(
          eq(studentGuardians.schoolId, schoolId),
          eq(studentGuardians.userId, userId),
        ),
      );
    const studentIds = links.map((link) => link.studentId);
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
