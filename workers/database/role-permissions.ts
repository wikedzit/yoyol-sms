import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { permissions } from './permissions';
import { roles } from './roles';

export const rolePermissions = sqliteTable(
  'role_permissions',
  {
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionKey: text('permission_key')
      .notNull()
      .references(() => permissions.key),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionKey] }),
  ],
);
