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
  preferredLanguage: text('preferred_language').default('en'),
  avatarUrl: text('avatar_url'),
  jobTitle: text('job_title'),
  staffId: text('staff_id'),
  bio: text('bio'),
  accountStatus: text('account_status').default('active'),
  twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' })
    .notNull()
    .default(false),
  twoFactorSecret: text('two_factor_secret'),
  twoFactorRecoveryCodes: text('two_factor_recovery_codes'),
  twoFactorConfirmedAt: integer('two_factor_confirmed_at'),
  lastLoginAt: integer('last_login_at'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
