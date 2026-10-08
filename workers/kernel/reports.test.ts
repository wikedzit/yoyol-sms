import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dashboardForRole,
  linesFromWidget,
  majorAmount,
  previewImport,
  roleDashboardLine,
  toCsv,
} from './reports.ts';

test('MOD-RPT-01 a role dashboard keeps widgets for that role', () => {
  const widgets = [
    { name: 'Hello', lines: ['Hello from the school.'] },
    { name: 'Classes', roles: ['teacher'], lines: ['Mathematics, 1A'] },
    { name: 'Fees', roles: ['admin'], lines: ['Term fees'] },
  ];
  assert.deepEqual(dashboardForRole('teacher', widgets).map((widget) => widget.name), ['Hello', 'Classes']);
  assert.deepEqual(dashboardForRole('admin', widgets).map((widget) => widget.name), ['Hello', 'Fees']);
  assert.equal(roleDashboardLine({
    role: 'admin',
    studentCount: 2,
    staffCount: 1,
    assignments: [],
    names: [],
  }), 'Admin: 2 students, 1 staff.');
  assert.equal(roleDashboardLine({
    role: 'teacher',
    studentCount: 0,
    staffCount: 0,
    assignments: ['Mathematics, 1A'],
    names: [],
  }), 'Teacher: Mathematics, 1A.');
  assert.equal(roleDashboardLine({
    role: 'student',
    studentCount: 0,
    staffCount: 0,
    assignments: [],
    names: ['Amina Juma Hassan'],
  }), 'Student: Amina Juma Hassan.');
  assert.deepEqual(linesFromWidget(
    [{ type: 'text', value: { t: 'hello.description' } }],
    { 'hello.description': 'Hello from the school.' },
  ), ['Hello from the school.']);
});

test('MOD-RPT-02 a spreadsheet is previewed before it can be saved', () => {
  const refused = previewImport({
    kind: 'students',
    text: 'firstName,lastName,admissionNumber,gender\nReport,,RPT-001,Female\n',
    admissionNumbers: ['ADM-001'],
    staffEmails: [],
    classes: [],
    feeCodes: [],
    feeKeys: [],
  });
  assert.equal(refused.ready, false);
  assert.deepEqual(refused.lines, ['Row 2: Enter the last name.']);

  const duplicate = previewImport({
    kind: 'fees',
    text: 'className,feeCode,amount\n1A,TERM,50000\n',
    admissionNumbers: [],
    staffEmails: [],
    classes: ['1A'],
    feeCodes: ['TERM'],
    feeKeys: ['1A|TERM'],
  });
  assert.equal(duplicate.ready, false);
  assert.equal(duplicate.lines[0], 'Row 2: This fee is already set for that class.');

  const ready = previewImport({
    kind: 'staff',
    text: 'firstName,lastName,email,staffType\nCsv,Checker,csv.checker@riverside.test,support\n',
    admissionNumbers: [],
    staffEmails: ['joseph@riverside.test'],
    classes: [],
    feeCodes: [],
    feeKeys: [],
  });
  assert.equal(ready.ready, true);
  assert.deepEqual(ready.lines, ['1 row is ready.']);
  assert.equal(majorAmount(5_000_000, 'TZS'), '50000');
  assert.equal(toCsv(['className', 'feeCode', 'amount'], [{ className: '1A', feeCode: 'TERM', amount: '50000' }]), 'className,feeCode,amount\n1A,TERM,50000\n');
});
