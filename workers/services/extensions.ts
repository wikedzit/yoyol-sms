import type { LifecycleContext } from '../kernel/sdk';
import { and, eq } from 'drizzle-orm';
import type { DatabaseAdapter } from '../database/adapter';
import { extensionMigrations, extensionSettings, extensionVersions, extensions, eventSubscriptions, hookRegistrations } from '../database/extension-registry';
import { extensionExports } from '../database/domain-events';
import { permissions } from '../database/permissions';
import { school } from '../database/school';
import { schoolExtensions } from '../database/school-extensions';
import {
  bundledExtensions,
  findBundledExtension,
  findBundledManifest,
  type BundledExtension,
} from '../extensions/catalog';
import { bundledExtensionHost } from '../kernel/bundled-host';
import type { ExtensionEntrypoint } from '../kernel/sdk';
import { bundledManifests } from '../kernel/bundled-manifests';
import { migrationsFor } from '../kernel/bundled-migrations';
import { runHook } from '../kernel/hook-bus';
import { compileModuleMigration, extensionsInApplyOrder, pendingMigrations } from '../kernel/schema-compiler';
import {
  enableStatements,
  reversibleChange,
  undoSchemaStatement,
  upgradeStatements,
  type SqlStatement,
} from '../kernel/lifecycle-batch';
import { localesFor } from '../kernel/bundled-locales';
import { addedCapabilities } from '../kernel/event-catalogue';
import { collectSlotContributions } from '../kernel/slots';
import { parseViewDocument, viewDocumentError, type ViewDocument } from '../kernel/view-document';
import { isOwnedModuleTable, moduleTablePrefix } from '../kernel/module-tables';
import { createExtensionContext, type ExtensionContext } from '../kernel/extension-context';
import { createExtensionLog } from '../kernel/log';
import { coreVersion, reasonToRefuseDisable, reasonToRefuseEnable } from '../kernel/manifest';
import { requireOwnerUserId, requireSchoolId } from 'workers/utils/require-owner-user';

export type InstalledExtension = BundledExtension & {
  status: 'enabled' | 'disabled' | 'available' | 'removed';
  grantedCapabilities: string[];
  installedVersion: string | null;
  updateAvailable: boolean;
};

const requiredMessage = 'This extension comes with the system and cannot be turned off.';

type ExtensionReaders = {
  listStudents: (schoolId: number, extensionKey: string) => Promise<unknown>;
  listStudentRecords: (schoolId: number, extensionKey: string) => Promise<string[]>;
  listStudentEnrolments: (schoolId: number, extensionKey: string) => Promise<string[]>;
  listGuardianLinks: (schoolId: number, extensionKey: string) => Promise<string[]>;
  listStudentYearSubjects: (schoolId: number, extensionKey: string) => Promise<string[]>;
  listAcademics: (schoolId: number, extensionKey: string) => Promise<string[]>;
  listCalendar: (schoolId: number, extensionKey: string) => Promise<string[]>;
  listSubjects: (schoolId: number, extensionKey: string) => Promise<string[]>;
  listClassSubjects: (schoolId: number, extensionKey: string) => Promise<string[]>;
  listCombinations: (schoolId: number, extensionKey: string) => Promise<string[]>;
  listUpcomingEvents: (schoolId: number, extensionKey: string) => Promise<string[]>;
  listReleasedResults: (schoolId: number, extensionKey: string) => Promise<string[]>;
  attendance: () => {
    canWrite: () => Promise<boolean>;
    canManage: () => Promise<boolean>;
    classes: () => Promise<{ id: number; name: string }[]>;
    roll: (classId: number, date: string) => Promise<{
      error?: string;
      className: string;
      date: string;
      students: { id: number; name: string; status: string; comment: string }[];
    }>;
    summary: () => Promise<string[]>;
    today: () => Promise<string>;
    settings: () => Promise<{ editableDays: string; absenceAlerts: string }>;
    mark: (fields: Record<string, string>) => Promise<{ error: string } | { ok: true }>;
    profileLines: (studentId: number | null) => Promise<string[]>;
    dashboardLines: () => Promise<string[]>;
  };
  finance: () => NonNullable<LifecycleContext['finance']>;
  timetable: () => NonNullable<LifecycleContext['timetable']>;
  lessonPlans: () => NonNullable<LifecycleContext['lessonPlans']>;
  discipline: () => NonNullable<LifecycleContext['discipline']>;
  clubs: () => NonNullable<LifecycleContext['clubs']>;
  leadership: () => NonNullable<LifecycleContext['leadership']>;
  reports: () => NonNullable<LifecycleContext['reports']>;
  channels: () => NonNullable<LifecycleContext['channels']>;
  send: (input: { schoolId: number; extensionKey: string; userId: number; title: string; body: string }) => Promise<void>;
};

