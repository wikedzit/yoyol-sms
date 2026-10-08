import { and, desc, eq, like, or } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { auditEvents } from '../database/audit-events';
import { auditSearchPattern } from '../kernel/audit-export';

export type AuditEntry = {
  id: number;
  action: string;
  extensionKey: string | null;
  target: string | null;
  detail: string | null;
  createdAt: number;
};

export default class AuditService {
  constructor(private db: AppDatabase) {}

  async append(input: {
    action: string;
    schoolId?: number | null;
    userId?: number | null;
    extensionKey?: string | null;
    target?: string | null;
    detail?: string | null;
  }): Promise<void> {
    await this.db.insert(auditEvents).values({
      action: input.action,
      schoolId: input.schoolId ?? null,
      userId: input.userId ?? null,
      extensionKey: input.extensionKey ?? null,
      target: input.target ?? null,
      detail: input.detail ?? null,
      ip: null,
      createdAt: Date.now(),
    });
  }

  async listForSchool(schoolId: number, query = ''): Promise<AuditEntry[]> {
    const pattern = auditSearchPattern(query);
    const matchesQuery = pattern
      ? or(
        like(auditEvents.action, pattern),
        like(auditEvents.extensionKey, pattern),
        like(auditEvents.target, pattern),
      )
      : undefined;
    const rows = await this.db
      .select({
        id: auditEvents.id,
        action: auditEvents.action,
        extensionKey: auditEvents.extensionKey,
        target: auditEvents.target,
        detail: auditEvents.detail,
        createdAt: auditEvents.createdAt,
      })
      .from(auditEvents)
      .where(matchesQuery ? and(eq(auditEvents.schoolId, schoolId), matchesQuery) : eq(auditEvents.schoolId, schoolId))
      .orderBy(desc(auditEvents.createdAt))
      .limit(50);
    return rows;
  }
}
