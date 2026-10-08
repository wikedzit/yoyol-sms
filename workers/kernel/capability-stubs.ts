export function refusalToCallCapability(input: {
  capability: string;
  grants: readonly string[];
  schoolId: number;
  callerSchoolId: number;
  userId: number | null;
}): string | null {
  if (!input.grants.includes(input.capability)) return 'This extension was not granted that capability.';
  if (input.schoolId !== input.callerSchoolId) return 'This extension cannot use another school.';
  if (input.userId == null) return 'This extension has no signed-in caller.';
  return null;
}

export function createCapabilityStub(input: {
  grants: readonly string[];
  schoolId: number;
  userId: number | null;
}) {
  return {
    call(capability: string, callerSchoolId: number): { ok: true } | { error: string } {
      const refused = refusalToCallCapability({
        capability,
        grants: input.grants,
        schoolId: input.schoolId,
        callerSchoolId,
        userId: input.userId,
      });
      return refused ? { error: refused } : { ok: true };
    },
  };
}
