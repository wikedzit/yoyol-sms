import { z } from 'zod';

const localizedText = z.object({
  en: z.string().min(1),
  sw: z.string().min(1),
});

const extensionKey = z.string().regex(/^[a-z][a-z0-9-]{1,31}$/, 'Use a short lowercase extension key.');
const semver = z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must look like 1.0.0.');

const catalogueCapabilities = new Set([
  'core.academics:read',
  'core.students:read',
  'core.students:write',
  'core.guardians:read',
  'core.guardians.contact:read',
  'core.staff:read',
  'core.users:read',
  'notifications:send',
  'files:read',
  'files:write',
  'jobs:schedule',
]);

const coreListenNames = new Set([
  'student.beforeCreate',
  'student.displayName',
  'student.profile.tabs',
  'dashboard.widgets',
  'navigation.items',
]);

const permissionSchema = z.object({
  key: z.string().min(1),
  label: localizedText,
  defaultRoles: z.array(z.string()).default([]),
});

export const extensionManifestSchema = z
  .object({
    manifestVersion: z.literal(1),
    key: extensionKey,
    type: z.enum(['plugin', 'module']),
    version: semver,
    name: localizedText,
    description: localizedText,
    publisher: z.string().min(1),
    license: z.string().min(1),
    requires: z.object({
      core: z.string().min(1),
      extensions: z.record(z.string(), z.string()).optional(),
    }),
    capabilities: z.array(z.string()).default([]),
    permissions: z.array(permissionSchema).optional(),
    navigation: z.array(z.object({ path: z.string().min(1) })).optional(),
    pages: z.array(z.object({ path: z.string().min(1) })).optional(),
    events: z.object({
      subscribes: z.array(z.string().min(1)).optional(),
      publishes: z.array(z.string().min(1)).optional(),
    }).optional(),
    hooks: z.object({
      listens: z.array(z.object({
        name: z.string().min(1),
        priority: z.number().int().default(100),
      })).optional(),
      defines: z.array(z.string().min(1)).optional(),
    }).optional(),
    settings: z.array(z.object({
      key: z.string().min(1),
      type: z.enum(['text', 'select']).default('text'),
      options: z.array(z.string()).optional(),
      default: z.string().optional(),
    })).default([]),
    provides: z.array(z.string()).default([]),
    outboundHosts: z.array(z.string()).default([]),
    required: z.boolean().optional(),
  })
  .superRefine((manifest, context) => {
    const ownsPages = (manifest.permissions?.length ?? 0) > 0
      || (manifest.navigation?.length ?? 0) > 0
      || (manifest.pages?.length ?? 0) > 0;

    if (manifest.type === 'plugin' && ownsPages) {
      context.addIssue({
        code: 'custom',
        message: 'A plugin cannot declare pages, navigation, or permissions.',
      });
    }
    if (manifest.type === 'plugin' && (manifest.hooks?.defines?.length ?? 0) > 0) {
      context.addIssue({
        code: 'custom',
        message: 'A plugin cannot define hooks.',
      });
    }
    if (manifest.type === 'plugin' && (manifest.events?.publishes?.length ?? 0) > 0) {
      context.addIssue({
        code: 'custom',
        message: 'A plugin cannot publish events.',
      });
    }
    for (const eventName of manifest.events?.publishes ?? []) {
      if (!eventName.startsWith(`${manifest.key}.`)) {
        context.addIssue({
          code: 'custom',
          message: `Event ${eventName} must start with ${manifest.key}.`,
        });
      }
    }

    for (const setting of manifest.settings) {
      if (setting.type === 'select' && (setting.options?.length ?? 0) === 0) {
        context.addIssue({
          code: 'custom',
          message: `Setting ${setting.key} needs options.`,
        });
      }
      if (setting.type === 'select' && setting.default && !setting.options?.includes(setting.default)) {
        context.addIssue({
          code: 'custom',
          message: `Setting ${setting.key} default must be one of its options.`,
        });
      }
    }
    for (const capability of manifest.capabilities) {
      if (!catalogueCapabilities.has(capability) && !/^extension:[a-z][a-z0-9-]{1,31}$/.test(capability)) {
        context.addIssue({
          code: 'custom',
          message: `Capability ${capability} is not in the catalogue.`,
        });
      }
    }
    for (const listen of manifest.hooks?.listens ?? []) {
      const definedHere = manifest.hooks?.defines?.includes(listen.name) ?? false;
      if (!coreListenNames.has(listen.name) && !definedHere && !listen.name.startsWith(`${manifest.key}.`)) {
        context.addIssue({
          code: 'custom',
          message: `Hook ${listen.name} is not a core hook or slot.`,
        });
      }
    }

    for (const permission of manifest.permissions ?? []) {
      if (!permission.key.startsWith(`${manifest.key}.`)) {
        context.addIssue({
          code: 'custom',
          message: `Permission ${permission.key} must start with ${manifest.key}.`,
        });
      }
    }
  });

