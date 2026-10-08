export type GradeBand = {
  min: number;
  max: number;
  label: string;
};

export function gradeForScore(scales: readonly GradeBand[], score: number): string {
  if (!Number.isInteger(score)) {
    return refusalOutsideScale();
  }
  const match = [...scales]
    .sort((left, right) => right.min - left.min)
    .find((band) => score >= band.min && score <= band.max);
  if (!match) {
    return refusalOutsideScale();
  }
  return match.label;
}

export function refusalToEditReleasedResult(released: boolean): string | null {
  if (released) {
    return 'Results for this term are released. Withdraw the release before changing marks.';
  }
  return null;
}

function refusalOutsideScale(): string {
  throw new Error('That mark is outside the grading scale.');
}

export function describeResults(rows: readonly {
  studentName: string;
  termName: string;
  subjectName: string;
  assessmentName: string;
  score: number;
  gradeLabel: string;
}[]): string[] {
  return rows.map((row) => (
    `${row.studentName}, ${row.termName}: ${row.subjectName} ${row.assessmentName} ${row.score} ${row.gradeLabel}`
  ));
}

export const defaultGradeBands: readonly GradeBand[] = [
  { min: 75, max: 100, label: 'A' },
  { min: 65, max: 74, label: 'B' },
  { min: 45, max: 64, label: 'C' },
  { min: 30, max: 44, label: 'D' },
  { min: 0, max: 29, label: 'F' },
];
