export type ReportRole = 'admin' | 'teacher' | 'student' | 'parent' | 'other';

export type ReportWidget = {
  name: string;
  roles?: readonly string[];
  lines: readonly string[];
};

export type ReportsPage = {
  canManage: boolean;
  widgets: ReportWidget[];
  previewLines: string[];
  previewReady: boolean;
};

export type ImportKind = 'students' | 'staff' | 'fees';

export type ImportPreview = {
  ready: boolean;
  lines: string[];
  rows: Record<string, string>[];
};

const studentColumns = ['firstName', 'lastName', 'admissionNumber', 'gender'];
const staffColumns = ['firstName', 'lastName', 'email', 'staffType'];
const feeColumns = ['className', 'feeCode', 'amount'];
const staffTypes = ['teaching', 'finance', 'administration', 'support'];

export function roleDashboardLine(input: {
  role: ReportRole;
  studentCount: number;
  staffCount: number;
  assignments: readonly string[];
  names: readonly string[];
}): string {
  if (input.role === 'admin') {
    return `Admin: ${input.studentCount} students, ${input.staffCount} staff.`;
  }
  if (input.role === 'teacher') {
    return input.assignments.length === 0
      ? 'Teacher: no classes this year.'
      : `Teacher: ${input.assignments.join('; ')}.`;
  }
  if (input.role === 'student') {
    return input.names.length === 0
      ? 'Student: no profile is linked.'
      : `Student: ${input.names.join(', ')}.`;
  }
  if (input.role === 'parent') {
    return input.names.length === 0
      ? 'Parent: no students are linked.'
      : `Parent: ${input.names.join(', ')}.`;
  }
  return 'Reports';
}

export function dashboardForRole(role: ReportRole, widgets: readonly ReportWidget[]): ReportWidget[] {
  return widgets.filter((widget) => !widget.roles || widget.roles.includes(role));
}

export function linesFromWidget(body: unknown, catalog: Record<string, string>): string[] {
  const lines: string[] = [];
  walk(body, catalog, lines);
  return lines.filter((line) => line.length > 0);
}

export function previewImport(input: {
  kind: ImportKind;
  text: string;
  admissionNumbers: readonly string[];
  staffEmails: readonly string[];
  classes: readonly string[];
  feeCodes: readonly string[];
  feeKeys: readonly string[];
}): ImportPreview {
  const table = parseCsv(input.text);
  if (table.length === 0) {
    return { ready: false, lines: ['Add a header and at least one row.'], rows: [] };
  }
  const expected = columnsFor(input.kind);
  const header = table[0].map((cell) => cell.trim());
  if (header.join(',') !== expected.join(',')) {
    return {
      ready: false,
      lines: [`Use the columns ${expected.join(', ')}.`],
      rows: [],
    };
  }
  const seen = new Set<string>();
  const lines: string[] = [];
  const rows: Record<string, string>[] = [];
  table.slice(1).forEach((cells, index) => {
    const row = Object.fromEntries(expected.map((column, columnIndex) => [column, (cells[columnIndex] ?? '').trim()]));
    const problem = problemFor(input, row, seen);
    if (problem) {
      lines.push(`Row ${index + 2}: ${problem}`);
      return;
    }
    rows.push(row);
  });
  if (lines.length > 0) {
    return { ready: false, lines, rows: [] };
  }
  if (rows.length === 0) {
    return { ready: false, lines: ['Add a header and at least one row.'], rows: [] };
  }
  const readyLine = rows.length === 1 ? '1 row is ready.' : `${rows.length} rows are ready.`;
  return { ready: true, lines: [readyLine], rows };
}

export function toCsv(header: readonly string[], rows: readonly Record<string, string>[]): string {
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push(header.map((column) => csvCell(row[column] ?? '')).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export function majorAmount(amountMinor: number, currency: string): string {
  const digits = currency === 'UGX' ? 0 : 2;
  if (digits === 0) return String(amountMinor);
  const whole = Math.trunc(amountMinor / 100);
  const fraction = Math.abs(amountMinor % 100);
  return fraction === 0 ? String(whole) : `${whole}.${String(fraction).padStart(2, '0')}`;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index] ?? '';
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => value.trim().length > 0));
}

function columnsFor(kind: ImportKind): readonly string[] {
  if (kind === 'staff') return staffColumns;
  if (kind === 'fees') return feeColumns;
  return studentColumns;
}

function problemFor(
  input: {
    kind: ImportKind;
    admissionNumbers: readonly string[];
    staffEmails: readonly string[];
    classes: readonly string[];
    feeCodes: readonly string[];
    feeKeys: readonly string[];
  },
  row: Record<string, string>,
  seen: Set<string>,
): string | null {
  if (input.kind === 'students') return studentProblem(row, input.admissionNumbers, seen);
  if (input.kind === 'staff') return staffProblem(row, input.staffEmails, seen);
  return feeProblem(row, input, seen);
}

function studentProblem(row: Record<string, string>, known: readonly string[], seen: Set<string>): string | null {
  if (!row.firstName) return 'Enter the first name.';
  if (!row.lastName) return 'Enter the last name.';
  if (!row.admissionNumber) return 'Enter the admission number.';
  if (row.gender && row.gender !== 'Male' && row.gender !== 'Female') return 'Choose Male or Female.';
  const key = row.admissionNumber.toLowerCase();
  if (seen.has(key) || known.some((number) => number.toLowerCase() === key)) {
    return 'This admission number is already in use.';
  }
  seen.add(key);
  return null;
}

function staffProblem(row: Record<string, string>, known: readonly string[], seen: Set<string>): string | null {
  if (!row.firstName) return 'Enter the first name.';
  if (!row.lastName) return 'Enter the last name.';
  if (!row.email) return 'Enter the email address.';
  if (!staffTypes.includes(row.staffType)) {
    return 'Choose a staff type: teaching, finance, administration, or support.';
  }
  const key = row.email.toLowerCase();
  if (seen.has(key) || known.some((email) => email.toLowerCase() === key)) {
    return 'This email address is already in use.';
  }
  seen.add(key);
  return null;
}

function feeProblem(
  row: Record<string, string>,
  input: { classes: readonly string[]; feeCodes: readonly string[]; feeKeys: readonly string[] },
  seen: Set<string>,
): string | null {
  if (!input.classes.includes(row.className)) return 'Choose a class that exists.';
  if (!input.feeCodes.includes(row.feeCode)) return 'Choose a fee item that exists.';
  if (!/^\d+(\.\d{1,2})?$/.test(row.amount) || Number(row.amount) <= 0) return 'Enter an amount.';
  const key = `${row.className}|${row.feeCode}`;
  if (seen.has(key) || input.feeKeys.includes(key)) return 'This fee is already set for that class.';
  seen.add(key);
  return null;
}

function walk(value: unknown, catalog: Record<string, string>, lines: string[]) {
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, catalog, lines));
    return;
  }
  if (!value || typeof value !== 'object') return;
  const node = value as Record<string, unknown>;
  if (node.type === 'text') lines.push(plainText(node.value, catalog));
  if (node.body) walk(node.body, catalog, lines);
}

function plainText(value: unknown, catalog: Record<string, string>): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 't' in value && typeof value.t === 'string') {
    return catalog[value.t] ?? value.t;
  }
  return '';
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}
