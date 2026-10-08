import { drizzle } from 'drizzle-orm/d1';
import type { AppDatabase } from './app-database';
import type { DatabaseAdapter, InsertWithOutbox } from './adapter';
import { runCommit, type CommitRequest, type CommitStatement } from '../kernel/commit-strategy';

export function createD1Adapter(database: D1Database): DatabaseAdapter {
  const db = drizzle(database);
  return {
    driver: 'd1',
    db,
    transaction() {
      throw new Error('D1 cannot open a transaction with BEGIN. Use commit() for this engine.');
    },
    commit(request: CommitRequest) {
      return runCommit({
        engine: 'd1',
        request,
        apply: (statements) => applyBatch(database, statements),
        rollback: async () => {
          throw new Error('D1 cannot roll back with BEGIN.');
        },
      });
    },
    async execute(sql: string) {
      await database.exec(sql.replaceAll(/\s+/g, ' ').trim());
    },
    query<Row extends Record<string, unknown>>(sql: string, params: readonly unknown[]) {
      return readRows<Row>(database, sql, params);
    },
    async run(sql: string, params: readonly unknown[]) {
      await prepare(database, { sql, params }).run();
    },
    async listTables(prefix: string) {
      const rows = await readRows<{ name: string }>(
        database,
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name GLOB ?",
        [`${prefix}*`],
      );
      return rows.map((row) => row.name);
    },
    async schemaObjectExists(name: string) {
      const row = await database.prepare('SELECT name FROM sqlite_master WHERE name = ?').bind(name).first();
      return row !== null;
    },
    insertWithOutbox<Row>(input: InsertWithOutbox<Row>) {
      return insertOnD1(database, input);
    },
  };
}

async function applyBatch(database: D1Database, statements: readonly CommitStatement[]): Promise<void> {
  if (statements.length === 0) {
    return;
  }
  await database.batch(statements.map((statement) => prepare(database, statement)));
}

async function insertOnD1<Row>(database: D1Database, input: InsertWithOutbox<Row>): Promise<Row | null> {
  const statements = input.sqliteOutbox ? [input.change, input.sqliteOutbox] : [input.change];
  const results = await database.batch(statements.map((statement) => prepare(database, statement)));
  const raw = results[0]?.results?.[0];
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  return input.map(raw as Record<string, unknown>);
}

async function readRows<Row extends Record<string, unknown>>(
  database: D1Database,
  sql: string,
  params: readonly unknown[],
): Promise<Row[]> {
  const result = await prepare(database, { sql, params }).all<Row>();
  return result.results ?? [];
}

function prepare(database: D1Database, statement: CommitStatement): D1PreparedStatement {
  const sql = statement.sql.replaceAll(/\s+/g, ' ').trim();
  const prepared = database.prepare(sql);
  const params = statement.params.map(storedValue);
  return params.length > 0 ? prepared.bind(...params) : prepared;
}

function storedValue(value: unknown): string | number | null {
  if (value === null || typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  throw new Error('A statement has a value that cannot be stored.');
}
