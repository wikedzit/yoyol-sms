# Plan: Adopt the pluggable extension architecture

- Status: In progress
- Branch: `plan/adopt-pluggable-architecture`
- Base: `develop` at `d974da4`
- Date: 2026-10-06
- Updated: 2026-10-08
- Sources: [ADRs](../adr/README.md), [extension specification](../extensions/specification.md), [view documents](../extensions/view-documents.md), [feature catalog](../features.md), [functional requirements](../srs-functional-requirements.md)

This plan is the checklist for turning today's hard-wired app into the core-and-extensions system in ADR 0001 to ADR 0007. The feature catalog (`docs/features.md`) remains the description of each feature. This document is the schedule, the coverage check, and the rule for when a phase is allowed to close.

Nothing in the inventories below is optional. A row is either done, or it is deferred in writing with a reason and a follow-up. Rows marked **out of v1** are still tracked so they are not forgotten.

## 1. How work lands

- All implementation branches start from `develop`. No one commits the architecture work directly on `develop`.
- One branch per slice. The branch name includes the feature IDs it closes, for example `krn-iam-01-school-tenancy`.
- Every pull request lists the feature IDs and requirement IDs it closes. A pull request that does not name its IDs is not reviewable against this plan.
- A feature is done only when it meets the definition of done in `docs/features.md` section 1: a failing test named after the feature ID comes first, permissions are checked with `can()`, queries are school-scoped, English and Swahili exist, and the change goes through a reviewed pull request.
- When a slice finishes, change its status in this file in the same pull request. Status values are `not started`, `in progress`, `done`, `deferred`, and `out of v1`.
- A feature we skip is not dropped. In the same change, set its inventory row to `deferred` and add a row to section 2.1, After the phases. The row names what already works, why it waits, and that it is picked up after phase 6. Out of v1 stays a separate list: those items are not scheduled after the phases.

### Phase board

| Phase | Outcome | Status | Closes when |
|-------|---------|--------|-------------|
| 0. Decisions and repair | One data-access ADR, schema matches the code, a test gate exists | in progress | Every REP row and every decision in section 2 is `done` |
| 1. Tenancy and data | A teacher signed in to a school sees that school's data, and only that school's data | done | Every KRN-IAM, KRN-DAT-01 to KRN-DAT-04, KRN-DAT-10, and GAP-SCH / GAP-IAM row is `done`. KRN-DAT-05 to KRN-DAT-13 stay in phase 2. |
| 2. Kernel | A bundled hello plugin can be enabled and disabled per school, and can render a view document | done | Every KRN-REG, KRN-EVT, KRN-UIX, KRN-SVC, SDK, and RUN-01 / RUN-02 row is `done`, or it is `deferred` in section 2.1 |
| 3. Dogfood | Academics, students, staff, assessment, and calendar run as bundled modules | done | Every MOD-ACA, MOD-STU, MOD-STF, MOD-ASM, and MOD-CAL row is `done`, and no feature imports another feature's internals |
| 4. New modules | Attendance proves view documents, then the remaining SRS modules land | done | Every remaining MOD-* row is `done`, or it is `deferred` in section 2.1 |
| 5. Runtime install | A signed zip installs on Cloudflare and runs in a sandbox | done | Every RUN row and every PLG row is `done`, or it is `deferred` in section 2.1 |
| 6. Ecosystem | An external developer can build, sign, and ship an extension | done | Every SDK-CLI and DOC row is `done`, or it is `deferred` in section 2.1 |

Phases run in this order. A later phase does not start until the previous phase's exit line is true. Inside a phase, slices may run in parallel when they do not share tables.

### Database engines

Drizzle is the ORM so the same service code can run on more than one DBMS. The adapter chooses how a change is committed. Callers do not.

- PostgreSQL opens a real transaction. A failure rolls it back with `ROLLBACK`.
- D1 rejects `BEGIN`. D1 commits with `batch`, and a later failure runs the undo statements for that batch.
- Schema SQL stays dialect-specific. SQLite and PostgreSQL each get their own compiled statements.
- A new engine adds an adapter. It does not reuse another engine's commit style.

## 2. Decisions that block code

These are unresolved in the ADRs today. Slice 0.1 is docs only and must merge before any kernel or tenancy code.

| ID | Decision | Recommendation | Blocks | Status |
|----|----------|----------------|--------|--------|
| D-01 | Two files both claim to be ADR 0003 | Keep [0003-core-owns-data-access.md](../adr/0003-core-owns-data-access.md), the file the ADR index links. The other file is marked superseded. Its `ext_` prefix and direct Drizzle path are rejected. | KRN-DAT-06, KRN-DAT-07, KRN-DAT-08 | done |
| D-02 | Table prefix | Use `mod_<key>_`, with `-` in the key replaced by `_`. This matches the specification section 3.1 and the ADR the index links. The duplicate ADR's `ext_<key>_` prefix is dropped. | Schema compiler, every module table | done |
| D-03 | Bundled data path | Bundled and installed extensions both go through the statement checker. Bundled mode is an in-process call. Installed mode is RPC. The duplicate ADR's direct Drizzle path for bundled modules is rejected, because it would let trusted code skip the checker. | KRN-DAT-07, KRN-DAT-08, SDK-04 | done |
| D-04 | Accept the proposed ADRs | After D-01 to D-03, set ADR 0001, ADR 0002, the surviving ADR 0003, and ADR 0007 to Accepted. ADR 0004, ADR 0005, and ADR 0006 are already Accepted. | Every later slice | done |
| D-05 | Who may upload a zip on a self-hosted school | Platform administrators upload packages. On a single-school deployment the school owner is that person. Other school roles do not see the upload section. | RUN-06 | done |
| D-06 | Shared database with a predicate check | Build the shared-database design in ADR 0003. Database-per-school stays an alternative, revisited only if the statement checker proves too restrictive. | KRN-DAT-07 | done |
| D-07 | One commit style must not be forced on every DBMS | Drizzle stays the ORM. PostgreSQL commits with a transaction. D1 commits with `batch` because it rejects `BEGIN`. Services call the adapter. | KRN-REG-05, KRN-REG-06, KRN-EVT-03 | done |

### Explicitly out of v1

Tracked here so they are not built by accident and not dropped.

| ID | Item | Source | Status |
|----|------|--------|--------|
| OUT-01 | Sandboxed iframe for interactive extension UI (timetable builder and similar) | ADR 0006, spec question 3 | out of v1 |
| OUT-02 | A third `ExtensionHost` so zip installs work on Node.js and PostgreSQL | ADR 0004, spec question 4 | out of v1 |
| OUT-03 | Open marketplace, pricing, and plan checks | ADR 0005, spec question 5 | out of v1 |
| OUT-04 | Database-per-school tenancy | ADR 0003 alternative, spec question 1 | out of v1 |

### 2.1 After the phases

These features are skipped until phase 6 is finished. They are not out of v1. Each one is `deferred` in the inventory below. When a later change skips another feature, add it here in that same change.

What already works stays in the app. The backlog is only the part that still needs a binding, a harness, or a larger replacement.

