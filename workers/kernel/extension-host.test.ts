import assert from 'node:assert/strict';
import test from 'node:test';
import { createBundledExtensionHost, createDynamicWorkerExtensionHost, emptyContext, type ExtensionHost } from './extension-host.ts';
import type { ExtensionEntrypoint } from './sdk.ts';

function entrypoint(overrides: Partial<ExtensionEntrypoint> = {}): ExtensionEntrypoint {
  return {
    manifest: { key: 'hello', type: 'plugin', version: '1.0.0' },
    onEnable: async () => undefined,
    onUpgrade: async () => undefined,
    onDisable: async () => undefined,
    handlePage: async () => ({ kind: 'view', document: { title: 'Hello' } }),
    handleAction: async () => ({ ok: true }),
    runHook: async (_name, payload) => payload,
    handleEvent: async () => undefined,
    ...overrides,
  };
}

function hostFor(found: ExtensionEntrypoint | null, pageMs = 5_000): ExtensionHost {
  return createBundledExtensionHost(() => found, { pageMs, hookMs: 30, eventMs: 30 });
}

test('RUN-01 a host returns the entrypoint for an installed version', async () => {
  const host = hostFor(entrypoint());
  const opened = await host.getEntrypoint({ key: 'hello', version: '1.0.0' }, []);
  const page = await opened.handlePage({ path: '/' }, emptyContext);
  assert.equal(page.kind, 'view');
});

test('RUN-02 the bundled host calls the in-process entrypoint', async () => {
  let enabled = false;
  const host = hostFor(entrypoint({
    onEnable: async () => {
      enabled = true;
    },
  }));
  const opened = await host.getEntrypoint({ key: 'hello', version: '1.0.0' }, ['core.students:read']);
  await opened.onEnable(emptyContext);
  assert.equal(enabled, true);
});

test('RUN-02 a missing bundled entrypoint is refused', async () => {
  const host = hostFor(null);
  await assert.rejects(
    () => host.getEntrypoint({ key: 'missing', version: '1.0.0' }, []),
    /missing is not bundled/,
  );
});

test('RUN-03 the dynamic host loads one version and only its grants', async () => {
  let seenId = '';
  let seenGrants: unknown = null;
  const host = createDynamicWorkerExtensionHost({
    loader: {
      async get(id, options) {
        seenId = id;
        seenGrants = options.env.grants;
        assert.equal(options.globalOutbound, null);
        return { getEntrypoint: async () => entrypoint() };
      },
    },
    readBundle: async () => new Uint8Array([1]),
  });
  const opened = await host.getEntrypoint({ key: 'hello', version: '1.2.0' }, ['core.students:read']);
  assert.equal(seenId, 'hello@1.2.0');
  assert.deepEqual(seenGrants, ['core.students:read']);
  assert.equal((await opened.handlePage({ path: '/' }, emptyContext)).kind, 'view');
});

test('RUN-03 a missing Worker Loader refuses to start an installed package', async () => {
  const host = createDynamicWorkerExtensionHost({
    loader: null,
    readBundle: async () => new Uint8Array([1]),
  });
  await assert.rejects(
    () => host.getEntrypoint({ key: 'hello', version: '1.0.0' }, []),
    /Worker Loader binding/,
  );
});

test('RUN-12 a revoked version is not loaded', async () => {
  let loaded = false;
  const host = createDynamicWorkerExtensionHost({
    loader: {
      async get() {
        loaded = true;
        return { getEntrypoint: async () => entrypoint() };
      },
    },
    readBundle: async () => new Uint8Array([1]),
    isRevoked: () => true,
  });
  await assert.rejects(
    () => host.getEntrypoint({ key: 'hello', version: '1.0.0' }, []),
    /was turned off/,
  );
  assert.equal(loaded, false);
});

test('RUN-05 a page that runs too long is stopped', async () => {
  const host = hostFor(entrypoint({
    handlePage: () => new Promise(() => undefined),
  }), 20);
  const opened = await host.getEntrypoint({ key: 'hello', version: '1.0.0' }, []);
  await assert.rejects(
    () => opened.handlePage({ path: '/' }, emptyContext),
    /This page took longer than 20 ms/,
  );
});
