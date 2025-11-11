import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  integer,
  primaryKey,
} from 'drizzle-orm/sqlite-core';
import { semesters } from './semesters';
import { subject } from './subjects';

// Join table for many-to-many relationship between semesters and subjects
export const semesterSubjects = sqliteTable(
  'semester_subjects',
  {
    semesterId: integer('semester_id')
      .notNull()
      .references(() => semesters.id, { onDelete: 'cascade' }),
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subject.id, { onDelete: 'cascade' }),
    // Optional: track when the assignment was made
    assignedAt: integer('assigned_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    // Composite primary key
    pk: primaryKey({ columns: [table.semesterId, table.subjectId] }),
  })
);

export type InsertSemesterSubject = typeof semesterSubjects.$inferInsert;
export type SelectSemesterSubject = typeof semesterSubjects.$inferSelect;

