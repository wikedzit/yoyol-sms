export const compressedLimitBytes = 5 * 1024 * 1024;
export const uncompressedLimitBytes = 20 * 1024 * 1024;
export const iconLimitBytes = 32 * 1024;

export type PackageFile = {
  path: string;
  bytes: Uint8Array;
  symlink?: boolean;
};

const requiredPaths = ['yoyol.extension.json', 'dist/server.js', 'locales/en.json', 'locales/sw.json'];

export function uploadBlockReason(input: { isPlatformAdmin: boolean; loaderPresent: boolean }): string | null {
  if (!input.isPlatformAdmin) return 'Only a platform administrator can upload a package.';
  if (!input.loaderPresent) {
    return 'Zip upload needs the Worker Loader binding. This server does not have it, so upload stays hidden.';
  }
  return null;
}

export function workerLoaderPresent(env: object): boolean {
  if (!('LOADER' in env)) return false;
  return (env as { LOADER?: unknown }).LOADER != null;
}

export function packageStorageRefusal(storagePresent: boolean): string | null {
  if (storagePresent) return null;
  return 'This package was checked and then discarded. Package storage is not configured.';
}

export function packageProblems(files: readonly PackageFile[], compressedBytes: number): string[] {
  const problems: string[] = [];
  if (compressedBytes > compressedLimitBytes) problems.push('This package is larger than 5 MB.');
  const expanded = files.reduce((total, file) => total + file.bytes.byteLength, 0);
  if (expanded > uncompressedLimitBytes) problems.push('This package expands to more than 20 MB.');
  for (const file of files) {
    if (file.symlink || isUnsafePath(file.path)) {
      problems.push(`Remove the unsafe path \`${file.path}\`.`);
      continue;
    }
    if (!isAllowedPath(file.path)) problems.push(`Remove the extra file \`${file.path}\`.`);
    if (file.path === 'assets/icon.svg' && file.bytes.byteLength > iconLimitBytes) {
      problems.push('An icon must be 32 KB or smaller.');
    }
  }
  for (const path of requiredPaths) {
    if (!files.some((file) => file.path === path)) problems.push(`A package needs ${path}.`);
  }
  return problems;
}

export type PackageChecks = {
  coreVersion: string;
  manifestError: (value: unknown) => string | null;
  coreAccepted: (range: string) => boolean;
  migrationAccepted: (value: unknown) => boolean;
};

export function packageContentProblems(files: readonly PackageFile[], checks: PackageChecks): string[] {
  const manifestFile = files.find((file) => file.path === 'yoyol.extension.json');
  if (!manifestFile) return [];
  const manifest = readJson(manifestFile.bytes);
  if (!manifest) return ['The manifest could not be read.'];
  const manifestProblem = checks.manifestError(manifest);
  if (manifestProblem) return [manifestProblem];
  const parsed = manifest as {
    type?: string;
    requires?: { core?: string };
  };
  const problems: string[] = [];
  if (typeof parsed.requires?.core === 'string' && !checks.coreAccepted(parsed.requires.core)) {
    problems.push(`This extension needs core ${parsed.requires.core}. This app is running ${checks.coreVersion}.`);
  }
  for (const path of ['locales/en.json', 'locales/sw.json']) {
    const locale = files.find((file) => file.path === path);
    if (locale && !isJsonObject(readJson(locale.bytes))) problems.push(`${path} must be a JSON object.`);
  }
  const schemaFiles = files.filter((file) => file.path.startsWith('schema/'));
  if (parsed.type === 'plugin' && schemaFiles.length > 0) {
    problems.push('A plugin cannot contain schema files.');
  }
  if (parsed.type === 'module') {
    for (const file of schemaFiles) {
      const body = readJson(file.bytes);
      if (!body) {
        problems.push(`${file.path} could not be read.`);
        continue;
      }
      if (!checks.migrationAccepted(body)) problems.push(`${file.path} is not a valid migration.`);
    }
  }
  return problems;
}

const consentCopy: Record<string, { en: string; sw: string; sensitive: boolean }> = {
  'core.academics:read': {
    en: 'It can read classes, subjects, and the academic year.',
    sw: 'Inaweza kusoma madarasa, masomo, na mwaka wa masomo.',
    sensitive: false,
  },
  'core.students:read': {
    en: 'It can read student records.',
    sw: 'Inaweza kusoma rekodi za wanafunzi.',
    sensitive: true,
  },
  'core.students:write': {
    en: 'It can change student records.',
    sw: 'Inaweza kubadili rekodi za wanafunzi.',
    sensitive: true,
  },
  'core.guardians:read': {
    en: 'It can read guardian names.',
    sw: 'Inaweza kusoma majina ya walezi.',
    sensitive: true,
  },
  'core.guardians.contact:read': {
    en: 'It can read guardian phone numbers and email addresses.',
    sw: 'Inaweza kusoma nambari za simu na barua pepe za walezi.',
    sensitive: true,
  },
  'core.staff:read': {
    en: 'It can read staff records.',
    sw: 'Inaweza kusoma rekodi za wafanyakazi.',
    sensitive: false,
  },
  'core.users:read': {
    en: 'It can read user names.',
    sw: 'Inaweza kusoma majina ya watumiaji.',
    sensitive: false,
  },
  'notifications:send': {
    en: 'It can send notifications.',
    sw: 'Inaweza kutuma arifa.',
    sensitive: false,
  },
  'files:read': {
    en: 'It can read its own files.',
    sw: 'Inaweza kusoma faili zake.',
    sensitive: false,
  },
  'files:write': {
    en: 'It can store its own files.',
    sw: 'Inaweza kuhifadhi faili zake.',
    sensitive: false,
  },
  'jobs:schedule': {
    en: 'It can schedule work.',
    sw: 'Inaweza kupanga kazi.',
    sensitive: false,
  },
};

export type ConsentLine = { en: string; sw: string; sensitive: boolean };

export function consentLines(input: { capabilities: readonly string[]; outboundHosts: readonly string[] }): ConsentLine[] {
  const lines = input.capabilities.map((capability) => consentCopy[capability] ?? {
    en: `It asks for ${capability}.`,
    sw: `Inaomba ${capability}.`,
    sensitive: false,
  });
  if (input.outboundHosts.length === 0) {
    lines.push({
      en: 'It does not call other servers.',
      sw: 'Haiiti seva nyingine.',
      sensitive: false,
    });
  } else {
    lines.push({
      en: `It may call ${input.outboundHosts.join(', ')}.`,
      sw: `Inaweza kuita ${input.outboundHosts.join(', ')}.`,
      sensitive: false,
    });
  }
  return lines;
}

export function versionIsBlocked(input: { versionRevoked: boolean; keyRevoked: boolean }): boolean {
  return input.versionRevoked || input.keyRevoked;
}

export function revocationNotice(extensionKey: string, version: string): string {
  return `${extensionKey} ${version} was turned off because its publisher key or this version was revoked.`;
}

function isUnsafePath(path: string): boolean {
  if (path.startsWith('/') || path.startsWith('\\') || /^[A-Za-z]:/.test(path)) return true;
  return path.split('/').some((part) => part === '..' || part === '');
}

function isAllowedPath(path: string): boolean {
  if (requiredPaths.includes(path) || path === 'assets/icon.svg' || path === 'signature.json') return true;
  return /^schema\/\d{3}_[a-z0-9_]+\.json$/.test(path);
}

function readJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function isJsonObject(value: unknown): boolean {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
