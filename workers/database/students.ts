import { sql } from 'drizzle-orm/sql/sql';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { classes } from './class';
import { formClasses } from './academic-levels';
import { campus } from './campuses';
import { school } from './school';
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

  // Legacy: use formClassId for school-based structure instead
  classId: integer('class_id').references(() => classes.id, {
    onDelete: 'cascade',
  }),

  // Links student to a specific class like "3A", "5B" within a form/stream/level
  formClassId: integer('form_class_id').references(() => formClasses.id, {
    onDelete: 'cascade',
  }),

  // Which school this student belongs to. Nullable - old records may not have one.
  schoolId: integer('school_id').references(() => school.id, {
    onDelete: 'set null',
  }),

  campusId: integer('campus_id').references(() => campus.id, {
    onDelete: 'set null',
  }),
});

export const studentsRelations = relations(students, ({ one }) => ({
  class: one(classes, {
    fields: [students.classId],
    references: [classes.id],
  }),
  formClass: one(formClasses, {
    fields: [students.formClassId],
    references: [formClasses.id],
  }),
  school: one(school, {
    fields: [students.schoolId],
    references: [school.id],
  }),
}));

export type InsertStudent = typeof students.$inferInsert;
export type SelectStudent = typeof students.$inferSelect;