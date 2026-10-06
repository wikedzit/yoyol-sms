import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildThemeCss,
  defaultThemeKey,
  parseThemePackage,
} from './theme-document.ts';

const defaultTheme = readFileSync(
  new URL('../themes/yoyol-default.json', import.meta.url),
  'utf8',
);
const coastalTheme = readFileSync(
  new URL('../themes/coastal.json', import.meta.url),
  'utf8',
);

test('the bundled YOYOL theme does not override the current colours', () => {
  const document = parseThemePackage(defaultTheme);
  assert.equal(document.key, defaultThemeKey);
  assert.equal(buildThemeCss(document), null);
});

test('an uploaded theme becomes CSS variables and nothing else', () => {
  const document = parseThemePackage(coastalTheme);
  const css = buildThemeCss(document);
  assert.ok(css);
  assert.match(css, /--primary: #0f766e;/);
  assert.equal(css.includes('<'), false);
  assert.equal(css.includes('expression'), false);
});

test('a theme cannot smuggle extra fields or non-hex colours', () => {
  const coastal = JSON.parse(coastalTheme) as {
    light: { primary: string };
  };
  coastal.light.primary = 'red; } body { background: url(https://evil)';

  assert.throws(() => parseThemePackage(JSON.stringify(coastal)));
  assert.throws(() =>
    parseThemePackage(JSON.stringify({ ...JSON.parse(coastalTheme), extra: true })),
  );
});
