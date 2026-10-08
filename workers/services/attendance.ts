import { and, asc, eq } from 'drizzle-orm';
import { academicYears, terms } from '../database/academic-years';
import type { AppDatabase } from '../database/app-database';
import { formClasses } from '../database/academic-levels';
import { attendanceRecords } from '../database/attendance';
import { guardianStudents, guardians } from '../database/guardians';
import { studentEnrolments } from '../database/student-enrolments';
import { studentGuardians } from '../database/student-guardians';
import { students } from '../database/students';
import {
  attendanceRate,
  describeAttendance,
  refusalToMarkClosedDay,
  refusalToUseAttendanceStatus,
  statusesForClass,
} from '../kernel/attendance';
import type { RecordScope } from './visible-records';
import { requireSchoolId } from '../utils/require-owner-user';

const defaultEditableDays = 7;

type AttendanceDeps = {
  scope: () => Promise<RecordScope>;
  canWrite: () => Promise<boolean>;
  setting: (key: string) => Promise<string | null>;
  saveSetting: (key: string, value: string) => Promise<void>;
  notify: (input: { userId: number; title: string; body: string }) => Promise<void>;
  publishAbsent: (input: { recordId: number; studentId: number; attendanceDate: string }) => Promise<void>;
};

export default class AttendanceRecordService {
  constructor(
    private db: AppDatabase,
    private activeSchoolId: number | null = null,
    private currentUserId: number | null = null,
    private deps: AttendanceDeps,
  ) {}

  async canWrite(): Promise<boolean> {
    if (await this.deps.canWrite()) return true;
    const teacherId = await this.assignedTeacherId();
    return teacherId != null;
  }

  async canManage(): Promise<boolean> {
    return this.deps.canWrite();
  }

  async classes(): Promise<{ id: number; name: string }[]> {
    requireSchoolId(this.activeSchoolId);
    const rows = await this.db
      .select({ id: formClasses.id, name: formClasses.name })
      .from(formClasses)
      .orderBy(asc(formClasses.name));
    const allowed = await this.allowedClassIds();
    return allowed == null ? rows : rows.filter((row) => allowed.has(row.id));
  }

  async summary(): Promise<string[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const term = await this.currentTerm(schoolId);
    if (!term) return [];
    const rows = await this.db
      .select({
        studentId: students.id,
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
        status: attendanceRecords.status,
      })
      .from(attendanceRecords)
      .innerJoin(students, eq(students.id, attendanceRecords.studentId))
      .where(and(eq(attendanceRecords.schoolId, schoolId), eq(attendanceRecords.termId, term.id)));
    const allowed = await this.allowedStudentIds();
    return describeAttendance(summarise(rows.filter((row) => allowed == null || allowed.has(row.studentId)), term.name));
  }

