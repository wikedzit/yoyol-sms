import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canSeeIncident,
  describeIncident,
  refusalToClose,
  refusalToSaveIncident,
  refusalToSaveKind,
} from './discipline.ts';

test('MOD-DIS-01 an incident type or severity needs a name', () => {
  assert.equal(refusalToSaveKind(''), 'Enter the name.');
  assert.equal(refusalToSaveKind('Late to class'), null);
});

test('MOD-DIS-02 an incident records type, severity, what happened, the action, and the date', () => {
  assert.equal(refusalToSaveIncident({
    description: '',
    actionTaken: 'Spoken to.',
    incidentDate: '2026-10-08',
    typeActive: true,
    severityActive: true,
    closed: false,
    canUpdate: true,
  }), 'Enter what happened.');
  assert.equal(refusalToSaveIncident({
    description: 'Arrived after the bell.',
    actionTaken: 'Spoken to.',
    incidentDate: '2026-10-08',
    typeActive: false,
    severityActive: true,
    closed: false,
    canUpdate: true,
  }), 'Choose an active incident type.');
  assert.equal(describeIncident({
    studentName: 'Amina Juma Hassan',
    incidentDate: '2026-10-08',
    typeName: 'Late to class',
    severityName: 'Low',
    closed: false,
  }), 'Amina Juma Hassan, 2026-10-08: Late to class, Low (Open)');
});

test('MOD-DIS-03 the recorder and an admin can update an open incident, and an admin can close it', () => {
  assert.equal(refusalToSaveIncident({
    description: 'Arrived after the bell.',
    actionTaken: 'Spoken to.',
    incidentDate: '2026-10-08',
    typeActive: true,
    severityActive: true,
    closed: false,
    canUpdate: false,
  }), 'You can change only an incident you recorded.');
  assert.equal(refusalToSaveIncident({
    description: 'Arrived after the bell.',
    actionTaken: 'Spoken to.',
    incidentDate: '2026-10-08',
    typeActive: true,
    severityActive: true,
    closed: true,
    canUpdate: true,
  }), 'This incident is closed.');
  assert.equal(refusalToClose({ closed: false, canClose: false }), 'You do not have permission to close an incident.');
  assert.equal(refusalToClose({ closed: true, canClose: true }), 'This incident is already closed.');
  assert.equal(refusalToClose({ closed: false, canClose: true }), null);
  assert.equal(canSeeIncident({ role: 'admin', recordedByTeacher: false, linkedStudent: false }), true);
  assert.equal(canSeeIncident({ role: 'teacher', recordedByTeacher: true, linkedStudent: false }), true);
  assert.equal(canSeeIncident({ role: 'teacher', recordedByTeacher: false, linkedStudent: false }), false);
  assert.equal(canSeeIncident({ role: 'guardian', recordedByTeacher: false, linkedStudent: true }), true);
  assert.equal(canSeeIncident({ role: 'other', recordedByTeacher: false, linkedStudent: true }), false);
});
