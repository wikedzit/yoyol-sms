import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { school } from './school';

export const schoolExtensions = sqliteTable(
  'school_extensions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    schoolId: integer('school_id')
      .notNull()
      .references(() => school.id, { onDelete: 'cascade' }),
    extensionKey: text('extension_key').notNull(),
    status: text('status').notNull(),
    installedAt: integer('installed_at').notNull(),
  },
  (table) => [
    uniqueIndex('school_extensions_school_key').on(table.schoolId, table.extensionKey),
  ],
);

export type SelectSchoolExtension = typeof schoolExtensions.$inferSelect;
