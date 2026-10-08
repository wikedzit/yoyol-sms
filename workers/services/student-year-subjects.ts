import { and, asc, eq, inArray } from 'drizzle-orm';
import { academicLevels, formClasses } from '../database/academic-levels';
import { academicYears } from '../database/academic-years';
import type { AppDatabase } from '../database/app-database';
import { studentEnrolments } from '../database/student-enrolments';
import { studentSubjects } from '../database/student-subjects';
import { studentYearSubjects } from '../database/student-year-subjects';
import { students } from '../database/students';
import { subject } from '../database/subjects';
import { combinationSubjects, subjectCombinations } from '../database/subject-combinations';
import {
  describeYearSubjects,
  refusalToAssignCombination,
  replaceYearSubjects,
} from '../kernel/student-year-subjects';
import { requireSchoolId } from '../utils/require-owner-user';

export default class StudentYearSubjectService {
  constructor(
    private db: AppDatabase,
    private activeSchoolId: number | null = null,
  ) {}

  async list(): Promise<string[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const rows = await this.db
      .select({
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
        yearName: academicYears.name,
        subjectName: subject.subjectName,
        combinationName: subjectCombinations.name,
      })
      .from(studentYearSubjects)
      .innerJoin(students, eq(students.id, studentYearSubjects.studentId))
      .innerJoin(academicYears, eq(academicYears.id, studentYearSubjects.academicYearId))
      .innerJoin(subject, eq(subject.id, studentYearSubjects.subjectId))
      .leftJoin(subjectCombinations, eq(subjectCombinations.id, studentYearSubjects.combinationId))
      .where(eq(studentYearSubjects.schoolId, schoolId))
      .orderBy(asc(academicYears.name), asc(students.lastName), asc(subject.subjectName));
    return describeYearSubjects(rows.map((row) => ({
      studentName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
      yearName: row.yearName,
      subjectName: row.subjectName,
      combinationName: row.combinationName,
    })));
  }

  async students(): Promise<{ id: number; name: string }[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const rows = await this.db
      .select({
        id: students.id,
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
      })
      .from(students)
      .where(eq(students.schoolId, schoolId))
      .orderBy(asc(students.lastName), asc(students.firstName));
    return rows.map((row) => ({
      id: row.id,
      name: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
    }));
  }

  async subjectChoices(): Promise<{ id: number; name: string }[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const rows = await this.db
      .select({ id: subject.id, name: subject.subjectName, code: subject.code })
      .from(subject)
      .where(eq(subject.schoolId, schoolId))
      .orderBy(asc(subject.subjectName));
    return rows.map((row) => ({ id: row.id, name: `${row.name} (${row.code})` }));
  }

  async combinationChoices(): Promise<{ id: number; name: string }[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const rows = await this.db
      .select({ id: subjectCombinations.id, name: subjectCombinations.name })
      .from(subjectCombinations)
      .where(and(
        eq(subjectCombinations.schoolId, schoolId),
        eq(subjectCombinations.status, 'active'),
      ))
      .orderBy(asc(subjectCombinations.name));
    return rows;
  }

  async activeYearName(): Promise<string | null> {
    const year = await this.activeYear();
    return year?.name ?? null;
  }

  async saveSubjects(studentId: number, subjectIds: number[]): Promise<{ error: string } | { saved: true }> {
    return this.replaceActiveYear(studentId, subjectIds, null);
  }

  async saveCombination(studentId: number, combinationId: number): Promise<{ error: string } | { saved: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const combination = await this.db
      .select({ id: subjectCombinations.id, status: subjectCombinations.status })
      .from(subjectCombinations)
      .where(and(
        eq(subjectCombinations.id, combinationId),
        eq(subjectCombinations.schoolId, schoolId),
      ))
      .get();
    if (!combination) {
      return { error: 'That combination was not found.' };
    }
    const year = await this.activeYear();
    if (!year) {
      return { error: 'Choose an active academic year before assigning subjects.' };
    }
    const levelType = await this.enrolmentLevel(studentId, year.id);
    const refusal = refusalToAssignCombination({ status: combination.status, levelType });
    if (refusal) {
      return { error: refusal };
    }
    const links = await this.db
      .select({ subjectId: combinationSubjects.subjectId })
      .from(combinationSubjects)
      .where(eq(combinationSubjects.combinationId, combinationId));
    if (links.length === 0) {
      return { error: 'Add subjects to this combination before assigning it.' };
    }
    return this.replaceActiveYear(studentId, links.map((link) => link.subjectId), combinationId);
  }

  private async replaceActiveYear(
    studentId: number,
    subjectIds: number[],
    combinationId: number | null,
  ): Promise<{ error: string } | { saved: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const owned = await this.db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
      .get();
    if (!owned) {
      return { error: 'That student was not found.' };
    }
    const year = await this.activeYear();
    if (!year) {
      return { error: 'Choose an active academic year before assigning subjects.' };
    }
    if (subjectIds.length > 0) {
      const found = await this.db
        .select({ id: subject.id })
        .from(subject)
        .where(and(eq(subject.schoolId, schoolId), inArray(subject.id, subjectIds)));
      if (found.length !== new Set(subjectIds).size) {
        return { error: 'That subject was not found.' };
      }
    }
    const existing = await this.db
      .select({
        studentId: studentYearSubjects.studentId,
        academicYearId: studentYearSubjects.academicYearId,
        subjectId: studentYearSubjects.subjectId,
        combinationId: studentYearSubjects.combinationId,
      })
      .from(studentYearSubjects)
      .where(eq(studentYearSubjects.schoolId, schoolId));
    try {
      replaceYearSubjects({
        existing,
        studentId,
        yearId: year.id,
        activeYearId: year.id,
        subjectIds,
        combinationId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Those subjects could not be saved.';
      return { error: message };
    }
    await this.db
      .delete(studentYearSubjects)
      .where(and(
        eq(studentYearSubjects.studentId, studentId),
        eq(studentYearSubjects.academicYearId, year.id),
      ));
    const uniqueIds = [...new Set(subjectIds)];
    if (uniqueIds.length > 0) {
      await this.db.insert(studentYearSubjects).values(uniqueIds.map((subjectId) => ({
        schoolId,
        studentId,
        academicYearId: year.id,
        subjectId,
        combinationId,
        createdAt: Date.now(),
      })));
    }
    await this.mirrorActiveYear(studentId, schoolId, uniqueIds);
    return { saved: true };
  }

  private async mirrorActiveYear(studentId: number, schoolId: number, subjectIds: number[]) {
    await this.db.delete(studentSubjects).where(eq(studentSubjects.studentId, studentId));
    if (subjectIds.length === 0) return;
    await this.db.insert(studentSubjects).values(subjectIds.map((subjectId) => ({
      studentId,
      subjectId,
      schoolId,
      assignedAt: Date.now(),
    })));
  }

  private async activeYear() {
    const schoolId = requireSchoolId(this.activeSchoolId);
    return this.db
      .select({ id: academicYears.id, name: academicYears.name })
      .from(academicYears)
      .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.status, 'active')))
      .get();
  }

  private async enrolmentLevel(studentId: number, yearId: number): Promise<string | null> {
    const row = await this.db
      .select({ levelType: academicLevels.type })
      .from(studentEnrolments)
      .innerJoin(formClasses, eq(formClasses.id, studentEnrolments.formClassId))
      .innerJoin(academicLevels, eq(academicLevels.id, formClasses.levelId))
      .where(and(
        eq(studentEnrolments.studentId, studentId),
        eq(studentEnrolments.academicYearId, yearId),
      ))
      .get();
    return row?.levelType ?? null;
  }
}
