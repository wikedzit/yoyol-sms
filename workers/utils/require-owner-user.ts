export function requireOwnerUserId(ownerUserId: number | null): number {
  if (ownerUserId == null) {
    throw new Error('A signed-in user is required to access this data');
  }

  return ownerUserId;
}
