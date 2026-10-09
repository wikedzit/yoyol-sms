import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// A person belongs to a school through school_memberships, and may belong to several.
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
  status: text('status').notNull().default('active'),
  requirePrivilegedTotp: integer('require_privileged_totp').notNull().default(0),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type InsertSchool = typeof school.$inferInsert;
export type SelectSchool = typeof school.$inferSelect;