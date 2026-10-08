import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { academicYears } from './academic-years';
import { school } from './school';

export const calendarEvents = sqliteTable('calendar_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id')
    .notNull()
    .references(() => school.id, { onDelete: 'cascade' }),
  academicYearId: integer('academic_year_id').references(() => academicYears.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  eventDate: text('event_date').notNull(),
  eventType: text('event_type').notNull(),
  attachment: text('attachment'),
  status: text('status').notNull().default('scheduled'),
  notifyParents: integer('notify_parents', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
