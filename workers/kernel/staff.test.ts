import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeTeachingAssignments,
  refusalToAssignTeaching,
  refusalToInviteStaff,
  refusalToRemoveStaff,
  refusalToUseStaffType,
} from './staff.ts';

test('MOD-STF-01 a staff record has a type and cannot be removed while it still has work', () => {
  assert.equal(refusalToUseStaffType('cook'), 'Choose a staff type: teaching, finance, administration, or support.');
  assert.equal(refusalToUseStaffType('finance'), null);
  assert.equal(
    refusalToRemoveStaff({ assignmentCount: 1, resultCount: 0 }),
    'Remove assignments and results before deleting this staff record.',
  );
  assert.equal(refusalToRemoveStaff({ assignmentCount: 0, resultCount: 0 }), null);
});

test('MOD-STF-03 a staff invite needs an email and a person who does not already have an account', () => {
  assert.equal(refusalToInviteStaff({ hasAccount: true, email: 'joseph@riverside.test' }), 'This staff member already has an account.');
});

test('MOD-STF-02 one teacher keeps a subject and class for one year', () => {
  const existing = [{ teacherId: 4, academicYearId: 1, subjectId: 1, formClassId: 1 }];
  assert.equal(refusalToAssignTeaching({
    existing,
    next: { teacherId: 4, academicYearId: 1, subjectId: 1, formClassId: 1 },
  }), 'This teacher is already assigned to that subject and class for the year.');
  assert.equal(refusalToAssignTeaching({
    existing,
    next: { teacherId: 4, academicYearId: 3, subjectId: 1, formClassId: 1 },
  }), null);
  assert.equal(refusalToInviteStaff({ hasAccount: true, email: 'joseph@riverside.test' }), 'This staff member already has an account.');
  assert.equal(refusalToInviteStaff({ hasAccount: false, email: '  ' }), 'Add an email before inviting this staff member.');
  assert.equal(refusalToInviteStaff({ hasAccount: false, email: 'joseph@riverside.test' }), null);
  assert.deepEqual(describeTeachingAssignments([
    { teacherName: 'Joseph Kimaro', yearName: '2026/2027', subjectName: 'Mathematics', className: '1A' },
  ]), ['Joseph Kimaro, 2026/2027: Mathematics, 1A']);
});
