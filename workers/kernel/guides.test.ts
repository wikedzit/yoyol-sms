import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('DOC-07 role guides exist in English and Swahili', () => {
  const english = readFileSync(new URL('../../docs/guides/roles.en.md', import.meta.url), 'utf8');
  const swahili = readFileSync(new URL('../../docs/guides/roles.sw.md', import.meta.url), 'utf8');
  for (const heading of ['Admin', 'Teacher', 'Finance', 'Student', 'Parent']) {
    assert.match(english, new RegExp(`## ${heading}`));
  }
  for (const heading of ['Msimamizi', 'Mwalimu', 'Fedha', 'Mwanafunzi', 'Mzazi']) {
    assert.match(swahili, new RegExp(`## ${heading}`));
  }
});

test('DOC-02 DOC-05 DOC-08 DOC-09 the written guides match the app', () => {
  const architecture = readFileSync(new URL('../../docs/architecture.md', import.meta.url), 'utf8');
  const developer = readFileSync(new URL('../../docs/extension-developer-guide.md', import.meta.url), 'utf8');
  const incidents = readFileSync(new URL('../../docs/security-incidents.md', import.meta.url), 'utf8');
  const quickstart = readFileSync(new URL('../../docs/contributor-quickstart.md', import.meta.url), 'utf8');
  assert.match(architecture, /Kernel and extensions/);
  assert.match(developer, /YOYOL_SIGNING_KEY/);
  assert.match(incidents, /revoke/i);
  assert.match(quickstart, /pnpm db:migrate/);
});

test('DOC-06 the deployment guide covers local D1 and names the missing image', () => {
  const guide = readFileSync(new URL('../../docs/deployment.md', import.meta.url), 'utf8');
  assert.match(guide, /pnpm db:migrate/);
  assert.match(guide, /Docker/);
  assert.match(guide, /not configured/i);
});

test('DOC-01 governance files name the feature they cover', () => {
  const contributing = readFileSync(new URL('../../CONTRIBUTING.md', import.meta.url), 'utf8');
  const changelog = readFileSync(new URL('../../CHANGELOG.md', import.meta.url), 'utf8');
  assert.match(contributing, /feature id/i);
  assert.match(changelog, /Semantic Versioning/);
});
