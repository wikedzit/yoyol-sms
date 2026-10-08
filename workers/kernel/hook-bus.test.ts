import assert from 'node:assert/strict';
import test from 'node:test';
import { runHook } from './hook-bus.ts';

test('KRN-EVT-01 handlers run in priority order and a failure is skipped', async () => {
  const seen: string[] = [];
  const logs: string[] = [];
  const result = await runHook({
    hookName: 'student.displayName',
    payload: 'Amina',
    log: (message) => logs.push(message),
    handlers: [
      {
        extensionKey: 'late',
        priority: 100,
        run: async (payload) => {
          seen.push('late');
          return `${String(payload)} late`;
        },
      },
      {
        extensionKey: 'early',
        priority: 10,
        run: async (payload) => {
          seen.push('early');
          return `${String(payload)} early`;
        },
      },
      {
        extensionKey: 'broken',
        priority: 50,
        run: async () => {
          throw new Error('boom');
        },
      },
    ],
  });

  assert.deepEqual(seen, ['early', 'late']);
  assert.equal(result.value, 'Amina early late');
  assert.deepEqual(result.skipped, [{ extensionKey: 'broken', reason: 'failed' }]);
  assert.match(logs[0] ?? '', /broken was skipped/);
});

test('KRN-EVT-01 a handler that exceeds the time budget is skipped', async () => {
  const result = await runHook({
    hookName: 'student.displayName',
    payload: 'Amina',
    budgetMs: 15,
    log: () => undefined,
    handlers: [
      {
        extensionKey: 'slow',
        priority: 10,
        run: () => new Promise((resolve) => setTimeout(() => resolve('too late'), 40)),
      },
      {
        extensionKey: 'fast',
        priority: 20,
        run: async (payload) => `${String(payload)} fast`,
      },
    ],
  });

  assert.equal(result.value, 'Amina fast');
  assert.deepEqual(result.skipped, [{ extensionKey: 'slow', reason: 'timedOut' }]);
});

test('KRN-EVT-02 a blocking hook stops the operation', async () => {
  let laterRan = false;
  const result = await runHook({
    hookName: 'student.beforeCreate',
    mode: 'blocking',
    payload: { firstName: '' },
    log: () => undefined,
    handlers: [
      {
        extensionKey: 'students',
        priority: 10,
        run: async () => ({ fieldErrors: { firstName: { en: 'Enter a name.', sw: 'Weka jina.' } } }),
      },
      {
        extensionKey: 'later',
        priority: 20,
        run: async () => {
          laterRan = true;
          return { ok: true };
        },
      },
    ],
  });

  assert.equal(result.stopped, true);
  assert.equal(result.fieldErrors.firstName.en, 'Enter a name.');
  assert.equal(laterRan, false);
});
