# YOYOL Extension Specification

- Spec version: 0.1 (draft)
- Date: 2026-10-02
- Decisions: [ADR 0001 to 0007](../adr/README.md)

This document defines how YOYOL extensions are packaged, declared, installed, run and
removed. It is the contract between the core and every extension author, including the
NOTTECH team building the first-party modules.

## 1. Terms

| Term | Meaning |
|------|---------|
| Core | The kernel in `packages/core`: tenancy, auth, permissions, registry, data service, hooks, events, UI renderer. |
| Extension | Any installable unit. Either a plugin or a module. |
| Plugin | Small extension with no tables or pages. Uses hooks, events, slots, settings and providers. |
| Module | Larger extension that may own tables, pages, permissions, navigation, hooks and services. |
| Bundled | Compiled into the app from `extensions/<key>/`. Trusted. |
| Installed | Uploaded as a signed zip, stored in R2, run in a Dynamic Worker sandbox. |
| Capability | A named right to use a core API, granted per school by an administrator. |
| Slot | A named place in an existing screen where extensions may add UI. |

## 2. Package format

An extension is distributed as a zip with this layout:

```
<key>-<version>.zip
├── yoyol.extension.json     required, the manifest (section 3)
├── dist/server.js           required, pre-bundled ES module built with @yoyol/sdk
├── schema/                  modules only, declarative migrations (section 6)
│   ├── 001_initial.json
│   └── 002_add_due_date.json
├── locales/
│   ├── en.json              required
│   └── sw.json              required (SRS I18N-2)
├── assets/icon.svg          optional, 1:1, max 32 KB
└── signature.json           required outside development (ADR 0005)
```

Limits (configurable by the platform administrator):

- compressed size: 5 MB; uncompressed size: 20 MB
- no symlinks, no absolute paths, no `..` path segments
- only the files and folders above; anything else rejects the package

`dist/server.js` must be self-contained. Dependencies are bundled at build time by
`yoyol-ext build`; nothing is resolved from npm at install time.

## 3. Manifest (`yoyol.extension.json`)

```json
{
  "manifestVersion": 1,
  "key": "finance",
  "type": "module",
  "version": "1.2.0",
  "name": { "en": "Finance", "sw": "Fedha" },
  "description": { "en": "Fee structures, invoices and payments.", "sw": "Ada, ankara na malipo." },
  "publisher": "nottech",
  "license": "MIT",
  "requires": {
    "core": "^1.0.0",
    "extensions": { "students": "^1.0.0", "academics": "^1.0.0" }
  },
  "capabilities": [
    "core.students:read",
    "core.guardians.contact:read",
    "core.academics:read",
    "notifications:send",
    "files:write"
  ],
  "permissions": [
    {
      "key": "finance.invoice.view",
      "label": { "en": "View invoices", "sw": "Angalia ankara" },
      "defaultRoles": ["admin", "finance"]
    },
    {
      "key": "finance.payment.record",
      "label": { "en": "Record payments", "sw": "Rekodi malipo" },
      "defaultRoles": ["finance"]
    }
  ],
  "navigation": [
    { "label": { "en": "Finance", "sw": "Fedha" }, "path": "/invoices", "icon": "wallet", "permission": "finance.invoice.view" }
  ],
  "pages": [
    { "path": "/invoices", "permission": "finance.invoice.view" },
    { "path": "/invoices/:invoiceId", "permission": "finance.invoice.view" }
  ],
  "hooks": {
    "listens": [{ "name": "student.profile.tabs", "priority": 50 }],
    "defines": ["finance.invoice.beforeIssue"]
  },
  "events": {
    "subscribes": ["students.student.enrolled"],
    "publishes": ["finance.payment.confirmed"]
  },
  "settings": [
    { "key": "currency", "type": "select", "options": ["TZS", "KES", "UGX"], "default": "TZS" }
  ],
  "provides": [],
  "outboundHosts": []
}
```

### 3.1 Field rules

| Field | Rule |
|-------|------|
| `key` | `^[a-z][a-z0-9-]{1,31}$`. Globally unique. Becomes the table prefix `mod_<key with - replaced by _>_`. |
| `type` | `plugin` or `module`. Plugins must not declare `pages`, `navigation`, `permissions`, `hooks.defines` or a `schema/` folder. |
| `version` | Semantic Versioning (SRS CS-6). |
| `requires.core` | Semver range checked against the running core version. |
| `requires.extensions` | Other extensions that must be enabled on the same school, with semver ranges. No cycles. |
| `capabilities` | Must come from the catalogue in section 5. Shown to the administrator for consent. |
| `permissions[].key` | Must start with `<key>.`. |
| `pages[].path` | Relative to `/x/<key>`. React Router path syntax. |
| `events.publishes` | Must start with `<key>.`. |
| `provides` | Provider interfaces implemented, for example `notifications.channel` or `finance.paymentProvider`. |
| `outboundHosts` | Exact hostnames the extension may call over HTTPS. Empty means no network access. |
| `name`, `description`, labels | Must include `en` and `sw`. |

