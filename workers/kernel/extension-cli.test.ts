import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { signatureProblem } from './package-signature.ts';
import {
  builtWorker,
  localDevLines,
  packageFileList,
  packedPackageProblems,
  refusalToCreateExtension,
  refusalToSign,
  scaffoldExtension,
  signPackage,
  sourceProblems,
  storeZip,
} from './extension-cli.ts';

test('SDK-CLI-01 create writes a plugin that validates and whose sample test passes', () => {
  assert.match(refusalToCreateExtension('Notes', 'plugin') ?? '', /lowercase/);
  assert.match(refusalToCreateExtension('notes', 'theme') ?? '', /plugin or a module/);
  const files = scaffoldExtension({ key: 'field-notes', kind: 'plugin' });
  assert.equal(sourceProblems(files).join('\n'), '');
  const directory = writeScaffold(files);
  const result = spawnSync(process.execPath, ['--experimental-strip-types', '--test', join(directory, 'src/scaffold.test.ts')], {
    cwd: directory,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
});

test('SDK-CLI-02 validate uses the core manifest and schema rules', () => {
  const plugin = scaffoldExtension({ key: 'field-notes', kind: 'plugin' });
  plugin['schema/001_initial.json'] = '{}\n';
  assert.match(sourceProblems(plugin).join('\n'), /cannot contain schema/);

  const moduleFiles = scaffoldExtension({ key: 'field-notes', kind: 'module' });
  assert.equal(sourceProblems(moduleFiles).join('\n'), '');
  moduleFiles['locales/sw.json'] = '[]\n';
  assert.match(sourceProblems(moduleFiles).join('\n'), /locales\/sw.json/);
  moduleFiles['locales/sw.json'] = scaffoldExtension({ key: 'field-notes', kind: 'module' })['locales/sw.json'];
  moduleFiles['schema/001_initial.json'] = '{ "id": "bad", "operations": [] }\n';
  assert.match(sourceProblems(moduleFiles).join('\n'), /not a valid migration/);
});

test('SDK-CLI-03 build and pack produce a package the core can check', () => {
  const files = scaffoldExtension({ key: 'field-notes', kind: 'module' });
  const worker = builtWorker(files);
  assert.match(worker, /export default/);
  const packed = packageFileList(files, worker);
  assert.equal(packedPackageProblems(packed).join('\n'), '');
  const zip = storeZip(packed);
  const names = packed.map((file) => file.path);
  const listing = new TextDecoder().decode(zip);
  for (const name of names) assert.match(listing, new RegExp(name.replace('.', '\\.')));
  assert.ok(zip.byteLength > 22);
});

test('SDK-CLI-04 sign uses a key passed in, never a key stored in the repo', async () => {
  assert.match(refusalToSign(undefined) ?? '', /CI secret store/);
  assert.match(readFileSync(new URL('./extension-cli.ts', import.meta.url), 'utf8'), /Do not commit a private key/);
  const keys = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']) as CryptoKeyPair;
  const privateKey = toBase64(new Uint8Array(await crypto.subtle.exportKey('pkcs8', keys.privateKey)));
  const publicKey = toBase64(new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey)));
  const files = packageFileList(scaffoldExtension({ key: 'field-notes', kind: 'plugin' }), 'export default {}\n');
  const signature = await signPackage({
    files,
    privateKeyPkcs8Base64: privateKey,
    publisher: 'local',
    keyId: 'ci',
  });
  assert.equal(await signatureProblem({
    files,
    signature,
    allowUnsigned: false,
    trustedKeys: [{ publisher: 'local', keyId: 'ci', publicKey, revoked: false }],
  }), null);
});

test('SDK-CLI-05 the local command validates and does not pretend to hot reload', () => {
  const ready = localDevLines([]);
  assert.match(ready.join('\n'), /pnpm db:seed/);
  assert.match(ready.join('\n'), /Worker Loader/);
  assert.match(localDevLines(['The manifest could not be read.']).join('\n'), /could not be read/);
});

function writeScaffold(files: Record<string, string>): string {
  const directory = mkdtempSync(join(tmpdir(), 'yoyol-ext-'));
  for (const [path, contents] of Object.entries(files)) {
    const target = join(directory, path);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, contents);
  }
  return directory;
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}
