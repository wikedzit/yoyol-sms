export type StudentRecord = {
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: string;
  dateOfBirth: string | null;
  admissionDate: string | null;
};

export function describeStudentRecords(students: readonly StudentRecord[]): string[] {
  return students.map((student) => {
    const name = [student.firstName, student.middleName, student.lastName]
      .filter((part) => part && part.trim().length > 0)
      .join(' ');
    const details = [student.gender];
    if (student.dateOfBirth) {
      details.push(`born ${student.dateOfBirth}`);
    }
    if (student.admissionDate) {
      details.push(`admitted ${student.admissionDate}`);
    }
    return `${name}, ${details.join(', ')}`;
  });
}
