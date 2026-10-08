import { and, asc, eq } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { revokedExtensionVersions, trustedPublishers } from '../database/publishers';
import { refusalToRevokePublisherKey, refusalToTrustPublisherKey } from '../kernel/package-signature';
import { revocationNotice, versionIsBlocked } from '../kernel/package-upload';

type PublisherDeps = {
  audit: (action: string, target: string) => Promise<void>;
};

export default class PublisherService {
  constructor(
    private db: AppDatabase,
    private deps: PublisherDeps,
  ) {}

  async list() {
    return this.db.select({
      id: trustedPublishers.id,
      publisher: trustedPublishers.publisher,
      keyId: trustedPublishers.keyId,
      revoked: trustedPublishers.revoked,
    }).from(trustedPublishers).orderBy(asc(trustedPublishers.publisher), asc(trustedPublishers.keyId));
  }

  async revokedVersions() {
    return this.db.select({
      extensionKey: revokedExtensionVersions.extensionKey,
      version: revokedExtensionVersions.version,
    }).from(revokedExtensionVersions).orderBy(asc(revokedExtensionVersions.extensionKey));
  }

  async trust(publisher: string, keyId: string, publicKey: string): Promise<{ error: string } | { ok: true }> {
    const existing = await this.list();
    const refused = refusalToTrustPublisherKey({ publisher, keyId, publicKey, existing });
    if (refused) return { error: refused };
    const now = Date.now();
    await this.db.insert(trustedPublishers).values({
      publisher: publisher.trim(),
      keyId: keyId.trim(),
      publicKey: publicKey.trim(),
      revoked: false,
      createdAt: now,
      updatedAt: now,
    });
    await this.deps.audit('publisher.key.add', `${publisher.trim()}:${keyId.trim()}`);
    return { ok: true };
  }

  async revokeKey(publisher: string, keyId: string): Promise<{ error: string } | { ok: true }> {
    const found = await this.db.select({
      id: trustedPublishers.id,
      revoked: trustedPublishers.revoked,
    }).from(trustedPublishers).where(and(
      eq(trustedPublishers.publisher, publisher),
      eq(trustedPublishers.keyId, keyId),
    )).get();
    if (!found) return { error: 'That publisher key was not found.' };
    const refused = refusalToRevokePublisherKey(found);
    if (refused) return { error: refused };
    await this.db.update(trustedPublishers).set({ revoked: true, updatedAt: Date.now() }).where(eq(trustedPublishers.id, found.id));
    await this.deps.audit('publisher.key.revoke', `${publisher}:${keyId}`);
    return { ok: true };
  }

  async revokeVersion(extensionKey: string, version: string): Promise<{ error: string } | { ok: true }> {
    if (!/^[a-z][a-z0-9-]{1,31}$/.test(extensionKey) || !/^\d+\.\d+\.\d+$/.test(version)) {
      return { error: 'Enter an extension key and a version like 1.0.0.' };
    }
    const existing = await this.db.select({ id: revokedExtensionVersions.id }).from(revokedExtensionVersions).where(and(
      eq(revokedExtensionVersions.extensionKey, extensionKey),
      eq(revokedExtensionVersions.version, version),
    )).get();
    if (existing) return { error: 'That version is already revoked.' };
    await this.db.insert(revokedExtensionVersions).values({
      extensionKey,
      version,
      createdAt: Date.now(),
    });
    await this.deps.audit('extension.version.revoke', `${extensionKey}:${version}`);
    return { ok: true };
  }

  async versionBlocked(extensionKey: string, version: string, publisher: string, keyId: string): Promise<string | null> {
    const versionRow = await this.db.select({ id: revokedExtensionVersions.id }).from(revokedExtensionVersions).where(and(
      eq(revokedExtensionVersions.extensionKey, extensionKey),
      eq(revokedExtensionVersions.version, version),
    )).get();
    const keyRow = await this.db.select({ revoked: trustedPublishers.revoked }).from(trustedPublishers).where(and(
      eq(trustedPublishers.publisher, publisher),
      eq(trustedPublishers.keyId, keyId),
    )).get();
    if (!versionIsBlocked({ versionRevoked: Boolean(versionRow), keyRevoked: keyRow?.revoked === true })) return null;
    return revocationNotice(extensionKey, version);
  }
}
