export const staffTypes = ['teaching', 'finance', 'administration', 'support'] as const;

export type StaffType = (typeof staffTypes)[number];

export function refusalToUseStaffType(value: string): string | null {
  if ((staffTypes as readonly string[]).includes(value)) {
    return null;
  }
  return 'Choose a staff type: teaching, finance, administration, or support.';
}

export function refusalToRemoveStaff(input: {
  assignmentCount: number;
  resultCount: number;
}): string | null {
  if (input.assignmentCount > 0 || input.resultCount > 0) {
    return 'Remove assignments and results before deleting this staff record.';
  }
  return null;
}

export type TeachingAssignment = {
  teacherId: number;
  academicYearId: number;
  subjectId: number;
  formClassId: number;
};

export function refusalToAssignTeaching(input: {
  existing: readonly TeachingAssignment[];
  next: TeachingAssignment;
}): string | null {
  const duplicate = input.existing.some((row) => (
    row.teacherId === input.next.teacherId
    && row.academicYearId === input.next.academicYearId
    && row.subjectId === input.next.subjectId
    && row.formClassId === input.next.formClassId
  ));
  if (duplicate) {
    return 'This teacher is already assigned to that subject and class for the year.';
  }
  return null;
}

export function refusalToInviteStaff(input: { hasAccount: boolean; email: string }): string | null {
  if (input.hasAccount) {
    return 'This staff member already has an account.';
  }
  if (input.email.trim().length === 0) {
    return 'Add an email before inviting this staff member.';
  }
  return null;
}

export function describeTeachingAssignments(rows: readonly {
  teacherName: string;
  yearName: string;
  subjectName: string;
  className: string;
}[]): string[] {
  return rows.map((row) => `${row.teacherName}, ${row.yearName}: ${row.subjectName}, ${row.className}`);
}
