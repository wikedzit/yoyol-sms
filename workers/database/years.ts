import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { courses } from './courses';

export const years = sqliteTable('years', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  yearNumber: integer('year_number').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  // Foreign Key to Courses table
  courseId: integer('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type InsertYear = typeof years.$inferInsert;
export type SelectYear = typeof years.$inferSelect;

