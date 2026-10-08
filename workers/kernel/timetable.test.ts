import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeLesson,
  lessonsForViewer,
  refusalToBook,
  refusalToRemovePeriod,
  refusalToSavePeriod,
} from './timetable.ts';

test('MOD-TTB-01 a period has a name and an end after its start', () => {
  assert.equal(refusalToSavePeriod({ name: '', startsAt: '08:00', endsAt: '08:40' }), 'Enter the period name.');
  assert.equal(
    refusalToSavePeriod({ name: 'Lesson 1', startsAt: '8:00', endsAt: '08:40' }),
    'Enter a start and end time, such as 08:00.',
  );
  assert.equal(
    refusalToSavePeriod({ name: 'Lesson 1', startsAt: '08:40', endsAt: '08:00' }),
    'The period must end after it starts.',
  );
  assert.equal(refusalToSavePeriod({ name: 'Lesson 1', startsAt: '08:00', endsAt: '08:40' }), null);
  assert.equal(refusalToRemovePeriod(1), 'Remove the lessons in this period first.');
});

test('MOD-TTB-02 a lesson names the day, period, subject, class, and teacher', () => {
  assert.equal(describeLesson({
    day: 'monday',
    startsAt: '08:00',
    periodName: 'Lesson 1',
    subjectName: 'Mathematics',
    className: '1A',
    teacherName: 'Joseph A Kimaro',
  }), 'Monday 08:00 Lesson 1: Mathematics, 1A, Joseph A Kimaro');
});

test('MOD-TTB-03 a teacher or a class cannot be booked twice in one period', () => {
  assert.equal(
    refusalToBook({ day: 'monday', teacherBooked: true, classBooked: false }),
    'This teacher is already booked in that period.',
  );
  assert.equal(
    refusalToBook({ day: 'monday', teacherBooked: false, classBooked: true }),
    'This class is already booked in that period.',
  );
  assert.equal(refusalToBook({ day: 'monday', teacherBooked: false, classBooked: false }), null);
});

test('MOD-TTB-04 a teacher sees their lessons and a student sees their class', () => {
  const lessons = [
    { id: 1, day: 'monday', teacherId: 1, classId: 1, line: 'Mathematics' },
    { id: 2, day: 'tuesday', teacherId: 9, classId: 1, line: 'Physics' },
  ];
  assert.deepEqual(lessonsForViewer({ lessons, teacherIds: [1], classIds: null }).map((lesson) => lesson.id), [1]);
  assert.deepEqual(lessonsForViewer({ lessons, teacherIds: null, classIds: [1] }).map((lesson) => lesson.id), [1, 2]);
});