| ID | What waits | What already works | Why it waits |
|----|------------|--------------------|--------------|
| KRN-SVC-02 | School-scoped file upload, download, and delete in R2, with size and type limits | Purge exports stay in D1 `extension_exports` | No R2 binding is configured |
| KRN-EVT-04 | Deliver outbox events through Cloudflare Queues | Polling delivers pending rows, retries with backoff, and gives each handler 30 seconds. Health reports the queue as `not_configured` | No Queues binding is configured |
| KRN-SVC-06 | Per-school scheduled jobs through Cron Triggers, with run history | An administrator can run the fee reminder job by hand | No Cron Trigger is configured |
| KRN-DAT-13 | A tested PostgreSQL backup and restore, and D1 Time Travel guidance that has been tried | None | There is no live PostgreSQL restore, and D1 Time Travel has not been exercised |
| KRN-REG-10 | Build `ServiceContainer` from the extensions enabled for the school | The container still constructs the kernel services by hand | Replacing it would rewrite the working service graph |
| KRN-REG-11 | Generate `routes.ts` entries from bundled manifests | The menu comes from modules. Access is always present. Core modules ship in the menu. Extensions and Themes stay app pages. Roles list each module's permissions | Generated routes are a separate pass from the menu that is already in use |
| KRN-UIX-05 | Field errors, plus file, money, entity, and multiselect fields | A view document can post a button, or a form with hidden, text, date, and select fields. The CSRF token is added to that post. A GET form changes the page address | Per-field errors and the remaining field kinds wait until after the phases |
| KRN-UIX-09 | axe checks in CI on core screens and rendered view documents | The root error page hides internal details | There is no Playwright or axe harness yet (ENG-05) |
| KRN-SVC-03 | Route a notification by the person's channel preference, with templates | In-app delivery writes a notification row. The inbox can mark one read | Preferences and templates need the channel work below |
| KRN-SVC-04 | Place the SMS or email call with a real provider | SMS and email plugins record a receipt. The status stays `not_sent` when no gateway is configured. Absence alerts and fee reminders use those receipts | No SMS or email provider binding is configured |
| GAP-NTF-01 | A parent chooses a contact channel from the ones the school offers | In-app messages only | Depends on KRN-SVC-03 and KRN-SVC-04 |
| MOD-LSN-02 | Attach files to a lesson plan | A teacher writes and submits a plan for a subject, class, and year, and can revise a returned plan | File fields need school file storage (KRN-SVC-02) |
| RUN-10 | Store a verified package in R2 by key and version | Path, size, manifest, locale, signature, and publisher checks run in memory. A checked package is discarded | No R2 binding is configured |
| PLG-03 | Install a signed mobile-money zip and load it | `finance.paymentProvider` records a manual payment. Package checks run in memory | Package storage and the Worker Loader binding are not configured |
| SDK-CLI-05 | Hot-reload an unpacked extension against the local core | `pnpm ext dev` validates the folder and prints `pnpm db:seed` and `pnpm dev` | No Worker Loader binding is configured, so an unpacked zip cannot be loaded |
| ENG-11 | Publish a Docker image from a tagged release | The tag workflow runs the kernel tests, the traceability report, and the app build, and checks that CHANGELOG mentions the tag | No Dockerfile exists yet (ENG-09) |
| DOC-06 | Docker Compose with PostgreSQL, plus R2, Queues, Worker Loader, and a tested backup in the deployment guide | `docs/deployment.md` covers local D1 migrate, seed, and Wrangler deploy | Those bindings and the image are not configured |
| REP-03 | Compare production and development `d1_migrations` and write a one-off migration | The local journal applies 0000 through 0080 on an empty database | The remote database id in Wrangler returns "could not be found". A guessed migration could drop or rewrite rows |

## 3. Where the code is today

Checked on `develop` at `d974da4`.

- One package. `app/` and `workers/` are the whole product. There is no `packages/core`, `packages/sdk`, `packages/ui`, `packages/cli`, or `extensions/`.
- `workers/services/index.ts` (`ServiceContainer`) constructs 15 services by hand and passes `ownerUserId` into each of them.
- `app/routes.ts` lists every route. The sidebar is a fixed component.
- Tenant tables carry `owner_user_id` with `ON DELETE CASCADE`. `students.school_id` exists but is nullable. Authorization is `isAdminRole()` in `app/lib/roles.ts`.
- `students` has no `admission_number` and no `campus_id`. Guardians are `guardian_name` and `guardian_phone` columns, not records.
- There is no test suite, no ESLint config, and no Playwright setup.
- The ADRs and the specification are documents only. Nothing in the running app loads an extension.

## 4. Slice order

Each slice is its own branch and pull request into `develop`.

| Slice | Branch idea | IDs | Depends on | Status |
|-------|-------------|-----|------------|--------|
| 0.1 | `docs/resolve-adr-0003` | D-01, D-02, D-03, D-04, D-06 | this plan | not started |
| 0.2 | `rep-01-schema-repair` | REP-01, REP-02, REP-04 | 0.1 not required, can start now. REP-01 and REP-02 are done. The drift check still stops on a drizzle-kit prompt. | in progress |
| 0.3 | `rep-03-remote-reconcile` | REP-03 | 0.2. The remote database id was not found, so this waits in section 2.1. | deferred |
| 0.4 | `eng-04-test-harness` | ENG-02, ENG-03, ENG-04, ENG-05, ENG-07, ENG-08, ENG-10 | 0.2 | not started |
| 0.5 | `eng-01-workspace-layout` | ENG-01 | 0.4, so the move is covered by tests | not started |
| 1.1 | `krn-iam-tenancy` | KRN-IAM-01, KRN-IAM-02, KRN-IAM-03, KRN-IAM-04, KRN-DAT-10, GAP-SCH-01, GAP-SCH-02, GAP-SCH-03 | 0.5 | done |
| 1.2 | `krn-iam-permissions` | KRN-IAM-05, KRN-IAM-06, KRN-IAM-07, KRN-IAM-08, GAP-IAM-02, GAP-IAM-03, GAP-IAM-05 | 1.1 | done |
| 1.3 | `krn-iam-sessions` | KRN-IAM-09, KRN-IAM-10, KRN-IAM-11, KRN-IAM-12, KRN-IAM-13, KRN-IAM-14, KRN-IAM-15, KRN-IAM-16, GAP-IAM-01, GAP-IAM-04 | 1.1 | done |
| 1.4 | `krn-dat-adapter` | KRN-DAT-01, KRN-DAT-02, KRN-DAT-03, KRN-DAT-04, ENG-06, ENG-09 | 0.5 | in progress |
| 2.1 | `krn-reg-lifecycle` | KRN-REG-01 to KRN-REG-09, SDK-01 | 1.2, 1.4 | done |
| 2.2 | `krn-dat-extensions` | KRN-DAT-05, KRN-DAT-06, KRN-DAT-07, KRN-DAT-08, KRN-DAT-09, SDK-02, SDK-04 | 2.1, D-03 | done |
| 2.3 | `krn-evt-hooks` | KRN-EVT-01 to KRN-EVT-07. KRN-EVT-04 queue delivery is deferred. | 2.1 | done |
| 2.4 | `krn-uix-views` | KRN-UIX-01 to KRN-UIX-09, SDK-03, KRN-REG-10, KRN-REG-11, KRN-REG-12. KRN-UIX-05, KRN-UIX-09, KRN-REG-10, and route generation in KRN-REG-11 are deferred. | 2.1 | done |
| 2.5 | `krn-svc-shared` | KRN-SVC-01 to KRN-SVC-13, KRN-DAT-11, KRN-DAT-12, KRN-DAT-13, GAP-NTF-01. KRN-SVC-02, KRN-SVC-03, KRN-SVC-04, KRN-SVC-06, KRN-DAT-13, and GAP-NTF-01 are deferred. | 2.1 | done |
| 2.6 | `run-bundled-host` | RUN-01, RUN-02, RUN-05, SDK-05 | 2.2, 2.3, 2.4 | done |
| 2.7 | `ext-hello-plugin` | Proof only: a bundled hello plugin enables, renders one view document, and disables. No new feature ID. | 2.6 | done |
| 3.1 | `mod-aca` | MOD-ACA-01 to MOD-ACA-06 | 2.7 | done |
| 3.2 | `mod-stu` | MOD-STU-01 to MOD-STU-08 | 3.1 | done |
| 3.3 | `mod-stf` | MOD-STF-01 to MOD-STF-03 | 3.1 | done |
| 3.4 | `mod-asm` | MOD-ASM-01 to MOD-ASM-06 | 3.2, 3.3 | done |
| 3.5 | `mod-cal` | MOD-CAL-01 to MOD-CAL-03 | 2.7, KRN-SVC-03 | done |
| 4.1 | `mod-att` | MOD-ATT-01 to MOD-ATT-04 | 2.7, 3.2, 3.3. This is the first module that must use view documents only. | done |
| 4.2 | `mod-fin` | MOD-FIN-01 to MOD-FIN-09 | 4.1's renderer is already proven, plus 3.2 | done |
| 4.3 | `mod-rest` | MOD-TTB, MOD-LSN, MOD-DIS, MOD-CLB, MOD-LDR, MOD-RPT | 3.2, 3.3. These may be separate branches per module. Timetable, lesson plans, discipline, clubs, leadership, and reports are done. Lesson-plan files wait in section 2.1. | done |
| 1.5 | `install-pages` | KRN-REG-13, PLG-09 | Themes page can ship before zip upload. Extension zips still wait for RUN-06. | done |
| 5.1 | `run-install` | RUN-03, RUN-04, RUN-06 to RUN-13, D-05, KRN-REG-13 zip half | 2.6. Package checks, signatures, capability stubs, and the dynamic host contract are done. R2 storage waits in section 2.1. The upload control stays hidden without a Worker Loader binding. | done |
| 5.2 | `plg-channels` | PLG-01, PLG-02, PLG-04, PLG-05 | 5.1, MOD-ATT. The live provider call and the daily clock stay in section 2.1. | done |
| 5.3 | `plg-payments` | PLG-03 | 5.1, MOD-FIN-07. A signed zip cannot be stored or loaded yet. See section 2.1. | deferred |
| 6.1 | `sdk-cli` | SDK-CLI-01 to SDK-CLI-05, ENG-11, ENG-12 | 5.1. Create, validate, build, pack, and sign work. Hot reload and the Docker release image wait in section 2.1. | done |
| 6.2 | `docs-ecosystem` | DOC-01 to DOC-09 | the behaviour each guide describes. The Docker and backup guide waits in section 2.1. | done |

