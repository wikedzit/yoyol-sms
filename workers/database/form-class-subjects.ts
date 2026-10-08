import { sql } from 'drizzle-orm';
import { integer, primaryKey, sqliteTable } from 'drizzle-orm/sqlite-core';
import { formClasses } from './academic-levels';
import { school } from './school';
import { subject } from './subjects';

export const formClassSubjects = sqliteTable(
  'form_class_subjects',
  {
    formClassId: integer('form_class_id')
      .notNull()
      .references(() => formClasses.id, { onDelete: 'cascade' }),
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subject.id, { onDelete: 'cascade' }),
    schoolId: integer('school_id').references(() => school.id, {
      onDelete: 'set null',
    }),
    assignedAt: integer('assigned_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.formClassId, table.subjectId] }),
  }),
);
