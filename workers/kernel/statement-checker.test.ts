import assert from 'node:assert/strict';
import test from 'node:test';
import { sql } from 'drizzle-orm';
import { chargeStatement, checkExtensionStatement, createScopedDatabase, openStatementBudget, runScopedStatement, scopeExtensionStatement } from './statement-checker.ts';

const schoolId = 7;

test('KRN-DAT-08 a module statement must stay on its own tables and the current school', () => {
  const checked = checkExtensionStatement({
    extensionKey: 'notices',
    schoolId,
    sql: 'select id, title from mod_notices_notices where school_id = ?',
    params: [schoolId],
  });
  assert.equal(checked.kind, 'select');

  assert.throws(
    () => checkExtensionStatement({
      extensionKey: 'notices',
      schoolId,
      sql: 'select id from mod_notices_notices',
      params: [],
    }),
    /current school/,
  );
  assert.throws(
    () => checkExtensionStatement({
      extensionKey: 'hello',
      schoolId,
      sql: 'select id from mod_notices_notices where school_id = ?',
      params: [schoolId],
    }),
    /could not be checked/,
  );
  assert.throws(
    () => checkExtensionStatement({
      extensionKey: 'notices',
      schoolId,
      sql: 'drop table mod_notices_notices',
      params: [],
    }),
    /could not be checked/,
  );
});

test('KRN-DAT-08 an insert must set school_id to the current school', () => {
  checkExtensionStatement({
    extensionKey: 'notices',
    schoolId,
    sql: 'insert into mod_notices_notices (title, school_id) values (?, ?)',
    params: ['Holiday', schoolId],
  });
  assert.throws(
    () => checkExtensionStatement({
      extensionKey: 'notices',
      schoolId,
      sql: 'insert into mod_notices_notices (title, school_id) values (?, ?)',
      params: ['Holiday', 99],
    }),
    /current school/,
  );
});

test('SDK-04 the scoped client adds the current school before the statement runs', async () => {
  const seen: { sql: string; params: readonly unknown[] }[] = [];
  const database = createScopedDatabase({
    extensionKey: 'notices',
    schoolId,
    query: async (statement, params) => {
      seen.push({ sql: statement, params });
      return [];
    },
  });

  await database.run(sql`select id from mod_notices_notices`);
  assert.match(seen[0].sql, /where school_id = \?/);
  assert.equal(seen[0].params.at(-1), schoolId);

  const inserted = scopeExtensionStatement({
    extensionKey: 'notices',
    schoolId,
    sql: 'insert into mod_notices_notices (title) values (?)',
    params: ['Holiday'],
  });
  assert.match(inserted.sql, /school_id/);
  assert.deepEqual(inserted.params, ['Holiday', schoolId]);

  await assert.rejects(() => database.run(sql`select id from students`));
  assert.equal(seen.length, 1);
});

test('RUN-05 the scoped client stops after its statement limit', async () => {
  const budget = openStatementBudget(2);
  chargeStatement(budget);
  chargeStatement(budget);
  assert.throws(() => chargeStatement(budget), /more than 2 statements/);

  let ran = 0;
  const database = createScopedDatabase({
    extensionKey: 'notices',
    schoolId,
    statementLimit: 1,
    query: async () => {
      ran += 1;
      return [];
    },
  });
  await database.run(sql`select id from mod_notices_notices`);
  await assert.rejects(
    () => database.run(sql`select id from mod_notices_notices`),
    (error: unknown) => {
      const cause = error instanceof Error ? error.cause : undefined;
      return cause instanceof Error && cause.message === 'This extension used more than 1 statements.';
    },
  );
  assert.equal(ran, 1);
});

test('KRN-DAT-07 a rejected statement is never executed', async () => {
  let ran = false;
  await assert.rejects(
    () => runScopedStatement({
      extensionKey: 'notices',
      schoolId,
      sql: 'select * from students where school_id = ?',
      params: [schoolId],
      execute: async () => {
        ran = true;
        return [];
      },
    }),
    /could not be checked/,
  );
  assert.equal(ran, false);
});
