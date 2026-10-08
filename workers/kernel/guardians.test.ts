import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeGuardianLinks,
  primaryContactPlan,
  refusalToLinkTwice,
  refusalToRemoveLinkedGuardian,
} from './guardians.ts';

test('MOD-STU-05 a guardian can be linked to many students, and one contact stays primary', () => {
  assert.equal(refusalToRemoveLinkedGuardian(1), 'Remove the student links before deleting this guardian.');
  assert.equal(refusalToRemoveLinkedGuardian(0), null);
  assert.equal(refusalToLinkTwice(true), 'That guardian is already linked to this student.');
  assert.equal(refusalToLinkTwice(false), null);

  const links = [
    { id: 1, studentId: 2, isPrimary: true },
    { id: 2, studentId: 2, isPrimary: false },
    { id: 3, studentId: 3, isPrimary: true },
  ];
  assert.deepEqual(primaryContactPlan(links, 2), { primaryId: 2, clearIds: [1] });
  assert.deepEqual(primaryContactPlan(links, 3), { primaryId: 3, clearIds: [] });
  assert.throws(() => primaryContactPlan(links, 9), /That guardian link was not found/);

  assert.deepEqual(describeGuardianLinks([
    { studentName: 'Amina Juma Hassan', guardianName: 'Neema Hassan', relationship: 'Mother', primary: true },
    { studentName: 'Peter Mushi', guardianName: 'Neema Hassan', relationship: 'Aunt', primary: false },
  ]), [
    'Amina Juma Hassan: Neema Hassan (Mother, primary)',
    'Peter Mushi: Neema Hassan (Aunt)',
  ]);
});
