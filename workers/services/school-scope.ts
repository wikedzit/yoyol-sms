import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { school } from '../database/school';

// Used while owner_user_id is still the filter on every screen.
// A single school can be stamped onto new rows. Several schools stay unset
// until the school switcher chooses one.
export async function schoolIdForOwner(
  db: DrizzleD1Database,
  ownerUserId: number,
): Promise<number | null> {
  const schools = await db
    .select({ id: school.id })
    .from(school)
    .where(eq(school.ownerUserId, ownerUserId))
    .limit(2);

  if (schools.length === 1) {
    return schools[0].id;
  }

  return null;
}
