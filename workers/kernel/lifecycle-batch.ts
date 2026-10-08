export type SqlStatement = {
  sql: string;
  params: readonly unknown[];
};

export type ReversibleStatement = {
  sql: string;
  params?: readonly unknown[];
  undo: SqlStatement[];
};

export function reversibleChange(statements: readonly ReversibleStatement[]): {
  apply: SqlStatement[];
  undo: SqlStatement[];
} {
  return {
    apply: statements.map((statement) => ({
      sql: statement.sql,
      params: statement.params ?? [],
    })),
    undo: [...statements].reverse().flatMap((statement) => statement.undo),
  };
}

export function undoSchemaStatement(sql: string): SqlStatement | null {
  const oneLine = sql.replaceAll(/\s+/g, ' ').trim();
  const table = /^CREATE TABLE IF NOT EXISTS ([a-z_][a-z0-9_]*)\b/i.exec(oneLine);
  if (table) {
    return { sql: `DROP TABLE IF EXISTS ${table[1]}`, params: [] };
  }
  const index = /^CREATE INDEX IF NOT EXISTS ([a-z_][a-z0-9_]*)\b/i.exec(oneLine);
  if (index) {
    return { sql: `DROP INDEX IF EXISTS ${index[1]}`, params: [] };
  }
  return null;
}

export type EnableChange = {
  schoolId: number;
  userId: number | null;
  now: number;
  key: string;
  type: string;
  publisher: string;
  required: boolean;
  version: string;
  manifestJson: string;
  extensionRowExists: boolean;
  versionRowExists: boolean;
  schema: readonly { sql: string; undo: SqlStatement | null }[];
  migrations: readonly { extensionKey: string; id: string }[];
  permissions: readonly { key: string; label: string }[];
  hooks: readonly { name: string; priority: number }[];
  previousHooks: readonly { name: string; priority: number }[];
  events: readonly string[];
  previousEvents: readonly string[];
  capabilities: readonly string[];
  previousGrant: string | null;
  settings: readonly { key: string; value: string }[];
  previousStatus: string | null;
};

export function enableStatements(change: EnableChange): ReversibleStatement[] {
  return [
    ...schemaStatements(change.schoolId, change.now, change.schema, change.migrations),
    ...registryStatements(change),
    ...change.permissions.map((permission) => ({
      sql: 'INSERT INTO permissions (key, label) VALUES (?, ?)',
      params: [permission.key, permission.label],
      undo: [{ sql: 'DELETE FROM permissions WHERE key = ?', params: [permission.key] }],
    })),
    ...hookStatements(change.schoolId, change.key, change.hooks, change.previousHooks),
    ...eventStatements(change.schoolId, change.key, change.events, change.previousEvents),
    ...grantStatements(change.schoolId, change.key, change.capabilities, change.previousGrant),
    ...change.settings.map((setting) => ({
      ...settingInsert(change.schoolId, change.key, setting.key, setting.value),
      undo: [{
        sql: 'DELETE FROM extension_settings WHERE school_id = ? AND extension_key = ? AND setting_key = ?',
        params: [change.schoolId, change.key, setting.key],
      }],
    })),
    schoolStatusStatement(change.schoolId, change.key, change.now, change.previousStatus),
    auditStatement(change.schoolId, change.userId, change.now, 'extension.enable', change.key, change.version),
  ];
}

export type UpgradeChange = {
  schoolId: number;
  userId: number | null;
  now: number;
  key: string;
  type: string;
  publisher: string;
  required: boolean;
  version: string;
  manifestJson: string;
  fromVersion: string;
  extensionRowExists: boolean;
  versionRowExists: boolean;
  schema: readonly { sql: string; undo: SqlStatement | null }[];
  migrations: readonly { extensionKey: string; id: string }[];
};

export function upgradeStatements(change: UpgradeChange): ReversibleStatement[] {
  return [
    ...schemaStatements(change.schoolId, change.now, change.schema, change.migrations),
    ...registryStatements(change),
    auditStatement(change.schoolId, change.userId, change.now, 'extension.upgrade', change.key, change.fromVersion),
  ];
}

function schemaStatements(
  schoolId: number,
  now: number,
  schema: readonly { sql: string; undo: SqlStatement | null }[],
  migrations: readonly { extensionKey: string; id: string }[],
): ReversibleStatement[] {
  const statements: ReversibleStatement[] = schema.map((statement) => ({
    sql: statement.sql,
    undo: statement.undo ? [statement.undo] : [],
  }));
  for (const migration of migrations) {
    statements.push({
      sql: 'INSERT INTO extension_migrations (school_id, extension_key, version, applied_at) VALUES (?, ?, ?, ?)',
      params: [schoolId, migration.extensionKey, migration.id, now],
      undo: [{
        sql: 'DELETE FROM extension_migrations WHERE school_id = ? AND extension_key = ? AND version = ?',
        params: [schoolId, migration.extensionKey, migration.id],
      }],
    });
  }
  return statements;
}

function registryStatements(change: {
  key: string;
  type: string;
  publisher: string;
  required: boolean;
  version: string;
  manifestJson: string;
  extensionRowExists: boolean;
  versionRowExists: boolean;
}): ReversibleStatement[] {
  const statements: ReversibleStatement[] = [];
  if (!change.extensionRowExists) {
    statements.push({
      sql: 'INSERT INTO extensions (key, type, publisher, required) VALUES (?, ?, ?, ?)',
      params: [change.key, change.type, change.publisher, change.required ? 1 : 0],
      undo: [{ sql: 'DELETE FROM extensions WHERE key = ?', params: [change.key] }],
    });
  }
  if (!change.versionRowExists) {
    statements.push({
      sql: 'INSERT INTO extension_versions (extension_key, version, manifest_json) VALUES (?, ?, ?)',
      params: [change.key, change.version, change.manifestJson],
      undo: [{
        sql: 'DELETE FROM extension_versions WHERE extension_key = ? AND version = ?',
        params: [change.key, change.version],
      }],
    });
  }
  return statements;
}

