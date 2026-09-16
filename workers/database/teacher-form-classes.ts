import { sql } from 'drizzle-orm';
import {
  integer,
  primaryKey,
  sqliteTable,
} from 'drizzle-orm/sqlite-core';
import { teachers } from './teachers';
import { formClasses } from './academic-levels';

export const teacherFormClasses = sqliteTable(
  'teacher_form_classes',
  {
    teacherId: integer('teacher_id')
      .notNull()
      .references(() => teachers.id, { onDelete: 'cascade' }),
    formClassId: integer('form_class_id')
      .notNull()
      .references(() => formClasses.id, { onDelete: 'cascade' }),
    assignedAt: integer('assigned_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.teacherId, table.formClassId] }),
  }),
);

export type InsertTeacherFormClass = typeof teacherFormClasses.$inferInsert;
export type SelectTeacherFormClass = typeof teacherFormClasses.$inferSelect;
