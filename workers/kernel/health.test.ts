import assert from 'node:assert/strict';
import test from 'node:test';
import { healthReport } from './health.ts';

test('KRN-SVC-12 a healthy app reports the queue as not configured', () => {
  const report = healthReport({ database: 'ok', extensionHost: 'ok' });
  assert.equal(report.status, 'ok');
  assert.equal(report.checks.queue, 'not_configured');
  assert.equal(report.checks.database, 'ok');
  assert.equal(report.checks.extensionHost, 'ok');
});

test('KRN-SVC-12 a database failure marks the app down', () => {
  const report = healthReport({ database: 'down', extensionHost: 'ok' });
  assert.equal(report.status, 'down');
});
