import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeYearSubjects,
  refusalToAssignCombination,
  replaceYearSubjects,
} from './student-year-subjects.ts';

test('MOD-STU-07 changing the active year leaves another year of subjects in place', () => {
  const existing = [
    { studentId: 2, academicYearId: 1, subjectId: 8, combinationId: null },
    { studentId: 2, academicYearId: 3, subjectId: 9, combinationId: 4 },
  ];
  const next = replaceYearSubjects({
    existing,
    studentId: 2,
    yearId: 1,
    activeYearId: 1,
    subjectIds: [10],
    combinationId: null,
  });
  assert.deepEqual(next, [
    { studentId: 2, academicYearId: 3, subjectId: 9, combinationId: 4 },
    { studentId: 2, academicYearId: 1, subjectId: 10, combinationId: null },
  ]);
  assert.throws(
    () => replaceYearSubjects({
      existing,
      studentId: 2,
      yearId: 3,
      activeYearId: 1,
      subjectIds: [8],
      combinationId: null,
    }),
    /Past years stay as they were/,
  );
  assert.equal(
    refusalToAssignCombination({ status: 'retired', levelType: 'a-level' }),
    'That combination is retired.',
  );
  assert.equal(
    refusalToAssignCombination({ status: 'active', levelType: 'o-level' }),
    'An A-Level combination needs an A-Level enrolment for this year.',
  );
  assert.equal(refusalToAssignCombination({ status: 'active', levelType: 'a-level' }), null);
  assert.deepEqual(describeYearSubjects([
    { studentName: 'Amina Juma Hassan', yearName: '2026/2027', subjectName: 'Mathematics', combinationName: null },
    { studentName: 'Amina Juma Hassan', yearName: '2027/2028', subjectName: 'Physics', combinationName: 'PCM' },
  ]), [
    'Amina Juma Hassan, 2026/2027: Mathematics',
    'Amina Juma Hassan, 2027/2028: PCM (Physics)',
  ]);
});
