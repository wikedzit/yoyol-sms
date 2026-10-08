import { defineModule } from '../../workers/kernel/sdk';
import { view } from '../../workers/kernel/view-document';
import type { LessonPlanRow, LessonPlansPage, LessonTemplate } from '../../workers/kernel/lesson-plans';
import source from './yoyol.extension.json';

const lessonPlans = defineModule({
  manifest: source,
  async handlePage(_request, context) {
    const page = await context.lessonPlans?.open();
    if (!page) return view.page('lessonPlans.title', [view.text('lessonPlans.plansEmpty')]);
    return homeDocument(page);
  },
  async handleAction(_name, fields, context) {
    return context.lessonPlans?.save(fields) ?? { error: 'Lesson plans are not available.' };
  },
});

function homeDocument(page: LessonPlansPage) {
  const activeTemplates = page.templates.filter((template) => !template.retired);
  const body: Record<string, unknown>[] = [
    view.text('lessonPlans.description'),
    {
      type: 'section',
      heading: { t: 'lessonPlans.templates' },
      body: page.templates.length === 0
        ? [view.text('lessonPlans.templatesEmpty')]
        : page.templates.flatMap((template) => templateNodes(template, page.canManageTemplates)),
    },
  ];
  if (page.canManageTemplates) {
    body.push({
      type: 'form',
      action: 'template',
      method: 'post',
      submitLabel: { t: 'lessonPlans.saveTemplate' },
      fields: [
        { name: 'name', kind: 'text', label: { t: 'lessonPlans.templateName' } },
        { name: 'body', kind: 'text', label: { t: 'lessonPlans.templateBody' } },
      ],
    });
  }
  body.push({
    type: 'section',
    heading: { t: 'lessonPlans.plans' },
    body: page.plans.length === 0
      ? [view.text('lessonPlans.plansEmpty')]
      : page.plans.flatMap((plan) => planNodes(plan, page)),
  });
  if (page.canWrite && activeTemplates.length > 0) {
    body.push(newPlanForm(page, activeTemplates));
  }
  return view.page('lessonPlans.title', body);
}

function templateNodes(template: LessonTemplate, canManage: boolean) {
  const label = template.retired ? `${template.name}, retired` : template.name;
  const nodes: Record<string, unknown>[] = [
    { type: 'text', value: `${label}. ${template.body}` },
  ];
  if (!canManage || template.retired) return nodes;
  nodes.push({
    type: 'form',
    action: 'template',
    method: 'post',
    submitLabel: { t: 'lessonPlans.saveTemplate' },
    fields: [
      { name: 'templateId', kind: 'hidden', value: String(template.id) },
      { name: 'name', kind: 'text', label: { t: 'lessonPlans.templateName' }, value: template.name },
      { name: 'body', kind: 'text', label: { t: 'lessonPlans.templateBody' }, value: template.body },
    ],
  });
  nodes.push({
    type: 'button',
    label: { t: 'lessonPlans.retireTemplate' },
    action: 'retire-template',
    values: { templateId: String(template.id) },
  });
  return nodes;
}

function planNodes(plan: LessonPlanRow, page: LessonPlansPage) {
  const nodes: Record<string, unknown>[] = [
    { type: 'text', value: plan.line },
    { type: 'text', value: plan.body },
  ];
  if (plan.reviewComment) nodes.push({ type: 'text', value: plan.reviewComment });
  const canRevise = (plan.status === 'draft' || plan.status === 'returned')
    && (page.canReview || page.ownTeacherId === plan.teacherId);
  if (canRevise) {
    nodes.push({
      type: 'form',
      action: 'plan',
      method: 'post',
      submitLabel: { t: 'lessonPlans.savePlan' },
      fields: [
        { name: 'planId', kind: 'hidden', value: String(plan.id) },
        { name: 'templateId', kind: 'hidden', value: String(plan.templateId) },
        { name: 'subjectId', kind: 'hidden', value: String(plan.subjectId) },
        { name: 'formClassId', kind: 'hidden', value: String(plan.classId) },
        { name: 'teacherId', kind: 'hidden', value: String(plan.teacherId) },
        { name: 'title', kind: 'text', label: { t: 'lessonPlans.titleField' }, value: plan.title },
        { name: 'body', kind: 'text', label: { t: 'lessonPlans.planBody' }, value: plan.body },
      ],
    });
    nodes.push({
      type: 'button',
      label: { t: 'lessonPlans.submit' },
      action: 'submit',
      values: { planId: String(plan.id) },
    });
  }
  if (page.canReview && plan.status === 'submitted') {
    nodes.push({
      type: 'button',
      label: { t: 'lessonPlans.approve' },
      action: 'approve',
      values: { planId: String(plan.id) },
    });
    nodes.push({
      type: 'form',
      action: 'return',
      method: 'post',
      submitLabel: { t: 'lessonPlans.return' },
      fields: [
        { name: 'planId', kind: 'hidden', value: String(plan.id) },
        { name: 'comment', kind: 'text', label: { t: 'lessonPlans.comment' } },
      ],
    });
  }
  return nodes;
}

function newPlanForm(page: LessonPlansPage, templates: LessonTemplate[]) {
  const fields: Record<string, unknown>[] = [
    {
      name: 'templateId',
      kind: 'select',
      label: { t: 'lessonPlans.templateName' },
      options: templates.map((template) => ({ value: String(template.id), label: template.name })),
    },
    {
      name: 'subjectId',
      kind: 'select',
      label: { t: 'lessonPlans.subject' },
      options: page.subjects.map((item) => ({ value: String(item.id), label: item.name })),
    },
  ];
  if (page.ownTeacherId == null) {
    fields.push({
      name: 'teacherId',
      kind: 'select',
      label: { t: 'lessonPlans.teacher' },
      options: page.teachers.map((item) => ({ value: String(item.id), label: item.name })),
    });
  }
  fields.push(
    {
      name: 'formClassId',
      kind: 'select',
      label: { t: 'lessonPlans.class' },
      options: page.classes.map((item) => ({ value: String(item.id), label: item.name })),
    },
    { name: 'title', kind: 'text', label: { t: 'lessonPlans.titleField' } },
    { name: 'body', kind: 'text', label: { t: 'lessonPlans.planBody' } },
  );
  return {
    type: 'form',
    action: 'plan',
    method: 'post',
    submitLabel: { t: 'lessonPlans.savePlan' },
    fields,
  };
}

export default lessonPlans;
