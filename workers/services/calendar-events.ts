import { and, asc, eq } from 'drizzle-orm';
import { academicYears } from '../database/academic-years';
import type { AppDatabase } from '../database/app-database';
import { calendarEvents } from '../database/calendar-events';
import { guardians } from '../database/guardians';
import { studentGuardians } from '../database/student-guardians';
import { upcomingEventLines, refusalToEditCancelledEvent } from '../kernel/calendar-events';
import { requireSchoolId } from '../utils/require-owner-user';

export type CalendarInput = {
  title: string;
  description: string;
  eventDate: string;
  eventType: string;
  academicYearId: number | null;
  attachment: string;
  notifyParents: boolean;
};

export default class CalendarEventService {
  constructor(
    private db: AppDatabase,
    private activeSchoolId: number | null = null,
    private notify?: (input: { schoolId: number; userId: number; title: string; body: string }) => Promise<void>,
  ) {}

  async list(): Promise<{ id: number; line: string; status: string }[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const rows = await this.db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.schoolId, schoolId))
      .orderBy(asc(calendarEvents.eventDate));
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      line: `${row.eventDate}: ${row.title} (${row.eventType})${row.attachment ? `, ${row.attachment}` : ''}${row.status === 'cancelled' ? ', cancelled' : ''}`,
    }));
  }

  async upcoming(today: string): Promise<string[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const rows = await this.db
      .select({
        title: calendarEvents.title,
        eventDate: calendarEvents.eventDate,
        eventType: calendarEvents.eventType,
        status: calendarEvents.status,
      })
      .from(calendarEvents)
      .where(eq(calendarEvents.schoolId, schoolId));
    return upcomingEventLines(rows, today);
  }

  async create(input: CalendarInput): Promise<{ error: string } | { id: number }> {
    const title = input.title.trim();
    if (title.length === 0 || input.eventDate.trim().length === 0) {
      return { error: 'Enter the event title and date.' };
    }
    const schoolId = requireSchoolId(this.activeSchoolId);
    const now = Date.now();
    const created = await this.db.insert(calendarEvents).values({
      schoolId,
      academicYearId: input.academicYearId,
      title,
      description: blank(input.description),
      eventDate: input.eventDate.trim(),
      eventType: input.eventType.trim() || 'other',
      attachment: blank(input.attachment),
      status: 'scheduled',
      notifyParents: input.notifyParents,
      createdAt: now,
      updatedAt: now,
    }).returning({ id: calendarEvents.id });
    if (input.notifyParents) {
      await this.tellParents(schoolId, title, input.eventDate.trim());
    }
    return { id: created[0]?.id ?? 0 };
  }

  async update(eventId: number, input: CalendarInput): Promise<{ error: string } | { id: number }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const current = await this.owned(schoolId, eventId);
    if (!current) return { error: 'That event was not found.' };
    const refusal = refusalToEditCancelledEvent(current.status);
    if (refusal) return { error: refusal };
    const title = input.title.trim();
    if (title.length === 0 || input.eventDate.trim().length === 0) {
      return { error: 'Enter the event title and date.' };
    }
    await this.db.update(calendarEvents).set({
      title,
      description: blank(input.description),
      eventDate: input.eventDate.trim(),
      eventType: input.eventType.trim() || 'other',
      academicYearId: input.academicYearId,
      attachment: blank(input.attachment),
      notifyParents: input.notifyParents,
      updatedAt: Date.now(),
    }).where(eq(calendarEvents.id, eventId));
    return { id: eventId };
  }

  async cancel(eventId: number): Promise<{ error: string } | { id: number }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const current = await this.owned(schoolId, eventId);
    if (!current) return { error: 'That event was not found.' };
    await this.db.update(calendarEvents).set({
      status: 'cancelled',
      updatedAt: Date.now(),
    }).where(eq(calendarEvents.id, eventId));
    return { id: eventId };
  }

  async years(): Promise<{ id: number; name: string }[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    return this.db
      .select({ id: academicYears.id, name: academicYears.name })
      .from(academicYears)
      .where(eq(academicYears.schoolId, schoolId))
      .orderBy(asc(academicYears.name));
  }

  private async tellParents(schoolId: number, title: string, eventDate: string) {
    if (!this.notify) return;
    const guardianUsers = await this.db
      .select({ userId: guardians.userId })
      .from(guardians)
      .where(eq(guardians.schoolId, schoolId));
    const accountUsers = await this.db
      .select({ userId: studentGuardians.userId })
      .from(studentGuardians)
      .where(eq(studentGuardians.schoolId, schoolId));
    const userIds = [...new Set(
      [...guardianUsers, ...accountUsers].flatMap((row) => row.userId == null ? [] : [row.userId]),
    )];
    for (const userId of userIds) {
      await this.notify({
        schoolId,
        userId,
        title,
        body: `${title} is on ${eventDate}.`,
      });
    }
  }

  private async owned(schoolId: number, eventId: number) {
    return this.db
      .select({ id: calendarEvents.id, status: calendarEvents.status })
      .from(calendarEvents)
      .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.schoolId, schoolId)))
      .get();
  }
}

function blank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
