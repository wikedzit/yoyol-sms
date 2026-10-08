export function moduleTablePrefix(extensionKey: string): string {
  return `mod_${extensionKey.replaceAll('-', '_')}_`;
}

export function moduleTableGlob(extensionKey: string): string {
  return `${moduleTablePrefix(extensionKey)}*`;
}

export function isOwnedModuleTable(extensionKey: string, tableName: string): boolean {
  return tableName.startsWith(moduleTablePrefix(extensionKey)) && /^mod_[a-z0-9_]+$/.test(tableName);
}

export function exportLines(rows: readonly Record<string, unknown>[]): string {
  return rows.map((row) => JSON.stringify(row)).join('\n');
}
