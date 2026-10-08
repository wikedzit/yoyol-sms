import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activeYearPlan,
  currentTermPlan,
  describeAcademicCalendar,
  refusalToDeleteTerm,
  refusalToDeleteYear,
  refusalToEditArchivedYear,
} from './academic-calendar.ts';

test('MOD-ACA-02 only one year stays active and only one term stays current', () => {
  const years = activeYearPlan([
    { id: 1, status: 'active' },
    { id: 2, status: 'upcoming' },
  ], 2);
  const terms = currentTermPlan([
    { id: 4, isCurrent: true },
    { id: 5, isCurrent: false },
  ], 5);

  assert.deepEqual(years, { activateId: 2, archiveIds: [1] });
  assert.deepEqual(terms, { currentId: 5, clearIds: [4] });
  assert.deepEqual(describeAcademicCalendar({
    years: [{ id: 2, name: '2026/2027', status: 'active' }],
    terms: [{ academicYearId: 2, name: 'Term 1', isCurrent: true }],
  }), [
    '2026/2027 (active)',
    '2026/2027 / Term 1 (current)',
  ]);
});

test('MOD-ACA-02 an archived year keeps its name, and deletion stops when records exist', () => {
  assert.equal(
    refusalToEditArchivedYear('archived', { name: '2025/2026' }),
    'An archived year keeps its name and dates.',
  );
  assert.equal(refusalToEditArchivedYear('active', { name: '2026/2027' }), null);
  assert.equal(refusalToEditArchivedYear('archived', {}), null);

  assert.equal(
    refusalToDeleteYear({ enrolmentCount: 1, resultCount: 0, invoiceCount: 0 }),
    'This year still has enrolments, results, or invoices.',
  );
  assert.equal(refusalToDeleteYear({ enrolmentCount: 0, resultCount: 0, invoiceCount: 0 }), null);
  assert.equal(
    refusalToDeleteTerm({ resultCount: 0, attendanceCount: 2 }),
    'This term still has results or attendance.',
  );
  assert.equal(refusalToDeleteTerm({ resultCount: 0, attendanceCount: 0 }), null);
});
