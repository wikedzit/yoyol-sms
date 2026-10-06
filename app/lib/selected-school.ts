export function selectSchoolId(
  url: URL,
  schools: { id: number }[],
): number | null {
  const requested = Number(url.searchParams.get('schoolId'));
  if (schools.some((school) => school.id === requested)) {
    return requested;
  }

  return schools[0]?.id ?? null;
}
