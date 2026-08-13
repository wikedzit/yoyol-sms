# Yoyol Student System

School admin platform for O-Level / A-Level academic structure, students, teachers, subjects, and grades.

**Stack:** TypeScript · React 19 · React Router 7 (SSR) · Tailwind 4 · Cloudflare Workers · D1 · Drizzle ORM

## Prerequisites

- Node.js 22+ recommended
- [pnpm](https://pnpm.io/)
- Cloudflare Wrangler (installed via project deps)

## Teammate setup (clone from GitHub)

### 1. Clone and install

```bash
git clone git@github.com:yoyol-lab/yoyol-sms.git
cd yoyol-sms
pnpm install
```

### 2. Create local secrets

`.dev.vars` is gitignored and is **not** included in the repo.

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and set a long random value for `AUTH_SESSION_SECRET` (required for login JWT).

Ask a teammate privately for a shared local secret if your team wants matching values — never commit real secrets.

### 3. Apply local database migrations

```bash
pnpm db:migrate
```

### 4. Seed the local admin user

```bash
pnpm db:seed
```

Default local credentials (from the seed script):

- **Email:** `admin@gmail.com`
- **Password:** `admin123`

The seed is idempotent — running it again skips if the admin already exists.

### 5. Start the app

```bash
pnpm dev
```

Open the local URL (usually `http://localhost:5173`) and sign in with the seed credentials.

## Common scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Start local dev server |
| `pnpm db:migrate` | Apply D1 migrations (local) |
| `pnpm db:migrations` | List local migration status |
| `pnpm db:seed` | Seed local admin user |
| `pnpm db:reset` | Wipe local D1, migrate, then seed |
| `pnpm db:migrate-prod` | Apply D1 migrations (remote) |
| `pnpm build` | Production build |
| `pnpm deploy` | Build + deploy to Cloudflare |
| `pnpm typecheck` | Generate types + TypeScript check |

## Database notes

- Local DB is managed by Wrangler/D1 under `.wrangler/` (gitignored).
- `pnpm db:generate` creates new Drizzle migrations (needs Cloudflare credentials in env for D1 HTTP; see `drizzle.config.ts`).
- Remote/prod work requires `npx wrangler login` and appropriate Cloudflare access.

## Troubleshooting local migrations

Use this when `pnpm db:migrate` fails with errors like:

- `table ... already exists`
- migration / journal out of sync
- leftover local D1 state after a failed migrate

### 1. Check local migration status

```bash
pnpm db:migrations
```

### 2. Reset the local database (recommended fix)

This **only** deletes local D1 state under `.wrangler/state/v3/d1`. It does **not** touch the remote/production database.

```bash
pnpm db:reset
```

What it does:

1. Removes local D1 files
2. Re-applies all local migrations (`pnpm db:migrate`)
3. Re-seeds the admin user (`pnpm db:seed`)

Then start the app again:

```bash
pnpm dev
```

Login: `admin@gmail.com` / `admin123`

### 3. Manual reset (same result)

```bash
rm -rf .wrangler/state/v3/d1
pnpm db:migrate
pnpm db:seed
```

### Notes

- Prefer `pnpm db:reset` for local teammate machines.
- Do **not** use `db:reset` against production. Remote migrations use `pnpm db:migrate-prod` only when you intend to change the remote DB.
- If seed says the admin already exists after a partial reset, run `pnpm db:reset` again (or delete `.wrangler/state/v3/d1` fully first).
- Some older migrations were duplicated historically (for example notices). Local reset should still succeed; if a migrate error mentions a specific table already existing after reset, tell the team so that migration can be made idempotent (`IF NOT EXISTS`).

## Deployment

```bash
pnpm deploy
```

Or upload a version first:

```bash
npx wrangler versions upload
npx wrangler versions deploy
```

## Docs

- [React Router](https://reactrouter.com/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Drizzle ORM](https://orm.drizzle.team/)
