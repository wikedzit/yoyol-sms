import { postgresPlaceholders, type InsertWithOutbox } from './adapter';
import type { CommitRequest } from '../kernel/commit-strategy';

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
    commit(request: CommitRequest) {
      return commitOnPostgres(pool, request);
    },
    async execute(sql: string) {
      await pool.query(sql);
    },
    async query<Row extends Record<string, unknown>>(sql: string, params: readonly unknown[]) {
      const result = await pool.query(postgresPlaceholders(sql), [...params]);
      return result.rows as Row[];
    },
    async run(sql: string, params: readonly unknown[]) {
      await pool.query(postgresPlaceholders(sql), [...params]);
    },
    async listTables(prefix: string) {
      const result = await pool.query(
        "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE $1",
        [`${prefix}%`],
      );
      return result.rows.map((row) => String(row.name));
    },
    async schemaObjectExists(name: string) {
      const found = await pool.query('SELECT to_regclass($1) AS name', [name]);
      return found.rows[0]?.name != null;
    },
    insertWithOutbox<Row>(input: InsertWithOutbox<Row>) {
      return insertOnPostgres(pool, input);
    },
  };
}

async function commitOnPostgres(
  pool: { connect: () => Promise<PostgresClient> },
  request: CommitRequest,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const statement of request.statements) {
      await client.query(postgresPlaceholders(statement.sql), [...statement.params]);
    }
    await request.after?.();
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function insertOnPostgres<Row>(
  pool: { connect: () => Promise<PostgresClient> },
  input: InsertWithOutbox<Row>,
): Promise<Row | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(postgresPlaceholders(input.change.sql), [...input.change.params]);
    const raw = inserted.rows[0] as Record<string, unknown> | undefined;
    if (!raw) {
      await client.query('COMMIT');
      return null;
    }
    const row = input.map(raw);
    const event = input.outbox(row);
    if (event) {
      await client.query(postgresPlaceholders(event.sql), [...event.params]);
    }
    await client.query('COMMIT');
    return row;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

type PostgresClient = {
  query: (sql: string, params?: readonly unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  release: () => void;
};
