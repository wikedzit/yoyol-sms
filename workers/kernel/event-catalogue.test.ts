import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addedCapabilities,
  coreEventNames,
  coreHookNames,
  deliveryAfterFailure,
  outboxInsert,
  parseCoreEvent,
  retryDelayMs,
  sqliteOutboxInsert,
} from './event-catalogue.ts';

test('KRN-EVT-06 and KRN-EVT-07 the core catalogue validates event payloads', () => {
  assert.equal(coreHookNames.includes('student.beforeCreate'), true);
  assert.equal(coreEventNames.includes('students.student.enrolled'), true);
  const event = parseCoreEvent('students.student.enrolled', {
    studentId: 4,
    formClassId: 2,
    academicYearId: 1,
  });
  assert.equal(event.payloadVersion, 1);
  assert.throws(() => parseCoreEvent('students.student.enrolled', { studentId: 4 }), /studentId|formClassId|expected|Required/i);
  assert.throws(() => parseCoreEvent('not.an.event', {}), /Unknown event/);
});

test('KRN-EVT-03 the outbox row can share a commit with the record that caused it', () => {
  const postgres = outboxInsert({
    schoolId: 4,
    name: 'students.student.enrolled',
    payload: { studentId: 9, formClassId: 2, academicYearId: 1 },
    now: 100,
  });
  assert.equal(postgres.params[3], JSON.stringify({ studentId: 9, formClassId: 2, academicYearId: 1 }));

  const sqlite = sqliteOutboxInsert({
    schoolId: 4,
    name: 'assessment.grade.recorded',
    payload: { studentId: 9, subjectId: 3 },
    idField: 'gradeId',
    now: 100,
  });
  assert.match(sqlite.sql, /last_insert_rowid\(\)/);
  assert.equal(JSON.parse(String(sqlite.params[3])).gradeId, undefined);
});

test('KRN-REG-06 a new capability needs fresh consent', () => {
  assert.deepEqual(addedCapabilities(['core.students:read'], ['core.students:read']), []);
  assert.deepEqual(
    addedCapabilities(['core.students:read'], ['core.students:read', 'files:write']),
    ['files:write'],
  );
});

test('KRN-EVT-04 and KRN-EVT-05 delivery retries and then parks the event', () => {
  assert.equal(deliveryAfterFailure(1), 'retry');
  assert.equal(deliveryAfterFailure(4), 'retry');
  assert.equal(deliveryAfterFailure(5), 'dead');
  assert.equal(retryDelayMs(1), 1_000);
  assert.equal(retryDelayMs(2), 2_000);
  assert.equal(retryDelayMs(10), 30_000);
});
