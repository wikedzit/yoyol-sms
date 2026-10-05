# 0004. Installed extensions run in Cloudflare Dynamic Workers first

- Status: Accepted
- Date: 2026-10-02

## Context

On Cloudflare Workers the deployed code is fixed: unlike PHP in WordPress, the running app
cannot load a JavaScript file that arrives later in a zip. Two Cloudflare features change
this:

- **Dynamic Workers (Worker Loader binding)**, in open beta for Workers Paid accounts since
  March 2026. A Worker can start a sandboxed Worker from code supplied at runtime, pass it
  only chosen bindings (including RPC stubs), and block or intercept its outbound network
  access. See the
  [changelog](https://developers.cloudflare.com/changelog/post/2026-03-24-dynamic-workers-open-beta/)
  and [getting started](https://developers.cloudflare.com/dynamic-workers/getting-started/).
- Workers for Platforms (dispatch namespaces), which is heavier and priced for multi-tenant
  SaaS platforms.

The SRS also targets a Node.js container with PostgreSQL. Dynamic Workers do not exist there.

## Decision

1. Define an `ExtensionHost` interface in `packages/core`:

   ```typescript
   interface ExtensionHost {
     getEntrypoint(version: InstalledExtensionVersion, grants: CapabilityGrants): Promise<ExtensionEntrypoint>;
   }
   ```

2. Provide two implementations:
   - `BundledExtensionHost`: calls the extension's compiled entrypoint in-process. Used for
     bundled extensions on every target.
   - `DynamicWorkerExtensionHost`: loads the bundle from R2 and calls
     `env.LOADER.get(`${key}@${version}`, loadCallback)`, passing capability RPC stubs as
     `env`, and an outbound `Fetcher` that only allows the manifest's `outboundHosts`
     (or `globalOutbound: null` when there are none).
3. **v1 scope:** zip installation is supported on the Cloudflare target only. The Node.js and
   PostgreSQL target supports bundled extensions only. Adding zip installs on Node later
   means writing a third `ExtensionHost` (for example with `isolated-vm`) that implements
   the same RPC contract; nothing else changes.

## Consequences

- Runtime installation requires the Workers Paid plan. The admin UI must explain this when
  the Worker Loader binding is absent, and hide the upload option.
- Dynamic Workers are in beta. The rest of the system depends on `ExtensionHost`, not on
  the Loader API, so beta changes are contained to one class.
- Sandboxed extensions cannot return React components to the host (different isolate). UI
  is handled by ADR 0006.
- Each installed extension runs in its own isolate, so one extension cannot read another's
  memory or the host's secrets.
