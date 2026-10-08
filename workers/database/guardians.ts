import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { school } from './school';
import { students } from './students';
import { users } from './users';

export const guardians = sqliteTable('guardians', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id')
    .notNull()
    .references(() => school.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  schoolUser: uniqueIndex('guardians_school_user').on(table.schoolId, table.userId),
}));

export const guardianStudents = sqliteTable(
  'guardian_students',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    schoolId: integer('school_id')
      .notNull()
      .references(() => school.id, { onDelete: 'cascade' }),
    guardianId: integer('guardian_id')
      .notNull()
      .references(() => guardians.id, { onDelete: 'cascade' }),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    relationship: text('relationship').notNull(),
    isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    pair: uniqueIndex('guardian_students_pair').on(table.guardianId, table.studentId),
  }),
);
