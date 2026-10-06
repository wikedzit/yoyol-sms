export async function createPostgresAdapter(databaseUrl: string) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required when DB_DRIVER is postgres.');
  }

  const { drizzle } = await import('drizzle-orm/node-postgres');
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  return {
    driver: 'postgres' as const,
    db,
    transaction<T>(run: (connection: typeof db) => Promise<T>) {
      return db.transaction(run);
    },
  };
}
