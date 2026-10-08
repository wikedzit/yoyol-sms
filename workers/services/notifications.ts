import { and, desc, eq, isNull } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { extensionSettings } from '../database/extension-registry';
import { notifications } from '../database/notifications';
import { findBundledManifest } from '../extensions/catalog';
import { extensionMaySend } from '../kernel/extension-context';

const inAppChannel = 'in-app';

export type InboxMessage = {
  id: number;
  title: string;
  body: string;
  extensionKey: string;
  createdAt: number;
  readAt: number | null;
};

export default class NotificationService {
  constructor(private db: AppDatabase) {}

  async sendFromExtension(input: {
    schoolId: number;
    extensionKey: string;
    userId: number;
    title: string;
    body: string;
  }): Promise<void> {
    const granted = await this.grantedCapabilities(input.schoolId, input.extensionKey);
    if (!extensionMaySend(granted)) {
      throw new Error('This extension does not have notifications:send.');
    }
    await this.deliver(input);
  }

  async notifyUser(input: {
    schoolId: number;
    extensionKey: string;
    userId: number;
    title: string;
    body: string;
  }): Promise<void> {
    await this.deliver(input);
  }

  async listForUser(schoolId: number, userId: number): Promise<InboxMessage[]> {
    return this.db
      .select({
        id: notifications.id,
        title: notifications.title,
        body: notifications.body,
        extensionKey: notifications.extensionKey,
        createdAt: notifications.createdAt,
        readAt: notifications.readAt,
      })
      .from(notifications)
      .where(and(eq(notifications.schoolId, schoolId), eq(notifications.userId, userId)))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async unreadCount(schoolId: number, userId: number): Promise<number> {
    const rows = await this.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(
        eq(notifications.schoolId, schoolId),
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
      ));
    return rows.length;
  }

  async markRead(schoolId: number, userId: number, notificationId: number): Promise<void> {
    await this.db
      .update(notifications)
      .set({ readAt: Date.now() })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.schoolId, schoolId),
        eq(notifications.userId, userId),
      ));
  }

  private async deliver(input: {
    schoolId: number;
    extensionKey: string;
    userId: number;
    title: string;
    body: string;
  }): Promise<void> {
    await this.db.insert(notifications).values({
      schoolId: input.schoolId,
      userId: input.userId,
      extensionKey: input.extensionKey,
      channel: inAppChannel,
      title: input.title.trim().slice(0, 120),
      body: input.body.trim().slice(0, 500),
      status: 'delivered',
      readAt: null,
      createdAt: Date.now(),
    });
  }

  private async grantedCapabilities(schoolId: number, extensionKey: string): Promise<string[]> {
    const stored = await this.db
      .select({ settingValue: extensionSettings.settingValue })
      .from(extensionSettings)
      .where(and(
        eq(extensionSettings.schoolId, schoolId),
        eq(extensionSettings.extensionKey, extensionKey),
        eq(extensionSettings.settingKey, 'granted_capabilities'),
      ))
      .get();
    if (stored) {
      return parseGranted(stored.settingValue);
    }
    const manifest = findBundledManifest(extensionKey);
    return manifest?.required ? manifest.capabilities : [];
  }
}

function parseGranted(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}
