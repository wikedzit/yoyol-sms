import assert from 'node:assert/strict';
import test from 'node:test';
import {
  admissionYear,
  nextAdmissionNumber,
  refusalToChangeAdmissionNumber,
  refusalToReuseAdmissionNumber,
} from './admission-numbers.ts';

test('MOD-STU-02 a school format generates the next free admission number', () => {
  assert.equal(admissionYear('2026-01-15', new Date('2027-01-01')), 2026);
  assert.equal(admissionYear(undefined, new Date('2026-10-07')), 2026);

  assert.equal(nextAdmissionNumber({
    format: '{year}-{seq:4}',
    year: 2026,
    taken: [],
  }), '2026-0001');
  assert.equal(nextAdmissionNumber({
    format: '{year}-{seq:4}',
    year: 2026,
    taken: ['2026-0001'],
  }), '2026-0002');

  assert.equal(refusalToReuseAdmissionNumber(true), 'This admission number is already in use.');
  assert.equal(refusalToReuseAdmissionNumber(false), null);
  assert.equal(
    refusalToChangeAdmissionNumber({ reportCount: 1, invoiceCount: 0 }),
    'This admission number is already on a report or invoice.',
  );
  assert.equal(refusalToChangeAdmissionNumber({ reportCount: 0, invoiceCount: 0 }), null);
  assert.throws(
    () => nextAdmissionNumber({ format: 'RIV', year: 2026, taken: [] }),
    /The admission number format needs a sequence/,
  );
});
