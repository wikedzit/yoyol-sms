export function requireOwnerUserId(ownerUserId: number | null): number {
  if (ownerUserId == null) {
    throw new Error('A signed-in user is required to access this data');
  }

  return ownerUserId;
}

export function requireSchoolId(schoolId: number | null): number {
  if (schoolId == null) {
    throw new Error('Choose a school before changing its records.');
  }

  return schoolId;
}
