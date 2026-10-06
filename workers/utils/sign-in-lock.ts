export const SIGN_IN_WINDOW_MS = 15 * 60 * 1000;
export const ACCOUNT_FAILURE_LIMIT = 5;
export const ADDRESS_FAILURE_LIMIT = 20;

export function isLockedOut(
  failureTimes: number[],
  now: number,
  windowMs: number,
  limit: number,
): boolean {
  const recentFailures = failureTimes.filter((time) => now - time < windowMs);
  return recentFailures.length >= limit;
}
