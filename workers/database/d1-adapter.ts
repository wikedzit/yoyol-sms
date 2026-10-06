import { drizzle } from 'drizzle-orm/d1';
import type { AppDatabase } from './app-database';
import type { DatabaseAdapter } from './adapter';

export function createD1Adapter(database: D1Database): DatabaseAdapter {
  const db = drizzle(database);
  return {
    driver: 'd1',
    db,
    transaction(run) {
      // Drizzle types the D1 transaction as its own class. Callers use the same query methods as AppDatabase.
      return db.transaction((tx) => run(tx as unknown as AppDatabase));
    },
  };
}
