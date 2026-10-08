# Security incidents

## Rotate a publisher key

1. On Extensions, as the school owner, revoke the trusted publisher key.
2. Trust a new key id. Do not reuse the revoked id. A revoked key cannot be trusted again.
3. Sign new packages with the new private key in CI. The old private key stays out of the repository.
4. Revoke any package version that was signed with the old key. The next request does not load that version, and the owner gets an inbox notice.

## Session secret

Replace `AUTH_SESSION_SECRET` in the Worker secrets and sign everyone out by letting the old tokens fail. Do not commit the new value.

## Breach

1. Revoke the publisher keys and extension versions that may have been signed or changed by the attacker.
2. Rotate `AUTH_SESSION_SECRET` and any SMS, email, or payment secret if one was stored outside this repo.
3. Read the audit log for publisher key changes, version revocation, and membership changes.
4. Tell affected schools what was revoked. Do not include passwords or the signing key in that notice.

There is no SMS gateway, email gateway, or mobile-money provider configured in this app. A recorded receipt was not delivered to a phone network.
