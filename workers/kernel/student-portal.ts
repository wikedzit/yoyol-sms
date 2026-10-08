export function refusalToInviteStudent(input: {
  email: string | null;
  alreadyLinked: boolean;
}): string | null {
  if (input.alreadyLinked) {
    return 'This student already has an account.';
  }
  const email = input.email?.trim() ?? '';
  if (email.length === 0) {
    return 'Add an email before inviting this student.';
  }
  return null;
}

export function refusalToOpenStudentPortal(studentId: number | null): string | null {
  if (studentId == null) {
    return 'This account is not linked to a student.';
  }
  return null;
}

export function describeStudentPortal(input: {
  name: string;
  gender: string | null;
  dateOfBirth: string | null;
  admissionDate: string | null;
  yearName: string | null;
  className: string | null;
  subjects: readonly string[];
}): string[] {
  const gender = input.gender ? `, ${input.gender}` : '';
  const born = input.dateOfBirth ? `, born ${input.dateOfBirth}` : '';
  const admitted = input.admissionDate ? `, admitted ${input.admissionDate}` : '';
  const lines = [`${input.name}${gender}${born}${admitted}`];
  if (input.yearName) {
    lines.push(input.className ? `${input.yearName}: ${input.className}` : `${input.yearName}: no class`);
  }
  if (input.subjects.length > 0) {
    lines.push(input.subjects.join(', '));
  }
  return lines;
}
