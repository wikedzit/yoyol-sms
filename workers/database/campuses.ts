import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { school } from './school';
import { students } from './students';
import { teachers } from './teachers';

export const campus = sqliteTable('campus', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  schoolId: integer('school_id')
    .notNull()
    .references(() => school.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),

  code: text('code'),

  address: text('address'),

  phone: text('phone'),

  email: text('email'),

  isMain: integer('is_main', { mode: 'boolean' })
    .notNull()
    .default(false),

  createdAt: integer('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const campusRelations = relations(campus, ({ one, many }) => ({
  school: one(school, {
    fields: [campus.schoolId],
    references: [school.id],
  }),

  students: many(students),

  teachers: many(teachers),
}));

export type InsertCampus = typeof campus.$inferInsert;
export type SelectCampus = typeof campus.$inferSelect;

export interface CampusWithStats extends SelectCampus {
  totalStudents: number;
}
