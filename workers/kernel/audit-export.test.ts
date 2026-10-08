import assert from 'node:assert/strict';
import test from 'node:test';
import { auditCsv, auditSearchPattern } from './audit-export.ts';

test('KRN-SVC-09 audit export is csv and search ignores wildcard characters', () => {
  const csv = auditCsv([
    { action: 'extension.setting.update', extensionKey: 'hello', target: 'greeting', detail: 'saved, now' },
  ]);
  assert.match(csv, /^action,extension,target,detail/);
  assert.match(csv, /"saved, now"/);
  assert.equal(auditSearchPattern('  hello% '), '%hello%');
  assert.equal(auditSearchPattern('   '), null);
});
