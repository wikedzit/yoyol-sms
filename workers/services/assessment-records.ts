import { and, asc, eq, isNull, or } from 'drizzle-orm';
import { academicLevels, formClasses } from '../database/academic-levels';
import { academicYears, terms } from '../database/academic-years';
import type { AppDatabase } from '../database/app-database';
import { assessmentTypes, gradingScales, resultReleases, results } from '../database/assessment';
import { studentEnrolments } from '../database/student-enrolments';
import { students } from '../database/students';
import { subject } from '../database/subjects';
import { teachingAssignments } from '../database/teaching-assignments';
import {
  defaultGradeBands,
  describeResults,
  gradeForScore,
  refusalToEditReleasedResult,
} from '../kernel/assessment';
import { requireSchoolId } from '../utils/require-owner-user';

const starterTypes = [
  { key: 'assignment', name: 'Assignment' },
  { key: 'test', name: 'Test' },
  { key: 'quiz', name: 'Quiz' },
  { key: 'midterm', name: 'Midterm' },
  { key: 'final-exam', name: 'Final exam' },
];

export default class AssessmentRecordService {
  constructor(
    private db: AppDatabase,
    private activeSchoolId: number | null = null,
  ) {}

  async ensureDefaults(): Promise<void> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const existing = await this.db
      .select({ id: assessmentTypes.id })
      .from(assessmentTypes)
      .where(eq(assessmentTypes.schoolId, schoolId));
    if (existing.length === 0) {
      const now = Date.now();
      await this.db.insert(assessmentTypes).values(starterTypes.map((type) => ({
        schoolId,
        key: type.key,
        name: type.name,
        status: 'active',
        createdAt: now,
      })));
    }
    const scales = await this.db
      .select({ id: gradingScales.id })
      .from(gradingScales)
      .where(eq(gradingScales.schoolId, schoolId));
    if (scales.length > 0) return;
    const levels = await this.db
      .select({ id: academicLevels.id })
      .from(academicLevels)
      .where(or(eq(academicLevels.schoolId, schoolId), isNull(academicLevels.schoolId)));
    if (levels.length === 0) return;
    const now = Date.now();
    for (const level of levels) {
      await this.db.insert(gradingScales).values(defaultGradeBands.map((band) => ({
        schoolId,
        levelId: level.id,
        minScore: band.min,
        maxScore: band.max,
        label: band.label,
        createdAt: now,
      })));
    }
  }

  async types(): Promise<{ id: number; name: string; status: string }[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    return this.db
      .select({ id: assessmentTypes.id, name: assessmentTypes.name, status: assessmentTypes.status })
      .from(assessmentTypes)
      .where(eq(assessmentTypes.schoolId, schoolId))
      .orderBy(asc(assessmentTypes.name));
  }

  async deactivateType(typeId: number): Promise<{ error: string } | { id: number }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const row = await this.db
      .select({ id: assessmentTypes.id })
      .from(assessmentTypes)
      .where(and(eq(assessmentTypes.id, typeId), eq(assessmentTypes.schoolId, schoolId)))
      .get();
    if (!row) return { error: 'That assessment type was not found.' };
    await this.db.update(assessmentTypes).set({ status: 'inactive' }).where(eq(assessmentTypes.id, typeId));
    return { id: typeId };
  }

  async addType(name: string): Promise<{ error: string } | { id: number }> {
    const trimmed = name.trim();
    if (trimmed.length === 0) return { error: 'Enter the assessment name.' };
    const schoolId = requireSchoolId(this.activeSchoolId);
    const key = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'type';
    const created = await this.db.insert(assessmentTypes).values({
      schoolId,
      key,
      name: trimmed,
      status: 'active',
      createdAt: Date.now(),
    }).returning({ id: assessmentTypes.id });
    return { id: created[0]?.id ?? 0 };
  }

  async saveMark(input: {
    studentId: number;
    termId: number;
    subjectId: number;
    assessmentTypeId: number;
    teacherId: number | null;
    score: number;
    comment: string;
    actorTeacherId: number | null;
  }): Promise<{ error: string } | { id: number }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const released = await this.isReleased(schoolId, input.termId);
    const refusal = refusalToEditReleasedResult(released);
    if (refusal) return { error: refusal };
    const term = await this.db
      .select({ id: terms.id, academicYearId: terms.academicYearId })
      .from(terms)
      .where(eq(terms.id, input.termId))
      .get();
    if (!term?.academicYearId) return { error: 'That term was not found.' };
    if (input.actorTeacherId != null) {
      const allowed = await this.teacherMayEnter(input.actorTeacherId, term.academicYearId, input.subjectId, input.studentId);
      if (!allowed) return { error: 'You can enter marks only for your assigned class and subject.' };
    }
    const levelId = await this.levelForStudent(input.studentId, term.academicYearId);
    const scales = await this.db
      .select({ min: gradingScales.minScore, max: gradingScales.maxScore, label: gradingScales.label })
      .from(gradingScales)
      .where(and(eq(gradingScales.schoolId, schoolId), eq(gradingScales.levelId, levelId ?? -1)));
    let gradeLabel: string;
    try {
      gradeLabel = gradeForScore(scales, input.score);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'That mark is outside the grading scale.';
      return { error: message };
    }
    const existing = await this.db
      .select({ id: results.id })
      .from(results)
      .where(and(
        eq(results.studentId, input.studentId),
        eq(results.termId, input.termId),
        eq(results.subjectId, input.subjectId),
        eq(results.assessmentTypeId, input.assessmentTypeId),
      ))
      .get();
    const now = Date.now();
    if (existing) {
      await this.db.update(results).set({
        score: input.score,
        gradeLabel,
        comment: blank(input.comment),
        teacherId: input.teacherId,
        updatedAt: now,
      }).where(eq(results.id, existing.id));
      return { id: existing.id };
    }
    const created = await this.db.insert(results).values({
      schoolId,
      studentId: input.studentId,
      academicYearId: term.academicYearId,
      termId: input.termId,
      subjectId: input.subjectId,
      assessmentTypeId: input.assessmentTypeId,
      teacherId: input.teacherId,
      score: input.score,
      gradeLabel,
      comment: blank(input.comment),
      createdAt: now,
      updatedAt: now,
    }).returning({ id: results.id });
    return { id: created[0]?.id ?? 0 };
  }

  async release(termId: number): Promise<{ error: string } | { id: number }> {
    return this.setRelease(termId, Date.now());
  }

  async withdraw(termId: number): Promise<{ error: string } | { id: number }> {
    return this.setRelease(termId, null);
  }

  async report(studentId: number, termId: number, familyView: boolean): Promise<{ error: string } | { lines: string[] }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    if (familyView && !(await this.isReleased(schoolId, termId))) {
      return { error: 'Results for this term have not been released.' };
    }
    const rows = await this.resultRows(schoolId, termId, studentId);
    return { lines: describeResults(rows) };
  }

  async releasedLines(): Promise<string[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const releases = await this.db
      .select({ termId: resultReleases.termId })
      .from(resultReleases)
      .where(and(eq(resultReleases.schoolId, schoolId)));
    const releasedIds = releases.filter((row) => row.termId).map((row) => row.termId);
    if (releasedIds.length === 0) return [];
    const lines: string[] = [];
    for (const termId of releasedIds) {
      const open = await this.isReleased(schoolId, termId);
      if (!open) continue;
      lines.push(...describeResults(await this.resultRows(schoolId, termId, null)));
    }
    return lines;
  }

  async classStudents(formClassId: number, yearId: number): Promise<{ id: number; name: string }[]> {
    const rows = await this.db
      .select({
        id: students.id,
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
      })
      .from(studentEnrolments)
      .innerJoin(students, eq(students.id, studentEnrolments.studentId))
      .where(and(
        eq(studentEnrolments.formClassId, formClassId),
        eq(studentEnrolments.academicYearId, yearId),
        eq(studentEnrolments.status, 'enrolled'),
      ))
      .orderBy(asc(students.lastName));
    const promoted = await this.db
      .select({
        id: students.id,
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
      })
      .from(studentEnrolments)
      .innerJoin(students, eq(students.id, studentEnrolments.studentId))
      .where(and(
        eq(studentEnrolments.formClassId, formClassId),
        eq(studentEnrolments.academicYearId, yearId),
        eq(studentEnrolments.status, 'promoted'),
      ));
    return [...rows, ...promoted].map((row) => ({
      id: row.id,
      name: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
    }));
  }

  private async setRelease(termId: number, releasedAt: number | null): Promise<{ error: string } | { id: number }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const existing = await this.db
      .select({ id: resultReleases.id })
      .from(resultReleases)
      .where(and(eq(resultReleases.schoolId, schoolId), eq(resultReleases.termId, termId)))
      .get();
    if (existing) {
      await this.db.update(resultReleases).set({ releasedAt }).where(eq(resultReleases.id, existing.id));
      return { id: existing.id };
    }
    const created = await this.db.insert(resultReleases).values({
      schoolId,
      termId,
      releasedAt,
    }).returning({ id: resultReleases.id });
    return { id: created[0]?.id ?? 0 };
  }

  private async isReleased(schoolId: number, termId: number): Promise<boolean> {
    const row = await this.db
      .select({ releasedAt: resultReleases.releasedAt })
      .from(resultReleases)
      .where(and(eq(resultReleases.schoolId, schoolId), eq(resultReleases.termId, termId)))
      .get();
    return row?.releasedAt != null;
  }

  private async resultRows(schoolId: number, termId: number, studentId: number | null) {
    const rows = await this.db
      .select({
        studentId: students.id,
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
        termName: terms.name,
        subjectName: subject.subjectName,
        assessmentName: assessmentTypes.name,
        score: results.score,
        gradeLabel: results.gradeLabel,
      })
      .from(results)
      .innerJoin(students, eq(students.id, results.studentId))
      .innerJoin(terms, eq(terms.id, results.termId))
      .innerJoin(subject, eq(subject.id, results.subjectId))
      .innerJoin(assessmentTypes, eq(assessmentTypes.id, results.assessmentTypeId))
      .where(and(eq(results.schoolId, schoolId), eq(results.termId, termId)))
      .orderBy(asc(students.lastName), asc(subject.subjectName));
    const chosen = studentId == null ? rows : rows.filter((row) => row.studentId === studentId);
    return chosen.map((row) => ({
      studentName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
      termName: row.termName,
      subjectName: row.subjectName,
      assessmentName: row.assessmentName,
      score: row.score,
      gradeLabel: row.gradeLabel,
    }));
  }

  private async levelForStudent(studentId: number, yearId: number): Promise<number | null> {
    const row = await this.db
      .select({ levelId: formClasses.levelId })
      .from(studentEnrolments)
      .innerJoin(formClasses, eq(formClasses.id, studentEnrolments.formClassId))
      .where(and(eq(studentEnrolments.studentId, studentId), eq(studentEnrolments.academicYearId, yearId)))
      .get();
    return row?.levelId ?? null;
  }

  private async teacherMayEnter(teacherId: number, yearId: number, subjectId: number, studentId: number): Promise<boolean> {
    const assignments = await this.db
      .select({ formClassId: teachingAssignments.formClassId })
      .from(teachingAssignments)
      .where(and(
        eq(teachingAssignments.teacherId, teacherId),
        eq(teachingAssignments.academicYearId, yearId),
        eq(teachingAssignments.subjectId, subjectId),
      ));
    if (assignments.length === 0) return false;
    const enrolment = await this.db
      .select({ formClassId: studentEnrolments.formClassId })
      .from(studentEnrolments)
      .where(and(eq(studentEnrolments.studentId, studentId), eq(studentEnrolments.academicYearId, yearId)))
      .get();
    return assignments.some((row) => row.formClassId === enrolment?.formClassId);
  }
}

function blank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