The manifest is validated with a `zod` schema exported from `@yoyol/sdk` as
`extensionManifestSchema`, so authors, the CLI and the core all use the same rules.

## 4. Plugins vs modules

| Ability | Plugin | Module |
|---------|:------:|:------:|
| Listen to hooks, subscribe to events | Yes | Yes |
| Contribute to slots | Yes | Yes |
| Key-value settings (stored by the core) | Yes | Yes |
| Implement provider interfaces | Yes | Yes |
| Own tables | No | Yes |
| Own pages and navigation | No | Yes |
| Register permissions | No | Yes |
| Define hooks and publish events | No | Yes |
| Expose services to other extensions | No | Yes |

## 5. Capability catalogue (v1)

Capabilities are granted per school at enable time. Entries marked **sensitive** involve
minors' or financial data (SRS 13.1) and are highlighted on the consent screen.

| Capability | Grants | Sensitive |
|------------|--------|:---------:|
| `core.academics:read` | Levels, streams, forms, classes, subjects, years, terms | |
| `core.students:read` | Student identity, enrolment, class | Yes |
| `core.students:write` | Update student fields exposed by the students module | Yes |
| `core.guardians:read` | Guardian names and relationships | Yes |
| `core.guardians.contact:read` | Guardian phone, email, address | Yes |
| `core.staff:read` | Staff names, roles, assignments | |
| `core.users:read` | Display name and avatar of users | |
| `notifications:send` | Send through configured notification channels | |
| `files:read`, `files:write` | Files owned by the extension in R2 | |
| `jobs:schedule` | Register cron-style scheduled tasks | |
| `extension:<key>` | Call services exposed by another module | Inherits |

Every extension implicitly gets its own settings, its own tables (modules), the hook and
event APIs for what it declared, and a structured logger.

## 6. Module schema (declarative migrations)

Each file in `schema/` is one migration, applied once per school in filename order.

```json
{
  "id": "001_initial",
  "operations": [
    {
      "op": "createTable",
      "name": "invoices",
      "columns": [
        { "name": "id", "type": "id" },
        { "name": "student_id", "type": "reference", "references": "core.students", "onDelete": "restrict" },
        { "name": "academic_year_id", "type": "reference", "references": "core.academic_years", "onDelete": "restrict" },
        { "name": "amount_minor", "type": "integer", "notNull": true },
        { "name": "currency", "type": "text", "notNull": true, "maxLength": 3 },
        { "name": "status", "type": "enum", "values": ["pending", "partial", "paid", "void"], "default": "pending" },
        { "name": "issued_on", "type": "date" },
        { "name": "metadata", "type": "json" }
      ],
      "indexes": [
        { "columns": ["student_id", "academic_year_id"] },
        { "columns": ["status"] }
      ]
    }
  ]
}
```

### 6.1 Column types

| Type | SQLite (D1) | PostgreSQL |
|------|-------------|------------|
| `id` | `integer primary key autoincrement` | `bigint generated always as identity primary key` |
| `text` | `text` | `text` or `varchar(n)` when `maxLength` is set |
| `integer` | `integer` | `bigint` |
| `boolean` | `integer` (0/1) | `boolean` |
| `date` | `text` (ISO 8601 `YYYY-MM-DD`) | `date` |
| `timestamp` | `integer` (Unix ms, UTC) | `timestamptz` |
| `enum` | `text` with `CHECK (... IN (...))` | `text` with `CHECK (... IN (...))` |
| `json` | `text` (validated JSON) | `jsonb` |
| `reference` | `integer` + foreign key | `bigint` + foreign key |

Money is stored as integer minor units (`amount_minor`) with a currency code. Floating
point is not offered.

### 6.2 Columns the core adds to every module table

`school_id` (reference to `core.schools`, not null, indexed), `created_at`, `updated_at`
(timestamps, maintained by the data service), `created_by` (reference to `core.users`,
nullable).

### 6.3 Operations (v1)

`createTable`, `addColumn`, `createIndex`, `dropIndex`. Destructive operations
(`dropColumn`, `dropTable`, `renameColumn`) are allowed only in a new major version and
require the administrator to confirm after a backup export. Bundled modules may
additionally use `{ "op": "sql", "sqlite": "...", "postgres": "..." }`.