const channelPlugins = new Set(['sms', 'email', 'absence-alerts', 'fee-reminders']);

export default class ExtensionService {
  constructor(
    private adapter: DatabaseAdapter,
    private ownerUserId: number | null,
    private activeSchoolId: number | null = null,
    private readers: ExtensionReaders | null = null,
    private requestId = 'none',
  ) {}

  private get db() {
    return this.adapter.db;
  }

  async listForSchool(schoolId: number): Promise<InstalledExtension[]> {
    await this.requireOwnedSchool(schoolId);
    await this.applyEnabledMigrations(schoolId);

    try {
      return await this.listInstalled(schoolId);
    } catch (error) {
      console.error('Unable to list installed extensions:', error);
      return bundledExtensions.map((extension) => ({
        ...extension,
        status: extension.required ? 'enabled' as const : 'available' as const,
        grantedCapabilities: [],
        installedVersion: null,
        updateAvailable: false,
      }));
    }
  }

  async install(schoolId: number, extensionKey: string): Promise<void> {
    await this.enable(schoolId, extensionKey);
  }

  async enable(schoolId: number, extensionKey: string): Promise<void> {
    await this.requireOwnedSchool(schoolId);
    const extension = findBundledExtension(extensionKey);
    const manifest = findBundledManifest(extensionKey);
    if (!extension || !manifest) {
      throw new Error('That extension is not available to install.');
    }
    const enabled = await this.enabledExtensions(schoolId);
    const refusal = reasonToRefuseEnable(manifest, bundledManifests, enabled, coreVersion);
    if (refusal) {
      throw new Error(refusal);
    }

    const now = Date.now();
    const pending = await this.pendingSchemaChange(schoolId, manifest.key);
    const knownPermissions = new Set((await this.db.select({ key: permissions.key }).from(permissions)).map((row) => row.key));
    const previousHooks = await this.db
      .select({ name: hookRegistrations.hookName, priority: hookRegistrations.priority })
      .from(hookRegistrations)
      .where(and(eq(hookRegistrations.schoolId, schoolId), eq(hookRegistrations.extensionKey, manifest.key)));
    const previousEvents = await this.db
      .select({ eventName: eventSubscriptions.eventName })
      .from(eventSubscriptions)
      .where(and(eq(eventSubscriptions.schoolId, schoolId), eq(eventSubscriptions.extensionKey, manifest.key)));
    const grant = await this.db
      .select({ settingValue: extensionSettings.settingValue })
      .from(extensionSettings)
      .where(and(
        eq(extensionSettings.schoolId, schoolId),
        eq(extensionSettings.extensionKey, manifest.key),
        eq(extensionSettings.settingKey, 'granted_capabilities'),
      ))
      .get();
    const storedSettings = await this.db
      .select({ settingKey: extensionSettings.settingKey })
      .from(extensionSettings)
      .where(and(eq(extensionSettings.schoolId, schoolId), eq(extensionSettings.extensionKey, manifest.key)));
    const storedSettingKeys = new Set(storedSettings.map((row) => row.settingKey));
    const existing = await this.findRow(schoolId, extension.key);
    const extensionRow = await this.db
      .select({ key: extensions.key })
      .from(extensions)
      .where(eq(extensions.key, manifest.key))
      .get();
    const versionRow = await this.db
      .select({ version: extensionVersions.version })
      .from(extensionVersions)
      .where(and(eq(extensionVersions.extensionKey, manifest.key), eq(extensionVersions.version, manifest.version)))
      .get();

    await this.applyThenFinish(enableStatements({
      schoolId,
      userId: this.ownerUserId,
      now,
      key: manifest.key,
      type: manifest.type,
      publisher: manifest.publisher,
      required: extension.required,
      version: manifest.version,
      manifestJson: JSON.stringify(manifest),
      extensionRowExists: extensionRow !== undefined,
      versionRowExists: versionRow !== undefined,
      schema: pending.schema,
      migrations: pending.migrations,
      permissions: (manifest.permissions ?? [])
        .filter((permission) => !knownPermissions.has(permission.key))
        .map((permission) => ({ key: permission.key, label: permission.label.en })),
      hooks: (manifest.hooks?.listens ?? []).map((listen) => ({
        name: listen.name,
        priority: listen.priority ?? 100,
      })),
      previousHooks,
      events: manifest.events?.subscribes ?? [],
      previousEvents: previousEvents.map((row) => row.eventName),
      capabilities: manifest.capabilities,
      previousGrant: grant?.settingValue ?? null,
      settings: manifest.settings
        .filter((setting) => setting.default !== undefined && !storedSettingKeys.has(setting.key))
        .map((setting) => ({ key: setting.key, value: setting.default ?? '' })),
      previousStatus: existing?.status ?? null,
    }), async () => {
      const entrypoint = await this.openEntrypoint(schoolId, manifest.key);
      if (entrypoint) {
        await entrypoint.onEnable(await this.contextFor(schoolId, manifest.key));
      }
    });
  }

