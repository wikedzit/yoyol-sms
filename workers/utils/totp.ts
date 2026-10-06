const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function createTotpSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return base32Encode(bytes);
}

export async function totpCode(secret: string, timeMs = Date.now()): Promise<string> {
  const counter = Math.floor(timeMs / 1000 / 30);
  return hotp(base32Decode(secret), counter);
}

export async function totpMatches(
  secret: string,
  code: string,
  timeMs = Date.now(),
): Promise<boolean> {
  const normalized = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;

  for (const skew of [-1, 0, 1]) {
    const expected = await totpCode(secret, timeMs + skew * 30_000);
    if (fixedEqual(expected, normalized)) return true;
  }
  return false;
}

async function hotp(secret: Uint8Array, counter: number): Promise<string> {
  const counterBytes = new Uint8Array(8);
  const view = new DataView(counterBytes.buffer);
  view.setUint32(4, counter);
  const key = await crypto.subtle.importKey(
    'raw',
    secret,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBytes));
  const offset = signature[signature.length - 1] & 0x0f;
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Uint8Array {
  const cleaned = input.replace(/=+$/g, '').toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const character of cleaned) {
    const index = BASE32.indexOf(character);
    if (index < 0) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Uint8Array.from(bytes);
}

function fixedEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}
