import { sql } from 'drizzle-orm';
import {
  integer,
  primaryKey,
  sqliteTable,
} from 'drizzle-orm/sqlite-core';
import { formClasses } from './academic-levels';
import { school } from './school';
import { teachers } from './teachers';

export const teacherFormClasses = sqliteTable(
  'teacher_form_classes',
  {
    teacherId: integer('teacher_id')
      .notNull()
      .references(() => teachers.id, { onDelete: 'cascade' }),
    formClassId: integer('form_class_id')
      .notNull()
      .references(() => formClasses.id, { onDelete: 'cascade' }),
    schoolId: integer('school_id').references(() => school.id, {
      onDelete: 'set null',
    }),
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
