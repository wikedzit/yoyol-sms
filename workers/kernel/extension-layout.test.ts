import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import test from 'node:test';
import { extensionLayoutProblems, kernelOwnedTables } from './extension-layout.ts';
import { parseManifest } from './manifest.ts';
import { parseModuleMigration, tablesInMigration } from './module-schema.ts';

const repoRoot = join(import.meta.dirname, '../..');
const kernelRoot = import.meta.dirname;

function bundledPackages(): { key: string; root: string; importPrefix: string }[] {
  const grouped = ['modules', 'plugins'].flatMap((folder) =>
    readdirSync(join(repoRoot, folder), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        key: entry.name,
        root: join(repoRoot, folder, entry.name),
        importPrefix: `${folder}/${entry.name}`,
      })),
  );
  return [
    ...grouped,
    { key: 'themes', root: join(repoRoot, 'themes'), importPrefix: 'themes' },
  ];
}

const tablesOwnedByModule: Record<string, readonly string[]> = {
  academics: [
    'academic_levels',
    'academic_streams',
    'academic_forms',
    'form_classes',
    'subjects',
    'classes',
    'class_subjects',
    'form_class_subjects',
    'subject_combinations',
    'combination_subjects',
  ],
  students: ['students', 'student_guardians', 'student_subjects'],
  staff: ['teachers', 'teacher_classes', 'teacher_subjects', 'teacher_form_classes'],
  assessment: ['grades'],
  attendance: ['records'],
  finance: [
    'fee_items',
    'structures',
    'invoices',
    'lines',
    'payments',
    'allocations',
    'receipts',
    'provider_payments',
  ],
  timetable: ['periods', 'entries'],
  'lesson-plans': ['templates', 'plans'],
  discipline: ['types', 'severities', 'incidents'],
  clubs: ['clubs', 'memberships', 'activities'],
  leadership: ['positions', 'appointments'],
  reports: ['previews'],
  notices: ['notices'],
};

test('KRN-REG-03 every bundled extension follows the kernel layout', () => {
  const manifestRegistry = readFileSync(join(kernelRoot, 'bundled-manifests.ts'), 'utf8');
  const entrypointRegistry = readFileSync(join(kernelRoot, 'bundled-entrypoints.ts'), 'utf8');
  const migrationRegistry = readFileSync(join(kernelRoot, 'bundled-migrations.ts'), 'utf8');
  const seenTables = new Map<string, string>();

  for (const entry of bundledPackages()) {
    const root = entry.root;
    const files = filesUnder(root);
    const manifest = parseManifest(JSON.parse(readFileSync(join(root, 'yoyol.extension.json'), 'utf8')));
    assert.equal(manifest.key, entry.key);
    assert.deepEqual(extensionLayoutProblems({ key: manifest.key, type: manifest.type, files }), []);
    assert.match(manifestRegistry, new RegExp(`${entry.importPrefix}/yoyol.extension.json`));
    assert.match(entrypointRegistry, new RegExp(`${entry.importPrefix}/entrypoint`));
    const localeRegistry = readFileSync(join(kernelRoot, 'bundled-locales.ts'), 'utf8');
    assert.match(localeRegistry, new RegExp(`${entry.importPrefix}/locales/en.json`));
    assert.match(localeRegistry, new RegExp(`${entry.importPrefix}/locales/sw.json`));
    assertLocale(join(root, 'locales/en.json'));
    assertLocale(join(root, 'locales/sw.json'));

    const schemaFiles = files.filter((file) => file.startsWith('schema/'));
    for (const file of schemaFiles) {
      assert.match(migrationRegistry, new RegExp(`${entry.importPrefix}/${file}`));
    }
    if (manifest.type === 'plugin') {
      assert.deepEqual(schemaFiles, []);
      continue;
    }

    const expected = tablesOwnedByModule[manifest.key];
    assert.ok(expected, `${manifest.key} must declare the tables it owns.`);
    const created: string[] = [];
    for (const file of schemaFiles) {
      const migration = parseModuleMigration(JSON.parse(readFileSync(join(root, file), 'utf8')));
      assert.equal(`${migration.id}.json`, file.slice('schema/'.length));
      created.push(...tablesInMigration(migration));
    }
    assert.deepEqual(created, [...expected]);

    for (const table of created) {
      assert.equal(kernelOwnedTables.includes(table as (typeof kernelOwnedTables)[number]), false);
      const owner = seenTables.get(table);
      assert.equal(owner, undefined, `${table} is already owned by ${owner}.`);
      seenTables.set(table, manifest.key);
    }
  }
});

test('KRN-REG-03 a plugin cannot keep schema migrations', () => {
  const problems = extensionLayoutProblems({
    key: 'hello',
    type: 'plugin',
    files: [
      'yoyol.extension.json',
      'entrypoint.ts',
      'README.md',
      'locales/en.json',
      'locales/sw.json',
      'schema/001_initial.json',
    ],
  });
  assert.match(problems.join(' '), /cannot contain schema/);
});

function filesUnder(root: string, directory = root): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...filesUnder(root, path));
      continue;
    }
    found.push(relative(root, path).split(sep).join('/'));
  }
  return found;
}

function assertLocale(path: string) {
  const locale = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  assert.equal(typeof locale, 'object');
  for (const value of Object.values(locale)) {
    assert.equal(typeof value, 'string');
  }
}