ENG-05 (Playwright) starts in slice 0.4 with one smoke test and grows with every user-facing slice. It is not a single late pull request.

## 5. Feature inventory

Every ID from `docs/features.md` is listed once. Descriptions live in that file. If an ID is missing from this section, the plan is wrong and must be updated before the phase closes.

### 5.1 Phase 0

| ID | Work | Status |
|----|------|--------|
| REP-01 | Restore `students.admission_number`, `students.campus_id`, `teachers.campus_id` | done |
| REP-02 | Rebuild the migration journal. Each SQL file is in the journal once, numbers are not repeated, and a table created twice uses IF NOT EXISTS. A fresh local database applies 0000 through 0080. | done |
| REP-03 | Reconcile remote databases without data loss. Deferred: the configured remote D1 database was not found, so no one-off migration was written. See section 2.1. | deferred |
| REP-04 | Schema drift check in CI | not started |
| REP-05 | Resolve the duplicate ADR 0003. This is D-01 to D-03. | done |
| ENG-01 | pnpm workspace: `apps/web`, `packages/core`, `packages/sdk`, `packages/ui`, `packages/cli`, `extensions/*` | not started |
| ENG-02 | Strict TypeScript, no `any` | not started |
| ENG-03 | ESLint, Prettier, pre-commit hook | not started |
| ENG-04 | Vitest with the Workers pool and D1 | not started |
| ENG-05 | Playwright, one test per role, grown with each slice | not started |
| ENG-06 | Adapter contract suite on D1 and PostgreSQL | not started |
| ENG-07 | CI: lint, types, tests, coverage, OpenAPI, accessibility, build | not started |
| ENG-08 | Dependency updates, `pnpm audit`, secret scanning | not started |
| ENG-09 | Dockerfile and Compose with PostgreSQL | not started |
| ENG-10 | `.env.example` and `.dev.vars.example` | not started |
| ENG-11 | Tagged releases, image publish, changelog. The tag workflow runs. The Docker image waits in section 2.1. | deferred |
| ENG-12 | Traceability report: `scripts/traceability.ts` lists feature ids that no kernel test mentions. | done |

### 5.2 Phase 1

| ID | Work | ADR | Status |
|----|------|-----|--------|
| KRN-IAM-01 | Child records are read and written by `school_id`. The active school comes from membership, the `schoolId` query, then the `yoyol-school` cookie. `school.owner_user_id` stays as the founding account. | 0002 | done |
| KRN-IAM-02 | Students, staff, and form classes can belong to a campus. The class form asks for a campus and still saves when it is left blank. | 0002 | done |
| KRN-IAM-03 | `school_memberships`. The founding account is an admin. School lists use active memberships. | 0002 | done |
| KRN-IAM-04 | Roles as data. Five system roles are seeded per school and marked system. Custom roles are edited on `/schools/roles`. | 0002 | done |
| KRN-IAM-05 | Permission keys are seeded. An admin can change grants for every role except admin, which keeps every permission. | 0002 | done |
| KRN-IAM-06 | `can()` guards school profile, campuses, classes, class detail, levels, academic year, students, teachers, grades, members, roles, archive, extensions, and themes. `isAdminRole()` still gates onboarding so sign-in feels the same. | 0002 | done |
| KRN-IAM-07 | A teacher sees assigned classes, subjects, and those students. A parent sees linked students. A student sees their own record. An admin still sees the whole school. The link is set on Members. | 0002 | done |
| KRN-IAM-08 | The header shows a school switcher when the account has two or more active schools. The choice is stored in the `yoyol-school` cookie. | 0002 | done |
| KRN-IAM-09 | New passwords are Argon2id (`@noble/hashes`, m=19456, t=2, p=1). Older PBKDF2 hashes still verify and are replaced on the next successful sign-in. | 0002 | done |
| KRN-IAM-10 | Access token lasts 10 minutes. The refresh token rotates on use. Both are HttpOnly, Secure, SameSite cookies. | 0002 | done |
| KRN-IAM-11 | Sessions live in `sessions`. Sign-out revokes the current session. Sign out everywhere revokes every session for the account. | 0002 | done |
| KRN-IAM-12 | Five failed attempts for an email, or twenty for an address, lock sign-in for 15 minutes and write an audit event. | 0002 | done |
| KRN-IAM-13 | A user can turn on TOTP from Account security. A school can require it for admin and finance. | 0002 | done |
| KRN-IAM-14 | An admin creates an invitation by email or phone on `/schools/invitations`. The link lets the person set a password and join that school and role. | 0002 | done |
| KRN-IAM-15 | Password reset uses a single-use 30 minute token. The reply does not say whether the account exists. | 0002 | done |
| KRN-IAM-16 | Responses set nosniff, referrer policy, frame denial, and a CSP that still allows the theme style tag. HSTS is sent only on https. State-changing requests must send the `yoyol_csrf` cookie value in `x-csrf-token`. | 0002 | done |
| KRN-DAT-01 | `DB_DRIVER` selects `d1` unless the value is `postgres`. The Worker refuses to boot as postgres and keeps using D1. | 0003 | done |
| KRN-DAT-02 | Services take the D1 adapter database. Seed uses the same adapter. | 0003 | done |
| KRN-DAT-03 | The Node postgres adapter uses `pg` and `DATABASE_URL`. It is excluded from the Worker typecheck, and the Worker still refuses `DB_DRIVER=postgres`. | 0003 | done |
| KRN-DAT-04 | `sharedRecordColumns` builds the same id, timestamp, boolean, JSON, and date fields for sqlite and postgres. Live D1 tables stay on the sqlite definitions already applied. | 0003 | done |
| KRN-DAT-10 | Campus delete is refused while in use. Student, teacher, and grade delete sets status to Archived and hides those rows. Class delete is refused while any student row still points at the class. | 0002 | done |

KRN-DAT-05 to KRN-DAT-09 and KRN-DAT-11 to KRN-DAT-13 are kernel work and are listed in phase 2, because they need the registry. They are still required.

### 5.3 Phase 2

