import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const trustedPublishers = sqliteTable('trusted_publishers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  publisher: text('publisher').notNull(),
  keyId: text('key_id').notNull(),
  publicKey: text('public_key').notNull(),
  revoked: integer('revoked', { mode: 'boolean' }).notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  publisherKey: uniqueIndex('trusted_publishers_key').on(table.publisher, table.keyId),
}));

export const revokedExtensionVersions = sqliteTable('revoked_extension_versions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  extensionKey: text('extension_key').notNull(),
  version: text('version').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  extensionVersion: uniqueIndex('revoked_extension_versions_key').on(table.extensionKey, table.version),
}));
