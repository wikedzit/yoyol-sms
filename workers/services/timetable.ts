import { and, asc, eq } from 'drizzle-orm';
import { academicYears } from '../database/academic-years';
import type { AppDatabase } from '../database/app-database';
import { formClasses } from '../database/academic-levels';
import { studentEnrolments } from '../database/student-enrolments';
import { subject } from '../database/subjects';
import { teachers } from '../database/teachers';
import { timetableEntries, timetablePeriods } from '../database/timetable';
import {
  describeLesson,
  lessonsForViewer,
  refusalToBook,
  refusalToRemovePeriod,
  refusalToSavePeriod,
  weekDays,
  type TimetablePage,
} from '../kernel/timetable';
import type { RecordScope } from './visible-records';
import { requireSchoolId } from '../utils/require-owner-user';

type TimetableDeps = {
  scope: () => Promise<RecordScope>;
  canWrite: () => Promise<boolean>;
};

export default class TimetableService {
  constructor(
    private db: AppDatabase,
    private activeSchoolId: number | null = null,
    private currentUserId: number | null = null,
    private deps: TimetableDeps,
  ) {}

  async open(): Promise<TimetablePage> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const lessons = await this.lessonRows(schoolId);
    const viewer = await this.viewerFilter(schoolId);
    return {
      canWrite: await this.deps.canWrite(),
      periods: await this.periodRows(schoolId),
      lessons: lessonsForViewer({ lessons, ...viewer }),
      subjects: await this.subjectChoices(schoolId),
      teachers: await this.teacherChoices(schoolId),
      classes: await this.classChoices(),
    };
  }

  async profileLines(studentId: number | null): Promise<string[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const lessons = await this.lessonRows(schoolId);
    if (studentId == null) {
      const viewer = await this.viewerFilter(schoolId);
      return lessonsForViewer({ lessons, ...viewer }).map((lesson) => lesson.line);
    }
    const classIds = await this.classesForStudents(schoolId, [studentId]);
    return lessonsForViewer({ lessons, teacherIds: null, classIds }).map((lesson) => lesson.line);
  }

  async save(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    if (!(await this.deps.canWrite())) {
      return { error: 'You do not have permission to change the timetable.' };
    }
    const action = fields._action;
    if (action === 'period') return this.savePeriod(fields);
    if (action === 'remove-period') return this.removePeriod(Number(fields.periodId));
    if (action === 'lesson') return this.saveLesson(fields);
    if (action === 'remove-lesson') return this.removeLesson(Number(fields.lessonId));
    return { error: 'That timetable action is not available.' };
  }

  private async savePeriod(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const name = fields.name?.trim() ?? '';
    const startsAt = fields.startsAt?.trim() ?? '';
    const endsAt = fields.endsAt?.trim() ?? '';
    const refused = refusalToSavePeriod({ name, startsAt, endsAt });
    if (refused) return { error: refused };
    const schoolId = requireSchoolId(this.activeSchoolId);
    const periodId = Number(fields.periodId);
    const taken = await this.db
      .select({ id: timetablePeriods.id })
      .from(timetablePeriods)
      .where(and(eq(timetablePeriods.schoolId, schoolId), eq(timetablePeriods.name, name)))
      .get();
    if (taken && taken.id !== periodId) return { error: 'That period name is already in use.' };
    const now = Date.now();
    if (periodId > 0) {
      await this.db.update(timetablePeriods).set({ name, startsAt, endsAt, updatedAt: now }).where(and(
        eq(timetablePeriods.id, periodId),
        eq(timetablePeriods.schoolId, schoolId),
      ));
      return { ok: true };
    }
    await this.db.insert(timetablePeriods).values({
      schoolId,
      name,
      startsAt,
      endsAt,
      createdAt: now,
      updatedAt: now,
      createdBy: this.currentUserId,
    });
    return { ok: true };
  }

  private async removePeriod(periodId: number): Promise<{ error: string } | { ok: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const used = await this.db
      .select({ id: timetableEntries.id })
      .from(timetableEntries)
      .where(and(eq(timetableEntries.schoolId, schoolId), eq(timetableEntries.periodId, periodId)))
      .get();
    const refused = refusalToRemovePeriod(used ? 1 : 0);
    if (refused) return { error: refused };
    await this.db.delete(timetablePeriods).where(and(
      eq(timetablePeriods.id, periodId),
      eq(timetablePeriods.schoolId, schoolId),
    ));
    return { ok: true };
  }

  private async saveLesson(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const year = await this.db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.status, 'active')))
      .get();
    if (!year) return { error: 'Choose an active academic year before placing a lesson.' };
    const subjectId = Number(fields.subjectId);
    const teacherId = Number(fields.teacherId);
    const classId = Number(fields.formClassId);
    const periodId = Number(fields.periodId);
    const day = fields.day ?? '';
    if (!subjectId || !teacherId || !classId || !periodId) {
      return { error: 'Choose a subject, teacher, class, day, and period.' };
    }
    const sameSlot = await this.db
      .select({ teacherId: timetableEntries.teacherId, formClassId: timetableEntries.formClassId })
      .from(timetableEntries)
      .where(and(
        eq(timetableEntries.schoolId, schoolId),
        eq(timetableEntries.academicYearId, year.id),
        eq(timetableEntries.day, day),
        eq(timetableEntries.periodId, periodId),
      ));
    const refused = refusalToBook({
      day,
      teacherBooked: sameSlot.some((row) => row.teacherId === teacherId),
      classBooked: sameSlot.some((row) => row.formClassId === classId),
    });
    if (refused) return { error: refused };
    const now = Date.now();
    await this.db.insert(timetableEntries).values({
      schoolId,
      academicYearId: year.id,
      formClassId: classId,
      subjectId,
      teacherId,
      day,
      periodId,
      createdAt: now,
      updatedAt: now,
      createdBy: this.currentUserId,
    });
    return { ok: true };
  }

  private async removeLesson(lessonId: number): Promise<{ error: string } | { ok: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    await this.db.delete(timetableEntries).where(and(
      eq(timetableEntries.id, lessonId),
      eq(timetableEntries.schoolId, schoolId),
    ));
    return { ok: true };
  }

  private async lessonRows(schoolId: number) {
    const year = await this.db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.status, 'active')))
      .get();
    if (!year) return [];
    const rows = await this.db
      .select({
        id: timetableEntries.id,
        day: timetableEntries.day,
        teacherId: timetableEntries.teacherId,
        classId: timetableEntries.formClassId,
        startsAt: timetablePeriods.startsAt,
        periodName: timetablePeriods.name,
        subjectName: subject.subjectName,
        className: formClasses.name,
        firstName: teachers.firstName,
        middleName: teachers.middleName,
        lastName: teachers.lastName,
      })
      .from(timetableEntries)
      .innerJoin(timetablePeriods, eq(timetablePeriods.id, timetableEntries.periodId))
      .innerJoin(subject, eq(subject.id, timetableEntries.subjectId))
      .innerJoin(formClasses, eq(formClasses.id, timetableEntries.formClassId))
      .innerJoin(teachers, eq(teachers.id, timetableEntries.teacherId))
      .where(and(eq(timetableEntries.schoolId, schoolId), eq(timetableEntries.academicYearId, year.id)))
      .orderBy(asc(timetablePeriods.startsAt));
    return rows
      .slice()
      .sort((left, right) => weekDays.indexOf(left.day as (typeof weekDays)[number]) - weekDays.indexOf(right.day as (typeof weekDays)[number])
        || left.startsAt.localeCompare(right.startsAt))
      .map((row) => ({
        id: row.id,
        day: row.day,
        teacherId: row.teacherId,
        classId: row.classId,
        line: describeLesson({
          day: row.day,
          startsAt: row.startsAt,
          periodName: row.periodName,
          subjectName: row.subjectName,
          className: row.className,
          teacherName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
        }),
      }));
  }

  private async periodRows(schoolId: number) {
    return this.db
      .select({
        id: timetablePeriods.id,
        name: timetablePeriods.name,
        startsAt: timetablePeriods.startsAt,
        endsAt: timetablePeriods.endsAt,
      })
      .from(timetablePeriods)
      .where(eq(timetablePeriods.schoolId, schoolId))
      .orderBy(asc(timetablePeriods.startsAt));
  }

  private async subjectChoices(schoolId: number) {
    const rows = await this.db
      .select({ id: subject.id, name: subject.subjectName })
      .from(subject)
      .where(eq(subject.schoolId, schoolId))
      .orderBy(asc(subject.subjectName));
    return rows;
  }

  private async teacherChoices(schoolId: number) {
    const rows = await this.db
      .select({
        id: teachers.id,
        firstName: teachers.firstName,
        middleName: teachers.middleName,
        lastName: teachers.lastName,
      })
      .from(teachers)
      .where(eq(teachers.schoolId, schoolId))
      .orderBy(asc(teachers.lastName));
    return rows.map((row) => ({
      id: row.id,
      name: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
    }));
  }

  private async classChoices() {
    return this.db
      .select({ id: formClasses.id, name: formClasses.name })
      .from(formClasses)
      .orderBy(asc(formClasses.name));
  }

  private async viewerFilter(schoolId: number): Promise<{ teacherIds: number[] | null; classIds: number[] | null }> {
    const scope = await this.deps.scope();
    if (scope.kind === 'school') return { teacherIds: null, classIds: null };
    if (scope.teacherIds.length > 0) return { teacherIds: scope.teacherIds, classIds: null };
    return { teacherIds: null, classIds: await this.classesForStudents(schoolId, scope.studentIds) };
  }

  private async classesForStudents(schoolId: number, studentIds: readonly number[]): Promise<number[]> {
    if (studentIds.length === 0) return [];
    const year = await this.db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.status, 'active')))
      .get();
    if (!year) return [];
    const allowed = new Set(studentIds);
    const rows = await this.db
      .select({
        studentId: studentEnrolments.studentId,
        formClassId: studentEnrolments.formClassId,
        status: studentEnrolments.status,
      })
      .from(studentEnrolments)
      .where(and(eq(studentEnrolments.schoolId, schoolId), eq(studentEnrolments.academicYearId, year.id)));
    return [...new Set(rows.flatMap((row) => (
      row.formClassId != null && allowed.has(row.studentId) && (row.status === 'enrolled' || row.status === 'promoted')
        ? [row.formClassId]
        : []
    )))];
  }
}
