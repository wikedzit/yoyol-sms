import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { school } from './school';

// Uploaded site themes. The themes plugin validates the JSON. This table
// only stores what the core accepted.
export const schoolThemes = sqliteTable(
  'school_themes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    schoolId: integer('school_id')
      .notNull()
      .references(() => school.id, { onDelete: 'cascade' }),
    themeKey: text('theme_key').notNull(),
    nameEn: text('name_en').notNull(),
    nameSw: text('name_sw').notNull(),
    tokensJson: text('tokens_json').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('school_themes_school_key').on(table.schoolId, table.themeKey),
  ],
);

export type SelectSchoolTheme = typeof schoolThemes.$inferSelect;
