import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { academicStreams } from './academic-levels';
import { school } from './school';

export const subject = sqliteTable(
  'subjects',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    subjectName: text('subjectName').notNull(),
    code: text('code').notNull(),
    stream: text('stream').notNull(), // Stream name (Science, Arts, Business)
    instructor: text('instructor').notNull(),
    description: text('description'),
    enrolledStudents: integer('enrolledStudents').default(0),
    status: text('status').default('Active'),
    // Foreign Key to Academic Streams table
    streamId: integer('stream_id')
      .notNull()
      .references(() => academicStreams.id),
    schoolId: integer('school_id').references(() => school.id, {
      onDelete: 'set null',
    }),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    schoolCodeUnique: uniqueIndex('subjects_school_code_unique').on(
      table.schoolId,
      table.code,
    ),
  }),
);

export type InsertSubject = typeof subject.$inferInsert;
export type SelectSubject = typeof subject.$inferSelect;
