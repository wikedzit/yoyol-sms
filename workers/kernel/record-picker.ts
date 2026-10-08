export function matchingRecords<T extends { id: number; label: string }>(
  records: readonly T[],
  query: string,
  allowedIds: ReadonlySet<number> | null,
): T[] {
  const needle = query.trim().toLowerCase();
  return records.filter((record) => {
    if (allowedIds && !allowedIds.has(record.id)) {
      return false;
    }
    if (!needle) {
      return true;
    }
    return record.label.toLowerCase().includes(needle);
  });
}
