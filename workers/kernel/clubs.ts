export function refusalToSaveClub(input: { name: string; description: string }): string | null {
  if (input.name.trim().length === 0) return 'Enter the club name.';
  if (input.description.trim().length === 0) return 'Enter what the club does.';
  return null;
}

export function refusalToCloseClub(closed: boolean): string | null {
  if (closed) return 'This club is already closed.';
  return null;
}

export function refusalToEnrol(input: { closed: boolean; alreadyMember: boolean }): string | null {
  if (input.closed) return 'This club is closed.';
  if (input.alreadyMember) return 'This student is already in the club for this year.';
  return null;
}

export function refusalToSaveActivity(input: {
  title: string;
  description: string;
  activityDate: string;
  closed: boolean;
  canWrite: boolean;
}): string | null {
  if (!input.canWrite) return 'Only the club patron can change its activities.';
  if (input.closed) return 'This club is closed.';
  if (input.title.trim().length === 0) return 'Enter the activity title.';
  if (input.description.trim().length === 0) return 'Enter what the club did.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.activityDate)) return 'Enter the activity date.';
  return null;
}

export function canSeeClub(input: {
  role: 'admin' | 'teacher' | 'student' | 'guardian' | 'other';
  isPatron: boolean;
  member: boolean;
}): boolean {
  if (input.role === 'admin') return true;
  if (input.role === 'teacher') return input.isPatron;
  if (input.role === 'student' || input.role === 'guardian') return input.member;
  return false;
}

export function describeClub(input: { name: string; patronName: string; closed: boolean }): string {
  return input.closed ? `${input.name}, ${input.patronName}, closed` : `${input.name}, ${input.patronName}`;
}

export function describeActivity(input: { activityDate: string; title: string; clubName: string }): string {
  return `${input.activityDate} ${input.title}: ${input.clubName}`;
}

export type ClubChoice = { id: number; name: string };

export type ClubRecord = {
  id: number;
  name: string;
  description: string;
  patronId: number;
  patronName: string;
  closed: boolean;
  line: string;
  canWrite: boolean;
};

export type ClubMember = {
  id: number;
  clubId: number;
  studentId: number;
  studentName: string;
  line: string;
};

export type ClubActivity = {
  id: number;
  clubId: number;
  title: string;
  description: string;
  activityDate: string;
  line: string;
  canWrite: boolean;
};

export type ClubsPage = {
  canManage: boolean;
  clubs: ClubRecord[];
  members: ClubMember[];
  activities: ClubActivity[];
  students: ClubChoice[];
  teachers: ClubChoice[];
};
