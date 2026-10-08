import assert from 'node:assert/strict';
import test from 'node:test';
import { erasedIdentity, personExport } from './person-data.ts';

test('KRN-DAT-11 an export keeps the person and their grades', () => {
  const exported = personExport({
    exportedAt: '2026-10-07T00:00:00.000Z',
    schoolId: 1,
    student: {
      id: 4,
      firstName: 'Amina',
      lastName: 'Juma',
      admissionNumber: 'A-1',
      gender: 'Female',
      dob: '2014-04-02',
      email: 'amina@example.com',
      phone: '0700000000',
      address: 'Riverside',
      guardianName: 'Juma',
      guardianPhone: '0711111111',
      photoUrl: '/photo.png',
      status: 'Active',
    },
    grades: [{ id: 9, subjectId: 2, score: 80, grade: 'A', status: 'Active', }],
  });

  assert.equal(exported.student.email, 'amina@example.com');
  assert.equal(exported.grades[0].score, 80);
  assert.equal(exported.exportedAt, '2026-10-07T00:00:00.000Z');
});

test('KRN-DAT-11 erasure clears identity and keeps the row for grades', () => {
  const cleared = erasedIdentity();
  assert.equal(cleared.firstName, 'Removed');
  assert.equal(cleared.email, null);
  assert.equal(cleared.guardianPhone, null);
  assert.equal(cleared.photoUrl, null);
  assert.equal(cleared.status, 'Archived');
});
