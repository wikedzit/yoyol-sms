import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { campus } from './campuses';
import { relations } from 'drizzle-orm';

export const teachers = sqliteTable('teachers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  subject: text('subject').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  qualification: text('qualification'),
  gender: text('gender').notNull(),
  experience: integer('experience'),
  status: text('status').notNull().default('Active'),

  // Legacy field - kept for backwards compatibility
  departmentId: integer('department_id'),


  campusId: integer('campus_id').references(() => campus.id, {
    onDelete: 'set null',
  }),
  ownerUserId: integer('owner_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  createdAt: integer('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const teachersRelations = relations(teachers, ({ one }) => ({
  campus: one(campus, {
    fields: [teachers.campusId],
    references: [campus.id],
  }),
}));

export type InsertTeacher = typeof teachers.$inferInsert;
export type SelectTeacher = typeof teachers.$inferSelect;
