import assert from 'node:assert/strict';
import test from 'node:test';
import { createExtensionLog, redact } from './log.ts';

test('KRN-SVC-10 a log line carries the request id and the extension', () => {
  const lines: string[] = [];
  createExtensionLog('hello', { requestId: 'req-7', write: (line) => lines.push(line) }).info('Page rendered');

  const line = JSON.parse(lines[0]) as { severity: string; requestId: string; extensionKey: string; message: string };
  assert.equal(line.severity, 'info');
  assert.equal(line.requestId, 'req-7');
  assert.equal(line.extensionKey, 'hello');
  assert.equal(line.message, 'Page rendered');
});

test('KRN-SVC-10 secrets and email addresses are redacted', () => {
  const lines: string[] = [];
  createExtensionLog('hello', { write: (line) => lines.push(line) }).error('Mail to admin@gmail.com failed', {
    password: 'admin123',
    email: 'admin@gmail.com',
    phone: '+255700000000',
    title: 'Setting saved',
  });

  const line = JSON.parse(lines[0]) as { message: string; details: Record<string, string>; requestId: string };
  assert.equal(line.requestId, 'none');
  assert.equal(line.message, 'Mail to [redacted] failed');
  assert.equal(line.details.password, '[redacted]');
  assert.equal(line.details.email, '[redacted]');
  assert.equal(line.details.phone, '[redacted]');
  assert.equal(line.details.title, 'Setting saved');
  assert.equal(JSON.stringify(line).includes('admin123'), false);
  assert.equal(JSON.stringify(line).includes('admin@gmail.com'), false);
  assert.deepEqual(redact({ token: 'abc' }), { token: '[redacted]' });
});
