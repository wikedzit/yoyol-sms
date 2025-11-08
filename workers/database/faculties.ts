import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const faculties = sqliteTable('faculties', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  dean: text('dean'),
  description: text('description'),
  status: text('status').notNull().default('active'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type InsertFaculty = typeof faculties.$inferInsert;
export type SelectFaculty = typeof faculties.$inferSelect;

