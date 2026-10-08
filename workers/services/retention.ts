import { and, eq, inArray } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { notifications } from '../database/notifications';
import { notificationsDueForRemoval } from '../kernel/retention';
import { requireSchoolId } from '../utils/require-owner-user';
import type AuditService from './audit';

export default class RetentionService {
  constructor(
    private db: AppDatabase,
    private activeSchoolId: number | null,
    private actorUserId: number | null,
    private audit: AuditService,
  ) {}

  async purgeOldNotifications(now = Date.now()): Promise<number> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const rows = await this.db
      .select({ id: notifications.id, createdAt: notifications.createdAt })
      .from(notifications)
      .where(eq(notifications.schoolId, schoolId));
    const due = notificationsDueForRemoval(rows, now);
    if (due.length > 0) {
      await this.db.delete(notifications).where(and(
        eq(notifications.schoolId, schoolId),
        inArray(notifications.id, due),
      ));
    }
    await this.audit.append({
      action: 'retention.purge',
      schoolId,
      userId: this.actorUserId,
      extensionKey: 'kernel',
      target: 'notifications',
      detail: String(due.length),
    });
    return due.length;
  }
}
