import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const auditEvents = sqliteTable('audit_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id'),
  userId: integer('user_id'),
  action: text('action').notNull(),
  detail: text('detail'),
  ip: text('ip'),
  extensionKey: text('extension_key'),
  target: text('target'),
  createdAt: integer('created_at').notNull(),
});
