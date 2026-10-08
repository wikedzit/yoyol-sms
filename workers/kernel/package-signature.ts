export type SignatureFile = {
  publisher: string;
  keyId: string;
  algorithm: string;
  digest: string;
  signature: string;
};

export type TrustedPublisherKey = {
  publisher: string;
  keyId: string;
  publicKey: string;
  revoked: boolean;
};

export const unsignedPackageWarning = 'Unsigned packages are allowed on this server. Do not use that setting in production.';

export async function canonicalDigest(files: readonly { path: string; bytes: Uint8Array }[]): Promise<Uint8Array> {
  const lines: string[] = [];
  for (const file of files) {
    if (file.path === 'signature.json') continue;
    lines.push(`${file.path} ${await sha256Hex(file.bytes)}`);
  }
  lines.sort();
  return sha256Bytes(new TextEncoder().encode(`${lines.join('\n')}\n`));
}

export async function signatureProblem(input: {
  files: readonly { path: string; bytes: Uint8Array }[];
  signature: SignatureFile | null;
  allowUnsigned: boolean;
  trustedKeys: readonly TrustedPublisherKey[];
}): Promise<string | null> {
  if (!input.signature) {
    return input.allowUnsigned ? null : 'This package is not signed.';
  }
  if (input.signature.algorithm !== 'Ed25519') return 'The signature must use Ed25519.';
  const digest = await canonicalDigest(input.files);
  if (input.signature.digest !== toHex(digest)) return 'The signature does not match this package.';
  const key = input.trustedKeys.find((item) => item.publisher === input.signature?.publisher && item.keyId === input.signature.keyId);
  if (!key) return 'This publisher key is not trusted.';
  if (key.revoked) return 'This publisher key has been revoked.';
  const publicKey = await importPublicKey(key.publicKey);
  if (!publicKey) return 'This publisher key could not be read.';
  const signature = fromBase64(input.signature.signature);
  if (!signature) return 'The signature could not be read.';
  const verified = await crypto.subtle.verify('Ed25519', publicKey, signature, digest);
  return verified ? null : 'The signature does not match this package.';
}

export function refusalToTrustPublisherKey(input: {
  publisher: string;
  keyId: string;
  publicKey: string;
  existing: readonly { publisher: string; keyId: string }[];
}): string | null {
  if (input.publisher.trim().length === 0) return 'Enter the publisher name.';
  if (input.keyId.trim().length === 0) return 'Enter the key id.';
  if (!fromBase64(input.publicKey) || fromBase64(input.publicKey)?.byteLength !== 32) {
    return 'Enter an Ed25519 public key.';
  }
  if (input.existing.some((item) => item.publisher === input.publisher.trim() && item.keyId === input.keyId.trim())) {
    return 'That publisher key is already trusted.';
  }
  return null;
}

export function refusalToRevokePublisherKey(found: { revoked: boolean } | null): string | null {
  if (!found) return 'That publisher key was not found.';
  if (found.revoked) return 'That publisher key is already revoked.';
  return null;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  return toHex(await sha256Bytes(bytes));
}

async function sha256Bytes(bytes: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(digest);
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fromBase64(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function importPublicKey(value: string): Promise<CryptoKey | null> {
  const bytes = fromBase64(value);
  if (!bytes || bytes.byteLength !== 32) return null;
  try {
    return await crypto.subtle.importKey('raw', bytes, 'Ed25519', true, ['verify']);
  } catch {
    return null;
  }
}
