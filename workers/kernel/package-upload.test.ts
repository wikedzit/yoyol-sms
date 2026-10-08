import assert from 'node:assert/strict';
import test from 'node:test';
import { coreVersion, manifestError, versionSatisfies } from './manifest.ts';
import { parseModuleMigration } from './module-schema.ts';
import {
  consentLines,
  packageContentProblems,
  packageProblems,
  packageStorageRefusal,
  uploadBlockReason,
  versionIsBlocked,
  workerLoaderPresent,
  type PackageFile,
} from './package-upload.ts';

const text = (value: string) => new TextEncoder().encode(value);

function file(path: string, bytes = text('ok')): PackageFile {
  return { path, bytes };
}

const manifest = JSON.stringify({
  manifestVersion: 1,
  key: 'hello',
  type: 'plugin',
  version: '1.0.0',
  name: { en: 'Hello', sw: 'Habari' },
  description: { en: 'A sample.', sw: 'Sampuli.' },
  publisher: 'nottech',
  license: 'MIT',
  requires: { core: '^1.0.0' },
  capabilities: ['core.students:read'],
  outboundHosts: [],
});

test('D-05 only a platform administrator can upload a package', () => {
  assert.match(uploadBlockReason({ isPlatformAdmin: false, loaderPresent: true }) ?? '', /platform administrator/);
  assert.equal(uploadBlockReason({ isPlatformAdmin: true, loaderPresent: true }), null);
});

test('RUN-13 upload stays hidden when the Worker Loader binding is missing', () => {
  assert.equal(workerLoaderPresent({}), false);
  assert.equal(workerLoaderPresent({ LOADER: null }), false);
  assert.equal(workerLoaderPresent({ LOADER: {} }), true);
  assert.match(uploadBlockReason({ isPlatformAdmin: true, loaderPresent: false }) ?? '', /upload stays hidden/);
});

test('RUN-06 a package rejects unsafe paths, extra files, and oversized bundles', () => {
  const problems = packageProblems([
    file('yoyol.extension.json'),
    file('dist/server.js'),
    file('locales/en.json'),
    file('locales/sw.json'),
    file('../secret'),
    file('notes.txt'),
  ], 6 * 1024 * 1024);
  assert.match(problems.join(' '), /larger than 5 MB/);
  assert.match(problems.join(' '), /unsafe path `..\/secret`/);
  assert.match(problems.join(' '), /extra file `notes.txt`/);
});

const checks = {
  coreVersion,
  manifestError,
  coreAccepted: (range: string) => versionSatisfies(range, coreVersion),
  migrationAccepted: (value: unknown) => {
    try {
      parseModuleMigration(value);
      return true;
    } catch {
      return false;
    }
  },
};

test('RUN-07 the manifest, locales, and core version are checked before storage', () => {
  const ready = packageContentProblems([
    file('yoyol.extension.json', text(manifest)),
    file('locales/en.json', text('{"hello":"Hello"}')),
    file('locales/sw.json', text('{"hello":"Habari"}')),
  ], checks);
  assert.deepEqual(ready, []);
  const future = manifest.replace('^1.0.0', '^9.0.0');
  const refused = packageContentProblems([
    file('yoyol.extension.json', text(future)),
    file('locales/en.json', text('[]')),
    file('locales/sw.json', text('{"hello":"Habari"}')),
    file('schema/001_initial.json', text('{}')),
  ], checks);
  assert.match(refused.join(' '), /needs core \^9\.0\.0/);
  assert.match(refused.join(' '), /locales\/en\.json must be a JSON object/);
  assert.match(refused.join(' '), /plugin cannot contain schema/);
});

test('RUN-10 a checked package is discarded when storage is not configured', () => {
  assert.match(packageStorageRefusal(false) ?? '', /discarded/);
  assert.equal(packageStorageRefusal(true), null);
});

test('RUN-11 consent names sensitive access in English and Swahili', () => {
  const lines = consentLines({ capabilities: ['core.students:read'], outboundHosts: [] });
  const student = lines.find((line) => line.sensitive);
  assert.equal(student?.en, 'It can read student records.');
  assert.equal(student?.sw, 'Inaweza kusoma rekodi za wanafunzi.');
  assert.match(lines.at(-1)?.en ?? '', /does not call other servers/);
});

test('RUN-12 a revoked version or publisher key is blocked', () => {
  assert.equal(versionIsBlocked({ versionRevoked: true, keyRevoked: false }), true);
  assert.equal(versionIsBlocked({ versionRevoked: false, keyRevoked: true }), true);
  assert.equal(versionIsBlocked({ versionRevoked: false, keyRevoked: false }), false);
});