| ID | Work | ADR | Status |
|----|------|-----|--------|
| KRN-DAT-05 | Pending schema files apply once per school and are recorded in `extension_migrations`. Dependencies run first. | 0003 | done |
| KRN-DAT-06 | `createTable`, `addColumn`, `createIndex`, and `dropIndex` compile to SQLite and PostgreSQL with the `mod_` prefix. Dropping a column stays out until a new major version. | 0003 | done |
| KRN-DAT-07 | `scopeExtensionStatement` adds `school_id` for the current school, then the checker refuses anything else before it runs. | 0003 | done |
| KRN-DAT-08 | The checker allows select, insert, update, and delete only on `mod_<key>_*` tables, and only when `school_id` is bound to the current school. Anything else is rejected. | 0003 | done |
| KRN-DAT-09 | Core reads refuse a missing capability before querying. Granted reads return student identity, guardian names, guardian phone and address, staff names, class names, and the teacher's current class and subject assignments. Year-scoped assignments stay with MOD-STF-02. | 0003 | done |
| KRN-DAT-11 | An admin can download one student's identity and grades as JSON. Removing personal details clears the name, contacts, guardian, and photo, archives the row, and writes `person.erase`. Grades stay on the row. | 0003 | done |
| KRN-DAT-12 | Messages older than one year can be removed from the audit page. The removal is written as `retention.purge` with the count. Audit rows are not deleted. | 0003 | done |
| KRN-DAT-13 | Backup and restore for PostgreSQL, and D1 Time Travel notes. Deferred until after the phases. See section 2.1. | 0003 | deferred |
| KRN-REG-01 | `extensionManifestSchema` validates bundled manifests. A plugin that declares permissions is rejected. | 0001 | done |
| KRN-REG-02 | Registry tables exist: extensions, versions, migrations, settings, hooks, and event subscriptions. Enable records the extension and its version. | 0001 | done |
| KRN-REG-03 | Bundled manifests under `extensions/*` are imported into the Worker build. Each folder follows the kernel layout: manifest, entrypoint, locales, readme, and schema migrations when the module owns tables. | 0001 | done |
| KRN-REG-04 | `requires.core` and `requires.extensions` are checked. A circle of requirements is rejected, and an unmet requirement names the extension to turn on. | 0001 | done |
| KRN-REG-05 | Enable writes migrations, the version, permissions, hooks, subscriptions, grants, settings, and the school row through the adapter, then calls `onEnable`. PostgreSQL rolls that work back. D1 undoes the batch. | 0001 | done |
| KRN-REG-06 | Upgrade applies new migrations and calls `onUpgrade`. New capabilities need an explicit consent flag. If `onUpgrade` fails, PostgreSQL rolls the transaction back. D1 removes the new tables, indexes, migration rows, and version row. SQLite cannot drop a column added by a migration. | 0001 | done |
| KRN-REG-07 | Turn off sets the school row to disabled and keeps it. An enabled extension that still needs it must be turned off first. | 0001 | done |
| KRN-REG-08 | Remove keeps data. Purge writes a JSON-lines export to extension_exports, then deletes that school's module rows. R2 is not bound, so the export stays in D1. | 0001 | done |
| KRN-REG-09 | Academics, students, and staff are required. The extensions page will not turn them off. | 0001 | done |
| KRN-REG-10 | Registry-driven service container. Deferred until after the phases. See section 2.1. | 0001 | deferred |
| KRN-REG-11 | The menu comes from modules. Access is always present. Core modules ship in the menu. Extensions and Themes are app pages. Roles list each module's permissions. Generating `routes.ts` from manifests is deferred until after the phases. See section 2.1. | 0001 | deferred |
| KRN-REG-12 | The extensions page lists version, status, granted capabilities, and whether an update is available. No upgrade button shows while every bundled version is 1.0.0. | 0001 | done |
| KRN-REG-13 | `/extensions` installation page. Bundled install now. Zip upload when RUN-06 exists. | 0001, 0005 | done |
| KRN-EVT-01 | Hook bus runs handlers in priority order, with a 50 ms budget. A handler that fails or runs too long is skipped and logged. | 0007 | done |
| KRN-EVT-02 | A blocking hook can return field errors and stop the operation. | 0007 | done |
| KRN-EVT-03 | A student enrollment and a grade write include their outbox row in the same adapter commit as the record. PostgreSQL uses one transaction. D1 uses one batch. Dispatch runs after that commit. | 0007 | done |
| KRN-EVT-04 | Polling delivers pending rows, retries with backoff, and gives each handler 30 seconds. Cloudflare Queues are deferred until after the phases. See section 2.1. | 0007 | deferred |
| KRN-EVT-05 | After 5 failures the row is dead. The Extensions page lists those rows and can try them again. | 0007 | done |
| KRN-EVT-06 | Versioned payload schemas | 0007 | done |
| KRN-EVT-07 | Core hook, slot, and event catalogue from spec section 9 | 0007 | done |
| KRN-UIX-01 | The header shows the active school name. The menu still comes from the module registry, and the active theme style is still applied. | 0001, 0006 | done |
| KRN-UIX-02 | `viewDocumentSchema` for view version 1. Unknown nodes, outside links, and documents over 256 KB are rejected. | 0006 | done |
| KRN-UIX-03 | Server renderer. An invalid document becomes a safe error with no internal details. | 0006 | done |
| KRN-UIX-04 | `/x/:extension/*` checks the school and that the extension is enabled, then renders its view document. | 0006 | done |
| KRN-UIX-05 | View-document forms. Button, hidden, text, date, and select posts work. Field errors and the other field kinds stay deferred. See section 2.1. | 0006 | deferred |
| KRN-UIX-06 | Slots: `student.profile.tabs`, `dashboard.widgets`, `navigation.items` | 0006, 0007 | done |
| KRN-UIX-07 | The grades student list is limited to the caller's scope, and the finder only offers names that match the search. | 0003, 0006 | done |
| KRN-UIX-08 | The root error page shows a short message in English or Swahili. It does not render the error message or stack. | 0006 | done |
| KRN-UIX-09 | axe checks in CI. Deferred until after the phases. See section 2.1. | 0006 | deferred |
| KRN-SVC-01 | Per-school settings from the manifest, with defaults and a save form on the Extensions page. | 0001 | done |
| KRN-SVC-02 | R2 files, school scoped, with size and type limits. Deferred until after the phases. See section 2.1. | 0001 | deferred |
| KRN-SVC-03 | In-app delivery writes a notification row. Preference routing and templates are deferred until after the phases. See section 2.1. | 0001 | deferred |
| KRN-SVC-04 | SMS and email plugins record a receipt. Placing the call with a real provider is deferred until after the phases. See section 2.1. | 0001 | deferred |
| KRN-SVC-05 | Inbox lists messages for the signed-in user and can mark one read. | 0001 | done |
| KRN-SVC-06 | Scheduled jobs per school. Deferred until after the phases. See section 2.1. | 0001 | deferred |
| KRN-SVC-07 | Every bundled extension's `en` and `sw` catalog is loaded. A view document formats dates, numbers, and money for the language on the page, and a missing Swahili string falls back to English. Core screens keep their existing dictionary. | 0001 | done |
| KRN-SVC-08 | Audit entries are inserted with actor, action, extension, target, and time. The service has no update or delete. | 0002 | done |
| KRN-SVC-09 | The audit page lists the latest entries, searches action, extension, and target, and exports the same rows as CSV. | 0002 | done |
| KRN-SVC-10 | Each request gets an `x-request-id`. Extension logs are one JSON line with severity, that id, and the extension key. Passwords, tokens, emails, and phone fields are replaced with `[redacted]`. Hook, slot, event, and invalid page failures write that line. | 0007 | done |
| KRN-SVC-11 | `AppError` maps validation, unauthorized, forbidden, not found, and conflict onto one JSON shape. Any other error becomes HTTP 500 with "Something went wrong." and no internal text. | 0001 | done |
| KRN-SVC-12 | `GET /health` reports the app, a live database query, the extension host, and the queue. The queue stays `not_configured`. A failed database or host returns 503. | 0004 | done |
| KRN-SVC-13 | `GET /api/v1/schools` returns a page of the signed-in person's schools and an ISO timestamp. `GET /api/v1/openapi.json` is an OpenAPI 3.1 document for that path. A caller who is not signed in gets 401. | 0001 | done |
| SDK-01 | `defineModule` and `definePlugin`. A plugin that declares pages or permissions is rejected. | 0001 | done |
| SDK-02 | `createExtensionContext` hides core reads and notifications unless the school granted them. Page, hook, slot, event, and lifecycle calls pass that context, including the extension's settings. | 0003 | done |
| SDK-03 | `view.page` and `view.text` build a view document. Hello uses them. | 0006 | done |
| SDK-04 | `createScopedDatabase` is a Drizzle sqlite-proxy client. It adds `school_id` for the current school, then the checker runs. A query against another module's table never executes. | 0003 | done |
| SDK-05 | `fakeExtensionContext` returns settings, and adds the student list and notification sender only when the test grants those capabilities. | 0001 | done |
| RUN-01 | `ExtensionHost.getEntrypoint` takes an installed version and the grants for that school. | 0004 | done |
| RUN-02 | `bundledExtensionHost` calls the compiled entrypoint in-process. Pages, hooks, slots, events, and lifecycle use it. A key that is not bundled is refused. | 0004 | done |
| RUN-05 | A page or lifecycle call stops after 5 seconds, a hook after 50 ms, and an event after 30 seconds. The scoped client stops after 100 statements. A rejected statement is not counted. | 0004, 0007 | done |

### 5.4 Phase 3

