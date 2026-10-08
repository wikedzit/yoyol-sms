import type { ModuleColumn, ModuleMigration } from './module-schema';

export type SqlDialect = 'sqlite' | 'postgres';

type Column = ModuleColumn;
type CreateTable = Extract<ModuleMigration['operations'][number], { op: 'createTable' }>;
type MigrationOperation = ModuleMigration['operations'][number];

const coreTables: Record<string, string> = {
  users: 'users',
  schools: 'school',
  campuses: 'campus',
};

export function moduleTableName(extensionKey: string, table: string): string {
  return `mod_${extensionKey.replaceAll('-', '_')}_${table}`;
}

export function compileModuleMigration(
  extensionKey: string,
  migration: ModuleMigration,
  dialect: SqlDialect,
): string[] {
  return migration.operations.flatMap((operation) => compileOperation(extensionKey, operation, dialect));
}

export function pendingMigrations(
  recordedIds: readonly string[],
  migrations: readonly ModuleMigration[],
): ModuleMigration[] {
  const recorded = new Set(recordedIds);
  return [...migrations]
    .sort((left, right) => left.id.localeCompare(right.id))
    .filter((migration) => !recorded.has(migration.id));
}

export function extensionsInApplyOrder(
  keys: readonly string[],
  manifests: readonly { key: string; requires: { extensions?: Record<string, string> } }[],
): string[] {
  const wanted = new Set(keys);
  const byKey = new Map(manifests.map((manifest) => [manifest.key, manifest]));
  const done = new Set<string>();
  const order: string[] = [];

  function visit(key: string) {
    if (done.has(key) || !wanted.has(key)) {
      return;
    }
    done.add(key);
    const manifest = byKey.get(key);
    for (const dependency of Object.keys(manifest?.requires.extensions ?? {})) {
      visit(dependency);
    }
    order.push(key);
  }

  for (const key of keys) {
    visit(key);
  }
  return order;
}

function compileOperation(extensionKey: string, operation: MigrationOperation, dialect: SqlDialect): string[] {
  if (operation.op === 'createTable') {
    return compileCreateTable(extensionKey, operation, dialect);
  }
  if (operation.op === 'addColumn') {
    const table = moduleTableName(extensionKey, operation.table);
    return [`ALTER TABLE ${table} ADD COLUMN ${columnSql(extensionKey, operation.column, dialect)}`];
  }
  const table = moduleTableName(extensionKey, operation.table);
  const name = indexName(table, operation.columns);
  if (operation.op === 'createIndex') {
    return [`CREATE INDEX IF NOT EXISTS ${name} ON ${table} (${operation.columns.join(', ')})`];
  }
  return [`DROP INDEX IF EXISTS ${name}`];
}

function compileCreateTable(extensionKey: string, operation: CreateTable, dialect: SqlDialect): string[] {
  const table = moduleTableName(extensionKey, operation.name);
  const columns = [
    ...operation.columns.map((column) => columnSql(extensionKey, column, dialect)),
    kernelColumns(dialect),
  ];
  const statements = [`CREATE TABLE IF NOT EXISTS ${table} (\n  ${columns.join(',\n  ')}\n)`];
  statements.push(`CREATE INDEX IF NOT EXISTS ${table}_school_id ON ${table} (school_id)`);

  for (const index of operation.indexes ?? []) {
    statements.push(
      `CREATE INDEX IF NOT EXISTS ${indexName(table, index.columns)} ON ${table} (${index.columns.join(', ')})`,
    );
  }
  return statements;
}

function indexName(table: string, columns: readonly string[]): string {
  return `${table}_${columns.join('_')}`;
}

function kernelColumns(dialect: SqlDialect): string {
  const school = dialect === 'sqlite' ? 'integer NOT NULL REFERENCES school(id)' : 'bigint NOT NULL REFERENCES school(id)';
  const user = dialect === 'sqlite' ? 'integer REFERENCES users(id)' : 'bigint REFERENCES users(id)';
  const timestamp = dialect === 'sqlite' ? 'integer NOT NULL' : 'timestamptz NOT NULL';
  return [
    `school_id ${school}`,
    `created_at ${timestamp}`,
    `updated_at ${timestamp}`,
    `created_by ${user}`,
  ].join(',\n  ');
}

function columnSql(extensionKey: string, column: Column, dialect: SqlDialect): string {
  if (column.type === 'id') {
    return dialect === 'sqlite'
      ? `${column.name} integer PRIMARY KEY AUTOINCREMENT`
      : `${column.name} bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`;
  }

  const parts = [column.name, sqlType(column, dialect)];
  if (column.notNull) {
    parts.push('NOT NULL');
  }
  if (column.default !== undefined) {
    parts.push(`DEFAULT ${sqlDefault(column.default, dialect)}`);
  }
  if (column.type === 'reference' && column.references) {
    const onDelete = column.onDelete ? ` ON DELETE ${column.onDelete.toUpperCase()}` : '';
    parts.push(`REFERENCES ${resolveReference(extensionKey, column.references)}(id)${onDelete}`);
  }
  if (column.type === 'enum' && column.values?.length) {
    const values = column.values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');
    parts.push(`CHECK (${column.name} IN (${values}))`);
  }
  return parts.join(' ');
}

function sqlType(column: Column, dialect: SqlDialect): string {
  if (column.type === 'reference' || column.type === 'integer') {
    return dialect === 'sqlite' ? 'integer' : 'bigint';
  }
  if (column.type === 'boolean') {
    return dialect === 'sqlite' ? 'integer' : 'boolean';
  }
  if (column.type === 'date') {
    return dialect === 'sqlite' ? 'text' : 'date';
  }
  if (column.type === 'timestamp') {
    return dialect === 'sqlite' ? 'integer' : 'timestamptz';
  }
  if (column.type === 'json') {
    return dialect === 'sqlite' ? 'text' : 'jsonb';
  }
  if (dialect === 'postgres' && column.maxLength) {
    return `varchar(${column.maxLength})`;
  }
  return 'text';
}

function sqlDefault(value: string | number | boolean, dialect: SqlDialect): string {
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    if (dialect === 'postgres') {
      return value ? 'true' : 'false';
    }
    return value ? '1' : '0';
  }
  return `'${value.replaceAll("'", "''")}'`;
}

function resolveReference(extensionKey: string, reference: string): string {
  const dot = reference.indexOf('.');
  if (dot === -1) {
    return moduleTableName(extensionKey, reference);
  }
  const owner = reference.slice(0, dot);
  const table = reference.slice(dot + 1);
  if (owner === 'core') {
    const physical = coreTables[table];
    if (!physical) {
      throw new Error(`Unknown core table ${reference}.`);
    }
    return physical;
  }
  return moduleTableName(owner, table);
}