  async disable(schoolId: number, extensionKey: string): Promise<void> {
    await this.requireOwnedSchool(schoolId);
    const extension = findBundledExtension(extensionKey);
    if (!extension) {
      throw new Error('That extension is not available to install.');
    }
    if (extension.required) {
      throw new Error(requiredMessage);
    }

    const existing = await this.findRow(schoolId, extension.key);
    if (!existing) {
      throw new Error('That extension is not turned on.');
    }

    const enabled = await this.enabledExtensions(schoolId);
    const refusal = reasonToRefuseDisable(
      extension.key,
      bundledManifests,
      enabled.filter((item) => item.enabled).map((item) => item.key),
    );
    if (refusal) {
      throw new Error(refusal);
    }

    const entrypoint = await this.openEntrypoint(schoolId, extension.key);
    if (entrypoint) {
      await entrypoint.onDisable(await this.contextFor(schoolId, extension.key));
    }

    await this.db
      .update(schoolExtensions)
      .set({ status: 'disabled' })
      .where(eq(schoolExtensions.id, existing.id));
    await this.stopRuntime(schoolId, extension.key);
  }

  async upgrade(schoolId: number, extensionKey: string, consent: boolean): Promise<void> {
    await this.requireOwnedSchool(schoolId);
    const extension = findBundledExtension(extensionKey);
    const manifest = findBundledManifest(extensionKey);
    if (!extension || !manifest) {
      throw new Error('That extension is not available to install.');
    }

    const versions = await this.db
      .select()
      .from(extensionVersions)
      .where(eq(extensionVersions.extensionKey, extensionKey));
    const latest = versions.at(-1);
    if (latest?.version === manifest.version) {
      throw new Error('This extension is already on that version.');
    }

    const previousCapabilities = readCapabilities(latest?.manifestJson);
    const added = addedCapabilities(previousCapabilities, manifest.capabilities);
    if (added.length > 0 && !consent) {
      throw new Error(`Review the new access this extension is asking for: ${added.join(', ')}.`);
    }

    const now = Date.now();
    const pending = await this.pendingSchemaChange(schoolId, manifest.key);
    const extensionRow = await this.db
      .select({ key: extensions.key })
      .from(extensions)
      .where(eq(extensions.key, manifest.key))
      .get();
    const versionRow = await this.db
      .select({ version: extensionVersions.version })
      .from(extensionVersions)
      .where(and(eq(extensionVersions.extensionKey, manifest.key), eq(extensionVersions.version, manifest.version)))
      .get();
    const fromVersion = latest?.version ?? '0.0.0';

    await this.applyThenFinish(upgradeStatements({
      schoolId,
      userId: this.ownerUserId,
      now,
      key: manifest.key,
      type: manifest.type,
      publisher: manifest.publisher,
      required: extension.required,
      version: manifest.version,
      manifestJson: JSON.stringify(manifest),
      fromVersion,
      extensionRowExists: extensionRow !== undefined,
      versionRowExists: versionRow !== undefined,
      schema: pending.schema,
      migrations: pending.migrations,
    }), async () => {
      const entrypoint = await this.openEntrypoint(schoolId, manifest.key);
      if (entrypoint) {
        await entrypoint.onUpgrade(await this.contextFor(schoolId, manifest.key), fromVersion);
      }
    });
  }

