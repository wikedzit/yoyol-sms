export type RecordScope =
  | { kind: 'school' }
  | {
      kind: 'limited';
      studentIds: number[];
      classIds: number[];
      subjectIds: number[];
      teacherIds: number[];
    };

export function keepVisibleRecords<T extends { id: number }>(
  rows: T[],
  scope: RecordScope,
  allowedIds: (scope: Extract<RecordScope, { kind: 'limited' }>) => number[],
): T[] {
  if (scope.kind === 'school') {
    return rows;
  }

  const allowed = new Set(allowedIds(scope));
  return rows.filter((row) => allowed.has(row.id));
}

export function scopeAllowsRecord(
  scope: RecordScope,
  recordId: number | null,
  allowedIds: (scope: Extract<RecordScope, { kind: 'limited' }>) => number[],
): boolean {
  if (scope.kind === 'school') {
    return true;
  }
  if (recordId == null) {
    return false;
  }
  return allowedIds(scope).includes(recordId);
}
