import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildThemeCss,
  defaultThemeKey,
  parseThemePackage,
  themesOfferedToSchool,
} from './theme-document.ts';

const defaultTheme = readFileSync(
  new URL('../themes/yoyol-default.json', import.meta.url),
  'utf8',
);
const coastalTheme = readFileSync(
  new URL('../themes/coastal.json', import.meta.url),
  'utf8',
);
const greenTheme = readFileSync(
  new URL('../themes/green.json', import.meta.url),
  'utf8',
);

test('the bundled YOYOL theme does not override the current colours', () => {
  const document = parseThemePackage(defaultTheme);
  assert.equal(document.key, defaultThemeKey);
  assert.equal(buildThemeCss(document), null);
});

test('the green system theme overrides the brand colours', () => {
  const document = parseThemePackage(greenTheme);
  const css = buildThemeCss(document);
  assert.equal(document.key, 'green');
  assert.ok(css);
  assert.match(css, /--primary: #15803d;/);
  assert.match(css, /--primary-end: #22c55e;/);
});

test('a school sees both system themes, and a saved copy does not list twice', () => {
  const yoyol = parseThemePackage(defaultTheme);
  const green = parseThemePackage(greenTheme);
  const offered = themesOfferedToSchool([yoyol, green], [
    { key: 'green', nameEn: 'Green', nameSw: 'Kijani', isActive: true },
    { key: 'riverside', nameEn: 'Riverside', nameSw: 'Riverside', isActive: false },
  ]);

  assert.deepEqual(
    offered.map((theme) => [theme.key, theme.isActive, theme.isBundled]),
    [
      ['yoyol', false, true],
      ['green', true, true],
      ['riverside', false, false],
    ],
  );
});

test('an uploaded theme becomes CSS variables and nothing else', () => {
  const document = parseThemePackage(coastalTheme);
  const css = buildThemeCss(document);
  assert.ok(css);
  assert.match(css, /--primary: #0f766e;/);
  assert.match(css, /--primary-end: #0f766e;/);
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
