/**
 * Local D1 seed script (idempotent).
 * Run: pnpm db:seed
 *
 * Seeds a default admin for local development only.
 */
import { eq } from 'drizzle-orm';
import { createD1Adapter } from '../database/d1-adapter';
import { getPlatformProxy } from 'wrangler';
import { users } from '../database/users';
import { hashPassword } from '../utils/password.server';

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin123';

async function seed() {
  const { env, dispose } = await getPlatformProxy<{
    DB: D1Database;
  }>();

  try {
    const db = createD1Adapter(env.DB).db;

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, ADMIN_EMAIL))
      .get();

    if (existing) {
      console.log(`Admin already exists (${ADMIN_EMAIL}). Skipping seed.`);
      return;
    }

    const passwordHash = await hashPassword(ADMIN_PASSWORD);

    await db.insert(users).values({
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'admin',
    });

    console.log('Admin seeded successfully.');
    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
  } finally {
    await dispose();
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
