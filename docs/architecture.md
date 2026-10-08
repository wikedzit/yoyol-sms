# Architecture

YOYOL is one package. `app/` is the React Router interface. `workers/` is the Cloudflare Worker: kernel, services, and Drizzle tables. `modules/` holds school modules, `plugins/` holds plugins, and `themes/` holds the theme package.

## Request

1. The browser sends a request to the Worker.
2. The session cookie is checked, and the active school comes from the person's membership.
3. `ServiceContainer` builds the services for that user, school, and request id.
4. A route reads or writes through a service. A service checks `can()` and filters by `school_id`.
5. An extension page at `/x/<key>` asks the bundled entrypoint for a view document. The React renderer draws that document.

## Kernel and extensions

The kernel owns identity, schools, the extension registry, events, notifications, and the rules for a package. A module may own tables and pages. A plugin may not declare pages, permissions, or schema. Both are folders with `yoyol.extension.json`, `entrypoint.ts`, `README.md`, and `locales/en.json` plus `locales/sw.json`.

Enabling an extension records its hooks and event subscriptions for that school. The menu lists core modules that ship with the system. A plugin can add a link through the `navigation.items` slot when it is on.

## Data

Drizzle is the ORM. Local development uses D1. The adapter commits. Callers do not issue `BEGIN` or D1 `batch` themselves. Schema SQL stays specific to the engine.

## Deployments

The running target is a Cloudflare Worker with local or remote D1. Package upload, R2 files, Queues, Cron Triggers, and a Docker image are not configured. See [deployment.md](deployment.md).
