import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { dictionaryMarkdown, tablesInModuleSchema, tablesInSql } from '../workers/kernel/data-dictionary.ts';

const root = join(import.meta.dirname, '..');
const sqlDirectory = join(root, 'workers/drizzle');
const sqlTables = readdirSync(sqlDirectory)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => ({
    file,
    tables: tablesInSql(readFileSync(join(sqlDirectory, file), 'utf8')),
  }));

const extensionsRoot = join(root, 'extensions');
const moduleTables = readdirSync(extensionsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
  .map((extension) => {
    const schemaRoot = join(extensionsRoot, extension, 'schema');
    let tables: string[] = [];
    try {
      tables = readdirSync(schemaRoot)
        .filter((file) => file.endsWith('.json'))
        .sort()
        .flatMap((file) => tablesInModuleSchema(readFileSync(join(schemaRoot, file), 'utf8')));
    } catch {
      tables = [];
    }
    return { extension, tables };
  });

const target = join(root, 'docs/data-dictionary.md');
writeFileSync(target, dictionaryMarkdown({ sqlTables, moduleTables }));
console.log(`Wrote ${target}.`);
