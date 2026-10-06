import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const signInAttempts = sqliteTable('sign_in_attempts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
  ip: text('ip'),
  succeeded: integer('succeeded').notNull(),
  createdAt: integer('created_at').notNull(),
});
