import { and, asc, eq } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { academicForms, academicLevels, formClasses } from '../database/academic-levels';
import { academicYears } from '../database/academic-years';
import { studentEnrolments } from '../database/student-enrolments';
import { students } from '../database/students';
import {
  classMove,
  endedEnrolment,
  promotionPlan,
  refusalToEnrolTwice,
  type EnrolmentStatus,
} from '../kernel/student-enrolments';
import { requireSchoolId } from '../utils/require-owner-user';

export type EnrolmentView = {
  id: number;
  studentId: number;
  studentName: string;
  yearName: string;
  className: string | null;
  formClassId: number | null;
  status: string;
  moveReason: string | null;
};

export default class StudentEnrolmentService {
  whenEnrolled: ((input: {
    studentId: number;
    formClassId: number;
    academicYearId: number;
  }) => Promise<void>) | null = null;

  constructor(
    private db: AppDatabase,
    private activeSchoolId: number | null = null,
  ) {}

  async list(): Promise<EnrolmentView[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const rows = await this.db
      .select({
        id: studentEnrolments.id,
        studentId: students.id,
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
        yearName: academicYears.name,
        className: formClasses.name,
        formClassId: studentEnrolments.formClassId,
        status: studentEnrolments.status,
        moveReason: studentEnrolments.moveReason,
      })
      .from(studentEnrolments)
      .innerJoin(students, eq(students.id, studentEnrolments.studentId))
      .innerJoin(academicYears, eq(academicYears.id, studentEnrolments.academicYearId))
      .leftJoin(formClasses, eq(formClasses.id, studentEnrolments.formClassId))
      .where(eq(studentEnrolments.schoolId, schoolId))
      .orderBy(asc(academicYears.name), asc(students.lastName), asc(students.firstName));

    return rows.map((row) => ({
      id: row.id,
      studentId: row.studentId,
      studentName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
      yearName: row.yearName,
      className: row.className,
      formClassId: row.formClassId,
      status: row.status,
      moveReason: row.moveReason,
    }));
  }

  async years(): Promise<{ id: number; name: string }[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    return this.db
      .select({ id: academicYears.id, name: academicYears.name })
      .from(academicYears)
      .where(eq(academicYears.schoolId, schoolId))
      .orderBy(asc(academicYears.name));
  }

