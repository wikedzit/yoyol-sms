import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError, errorBody } from './app-error.ts';

test('KRN-SVC-11 a known error keeps its status and message', () => {
  const result = errorBody(new AppError('not_found', 'That student was not found.'));
  assert.equal(result.status, 404);
  assert.deepEqual(result.body, {
    error: { code: 'not_found', message: 'That student was not found.' },
  });
});

test('KRN-SVC-11 an unexpected error hides its message', () => {
  const result = errorBody(new Error('D1_ERROR: no such table secret_tokens'));
  assert.equal(result.status, 500);
  assert.equal(result.body.error.code, 'internal');
  assert.equal(result.body.error.message, 'Something went wrong.');
  assert.equal(JSON.stringify(result.body).includes('secret_tokens'), false);
});
