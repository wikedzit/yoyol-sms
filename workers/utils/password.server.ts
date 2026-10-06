import { argon2id, argon2Verify } from 'hash-wasm';

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
  // The Worker disallows WebAssembly.compile, so live passwords use versioned PBKDF2.
  // hashWithArgon2 remains for Node, where the Argon2id module can load.
  return hashPbkdf2(password);
}

export async function hashWithArgon2(password: string): Promise<string | null> {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return await argon2id({
      password,
      salt,
      parallelism: ARGON_PARALLELISM,
      iterations: ARGON_ITERATIONS,
      memorySize: ARGON_MEMORY_KIB,
      hashLength: 32,
      outputType: 'encoded',
    });
  } catch {
    return null;
  }
}

export function passwordNeedsRehash(storedHash: string): boolean {
  return !storedHash.startsWith('$argon2id$') && !storedHash.startsWith('pbkdf2$');
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  if (storedHash.startsWith('$argon2id$')) {
    try {
      return await argon2Verify({ password, hash: storedHash });
    } catch {
      return false;
    }
  }

  if (storedHash.startsWith('pbkdf2$')) {
    return verifyVersionedPbkdf2(password, storedHash);
  }

  return verifyLegacyPbkdf2(password, storedHash);
}

async function hashPbkdf2(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await derivePbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(derived)}`;
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
      salt,
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

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function bytesFromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}