### 6.4 Reference rules

- `references` may point to the module's own tables, to `core.*` tables, or to tables of a
  module listed in `requires.extensions` (`finance.invoices`).
- Core tables never reference module tables.

## 7. Lifecycle

### 7.1 Platform level (code)

```
uploaded -> verified -> available -> (revoked)
```

1. **Upload**: a platform administrator uploads the zip. The core enforces section 2 limits.
2. **Verify**: validate the manifest, check the signature (ADR 0005), check `requires.core`,
   compute checksums. Failures are shown with a reason and the bundle is discarded.
3. **Available**: the bundle is stored at `extensions/<key>/<version>/` in R2 and recorded in
   `extension_versions`. Nothing runs yet.

### 7.2 School level (activation)

```
available -> enabling -> enabled <-> disabled
                 \-> failed
enabled -> upgrading -> enabled | failed
disabled -> removed (data kept) | purged (data exported, then dropped)
```

1. **Consent**: a school administrator reviews the capabilities, permissions and outbound
   hosts, and approves.
2. **Enable**: inside one transaction where the adapter allows:
   1. check `requires.extensions` are enabled for this school;
   2. apply pending schema migrations and record them in `extension_migrations`;
   3. register permissions, default role mappings, navigation, hooks, slots, event
      subscriptions and settings defaults;
   4. call the extension's `onEnable`;
   5. write an audit log entry.
3. **Upgrade**: same as enable, applying only new migrations, then `onUpgrade(fromVersion)`.
   New capabilities in the new version require fresh consent before upgrading.
4. **Disable**: hooks, slots, pages and subscriptions stop immediately. Tables and settings
   are kept. Extensions that depend on it are disabled first, after confirmation.
5. **Purge**: export the module's tables for this school to R2 (JSON lines), drop its rows or
   tables, delete settings and files. Supports SRS DP-3 and DP-4.

## 8. Runtime contract

`@yoyol/sdk` turns `defineModule` or `definePlugin` into an entrypoint with this shape. The
core calls it in-process (bundled) or over RPC (installed).

```typescript
interface ExtensionEntrypoint {
  onEnable(context: LifecycleContext): Promise<void>;
  onUpgrade(context: LifecycleContext, fromVersion: string): Promise<void>;
  onDisable(context: LifecycleContext): Promise<void>;

  handlePage(request: PageRequest, context: RequestContext): Promise<PageResponse>;
  handleAction(request: ActionRequest, context: RequestContext): Promise<ActionResponse>;
  runHook(name: string, payload: unknown, context: RequestContext): Promise<unknown>;
  handleEvent(event: DomainEvent, context: EventContext): Promise<void>;
  runJob(jobKey: string, context: EventContext): Promise<void>;
  callService(name: string, input: unknown, context: RequestContext): Promise<unknown>;
}

type PageResponse =
  | { kind: "view"; document: ViewDocument }
  | { kind: "redirect"; to: string }
  | { kind: "notFound" };

type ActionResponse =
  | { kind: "view"; document: ViewDocument }
  | { kind: "redirect"; to: string; flash?: LocalizedText }
  | { kind: "invalid"; fieldErrors: Record<string, LocalizedText> };
```

`RequestContext` gives the extension:

| Member | Purpose |
|--------|---------|
| `school` | Current school id, name, locale, timezone |
| `user` | Current user id, display name, granted permission keys |
| `can(permissionKey)` | Permission check |
| `data` | Scoped Drizzle instance for the module's own tables (ADR 0003) |
| `core` | Core APIs limited to granted capabilities (`core.students.list(...)`) |
| `settings` | Read and write the extension's settings for this school |
| `events.publish(name, payload)` | Publish declared events (written to the outbox) |
| `files`, `notifications`, `jobs` | Present only when the capability was granted |
| `t(key, params)` | Translation lookup in the extension's `locales/` |
| `log` | Structured logger that carries the request correlation id (SRS OB-2) |

### 8.1 Authoring example

```typescript
import { defineModule, view } from "@yoyol/sdk";
import { invoices } from "./schema";

export default defineModule({
  events: {
    "students.student.enrolled": async (event, { data, settings }) => {
      const currency = await settings.get("currency");

      await data.insert(invoices).values({
        studentId: event.payload.studentId,
        academicYearId: event.payload.academicYearId,
        amountMinor: 0,
        currency,
      });
    },
  },

  pages: {
    "/invoices": async ({ data, t }) => {
      const recentInvoices = await data.select().from(invoices).limit(50);

      return view.page(t("invoices.title"), [
        view.table({
          columns: [t("invoices.student"), t("invoices.amount"), t("invoices.status")],
          rows: recentInvoices.map((invoice) => [invoice.studentId, invoice.amountMinor, invoice.status]),
        }),
      ]);
    },
  },
});
```

