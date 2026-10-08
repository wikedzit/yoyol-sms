import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const domainEvents = sqliteTable('domain_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull(),
  eventName: text('event_name').notNull(),
  payloadVersion: integer('payload_version').notNull(),
  payloadJson: text('payload_json').notNull(),
  status: text('status').notNull(),
  attempts: integer('attempts').notNull().default(0),
  availableAt: integer('available_at').notNull(),
  lastError: text('last_error'),
});

export const extensionExports = sqliteTable('extension_exports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id').notNull(),
  extensionKey: text('extension_key').notNull(),
  body: text('body').notNull(),
  exportedAt: integer('exported_at').notNull(),
});
