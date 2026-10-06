import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hashPassword,
  hashWithArgon2,
  passwordIsStrong,
  passwordNeedsRehash,
  verifyPassword,
} from './password.server.ts';
import { totpCode, totpMatches, createTotpSecret } from './totp.ts';
import { isLockedOut } from './sign-in-lock.ts';
import { csrfHeaderMatchesCookie, requestNeedsCsrf } from './csrf.ts';

test('KRN-IAM-09 Argon2id verifies and replaces an older hash', async () => {
  assert.equal(passwordIsStrong('admin123'), true);
  assert.equal(passwordIsStrong('short1'), false);
  const argonHash = await hashWithArgon2('admin123');
  assert.equal(argonHash?.startsWith('$argon2id$'), true);
  assert.equal(await verifyPassword('admin123', argonHash ?? ''), true);
  assert.equal(await verifyPassword('wrong123', argonHash ?? ''), false);
  const hash = await hashPassword('admin123');
  assert.equal(await verifyPassword('admin123', hash), true);
  assert.equal(passwordNeedsRehash(hash), false);
  assert.equal(passwordNeedsRehash('salt.hash'), true);
});

test('KRN-IAM-13 a TOTP code matches the same secret and time', async () => {
  const secret = createTotpSecret();
  const now = Date.UTC(2026, 0, 1, 0, 0, 0);
  const code = await totpCode(secret, now);
  assert.equal(await totpMatches(secret, code, now), true);
  assert.equal(await totpMatches(secret, '000000', now), false);
});

test('KRN-IAM-12 five recent failures lock the account', () => {
  const now = 1_000_000;
  const failures = [now - 1000, now - 2000, now - 3000, now - 4000, now - 5000];
  assert.equal(isLockedOut(failures, now, 15 * 60 * 1000, 5), true);
  assert.equal(isLockedOut(failures.slice(0, 4), now, 15 * 60 * 1000, 5), false);
});

test('KRN-IAM-16 unsafe requests need a matching CSRF token', () => {
  assert.equal(requestNeedsCsrf('POST'), true);
  assert.equal(requestNeedsCsrf('GET'), false);
  assert.equal(csrfHeaderMatchesCookie('abc', 'abc'), true);
  assert.equal(csrfHeaderMatchesCookie('abc', 'abd'), false);
  assert.equal(csrfHeaderMatchesCookie(null, 'abc'), false);
});
