import assert from 'node:assert/strict';
import test from 'node:test';
import { idsWithoutTests } from './traceability.ts';

test('ENG-12 a feature with no test is flagged and a covered id is not', () => {
  const catalog = 'SDK-CLI-01 creates a folder. DOC-01 lists the governance files.';
  const tests = 'test SDK-CLI-01 create writes a plugin';
  assert.deepEqual(idsWithoutTests(catalog, tests), ['DOC-01']);
});
