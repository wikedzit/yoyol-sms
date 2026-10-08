import assert from 'node:assert/strict';
import test from 'node:test';
import { dictionaryMarkdown, tablesInModuleSchema, tablesInSql } from './data-dictionary.ts';

test('DOC-03 the dictionary names kernel tables and module tables', () => {
  assert.deepEqual(tablesInSql('CREATE TABLE trusted_publishers (\n  id INTEGER\n);\nCREATE UNIQUE INDEX trusted_publishers_key ON trusted_publishers (publisher);'), ['trusted_publishers']);
  assert.deepEqual(tablesInModuleSchema(JSON.stringify({
    operations: [{ op: 'createTable', name: 'previews' }],
  })), ['previews']);
  const markdown = dictionaryMarkdown({
    sqlTables: [{ file: '0079_publishers.sql', tables: ['trusted_publishers'] }],
    moduleTables: [{ extension: 'lesson-plans', tables: ['plans'] }],
  });
  assert.match(markdown, /trusted_publishers/);
  assert.match(markdown, /mod_lesson_plans_plans/);
});
