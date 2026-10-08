import assert from 'node:assert/strict';
import test from 'node:test';
import { fakeExtensionContext } from './test-kit.ts';

test('SDK-05 a fake core exposes only the grants the test gives it', async () => {
  const hidden = fakeExtensionContext({
    settings: { greeting: 'Habari' },
    students: [{ id: 4 }],
  });
  assert.equal(await hidden.settings.get('greeting'), 'Habari');
  assert.equal(hidden.core.students, undefined);
  assert.equal(hidden.notifications, undefined);

  const granted = fakeExtensionContext({
    students: [{ id: 4 }],
    grants: ['core.students:read', 'notifications:send'],
  });
  assert.deepEqual(await granted.core.students?.list(), [{ id: 4 }]);
  await granted.notifications?.send({ userId: 2, title: 'Saved', body: 'Done' });
  assert.deepEqual(granted.notificationsSent, [{ userId: 2, title: 'Saved', body: 'Done' }]);
});
