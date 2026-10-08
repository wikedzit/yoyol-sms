import { and, asc, eq } from 'drizzle-orm';
import { academicYears } from '../database/academic-years';
import { formClasses } from '../database/academic-levels';
import type { AppDatabase } from '../database/app-database';
import { lessonPlans, lessonTemplates } from '../database/lesson-plans';
import { subject } from '../database/subjects';
import { teachers } from '../database/teachers';
import {
  describePlan,
  refusalToReview,
  refusalToSavePlan,
  refusalToSaveTemplate,
  refusalToSubmit,
  type LessonPlansPage,
  type LessonPlanRow,
} from '../kernel/lesson-plans';
import { requireSchoolId } from '../utils/require-owner-user';
import type { RecordScope } from './visible-records';

type LessonPlanDeps = {
  scope: () => Promise<RecordScope>;
  canReview: () => Promise<boolean>;
};

export default class LessonPlanService {
  constructor(
    private db: AppDatabase,
    private activeSchoolId: number | null = null,
    private currentUserId: number | null = null,
    private deps: LessonPlanDeps,
  ) {}

  async open(): Promise<LessonPlansPage> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const scope = await this.deps.scope();
    const canReview = await this.deps.canReview();
    const ownTeacherId = scope.kind === 'limited' && scope.teacherIds.length > 0 ? scope.teacherIds[0] : null;
    const plans = await this.planRows(schoolId);
    const visible = ownTeacherId == null ? plans : plans.filter((plan) => plan.teacherId === ownTeacherId);
    return {
      canManageTemplates: canReview,
      canReview,
      canWrite: canReview || ownTeacherId != null,
      ownTeacherId,
      templates: await this.templateRows(schoolId),
      plans: visible,
      subjects: await this.subjectChoices(schoolId),
      teachers: await this.teacherChoices(schoolId),
      classes: await this.classChoices(),
    };
  }

  async save(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const action = fields._action;
    if (action === 'template' || action === 'retire-template') {
      if (!(await this.deps.canReview())) return { error: 'You do not have permission to change templates.' };
      return action === 'template' ? this.saveTemplate(fields) : this.retireTemplate(Number(fields.templateId));
    }
    if (action === 'plan') return this.savePlan(fields);
    if (action === 'submit') return this.submitPlan(Number(fields.planId));
    if (action === 'approve' || action === 'return') {
      if (!(await this.deps.canReview())) return { error: 'You do not have permission to review lesson plans.' };
      return action === 'approve'
        ? this.reviewPlan(Number(fields.planId), 'approve', '')
        : this.reviewPlan(Number(fields.planId), 'return', fields.comment ?? '');
    }
    return { error: 'That lesson plan action is not available.' };
  }

  private async saveTemplate(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const name = fields.name?.trim() ?? '';
    const body = fields.body?.trim() ?? '';
    const refused = refusalToSaveTemplate({ name, body });
    if (refused) return { error: refused };
    const schoolId = requireSchoolId(this.activeSchoolId);
    const templateId = Number(fields.templateId);
    const taken = await this.db
      .select({ id: lessonTemplates.id })
      .from(lessonTemplates)
      .where(and(eq(lessonTemplates.schoolId, schoolId), eq(lessonTemplates.name, name)))
      .get();
    if (taken && taken.id !== templateId) return { error: 'That template name is already in use.' };
    const now = Date.now();
    if (templateId > 0) {
      await this.db.update(lessonTemplates).set({ name, body, updatedAt: now }).where(and(
        eq(lessonTemplates.id, templateId),
        eq(lessonTemplates.schoolId, schoolId),
      ));
      return { ok: true };
    }
    await this.db.insert(lessonTemplates).values({
      schoolId,
      name,
      body,
      retired: false,
      createdAt: now,
      updatedAt: now,
      createdBy: this.currentUserId,
    });
    return { ok: true };
  }

  private async retireTemplate(templateId: number): Promise<{ error: string } | { ok: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    await this.db.update(lessonTemplates).set({ retired: true, updatedAt: Date.now() }).where(and(
      eq(lessonTemplates.id, templateId),
      eq(lessonTemplates.schoolId, schoolId),
    ));
    return { ok: true };
  }

  private async savePlan(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const year = await this.activeYear(schoolId);
    if (!year) return { error: 'Choose an active academic year before writing a lesson plan.' };
    const planId = Number(fields.planId);
    const existing = planId > 0 ? await this.onePlan(schoolId, planId) : null;
    if (planId > 0 && !existing) return { error: 'That lesson plan was not found.' };
    const templateId = Number(fields.templateId || existing?.templateId);
    const template = await this.db
      .select({ retired: lessonTemplates.retired })
      .from(lessonTemplates)
      .where(and(eq(lessonTemplates.id, templateId), eq(lessonTemplates.schoolId, schoolId)))
      .get();
    const teacherId = await this.teacherForWrite(Number(fields.teacherId || existing?.teacherId));
    const ownsPlan = await this.ownsPlan(teacherId);
    const refused = refusalToSavePlan({
      title: fields.title ?? '',
      body: fields.body ?? '',
      status: existing?.status ?? 'draft',
      ownsPlan,
      templateActive: Boolean(template) && (existing != null || template?.retired === false),
    });
    if (refused) return { error: refused };
    const subjectId = Number(fields.subjectId || existing?.subjectId);
    const classId = Number(fields.formClassId || existing?.formClassId);
    if (!subjectId || !classId || !teacherId) return { error: 'Choose a template, subject, class, and teacher.' };
    const now = Date.now();
    const values = {
      templateId,
      subjectId,
      formClassId: classId,
      teacherId,
      title: fields.title.trim(),
      body: fields.body.trim(),
      updatedAt: now,
    };
    if (existing) {
      await this.db.update(lessonPlans).set(values).where(and(
        eq(lessonPlans.id, existing.id),
        eq(lessonPlans.schoolId, schoolId),
      ));
      return { ok: true };
    }
    await this.db.insert(lessonPlans).values({
      ...values,
      schoolId,
      academicYearId: year.id,
      status: 'draft',
      reviewComment: '',
      createdAt: now,
      createdBy: this.currentUserId,
    });
    return { ok: true };
  }

  private async submitPlan(planId: number): Promise<{ error: string } | { ok: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const plan = await this.onePlan(schoolId, planId);
    if (!plan) return { error: 'That lesson plan was not found.' };
    const refused = refusalToSubmit({ status: plan.status, ownsPlan: await this.ownsPlan(plan.teacherId) });
    if (refused) return { error: refused };
    await this.db.update(lessonPlans).set({
      status: 'submitted',
      reviewComment: '',
      updatedAt: Date.now(),
    }).where(and(eq(lessonPlans.id, plan.id), eq(lessonPlans.schoolId, schoolId)));
    return { ok: true };
  }

  private async reviewPlan(
    planId: number,
    decision: 'approve' | 'return',
    comment: string,
  ): Promise<{ error: string } | { ok: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const plan = await this.onePlan(schoolId, planId);
    if (!plan) return { error: 'That lesson plan was not found.' };
    const refused = refusalToReview({ status: plan.status, decision, comment });
    if (refused) return { error: refused };
    await this.db.update(lessonPlans).set({
      status: decision === 'approve' ? 'approved' : 'returned',
      reviewComment: decision === 'return' ? comment.trim() : '',
      updatedAt: Date.now(),
    }).where(and(eq(lessonPlans.id, plan.id), eq(lessonPlans.schoolId, schoolId)));
    return { ok: true };
  }

  private async planRows(schoolId: number): Promise<LessonPlanRow[]> {
    const year = await this.activeYear(schoolId);
    if (!year) return [];
    const rows = await this.db
      .select({
        id: lessonPlans.id,
        title: lessonPlans.title,
        body: lessonPlans.body,
        status: lessonPlans.status,
        reviewComment: lessonPlans.reviewComment,
        templateId: lessonPlans.templateId,
        subjectId: lessonPlans.subjectId,
        classId: lessonPlans.formClassId,
        teacherId: lessonPlans.teacherId,
        subjectName: subject.subjectName,
        className: formClasses.name,
        firstName: teachers.firstName,
        middleName: teachers.middleName,
        lastName: teachers.lastName,
      })
      .from(lessonPlans)
      .innerJoin(subject, eq(subject.id, lessonPlans.subjectId))
      .innerJoin(formClasses, eq(formClasses.id, lessonPlans.formClassId))
      .innerJoin(teachers, eq(teachers.id, lessonPlans.teacherId))
      .where(and(eq(lessonPlans.schoolId, schoolId), eq(lessonPlans.academicYearId, year.id)))
      .orderBy(asc(lessonPlans.id));
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      status: row.status,
      reviewComment: row.reviewComment,
      templateId: row.templateId,
      subjectId: row.subjectId,
      classId: row.classId,
      teacherId: row.teacherId,
      line: describePlan({
        title: row.title,
        subjectName: row.subjectName,
        className: row.className,
        teacherName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
        status: row.status,
      }),
    }));
  }

  private async templateRows(schoolId: number) {
    return this.db
      .select({
        id: lessonTemplates.id,
        name: lessonTemplates.name,
        body: lessonTemplates.body,
        retired: lessonTemplates.retired,
      })
      .from(lessonTemplates)
      .where(eq(lessonTemplates.schoolId, schoolId))
      .orderBy(asc(lessonTemplates.name));
  }

  private async onePlan(schoolId: number, planId: number) {
    return this.db
      .select({
        id: lessonPlans.id,
        status: lessonPlans.status,
        teacherId: lessonPlans.teacherId,
        templateId: lessonPlans.templateId,
        subjectId: lessonPlans.subjectId,
        formClassId: lessonPlans.formClassId,
      })
      .from(lessonPlans)
      .where(and(eq(lessonPlans.id, planId), eq(lessonPlans.schoolId, schoolId)))
      .get();
  }

  private async activeYear(schoolId: number) {
    return this.db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.status, 'active')))
      .get();
  }

  private async teacherForWrite(postedTeacherId: number): Promise<number> {
    const scope = await this.deps.scope();
    if (scope.kind === 'limited' && scope.teacherIds.length > 0) return scope.teacherIds[0];
    return postedTeacherId;
  }

  private async ownsPlan(teacherId: number): Promise<boolean> {
    if (await this.deps.canReview()) return true;
    const scope = await this.deps.scope();
    return scope.kind === 'limited' && scope.teacherIds.includes(teacherId);
  }

  private async subjectChoices(schoolId: number) {
    return this.db
      .select({ id: subject.id, name: subject.subjectName })
      .from(subject)
      .where(eq(subject.schoolId, schoolId))
      .orderBy(asc(subject.subjectName));
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
}
