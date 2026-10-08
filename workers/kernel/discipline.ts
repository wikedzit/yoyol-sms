export function refusalToSaveKind(name: string): string | null {
  if (name.trim().length === 0) return 'Enter the name.';
  return null;
}

export function refusalToSaveIncident(input: {
  description: string;
  actionTaken: string;
  incidentDate: string;
  typeActive: boolean;
  severityActive: boolean;
  closed: boolean;
  canUpdate: boolean;
}): string | null {
  if (!input.canUpdate) return 'You can change only an incident you recorded.';
  if (input.closed) return 'This incident is closed.';
  if (!input.typeActive) return 'Choose an active incident type.';
  if (!input.severityActive) return 'Choose an active severity.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.incidentDate)) return 'Enter the date of the incident.';
  if (input.description.trim().length === 0) return 'Enter what happened.';
  if (input.actionTaken.trim().length === 0) return 'Enter the action taken.';
  return null;
}

export function refusalToClose(input: { closed: boolean; canClose: boolean }): string | null {
  if (!input.canClose) return 'You do not have permission to close an incident.';
  if (input.closed) return 'This incident is already closed.';
  return null;
}

export function canSeeIncident(input: {
  role: 'admin' | 'teacher' | 'guardian' | 'other';
  recordedByTeacher: boolean;
  linkedStudent: boolean;
}): boolean {
  if (input.role === 'admin') return true;
  if (input.role === 'teacher') return input.recordedByTeacher;
  if (input.role === 'guardian') return input.linkedStudent;
  return false;
}

export function describeIncident(input: {
  studentName: string;
  incidentDate: string;
  typeName: string;
  severityName: string;
  closed: boolean;
}): string {
  const status = input.closed ? 'Closed' : 'Open';
  return `${input.studentName}, ${input.incidentDate}: ${input.typeName}, ${input.severityName} (${status})`;
}

export type DisciplineChoice = { id: number; name: string };

export type DisciplineKind = { id: number; name: string; active: boolean };

export type DisciplineIncident = {
  id: number;
  studentId: number;
  typeId: number;
  severityId: number;
  teacherId: number | null;
  description: string;
  actionTaken: string;
  incidentDate: string;
  closed: boolean;
  canUpdate: boolean;
  line: string;
};

export type DisciplinePage = {
  canManage: boolean;
  canRecord: boolean;
  types: DisciplineKind[];
  severities: DisciplineKind[];
  incidents: DisciplineIncident[];
  students: DisciplineChoice[];
};
