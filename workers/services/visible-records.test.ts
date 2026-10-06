import assert from 'node:assert/strict';
import test from 'node:test';
import { keepVisibleRecords, scopeAllowsRecord, type RecordScope } from './visible-records.ts';

const teacherScope: RecordScope = {
  kind: 'limited',
  studentIds: [4],
  classIds: [8],
  subjectIds: [3],
  teacherIds: [2],
};

test('KRN-IAM-07 an admin scope keeps every record', () => {
  const rows = [{ id: 1 }, { id: 2 }];
  const visible = keepVisibleRecords(rows, { kind: 'school' }, (scope) => scope.studentIds);
  assert.deepEqual(visible, rows);
});

test('KRN-IAM-07 a limited scope keeps only linked records', () => {
  const rows = [{ id: 4, name: 'Asha' }, { id: 9, name: 'Baraka' }];
  const visible = keepVisibleRecords(rows, teacherScope, (scope) => scope.studentIds);
  assert.deepEqual(visible.map((row) => row.id), [4]);
  assert.equal(scopeAllowsRecord(teacherScope, 9, (scope) => scope.classIds), false);
  assert.equal(scopeAllowsRecord(teacherScope, 8, (scope) => scope.classIds), true);
});