| ID | Module | Status |
|----|--------|--------|
| MOD-ACA-01 | Academics structure. `/x/academics` lists this school's levels, streams, forms, and form classes. Editing still uses the existing level screens. Removing a level, stream, or form is refused while it still has children. A class size is the number of enrolled students. | done |
| MOD-ACA-02 | Years and terms. One year can be active, one term can be current, and setting that term publishes `academics.term.started`. An archived year keeps its name and dates. Deleting a year is refused when a student is enrolled in it, a grade is recorded in one of its terms, or an invoice exists for the year. Deleting a term is refused when a grade or an attendance row is recorded in it. The year editor still uses the kernel tables. | done |
| MOD-ACA-03 | Subjects tied to levels. A subject stores a level, the stream is optional, and the free-text stream, instructor, and enrolled count columns are gone. The subjects page still shows a computed enrolled count. | done |
| MOD-ACA-04 | Subjects per form class. Assigning subjects on a class page saves them for that form class, and Academic structure lists them. The university `class_subjects` table is gone. | done |
| MOD-ACA-05 | A-Level combinations. An admin can create a combination, add and remove A-Level subjects, and retire it. Academic structure lists them. Assigning a combination to a student waits for MOD-STU-07. | done |
| MOD-ACA-06 | Retire the university class model. `classes`, `teacher_classes`, and `class_subjects` are dropped. Students no longer store `class_id`, and teachers no longer store `department_id`. Classrooms, teacher assignments, and subject assignments use form classes. The academics schema file still lists `classes` and `class_subjects` as compiled module tables, which the screens do not read. | done |
| MOD-STU-01 | Student records. A student stores a first, middle, and last name, plus gender, date of birth, and admission date. `/x/students` lists this school's students. Creating and editing still use the existing student screens. | done |
| MOD-STU-02 | Admission numbers. A blank number is filled from the school format `{year}-{seq:4}`, which an admin can change on Extensions. A typed number is kept when it is free in this school, and the same number is refused. Changing a number is refused when it is already on a report or an invoice. An invoice now counts. Reports are still not stored, so that count stays zero. | done |
| MOD-STU-03 | Year-scoped enrolment. A student has one class record for each academic year. `/x/students` lists those years. Enrolments can place a student in a class, move them within the year when a reason is recorded, and end the year as left or transferred. The student row stays. Promotion into the next year waits for MOD-STU-04. | done |
| MOD-STU-04 | Promotion and graduation. A whole class, or selected students, can move into a class on the next form for a later year. The old class stays on the earlier year. Form 4 at O-Level and Form 6 at A-Level are marked graduated, and the student row stays. | done |
| MOD-STU-05 | Guardian records. A guardian is a person in `guardians`, linked through `guardian_students` with a relationship and one primary contact per student. One person can be linked to several students, and one student can have several guardians. Removing a guardian is refused while a link remains. `/x/students` lists the relationship without the phone or email. Opening `/guardians` writes `guardians.contact.read` to the audit log. Inviting a guardian to sign in waits for MOD-STU-06. The older `guardian_name` and `guardian_phone` columns on the student row remain until the student form stops using them. | done |
| MOD-STU-06 | Guardian accounts. An admin can invite a guardian who has an email. Accepting the invitation gives them the parent role, tied to that guardian record. They see only the students linked to them, on the student list, enrolments, and `/x/students`. Results, attendance, and fees are on the profile tab for those students. | done |
| MOD-STU-07 | Year-scoped student subjects. A student's subjects are stored for one academic year in `student_year_subjects`. Saving, including the existing assign-subjects action, replaces the active year only. An A-Level combination can be assigned for that year when the student has an A-Level enrolment, and a retired combination is refused. `/x/students` lists the year and its subjects. | done |
| MOD-STU-08 | Student portal via slots. A student account opens `/portal` and sees their own profile, class for the active year, and subjects for that year. Other modules add to the page through `student.profile.tabs`. Results, attendance, timetable, and calendar appear when those modules add a tab. | done |
| MOD-STF-01 | Staff records and staff type. A staff record stores a type (teaching, finance, administration, or support), name, gender, phone, email, address, and an optional qualification. Inactive keeps the record. Removal is refused while a teaching assignment or a recorded result exists. Incidents are not stored yet, so that count stays at zero. `/staff` is the staff screen. The existing `/teachers` screen still works. The free-text `teachers.subject` column remains, and a new record stores the staff type there until assignments are the source of truth. | done |
| MOD-STF-02 | Year-scoped teaching assignments. `teaching_assignments` stores one teacher, subject, and class for one academic year. The same combination in that year is refused. A teacher with assignments for the active year sees those students, including enrolled and promoted rows. The older `teacher_subjects` and `teacher_form_classes` tables remain for a teacher who has no year assignment yet. | done |
| MOD-STF-03 | Staff accounts via memberships. An admin can invite a staff member who has an email. Accepting the invitation sets `school_memberships.teacher_id`. That person sees their own active-year assignments. Writes stay with `staff.record.write`. | done |
| MOD-ASM-01 | Assessment types. A school starts with assignment, test, quiz, midterm, and final exam. An admin can add a type and deactivate one. A deactivated type leaves the mark list. | done |
| MOD-ASM-02 | Results tied to a student, year, term, subject, and assessment type. `results` stores the score, grade, comment, and the teacher who recorded it. One entry exists for a student, term, subject, and assessment type. The existing `grades` table and `/grades` screen stay. | done |
| MOD-ASM-03 | Grading scales. Each level starts with 75-100 A, 65-74 B, 45-64 C, 30-44 D, and 0-29 F. A mark outside those bands is refused. | done |
| MOD-ASM-04 | Mark entry by class. `/marks` enters one assessment for a class, subject, year, and term. A teacher can enter marks only for an assigned class and subject. An admin can enter without being the assigned teacher. A released term refuses changes until the release is withdrawn. | done |
| MOD-ASM-05 | Report cards. `/report-card` is a printable page for one student and one term. The PDF is the browser print dialog. No PDF file is generated. | done |
| MOD-ASM-06 | Results release. An admin releases or withdraws a term. Students and parents see released results only, on `/x/students` and on the profile tab. Teachers see the marks they entered before release. Withdrawing hides the results again and keeps the mark. | done |
| MOD-CAL-01 | Calendar events. `calendar_events` stores a title, description, date, type, academic year, and a text attachment. The existing `notices` table stays. Cancelling an event keeps the row. File attachments wait until file storage exists. | done |
| MOD-CAL-02 | Event notifications. Notifying parents writes an in-app message through `NotificationService`. SMS and email stay deferred. | done |
| MOD-CAL-03 | Dashboard widget. Upcoming scheduled events appear in the `dashboard.widgets` slot from the notices module, beside the Hello widget. A cancelled event drops off the widget. | done |

Dogfood rule from ADR 0001: ordinary create, view, update, and remove screens in these modules should return view documents, so the vocabulary is exercised before any third party uses it. Custom React routes are allowed only where a view document cannot express the screen. The existing level, subject, classroom, student, staff, and grade screens stay as they are so the current product does not change look. The module page at `/x/academics` is the view document for the structure.

### 5.5 Phase 4

Attendance is first. It is the proof that a module can ship with view documents and no custom React routes (specification phase 4, ADR 0006).

