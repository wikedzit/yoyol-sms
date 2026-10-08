export const attendanceStatuses = ['present', 'absent', 'late'] as const;

export type AttendanceStatus = (typeof attendanceStatuses)[number];

export function refusalToUseAttendanceStatus(value: string): string | null {
  if ((attendanceStatuses as readonly string[]).includes(value)) {
    return null;
  }
  return 'Choose present, absent, or late.';
}

export function refusalToMarkClosedDay(input: {
  attendanceDate: string;
  today: string;
  editableDays: number;
}): string | null {
  if (input.editableDays < 0) {
    return 'Choose how many days attendance stays editable.';
  }
  const earliest = shiftIsoDate(input.today, -input.editableDays);
  if (input.attendanceDate > input.today || input.attendanceDate < earliest) {
    return `Attendance can be changed for the last ${input.editableDays} days.`;
  }
  return null;
}

export function statusesForClass(input: {
  studentIds: readonly number[];
  exceptions: Readonly<Record<number, AttendanceStatus>>;
}): { studentId: number; status: AttendanceStatus }[] {
  return input.studentIds.map((studentId) => ({
    studentId,
    status: input.exceptions[studentId] ?? 'present',
  }));
}

export function attendanceRate(counts: { present: number; absent: number; late: number }): number {
  const total = counts.present + counts.absent + counts.late;
  if (total === 0) {
    return 0;
  }
  return Math.round((counts.present / total) * 100);
}

export function describeAttendance(rows: readonly {
  studentName: string;
  termName: string;
  present: number;
  absent: number;
  late: number;
}[]): string[] {
  return rows.map((row) => {
    const rate = attendanceRate(row);
    return `${row.studentName}, ${row.termName}: ${row.present} present, ${row.absent} absent, ${row.late} late, ${rate}%`;
  });
}

export function shiftIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
