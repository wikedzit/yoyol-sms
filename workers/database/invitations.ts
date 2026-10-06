import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { roles } from './roles';
import { school } from './school';
import { users } from './users';

export const invitations = sqliteTable('invitations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id')
    .notNull()
    .references(() => school.id, { onDelete: 'cascade' }),
  email: text('email'),
  phone: text('phone'),
  roleId: integer('role_id')
    .notNull()
    .references(() => roles.id, { onDelete: 'restrict' }),
  tokenHash: text('token_hash').notNull().unique(),
  teacherId: integer('teacher_id'),
  studentId: integer('student_id'),
  expiresAt: integer('expires_at').notNull(),
  acceptedAt: integer('accepted_at'),
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at').notNull(),
});

export type SelectInvitation = typeof invitations.$inferSelect;
