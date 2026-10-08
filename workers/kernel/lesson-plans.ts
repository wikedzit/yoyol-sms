export const planStatuses = ['draft', 'submitted', 'approved', 'returned'] as const;

export type PlanStatus = (typeof planStatuses)[number];

const statusLabels: Record<PlanStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  returned: 'Returned',
};

export function refusalToSaveTemplate(input: { name: string; body: string }): string | null {
  if (input.name.trim().length === 0) return 'Enter the template name.';
  if (input.body.trim().length === 0) return 'Enter what the template asks the teacher to write.';
  return null;
}

export function refusalToSavePlan(input: {
  title: string;
  body: string;
  status: string;
  ownsPlan: boolean;
  templateActive: boolean;
}): string | null {
  if (!input.ownsPlan) return 'You can change only your own lesson plans.';
  if (input.status === 'submitted' || input.status === 'approved') {
    return 'This lesson plan cannot be changed until it is returned.';
  }
  if (!input.templateActive) return 'Choose an active template.';
  if (input.title.trim().length === 0) return 'Enter the lesson plan title.';
  if (input.body.trim().length === 0) return 'Enter the lesson plan.';
  return null;
}

export function refusalToSubmit(input: { status: string; ownsPlan: boolean }): string | null {
  if (!input.ownsPlan) return 'You can change only your own lesson plans.';
  if (input.status !== 'draft' && input.status !== 'returned') {
    return 'Only a draft or a returned plan can be submitted.';
  }
  return null;
}

export function refusalToReview(input: {
  status: string;
  decision: 'approve' | 'return';
  comment: string;
}): string | null {
  if (input.status !== 'submitted') return 'Only a submitted plan can be reviewed.';
  if (input.decision === 'return' && input.comment.trim().length === 0) {
    return 'Enter why this lesson plan is being returned.';
  }
  return null;
}

export function statusLabel(status: string): string {
  return planStatuses.includes(status as PlanStatus) ? statusLabels[status as PlanStatus] : status;
}

export function describePlan(input: {
  title: string;
  subjectName: string;
  className: string;
  teacherName: string;
  status: string;
}): string {
  return `${input.title}: ${input.subjectName}, ${input.className}, ${input.teacherName} (${statusLabel(input.status)})`;
}

export type LessonChoice = { id: number; name: string };

export type LessonTemplate = { id: number; name: string; body: string; retired: boolean };

export type LessonPlanRow = {
  id: number;
  title: string;
  body: string;
  status: string;
  reviewComment: string;
  templateId: number;
  subjectId: number;
  classId: number;
  teacherId: number;
  line: string;
};

export type LessonPlansPage = {
  canManageTemplates: boolean;
  canReview: boolean;
  canWrite: boolean;
  ownTeacherId: number | null;
  templates: LessonTemplate[];
  plans: LessonPlanRow[];
  subjects: LessonChoice[];
  teachers: LessonChoice[];
  classes: LessonChoice[];
};
