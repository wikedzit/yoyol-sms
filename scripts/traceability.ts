import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { idsWithoutTests } from '../workers/kernel/traceability.ts';

const root = join(import.meta.dirname, '..');
const catalog = readFileSync(join(root, 'docs/features.md'), 'utf8');
const tests = readTests(join(root, 'workers/kernel'));
const missing = idsWithoutTests(catalog, tests);
console.log(`${missing.length} feature ids have no kernel test mention.`);
for (const id of missing) console.log(id);

function readTests(directory: string): string {
  const parts: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) parts.push(readTests(path));
    else if (entry.name.endsWith('.test.ts')) parts.push(readFileSync(path, 'utf8'));
  }
  return parts.join('\n');
}
