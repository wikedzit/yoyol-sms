import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { school } from './school';
import { users } from './users';

// A person who works at one school. A membership points here when that person can sign in.
export const staff = sqliteTable(
  'staff',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    schoolId: integer('school_id')
      .notNull()
      .references(() => school.id, { onDelete: 'restrict' }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'restrict' }),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email'),
    phone: text('phone'),
    jobTitle: text('job_title').notNull(),
    status: text('status').notNull().default('Active'),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    schoolUserUnique: uniqueIndex('staff_school_user_unique').on(
      table.schoolId,
      table.userId,
    ),
  }),
);

export type InsertStaff = typeof staff.$inferInsert;
export type SelectStaff = typeof staff.$inferSelect;
