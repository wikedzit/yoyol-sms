import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  integer,
  primaryKey,
} from 'drizzle-orm/sqlite-core';
import { classes } from './class';
import { school } from './school';
import { subject } from './subjects';

// Join table for many-to-many relationship between classes and subjects
export const classSubjects = sqliteTable(
  'class_subjects',
  {
    classId: integer('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subject.id, { onDelete: 'cascade' }),
    schoolId: integer('school_id').references(() => school.id, {
      onDelete: 'set null',
    }),
    // Optional: track when the assignment was made
    assignedAt: integer('assigned_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    // Composite primary key
    pk: primaryKey({ columns: [table.classId, table.subjectId] }),
  })
);

export type InsertClassSubject = typeof classSubjects.$inferInsert;
export type SelectClassSubject = typeof classSubjects.$inferSelect;

