import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { parseModuleMigration } from './module-schema.ts';
import {
  compileModuleMigration,
  extensionsInApplyOrder,
  moduleTableName,
  pendingMigrations,
} from './schema-compiler.ts';

const studentsMigration = parseModuleMigration(JSON.parse(readFileSync(
  join(import.meta.dirname, '../../extensions/students/schema/001_initial.json'),
  'utf8',
)));

test('KRN-DAT-06 a module table is prefixed and keeps the kernel columns', () => {
  const sqlite = compileModuleMigration('students', studentsMigration, 'sqlite').join('\n');
  const postgres = compileModuleMigration('students', studentsMigration, 'postgres').join('\n');

  assert.equal(moduleTableName('students', 'students'), 'mod_students_students');
  assert.match(sqlite, /CREATE TABLE IF NOT EXISTS mod_students_students/);
  assert.match(sqlite, /school_id integer NOT NULL REFERENCES school\(id\)/);
  assert.match(sqlite, /created_by integer REFERENCES users\(id\)/);
  assert.match(sqlite, /form_class_id integer REFERENCES mod_academics_form_classes\(id\) ON DELETE CASCADE/);
  assert.match(sqlite, /campus_id integer REFERENCES campus\(id\) ON DELETE SET NULL/);
  assert.match(postgres, /id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY/);
  assert.match(postgres, /school_id bigint NOT NULL REFERENCES school\(id\)/);
});

test('KRN-DAT-06 addColumn, createIndex, and dropIndex compile for both dialects', () => {
  const migration = parseModuleMigration({
    id: '002_notes',
    operations: [
      { op: 'addColumn', table: 'notices', column: { name: 'audience', type: 'text' } },
      { op: 'createIndex', table: 'notices', columns: ['audience'] },
      { op: 'dropIndex', table: 'notices', columns: ['audience'] },
    ],
  });
  const sqlite = compileModuleMigration('notices', migration, 'sqlite');
  assert.deepEqual(sqlite, [
    'ALTER TABLE mod_notices_notices ADD COLUMN audience text',
    'CREATE INDEX IF NOT EXISTS mod_notices_notices_audience ON mod_notices_notices (audience)',
    'DROP INDEX IF EXISTS mod_notices_notices_audience',
  ]);
  const postgres = compileModuleMigration('notices', migration, 'postgres')[0];
  assert.match(postgres, /ALTER TABLE mod_notices_notices ADD COLUMN audience text/);
});

test('KRN-DAT-06 a required new column needs a default', () => {
  assert.throws(
    () => parseModuleMigration({
      id: '002_notes',
      operations: [
        { op: 'addColumn', table: 'notices', column: { name: 'audience', type: 'text', notNull: true } },
      ],
    }),
    /needs a default/,
  );
});

test('KRN-DAT-05 a recorded migration is not applied again', () => {
  const pending = pendingMigrations(['001_initial'], [studentsMigration]);
  assert.deepEqual(pending, []);
  assert.deepEqual(pendingMigrations([], [studentsMigration]).map((migration) => migration.id), ['001_initial']);
});

test('KRN-DAT-05 dependencies are applied before the extension that needs them', () => {
  const manifests = [
    { key: 'academics', requires: {} },
    { key: 'students', requires: { extensions: { academics: '^1.0.0' } } },
    { key: 'staff', requires: { extensions: { academics: '^1.0.0' } } },
    {
      key: 'assessment',
      requires: { extensions: { academics: '^1.0.0', students: '^1.0.0', staff: '^1.0.0' } },
    },
  ];
  assert.deepEqual(
    extensionsInApplyOrder(['assessment', 'students', 'staff', 'academics'], manifests),
    ['academics', 'students', 'staff', 'assessment'],
  );
});
