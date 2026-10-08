import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { school } from './school';

const schoolColumns = {
  schoolId: integer('school_id').notNull().references(() => school.id),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  createdBy: integer('created_by'),
};

export const reportPreviews = sqliteTable('mod_reports_previews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kind: text('kind').notNull(),
  csvText: text('csv_text').notNull(),
  summary: text('summary').notNull(),
  ready: integer('ready', { mode: 'boolean' }).notNull(),
  ...schoolColumns,
}, (table) => ({
  schoolUser: uniqueIndex('mod_reports_previews_school_user').on(table.schoolId, table.createdBy),
}));
