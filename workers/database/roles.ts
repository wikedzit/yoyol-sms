import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { school } from './school';

export const roles = sqliteTable(
  'roles',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    schoolId: integer('school_id')
      .notNull()
      .references(() => school.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    name: text('name').notNull(),
    isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(true),
  },
  (table) => [uniqueIndex('roles_school_key').on(table.schoolId, table.key)],
);

export type SelectRole = typeof roles.$inferSelect;
