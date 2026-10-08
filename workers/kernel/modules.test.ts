import assert from 'node:assert/strict';
import test from 'node:test';
import { appModules, moduleForPermission, modulesInTheMenu, shellMenu } from './modules.ts';

test('KRN-REG-09 access stays, and academics, students, and staff ship with the app', () => {
  const presence = Object.fromEntries(appModules.map((module) => [module.key, module.presence]));
  assert.equal(presence.access, 'kernel');
  assert.equal(presence.academics, 'core');
  assert.equal(presence.students, 'core');
  assert.equal(presence.staff, 'core');
  assert.equal(modulesInTheMenu('school').some((module) => module.presence === 'optional'), false);
  assert.equal(modulesInTheMenu('system').some((module) => module.key === 'access'), true);
});

test('KRN-REG-11 modules, plugins, and themes are app pages, and each permission belongs to one module', () => {
  const schoolPaths = appModules
    .filter((module) => module.key === 'school')
    .flatMap((module) => module.menu.map((item) => item.path));
  const accessPaths = appModules
    .filter((module) => module.key === 'access')
    .flatMap((module) => module.menu.map((item) => item.path));
  assert.equal(schoolPaths.includes('/modules'), false);
  assert.equal(schoolPaths.includes('/themes'), false);
  assert.equal(accessPaths.includes('/inbox'), false);
  assert.equal(accessPaths.includes('/audit'), false);
  assert.deepEqual(shellMenu.map((item) => item.path), ['/inbox', '/audit', '/modules', '/plugins', '/themes']);

  const keys = appModules.flatMap((module) => module.permissions.map((permission) => permission.key));
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(moduleForPermission('students.record.read')?.key, 'students');
  assert.equal(moduleForPermission('school.role.manage')?.key, 'access');
});
