import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDate, formatMoney, formatNumber, translate } from './locale-format.ts';

const catalog = {
  en: { 'invoices.count': '{count} invoices' },
  sw: { 'invoices.count': 'Ankara {count}' },
};

test('KRN-SVC-07 a catalog uses Swahili and falls back to English', () => {
  assert.equal(translate(catalog, 'sw', 'invoices.count', { count: 3 }), 'Ankara 3');
  assert.equal(translate({ en: { title: 'Students' }, sw: {} }, 'sw', 'title'), 'Students');
  assert.equal(translate({ en: {}, sw: {} }, 'en', 'missing.key'), 'missing.key');
});

test('KRN-SVC-07 dates, numbers, and money follow the language', () => {
  assert.equal(formatDate('2026-10-02', 'en'), '2 October 2026');
  assert.equal(formatDate('2026-10-02', 'sw'), '2 Oktoba 2026');
  assert.equal(formatDate('not-a-date', 'en'), 'not-a-date');
  assert.equal(formatMoney(1_500_000, 'TZS', 'en'), 'TZS 15,000.00');
  assert.match(formatMoney(1_500_000, 'TZS', 'sw'), /^TZS 15/);
  assert.match(formatNumber(0.934, 'en', 'percent'), /93/);
  assert.equal(formatNumber(1234.5, 'en'), '1,234.5');
});
