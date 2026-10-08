import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { apiDocument, pageOf } from './openapi.ts';

test('KRN-SVC-13 the API document is OpenAPI 3.1 and pages stay inside the limit', () => {
  const document = apiDocument();
  assert.equal(document.openapi, '3.1.0');
  assert.ok(document.paths['/api/v1/schools']);

  const page = pageOf(['a', 'b', 'c', 'd'], 2, 1);
  assert.deepEqual(page.data, ['b', 'c']);
  assert.deepEqual(page.page, { limit: 2, offset: 1, total: 4 });
  assert.equal(pageOf(['a'], 500, 0).page.limit, 100);
});

test('DOC-04 the API guide lists every path in the OpenAPI document', () => {
  const guide = readFileSync(new URL('../../docs/api.md', import.meta.url), 'utf8');
  for (const path of Object.keys(apiDocument().paths)) {
    assert.match(guide, new RegExp(path.replaceAll('/', '\\/')));
  }
});
