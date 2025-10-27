import { sql } from 'drizzle-orm/sql/sql';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { classes } from './class';
import { relations } from 'drizzle-orm';

export const students = sqliteTable('students', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  gender: text('gender').notNull().default('Male'),
  dob: text('dob'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  guardianName: text('guardian_name'),
  guardianPhone: text('guardian_phone'),
  photoUrl: text('photo_url'),
  course: text('course'),
  grade: text('grade'),
  enrollmentDate: text('enrollment_date'),
  status: text('status').notNull().default('Active'),

  createdAt: integer('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  //this is a foreign key Relationship field — link student to a class
  classId: integer('class_id').references(() => classes.id, {
    onDelete: 'cascade',
  }),
});

//The studentsRelations helper allows you to do joined queries later, for example:
// 🔗 Define relation helper (optional but useful for joins)
export const studentsRelations = relations(students, ({ one }) => ({
  class: one(classes, {
    fields: [students.classId],
    references: [classes.id],
  }),
}));

export type InsertStudent = typeof students.$inferInsert;
export type SelectStudent = typeof students.$inferSelect;
