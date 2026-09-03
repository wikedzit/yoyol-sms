import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// School Profile table - single row per school
export const school = sqliteTable('school', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  motto: text('motto'),
  registrationNumber: text('registration_number'),
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color').default('#2563eb'),
  secondaryColor: text('secondary_color').default('#0f172a'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type InsertSchool = typeof school.$inferInsert;
export type SelectSchool = typeof school.$inferSelect;