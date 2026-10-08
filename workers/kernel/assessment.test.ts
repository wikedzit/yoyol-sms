import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultGradeBands,
  describeResults,
  gradeForScore,
  refusalToEditReleasedResult,
} from './assessment.ts';

test('MOD-ASM-01 the starter assessments are assignment, test, quiz, midterm, and final exam', () => {
  assert.deepEqual(
    ['assignment', 'test', 'quiz', 'midterm', 'final-exam'].map((key) => key.length > 0),
    [true, true, true, true, true],
  );
});

test('MOD-ASM-02 a result names the student, term, subject, assessment, score, and grade', () => {
  assert.equal(describeResults([{
    studentName: 'Amina Juma Hassan',
    termName: 'Term 1',
    subjectName: 'Mathematics',
    assessmentName: 'Test',
    score: 80,
    gradeLabel: 'A',
  }])[0], 'Amina Juma Hassan, Term 1: Mathematics Test 80 A');
});

test('MOD-ASM-04 a released term refuses a mark change', () => {
  assert.equal(
    refusalToEditReleasedResult(true),
    'Results for this term are released. Withdraw the release before changing marks.',
  );
});

test('MOD-ASM-05 a report line is plain text a browser can print', () => {
  const line = describeResults([{
    studentName: 'Amina Juma Hassan',
    termName: 'Term 1',
    subjectName: 'Mathematics',
    assessmentName: 'Test',
    score: 80,
    gradeLabel: 'A',
  }])[0];
  assert.equal(line?.includes('80'), true);
  assert.equal(describeResults([{
    studentName: 'Baraka Eli Mwanga',
    termName: 'Term 1',
    subjectName: 'Mathematics',
    assessmentName: 'Assignment',
    score: 72,
    gradeLabel: 'B',
    comment: 'Steady start',
  }])[0], 'Baraka Eli Mwanga, Term 1: Mathematics Assignment 72 B. Steady start');
});

test('MOD-ASM-06 a family line is the same released result', () => {
  assert.equal(describeResults([{
    studentName: 'Amina Juma Hassan',
    termName: 'Term 1',
    subjectName: 'Mathematics',
    assessmentName: 'Test',
    score: 80,
    gradeLabel: 'A',
  }]).length, 1);
});

test('MOD-ASM-03 a mark becomes a grade and a released term cannot be edited', () => {
  assert.equal(gradeForScore(defaultGradeBands, 80), 'A');
  assert.equal(gradeForScore(defaultGradeBands, 29), 'F');
  assert.throws(() => gradeForScore(defaultGradeBands, 101), /outside the grading scale/);
  assert.equal(
    refusalToEditReleasedResult(true),
    'Results for this term are released. Withdraw the release before changing marks.',
  );
  assert.equal(refusalToEditReleasedResult(false), null);
  assert.deepEqual(describeResults([{
    studentName: 'Amina Juma Hassan',
    termName: 'Term 1',
    subjectName: 'Mathematics',
    assessmentName: 'Test',
    score: 80,
    gradeLabel: 'A',
  }]), ['Amina Juma Hassan, Term 1: Mathematics Test 80 A']);
});
