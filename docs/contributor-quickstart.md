# Contributor quickstart

From a fresh clone:

```bash
pnpm install
cp .dev.vars.example .dev.vars
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Set `AUTH_SESSION_SECRET` in `.dev.vars` before signing in. The seeded local admin is documented in the repository README. Open `http://localhost:5173`.

`pnpm db:migrate` applies migrations to the local D1 database only. Do not use the remote migrate script for day-to-day work.

Kernel tests:

```bash
node --experimental-strip-types --test workers/kernel/<file>.test.ts
```

To try the extension command, create a folder outside the repo and run `pnpm ext validate --dir` on it. See [extension-developer-guide.md](extension-developer-guide.md).
