import { z } from 'zod';

const columnName = z.string().regex(/^[a-z][a-z0-9_]*$/, 'Use a lowercase column name.');
const tableName = z.string().regex(/^[a-z][a-z0-9_]*$/, 'Use a lowercase table name.');

const columnSchema = z.object({
  name: columnName,
  type: z.enum(['id', 'text', 'integer', 'boolean', 'date', 'timestamp', 'enum', 'json', 'reference']),
  notNull: z.boolean().optional(),
  maxLength: z.number().int().positive().optional(),
  references: z.string().min(1).optional(),
  onDelete: z.enum(['restrict', 'cascade', 'set null']).optional(),
  values: z.array(z.string().min(1)).optional(),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

const indexColumns = z.array(columnName).min(1);

const createTableSchema = z.object({
  op: z.literal('createTable'),
  name: tableName,
  columns: z.array(columnSchema).min(1),
  indexes: z.array(z.object({ columns: indexColumns })).optional(),
});

const addColumnSchema = z.object({
  op: z.literal('addColumn'),
  table: tableName,
  column: columnSchema,
});

const createIndexSchema = z.object({
  op: z.literal('createIndex'),
  table: tableName,
  columns: indexColumns,
});

const dropIndexSchema = z.object({
  op: z.literal('dropIndex'),
  table: tableName,
  columns: indexColumns,
});

export const moduleMigrationSchema = z.object({
  id: z.string().regex(/^\d{3}_[a-z0-9_]+$/, 'Migration id must look like 001_initial.'),
  operations: z.array(z.discriminatedUnion('op', [
    createTableSchema,
    addColumnSchema,
    createIndexSchema,
    dropIndexSchema,
  ])).min(1),
}).superRefine((migration, context) => {
  for (const operation of migration.operations) {
    if (operation.op !== 'addColumn') {
      continue;
    }
    if (operation.column.type === 'id') {
      context.addIssue({ code: 'custom', message: 'Add a new table when the column is the primary key.' });
    }
    if (operation.column.notNull && operation.column.default === undefined) {
      context.addIssue({ code: 'custom', message: 'A required new column needs a default.' });
    }
  }
});

export type ModuleColumn = z.infer<typeof columnSchema>;

export type ModuleMigration = z.infer<typeof moduleMigrationSchema>;

export function parseModuleMigration(input: unknown): ModuleMigration {
  return moduleMigrationSchema.parse(input);
}

export function tablesInMigration(migration: ModuleMigration): string[] {
  return migration.operations.flatMap((operation) => {
    if (operation.op === 'createTable') {
      return [operation.name];
    }
    return [];
  });
}