  async remove(schoolId: number, extensionKey: string): Promise<void> {
    await this.requireOwnedSchool(schoolId);
    const extension = findBundledExtension(extensionKey);
    if (!extension) {
      throw new Error('That extension is not available to install.');
    }
    if (extension.required) {
      throw new Error(requiredMessage);
    }

    const existing = await this.findRow(schoolId, extension.key);
    if (!existing || existing.status === 'removed') {
      throw new Error('That extension is not turned on.');
    }

    await this.db
      .update(schoolExtensions)
      .set({ status: 'removed' })
      .where(eq(schoolExtensions.id, existing.id));
    await this.stopRuntime(schoolId, extension.key);
  }

  async purge(schoolId: number, extensionKey: string): Promise<void> {
    await this.requireOwnedSchool(schoolId);
    const extension = findBundledExtension(extensionKey);
    if (!extension) {
      throw new Error('That extension is not available to install.');
    }
    if (extension.required) {
      throw new Error(requiredMessage);
    }

    const body = await this.exportModuleRows(schoolId, extension.key);
    await this.db.insert(extensionExports).values({
      schoolId,
      extensionKey: extension.key,
      body,
      exportedAt: Date.now(),
    });
    await this.db
      .delete(extensionSettings)
      .where(and(eq(extensionSettings.schoolId, schoolId), eq(extensionSettings.extensionKey, extension.key)));
    await this.db
      .delete(extensionMigrations)
      .where(and(eq(extensionMigrations.schoolId, schoolId), eq(extensionMigrations.extensionKey, extension.key)));
    await this.stopRuntime(schoolId, extension.key);
    await this.db
      .delete(schoolExtensions)
      .where(and(eq(schoolExtensions.schoolId, schoolId), eq(schoolExtensions.extensionKey, extension.key)));
  }

  async isEnabled(schoolId: number, extensionKey: string): Promise<boolean> {
    const extension = findBundledExtension(extensionKey);
    if (extension?.required) {
      return true;
    }

    try {
      return await this.readEnabled(schoolId, extensionKey);
    } catch (error) {
      console.error('Unable to read installed extensions:', error);
      return false;
    }
  }

  private async listInstalled(schoolId: number): Promise<InstalledExtension[]> {
    const installed = await this.db
      .select()
      .from(schoolExtensions)
      .where(eq(schoolExtensions.schoolId, schoolId));
    const statusByKey = new Map(installed.map((row) => [row.extensionKey, row.status]));
    const grants = await this.db
      .select()
      .from(extensionSettings)
      .where(and(eq(extensionSettings.schoolId, schoolId), eq(extensionSettings.settingKey, 'granted_capabilities')));
    const grantByKey = new Map(grants.map((row) => [row.extensionKey, parseGranted(row.settingValue)]));
    const versions = await this.db.select().from(extensionVersions);
    const installedVersionByKey = new Map<string, string>();
    for (const version of versions) {
      installedVersionByKey.set(version.extensionKey, version.version);
    }

    return bundledExtensions.map((extension) => {
      const manifest = findBundledManifest(extension.key);
      const status = statusFor(extension, statusByKey.get(extension.key));
      const recordedVersion = installedVersionByKey.get(extension.key) ?? null;
      return {
        ...extension,
        status,
        grantedCapabilities: grantByKey.get(extension.key)
          ?? (extension.required ? manifest?.capabilities ?? [] : []),
        installedVersion: recordedVersion ?? (status === 'enabled' ? extension.version : null),
        updateAvailable: recordedVersion !== null && recordedVersion !== extension.version,
      };
    });
  }

  private async applyThenFinish(
    statements: Parameters<typeof reversibleChange>[0],
    finish: () => Promise<void>,
  ): Promise<void> {
    const change = reversibleChange(statements);
    await this.adapter.commit({
      statements: change.apply,
      undo: change.undo,
      after: finish,
    });
  }

  private async pendingSchemaChange(schoolId: number, extensionKey: string): Promise<{
    schema: { sql: string; undo: SqlStatement | null }[];
    migrations: { extensionKey: string; id: string }[];
  }> {
    const schema: { sql: string; undo: SqlStatement | null }[] = [];
    const migrations: { extensionKey: string; id: string }[] = [];
    const closure = dependencyKeys(extensionKey, bundledManifests);
    for (const key of extensionsInApplyOrder(closure, bundledManifests)) {
      const recorded = await this.db
        .select({ version: extensionMigrations.version })
        .from(extensionMigrations)
        .where(and(eq(extensionMigrations.schoolId, schoolId), eq(extensionMigrations.extensionKey, key)));
      const pending = pendingMigrations(recorded.map((row) => row.version), migrationsFor(key));
      for (const migration of pending) {
        for (const sql of compileModuleMigration(key, migration, 'sqlite')) {
          const undo = undoSchemaStatement(sql);
          const name = undo ? undo.sql.split(' ').at(-1) ?? null : null;
          const exists = name ? await this.adapter.schemaObjectExists(name) : false;
          schema.push({ sql, undo: exists ? null : undo });
        }
        migrations.push({ extensionKey: key, id: migration.id });
      }
    }
    return { schema, migrations };
  }

