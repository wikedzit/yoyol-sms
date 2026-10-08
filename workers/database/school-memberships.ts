import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { roles } from './roles';
import { school } from './school';
import { staff } from './staff';
import { guardians } from './guardians';
import { students } from './students';
import { users } from './users';

// A person joins a school through a membership. The role on that membership
// is what they may do in that school, which can differ from their other schools.
export const schoolMemberships = sqliteTable(
  'school_memberships',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    schoolId: integer('school_id')
      .notNull()
      .references(() => school.id, { onDelete: 'restrict' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    staffId: integer('staff_id').references(() => staff.id, {
      onDelete: 'restrict',
    }),
    studentId: integer('student_id').references(() => students.id, {
      onDelete: 'restrict',
    }),
    guardianId: integer('guardian_id').references(() => guardians.id, {
      onDelete: 'restrict',
    }),
    status: text('status').notNull().default('active'),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    schoolUserUnique: uniqueIndex('school_memberships_school_user_unique').on(
      table.schoolId,
      table.userId,
    ),
  }),
);

export type InsertSchoolMembership = typeof schoolMemberships.$inferInsert;
export type SelectSchoolMembership = typeof schoolMemberships.$inferSelect;
