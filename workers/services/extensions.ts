import { and, eq } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import {
  bundledExtensions,
  findBundledExtension,
  type BundledExtension,
} from '../extensions/catalog';
import { school } from '../database/school';
import { schoolExtensions } from '../database/school-extensions';
import { requireOwnerUserId } from 'workers/utils/require-owner-user';

export type InstalledExtension = BundledExtension & {
  status: 'enabled' | 'available';
};

export default class ExtensionService {
  constructor(
    private db: AppDatabase,
    private ownerUserId: number | null,
  ) {}

  async listForSchool(schoolId: number): Promise<InstalledExtension[]> {
    await this.requireOwnedSchool(schoolId);

    try {
      return await this.listInstalled(schoolId);
    } catch (error) {
      console.error('Unable to list installed extensions:', error);
      return bundledExtensions.map((extension) => ({
        ...extension,
        status: 'available' as const,
      }));
    }
  }

  private async listInstalled(schoolId: number): Promise<InstalledExtension[]> {
    const installed = await this.db
      .select()
      .from(schoolExtensions)
      .where(eq(schoolExtensions.schoolId, schoolId));
    const enabledKeys = new Set(
      installed
        .filter((row) => row.status === 'enabled')
        .map((row) => row.extensionKey),
    );

    return bundledExtensions.map((extension) => ({
      ...extension,
      status: enabledKeys.has(extension.key) ? 'enabled' : 'available',
    }));
  }

  async install(schoolId: number, extensionKey: string): Promise<void> {
    await this.requireOwnedSchool(schoolId);
    const extension = findBundledExtension(extensionKey);
    if (!extension) {
      throw new Error('That extension is not available to install.');
    }

    const existing = await this.db
      .select()
      .from(schoolExtensions)
      .where(
        and(
          eq(schoolExtensions.schoolId, schoolId),
          eq(schoolExtensions.extensionKey, extension.key),
        ),
      )
      .get();

    if (existing) {
      await this.db
        .update(schoolExtensions)
        .set({ status: 'enabled' })
        .where(eq(schoolExtensions.id, existing.id));
      return;
    }

    await this.db.insert(schoolExtensions).values({
      schoolId,
      extensionKey: extension.key,
      status: 'enabled',
      installedAt: Date.now(),
    });
  }

  async isEnabled(schoolId: number, extensionKey: string): Promise<boolean> {
    try {
      return await this.readEnabled(schoolId, extensionKey);
    } catch (error) {
      console.error('Unable to read installed extensions:', error);
      return false;
    }
  }

  private async readEnabled(schoolId: number, extensionKey: string): Promise<boolean> {
    const row = await this.db
      .select({ status: schoolExtensions.status })
      .from(schoolExtensions)
      .where(
        and(
          eq(schoolExtensions.schoolId, schoolId),
          eq(schoolExtensions.extensionKey, extensionKey),
        ),
      )
      .get();

    return row?.status === 'enabled';
  }

  private async requireOwnedSchool(schoolId: number): Promise<void> {
    const ownerUserId = requireOwnerUserId(this.ownerUserId);
    const ownedSchool = await this.db
      .select({ id: school.id })
      .from(school)
      .where(and(eq(school.id, schoolId), eq(school.ownerUserId, ownerUserId)))
      .get();

    if (!ownedSchool) {
      throw new Error('Selected school was not found.');
    }
  }
}
