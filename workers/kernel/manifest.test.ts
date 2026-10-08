import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  dependencyCycle,
  manifestError,
  parseManifest,
  reasonToRefuseDisable,
  reasonToRefuseEnable,
  versionSatisfies,
  type ExtensionManifest,
} from './manifest.ts';

function packageDirectories(): string[] {
  const repoRoot = join(import.meta.dirname, '../..');
  const grouped = ['modules', 'plugins'].flatMap((folder) =>
    readdirSync(join(repoRoot, folder), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(repoRoot, folder, entry.name)),
  );
  return [...grouped, join(repoRoot, 'themes')];
}

function readManifests() {
  return packageDirectories().map((directory) =>
    JSON.parse(readFileSync(join(directory, 'yoyol.extension.json'), 'utf8')),
  );
}

test('KRN-REG-01 the themes manifest matches the shared schema', () => {
  const themes = readManifests().find((manifest) => manifest.key === 'themes');
  const parsed = parseManifest(themes);
  assert.equal(parsed.key, 'themes');
  assert.equal(parsed.type, 'plugin');
});

test('KRN-REG-01 a plugin cannot declare permissions', () => {
  const hello = readManifests().find((manifest) => manifest.key === 'hello');
  const message = manifestError({
    ...hello,
    permissions: [{ key: 'hello.greet', label: { en: 'Greet', sw: 'Salimu' }, defaultRoles: [] }],
  });
  assert.match(message ?? '', /plugin cannot declare/);
});

test('KRN-REG-01 a plugin cannot define hooks', () => {
  const hello = readManifests().find((manifest) => manifest.key === 'hello');
  const message = manifestError({
    ...hello,
    hooks: { defines: ['hello.beforeGreet'] },
  });
  assert.match(message ?? '', /cannot define hooks/);
});

test('KRN-REG-03 every bundled folder has a valid manifest', () => {
  const manifests = readManifests().map((source) => parseManifest(source));
  const keys = manifests.map((manifest) => manifest.key).sort();
  assert.deepEqual(keys, ['absence-alerts', 'academics', 'assessment', 'attendance', 'clubs', 'discipline', 'email', 'fee-reminders', 'finance', 'hello', 'leadership', 'lesson-plans', 'notices', 'reports', 'sms', 'staff', 'students', 'themes', 'timetable']);
  assert.equal(manifests.find((manifest) => manifest.key === 'students')?.required, true);
  assert.equal(manifests.find((manifest) => manifest.key === 'hello')?.required, undefined);
});

test('KRN-REG-04 a core range accepts the running core version', () => {
  assert.equal(versionSatisfies('^1.0.0', '1.0.0'), true);
  assert.equal(versionSatisfies('^1.0.0', '2.0.0'), false);
  assert.equal(versionSatisfies('1.0.0', '1.0.1'), false);
});

test('KRN-REG-04 the bundled extensions do not depend on each other in a circle', () => {
  const manifests = readManifests().map((source) => parseManifest(source));
  assert.equal(dependencyCycle(manifests), null);
  const hello = manifests.find((manifest) => manifest.key === 'hello');
  assert.ok(hello);
  const enabled = manifests
    .filter((manifest) => manifest.required)
    .map((manifest) => ({ key: manifest.key, version: manifest.version, enabled: true }));
  assert.equal(reasonToRefuseEnable(hello, manifests, enabled, '1.0.0'), null);
});

test('KRN-REG-04 a circle of requirements is explained', () => {
  const alpha = sample('alpha', { beta: '^1.0.0' });
  const beta = sample('beta', { alpha: '^1.0.0' });
  const reason = reasonToRefuseEnable(alpha, [alpha, beta], [], '1.0.0');
  assert.match(reason ?? '', /depend on each other: Alpha, Beta/);
});

test('KRN-REG-04 an unmet requirement names the extension to turn on', () => {
  const alpha = sample('alpha', { beta: '^1.0.0' });
  const beta = sample('beta');
  const missing = reasonToRefuseEnable(alpha, [alpha, beta], [], '1.0.0');
  assert.match(missing ?? '', /Turn on Beta before turning on Alpha/);

  const old = reasonToRefuseEnable(
    alpha,
    [alpha, beta],
    [{ key: 'beta', version: '1.0.0', enabled: true }],
    '1.0.0',
  );
  assert.equal(old, null);

  const tooNew = sample('alpha', { beta: '^2.0.0' });
  const version = reasonToRefuseEnable(
    tooNew,
    [tooNew, beta],
    [{ key: 'beta', version: '1.0.0', enabled: true }],
    '1.0.0',
  );
  assert.match(version ?? '', /Beta is version 1\.0\.0/);
});

test('KRN-REG-04 turning off an extension names what still needs it', () => {
  const alpha = sample('alpha');
  const beta = sample('beta', { alpha: '^1.0.0' });
  const blocked = reasonToRefuseDisable('alpha', [alpha, beta], ['alpha', 'beta']);
  assert.match(blocked ?? '', /Turn off Beta before turning off Alpha/);
  assert.equal(reasonToRefuseDisable('alpha', [alpha, beta], ['alpha']), null);
});

function sample(key: string, extensions: Record<string, string> = {}): ExtensionManifest {
  const name = key.charAt(0).toUpperCase() + key.slice(1);
  return parseManifest({
    manifestVersion: 1,
    key,
    type: 'plugin',
    version: '1.0.0',
    name: { en: name, sw: name },
    description: { en: name, sw: name },
    publisher: 'nottech',
    license: 'MIT',
    requires: { core: '^1.0.0', extensions },
    settings: [],
    provides: [],
    outboundHosts: [],
  });
}
