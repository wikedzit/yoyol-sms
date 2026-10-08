import assert from 'node:assert/strict';
import test from 'node:test';
import { notificationRetentionMs, notificationsDueForRemoval } from './retention.ts';

test('KRN-DAT-12 only messages older than one year are removed', () => {
  const now = Date.parse('2026-10-07T00:00:00.000Z');
  const due = notificationsDueForRemoval([
    { id: 1, createdAt: now - notificationRetentionMs - 1 },
    { id: 2, createdAt: now - 1000 },
  ], now);
  assert.deepEqual(due, [1]);
});
