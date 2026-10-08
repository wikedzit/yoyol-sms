import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull(),
  userId: integer('user_id'),
  extensionKey: text('extension_key').notNull(),
  channel: text('channel').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull(),
  recipient: text('recipient'),
  detail: text('detail'),
  readAt: integer('read_at'),
  createdAt: integer('created_at').notNull(),
});
