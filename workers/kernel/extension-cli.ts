import { extensionLayoutProblems } from './extension-layout.ts';
import { coreVersion, manifestError, versionSatisfies } from './manifest.ts';
import { parseModuleMigration } from './module-schema.ts';
import { packageContentProblems, packageProblems, type PackageFile } from './package-upload.ts';
import { canonicalDigest, type SignatureFile } from './package-signature.ts';

const extensionKey = /^[a-z][a-z0-9-]{1,31}$/;

export function refusalToCreateExtension(key: string, kind: string): string | null {
  if (kind !== 'plugin' && kind !== 'module') return 'Choose a plugin or a module.';
  if (!extensionKey.test(key)) return 'Use a short lowercase extension key.';
  return null;
}

export function scaffoldExtension(input: { key: string; kind: 'plugin' | 'module' }): Record<string, string> {
  const title = titleFromKey(input.key);
  const files: Record<string, string> = {
    'yoyol.extension.json': `${JSON.stringify(manifestFor(input), null, 2)}\n`,
    'entrypoint.ts': entrypointSource(input.key, input.kind),
    'README.md': readmeSource(input.key, input.kind),
    'locales/en.json': `${JSON.stringify({ [`${input.key}.title`]: title, [`${input.key}.description`]: `${title} for a school.` }, null, 2)}\n`,
    'locales/sw.json': `${JSON.stringify({ [`${input.key}.title`]: title, [`${input.key}.description`]: `${title} kwa shule.` }, null, 2)}\n`,
    'src/scaffold.test.ts': scaffoldTest(input.key),
  };
  if (input.kind === 'module') {
    files['schema/001_initial.json'] = `${JSON.stringify({
      id: '001_initial',
      operations: [{
        op: 'createTable',
        name: 'records',
        columns: [
          { name: 'id', type: 'id' },
          { name: 'title', type: 'text', notNull: true },
        ],
      }],
    }, null, 2)}\n`;
  }
  return files;
}

export function sourceProblems(files: Readonly<Record<string, string>>): string[] {
  const paths = Object.keys(files);
  const manifestText = files['yoyol.extension.json'];
  if (!manifestText) return ['yoyol.extension.json is missing.'];
  let manifest: unknown;
  try {
    manifest = JSON.parse(manifestText);
  } catch {
    return ['The manifest could not be read.'];
  }
  const manifestProblem = manifestError(manifest);
  if (manifestProblem) return [manifestProblem];
  const parsed = manifest as { key: string; type: 'plugin' | 'module'; requires?: { core?: string } };
  const problems = extensionLayoutProblems({ key: parsed.key, type: parsed.type, files: paths });
  if (typeof parsed.requires?.core === 'string' && !versionSatisfies(parsed.requires.core, coreVersion)) {
    problems.push(`This extension needs core ${parsed.requires.core}. This app is running ${coreVersion}.`);
  }
  for (const path of ['locales/en.json', 'locales/sw.json']) {
    const text = files[path];
    if (!text) continue;
    if (!isStringMap(readJson(text))) problems.push(`${path} must be a JSON object of strings.`);
  }
  if (parsed.type === 'module') {
    for (const path of paths.filter((item) => item.startsWith('schema/'))) {
      try {
        parseModuleMigration(readJson(files[path]));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'The migration could not be read.';
        problems.push(`${path} is not a valid migration. ${message}`);
      }
    }
  }
  return problems;
}

export function builtWorker(files: Readonly<Record<string, string>>): string {
  const manifest = JSON.parse(files['yoyol.extension.json'] ?? '{}') as { key?: string };
  const key = manifest.key ?? 'extension';
  return `const page = { viewVersion: 1, title: { t: ${JSON.stringify(`${key}.title`)} }, body: [{ type: 'text', value: { t: ${JSON.stringify(`${key}.description`)} } }] };
export default {
  async handlePage() {
    return { kind: 'view', document: page };
  },
};
`;
}

export function packageFileList(files: Readonly<Record<string, string>>, workerSource: string): PackageFile[] {
  const packed: PackageFile[] = [
    { path: 'yoyol.extension.json', bytes: encode(files['yoyol.extension.json'] ?? '') },
    { path: 'dist/server.js', bytes: encode(workerSource) },
    { path: 'locales/en.json', bytes: encode(files['locales/en.json'] ?? '') },
    { path: 'locales/sw.json', bytes: encode(files['locales/sw.json'] ?? '') },
  ];
  for (const path of Object.keys(files).filter((item) => item.startsWith('schema/')).sort()) {
    packed.push({ path, bytes: encode(files[path] ?? '') });
  }
  return packed;
}

export function packedPackageProblems(files: readonly PackageFile[]): string[] {
  return [
    ...packageProblems(files, zipSize(files)),
    ...packageContentProblems(files, {
      coreVersion,
      manifestError,
      coreAccepted: (range) => versionSatisfies(range, coreVersion),
      migrationAccepted: (value) => {
        try {
          parseModuleMigration(value);
          return true;
        } catch {
          return false;
        }
      },
    }),
  ];
}