### 8.2 Execution limits

| Limit | Default |
|-------|---------|
| Page or action handler | 5 s wall time |
| Sync hook handler | 50 ms (ADR 0007) |
| Event handler | 30 s, retried up to 5 times with backoff |
| Data statements per request | 100 |
| Outbound requests | Only to `outboundHosts`, HTTPS only |

## 9. Hooks, events and slots

Core-defined names for v1. Modules define more under their own key.

| Name | Kind | Payload / return |
|------|------|------------------|
| `student.beforeCreate` | hook, blocking | Student input, returns field errors |
| `student.displayName` | hook, filter | Name parts, returns display string |
| `student.profile.tabs` | slot | Student id, returns `{ label, document }` |
| `dashboard.widgets` | slot | Role, returns `{ size, document }` |
| `navigation.items` | slot | User, returns extra nav entries |
| `students.student.enrolled` | event | `studentId`, `formClassId`, `academicYearId` |
| `students.student.updated` | event | `studentId`, changed field names |
| `academics.term.started` | event | `termId`, `academicYearId` |
| `core.user.signedIn` | event | `userId` |

## 10. Core registry tables

| Table | Purpose |
|-------|---------|
| `extensions` | One row per extension key: type, publisher, loading mode, required flag |
| `extension_versions` | Each uploaded version: manifest JSON, R2 key, checksum, signature status, revoked flag |
| `trusted_publishers` | Publisher id, public keys, revoked keys (ADR 0005) |
| `school_extensions` | Per-school activation: version, status, granted capabilities, enabled by and at |
| `extension_migrations` | Migrations applied per school extension |
| `extension_settings` | Key-value settings per school extension |
| `hook_registrations` | Hook and slot handlers per school extension, with priority |
| `event_subscriptions` | Event names per school extension |
| `domain_events` | Transactional outbox with delivery status (ADR 0007) |
| `permissions`, `roles`, `role_permissions`, `school_memberships` | ADR 0002 |
| `audit_log` | Actor, action, target, extension key, timestamp (SRS OB-10) |

## 11. Tooling

`packages/cli` provides `yoyol-ext`:

| Command | Does |
|---------|------|
| `yoyol-ext create <key> --type module` | Scaffold from the starter template |
| `yoyol-ext validate` | Validate the manifest, schema files and locales |
| `yoyol-ext build` | Bundle `dist/server.js` for the Workers runtime |
| `yoyol-ext test` | Run the extension's Vitest suite against a local core (SRS TR-1) |
| `yoyol-ext pack` | Produce the zip and the canonical file list |
| `yoyol-ext sign --key <path>` | Write `signature.json` (run in publisher CI only) |

## 12. Migration plan for the current codebase

| Phase | Work | Done when |
|-------|------|-----------|
| 0. Repair | Restore `students.admission_number`, `students.campus_id`, `teachers.campus_id`; rebuild the migration journal | Fresh `db:reset` matches what the code reads and writes |
| 1. Tenancy | ADR 0002: schools as tenant, memberships, roles, permissions; `DatabaseAdapter` | A teacher account sees its school's data |
| 2. Kernel | Registry tables, manifest schema, lifecycle, permission and navigation registries, hook bus, outbox | A bundled "hello" plugin can be enabled and disabled per school |
| 3. Dogfood | Move academics, students, staff, assessment and notices into `extensions/*`; `ServiceContainer`, `routes.ts` and the sidebar become registry-driven | No feature code imports another feature's internals |
| 4. View documents | Renderer, `/x/:extension/*` route, slots; build Attendance as a view-document module | Attendance works without custom React routes |
| 5. Runtime install | Upload, verify, sign, R2 storage, `DynamicWorkerExtensionHost`, consent screen | A signed SMS plugin zip installs and sends an absence alert |
| 6. Ecosystem | CLI, starter template, SDK docs, publisher onboarding | An external developer ships a signed extension |

## 13. Open questions

1. Database-per-school versus shared tables with predicate checking (ADR 0003).
2. Whether school administrators or only platform administrators may upload zips on a
   single-school self-hosted deployment.
3. The sandboxed iframe escape hatch for interactive extension UI (ADR 0006).
4. A third `ExtensionHost` for zip installs on the Node.js and PostgreSQL target (ADR 0004).
5. Pricing and plan checks if NOTTECH offers a hosted marketplace.
