import assert from 'node:assert/strict';
import test from 'node:test';
import { describeFormClassSubjects } from './form-class-subjects.ts';

test('MOD-ACA-04 a subject assignment belongs to a form class', () => {
  const lines = describeFormClassSubjects({
    levels: [{ id: 1, name: 'O-Level' }],
    streams: [{ id: 4, name: 'Science' }],
    forms: [{ id: 7, name: 'Form 1' }],
    classes: [{ id: 9, name: '1A', levelId: 1, streamId: 4, formId: 7 }],
    subjects: [{ id: 3, name: 'Mathematics', code: 'MAT' }],
    assignments: [
      { formClassId: 9, subjectId: 3 },
      { formClassId: 9, subjectId: 3 },
      { formClassId: 99, subjectId: 3 },
    ],
  });

  assert.deepEqual(lines, [
    'O-Level / Science / Form 1 / 1A: Mathematics (MAT)',
  ]);
});
