import assert from 'node:assert/strict';
import test from 'node:test';
import { commitStyle, runCommit } from './commit-strategy.ts';

test('KRN-DAT-03 PostgreSQL rolls a failed change back and does not run undo SQL', async () => {
  const applied: string[] = [];
  let rolledBack = false;
  await assert.rejects(() => runCommit({
    engine: 'postgres',
    request: {
      statements: [{ sql: 'insert into school_extensions values (1)', params: [] }],
      undo: [{ sql: 'delete from school_extensions', params: [] }],
      after: async () => {
        throw new Error('onEnable failed');
      },
    },
    apply: async (statements) => {
      applied.push(...statements.map((statement) => statement.sql));
    },
    rollback: async () => {
      rolledBack = true;
    },
  }));
  assert.equal(commitStyle('postgres'), 'transaction');
  assert.equal(rolledBack, true);
  assert.deepEqual(applied, ['insert into school_extensions values (1)']);
});

test('KRN-DAT-03 D1 undoes a failed change because it cannot BEGIN', async () => {
  const applied: string[] = [];
  let rolledBack = false;
  await assert.rejects(() => runCommit({
    engine: 'd1',
    request: {
      statements: [{ sql: 'insert into school_extensions values (1)', params: [] }],
      undo: [{ sql: 'delete from school_extensions', params: [] }],
      after: async () => {
        throw new Error('onEnable failed');
      },
    },
    apply: async (statements) => {
      applied.push(...statements.map((statement) => statement.sql));
    },
    rollback: async () => {
      rolledBack = true;
    },
  }));
  assert.equal(commitStyle('d1'), 'batch');
  assert.equal(rolledBack, false);
  assert.deepEqual(applied, [
    'insert into school_extensions values (1)',
    'delete from school_extensions',
  ]);
});
