import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canSeeClub,
  describeActivity,
  describeClub,
  refusalToCloseClub,
  refusalToEnrol,
  refusalToSaveActivity,
  refusalToSaveClub,
} from './clubs.ts';

test('MOD-CLB-01 a club has a name, a description, and can be closed once', () => {
  assert.equal(refusalToSaveClub({ name: '', description: 'Experiments after school.' }), 'Enter the club name.');
  assert.equal(refusalToSaveClub({ name: 'Science club', description: '' }), 'Enter what the club does.');
  assert.equal(refusalToSaveClub({ name: 'Science club', description: 'Experiments after school.' }), null);
  assert.equal(refusalToCloseClub(true), 'This club is already closed.');
  assert.equal(describeClub({ name: 'Science club', patronName: 'Joseph A Kimaro', closed: false }), 'Science club, Joseph A Kimaro');
});

test('MOD-CLB-02 a student joins one club for the year, and members can see it', () => {
  assert.equal(refusalToEnrol({ closed: true, alreadyMember: false }), 'This club is closed.');
  assert.equal(refusalToEnrol({ closed: false, alreadyMember: true }), 'This student is already in the club for this year.');
  assert.equal(refusalToEnrol({ closed: false, alreadyMember: false }), null);
  assert.equal(canSeeClub({ role: 'student', isPatron: false, member: true }), true);
  assert.equal(canSeeClub({ role: 'guardian', isPatron: false, member: true }), true);
  assert.equal(canSeeClub({ role: 'student', isPatron: false, member: false }), false);
  assert.equal(canSeeClub({ role: 'teacher', isPatron: false, member: true }), false);
  assert.equal(canSeeClub({ role: 'teacher', isPatron: true, member: false }), true);
});

test('MOD-CLB-03 the patron records, edits, and removes an activity', () => {
  assert.equal(refusalToSaveActivity({
    title: '',
    description: 'Built a simple circuit.',
    activityDate: '2026-10-09',
    closed: false,
    canWrite: true,
  }), 'Enter the activity title.');
  assert.equal(refusalToSaveActivity({
    title: 'Friday experiment',
    description: 'Built a simple circuit.',
    activityDate: '2026-10-09',
    closed: false,
    canWrite: false,
  }), 'Only the club patron can change its activities.');
  assert.equal(refusalToSaveActivity({
    title: 'Friday experiment',
    description: 'Built a simple circuit.',
    activityDate: '2026-10-09',
    closed: true,
    canWrite: true,
  }), 'This club is closed.');
  assert.equal(describeActivity({
    activityDate: '2026-10-09',
    title: 'Friday experiment',
    clubName: 'Science club',
  }), '2026-10-09 Friday experiment: Science club');
});
