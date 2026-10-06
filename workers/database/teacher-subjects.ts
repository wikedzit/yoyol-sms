import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  integer,
  text,
  primaryKey,
} from 'drizzle-orm/sqlite-core';
import { school } from './school';
import { teachers } from './teachers';
import { subject } from './subjects';

// Join table for many-to-many relationship between teachers and subjects
export const teacherSubjects = sqliteTable(
  'teacher_subjects',
  {
    teacherId: integer('teacher_id')
      .notNull()
      .references(() => teachers.id, { onDelete: 'cascade' }),
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
    pk: primaryKey({ columns: [table.teacherId, table.subjectId] }),
  })
);

export type InsertTeacherSubject = typeof teacherSubjects.$inferInsert;
export type SelectTeacherSubject = typeof teacherSubjects.$inferSelect;
