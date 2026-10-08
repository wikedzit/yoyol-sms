import assert from 'node:assert/strict';
import test from 'node:test';
import { matchingRecords } from './record-picker.ts';

const people = [
  { id: 1, label: 'Amina Juma' },
  { id: 2, label: 'Baraka Ali' },
];

test('KRN-UIX-07 a picker keeps records inside the caller scope', () => {
  const visible = matchingRecords(people, 'ali', new Set([1]));
  assert.deepEqual(visible, []);
  assert.deepEqual(matchingRecords(people, 'ali', new Set([2])), [{ id: 2, label: 'Baraka Ali' }]);
  assert.equal(matchingRecords(people, '', null).length, 2);
});
