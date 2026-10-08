import assert from 'node:assert/strict';
import test from 'node:test';
import { collectSlotContributions, coreSlotNames } from './slots.ts';

const widget = { viewVersion: 1, title: 'hello.title', body: [{ type: 'text', value: 'hello.description' }] };

test('KRN-UIX-06 slot contributions keep a valid view document and drop the rest', async () => {
  assert.equal(coreSlotNames.includes('dashboard.widgets'), true);
  const contributions = await collectSlotContributions({
    slotName: 'dashboard.widgets',
    handlers: [
      { extensionKey: 'broken', priority: 10, run: async () => { throw new Error('no'); } },
      { extensionKey: 'hello', priority: 100, run: async () => ({ document: widget }) },
      { extensionKey: 'outside', priority: 110, run: async () => ({ label: 'Away', href: 'https://example.com' }) },
    ],
  });
  assert.deepEqual(contributions.map((item) => item.extensionKey), ['hello']);
  assert.equal(contributions[0].document, widget);
});

test('KRN-UIX-06 a navigation slot only accepts an in-app link', async () => {
  const contributions = await collectSlotContributions({
    slotName: 'navigation.items',
    handlers: [
      { extensionKey: 'hello', priority: 100, run: async () => ({ label: 'hello.title', href: '/x/hello' }) },
      { extensionKey: 'bad', priority: 100, run: async () => ({ label: 'Away', href: '//evil.example' }) },
    ],
  });
  assert.deepEqual(contributions.map((item) => item.href), ['/x/hello']);
});
