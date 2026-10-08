import type { AppDatabase } from './app-database';
import type { CommitRequest, CommitStatement } from '../kernel/commit-strategy';

export type DatabaseDriver = 'd1' | 'postgres';

export type InsertWithOutbox<Row> = {
  change: CommitStatement;
  map: (raw: Record<string, unknown>) => Row;
  outbox: (row: Row) => CommitStatement | null;
  sqliteOutbox: CommitStatement | null;
};

export type DatabaseAdapter = {
  driver: DatabaseDriver;
  db: AppDatabase;
  transaction<T>(run: (db: AppDatabase) => Promise<T>): Promise<T>;
  commit(request: CommitRequest): Promise<void>;
  execute(sql: string): Promise<void>;
  query<Row extends Record<string, unknown>>(sql: string, params: readonly unknown[]): Promise<Row[]>;
  run(sql: string, params: readonly unknown[]): Promise<void>;
  listTables(prefix: string): Promise<string[]>;
  schemaObjectExists(name: string): Promise<boolean>;
  insertWithOutbox<Row>(input: InsertWithOutbox<Row>): Promise<Row | null>;
};

export function readDatabaseDriver(value: string | undefined): DatabaseDriver {
  if (value == null || value === '' || value === 'd1') {
    return 'd1';
  }
  if (value === 'postgres') {
    return 'postgres';
  }
  throw new Error('DB_DRIVER must be d1 or postgres.');
}

export function postgresPlaceholders(sql: string): string {
  let index = 0;
  return sql.replaceAll('?', () => `$${++index}`);
}
