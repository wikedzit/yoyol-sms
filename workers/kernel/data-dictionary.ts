export function tablesInSql(sql: string): string[] {
  const names: string[] = [];
  for (const match of sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)? [`"]?([A-Za-z0-9_]+)/g)) {
    const name = match[1];
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

export function tablesInModuleSchema(source: string): string[] {
  const parsed = JSON.parse(source) as { operations?: { op?: string; name?: string }[] };
  const names: string[] = [];
  for (const operation of parsed.operations ?? []) {
    if (operation.op === 'createTable' && operation.name && !names.includes(operation.name)) {
      names.push(operation.name);
    }
  }
  return names;
}

export function dictionaryMarkdown(input: {
  sqlTables: readonly { file: string; tables: readonly string[] }[];
  moduleTables: readonly { extension: string; tables: readonly string[] }[];
}): string {
  const lines = [
    '# Data dictionary',
    '',
    'Generated from the Drizzle SQL migrations and the extension schema files.',
    'Module tables are created as `mod_<extension>_<table>`, with hyphens in the extension key turned into underscores.',
    '',
    '## Kernel and app tables',
    '',
  ];
  for (const file of input.sqlTables) {
    if (file.tables.length === 0) continue;
    lines.push(`- \`${file.file}\`: ${file.tables.map((table) => `\`${table}\``).join(', ')}`);
  }
  lines.push('', '## Extension tables', '');
  for (const extension of input.moduleTables) {
    if (extension.tables.length === 0) continue;
    const physical = extension.tables.map((table) => `\`${physicalName(extension.extension, table)}\``);
    lines.push(`- \`${extension.extension}\`: ${physical.join(', ')}`);
  }
  lines.push('');
  return lines.join('\n');
}

function physicalName(extension: string, table: string): string {
  return `mod_${extension.replaceAll('-', '_')}_${table}`;
}
