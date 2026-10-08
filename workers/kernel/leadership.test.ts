import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canSeeAppointment,
  describeAppointment,
  describeHolder,
  isCurrentHolder,
  refusalToAppoint,
  refusalToEndAppointment,
  refusalToSavePosition,
} from './leadership.ts';

test('MOD-LDR-01 a position has a name and can be retired', () => {
  assert.equal(refusalToSavePosition(''), 'Enter the position name.');
  assert.equal(refusalToSavePosition('Head girl'), null);
});

test('MOD-LDR-02 an appointment has dates for the year and can be ended once', () => {
  assert.equal(refusalToAppoint({
    retired: true,
    startsOn: '2026-09-01',
    endsOn: '2027-06-30',
    alreadyOpen: false,
  }), 'This position is retired.');
  assert.equal(refusalToAppoint({
    retired: false,
    startsOn: '2027-06-30',
    endsOn: '2026-09-01',
    alreadyOpen: false,
  }), 'The appointment must end on or after it starts.');
  assert.equal(refusalToAppoint({
    retired: false,
    startsOn: '2026-09-01',
    endsOn: '2027-06-30',
    alreadyOpen: true,
  }), 'This student already holds that position for this year.');
  assert.equal(refusalToEndAppointment(true), 'This appointment has already ended.');
  assert.equal(refusalToEndAppointment(false), null);
  assert.equal(describeAppointment({
    studentName: 'Amina Juma Hassan',
    positionName: 'Head girl',
    startsOn: '2026-09-01',
    endsOn: '2027-06-30',
    ended: false,
  }), 'Amina Juma Hassan, Head girl, 2026-09-01 to 2027-06-30');
});

test('MOD-LDR-02 current holders are open appointments that include today, and a student sees their own', () => {
  assert.equal(isCurrentHolder({
    ended: false,
    startsOn: '2026-09-01',
    endsOn: '2027-06-30',
    today: '2026-10-08',
  }), true);
  assert.equal(isCurrentHolder({
    ended: true,
    startsOn: '2026-09-01',
    endsOn: '2027-06-30',
    today: '2026-10-08',
  }), false);
  assert.equal(describeHolder({ studentName: 'Amina Juma Hassan', positionName: 'Head girl' }), 'Amina Juma Hassan, Head girl');
  assert.equal(canSeeAppointment({ role: 'student', ownStudent: true }), true);
  assert.equal(canSeeAppointment({ role: 'student', ownStudent: false }), false);
  assert.equal(canSeeAppointment({ role: 'other', ownStudent: true }), false);
  assert.equal(canSeeAppointment({ role: 'admin', ownStudent: false }), true);
});
