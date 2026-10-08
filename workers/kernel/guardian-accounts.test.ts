import assert from 'node:assert/strict';
import test from 'node:test';
import {
  keepStudentLines,
  refusalToInviteGuardian,
  studentsVisibleToParent,
} from './guardian-accounts.ts';

test('MOD-STU-06 a parent sees only the students linked to their guardian account', () => {
  assert.equal(
    refusalToInviteGuardian({ email: null, userId: null }),
    'Add an email before inviting this guardian.',
  );
  assert.equal(
    refusalToInviteGuardian({ email: 'neema@riverside.test', userId: 9 }),
    'This guardian already has an account.',
  );
  assert.equal(refusalToInviteGuardian({ email: 'neema@riverside.test', userId: null }), null);

  assert.deepEqual(studentsVisibleToParent({
    linkedStudentIds: [2],
    requestedStudentIds: [2, 3, 4],
  }), [2]);
  assert.deepEqual(studentsVisibleToParent({
    linkedStudentIds: [],
    requestedStudentIds: [2, 3],
  }), []);

  const lines = keepStudentLines([
    { type: 'text', value: { t: 'students.records' } },
    { type: 'text', value: 'Amina Juma Hassan, Female, born 2012-04-01' },
    { type: 'text', value: 'Peter Mushi, Male, admitted 2026-02-01' },
    { type: 'section', body: [
      { type: 'text', value: 'Amina Juma Hassan: Neema Hassan (Mother)' },
      { type: 'text', value: 'Peter Mushi: Neema Hassan (Aunt)' },
    ] },
  ], ['Amina Juma Hassan']);

  assert.deepEqual(lines, [
    { type: 'text', value: { t: 'students.records' } },
    { type: 'text', value: 'Amina Juma Hassan, Female, born 2012-04-01' },
    { type: 'section', body: [
      { type: 'text', value: 'Amina Juma Hassan: Neema Hassan (Mother)' },
    ] },
  ]);
});