function hookStatements(
  schoolId: number,
  extensionKey: string,
  hooks: readonly { name: string; priority: number }[],
  previousHooks: readonly { name: string; priority: number }[],
): ReversibleStatement[] {
  return [
    {
      sql: 'DELETE FROM hook_registrations WHERE school_id = ? AND extension_key = ?',
      params: [schoolId, extensionKey],
      undo: previousHooks.map((hook) => hookInsert(schoolId, extensionKey, hook.name, hook.priority)),
    },
    ...hooks.map((hook) => ({
      sql: hookInsert(schoolId, extensionKey, hook.name, hook.priority).sql,
      params: hookInsert(schoolId, extensionKey, hook.name, hook.priority).params,
      undo: [{
        sql: 'DELETE FROM hook_registrations WHERE school_id = ? AND extension_key = ? AND hook_name = ?',
        params: [schoolId, extensionKey, hook.name],
      }],
    })),
  ];
}

function eventStatements(
  schoolId: number,
  extensionKey: string,
  events: readonly string[],
  previousEvents: readonly string[],
): ReversibleStatement[] {
  return [
    {
      sql: 'DELETE FROM event_subscriptions WHERE school_id = ? AND extension_key = ?',
      params: [schoolId, extensionKey],
      undo: previousEvents.map((eventName) => ({
        sql: 'INSERT INTO event_subscriptions (school_id, extension_key, event_name) VALUES (?, ?, ?)',
        params: [schoolId, extensionKey, eventName],
      })),
    },
    ...events.map((eventName) => ({
      sql: 'INSERT INTO event_subscriptions (school_id, extension_key, event_name) VALUES (?, ?, ?)',
      params: [schoolId, extensionKey, eventName],
      undo: [{
        sql: 'DELETE FROM event_subscriptions WHERE school_id = ? AND extension_key = ? AND event_name = ?',
        params: [schoolId, extensionKey, eventName],
      }],
    })),
  ];
}

function grantStatements(
  schoolId: number,
  extensionKey: string,
  capabilities: readonly string[],
  previousGrant: string | null,
): ReversibleStatement[] {
  const clear: SqlStatement = {
    sql: 'DELETE FROM extension_settings WHERE school_id = ? AND extension_key = ? AND setting_key = ?',
    params: [schoolId, extensionKey, 'granted_capabilities'],
  };
  const restore: SqlStatement[] = [clear];
  if (previousGrant !== null) {
    restore.push(settingInsert(schoolId, extensionKey, 'granted_capabilities', previousGrant));
  }
  return [
    { ...clear, undo: restore },
    {
      ...settingInsert(schoolId, extensionKey, 'granted_capabilities', JSON.stringify(capabilities)),
      undo: [clear],
    },
  ];
}

function schoolStatusStatement(
  schoolId: number,
  extensionKey: string,
  now: number,
  previousStatus: string | null,
): ReversibleStatement {
  if (previousStatus === null) {
    return {
      sql: 'INSERT INTO school_extensions (school_id, extension_key, status, installed_at) VALUES (?, ?, ?, ?)',
      params: [schoolId, extensionKey, 'enabled', now],
      undo: [{
        sql: 'DELETE FROM school_extensions WHERE school_id = ? AND extension_key = ?',
        params: [schoolId, extensionKey],
      }],
    };
  }
  return {
    sql: 'UPDATE school_extensions SET status = ? WHERE school_id = ? AND extension_key = ?',
    params: ['enabled', schoolId, extensionKey],
    undo: [{
      sql: 'UPDATE school_extensions SET status = ? WHERE school_id = ? AND extension_key = ?',
      params: [previousStatus, schoolId, extensionKey],
    }],
  };
}

function auditStatement(
  schoolId: number,
  userId: number | null,
  now: number,
  action: string,
  extensionKey: string,
  target: string,
): ReversibleStatement {
  return {
    sql: 'INSERT INTO audit_events (school_id, user_id, action, detail, ip, extension_key, target, created_at) VALUES (?, ?, ?, NULL, NULL, ?, ?, ?)',
    params: [schoolId, userId, action, extensionKey, target, now],
    undo: [{
      sql: 'DELETE FROM audit_events WHERE school_id = ? AND action = ? AND extension_key = ? AND target = ? AND created_at = ?',
      params: [schoolId, action, extensionKey, target, now],
    }],
  };
}

function hookInsert(schoolId: number, extensionKey: string, hookName: string, priority: number): SqlStatement {
  return {
    sql: 'INSERT INTO hook_registrations (school_id, extension_key, hook_name, priority) VALUES (?, ?, ?, ?)',
    params: [schoolId, extensionKey, hookName, priority],
  };
}

function settingInsert(schoolId: number, extensionKey: string, settingKey: string, settingValue: string): SqlStatement {
  return {
    sql: 'INSERT INTO extension_settings (school_id, extension_key, setting_key, setting_value) VALUES (?, ?, ?, ?)',
    params: [schoolId, extensionKey, settingKey, settingValue],
  };
}
