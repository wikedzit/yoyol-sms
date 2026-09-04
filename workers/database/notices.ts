import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { users } from './users';

export const notices = sqliteTable('notices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  date: text('date').notNull(), // Date string like 'Dec 18-22, 2025' or 'Jan 5, 2026'
  type: text('type').notNull().default('info'), // 'exam', 'holiday', 'registration', 'meeting', 'info'
  priority: text('priority').notNull().default('normal'), // 'high', 'normal', 'low'
  status: text('status').notNull().default('Active'), // 'Active', 'Inactive'
  ownerUserId: integer('owner_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type InsertNotice = typeof notices.$inferInsert;
export type SelectNotice = typeof notices.$inferSelect;

