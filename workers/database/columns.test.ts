import assert from 'node:assert/strict';
import test from 'node:test';
import { pgTable } from 'drizzle-orm/pg-core';
import { sqliteTable } from 'drizzle-orm/sqlite-core';
import { columnPlan, sharedRecordColumns } from './columns.ts';
import { readDatabaseDriver } from './adapter.ts';

test('KRN-DAT-04 sqlite and postgres share one column plan', () => {
  const sqlite = columnPlan('sqlite');
  const postgres = columnPlan('postgres');
  assert.equal(sqlite.timestamp, 'integer');
  assert.equal(postgres.timestamp, 'timestamptz');
  assert.equal(sqlite.boolean, 'integer');
  assert.equal(postgres.boolean, 'boolean');
  assert.equal(sqlite.json, 'text');
  assert.equal(postgres.json, 'jsonb');
});

test('KRN-DAT-04 the same helper builds a sqlite table and a postgres table', () => {
  const sqlite = sqliteTable('shared_records', sharedRecordColumns('sqlite'));
  const postgres = pgTable('shared_records', sharedRecordColumns('postgres'));
  assert.equal(sqlite.updatedAt.name, 'updated_at');
  assert.equal(postgres.updatedAt.name, 'updated_at');
  assert.equal(sqlite.active.name, 'active');
  assert.equal(postgres.payload.name, 'payload');
});

test('KRN-DAT-01 DB_DRIVER selects d1 unless postgres is named', () => {
  assert.equal(readDatabaseDriver(undefined), 'd1');
  assert.equal(readDatabaseDriver('d1'), 'd1');
  assert.equal(readDatabaseDriver('postgres'), 'postgres');
  assert.throws(() => readDatabaseDriver('mysql'), /DB_DRIVER/);
});
