import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { school } from './school';
import { users } from './users';

// A parent or other adult responsible for a student at one school.
export const guardians = sqliteTable('guardians', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id')
    .notNull()
    .references(() => school.id, { onDelete: 'restrict' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'restrict' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull().default(''),
  email: text('email'),
  phone: text('phone'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type InsertGuardian = typeof guardians.$inferInsert;
export type SelectGuardian = typeof guardians.$inferSelect;
