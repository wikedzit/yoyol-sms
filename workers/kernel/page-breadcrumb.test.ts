import assert from 'node:assert/strict';
import test from 'node:test';
import { appModules, shellMenu } from './modules.ts';
import { crumbsForPath } from './page-breadcrumb.ts';

const label = (key: string) => key;
const crumbs = (path: string) => crumbsForPath(path, label, appModules, shellMenu);

test('the dashboard crumb is the current page at the root', () => {
  assert.deepEqual(crumbs('/'), [{ label: 'dashboard' }]);
});

test('a menu page sits under its section', () => {
  assert.deepEqual(crumbs('/schools/members'), [
    { label: 'dashboard', to: '/' },
    { label: 'access' },
    { label: 'schoolMembers' },
  ]);
});

test('a nested class stays under classrooms', () => {
  assert.deepEqual(crumbs('/classes/1'), [
    { label: 'dashboard', to: '/' },
    { label: 'academicLevels', to: '/x/academics' },
    { label: 'classrooms', to: '/classes' },
  ]);
});

test('an extension page without a menu item still names the page', () => {
  assert.deepEqual(crumbs('/x/hello'), [
    { label: 'dashboard', to: '/' },
    { label: 'Hello' },
  ]);
});

test('a module page adds the module name', () => {
  assert.deepEqual(crumbs('/modules/attendance'), [
    { label: 'dashboard', to: '/' },
    { label: 'installExtensions', to: '/modules' },
    { label: 'Attendance' },
  ]);
});
