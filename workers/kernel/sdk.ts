import type { ChannelName } from './channels';
import type { FinancePage } from './finance';
import type { ClubsPage } from './clubs';
import type { LeadershipPage } from './leadership';
import type { ReportsPage } from './reports';
import type { DisciplinePage } from './discipline';
import type { LessonPlansPage } from './lesson-plans';
import type { TimetablePage } from './timetable';

export type LifecycleContext = {
  schoolId: number;
  settings: {
    get: (key: string) => Promise<string | null>;
  };
  core: {
    students?: {
      list: () => Promise<unknown>;
      records?: () => Promise<string[]>;
      enrolments?: () => Promise<string[]>;
      guardians?: () => Promise<string[]>;
      yearSubjects?: () => Promise<string[]>;
      results?: () => Promise<string[]>;
    };
    academics?: {
      list: () => Promise<string[]>;
      calendar: () => Promise<string[]>;
      subjects: () => Promise<string[]>;
      classSubjects: () => Promise<string[]>;
      combinations: () => Promise<string[]>;
      events?: () => Promise<string[]>;
    };
  };
  attendance?: {
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
  finance?: {
    open: (path: string, search: string) => Promise<FinancePage>;
    save: (fields: Record<string, string>) => Promise<{ error: string } | { ok: true }>;
    profileLines: (studentId: number | null) => Promise<string[]>;
    onEnrolled: (input: { studentId: number; formClassId: number; academicYearId: number }) => Promise<void>;
  };
  timetable?: {
    open: () => Promise<TimetablePage>;
    save: (fields: Record<string, string>) => Promise<{ error: string } | { ok: true }>;
    profileLines: (studentId: number | null) => Promise<string[]>;
  };
  lessonPlans?: {
    open: () => Promise<LessonPlansPage>;
    save: (fields: Record<string, string>) => Promise<{ error: string } | { ok: true }>;
  };
  discipline?: {
    open: () => Promise<DisciplinePage>;
    save: (fields: Record<string, string>) => Promise<{ error: string } | { ok: true }>;
  };
  clubs?: {
    open: () => Promise<ClubsPage>;
    save: (fields: Record<string, string>) => Promise<{ error: string } | { ok: true }>;
  };
  leadership?: {
    open: () => Promise<LeadershipPage>;
    save: (fields: Record<string, string>) => Promise<{ error: string } | { ok: true }>;
  };
  reports?: {
    open: () => Promise<ReportsPage>;
    roleLine: () => Promise<string>;
    save: (fields: Record<string, string>) => Promise<{ error: string } | { ok: true }>;
  };
  notifications?: {
    send: (message: { userId: number; title: string; body: string }) => Promise<void>;
  };
  channels?: {
    receipts: (channel: ChannelName) => Promise<string[]>;
    remind: () => Promise<{ error: string } | { ok: true }>;
    notifyAbsence: (studentId: number, date: string) => Promise<void>;
  };
  log: {
    info: (message: string, details?: Record<string, unknown>) => void;
    error: (message: string, details?: Record<string, unknown>) => void;
  };
};

export type ExtensionEntrypoint = {
  manifest: {
    key: string;
    type: 'plugin' | 'module';
    version: string;
  };
  onEnable(context: LifecycleContext): Promise<void>;
  onUpgrade(context: LifecycleContext, fromVersion: string): Promise<void>;
  onDisable(context: LifecycleContext): Promise<void>;
  handlePage(request: { path: string; search?: string }, context: LifecycleContext): Promise<{ kind: 'view'; document: unknown } | { kind: 'notFound' }>;
  handleAction(action: string, fields: Record<string, string>, context: LifecycleContext): Promise<{ error?: string } | { ok: true }>;
  runHook(name: string, payload: unknown, context: LifecycleContext): Promise<unknown>;
  handleEvent(event: { id: number; name: string; payload: unknown; schoolId: number }, context: LifecycleContext): Promise<void>;
};

type LifecycleHandlers = {
  onEnable?: (context: LifecycleContext) => Promise<void> | void;
  onUpgrade?: (context: LifecycleContext, fromVersion: string) => Promise<void> | void;
  onDisable?: (context: LifecycleContext) => Promise<void> | void;
  handlePage?: (request: { path: string; search?: string }, context: LifecycleContext) => Promise<unknown> | unknown;
  handleAction?: (action: string, fields: Record<string, string>, context: LifecycleContext) => Promise<{ error?: string } | { ok: true }> | { error?: string } | { ok: true };
  runHook?: (name: string, payload: unknown, context: LifecycleContext) => Promise<unknown> | unknown;
  handleEvent?: (event: { id: number; name: string; payload: unknown; schoolId: number }, context: LifecycleContext) => Promise<void> | void;
};

export type PluginDefinition = LifecycleHandlers & {
  manifest: unknown;
  pages?: never;
  navigation?: never;
  permissions?: never;
};

export type ModuleDefinition = LifecycleHandlers & {
  manifest: unknown;
  pages?: Record<string, (context: LifecycleContext) => Promise<unknown> | unknown>;
};

type ReadableManifest = {
  key: string;
  type: 'plugin' | 'module';
  version: string;
  permissions?: readonly unknown[];
  pages?: readonly unknown[];
  navigation?: readonly unknown[];
};

const pluginBoundary = 'A plugin cannot declare pages, navigation, or permissions.';

export function definePlugin(definition: PluginDefinition): ExtensionEntrypoint {
  if ('pages' in definition || 'navigation' in definition || 'permissions' in definition) {
    throw new Error(pluginBoundary);
  }
  const manifest = readManifest(definition.manifest, 'plugin');
  if (ownsModuleFeatures(manifest)) {
    throw new Error(pluginBoundary);
  }
  return entrypoint(manifest, definition);
}

export function defineModule(definition: ModuleDefinition): ExtensionEntrypoint {
  const manifest = readManifest(definition.manifest, 'module');
  return entrypoint(manifest, definition, definition.pages);
}

function entrypoint(
  manifest: ReadableManifest,
  handlers: LifecycleHandlers,
  pages?: ModuleDefinition['pages'],
): ExtensionEntrypoint {
  return {
    manifest: {
      key: manifest.key,
      type: manifest.type,
      version: manifest.version,
    },
    async onEnable(context) {
      await handlers.onEnable?.(context);
    },
    async onUpgrade(context, fromVersion) {
      await handlers.onUpgrade?.(context, fromVersion);
    },
    async onDisable(context) {
      await handlers.onDisable?.(context);
    },
    async handlePage(request, context) {
      if (handlers.handlePage) {
        const document = await handlers.handlePage(request, context);
        return { kind: 'view', document };
      }
      const page = pages?.[request.path];
      if (!page) {
        return { kind: 'notFound' };
      }
      const document = await page(context);
      return { kind: 'view', document };
    },
    async handleAction(action, fields, context) {
      if (!handlers.handleAction) {
        return { ok: true };
      }
      return handlers.handleAction(action, fields, context);
    },
    async runHook(name, payload, context) {
      if (!handlers.runHook) {
        return payload;
      }
      const result = await handlers.runHook(name, payload, context);
      return result === undefined ? payload : result;
    },
    async handleEvent(event, context) {
      await handlers.handleEvent?.(event, context);
    },
  };
}

function readManifest(input: unknown, expected: 'plugin' | 'module'): ReadableManifest {
  if (!input || typeof input !== 'object') {
    throw new Error('Extension manifest is missing.');
  }

  const manifest = input as ReadableManifest;
  if (manifest.type !== expected) {
    const builder = expected === 'plugin' ? 'definePlugin' : 'defineModule';
    throw new Error(`${builder} only accepts a ${expected} manifest.`);
  }
  if (typeof manifest.key !== 'string' || typeof manifest.version !== 'string') {
    throw new Error('Extension manifest is missing a key or version.');
  }
  return manifest;
}

function ownsModuleFeatures(manifest: ReadableManifest): boolean {
  return (manifest.permissions?.length ?? 0) > 0
    || (manifest.navigation?.length ?? 0) > 0
    || (manifest.pages?.length ?? 0) > 0;
}
