import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attendanceRate,
  describeAttendance,
  refusalToMarkClosedDay,
  refusalToUseAttendanceStatus,
  statusesForClass,
} from './attendance.ts';

test('MOD-ATT-01 a day records present, absent, or late', () => {
  assert.equal(refusalToUseAttendanceStatus('present'), null);
  assert.equal(refusalToUseAttendanceStatus('excused'), 'Choose present, absent, or late.');
  assert.equal(
    refusalToMarkClosedDay({ attendanceDate: '2026-09-01', today: '2026-10-08', editableDays: 7 }),
    'Attendance can be changed for the last 7 days.',
  );
  assert.equal(
    refusalToMarkClosedDay({ attendanceDate: '2026-10-08', today: '2026-10-08', editableDays: 7 }),
    null,
  );
});

test('MOD-ATT-02 the class starts present and only the exceptions change', () => {
  assert.deepEqual(statusesForClass({
    studentIds: [2, 3],
    exceptions: { 2: 'absent' },
  }), [
    { studentId: 2, status: 'absent' },
    { studentId: 3, status: 'present' },
  ]);
});

test('MOD-ATT-03 an absence is a distinct status a notice can follow', () => {
  const marked = statusesForClass({ studentIds: [2], exceptions: { 2: 'absent' } });
  assert.equal(marked[0]?.status, 'absent');
});

test('MOD-ATT-04 a term rate counts days marked present', () => {
  assert.equal(attendanceRate({ present: 3, absent: 1, late: 0 }), 75);
  assert.equal(attendanceRate({ present: 0, absent: 0, late: 0 }), 0);
  assert.deepEqual(describeAttendance([{
    studentName: 'Amina Juma Hassan',
    termName: 'Term 1',
    present: 1,
    absent: 1,
    late: 0,
  }]), ['Amina Juma Hassan, Term 1: 1 present, 1 absent, 0 late, 50%']);
});