  async contextFor(schoolId: number, extensionKey: string): Promise<ExtensionContext> {
    const granted = await this.readGranted(schoolId, extensionKey);
    const readers = this.readers;
    return createExtensionContext({
      schoolId,
      granted,
      settings: {
        get: (key) => this.settingValue(schoolId, extensionKey, key),
      },
      students: this.readers
        ? {
          list: () => this.readers?.listStudents(schoolId, extensionKey) ?? Promise.resolve([]),
          records: () => this.readers?.listStudentRecords(schoolId, extensionKey) ?? Promise.resolve([]),
          enrolments: () => this.readers?.listStudentEnrolments(schoolId, extensionKey) ?? Promise.resolve([]),
          guardians: () => this.readers?.listGuardianLinks(schoolId, extensionKey) ?? Promise.resolve([]),
          yearSubjects: () => this.readers?.listStudentYearSubjects(schoolId, extensionKey) ?? Promise.resolve([]),
          results: () => this.readers?.listReleasedResults(schoolId, extensionKey) ?? Promise.resolve([]),
        }
        : undefined,
      academics: this.readers
        ? {
          list: () => this.readers?.listAcademics(schoolId, extensionKey) ?? Promise.resolve([]),
          calendar: () => this.readers?.listCalendar(schoolId, extensionKey) ?? Promise.resolve([]),
          subjects: () => this.readers?.listSubjects(schoolId, extensionKey) ?? Promise.resolve([]),
          classSubjects: () => this.readers?.listClassSubjects(schoolId, extensionKey) ?? Promise.resolve([]),
          combinations: () => this.readers?.listCombinations(schoolId, extensionKey) ?? Promise.resolve([]),
          events: () => this.readers?.listUpcomingEvents(schoolId, extensionKey) ?? Promise.resolve([]),
        }
        : undefined,
      attendance: extensionKey === 'attendance' && this.readers ? this.readers.attendance() : undefined,
      finance: extensionKey === 'finance' && this.readers ? this.readers.finance() : undefined,
      timetable: extensionKey === 'timetable' && this.readers ? this.readers.timetable() : undefined,
      lessonPlans: extensionKey === 'lesson-plans' && this.readers ? this.readers.lessonPlans() : undefined,
      discipline: extensionKey === 'discipline' && this.readers ? this.readers.discipline() : undefined,
      clubs: extensionKey === 'clubs' && this.readers ? this.readers.clubs() : undefined,
      leadership: extensionKey === 'leadership' && this.readers ? this.readers.leadership() : undefined,
      reports: extensionKey === 'reports' && this.readers ? this.readers.reports() : undefined,
      channels: channelPlugins.has(extensionKey) && readers
        ? {
          receipts: (channel) => readers.channels().receipts(channel),
          remind: () => readers.channels().remind(),
          notifyAbsence: (studentId, date) => readers.channels().notifyAbsence(studentId, date),
        }
        : undefined,
      notifications: this.readers
        ? {
          send: (message) => this.readers?.send({
            schoolId,
            extensionKey,
            userId: message.userId,
            title: message.title,
            body: message.body,
          }) ?? Promise.resolve(),
        }
        : undefined,
      log: createExtensionLog(extensionKey, { requestId: this.requestId }),
    });
  }

  private async readGranted(schoolId: number, extensionKey: string): Promise<string[]> {
    const manifest = findBundledManifest(extensionKey);
    if (manifest?.required) {
      return manifest.capabilities;
    }
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
    return [];
  }