  async roll(classId: number, date: string): Promise<{
    error?: string;
    className: string;
    date: string;
    students: { id: number; name: string; status: string; comment: string }[];
  }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const allowed = await this.allowedClassIds();
    if (allowed && !allowed.has(classId)) {
      return { error: 'You can record attendance only for your assigned class.', className: '', date, students: [] };
    }
    const formClass = await this.db
      .select({ name: formClasses.name })
      .from(formClasses)
      .where(eq(formClasses.id, classId))
      .get();
    if (!formClass) {
      return { error: 'That class was not found.', className: '', date, students: [] };
    }
    const year = await this.activeYear(schoolId);
    const people = year ? await this.classStudents(classId, year.id) : [];
    const marked = await this.db
      .select({
        studentId: attendanceRecords.studentId,
        status: attendanceRecords.status,
        comment: attendanceRecords.comment,
      })
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.schoolId, schoolId), eq(attendanceRecords.attendanceDate, date)));
    const byStudent = new Map(marked.map((row) => [row.studentId, row]));
    const visible = await this.allowedStudentIds();
    return {
      className: formClass.name,
      date,
      students: people
        .filter((person) => visible == null || visible.has(person.id))
        .map((person) => ({
          id: person.id,
          name: person.name,
          status: byStudent.get(person.id)?.status ?? '',
          comment: byStudent.get(person.id)?.comment ?? '',
        })),
    };
  }

  async today(): Promise<string> {
    return new Date().toISOString().slice(0, 10);
  }

  async settings(): Promise<{ editableDays: string; absenceAlerts: string }> {
    const days = await this.deps.setting('editableDays');
    const alerts = await this.deps.setting('absenceAlerts');
    return {
      editableDays: days && days.length > 0 ? days : String(defaultEditableDays),
      absenceAlerts: alerts === 'on' ? 'on' : 'off',
    };
  }

  async mark(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const action = fields._action;
    if (action === 'settings') return this.saveSettings(fields);
    if (action === 'class-present') {
      return this.markClassPresent(Number(fields.classId), fields.date ?? '');
    }
    return this.markStudent({
      studentId: Number(fields.studentId),
      classId: Number(fields.classId),
      date: fields.date ?? '',
      status: fields.status ?? '',
      comment: fields.comment ?? '',
    });
  }

  async profileLines(studentId: number | null): Promise<string[]> {
    if (studentId == null) return this.summary();
    const lines = await this.summary();
    const schoolId = requireSchoolId(this.activeSchoolId);
    const student = await this.db
      .select({ firstName: students.firstName, middleName: students.middleName, lastName: students.lastName })
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
      .get();
    if (!student) return [];
    const name = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
    return lines.filter((line) => line.startsWith(`${name},`) || line.startsWith(`${name}:`));
  }

  async dashboardLines(): Promise<string[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const today = await this.today();
    const rows = await this.db
      .select({ status: attendanceRecords.status })
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.schoolId, schoolId), eq(attendanceRecords.attendanceDate, today)));
    if (rows.length === 0) return [];
    const counts = countStatuses(rows.map((row) => row.status));
    return [`${today}: ${counts.present} present, ${counts.absent} absent, ${counts.late} late, ${attendanceRate(counts)}%`];
  }

  private async markClassPresent(classId: number, date: string): Promise<{ error: string } | { ok: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const year = await this.activeYear(schoolId);
    if (!year) return { error: 'Choose an active academic year before recording attendance.' };
    const people = await this.classStudents(classId, year.id);
    const plan = statusesForClass({ studentIds: people.map((person) => person.id), exceptions: {} });
    for (const row of plan) {
      const saved = await this.markStudent({
        studentId: row.studentId,
        classId,
        date,
        status: row.status,
        comment: '',
      });
      if ('error' in saved) return saved;
    }
    return { ok: true };
  }

  private async markStudent(input: {
    studentId: number;
    classId: number;
    date: string;
    status: string;
    comment: string;
  }): Promise<{ error: string } | { ok: true }> {
    const status = refusalToUseAttendanceStatus(input.status);
    if (status) return { error: status };
    if (!(await this.canWrite())) return { error: 'You do not have permission to record attendance.' };
    const schoolId = requireSchoolId(this.activeSchoolId);
    const allowed = await this.allowedClassIds();
    if (allowed && !allowed.has(input.classId)) {
      return { error: 'You can record attendance only for your assigned class.' };
    }
    const settings = await this.settings();
    const closed = refusalToMarkClosedDay({
      attendanceDate: input.date,
      today: await this.today(),
      editableDays: Number(settings.editableDays),
    });
    if (closed) return { error: closed };
    const year = await this.activeYear(schoolId);
    const term = await this.currentTerm(schoolId);
    if (!year || !term) return { error: 'Choose an active academic year before recording attendance.' };
    const existing = await this.db
      .select({ id: attendanceRecords.id, status: attendanceRecords.status })
      .from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.schoolId, schoolId),
        eq(attendanceRecords.studentId, input.studentId),
        eq(attendanceRecords.attendanceDate, input.date),
      ))
      .get();
    const now = Date.now();
    const teacherId = await this.assignedTeacherId();
    let recordId = existing?.id ?? 0;
    if (existing) {
      await this.db.update(attendanceRecords).set({
        status: input.status,
        comment: blank(input.comment),
        formClassId: input.classId,
        termId: term.id,
        teacherId,
        updatedAt: now,
      }).where(eq(attendanceRecords.id, existing.id));
    } else {
      const created = await this.db.insert(attendanceRecords).values({
        schoolId,
        studentId: input.studentId,
        formClassId: input.classId,
        academicYearId: year.id,
        termId: term.id,
        attendanceDate: input.date,
        status: input.status,
        comment: blank(input.comment),
        teacherId,
        createdAt: now,
        updatedAt: now,
        createdBy: this.currentUserId,
      }).returning({ id: attendanceRecords.id });
      recordId = created[0]?.id ?? 0;
    }
    if (input.status === 'absent' && existing?.status !== 'absent') {
      await this.deps.publishAbsent({
        recordId,
        studentId: input.studentId,
        attendanceDate: input.date,
      });
      if (settings.absenceAlerts === 'on') {
        await this.tellGuardians(schoolId, input.studentId, input.date);
      }
    }
    return { ok: true };
  }

  private async saveSettings(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    if (!(await this.canManage())) return { error: 'You do not have permission to change attendance settings.' };
    const days = Number(fields.editableDays);
    if (!Number.isInteger(days) || days < 0 || days > 365) {
      return { error: 'Choose how many days attendance stays editable.' };
    }
    await this.deps.saveSetting('editableDays', String(days));
    await this.deps.saveSetting('absenceAlerts', fields.absenceAlerts === 'on' ? 'on' : 'off');
    return { ok: true };
  }

  private async tellGuardians(schoolId: number, studentId: number, date: string) {
    const primary = await this.db
      .select({ userId: guardians.userId })
      .from(guardianStudents)
      .innerJoin(guardians, eq(guardians.id, guardianStudents.guardianId))
      .where(and(
        eq(guardianStudents.schoolId, schoolId),
        eq(guardianStudents.studentId, studentId),
        eq(guardianStudents.isPrimary, true),
      ));
    const linked = await this.db
      .select({ userId: studentGuardians.userId })
      .from(studentGuardians)
      .where(and(eq(studentGuardians.schoolId, schoolId), eq(studentGuardians.studentId, studentId)));
    const primaryIds = primary.flatMap((row) => row.userId == null ? [] : [row.userId]);
    const userIds = primaryIds.length > 0
      ? primaryIds
      : linked.flatMap((row) => row.userId == null ? [] : [row.userId]);
    const student = await this.db
      .select({ firstName: students.firstName, lastName: students.lastName })
      .from(students)
      .where(eq(students.id, studentId))
      .get();
    const name = student ? `${student.firstName} ${student.lastName}` : 'A student';
    for (const userId of [...new Set(userIds)]) {
      await this.deps.notify({
        userId,
        title: 'Absent',
        body: `${name} was marked absent on ${date}.`,
      });
    }
  }

  private async allowedClassIds(): Promise<Set<number> | null> {
    const scope = await this.deps.scope();
    if (scope.kind === 'school') return null;
    if (scope.teacherIds.length > 0) return new Set(scope.classIds);
    const schoolId = requireSchoolId(this.activeSchoolId);
    const year = await this.activeYear(schoolId);
    if (!year || scope.studentIds.length === 0) return new Set();
    const allowedStudents = new Set(scope.studentIds);
    const rows = await this.db
      .select({
        studentId: studentEnrolments.studentId,
        formClassId: studentEnrolments.formClassId,
      })
      .from(studentEnrolments)
      .where(and(
        eq(studentEnrolments.academicYearId, year.id),
        eq(studentEnrolments.schoolId, schoolId),
      ));
    return new Set(rows.flatMap((row) => (
      row.formClassId != null && allowedStudents.has(row.studentId) ? [row.formClassId] : []
    )));
  }

  private async allowedStudentIds(): Promise<Set<number> | null> {
    const scope = await this.deps.scope();
    if (scope.kind === 'school') return null;
    return new Set(scope.studentIds);
  }

  private async assignedTeacherId(): Promise<number | null> {
    const scope = await this.deps.scope();
    if (scope.kind === 'school' || scope.teacherIds.length === 0) return null;
    return scope.teacherIds[0] ?? null;
  }

  private async activeYear(schoolId: number) {
    return this.db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.status, 'active')))
      .get();
  }

  private async currentTerm(schoolId: number) {
    return this.db
      .select({ id: terms.id, name: terms.name })
      .from(terms)
      .where(and(eq(terms.schoolId, schoolId), eq(terms.isCurrent, true)))
      .get();
  }

  private async classStudents(classId: number, yearId: number): Promise<{ id: number; name: string }[]> {
    const rows = await this.db
      .select({
        id: students.id,
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
        status: studentEnrolments.status,
      })
      .from(studentEnrolments)
      .innerJoin(students, eq(students.id, studentEnrolments.studentId))
      .where(and(
        eq(studentEnrolments.formClassId, classId),
        eq(studentEnrolments.academicYearId, yearId),
      ))
      .orderBy(asc(students.lastName));
    return rows
      .filter((row) => row.status === 'enrolled' || row.status === 'promoted')
      .map((row) => ({
        id: row.id,
        name: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
      }));
  }
}

function blank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function countStatuses(statuses: string[]): { present: number; absent: number; late: number } {
  return {
    present: statuses.filter((status) => status === 'present').length,
    absent: statuses.filter((status) => status === 'absent').length,
    late: statuses.filter((status) => status === 'late').length,
  };
}

function summarise(rows: { studentId: number; firstName: string; middleName: string | null; lastName: string; status: string }[], termName: string) {
  const grouped = new Map<number, { studentName: string; present: number; absent: number; late: number }>();
  for (const row of rows) {
    const current = grouped.get(row.studentId) ?? {
      studentName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
      present: 0,
      absent: 0,
      late: 0,
    };
    if (row.status === 'present' || row.status === 'absent' || row.status === 'late') {
      current[row.status] += 1;
    }
    grouped.set(row.studentId, current);
  }
  return [...grouped.values()].map((row) => ({ ...row, termName }));
}
