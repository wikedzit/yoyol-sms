import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const drizzleRoot = join(import.meta.dirname, '../drizzle');

test('REP-02 the journal lists each SQL file once and does not repeat a number', () => {
  const journal = JSON.parse(readFileSync(join(drizzleRoot, 'meta/_journal.json'), 'utf8')) as {
    entries: { tag: string; idx: number }[];
  };
  const tags = journal.entries.map((entry) => entry.tag);
  const files = readdirSync(drizzleRoot).filter((file) => file.endsWith('.sql')).map((file) => file.slice(0, -4));
  assert.deepEqual([...tags].sort(), [...files].sort());
  assert.equal(new Set(tags).size, tags.length);

  const numbers = tags.map((tag) => tag.slice(0, 4));
  const repeated = numbers.filter((number, index) => numbers.indexOf(number) !== index);
  assert.deepEqual([...new Set(repeated)], []);

  const indexes = journal.entries.map((entry) => entry.idx);
  assert.deepEqual(indexes, indexes.map((_, index) => index));
});

test('REP-02 a table created more than once uses IF NOT EXISTS', () => {
  const files = readdirSync(drizzleRoot).filter((file) => file.endsWith('.sql'));
  const creates = new Map<string, { guarded: boolean }[]>();
  for (const file of files) {
    const sql = readFileSync(join(drizzleRoot, file), 'utf8');
    for (const match of sql.matchAll(/CREATE TABLE( IF NOT EXISTS)? [`"]?([A-Za-z0-9_]+)/g)) {
      const name = match[2];
      if (!name || name.startsWith('__new_')) continue;
      const list = creates.get(name) ?? [];
      list.push({ guarded: Boolean(match[1]) });
      creates.set(name, list);
    }
  }
  for (const [name, list] of creates) {
    if (list.length < 2) continue;
    assert.equal(list.every((item) => item.guarded), true, `${name} is created more than once without IF NOT EXISTS`);
  }
});
