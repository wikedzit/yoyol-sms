import assert from 'node:assert/strict';
import test from 'node:test';
import { createPostgresAdapter } from './postgres-adapter.ts';

test('KRN-DAT-03 postgres refuses to start without DATABASE_URL', async () => {
  await assert.rejects(createPostgresAdapter(''), /DATABASE_URL/);
});
