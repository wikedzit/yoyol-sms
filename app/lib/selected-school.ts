import { schoolCookie } from 'workers/utils/cookies.server';

export async function readRememberedSchoolId(request: Request): Promise<number | null> {
  const raw = await schoolCookie.parse(request.headers.get('Cookie'));
  const schoolId = Number(raw);
  if (!Number.isInteger(schoolId) || schoolId <= 0) {
    return null;
  }
  return schoolId;
}

export function selectSchoolId(
  url: URL,
  schools: { id: number }[],
  rememberedId?: number | null,
): number | null {
  const requested = Number(url.searchParams.get('schoolId'));
  if (schools.some((school) => school.id === requested)) {
    return requested;
  }

  if (
    rememberedId != null &&
    schools.some((school) => school.id === rememberedId)
  ) {
    return rememberedId;
  }

  return schools[0]?.id ?? null;
}
