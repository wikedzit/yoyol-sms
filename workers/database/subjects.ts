import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const subject = sqliteTable('subjects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  subjectName: text('subjectName').notNull(),
  code: text('code').notNull().unique(),
  departments: text('departments').notNull(),
  instructor: text('instructor').notNull(),
  description: text('description'),
  enrolledStudents: integer('enrolledStudents').default(0),
  status: text('status').default('Active'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type InsertSubject = typeof subject.$inferInsert;
export type SelectSubject = typeof subject.$inferSelect;
