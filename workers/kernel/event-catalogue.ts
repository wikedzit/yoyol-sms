import { z } from 'zod';

const payloadVersion = 1;

export const coreHookNames = [
  'student.beforeCreate',
  'student.displayName',
  'student.profile.tabs',
  'dashboard.widgets',
  'navigation.items',
] as const;

const eventPayloads = {
  'students.student.enrolled': z.object({
    studentId: z.number().int(),
    formClassId: z.number().int(),
    academicYearId: z.number().int(),
  }),
  'students.student.updated': z.object({
    studentId: z.number().int(),
    changedFields: z.array(z.string()),
  }),
  'academics.term.started': z.object({
    termId: z.number().int(),
    academicYearId: z.number().int(),
  }),
  'core.user.signedIn': z.object({
    userId: z.number().int(),
  }),
  'assessment.grade.recorded': z.object({
    gradeId: z.number().int(),
    studentId: z.number().int(),
    subjectId: z.number().int(),
  }),
  'attendance.record.marked_absent': z.object({
    recordId: z.number().int(),
    studentId: z.number().int(),
    attendanceDate: z.string().min(1),
  }),
  'finance.payment.confirmed': z.object({
    paymentId: z.number().int(),
    amountMinor: z.number().int(),
    invoiceId: z.number().int().nullable(),
  }),
} as const;

export type CoreEventName = keyof typeof eventPayloads;

export const coreEventNames = Object.keys(eventPayloads) as CoreEventName[];

export function parseCoreEvent(name: string, payload: unknown): { name: CoreEventName; payloadVersion: number; payload: unknown } {
  const schema = eventPayloads[name as CoreEventName];
  if (!schema) {
    throw new Error(`Unknown event ${name}.`);
  }
  return { name: name as CoreEventName, payloadVersion, payload: schema.parse(payload) };
}

const outboxSql = 'INSERT INTO domain_events (school_id, event_name, payload_version, payload_json, status, attempts, available_at, last_error) VALUES (?, ?, ?, ?, \'pending\', 0, ?, NULL)';

export function outboxInsert(input: {
  schoolId: number;
  name: CoreEventName;
  payload: unknown;
  now: number;
}): { sql: string; params: unknown[] } {
  const event = parseCoreEvent(input.name, input.payload);
  return {
    sql: outboxSql,
    params: [input.schoolId, event.name, event.payloadVersion, JSON.stringify(event.payload), input.now],
  };
}

export function sqliteOutboxInsert(input: {
  schoolId: number;
  name: CoreEventName;
  payload: Record<string, unknown>;
  idField: string;
  now: number;
}): { sql: string; params: unknown[] } {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(input.idField)) {
    throw new Error('The outbox id field must be a name.');
  }
  const event = parseCoreEvent(input.name, { ...input.payload, [input.idField]: 1 });
  const payload = { ...(event.payload as Record<string, unknown>) };
  delete payload[input.idField];
  return {
    sql: `INSERT INTO domain_events (school_id, event_name, payload_version, payload_json, status, attempts, available_at, last_error) VALUES (?, ?, ?, json_set(?, '$.${input.idField}', last_insert_rowid()), 'pending', 0, ?, NULL)`,
    params: [input.schoolId, event.name, event.payloadVersion, JSON.stringify(payload), input.now],
  };
}

export function addedCapabilities(previous: readonly string[], next: readonly string[]): string[] {
  const alreadyGranted = new Set(previous);
  return next.filter((capability) => !alreadyGranted.has(capability));
}

export function retryDelayMs(attempt: number): number {
  return Math.min(30_000, 1_000 * 2 ** Math.max(0, attempt - 1));
}

export function deliveryAfterFailure(attempts: number): 'retry' | 'dead' {
  return attempts >= 5 ? 'dead' : 'retry';
}
