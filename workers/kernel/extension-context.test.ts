import assert from 'node:assert/strict';
import test from 'node:test';
import { createExtensionContext } from './extension-context.ts';

test('SDK-02 the context only exposes capabilities the school granted', async () => {
  let listed = false;
  let sent = false;
  const context = createExtensionContext({
    schoolId: 1,
    granted: [],
    settings: { get: async () => 'Hello' },
    students: { list: async () => { listed = true; return []; } },
    notifications: { send: async () => { sent = true; } },
    log: { info() {}, error() {} },
  });

  assert.equal(await context.settings.get('greeting'), 'Hello');
  assert.equal(context.core.students, undefined);
  assert.equal(context.notifications, undefined);
  assert.equal(listed, false);
  assert.equal(sent, false);
});

test('SDK-02 a granted capability is present on the context', () => {
  const context = createExtensionContext({
    schoolId: 1,
    granted: ['core.students:read', 'notifications:send'],
    settings: { get: async () => null },
    students: { list: async () => [] },
    notifications: { send: async () => undefined },
    log: { info() {}, error() {} },
  });
  assert.equal(typeof context.core.students?.list, 'function');
  assert.equal(typeof context.notifications?.send, 'function');
});
