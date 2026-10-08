import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { permissions } from './permissions';
import { roles } from './roles';

// Which permission a role grants. Administrators can change these rows later.
export const rolePermissions = sqliteTable(
  'role_permissions',
  {
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    permissionKey: text('permission_key')
      .notNull()
      .references(() => permissions.key, { onDelete: 'restrict' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionKey] }),
  }),
);

export type InsertRolePermission = typeof rolePermissions.$inferInsert;
export type SelectRolePermission = typeof rolePermissions.$inferSelect;
