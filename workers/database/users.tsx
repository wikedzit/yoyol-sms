import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('admin'), // optional: 'admin', 'teacher', 'student', etc.
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone'),
  preferredLanguage: text('preferred_language').default('en'), // 'en' | 'sw'
  avatarUrl: text('avatar_url'),
  totpSecret: text('totp_secret'),
  totpEnabled: integer('totp_enabled').notNull().default(0),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
