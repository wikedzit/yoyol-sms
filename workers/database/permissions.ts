import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Permission names are global. A school decides which of its roles receive them.
export const permissions = sqliteTable('permissions', {
  key: text('key').primaryKey(),
  extensionKey: text('extension_key').notNull(),
  label: text('label').notNull(),
  description: text('description'),
});

export type InsertPermission = typeof permissions.$inferInsert;
export type SelectPermission = typeof permissions.$inferSelect;
