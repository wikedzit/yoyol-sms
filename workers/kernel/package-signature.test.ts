import assert from 'node:assert/strict';
import test from 'node:test';
import { createCapabilityStub } from './capability-stubs.ts';
import {
  canonicalDigest,
  refusalToRevokePublisherKey,
  refusalToTrustPublisherKey,
  signatureProblem,
  unsignedPackageWarning,
} from './package-signature.ts';

test('RUN-04 a capability call checks the grant, the school, and the caller', () => {
  const stub = createCapabilityStub({ grants: ['core.students:read'], schoolId: 1, userId: 3 });
  assert.deepEqual(stub.call('core.students:read', 1), { ok: true });
  assert.match(stub.call('files:write', 1).error ?? '', /not granted/);
  assert.match(stub.call('core.students:read', 2).error ?? '', /another school/);
  const signedOut = createCapabilityStub({ grants: ['core.students:read'], schoolId: 1, userId: null });
  assert.match(signedOut.call('core.students:read', 1).error ?? '', /signed-in caller/);
});

test('RUN-08 a signature must match a trusted Ed25519 key', async () => {
  const keys = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']) as CryptoKeyPair;
  const publicKey = await exportKey(keys.publicKey);
  const files = [{ path: 'dist/server.js', bytes: new TextEncoder().encode('export default {}') }];
  const digest = await canonicalDigest(files);
  const signature = new Uint8Array(await crypto.subtle.sign('Ed25519', keys.privateKey, digest));
  const signed = {
    publisher: 'nottech',
    keyId: '2026',
    algorithm: 'Ed25519',
    digest: toHex(digest),
    signature: toBase64(signature),
  };
  const trusted = [{ publisher: 'nottech', keyId: '2026', publicKey, revoked: false }];
  assert.equal(await signatureProblem({ files, signature: signed, allowUnsigned: false, trustedKeys: trusted }), null);
  assert.match(await signatureProblem({ files, signature: null, allowUnsigned: false, trustedKeys: trusted }) ?? '', /not signed/);
  assert.equal(await signatureProblem({ files, signature: null, allowUnsigned: true, trustedKeys: [] }), null);
  assert.match(unsignedPackageWarning, /Do not use that setting in production/);
  assert.match(await signatureProblem({
    files,
    signature: signed,
    allowUnsigned: false,
    trustedKeys: [{ ...trusted[0], revoked: true }],
  }) ?? '', /revoked/);
});

test('RUN-09 a publisher key can be trusted once and revoked once', () => {
  const publicKey = toBase64(new Uint8Array(32).fill(7));
  assert.equal(refusalToTrustPublisherKey({
    publisher: 'nottech',
    keyId: '2026',
    publicKey,
    existing: [],
  }), null);
  assert.match(refusalToTrustPublisherKey({
    publisher: 'nottech',
    keyId: '2026',
    publicKey,
    existing: [{ publisher: 'nottech', keyId: '2026' }],
  }) ?? '', /already trusted/);
  assert.equal(refusalToRevokePublisherKey({ revoked: false }), null);
  assert.match(refusalToRevokePublisherKey(null) ?? '', /not found/);
  assert.match(refusalToRevokePublisherKey({ revoked: true }) ?? '', /already revoked/);
});

async function exportKey(key: CryptoKey): Promise<string> {
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  return toBase64(raw);
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}
