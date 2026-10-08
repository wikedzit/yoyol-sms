import assert from 'node:assert/strict';
import test from 'node:test';
import { describeStudentRecords } from './student-records.ts';

test('MOD-STU-01 a student record lists the name, gender, birth date, and admission date', () => {
  const lines = describeStudentRecords([
    {
      firstName: 'Amina',
      middleName: 'Juma',
      lastName: 'Hassan',
      gender: 'Female',
      dateOfBirth: '2012-04-01',
      admissionDate: '2026-01-15',
    },
    {
      firstName: 'Peter',
      middleName: null,
      lastName: 'Mushi',
      gender: 'Male',
      dateOfBirth: null,
      admissionDate: null,
    },
  ]);

  assert.deepEqual(lines, [
    'Amina Juma Hassan, Female, born 2012-04-01, admitted 2026-01-15',
    'Peter Mushi, Male',
  ]);
});
