import assert from 'node:assert/strict';
import test from 'node:test';
import { schoolClassroom } from './school-classroom.ts';

test('MOD-ACA-06 a student classroom is the form class, never the university class', () => {
  const classroom = schoolClassroom({ formClassId: 4, universityClassId: 9 });
  assert.equal(classroom.formClassId, 4);
  assert.equal(classroom.universityClassId, null);
});
