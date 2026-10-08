import type { ExtensionEntrypoint, LifecycleContext } from './sdk';

export const pageBudgetMs = 5_000;
export const hookBudgetMs = 50;
export const eventBudgetMs = 30_000;

export type CapabilityGrants = readonly string[];

export type InstalledExtensionVersion = {
  key: string;
  version: string;
};

export type ExtensionHost = {
  getEntrypoint(
    version: InstalledExtensionVersion,
    grants: CapabilityGrants,
  ): Promise<ExtensionEntrypoint>;
};

export type WorkerLoader = {
  get(
    id: string,
    options: { env: Record<string, unknown>; globalOutbound: null | unknown },
  ): Promise<{ getEntrypoint: () => Promise<ExtensionEntrypoint> }>;
};

export function createDynamicWorkerExtensionHost(input: {
  loader: WorkerLoader | null;
  readBundle: (key: string, version: string) => Promise<Uint8Array | null>;
  isRevoked?: (key: string, version: string) => boolean;
}): ExtensionHost {
  return {
    async getEntrypoint(version, grants) {
      if (!input.loader) {
        throw new Error('Zip upload needs the Worker Loader binding. This server does not have it.');
      }
      if (input.isRevoked?.(version.key, version.version)) {
        throw new Error(`${version.key} ${version.version} was turned off because its publisher key or this version was revoked.`);
      }
      const bundle = await input.readBundle(version.key, version.version);
      if (!bundle) throw new Error(`${version.key} ${version.version} is not stored.`);
      const worker = await input.loader.get(`${version.key}@${version.version}`, {
        env: { grants: [...grants] },
        globalOutbound: null,
      });
      return worker.getEntrypoint();
    },
  };
}

type TimeBudgets = {
  pageMs: number;
  hookMs: number;
  eventMs: number;
};

const defaultBudgets: TimeBudgets = {
  pageMs: pageBudgetMs,
  hookMs: hookBudgetMs,
  eventMs: eventBudgetMs,
};

export function createBundledExtensionHost(
  findEntrypoint: (key: string) => ExtensionEntrypoint | null,
  budgets: Partial<TimeBudgets> = {},
): ExtensionHost {
  const limits = { ...defaultBudgets, ...budgets };
  return {
    async getEntrypoint(version, _grants) {
      // Grants stay on the call so a later host can pass only those stubs.
      // The bundled host runs in-process, and the context already hides the rest.
      const entrypoint = findEntrypoint(version.key);
      if (!entrypoint) {
        throw new Error(`${version.key} is not bundled.`);
      }
      return limitEntrypoint(entrypoint, limits);
    },
  };
}

function limitEntrypoint(entrypoint: ExtensionEntrypoint, limits: TimeBudgets): ExtensionEntrypoint {
  return {
    manifest: entrypoint.manifest,
    onEnable: (context) => withTimeLimit(entrypoint.onEnable(context), limits.pageMs, 'This action'),
    onUpgrade: (context, fromVersion) => withTimeLimit(
      entrypoint.onUpgrade(context, fromVersion),
      limits.pageMs,
      'This action',
    ),
    onDisable: (context) => withTimeLimit(entrypoint.onDisable(context), limits.pageMs, 'This action'),
    handlePage: (request, context) => withTimeLimit(
      entrypoint.handlePage(request, context),
      limits.pageMs,
      'This page',
    ),
    handleAction: (action, fields, context) => withTimeLimit(
      entrypoint.handleAction(action, fields, context),
      limits.pageMs,
      'This action',
    ),
    runHook: (name, payload, context) => withTimeLimit(
      entrypoint.runHook(name, payload, context),
      limits.hookMs,
      'This hook',
    ),
    handleEvent: (event, context) => withTimeLimit(
      entrypoint.handleEvent(event, context),
      limits.eventMs,
      'This event',
    ),
  };
}

function withTimeLimit<T>(work: Promise<T>, budgetMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} took longer than ${budgetMs} ms.`));
    }, budgetMs);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export const emptyContext: LifecycleContext = {
  schoolId: 0,
  settings: { get: async () => null },
  core: {},
  log: { info() {}, error() {} },
};
