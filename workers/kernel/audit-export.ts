export type AuditCsvRow = {
  action: string;
  extensionKey: string | null;
  target: string | null;
  detail: string | null;
};

export function auditCsv(entries: readonly AuditCsvRow[]): string {
  const lines = ['action,extension,target,detail'];
  for (const entry of entries) {
    lines.push([entry.action, entry.extensionKey, entry.target, entry.detail].map(csvCell).join(','));
  }
  return lines.join('\n');
}

export function auditSearchPattern(query: string): string | null {
  const needle = query.trim().replaceAll('%', '').replaceAll('_', '');
  if (needle.length === 0) {
    return null;
  }
  return `%${needle}%`;
}

function csvCell(value: string | null): string {
  const text = value ?? '';
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}