| ID | Module | Status |
|----|--------|--------|
| MOD-ATT-01 | Daily attendance. `/x/attendance` is a view document, and `/attendance` redirects there. A day stores present, absent, or late. An admin sets how many days stay editable. A closed day is refused: "Attendance can be changed for the last 7 days." Amina Juma Hassan is absent on 2026-10-08 with the comment "Home sick". Peter is not on the 1A roll. | done |
| MOD-ATT-02 | Mark the class present, then edit one student. Marking the class writes present for every enrolled or promoted student. Amina was marked present with 1A, then changed to absent. | done |
| MOD-ATT-03 | Absence event. Changing a student to absent publishes `attendance.record.marked_absent`. When absence alerts are on, the primary guardian is notified in the app if that guardian has an account. Juma has no account, so the linked parent received "Amina Hassan was marked absent on 2026-10-08." Saving a row that is already absent does not publish again. SMS and email stay deferred. | done |
| MOD-ATT-04 | Attendance reports. The term line is "Amina Juma Hassan, Term 1: 0 present, 1 absent, 0 late, 0%". The dashboard widget shows today's counts. The profile tab shows the same term line. Late is not counted as present. | done |
| MOD-FIN-01 | Fee items. `/x/finance` is a view document. An admin can add a fee item and deactivate it. Riverside keeps "Term fees" (TERM) active. | done |
| MOD-FIN-02 | Fee structures. An amount is stored in minor units for a class, fee item, and the active year. 1A Term fees is TZS 50,000.00. | done |
| MOD-FIN-03 | Invoices. Creating invoices bills enrolled and promoted students in the active year. A new enrolment does the same. INV-2026-0001 was void while unpaid. INV-2026-0002 is open for Amina, with an extra Books charge. Peter, who is transferred, has no invoice. Filtering by Peter shows no invoices. | done |
| MOD-FIN-04 | Payments. A payment records amount, date, method, and reference, and is allocated to one invoice. The balance is the lines minus the allocations. INV-2026-0002 is TZS 45,000.00 outstanding after a reversed cash payment and two later payments. | done |
| MOD-FIN-05 | Receipts. A payment gets the next number, RCT-2026-0001 for the cash payment and RCT-2026-0002 for the provider payment. The receipt page can be printed. A file is not generated. The linked parent receives an in-app message. SMS and email stay deferred. | done |
| MOD-FIN-06 | Class and term summary. "1A, Term 1: expected TZS 60,000.00, paid TZS 15,000.00, outstanding TZS 45,000.00". A void invoice is left out of the totals. | done |
| MOD-FIN-07 | Payment provider contract. `finance.paymentProvider` accepts a confirmed payment. The same provider and external reference, manual EXT-1, does not create a second payment. A mobile-money plugin still waits for phase 5. | done |
| MOD-FIN-08 | Reconciliation. A provider payment with no invoice stays unmatched. manual EXT-2 was matched to INV-2026-0002. Reject stays available only while the payment is unmatched. | done |
| MOD-FIN-09 | Financial audit. Charges, payments, allocations, the void, and the reversal are in the audit log. Reversal is a new entry with a reason, "Wrong amount", and the original payment stays. A second reversal is refused. | done |
| MOD-TTB-01 | Periods. `/x/timetable` is a view document. An admin adds, edits, and removes named periods with a start and end. Riverside has Lesson 1, 08:00-08:45. A period that still has lessons cannot be removed: "Remove the lessons in this period first." A repeated name is refused. | done |
| MOD-TTB-02 | Timetable entries. A lesson places a subject, teacher, and class into a day and period for the active year. Monday and Tuesday Lesson 1 are Mathematics with Joseph A Kimaro in 1A. A lesson can be removed. | done |
| MOD-TTB-03 | Clash detection. The same teacher or the same class cannot be booked twice in one day and period. A second Monday booking says "This teacher is already booked in that period." Booking 1A again with another teacher says "This class is already booked in that period." | done |
| MOD-TTB-04 | Personal timetables. A teacher sees their own lessons and cannot change the week. Joseph sees both 1A lessons and no edit forms. Amina's profile tab lists the same 1A week. A student or linked parent is limited to their class. | done |
| MOD-LSN-01 | Lesson-plan templates. An admin creates, edits, and retires a template. Riverside keeps "Weekly lesson" active. "Old outline" is retired and cannot be chosen for a new plan. | done |
| MOD-LSN-02 | Submission. A teacher writes a plan for a subject, class, and the active year, then submits it. The teacher sees and revises only their own draft or returned plan. Fractions is Mathematics with Joseph A Kimaro in 1A for 2026/2027. Joseph revised it after it was returned, then submitted it again. A submitted or approved plan cannot be changed. File attachments stay deferred. See section 2.1. | deferred |
| MOD-LSN-03 | Review. An admin approves a submitted plan or returns it with a comment. An empty return is refused. Fractions was returned with "Add the starter activity.", revised, and then approved. | done |
| MOD-DIS-01 | Incident types and severity. An admin creates, edits, and deactivates both lists. Riverside keeps "Late to class" and "Low" active. "Old type" and "Unused" are inactive and cannot be chosen for a new incident. | done |
| MOD-DIS-02 | Incident records. A teacher records type, severity, what happened, the action, and the date, and can update it while it is open. Joseph recorded Amina Juma Hassan on 2026-10-08: arrived after the bell, then changed the action to "Spoken to and a note sent home." An admin can close it. A closed incident cannot be changed. | done |
| MOD-DIS-03 | Restricted visibility. An admin sees every incident. The teacher who recorded it sees that incident. A linked guardian sees incidents for their students. A student does not. Each view is audited: Joseph's views and the admin's view and close are in the audit log. Neema was not signed in, so the guardian screen was not opened. | done |
| MOD-CLB-01 | Clubs. An admin creates, edits, and closes a club with a name, a description, and a patron. Science club stays open with Joseph A Kimaro as patron. Chess club is closed and cannot take new members or activities. | done |
| MOD-CLB-02 | Membership for the year. An admin adds and removes a student. Amina Juma Hassan was removed from Science club and added again for 2026/2027. A second membership is refused. A student and a linked parent see the clubs that student belongs to. Amina and Neema were not signed in, so those screens were not opened. | done |
| MOD-CLB-03 | Activities. The patron records, edits, and removes an activity. Joseph kept "2026-10-09 Friday experiment: Science club" and removed a second activity. A closed club refuses a new activity. | done |
| MOD-LDR-01 | Leadership positions | done | `/x/leadership` is a view document. An admin creates and renames positions. "Head girl" was renamed from "Prefect". "Old post" is retired and cannot be chosen for a new appointment. A teacher sees the names and has no edit buttons. Amina was not signed in, so her own student screen was not opened. |
| MOD-LDR-02 | Appointments | done | An admin appoints a student for the active year with a start and an end date, and can end that appointment once. A second open appointment for the same student and position is refused. Amina Juma Hassan holds Head girl from 2026-09-01 to 2027-06-30. The earlier appointment is ended. Current holders show "Amina Juma Hassan, Head girl". Joseph sees that line and no appointment history or forms. The admin session was restored. |
| MOD-RPT-01 | Role dashboards made only of widgets | done | `/x/reports` is a view document built from `dashboard.widgets`. The existing home cards stay. An admin sees "Admin: 3 students, 2 staff." plus Hello, the fee reminder, and today's attendance. Joseph sees "Teacher: Mathematics, 1A." and the same shared widgets, with no import form. Amina and Neema were not signed in. |
| MOD-RPT-02 | CSV import with preview, and CSV export | done | An admin exports students, staff, and fee structures. A row with no last name is refused and is not saved. A repeated admission number is refused. 1A TERM stays TZS 50,000.00 because that fee is already set. Report Sample (RPT-001) was imported and is not enrolled in a class. Csv Checker (support, csv.checker@riverside.test) was imported. The admin session was restored. |

### 5.6 Phase 5

| ID | Work | ADR | Status |
|----|------|-----|--------|
| RUN-03 | `DynamicWorkerExtensionHost` | 0004 | done | The host loads `key@version` and passes only the granted capabilities. Without a Worker Loader binding it refuses to start the package. |
| RUN-04 | Capability RPC stubs | 0003, 0004 | done | A call is refused when the capability was not granted, the school does not match, or nobody is signed in. |
| RUN-06 | Zip upload limits and path checks | 0005 | done | A package over 5 MB, a path with `..`, or an unexpected file is refused. The upload control is hidden on this server. |
| RUN-07 | Manifest, schema, locale, and core-version checks | 0005 | done | A plugin schema, a locale that is not an object, and a core range this app does not satisfy are refused before storage. |
| RUN-08 | Ed25519 verification, unsigned only when `EXTENSIONS_ALLOW_UNSIGNED=true` | 0005 | done | A matching trusted key is accepted. A missing signature is refused unless unsigned packages are allowed, and that mode warns that it must stay off in production. A revoked key is refused. |
| RUN-09 | Trusted publishers, add, rotate, revoke | 0005 | done | The school owner can trust an Ed25519 public key and revoke it once. Each change is audited. A second copy of the same key is refused. |
| RUN-10 | Immutable R2 storage by key and version | 0004, 0005 | deferred | A package that passes the checks is discarded because package storage is not configured. See section 2.1. |
| RUN-11 | Consent screen in English and Swahili | 0005 | done | Students shows "It can read student records." The same line in Swahili is "Inaweza kusoma rekodi za wanafunzi." A package with no outbound hosts says it does not call other servers. |
| RUN-12 | Revocation disables the version on the next request and notifies admins | 0005 | done | A revoked version is not loaded. The dynamic host does not start it. The extensions page can revoke a version, and the audit log records it. |
| RUN-13 | Hide upload when the Worker Loader binding is absent | 0004 | done | Riverside's owner sees "Zip upload needs the Worker Loader binding. This server does not have it, so upload stays hidden." There is no file field. A teacher does not see that section. |
| PLG-01 | SMS channel | 0005 | done | A school sets a sender. A message for a phone number is recorded with a receipt. Riverside shows "0712000001: Absent. not_sent. No SMS gateway is configured, so this message was not sent." |
| PLG-02 | Email channel | 0005 | done | A school sets a sender. neema@riverside.test and juma@riverside.test have fee reminder receipts that were not sent, because no email gateway is configured. |
| PLG-03 | Mobile money provider, shipped as a signed zip | 0004, 0005 | deferred | A signed zip cannot be stored or loaded. Manual payments already work. See section 2.1. |
| PLG-04 | Absence alert | 0007 | done | The plugin subscribes to the absence event and records an SMS and an email in the guardian's preferred language. Riverside's guardians use English, so the receipt title is "Absent". The Swahili title is "Hayupo". |
| PLG-05 | Fee reminder job | 0007 | done | An administrator runs the job from Fee reminders. Guardians of a student who still owes fees get a receipt. The daily clock waits with KRN-SVC-06. |
| PLG-06 | Theme package schema. JSON colour tokens only. The `yoyol` key injects nothing, so the current look stays. | 0008 | done |
| PLG-07 | Upload and activate on `/themes`. Stored by the core in `school_themes`. The school profile only links there. | 0008 | done |
| PLG-08 | Example theme download. It changes colours only after a school activates it. | 0008 | done |
| PLG-09 | `/themes` installation page. Install packages and set the active theme. | 0008 | done |

### 5.7 Phase 6

