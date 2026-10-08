import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describePlan,
  refusalToReview,
  refusalToSavePlan,
  refusalToSaveTemplate,
  refusalToSubmit,
} from './lesson-plans.ts';

test('MOD-LSN-01 a template has a name and the writing it asks for', () => {
  assert.equal(refusalToSaveTemplate({ name: '', body: 'State the objective.' }), 'Enter the template name.');
  assert.equal(refusalToSaveTemplate({ name: 'Weekly lesson', body: '' }), 'Enter what the template asks the teacher to write.');
  assert.equal(refusalToSaveTemplate({ name: 'Weekly lesson', body: 'State the objective.' }), null);
});

test('MOD-LSN-02 a teacher submits a plan for a subject, class, and year, and revises their own', () => {
  assert.equal(refusalToSavePlan({
    title: '',
    body: 'Introduce fractions.',
    status: 'draft',
    ownsPlan: true,
    templateActive: true,
  }), 'Enter the lesson plan title.');
  assert.equal(refusalToSubmit({ status: 'draft', ownsPlan: true }), null);
  assert.equal(refusalToSubmit({ status: 'approved', ownsPlan: true }), 'Only a draft or a returned plan can be submitted.');
  assert.equal(describePlan({
    title: 'Fractions',
    subjectName: 'Mathematics',
    className: '1A',
    teacherName: 'Joseph A Kimaro',
    status: 'submitted',
  }), 'Fractions: Mathematics, 1A, Joseph A Kimaro (Submitted)');
  assert.equal(refusalToSavePlan({
    title: 'Fractions',
    body: 'Introduce fractions with paper strips.',
    status: 'submitted',
    ownsPlan: true,
    templateActive: true,
  }), 'This lesson plan cannot be changed until it is returned.');
  assert.equal(refusalToSavePlan({
    title: 'Fractions',
    body: 'Introduce fractions with paper strips.',
    status: 'returned',
    ownsPlan: false,
    templateActive: true,
  }), 'You can change only your own lesson plans.');
  assert.equal(refusalToSavePlan({
    title: 'Fractions',
    body: 'Introduce fractions with paper strips.',
    status: 'returned',
    ownsPlan: true,
    templateActive: true,
  }), null);
});

test('MOD-LSN-03 a reviewer approves a submitted plan or returns it with a comment', () => {
  assert.equal(refusalToReview({ status: 'draft', decision: 'approve', comment: '' }), 'Only a submitted plan can be reviewed.');
  assert.equal(
    refusalToReview({ status: 'submitted', decision: 'return', comment: '' }),
    'Enter why this lesson plan is being returned.',
  );
  assert.equal(refusalToReview({ status: 'submitted', decision: 'approve', comment: '' }), null);
  assert.equal(refusalToReview({
    status: 'submitted',
    decision: 'return',
    comment: 'Add the starter activity.',
  }), null);
});
