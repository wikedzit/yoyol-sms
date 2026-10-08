# Extension developer guide

Use the extension command from the repository root.

```bash
pnpm ext create field-notes --kind plugin --dir /tmp/field-notes
pnpm ext validate --dir /tmp/field-notes
pnpm ext build --dir /tmp/field-notes
pnpm ext pack --dir /tmp/field-notes
```

`create` writes a manifest, English and Swahili locales, an entrypoint, a readme, and a passing test. A module also gets `schema/001_initial.json`. A plugin is rejected if that schema folder is added.

`validate` uses the same manifest, locale, and schema rules as the core.

`build` writes `dist/server.js`, a Workers module that returns the sample view document. `pack` writes a zip of the manifest, that file, the locales, and any schema files. The readme and the TypeScript entrypoint stay out of the zip.

## Sign

Signing reads `YOYOL_SIGNING_KEY`, a base64 PKCS8 Ed25519 private key, from the environment. Do not commit that key. Pass the publisher and key id:

```bash
YOYOL_SIGNING_KEY="..." pnpm ext sign --dir /tmp/field-notes --publisher local --key-id ci
```

The command writes `signature.json`. The core accepts it only when that publisher key is trusted and not revoked.

## Capabilities, hooks, and events

A manifest lists the capabilities it needs. Sensitive ones, such as reading students, are shown on the Extensions page before install. Hooks listen to core slots such as `navigation.items` and `dashboard.widgets`. Events a plugin may subscribe to are listed under `events.subscribes`. A plugin cannot publish events.

The view document for the sample page is a title and a text line. The renderer also draws a section, a link, a button, and a form with hidden, text, date, and select fields.

## Local run

`pnpm ext dev` checks the folder and prints the local app commands. It does not hot-reload an unpacked zip. This server has no Worker Loader binding, so a signed zip cannot be installed from the Extensions page. Bundled extensions in `extensions/` load with the app.
