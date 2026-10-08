export function refusalToSavePosition(name: string): string | null {
  if (name.trim().length === 0) return 'Enter the position name.';
  return null;
}

export function refusalToAppoint(input: {
  retired: boolean;
  startsOn: string;
  endsOn: string;
  alreadyOpen: boolean;
}): string | null {
  if (input.retired) return 'This position is retired.';
  if (!isDate(input.startsOn) || !isDate(input.endsOn)) return 'Enter a start date and an end date.';
  if (input.endsOn < input.startsOn) return 'The appointment must end on or after it starts.';
  if (input.alreadyOpen) return 'This student already holds that position for this year.';
  return null;
}

export function refusalToEndAppointment(ended: boolean): string | null {
  if (ended) return 'This appointment has already ended.';
  return null;
}

export function isCurrentHolder(input: {
  ended: boolean;
  startsOn: string;
  endsOn: string;
  today: string;
}): boolean {
  return !input.ended && input.startsOn <= input.today && input.today <= input.endsOn;
}

export function canSeeAppointment(input: {
  role: 'admin' | 'student' | 'other';
  ownStudent: boolean;
}): boolean {
  if (input.role === 'admin') return true;
  if (input.role === 'student') return input.ownStudent;
  return false;
}

export function describeHolder(input: { studentName: string; positionName: string }): string {
  return `${input.studentName}, ${input.positionName}`;
}

export function describeAppointment(input: {
  studentName: string;
  positionName: string;
  startsOn: string;
  endsOn: string;
  ended: boolean;
}): string {
  const state = input.ended ? 'ended' : `${input.startsOn} to ${input.endsOn}`;
  return `${input.studentName}, ${input.positionName}, ${state}`;
}

function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export type LeadershipChoice = { id: number; name: string };

export type LeadershipPosition = { id: number; name: string; retired: boolean };

export type LeadershipAppointment = {
  id: number;
  positionId: number;
  studentId: number;
  startsOn: string;
  endsOn: string;
  ended: boolean;
  current: boolean;
  line: string;
  holderLine: string;
};

export type LeadershipPage = {
  canManage: boolean;
  positions: LeadershipPosition[];
  appointments: LeadershipAppointment[];
  holders: string[];
  students: LeadershipChoice[];
};
