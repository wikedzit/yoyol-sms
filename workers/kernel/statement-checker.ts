import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';

export type CheckedStatement = {
  sql: string;
  params: readonly unknown[];
  kind: 'select' | 'insert' | 'update' | 'delete';
};

const blockedWord = /\b(union|join|pragma|attach|detach|drop|alter|create|vacuum|begin|commit|rollback|replace)\b/i;

export function checkExtensionStatement(input: {
  sql: string;
  params: readonly unknown[];
  extensionKey: string;
  schoolId: number;
}): CheckedStatement {
  const sql = input.sql.trim().replaceAll(/\s+/g, ' ');
  if (sql.length === 0 || sql.includes(';') || sql.includes('--') || sql.includes('/*')) {
    throw new Error('The statement could not be checked.');
  }
  if (blockedWord.test(stripQuotes(sql))) {
    throw new Error('The statement could not be checked.');
  }

  const kindMatch = /^(select|insert|update|delete)\b/i.exec(sql);
  if (!kindMatch) {
    throw new Error('The statement could not be checked.');
  }
  const kind = kindMatch[1].toLowerCase() as CheckedStatement['kind'];
  const placeholders = sql.match(/\?/g)?.length ?? 0;
  if (placeholders !== input.params.length) {
    throw new Error('The statement could not be checked.');
  }

  const tables = referencedTables(sql);
  if (tables.length === 0 || tables.some((table) => !isOwnedModuleTable(input.extensionKey, table))) {
    throw new Error('The statement could not be checked.');
  }

  if (kind === 'insert') {
    assertInsertSchool(sql, input.params, input.schoolId);
  } else {
    assertSchoolPredicate(sql, input.params, input.schoolId);
  }

  return { sql, params: input.params, kind };
}

export function scopeExtensionStatement(input: {
  sql: string;
  params: readonly unknown[];
  extensionKey: string;
  schoolId: number;
}): CheckedStatement {
  const prepared = applySchoolScope(input.sql, input.params, input.schoolId);
  return checkExtensionStatement({
    sql: prepared.sql,
    params: prepared.params,
    extensionKey: input.extensionKey,
    schoolId: input.schoolId,
  });
}

export const statementLimit = 100;

export type StatementBudget = {
  used: number;
  limit: number;
};

export function openStatementBudget(limit = statementLimit): StatementBudget {
  return { used: 0, limit };
}

export function chargeStatement(budget: StatementBudget): void {
  budget.used += 1;
  if (budget.used > budget.limit) {
    throw new Error(`This extension used more than ${budget.limit} statements.`);
  }
}

export function createScopedDatabase(input: {
  extensionKey: string;
  schoolId: number;
  query: (sql: string, params: readonly unknown[]) => Promise<unknown[]>;
  statementLimit?: number;
}): SqliteRemoteDatabase {
  const budget = openStatementBudget(input.statementLimit ?? statementLimit);
  return drizzle(async (sql, params) => {
    const checked = scopeExtensionStatement({
      sql,
      params,
      extensionKey: input.extensionKey,
      schoolId: input.schoolId,
    });
    chargeStatement(budget);
    const rows = await input.query(checked.sql, checked.params);
    return { rows };
  });
}

export async function runScopedStatement(input: {
  sql: string;
  params: readonly unknown[];
  extensionKey: string;
  schoolId: number;
  execute: (sql: string, params: readonly unknown[]) => Promise<unknown>;
  budget?: StatementBudget;
}): Promise<unknown> {
  const checked = scopeExtensionStatement(input);
  if (input.budget) {
    chargeStatement(input.budget);
  }
  return input.execute(checked.sql, checked.params);
}

function applySchoolScope(
  sql: string,
  params: readonly unknown[],
  schoolId: number,
): { sql: string; params: unknown[] } {
  const bare = sql.trim().replaceAll(/\s+/g, ' ').replaceAll(/"([A-Za-z_][A-Za-z0-9_]*)"/g, '$1');
  const nextParams = [...params];
  if (/^insert\b/i.test(bare)) {
    if (/\bschool_id\b/i.test(bare)) {
      return { sql: bare, params: nextParams };
    }
    const insert = /^(insert\s+into\s+[a-z_][a-z0-9_]*)\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)$/i.exec(bare);
    if (!insert) {
      return { sql: bare, params: nextParams };
    }
    return {
      sql: `${insert[1]} (${insert[2]}, school_id) values (${insert[3]}, ?)`,
      params: [...nextParams, schoolId],
    };
  }
  if (/school_id\s*=\s*\?/i.test(bare)) {
    return { sql: bare, params: nextParams };
  }
  const tail = /\b(order\s+by|group\s+by|limit)\b/i.exec(bare);
  const head = (tail ? bare.slice(0, tail.index) : bare).trimEnd();
  const rest = tail ? bare.slice(tail.index).trim() : '';
  const joiner = /\bwhere\b/i.test(head) ? ' and' : ' where';
  return {
    sql: `${head}${joiner} school_id = ?${rest ? ` ${rest}` : ''}`,
    params: [...nextParams, schoolId],
  };
}

function isOwnedModuleTable(extensionKey: string, tableName: string): boolean {
  const prefix = `mod_${extensionKey.replaceAll('-', '_')}_`;
  return tableName.startsWith(prefix) && /^mod_[a-z0-9_]+$/.test(tableName);
}

function referencedTables(sql: string): string[] {
  const names: string[] = [];
  for (const match of stripQuotes(sql).matchAll(/\b(?:from|into|update)\s+([a-z_][a-z0-9_]*)/gi)) {
    names.push(match[1].toLowerCase());
  }
  return names;
}

function assertSchoolPredicate(sql: string, params: readonly unknown[], schoolId: number): void {
  const bare = stripQuotes(sql);
  const predicate = /school_id\s*=\s*\?/i.exec(bare);
  if (!predicate || predicate.index === undefined) {
    throw new Error('The statement must filter by the current school.');
  }
  const index = (bare.slice(0, predicate.index).match(/\?/g) ?? []).length;
  if (params[index] !== schoolId) {
    throw new Error('The statement must use the current school.');
  }
}

function assertInsertSchool(sql: string, params: readonly unknown[], schoolId: number): void {
  const insert = /^insert\s+into\s+[a-z_][a-z0-9_]*\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)$/i.exec(sql);
  if (!insert) {
    throw new Error('The statement could not be checked.');
  }
  const columns = insert[1].split(',').map((column) => column.trim().toLowerCase());
  const values = insert[2].split(',').map((value) => value.trim());
  const columnIndex = columns.indexOf('school_id');
  if (columnIndex < 0 || values[columnIndex] !== '?') {
    throw new Error('The statement must use the current school.');
  }
  const placeholderIndex = values.slice(0, columnIndex).filter((value) => value === '?').length;
  if (params[placeholderIndex] !== schoolId) {
    throw new Error('The statement must use the current school.');
  }
}

function stripQuotes(sql: string): string {
  return sql.replaceAll(/'(?:''|[^'])*'/g, "''");
}