  private async settingValue(schoolId: number, extensionKey: string, key: string): Promise<string | null> {
    const stored = await this.db
      .select({ settingValue: extensionSettings.settingValue })
      .from(extensionSettings)
      .where(and(
        eq(extensionSettings.schoolId, schoolId),
        eq(extensionSettings.extensionKey, extensionKey),
        eq(extensionSettings.settingKey, key),
      ))
      .get();
    if (stored) {
      return stored.settingValue;
    }
    const declared = findBundledManifest(extensionKey)?.settings.find((setting) => setting.key === key);
    return declared?.default ?? null;
  }

  private findRow(schoolId: number, extensionKey: string) {
    return this.db
      .select()
      .from(schoolExtensions)
      .where(
        and(
          eq(schoolExtensions.schoolId, schoolId),
          eq(schoolExtensions.extensionKey, extensionKey),
        ),
      )
      .get();
  }

  private async openEntrypoint(schoolId: number, key: string): Promise<ExtensionEntrypoint | null> {
    try {
      const grants = await this.readGranted(schoolId, key);
      return await bundledExtensionHost.getEntrypoint({ key, version: 'bundled' }, grants);
    } catch (error) {
      if (error instanceof Error && error.message === `${key} is not bundled.`) {
        return null;
      }
      throw error;
    }
  }

  async runSchoolHook(schoolId: number, hookName: string, payload: unknown, mode: 'filter' | 'blocking' = 'filter') {
    const enabled = await this.enabledExtensions(schoolId);
    const enabledKeys = new Set(enabled.filter((item) => item.enabled).map((item) => item.key));
    const rows = await this.db
      .select()
      .from(hookRegistrations)
      .where(and(eq(hookRegistrations.schoolId, schoolId), eq(hookRegistrations.hookName, hookName)));

    const handlers = [];
    for (const row of rows) {
      if (!enabledKeys.has(row.extensionKey)) {
        continue;
      }
      const entrypoint = await this.openEntrypoint(schoolId, row.extensionKey);
      if (!entrypoint) {
        continue;
      }
      const extensionContext = await this.contextFor(schoolId, row.extensionKey);
      handlers.push({
        extensionKey: row.extensionKey,
        priority: row.priority,
        run: (value: unknown) => entrypoint.runHook(hookName, value, extensionContext),
      });
    }

    return runHook({
      hookName,
      handlers,
      payload,
      mode,
      log: (message) => createExtensionLog('kernel', { requestId: this.requestId }).error(message),
    });
  }

  async runSchoolSlot(schoolId: number, slotName: string, payload: unknown): Promise<SchoolSlot[]> {
    const enabled = await this.enabledExtensions(schoolId);
    const enabledKeys = new Set(enabled.filter((item) => item.enabled).map((item) => item.key));
    const rows = await this.db
      .select()
      .from(hookRegistrations)
      .where(and(eq(hookRegistrations.schoolId, schoolId), eq(hookRegistrations.hookName, slotName)));

    const handlers = [];
    for (const row of rows) {
      if (!enabledKeys.has(row.extensionKey)) {
        continue;
      }
      const entrypoint = await this.openEntrypoint(schoolId, row.extensionKey);
      if (!entrypoint) {
        continue;
      }
      const extensionContext = await this.contextFor(schoolId, row.extensionKey);
      handlers.push({
        extensionKey: row.extensionKey,
        priority: row.priority,
        run: () => entrypoint.runHook(slotName, payload, extensionContext),
      });
    }

    const collected = await collectSlotContributions({
      slotName,
      handlers,
      log: (message) => createExtensionLog('kernel', { requestId: this.requestId }).error(message),
    });
    const slots: SchoolSlot[] = [];
    for (const item of collected) {
      const catalog = localesFor(item.extensionKey);
      if (item.href && item.label) {
        slots.push({ kind: 'link', extensionKey: item.extensionKey, label: item.label, href: item.href, catalog });
        continue;
      }
      if (item.document && !viewDocumentError(item.document)) {
        slots.push({
          kind: 'document',
          extensionKey: item.extensionKey,
          label: item.label,
          document: parseViewDocument(item.document),
          catalog,
        });
      }
    }
    return slots;
  }

  private async stopRuntime(schoolId: number, extensionKey: string): Promise<void> {
    await this.db
      .delete(hookRegistrations)
      .where(and(eq(hookRegistrations.schoolId, schoolId), eq(hookRegistrations.extensionKey, extensionKey)));
    await this.db
      .delete(eventSubscriptions)
      .where(and(eq(eventSubscriptions.schoolId, schoolId), eq(eventSubscriptions.extensionKey, extensionKey)));
  }

