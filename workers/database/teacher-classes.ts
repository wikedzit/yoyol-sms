import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  integer,
  primaryKey,
} from 'drizzle-orm/sqlite-core';
import { teachers } from './teachers';
import { classes } from './class';

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

