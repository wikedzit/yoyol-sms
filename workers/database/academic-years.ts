import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { school } from './school';

// Academic Years table
export const academicYears = sqliteTable(
  'academic_years',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(), // e.g. "2026/2027"
    startDate: text('start_date').notNull(), // ISO date string
    endDate: text('end_date').notNull(), // ISO date string
    status: text('status').notNull().default('upcoming'), // 'upcoming' | 'active' | 'archived'
    schoolId: integer('school_id').references(() => school.id, {
      onDelete: 'restrict',
    }),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    schoolNameUnique: uniqueIndex('academic_years_school_name_unique').on(
      table.schoolId,
      table.name,
    ),
  }),
);

// Terms table (nested under an Academic Year)
export const terms = sqliteTable('terms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  academicYearId: integer('academic_year_id')
    .notNull()
    .references(() => academicYears.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g. "Term 1", "Term 2"
  termNumber: integer('term_number').notNull(), // ordering within the year
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  isCurrent: integer('is_current', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Export types for TypeScript
export type InsertAcademicYear = typeof academicYears.$inferInsert;
export type SelectAcademicYear = typeof academicYears.$inferSelect;

export type InsertTerm = typeof terms.$inferInsert;
export type SelectTerm = typeof terms.$inferSelect;
