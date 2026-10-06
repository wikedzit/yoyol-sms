import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  refreshHash: text('refresh_hash').notNull(),
  expiresAt: integer('expires_at').notNull(),
  revokedAt: integer('revoked_at'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at').notNull(),
});

export type SelectSession = typeof sessions.$inferSelect;