| ID | Work | Status |
|----|------|--------|
| SDK-CLI-01 | `yoyol-ext create` | done | `pnpm ext create field-notes --kind plugin` writes a manifest, both locales, an entrypoint, and a test that passes. |
| SDK-CLI-02 | `yoyol-ext validate` | done | A plugin with a schema file is refused. A locale that is not an object of strings is refused. A module migration that is not valid is refused. |
| SDK-CLI-03 | `yoyol-ext build` and `yoyol-ext pack` | done | Build writes `dist/server.js`. Pack writes a zip the core package checks accept. |
| SDK-CLI-04 | `yoyol-ext sign` in CI only, private key never in this repo | done | `YOYOL_SIGNING_KEY` is a base64 PKCS8 key from the environment. An empty key is refused with the CI secret message. A signed file verifies against the matching public key. |
| SDK-CLI-05 | Local dev server | deferred | `pnpm ext dev` validates and tells you to seed and run `pnpm dev`. Hot reload of an unpacked package waits in section 2.1. |
| ENG-11 | Release automation | deferred | A `v*` tag runs tests, the traceability report, and the app build, and checks CHANGELOG. The Docker image publish waits in section 2.1. |
| ENG-12 | Traceability report | done | `scripts/traceability.ts` lists feature ids from `docs/features.md` that no kernel test mentions. |
| DOC-01 | LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG, templates | done | MIT license, the five governance files, a bug issue template, and a pull request template are at the repository root and under `.github`. |
| DOC-02 | Architecture overview | done | `docs/architecture.md` describes the request path, the kernel and extension folders, and D1 as the running database. |
| DOC-03 | Data dictionary | done | `docs/data-dictionary.md` is generated from the Drizzle SQL and extension schema files. Reports includes `mod_reports_previews`. |
| DOC-04 | API reference | done | `docs/api.md` lists every path in the OpenAPI document. The document is served at `/api/v1/openapi.json`. |
| DOC-05 | Extension developer guide | done | `docs/extension-developer-guide.md` shows create, validate, build, pack, and sign, and says the private key stays in CI. |
| DOC-06 | Cloudflare and Docker deployment guides | deferred | Local D1 and Wrangler deploy are in `docs/deployment.md`. Docker, R2, Queues, Worker Loader, and backup wait in section 2.1. |
| DOC-07 | Role guides in English and Swahili | done | `docs/guides/roles.en.md` and `docs/guides/roles.sw.md` cover admin, teacher, finance, student, and parent. |
| DOC-08 | Key rotation, revocation, and breach steps | done | `docs/security-incidents.md` says to revoke the publisher key, trust a new key id, and revoke the signed version. |
| DOC-09 | Contributor quickstart | done | `docs/contributor-quickstart.md` is install, copy `.dev.vars.example`, migrate, seed, and `pnpm dev`. |

### 5.8 Catalog gaps

These requirements are in the SRS and are not a feature ID in `docs/features.md`. They are in scope. Before the phase that needs them starts, add the ID to `docs/features.md` and point it at the same requirement. Do not implement them under an unnamed change.

| ID | Add to catalog as | Covers | Phase | Status |
|----|-------------------|--------|-------|--------|
| GAP-SCH-01 | School profile create, view, update, logo, and theme applied across the app | FR-SCH-01, FR-SCH-02, FR-SCH-03, FR-SCH-04 | 1 | done |
| GAP-SCH-02 | Archive a school. It leaves the switcher, and `can()` fails except restore. The owner can still sign in. | FR-SCH-05 | 1 | done |
| GAP-SCH-03 | Campus search and filter, refuse removal while in use, exactly one main campus | FR-SCH-07, FR-SCH-09, FR-SCH-10. Create and update sit on KRN-IAM-02. | 1 | done |
| GAP-IAM-01 | Own profile (name, phone, photo, language) and change password. The existing profile screen covers this. | FR-IAM-10, FR-IAM-11 | 1 | done |
| GAP-IAM-02 | Suspend, restore, and remove a membership without deleting the linked record | FR-IAM-16, FR-IAM-17 | 1 | done |
| GAP-IAM-03 | Create, rename, and delete custom roles. System roles stay protected. | FR-IAM-18. Seeding is KRN-IAM-04. | 1 | done |
| GAP-IAM-04 | Account registration still works after tenancy, and lands in no school until invited or onboarded | FR-IAM-01 | 1 | done |
| GAP-IAM-05 | Member list and change-role screen | FR-IAM-14, FR-IAM-15 | 1 | done |
| GAP-NTF-01 | Parent chooses a contact channel from the ones the school offers. Deferred until after the phases. See section 2.1. | FR-NTF-03 | 2 | deferred |

Count check: features.md IDs in this plan are REP 5, ENG 12, KRN-IAM 16, KRN-DAT 13, KRN-REG 12, KRN-EVT 7, KRN-UIX 9, KRN-SVC 13, RUN 13, SDK 5, SDK-CLI 5, MOD-ACA 6, MOD-STU 8, MOD-STF 3, MOD-ASM 6, MOD-CAL 3, MOD-ATT 4, MOD-FIN 9, MOD-TTB 4, MOD-LSN 3, MOD-DIS 3, MOD-CLB 3, MOD-LDR 2, MOD-RPT 2, PLG 5, DOC 9. That is 185 after KRN-REG-13 and PLG-09. Plus 9 GAP rows and 4 OUT rows.

Install pages:

- `/extensions` is where a school administrator installs extensions (KRN-REG-13). Bundled extensions install on this page now. A signed zip uses the same page later (RUN-06) and does not get a second screen.
- `/themes` is where a school administrator installs theme packages and sets the active one (PLG-09). The school profile links here. It does not host a second copy of the installer.

## 6. Requirement coverage

Every functional requirement is owned by one row above. A requirement with no owner is a skip. Reviewers use this table, not memory.

