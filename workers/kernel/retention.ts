export const notificationRetentionMs = 365 * 24 * 60 * 60 * 1000;

export function notificationsDueForRemoval(
  rows: readonly { id: number; createdAt: number }[],
  now: number,
  retentionMs = notificationRetentionMs,
): number[] {
  const cutoff = now - retentionMs;
  return rows.filter((row) => row.createdAt < cutoff).map((row) => row.id);
}
