import type { AppDatabase } from './app-database';

export type DatabaseDriver = 'd1' | 'postgres';

export type DatabaseAdapter = {
  driver: DatabaseDriver;
  db: AppDatabase;
  transaction<T>(run: (db: AppDatabase) => Promise<T>): Promise<T>;
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