export function refusalToSign(privateKey: string | undefined): string | null {
  if (!privateKey || privateKey.trim().length === 0) {
    return 'Set YOYOL_SIGNING_KEY in the CI secret store. Do not commit a private key.';
  }
  return null;
}

export async function signPackage(input: {
  files: readonly PackageFile[];
  privateKeyPkcs8Base64: string;
  publisher: string;
  keyId: string;
}): Promise<SignatureFile> {
  const keyBytes = fromBase64(input.privateKeyPkcs8Base64);
  if (!keyBytes) throw new Error('YOYOL_SIGNING_KEY could not be read.');
  const privateKey = await crypto.subtle.importKey('pkcs8', keyBytes, 'Ed25519', false, ['sign']);
  const digest = await canonicalDigest(input.files);
  const signature = new Uint8Array(await crypto.subtle.sign('Ed25519', privateKey, digest));
  return {
    publisher: input.publisher,
    keyId: input.keyId,
    algorithm: 'Ed25519',
    digest: toHex(digest),
    signature: toBase64(signature),
  };
}

export function localDevLines(problems: readonly string[]): string[] {
  if (problems.length > 0) return [...problems];
  return [
    'The extension validates.',
    'Seed the local school with pnpm db:seed, then run pnpm dev and open http://localhost:5173.',
    'Hot reload of an unpacked package needs the Worker Loader binding. This server does not have it.',
  ];
}

export function storeZip(files: readonly PackageFile[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = new TextEncoder().encode(file.path);
    const crc = crc32(file.bytes);
    const local = new Uint8Array(30 + name.byteLength + file.bytes.byteLength);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(8, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, file.bytes.byteLength, true);
    view.setUint32(22, file.bytes.byteLength, true);
    view.setUint16(26, name.byteLength, true);
    local.set(name, 30);
    local.set(file.bytes, 30 + name.byteLength);
    locals.push(local);

    const entry = new Uint8Array(46 + name.byteLength);
    const directory = new DataView(entry.buffer);
    directory.setUint32(0, 0x02014b50, true);
    directory.setUint16(4, 20, true);
    directory.setUint16(6, 20, true);
    directory.setUint32(16, crc, true);
    directory.setUint32(20, file.bytes.byteLength, true);
    directory.setUint32(24, file.bytes.byteLength, true);
    directory.setUint16(28, name.byteLength, true);
    directory.setUint32(42, offset, true);
    entry.set(name, 46);
    central.push(entry);
    offset += local.byteLength;
  }
  const centralSize = central.reduce((total, entry) => total + entry.byteLength, 0);
  const end = new Uint8Array(22);
  const ending = new DataView(end.buffer);
  ending.setUint32(0, 0x06054b50, true);
  ending.setUint16(8, files.length, true);
  ending.setUint16(10, files.length, true);
  ending.setUint32(12, centralSize, true);
  ending.setUint32(16, offset, true);
  return concat([...locals, ...central, end]);
}

function manifestFor(input: { key: string; kind: 'plugin' | 'module' }): Record<string, unknown> {
  const title = titleFromKey(input.key);
  const manifest: Record<string, unknown> = {
    manifestVersion: 1,
    key: input.key,
    type: input.kind,
    version: '1.0.0',
    name: { en: title, sw: title },
    description: { en: `${title} for a school.`, sw: `${title} kwa shule.` },
    publisher: 'local',
    license: 'MIT',
    requires: { core: '^1.0.0' },
    capabilities: [],
    settings: [],
    provides: [],
    outboundHosts: [],
  };
  if (input.kind === 'module') {
    manifest.permissions = [{
      key: `${input.key}.record.read`,
      label: { en: `Read ${title}`, sw: `Soma ${title}` },
    }];
  }
  return manifest;
}

function entrypointSource(key: string, kind: 'plugin' | 'module'): string {
  return `const page = {
  viewVersion: 1,
  title: { t: '${key}.title' },
  body: [{ type: 'text', value: { t: '${key}.description' } }],
};

const extension = {
  manifest: { key: '${key}', type: '${kind}', version: '1.0.0' },
  async handlePage() {
    return { kind: 'view', document: page };
  },
};

export default extension;
`;
}

function readmeSource(key: string, kind: 'plugin' | 'module'): string {
  return `# ${titleFromKey(key)}

A ${kind} created by yoyol-ext.

Validate it with \`yoyol-ext validate\`. Build and pack it before signing.
`;
}

function scaffoldTest(key: string): string {
  return `import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('the manifest key is ${key}', () => {
  const manifest = JSON.parse(readFileSync(new URL('../yoyol.extension.json', import.meta.url), 'utf8'));
  assert.equal(manifest.key, '${key}');
});
`;
}

function titleFromKey(key: string): string {
  return key.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function readJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isStringMap(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every((item) => typeof item === 'string');
}

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function zipSize(files: readonly PackageFile[]): number {
  return storeZip(files).byteLength;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = (crc & 1) === 1 ? 0xedb88320 : 0;
      crc = (crc >>> 1) ^ mask;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}
