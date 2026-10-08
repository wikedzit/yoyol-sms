import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { defineModule, definePlugin } from './sdk.ts';

function packageDirectory(key: string): string {
  const repoRoot = join(import.meta.dirname, '../..');
  const candidates = [join(repoRoot, 'modules', key), join(repoRoot, 'plugins', key), join(repoRoot, key)];
  const match = candidates.find((directory) => {
    try {
      readFileSync(join(directory, 'yoyol.extension.json'));
      return true;
    } catch {
      return false;
    }
  });
  if (!match) {
    throw new Error(`No package named ${key}.`);
  }
  return match;
}

function contextFor(schoolId: number) {
  return {
    schoolId,
    settings: { get: async () => null },
    core: {},
    log: { info() {}, error() {} },
  };
}

function readManifest(key: string) {
  return JSON.parse(readFileSync(join(packageDirectory(key), 'yoyol.extension.json'), 'utf8'));
}

test('SDK-01 definePlugin builds a plugin entrypoint', async () => {
  let enabledSchool = 0;
  const plugin = definePlugin({
    manifest: readManifest('email'),
    onEnable(context) {
      enabledSchool = context.schoolId;
    },
  });

  await plugin.onEnable(contextFor(4));
  assert.equal(plugin.manifest.key, 'email');
  assert.equal(plugin.manifest.type, 'plugin');
  assert.equal(enabledSchool, 4);
  const page = await plugin.handlePage({ path: '/' }, contextFor(4));
  assert.equal(page.kind, 'notFound');
});

test('SDK-01 a plugin cannot declare permissions', () => {
  const email = readManifest('email');
  assert.throws(
    () => definePlugin({
      manifest: {
        ...email,
        permissions: [{ key: 'email.send' }],
      },
    }),
    /plugin cannot declare/,
  );
});

test('SDK-02 an entrypoint can read a setting from its context', async () => {
  let greeting: string | null = null;
  const plugin = definePlugin({
    manifest: readManifest('email'),
    async runHook(_name, _payload, context) {
      greeting = await context.settings.get('greeting');
      assert.equal(context.core.students, undefined);
      return null;
    },
  });

  await plugin.runHook('dashboard.widgets', {}, {
    schoolId: 1,
    settings: { get: async () => 'Habari' },
    core: {},
    log: { info() {}, error() {} },
  });
  assert.equal(greeting, 'Habari');
});

test('SDK-01 definePlugin rejects a module manifest', () => {
  assert.throws(
    () => definePlugin({ manifest: readManifest('students') }),
    /only accepts a plugin/,
  );
});

test('SDK-01 defineModule serves a declared page', async () => {
  const students = defineModule({
    manifest: readManifest('students'),
    pages: {
      '/list': () => ({ title: 'Students' }),
    },
  });

  const page = await students.handlePage({ path: '/list' }, contextFor(1));
  assert.deepEqual(page, { kind: 'view', document: { title: 'Students' } });
  const missing = await students.handlePage({ path: '/missing' }, contextFor(1));
  assert.equal(missing.kind, 'notFound');
});
