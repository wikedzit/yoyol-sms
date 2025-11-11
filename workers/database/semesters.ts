import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { years } from './years';

export const semesters = sqliteTable('semesters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  semesterNumber: integer('semester_number').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  // Foreign Key to Years table
  yearId: integer('year_id')
    .notNull()
    .references(() => years.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type InsertSemester = typeof semesters.$inferInsert;
export type SelectSemester = typeof semesters.$inferSelect;

