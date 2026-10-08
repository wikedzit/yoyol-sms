import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classMove,
  describeEnrolments,
  endedEnrolment,
  enrolmentPlacement,
  promotionPlan,
  refusalToEnrolTwice,
} from './student-enrolments.ts';

test('MOD-STU-03 a student keeps a class for each academic year', () => {
  const open = {
    studentId: 4,
    academicYearId: 1,
    formClassId: 8,
    status: 'enrolled' as const,
  };

  assert.equal(refusalToEnrolTwice(open), 'This student is already enrolled for that year.');
  assert.equal(refusalToEnrolTwice(null), null);
  assert.equal(enrolmentPlacement(null, 8), 'create');
  assert.equal(enrolmentPlacement(open, 9), 'refuse');
  assert.equal(enrolmentPlacement({ ...open, formClassId: null }, 8), 'assign-class');
  assert.equal(enrolmentPlacement({ ...open, formClassId: null }, null), 'refuse');

  assert.deepEqual(classMove({
    status: 'enrolled',
    currentFormClassId: 8,
    nextFormClassId: 9,
    reason: '  Joined the science group  ',
  }), { formClassId: 9, moveReason: 'Joined the science group' });
  assert.throws(
    () => classMove({ status: 'enrolled', currentFormClassId: 8, nextFormClassId: 9, reason: ' ' }),
    /Record why this student is moving class/,
  );
  assert.throws(
    () => classMove({ status: 'left', currentFormClassId: 8, nextFormClassId: 9, reason: 'Returned' }),
    /Only an open enrolment can move class/,
  );

  assert.equal(endedEnrolment('transferred'), 'transferred');
  assert.throws(() => endedEnrolment('deleted'), /End an enrolment as left or transferred/);

  assert.deepEqual(describeEnrolments([
    {
      studentName: 'Amina Juma Hassan',
      yearName: '2026/2027',
      className: '1A',
      status: 'enrolled',
      moveReason: 'Joined the science group',
    },
    {
      studentName: 'Peter Mushi',
      yearName: '2025/2026',
      className: null,
      status: 'transferred',
      moveReason: null,
    },
  ]), [
    'Amina Juma Hassan, 2026/2027 / 1A (enrolled), moved: Joined the science group',
    'Peter Mushi, 2025/2026 (transferred)',
  ]);
});

test('MOD-STU-04 promotion keeps the past class and the final form graduates', () => {
  const enrolments = [
    { enrolmentId: 10, studentId: 2, formClassId: 8, status: 'enrolled' },
    { enrolmentId: 11, studentId: 3, formClassId: 8, status: 'enrolled' },
    { enrolmentId: 12, studentId: 4, formClassId: 8, status: 'transferred' },
  ];
  const selected = promotionPlan({
    sourceClassId: 8,
    formNumber: 1,
    levelType: 'o-level',
    laterFormExists: true,
    enrolments,
    selectedStudentIds: [2],
    wholeClass: false,
    nextYearId: 5,
    sourceYearId: 1,
    alreadyInNextYear: [],
  });
  assert.deepEqual(selected.promote, [{ enrolmentId: 10, studentId: 2, pastFormClassId: 8 }]);
  assert.deepEqual(selected.graduate, []);

  const wholeClass = promotionPlan({
    sourceClassId: 8,
    formNumber: 1,
    levelType: 'o-level',
    laterFormExists: true,
    enrolments,
    selectedStudentIds: [],
    wholeClass: true,
    nextYearId: 5,
    sourceYearId: 1,
    alreadyInNextYear: [],
  });
  assert.deepEqual(wholeClass.promote.map((item) => item.studentId), [2, 3]);

  assert.throws(
    () => promotionPlan({
      sourceClassId: 8,
      formNumber: 1,
      levelType: 'o-level',
      laterFormExists: false,
      enrolments,
      selectedStudentIds: [2],
      wholeClass: false,
      nextYearId: 5,
      sourceYearId: 1,
      alreadyInNextYear: [],
    }),
    /Create the next form before promoting this class/,
  );
  assert.throws(
    () => promotionPlan({
      sourceClassId: 8,
      formNumber: 1,
      levelType: 'o-level',
      laterFormExists: true,
      enrolments,
      selectedStudentIds: [2],
      wholeClass: false,
      nextYearId: 5,
      sourceYearId: 1,
      alreadyInNextYear: [2],
    }),
    /This student is already enrolled for that year/,
  );

  const graduated = promotionPlan({
    sourceClassId: 8,
    formNumber: 4,
    levelType: 'o-level',
    laterFormExists: false,
    enrolments,
    selectedStudentIds: [],
    wholeClass: true,
    nextYearId: 5,
    sourceYearId: 1,
    alreadyInNextYear: [],
  });
  assert.deepEqual(graduated.promote, []);
  assert.deepEqual(graduated.graduate.map((item) => item.pastFormClassId), [8, 8]);
});