export type ExtensionManifest = z.infer<typeof extensionManifestSchema>;

export const coreVersion = '1.0.0';

export function parseManifest(input: unknown): ExtensionManifest {
  return extensionManifestSchema.parse(input);
}

export function manifestError(input: unknown): string | null {
  const parsed = extensionManifestSchema.safeParse(input);
  if (parsed.success) {
    return null;
  }
  return parsed.error.issues.map((issue) => issue.message).join(' ');
}

export type EnabledExtension = {
  key: string;
  version: string;
  enabled: boolean;
};

export function dependencyCycle(manifests: readonly ExtensionManifest[]): string[] | null {
  const requirements = new Map(
    manifests.map((manifest) => [manifest.key, Object.keys(manifest.requires.extensions ?? {})]),
  );
  const known = new Set(requirements.keys());
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function walk(key: string): string[] | null {
    if (!known.has(key)) {
      return null;
    }
    if (visiting.has(key)) {
      const start = stack.indexOf(key);
      return [...stack.slice(start), key];
    }
    if (visited.has(key)) {
      return null;
    }

    visiting.add(key);
    stack.push(key);
    for (const dependency of requirements.get(key) ?? []) {
      const cycle = walk(dependency);
      if (cycle) {
        return cycle;
      }
    }
    stack.pop();
    visiting.delete(key);
    visited.add(key);
    return null;
  }

  for (const key of known) {
    const cycle = walk(key);
    if (cycle) {
      return cycle;
    }
  }
  return null;
}

export function reasonToRefuseEnable(
  manifest: ExtensionManifest,
  catalog: readonly ExtensionManifest[],
  enabled: readonly EnabledExtension[],
  runningCore: string,
): string | null {
  const cycle = dependencyCycle(catalog);
  if (cycle?.includes(manifest.key)) {
    const names = cycle.slice(0, -1).map((key) => englishName(catalog, key));
    return `These extensions depend on each other: ${names.join(', ')}.`;
  }

  if (!versionSatisfies(manifest.requires.core, runningCore)) {
    return `This extension needs core ${manifest.requires.core}. This app is running ${runningCore}.`;
  }

  const problems: string[] = [];
  for (const [requiredKey, range] of Object.entries(manifest.requires.extensions ?? {})) {
    const requiredName = englishName(catalog, requiredKey);
    const requiredManifest = catalog.find((item) => item.key === requiredKey);
    if (!requiredManifest) {
      problems.push(`${manifest.name.en} needs ${requiredName}, which is not available.`);
      continue;
    }

    const installed = enabled.find((item) => item.key === requiredKey);
    if (!installed?.enabled) {
      problems.push(`Turn on ${requiredName} before turning on ${manifest.name.en}.`);
      continue;
    }

    if (!versionSatisfies(range, installed.version)) {
      problems.push(`${requiredName} is version ${installed.version}. ${manifest.name.en} needs ${range}.`);
    }
  }

  if (problems.length === 0) {
    return null;
  }
  return problems.join(' ');
}

export function reasonToRefuseDisable(
  targetKey: string,
  catalog: readonly ExtensionManifest[],
  enabledKeys: readonly string[],
): string | null {
  const enabled = new Set(enabledKeys);
  const dependents = catalog.filter((manifest) => {
    return enabled.has(manifest.key) && manifest.requires.extensions?.[targetKey] !== undefined;
  });
  if (dependents.length === 0) {
    return null;
  }

  const names = dependents.map((manifest) => manifest.name.en).join(', ');
  return `Turn off ${names} before turning off ${englishName(catalog, targetKey)}.`;
}

function englishName(catalog: readonly ExtensionManifest[], key: string): string {
  return catalog.find((manifest) => manifest.key === key)?.name.en ?? key;
}

export function versionSatisfies(range: string, version: string): boolean {
  if (range.startsWith('^')) {
    const required = range.slice(1).split('.').map(Number);
    const actual = version.split('.').map(Number);
    if (required.length !== 3 || actual.length !== 3 || required.some(Number.isNaN) || actual.some(Number.isNaN)) {
      return false;
    }
    if (actual[0] !== required[0]) {
      return false;
    }
    if (actual[1] !== required[1]) {
      return actual[1] > required[1];
    }
    return actual[2] >= required[2];
  }

  return range === version;
}
