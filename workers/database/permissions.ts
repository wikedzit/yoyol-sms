import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const permissions = sqliteTable('permissions', {
  key: text('key').primaryKey(),
  label: text('label').notNull(),
});
