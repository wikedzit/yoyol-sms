export type YearSubjectRow = {
  studentId: number;
  academicYearId: number;
  subjectId: number;
  combinationId: number | null;
};

export function refusalToEditAnotherYear(input: {
  yearId: number;
  activeYearId: number | null;
}): string | null {
  if (input.activeYearId == null) {
    return 'Choose an active academic year before assigning subjects.';
  }
  if (input.yearId !== input.activeYearId) {
    return 'Change subjects for the active year. Past years stay as they were.';
  }
  return null;
}

export function refusalToAssignCombination(input: {
  status: string;
  levelType: string | null;
}): string | null {
  if (input.status === 'retired') {
    return 'That combination is retired.';
  }
  if (input.levelType !== 'a-level') {
    return 'An A-Level combination needs an A-Level enrolment for this year.';
  }
  return null;
}

export function replaceYearSubjects(input: {
  existing: readonly YearSubjectRow[];
  studentId: number;
  yearId: number;
  activeYearId: number | null;
  subjectIds: readonly number[];
  combinationId: number | null;
}): YearSubjectRow[] {
  const refusal = refusalToEditAnotherYear({
    yearId: input.yearId,
    activeYearId: input.activeYearId,
  });
  if (refusal) {
    throw new Error(refusal);
  }
  const rest = input.existing.filter((row) => (
    row.studentId !== input.studentId || row.academicYearId !== input.yearId
  ));
  const subjectIds = [...new Set(input.subjectIds)];
  return [
    ...rest,
    ...subjectIds.map((subjectId) => ({
      studentId: input.studentId,
      academicYearId: input.yearId,
      subjectId,
      combinationId: input.combinationId,
    })),
  ];
}

export function describeYearSubjects(rows: readonly {
  studentName: string;
  yearName: string;
  subjectName: string;
  combinationName: string | null;
}[]): string[] {
  return rows.map((row) => {
    const subject = row.combinationName
      ? `${row.combinationName} (${row.subjectName})`
      : row.subjectName;
    return `${row.studentName}, ${row.yearName}: ${subject}`;
  });
}
