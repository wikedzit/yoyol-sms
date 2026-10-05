# 0005. Only signed extensions can be installed

- Status: Accepted
- Date: 2026-10-02

## Context

Most WordPress security incidents come from plugins that run with full trust. YOYOL stores
records of minors, guardian contact details and payment data (SRS 12, 13). Sandboxing
(ADR 0004) and capability consent limit what an extension can do, but they cannot judge
whether an approved capability is used honestly.

## Decision

1. An installed extension must carry a valid signature from a **trusted publisher**.
   NOTTECH is the first trusted publisher. Further publishers are added deliberately by
   NOTTECH (platform level), not by individual schools.
2. **Signature format:** the package contains `signature.json` with the publisher id, key id,
   algorithm (`Ed25519`), the SHA-256 digest of the canonical file list (every file path and
   its SHA-256, sorted by path, excluding `signature.json`), and the signature over that
   digest. The Workers runtime supports Ed25519 through Web Crypto.
3. **Trusted public keys** live in a `trusted_publishers` table managed by the platform
   administrator, seeded from configuration. Public keys are not secrets; private signing
   keys never enter this repository or the deployed app (SRS SEC-15).
4. **Revocation:** a publisher key or a specific extension version can be marked revoked.
   Revoked versions are disabled on every school at the next request and the administrator
   is notified.
5. **Development:** unsigned packages are accepted only when `EXTENSIONS_ALLOW_UNSIGNED=true`,
   which must never be set in production. The admin UI shows a persistent warning while it
   is on.
6. Signing is done by `yoyol-ext sign` in the publisher's CI, never in the browser.

## Consequences

- No open marketplace in v1. Third parties publish through a NOTTECH-approved process.
- Key management becomes an operational duty: rotation, revocation and a documented
  incident procedure (SRS DP-7).
- The same mechanism later supports a curated marketplace index without design changes.
