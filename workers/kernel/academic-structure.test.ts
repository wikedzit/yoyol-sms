import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeAcademicStructure,
  enrolmentCountByClass,
  refusalToRemoveForm,
  refusalToRemoveLevel,
  refusalToRemoveStream,
} from './academic-structure.ts';

test('MOD-ACA-01 the structure lists a level even when it has no classes yet', () => {
  const lines = describeAcademicStructure({
    levels: [{ id: 1, name: 'O-Level' }, { id: 2, name: 'A-Level' }],
    streams: [{ id: 4, levelId: 1, name: 'Science' }],
    forms: [{ id: 7, streamId: 4, name: 'Form 1' }],
    classes: [{ id: 9, formId: 7, name: '1A' }],
  });

  assert.deepEqual(lines, [
    'O-Level / Science / Form 1 / 1A',
    'A-Level',
  ]);
});

test('MOD-ACA-01 removal is refused while children exist, and class size comes from enrolment', () => {
  assert.equal(
    refusalToRemoveLevel({ streamCount: 1, classCount: 0, subjectCount: 0 }),
    'Remove the streams, classes, and subjects on this level first.',
  );
  assert.equal(refusalToRemoveLevel({ streamCount: 0, classCount: 0, subjectCount: 0 }), null);
  assert.equal(
    refusalToRemoveStream({ formCount: 0, classCount: 2 }),
    'Remove the forms and classes on this stream first.',
  );
  assert.equal(refusalToRemoveStream({ formCount: 0, classCount: 0 }), null);
  assert.equal(refusalToRemoveForm(1), 'Remove the classes on this form first.');
  assert.equal(refusalToRemoveForm(0), null);

  const counts = enrolmentCountByClass([
    { formClassId: 9 },
    { formClassId: 9 },
    { formClassId: null },
  ]);
  assert.equal(counts.get(9), 2);
  assert.equal(counts.get(3), undefined);
});
