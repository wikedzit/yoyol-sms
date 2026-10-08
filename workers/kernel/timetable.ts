export const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

export type WeekDay = (typeof weekDays)[number];

const dayLabels: Record<WeekDay, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

export function refusalToSavePeriod(input: {
  name: string;
  startsAt: string;
  endsAt: string;
}): string | null {
  if (input.name.trim().length === 0) {
    return 'Enter the period name.';
  }
  if (!isClockTime(input.startsAt) || !isClockTime(input.endsAt)) {
    return 'Enter a start and end time, such as 08:00.';
  }
  if (input.endsAt <= input.startsAt) {
    return 'The period must end after it starts.';
  }
  return null;
}

export function refusalToRemovePeriod(entryCount: number): string | null {
  if (entryCount > 0) {
    return 'Remove the lessons in this period first.';
  }
  return null;
}

export function refusalToBook(input: {
  day: string;
  teacherBooked: boolean;
  classBooked: boolean;
}): string | null {
  if (!weekDays.includes(input.day as WeekDay)) {
    return 'Choose a subject, teacher, class, day, and period.';
  }
  if (input.teacherBooked) {
    return 'This teacher is already booked in that period.';
  }
  if (input.classBooked) {
    return 'This class is already booked in that period.';
  }
  return null;
}

export function dayLabel(day: string): string {
  return weekDays.includes(day as WeekDay) ? dayLabels[day as WeekDay] : day;
}

export function describeLesson(input: {
  day: string;
  startsAt: string;
  periodName: string;
  subjectName: string;
  className: string;
  teacherName: string;
}): string {
  return `${dayLabel(input.day)} ${input.startsAt} ${input.periodName}: ${input.subjectName}, ${input.className}, ${input.teacherName}`;
}

export type TimetableLesson = {
  id: number;
  day: string;
  teacherId: number;
  classId: number;
  line: string;
};

export function lessonsForViewer(input: {
  lessons: readonly TimetableLesson[];
  teacherIds: readonly number[] | null;
  classIds: readonly number[] | null;
}): TimetableLesson[] {
  if (input.teacherIds) {
    const teachers = new Set(input.teacherIds);
    return input.lessons.filter((lesson) => teachers.has(lesson.teacherId));
  }
  if (input.classIds) {
    const classes = new Set(input.classIds);
    return input.lessons.filter((lesson) => classes.has(lesson.classId));
  }
  return [...input.lessons];
}

function isClockTime(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export type TimetableChoice = { id: number; name: string };

export type TimetablePeriod = { id: number; name: string; startsAt: string; endsAt: string };

export type TimetablePage = {
  canWrite: boolean;
  periods: TimetablePeriod[];
  lessons: TimetableLesson[];
  subjects: TimetableChoice[];
  teachers: TimetableChoice[];
  classes: TimetableChoice[];
};