  private async exportModuleRows(schoolId: number, extensionKey: string): Promise<string> {
    const names = await this.adapter.listTables(moduleTablePrefix(extensionKey));
    const lines: string[] = [];

    for (const name of names) {
      if (!isOwnedModuleTable(extensionKey, name)) {
        continue;
      }
      const rows = await this.adapter.query<Record<string, unknown>>(
        `SELECT * FROM ${name} WHERE school_id = ?`,
        [schoolId],
      );
      for (const row of rows) {
        lines.push(JSON.stringify(row));
      }
      await this.adapter.run(`DELETE FROM ${name} WHERE school_id = ?`, [schoolId]);
    }

    return lines.join('\n');
  }

  private async applyEnabledMigrations(schoolId: number): Promise<void> {
    const enabled = await this.enabledExtensions(schoolId);
    const keys = enabled.filter((item) => item.enabled).map((item) => item.key);
    for (const key of extensionsInApplyOrder(keys, bundledManifests)) {
      await this.applyOneExtension(schoolId, key);
    }
  }

  private async applyOneExtension(schoolId: number, extensionKey: string): Promise<void> {
    const migrations = migrationsFor(extensionKey);
    if (migrations.length === 0) {
      return;
    }

    const recorded = await this.db
      .select({ version: extensionMigrations.version })
      .from(extensionMigrations)
      .where(and(eq(extensionMigrations.schoolId, schoolId), eq(extensionMigrations.extensionKey, extensionKey)));
    const pending = pendingMigrations(recorded.map((row) => row.version), migrations);

    for (const migration of pending) {
      for (const statement of compileModuleMigration(extensionKey, migration, 'sqlite')) {
        await this.adapter.execute(statement);
      }
      await this.db.insert(extensionMigrations).values({
        schoolId,
        extensionKey,
        version: migration.id,
        appliedAt: Date.now(),
      });
    }
  }

  private async enabledExtensions(schoolId: number) {
    const rows = await this.db
      .select({ extensionKey: schoolExtensions.extensionKey, status: schoolExtensions.status })
      .from(schoolExtensions)
      .where(eq(schoolExtensions.schoolId, schoolId));
    const statusByKey = new Map(rows.map((row) => [row.extensionKey, row.status]));

    return bundledManifests.map((manifest) => ({
      key: manifest.key,
      version: manifest.version,
      enabled: manifest.required === true || statusByKey.get(manifest.key) === 'enabled',
    }));
  }

  private async readEnabled(schoolId: number, extensionKey: string): Promise<boolean> {
    const row = await this.findRow(schoolId, extensionKey);
    return row?.status === 'enabled';
  }

  private async requireOwnedSchool(schoolId: number): Promise<void> {
    requireOwnerUserId(this.ownerUserId);
    const ownedSchool = await this.db
      .select({ id: school.id })
      .from(school)
      .where(and(eq(school.id, schoolId), eq(school.id, requireSchoolId(this.activeSchoolId))))
      .get();

    if (!ownedSchool) {
      throw new Error('Selected school was not found.');
    }
  }
}

function dependencyKeys(
  extensionKey: string,
  manifests: readonly { key: string; requires: { extensions?: Record<string, string> } }[],
): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();

  function walk(key: string) {
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    keys.push(key);
    const manifest = manifests.find((item) => item.key === key);
    for (const dependency of Object.keys(manifest?.requires.extensions ?? {})) {
      walk(dependency);
    }
  }

  walk(extensionKey);
  return keys;
}

function statusFor(
  extension: BundledExtension,
  stored: string | undefined,
): InstalledExtension['status'] {
  if (extension.required) {
    return 'enabled';
  }
  if (stored === 'enabled' || stored === 'disabled' || stored === 'removed') {
    return stored;
  }
  return 'available';
}

export type SchoolSlot =
  | {
    kind: 'link';
    extensionKey: string;
    label: string;
    href: string;
    catalog: { en: Record<string, string>; sw: Record<string, string> };
  }
  | {
    kind: 'document';
    extensionKey: string;
    label: string | null;
    document: ViewDocument;
    catalog: { en: Record<string, string>; sw: Record<string, string> };
  };

function parseGranted(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

function readCapabilities(manifestJson: string | undefined): string[] {
  if (!manifestJson) {
    return [];
  }
  try {
    const parsed = JSON.parse(manifestJson) as { capabilities?: string[] };
    return parsed.capabilities ?? [];
  } catch {
    return [];
  }
}
