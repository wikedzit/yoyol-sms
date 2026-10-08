import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { school } from './school';

// A role belongs to one school. The same key, such as "teacher", can exist in every school.
export const roles = sqliteTable(
  'roles',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    schoolId: integer('school_id')
      .notNull()
      .references(() => school.id, { onDelete: 'restrict' }),
    key: text('key').notNull(),
    name: text('name').notNull(),
    isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    schoolKeyUnique: uniqueIndex('roles_school_key_unique').on(
      table.schoolId,
      table.key,
    ),
  }),
);

export type InsertRole = typeof roles.$inferInsert;
export type SelectRole = typeof roles.$inferSelect;