| Requirements | Owner | Notes the owner must not drop |
|--------------|-------|-------------------------------|
| FR-SCH-01 to FR-SCH-04 | GAP-SCH-01 | Name, motto, logo, colours, address, phone, email, registration number |
| FR-SCH-05 | GAP-SCH-02 | Records stay, new sign-in stops |
| FR-SCH-06, FR-SCH-08 | KRN-IAM-02 | Campus fields and main-campus flag |
| FR-SCH-07, FR-SCH-09, FR-SCH-10 | GAP-SCH-03 | Search, filter, in-use guard, one main campus |
| FR-IAM-01 | GAP-IAM-04 | Email and password registration |
| FR-IAM-02, FR-IAM-03, FR-IAM-04 | KRN-IAM-10, KRN-IAM-11 | Session ends immediately, including all devices |
| FR-IAM-05 | KRN-IAM-09 | Adaptive hash, weak passwords rejected |
| FR-IAM-06 | KRN-IAM-12 | Slow, then lock, and write the lockout |
| FR-IAM-07, FR-IAM-08 | KRN-IAM-15 | Single use, expiring, no account disclosure |
| FR-IAM-09 | KRN-IAM-13 | School can require it for admin and finance |
| FR-IAM-10, FR-IAM-11 | GAP-IAM-01 | English or Swahili preference |
| FR-IAM-12, FR-IAM-13 | KRN-IAM-14 | Optional link to staff, student, or guardian |
| FR-IAM-14, FR-IAM-15 | GAP-IAM-05 | |
| FR-IAM-16, FR-IAM-17 | GAP-IAM-02 | Linked student, staff, or guardian record remains |
| FR-IAM-18 | GAP-IAM-03, KRN-IAM-04 | Five built-in roles cannot be deleted |
| FR-IAM-19 | KRN-IAM-05 | |
| FR-IAM-20 | KRN-IAM-06 | Server refusal even when the control is hidden |
| FR-IAM-21 | KRN-IAM-07 | |
| FR-IAM-22 | KRN-IAM-08 | |
| FR-IAM-23 | KRN-SVC-08 | Sign-in, sign-out, permission changes, membership changes |
| FR-ACA-01 to FR-ACA-15 | MOD-ACA-01 | Removal refused while children exist. Class counts come from enrolment. |
| FR-ACA-16 to FR-ACA-20, FR-ACA-22 | MOD-ACA-03, MOD-ACA-04 | Deactivate and reactivate. Unique subject code per school. |
| FR-ACA-21 | MOD-ACA-05 | Retire a combination |
| FR-ACA-23 to FR-ACA-31 | MOD-ACA-02 | One active year, one current term. Refuse deletion when enrolments, results, invoices, or attendance exist. |
| FR-STU-01 to FR-STU-09 | MOD-STU-01, MOD-STU-02 | Status values: active, suspended, transferred, left. Admission number unique per school. |
| FR-STU-10 | MOD-RPT-02 | Validation preview before save |
| FR-STU-11 to FR-STU-17 | MOD-STU-03, MOD-STU-04 | Past class is kept on promotion |
| FR-STU-18 | MOD-STU-08, KRN-IAM-07 | Teacher sees assigned classes for the active year |
| FR-STU-19 to FR-STU-23 | MOD-STU-05, MOD-STU-06 | Many-to-many, one primary contact, removal refused while linked |
| FR-STU-24 | MOD-STU-06, KRN-IAM-07 | Parent sees only linked students |
| FR-STU-25 | MOD-STU-05, KRN-SVC-08 | Non-guardian views of contact details are audited |
| FR-STU-26, FR-STU-27 | MOD-STU-07 | Past years stay unchanged |
| FR-STU-28 | MOD-STU-08 | Profile includes slots from other modules |
| FR-STU-29 | KRN-EVT-07, MOD-STU-03 | `students.student.enrolled` and `students.student.updated` |
| FR-STF-01 to FR-STF-06 | MOD-STF-01 | Inactive keeps history. Removal refused when assignments, results, or incidents exist. |
| FR-STF-07 to FR-STF-10, FR-STF-13 | MOD-STF-02 | No duplicate active assignment of the same teacher, subject, and class in one year |
| FR-STF-11 | MOD-STF-03, KRN-IAM-14 | |
| FR-STF-12 | MOD-RPT-02 | |
| FR-ASM-01 | MOD-ASM-01 | |
| FR-ASM-02, FR-ASM-05, FR-ASM-09 | MOD-ASM-02, MOD-ASM-03 | Grade from the scale, reject out of range, results stay on the enrolment year |
| FR-ASM-03, FR-ASM-04 | MOD-ASM-04 | Editable until the term is released |
| FR-ASM-06, FR-ASM-07 | MOD-ASM-06 | Withdraw a release. Students and parents see released results only. |
| FR-ASM-08 | MOD-ASM-05 | Print and download |
| FR-ATT-01, FR-ATT-03 | MOD-ATT-01 | Admin sets how many days stay editable |
| FR-ATT-02 | MOD-ATT-02 | |
| FR-ATT-04, FR-ATT-06 | MOD-ATT-04 | Student, class, and term |
| FR-ATT-05 | MOD-ATT-03, PLG-04, GAP-NTF-01 | Only when the school has turned alerts on |
| FR-FIN-01 | MOD-FIN-01 | |
| FR-FIN-02 | MOD-FIN-02 | |
| FR-FIN-03, FR-FIN-04, FR-FIN-05 | MOD-FIN-03 | Ad-hoc charge and void of an unpaid invoice |
| FR-FIN-06, FR-FIN-07 | MOD-FIN-04 | Integer minor units |
| FR-FIN-08, FR-FIN-11 | MOD-FIN-05 | Parent can view and download the receipt, and can see what is owed |
| FR-FIN-09, FR-FIN-14 | MOD-FIN-09 | Reversal is a new entry with a reason |
| FR-FIN-10 | MOD-FIN-06 | |
| FR-FIN-12 | MOD-FIN-07, PLG-03 | Idempotent allocation |
| FR-FIN-13 | MOD-FIN-08 | |
| FR-TTB-01 | MOD-TTB-01 | |
| FR-TTB-02, FR-TTB-03 | MOD-TTB-02, MOD-TTB-03 | |
| FR-TTB-04 | MOD-TTB-04 | Teacher, student, and linked parent |
| FR-LSN-01 | MOD-LSN-01 | |
| FR-LSN-02, FR-LSN-03 | MOD-LSN-02 | |
| FR-LSN-04 | MOD-LSN-03 | |
| FR-DIS-01 | MOD-DIS-01 | |
| FR-DIS-02, FR-DIS-03 | MOD-DIS-02 | |
| FR-DIS-04 | MOD-DIS-03 | |
| FR-CLB-01 | MOD-CLB-01 | |
| FR-CLB-02, FR-CLB-04 | MOD-CLB-02 | Student and parent can view the student's clubs |
| FR-CLB-03 | MOD-CLB-03 | |
| FR-CAL-01, FR-CAL-02, FR-CAL-03 | MOD-CAL-01 | |
| FR-CAL-04 | MOD-CAL-02 | Includes a fee reminder |
| FR-LDR-01 | MOD-LDR-01 | |
| FR-LDR-02, FR-LDR-03 | MOD-LDR-02 | |
| FR-NTF-01, FR-NTF-04 | KRN-SVC-03 | Sent, delivered, or failed |
| FR-NTF-02 | KRN-SVC-05 | |
| FR-NTF-03 | GAP-NTF-01 | |
| FR-FIL-01, FR-FIL-02 | KRN-SVC-02 | |
| FR-AUD-01 | KRN-SVC-09 | |
| FR-AUD-02 | KRN-DAT-11 | Export, and erase when the school confirms it is lawful |
| FR-EXT-01 | KRN-REG-05, SDK-01 | Plugins and modules |
| FR-EXT-02 | RUN-06, RUN-07 | Unsigned, oversized, and invalid packages are rejected |
| FR-EXT-03 | RUN-08, RUN-09 | |
| FR-EXT-04 | RUN-11 | |
| FR-EXT-05 | KRN-REG-05, KRN-REG-06, KRN-REG-07 | Disable keeps data |
| FR-EXT-06 | KRN-REG-08 | Keep, or export then delete |
| FR-EXT-07 | KRN-REG-09 | Academics, students, staff |
| FR-EXT-08 | KRN-REG-11, KRN-UIX-04 | |
| FR-EXT-09 | KRN-UIX-06 | |
| FR-EXT-10 | KRN-EVT-03, KRN-EVT-04 | |
| FR-EXT-11 | RUN-12 | |
| FR-EXT-12 | KRN-IAM-01, KRN-DAT-07 | |
| FR-I18N-01 | KRN-SVC-07, GAP-IAM-01 | Choice is remembered |
| FR-I18N-02 | KRN-SVC-07 | Dates, numbers, money |
| FR-ACC-01, FR-ACC-02 | KRN-UIX-09 and the definition of done | Keyboard, screen reader, phone, slow connection. Applies to every screen, not one ticket. |

SRS functional requirements in the source document run FR-SCH-01..10, FR-IAM-01..23, FR-ACA-01..31, FR-STU-01..29, FR-STF-01..13, FR-ASM-01..09, FR-ATT-01..06, FR-FIN-01..14, FR-TTB-01..04, FR-LSN-01..04, FR-DIS-01..04, FR-CLB-01..04, FR-CAL-01..04, FR-LDR-01..03, FR-NTF-01..04, FR-FIL-01..02, FR-AUD-01..02, FR-EXT-01..12, FR-I18N-01..02, FR-ACC-01..02. That is 182 requirements. Each appears in the table above.

## 7. ADR consequence check

Each consequence in the ADRs has a home. If a new ADR is accepted later, add its consequences here before writing code.

| ADR | Consequence | Home |
|-----|-------------|------|
| 0001 | New business areas are modules | Phase 4 |
| 0001 | Service container, routes, sidebar, and schema index become registries | KRN-REG-10, KRN-REG-11, KRN-DAT-05 |
| 0001 | Existing features move into `extensions/*` | Phase 3 |
| 0001 | Kernel API is semver, extensions declare `requires.core` | KRN-REG-01, KRN-REG-04 |
| 0002 | Tenancy is a prerequisite and comes first | Phase 1 |
| 0002 | Back-fill `school_id`, then drop `owner_user_id` | KRN-IAM-01 |
| 0002 | `can()` instead of role-name checks | KRN-IAM-06 |
| 0002 | Restrict deletes for minors and money | KRN-DAT-10 |
| 0003 | Extensions never receive a driver | KRN-DAT-07, RUN-04 |
| 0003 | Statement checker fail closed, including for bundled modules | KRN-DAT-08, D-03 |
| 0003 | Core data through core APIs | KRN-DAT-09 |
| 0003 | Declarative migrations, raw SQL for bundled modules only | KRN-DAT-06 |
| 0003 | `data.batch()` for installed-mode latency | SDK-04 |
| 0003 | Database-per-school kept as an alternative | OUT-04 |
| 0004 | Host interface, bundled host, Dynamic Worker host | RUN-01, RUN-02, RUN-03 |
| 0004 | Zip install is Cloudflare-only in v1 | RUN-13, OUT-02 |
| 0004 | Sandboxed extensions cannot return React components | KRN-UIX-03, ADR 0006 |
| 0005 | Signature, trusted publishers, revocation, unsigned dev flag | RUN-08, RUN-09, RUN-12 |
| 0005 | Signing only in publisher CI | SDK-CLI-04 |
| 0005 | No open marketplace in v1 | OUT-03 |
| 0005 | Incident procedure for keys | DOC-08 |
| 0006 | View documents, catch-all route, slots, no HTML | KRN-UIX-02, KRN-UIX-03, KRN-UIX-04, KRN-UIX-06 |
| 0006 | Bundled CRUD prefers view documents | Phase 3 dogfood rule |
| 0006 | Iframe escape hatch is later | OUT-01 |
| 0007 | Hooks in request, events in the outbox | KRN-EVT-01, KRN-EVT-03 |
| 0007 | Queues on Cloudflare, polling on Node | KRN-EVT-04 |
| 0007 | Handlers are idempotent and receive `event.id` | KRN-EVT-06 |

## 8. Close-out rule

A phase pull request may be merged only when:

1. Every ID assigned to that phase in section 5 is `done` or `deferred` with a reason and a new ID.
2. Every requirement in section 6 whose owner sits in that phase is named by at least one test.
3. ENG-12, once it exists, reports no missing ID for that phase.
4. This file's status cells match the merged code.

The architecture adoption is finished when the phase board is entirely `done` and the four OUT rows are still `out of v1` with their ADRs unchanged.
