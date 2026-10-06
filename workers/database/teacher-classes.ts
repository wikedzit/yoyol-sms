import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  integer,
  primaryKey,
} from 'drizzle-orm/sqlite-core';
import { classes } from './class';
import { school } from './school';
import { teachers } from './teachers';

// Join table for many-to-many relationship between teachers and classes
export const teacherClasses = sqliteTable(
  'teacher_classes',
  {
    teacherId: integer('teacher_id')
      .notNull()
      .references(() => teachers.id, { onDelete: 'cascade' }),
    classId: integer('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
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
    pk: primaryKey({ columns: [table.teacherId, table.classId] }),
  })
);

export type InsertTeacherClass = typeof teacherClasses.$inferInsert;
export type SelectTeacherClass = typeof teacherClasses.$inferSelect;

