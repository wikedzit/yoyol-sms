import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { roles } from './roles';
import { school } from './school';
import { users } from './users';

export const schoolMemberships = sqliteTable(
  'school_memberships',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    schoolId: integer('school_id')
      .notNull()
      .references(() => school.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    status: text('status').notNull().default('active'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('school_memberships_school_user').on(table.schoolId, table.userId),
  ],
);

export type SelectSchoolMembership = typeof schoolMemberships.$inferSelect;
