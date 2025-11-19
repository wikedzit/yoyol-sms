export async function hashPassword(password: string) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: 100_000,
      salt,
    },
    key,
    256
  );

  return `${btoa(String.fromCharCode(...salt))}.${btoa(
    String.fromCharCode(...new Uint8Array(bits))
  )}`;
}

export async function verifyPassword(password: string, hash: string) {
  const [saltB64, hashB64] = hash.split('.');
  const encoder = new TextEncoder();

  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const storedHash = Uint8Array.from(atob(hashB64), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: 100_000,
      salt,
    },
    key,
    256
  );

  const derived = new Uint8Array(bits);
  return derived.every((v, i) => v === storedHash[i]);
}
