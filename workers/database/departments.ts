import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { faculties } from './faculties';

export const departments = sqliteTable('departments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  headOfDepartment: text('head_of_department'),
  totalStudent: integer('total_student').notNull().default(0),
  totalFaculty: integer('total_faculty').notNull().default(0),
  description: text('description'),
  establishedDate: text('established_date'), // ✅ newly added field
  status: text('status').notNull().default('Active'),
  // Foreign Key to Faculties table
  facultyId: integer('faculty_id').references(() => faculties.id),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type InsertDepartment = typeof departments.$inferInsert;
export type SelectDepartment = typeof departments.$inferSelect;
