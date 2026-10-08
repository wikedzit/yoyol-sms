import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const extensions = sqliteTable('extensions', {
  key: text('key').primaryKey(),
  type: text('type').notNull(),
  publisher: text('publisher').notNull(),
  required: integer('required', { mode: 'boolean' }).notNull().default(false),
});

export const extensionVersions = sqliteTable(
  'extension_versions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    extensionKey: text('extension_key')
      .notNull()
      .references(() => extensions.key, { onDelete: 'cascade' }),
    version: text('version').notNull(),
    manifestJson: text('manifest_json').notNull(),
  },
  (table) => [
    uniqueIndex('extension_versions_key_version').on(table.extensionKey, table.version),
  ],
);

export const extensionMigrations = sqliteTable('extension_migrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull(),
  extensionKey: text('extension_key').notNull(),
  version: text('version').notNull(),
  appliedAt: integer('applied_at').notNull(),
});

export const extensionSettings = sqliteTable(
  'extension_settings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    schoolId: integer('school_id').notNull(),
    extensionKey: text('extension_key').notNull(),
    settingKey: text('setting_key').notNull(),
    settingValue: text('setting_value').notNull(),
  },
  (table) => [
    uniqueIndex('extension_settings_school_key').on(
      table.schoolId,
      table.extensionKey,
      table.settingKey,
    ),
  ],
);

export const hookRegistrations = sqliteTable('hook_registrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull(),
  extensionKey: text('extension_key').notNull(),
  hookName: text('hook_name').notNull(),
  priority: integer('priority').notNull().default(100),
});

export const eventSubscriptions = sqliteTable('event_subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull(),
  extensionKey: text('extension_key').notNull(),
  eventName: text('event_name').notNull(),
});
