import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { academicLevels } from './academic-levels';
import { school } from './school';
import { subject } from './subjects';

export const subjectCombinations = sqliteTable(
  'subject_combinations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    schoolId: integer('school_id').references(() => school.id, { onDelete: 'set null' }),
    levelId: integer('level_id')
      .notNull()
      .references(() => academicLevels.id),
    name: text('name').notNull(),
    status: text('status').notNull().default('active'),
    createdAt: integer('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    schoolNameUnique: uniqueIndex('subject_combinations_school_name_unique').on(table.schoolId, table.name),
  }),
);

export const combinationSubjects = sqliteTable('combination_subjects', {
  combinationId: integer('combination_id')
    .notNull()
    .references(() => subjectCombinations.id, { onDelete: 'cascade' }),
  subjectId: integer('subject_id')
    .notNull()
    .references(() => subject.id, { onDelete: 'cascade' }),
  schoolId: integer('school_id').references(() => school.id, { onDelete: 'set null' }),
});