  async classes(): Promise<{ id: number; name: string }[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    return this.db
      .select({ id: formClasses.id, name: formClasses.name })
      .from(formClasses)
      .where(eq(formClasses.schoolId, schoolId))
      .orderBy(asc(formClasses.name));
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

  async enrol(studentId: number, formClassId: number | null): Promise<{ error: string } | { id: number }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const student = await this.ownedStudent(schoolId, studentId);
    if (!student) {
      return { error: 'That student was not found.' };
    }
    const year = await this.db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.status, 'active')))
      .get();
    if (!year) {
      return { error: 'Choose an active academic year before enrolling a student.' };
    }
    if (formClassId !== null && !(await this.ownedClass(schoolId, formClassId))) {
      return { error: 'That class was not found.' };
    }

    const existing = await this.db
      .select({
        studentId: studentEnrolments.studentId,
        academicYearId: studentEnrolments.academicYearId,
        formClassId: studentEnrolments.formClassId,
        status: studentEnrolments.status,
      })
      .from(studentEnrolments)
      .where(and(
        eq(studentEnrolments.studentId, studentId),
        eq(studentEnrolments.academicYearId, year.id),
      ))
      .get();
    const refusal = refusalToEnrolTwice(existing
      ? { ...existing, status: existing.status as EnrolmentStatus }
      : null);
    if (refusal) {
      return { error: refusal };
    }

    const now = Date.now();
    const created = await this.db.insert(studentEnrolments).values({
      schoolId,
      studentId,
      academicYearId: year.id,
      formClassId,
      status: 'enrolled',
      createdAt: now,
      updatedAt: now,
    }).returning({ id: studentEnrolments.id });
    await this.syncCurrentClass(studentId, year.id, formClassId);
    if (formClassId != null && this.whenEnrolled) {
      try {
        await this.whenEnrolled({ studentId, formClassId, academicYearId: year.id });
      } catch (error) {
        console.error('Unable to create the enrolment invoice:', error);
      }
    }
    return { id: created[0]?.id ?? 0 };
  }

  async move(enrolmentId: number, formClassId: number, reason: string): Promise<{ error: string } | { id: number }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const enrolment = await this.ownedEnrolment(schoolId, enrolmentId);
    if (!enrolment) {
      return { error: 'That enrolment was not found.' };
    }
    if (!(await this.ownedClass(schoolId, formClassId))) {
      return { error: 'That class was not found.' };
    }

    try {
      const next = classMove({
        status: enrolment.status as EnrolmentStatus,
        currentFormClassId: enrolment.formClassId,
        nextFormClassId: formClassId,
        reason,
      });
      await this.db
        .update(studentEnrolments)
        .set({ formClassId: next.formClassId, moveReason: next.moveReason, updatedAt: Date.now() })
        .where(eq(studentEnrolments.id, enrolmentId));
      await this.syncCurrentClass(enrolment.studentId, enrolment.academicYearId, next.formClassId);
      return { id: enrolmentId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'That class move could not be saved.';
      return { error: message };
    }
  }

  async promote(input: {
    sourceClassId: number;
    selectedStudentIds: number[];
    wholeClass: boolean;
    nextYearId: number;
    nextFormClassId: number;
  }): Promise<{ error: string } | { promoted: number }> {
    const prepared = await this.preparePromotion(input);
    if ('error' in prepared) {
      return prepared;
    }
    if (prepared.plan.graduate.length > 0) {
      return { error: 'This is the final form. Mark these students as graduated.' };
    }
    if (!prepared.nextYearFound) {
      return { error: 'That academic year was not found.' };
    }
    const nextClass = await this.classOnForm(prepared.schoolId, input.nextFormClassId);
    if (!nextClass || nextClass.formId !== prepared.laterFormId) {
      return { error: 'Choose a class on the next form.' };
    }

    const now = Date.now();
    for (const student of prepared.plan.promote) {
      await this.db.insert(studentEnrolments).values({
        schoolId: prepared.schoolId,
        studentId: student.studentId,
        academicYearId: input.nextYearId,
        formClassId: input.nextFormClassId,
        status: 'enrolled',
        createdAt: now,
        updatedAt: now,
      });
      await this.db
        .update(studentEnrolments)
        .set({ status: 'promoted', updatedAt: now })
        .where(eq(studentEnrolments.id, student.enrolmentId));
      if (prepared.nextYearIsActive) {
        await this.db
          .update(students)
          .set({
            academicYearId: input.nextYearId,
            formClassId: input.nextFormClassId,
            updatedAt: now,
          })
          .where(eq(students.id, student.studentId));
      }
    }
    return { promoted: prepared.plan.promote.length };
  }

  async graduate(input: {
    sourceClassId: number;
    selectedStudentIds: number[];
    wholeClass: boolean;
  }): Promise<{ error: string } | { graduated: number }> {
    const prepared = await this.preparePromotion({
      ...input,
      nextYearId: 0,
      nextFormClassId: 0,
    });
    if ('error' in prepared) {
      return prepared;
    }
    if (prepared.plan.promote.length > 0) {
      return { error: 'This form still has a next form. Promote these students instead.' };
    }

    const now = Date.now();
    for (const student of prepared.plan.graduate) {
      await this.db
        .update(studentEnrolments)
        .set({ status: 'graduated', updatedAt: now })
        .where(eq(studentEnrolments.id, student.enrolmentId));
    }
    return { graduated: prepared.plan.graduate.length };
  }

  async end(enrolmentId: number, status: string): Promise<{ error: string } | { id: number }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const enrolment = await this.ownedEnrolment(schoolId, enrolmentId);
    if (!enrolment) {
      return { error: 'That enrolment was not found.' };
    }
    if (enrolment.status !== 'enrolled') {
      return { error: 'That enrolment has already ended.' };
    }

    try {
      const nextStatus = endedEnrolment(status);
      await this.db
        .update(studentEnrolments)
        .set({ status: nextStatus, updatedAt: Date.now() })
        .where(eq(studentEnrolments.id, enrolmentId));
      return { id: enrolmentId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'That enrolment could not be ended.';
      return { error: message };
    }
  }

  private async preparePromotion(input: {
    sourceClassId: number;
    selectedStudentIds: number[];
    wholeClass: boolean;
    nextYearId: number;
    nextFormClassId: number;
  }): Promise<{ error: string } | {
    schoolId: number;
    laterFormId: number | null;
    nextYearFound: boolean;
    nextYearIsActive: boolean;
    plan: ReturnType<typeof promotionPlan>;
  }> {
    try {
      const schoolId = requireSchoolId(this.activeSchoolId);
      const source = await this.db
        .select({
          id: formClasses.id,
          formNumber: academicForms.number,
          streamId: academicForms.streamId,
          levelType: academicLevels.type,
        })
        .from(formClasses)
        .innerJoin(academicForms, eq(academicForms.id, formClasses.formId))
        .innerJoin(academicLevels, eq(academicLevels.id, formClasses.levelId))
        .where(and(eq(formClasses.id, input.sourceClassId), eq(formClasses.schoolId, schoolId)))
        .get();
      if (!source) {
        return { error: 'That class was not found.' };
      }

      const laterForm = await this.db
        .select({ id: academicForms.id })
        .from(academicForms)
        .where(and(
          eq(academicForms.streamId, source.streamId),
          eq(academicForms.number, source.formNumber + 1),
        ))
        .get();
      const activeYear = await this.db
        .select({ id: academicYears.id })
        .from(academicYears)
        .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.status, 'active')))
        .get();
      if (!activeYear) {
        return { error: 'Choose an active academic year before promoting a class.' };
      }

      const nextYear = input.nextYearId > 0
        ? await this.db
          .select({ id: academicYears.id, status: academicYears.status })
          .from(academicYears)
          .where(and(eq(academicYears.id, input.nextYearId), eq(academicYears.schoolId, schoolId)))
          .get()
        : undefined;
      const rows = await this.db
        .select({
          enrolmentId: studentEnrolments.id,
          studentId: studentEnrolments.studentId,
          formClassId: studentEnrolments.formClassId,
          status: studentEnrolments.status,
          academicYearId: studentEnrolments.academicYearId,
        })
        .from(studentEnrolments)
        .where(eq(studentEnrolments.schoolId, schoolId));
      const plan = promotionPlan({
        sourceClassId: input.sourceClassId,
        formNumber: source.formNumber,
        levelType: source.levelType,
        laterFormExists: Boolean(laterForm),
        enrolments: rows.filter((row) => row.academicYearId === activeYear.id),
        selectedStudentIds: input.selectedStudentIds,
        wholeClass: input.wholeClass,
        nextYearId: input.nextYearId,
        sourceYearId: activeYear.id,
        alreadyInNextYear: rows
          .filter((row) => row.academicYearId === input.nextYearId)
          .map((row) => row.studentId),
      });
      return {
        schoolId,
        laterFormId: laterForm?.id ?? null,
        nextYearFound: Boolean(nextYear),
        nextYearIsActive: nextYear?.status === 'active',
        plan,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'That promotion could not be saved.';
      return { error: message };
    }
  }

  private async classOnForm(schoolId: number, formClassId: number) {
    return this.db
      .select({ id: formClasses.id, formId: formClasses.formId })
      .from(formClasses)
      .where(and(eq(formClasses.id, formClassId), eq(formClasses.schoolId, schoolId)))
      .get();
  }

  private async ownedStudent(schoolId: number, studentId: number) {
    return this.db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
      .get();
  }

  private async ownedClass(schoolId: number, formClassId: number) {
    return this.db
      .select({ id: formClasses.id })
      .from(formClasses)
      .where(and(eq(formClasses.id, formClassId), eq(formClasses.schoolId, schoolId)))
      .get();
  }

  private async ownedEnrolment(schoolId: number, enrolmentId: number) {
    return this.db
      .select({
        id: studentEnrolments.id,
        studentId: studentEnrolments.studentId,
        academicYearId: studentEnrolments.academicYearId,
        formClassId: studentEnrolments.formClassId,
        status: studentEnrolments.status,
      })
      .from(studentEnrolments)
      .where(and(eq(studentEnrolments.id, enrolmentId), eq(studentEnrolments.schoolId, schoolId)))
      .get();
  }

  private async syncCurrentClass(studentId: number, academicYearId: number, formClassId: number | null) {
    const student = await this.db
      .select({ academicYearId: students.academicYearId })
      .from(students)
      .where(eq(students.id, studentId))
      .get();
    if (student?.academicYearId !== academicYearId) {
      return;
    }
    await this.db
      .update(students)
      .set({ formClassId, updatedAt: Date.now() })
      .where(eq(students.id, studentId));
  }
}
