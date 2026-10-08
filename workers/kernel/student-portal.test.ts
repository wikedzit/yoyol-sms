import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeStudentPortal,
  refusalToInviteStudent,
  refusalToOpenStudentPortal,
} from './student-portal.ts';

test('MOD-STU-08 a linked student sees their profile, class, and subjects', () => {
  assert.equal(refusalToOpenStudentPortal(null), 'This account is not linked to a student.');
  assert.equal(refusalToOpenStudentPortal(2), null);
  assert.equal(
    refusalToInviteStudent({ email: '', alreadyLinked: false }),
    'Add an email before inviting this student.',
  );
  assert.equal(
    refusalToInviteStudent({ email: 'amina@riverside.test', alreadyLinked: true }),
    'This student already has an account.',
  );
  assert.equal(refusalToInviteStudent({ email: 'amina@riverside.test', alreadyLinked: false }), null);

  assert.deepEqual(describeStudentPortal({
    name: 'Amina Juma Hassan',
    gender: 'Female',
    dateOfBirth: '2012-04-01',
    admissionDate: '2026-01-15',
    yearName: '2026/2027',
    className: '1A',
    subjects: ['Mathematics'],
  }), [
    'Amina Juma Hassan, Female, born 2012-04-01, admitted 2026-01-15',
    '2026/2027: 1A',
    'Mathematics',
  ]);
});
