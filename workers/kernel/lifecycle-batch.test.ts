import assert from 'node:assert/strict';
import test from 'node:test';
import {
  enableStatements,
  reversibleChange,
  undoSchemaStatement,
  upgradeStatements,
  type EnableChange,
} from './lifecycle-batch.ts';

const enable: EnableChange = {
  schoolId: 4,
  userId: 2,
  now: 100,
  key: 'hello',
  type: 'plugin',
  publisher: 'yoyol',
  required: false,
  version: '1.0.0',
  manifestJson: '{}',
  extensionRowExists: true,
  versionRowExists: true,
  schema: [],
  migrations: [],
  permissions: [],
  hooks: [{ name: 'dashboard.widgets', priority: 100 }],
  previousHooks: [],
  events: [],
  previousEvents: [],
  capabilities: [],
  previousGrant: null,
  settings: [{ key: 'greeting', value: 'Hello' }],
  previousStatus: null,
};

test('KRN-REG-05 enable writes the school row and commits it as one change', () => {
  const change = reversibleChange(enableStatements(enable));
  assert.equal(change.apply.at(-2)?.sql.startsWith('INSERT INTO school_extensions'), true);
  assert.deepEqual(change.apply.at(-2)?.params, [4, 'hello', 'enabled', 100]);
  assert.equal(change.apply.at(-1)?.params[2], 'extension.enable');
  assert.equal(change.undo[0]?.sql.startsWith('DELETE FROM audit_events'), true);
  assert.equal(change.undo[1]?.sql.startsWith('DELETE FROM school_extensions'), true);
});

test('KRN-REG-06 a failed upgrade drops the table and version it just wrote', () => {
  const create = 'CREATE TABLE IF NOT EXISTS mod_notices_notices (id integer)';
  const change = reversibleChange(upgradeStatements({
    schoolId: 4,
    userId: 2,
    now: 100,
    key: 'notices',
    type: 'module',
    publisher: 'yoyol',
    required: true,
    version: '1.1.0',
    manifestJson: '{}',
    fromVersion: '1.0.0',
    extensionRowExists: true,
    versionRowExists: false,
    schema: [{ sql: create, undo: undoSchemaStatement(create) }],
    migrations: [{ extensionKey: 'notices', id: '001_initial' }],
  }));

  assert.match(change.apply[0].sql, /CREATE TABLE IF NOT EXISTS mod_notices_notices/);
  assert.match(change.undo.map((statement) => statement.sql).join('\n'), /DROP TABLE IF EXISTS mod_notices_notices/);
  assert.match(change.undo.map((statement) => statement.sql).join('\n'), /DELETE FROM extension_versions/);
  assert.equal(undoSchemaStatement('ALTER TABLE mod_notices_notices ADD COLUMN title text'), null);
});
