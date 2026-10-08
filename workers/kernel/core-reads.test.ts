import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isCatalogueCapability,
  readGuardianContacts,
  readStaffAssignments,
  readStudentIdentities,
} from './core-reads.ts';

test('KRN-DAT-09 a student read stays on identity fields and refuses a missing capability', async () => {
  assert.equal(isCatalogueCapability('core.students:read'), true);
  assert.equal(isCatalogueCapability('core.secrets:read'), false);

  let loaded = false;
  await assert.rejects(
    () => readStudentIdentities({
      granted: [],
      schoolId: 1,
      load: async () => {
        loaded = true;
        return [];
      },
      present: (row) => row,
    }),
    /does not have core.students:read/,
  );
  assert.equal(loaded, false);

  const shown = await readStudentIdentities({
    granted: ['core.students:read'],
    schoolId: 1,
    load: async () => [{
      id: 3,
      firstName: 'Amina',
      lastName: 'Juma',
      admissionNumber: 'A-3',
      formClassId: 8,
      phone: '555',
    }],
    present: (row) => ({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      admissionNumber: row.admissionNumber,
      formClassId: row.formClassId,
    }),
  });
  assert.equal('phone' in shown[0], false);
  assert.equal(shown[0].firstName, 'Amina');
});

test('KRN-DAT-09 staff assignments stay behind the staff read', async () => {
  let loaded = false;
  await assert.rejects(
    () => readStaffAssignments({
      granted: [],
      schoolId: 1,
      load: async () => {
        loaded = true;
        return [];
      },
      present: (row) => row,
    }),
    /core.staff:read/,
  );
  assert.equal(loaded, false);

  const assignments = await readStaffAssignments({
    granted: ['core.staff:read'],
    schoolId: 1,
    load: async () => [{ teacherId: 4, classId: 9, subjectId: null }],
    present: (row) => row,
  });
  assert.deepEqual(assignments, [{ teacherId: 4, classId: 9, subjectId: null }]);
});

test('KRN-DAT-09 guardian contact is a separate capability', async () => {
  let loaded = false;
  await assert.rejects(
    () => readGuardianContacts({
      granted: ['core.students:read'],
      schoolId: 1,
      load: async () => {
        loaded = true;
        return [];
      },
      present: (row) => row,
    }),
    /core.guardians.contact:read/,
  );
  assert.equal(loaded, false);
});
