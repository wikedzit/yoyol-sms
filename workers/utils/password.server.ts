import { argon2idAsync } from '@noble/hashes/argon2.js';

const ARGON_MEMORY_KIB = 19456;
const ARGON_ITERATIONS = 2;
const ARGON_PARALLELISM = 1;
const PBKDF2_ITERATIONS = 100_000;

export function passwordIsStrong(password: string): boolean {
  return (
    password.length >= 8 &&
    password.length <= 100 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password)
  );
}

export const WEAK_PASSWORD_MESSAGE =
  'Use at least 8 characters, with a letter and a number.';

export async function hashPassword(password: string): Promise<string> {
  return hashWithArgon2(password);
}

export async function hashWithArgon2(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await argon2idAsync(new TextEncoder().encode(password), salt, {
    t: ARGON_ITERATIONS,
    m: ARGON_MEMORY_KIB,
    p: ARGON_PARALLELISM,
    dkLen: 32,
  });
  return `$argon2id$v=19$m=${ARGON_MEMORY_KIB},t=${ARGON_ITERATIONS},p=${ARGON_PARALLELISM}$${bytesToPhc(salt)}$${bytesToPhc(derived)}`;
}

export function passwordNeedsRehash(storedHash: string): boolean {
  return !storedHash.startsWith('$argon2id$');
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  if (storedHash.startsWith('$argon2id$')) {
    return verifyArgon2id(password, storedHash);
  }

  if (storedHash.startsWith('pbkdf2$')) {
    return verifyVersionedPbkdf2(password, storedHash);
  }

  return verifyLegacyPbkdf2(password, storedHash);
}

async function verifyArgon2id(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[1] !== 'argon2id') return false;

  const costs = Object.fromEntries(
    parts[3].split(',').map((pair) => {
      const [name, value] = pair.split('=');
      return [name, Number(value)];
    }),
  );
  const memory = costs.m;
  const iterations = costs.t;
  const parallelism = costs.p;
  if (!memory || !iterations || !parallelism) return false;

  const salt = bytesFromPhc(parts[4]);
  const expected = bytesFromPhc(parts[5]);
  const derived = await argon2idAsync(new TextEncoder().encode(password), salt, {
    t: iterations,
    m: memory,
    p: parallelism,
    dkLen: expected.length,
  });
  return fixedEqual(derived, expected);
}

async function verifyVersionedPbkdf2(password: string, storedHash: string): Promise<boolean> {
  const [, iterationsText, saltB64, hashB64] = storedHash.split('$');
  const iterations = Number(iterationsText);
  if (!iterations || !saltB64 || !hashB64) return false;
  const salt = bytesFromBase64(saltB64);
  const stored = bytesFromBase64(hashB64);
  const derived = await derivePbkdf2(password, salt, iterations);
  return fixedEqual(derived, stored);
}

async function verifyLegacyPbkdf2(password: string, storedHash: string): Promise<boolean> {
  const [saltB64, hashB64] = storedHash.split('.');
  if (!saltB64 || !hashB64) return false;

  const salt = bytesFromBase64(saltB64);
  const stored = bytesFromBase64(hashB64);
  const derived = await derivePbkdf2(password, salt, PBKDF2_ITERATIONS);
  return fixedEqual(derived, stored);
}

async function derivePbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations,
      salt: Uint8Array.from(salt),
    },
    key,
    256,
  );
  return new Uint8Array(bits);
}

function fixedEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left[index] ^ right[index];
  }
  return mismatch === 0;
}

function bytesToPhc(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/=+$/, '');
}

function bytesFromPhc(value: string): Uint8Array {
  const padding = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4));
  return bytesFromBase64(`${value}${padding}`);
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function bytesFromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}
