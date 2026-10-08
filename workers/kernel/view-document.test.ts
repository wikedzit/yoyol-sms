import assert from 'node:assert/strict';
import test from 'node:test';
import { parseViewDocument, view, viewDocumentError } from './view-document.ts';

test('KRN-UIX-02 a hello page is a view document', () => {
  const document = view.page('hello.title', [view.text('hello.description')]);
  const parsed = parseViewDocument(document);
  assert.equal(parsed.viewVersion, 1);
  assert.equal(parsed.body.length, 1);
});

test('KRN-UIX-02 an unknown node is rejected', () => {
  const message = viewDocumentError({
    viewVersion: 1,
    title: { t: 'hello.title' },
    body: [{ type: 'html', value: '<script>' }],
  });
  assert.ok(message);
});

test('KRN-UIX-02 a link must stay inside the app', () => {
  const message = viewDocumentError({
    viewVersion: 1,
    title: 'Hello',
    body: [{ type: 'link', label: 'Outside', href: 'https://example.com' }],
  });
  assert.match(message ?? '', /inside the app/);
});

test('KRN-UIX-03 a document over 256 KB is rejected', () => {
  const message = viewDocumentError({
    viewVersion: 1,
    title: 'Hello',
    body: [{ type: 'text', value: 'x'.repeat(300 * 1024) }],
  });
  assert.match(message ?? '', /too large/);
});
