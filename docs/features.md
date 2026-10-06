# YOYOL Features for the Pluggable Architecture

- Version: 0.1 (draft)
- Date: 2026-10-05
- Sources: [SRS v0.4](../YOYOL_SRS_Draft.pdf), [ADRs](adr/README.md),
  [Extension specification](extensions/specification.md), current code on `main` (`bd46612`)

This document lists every feature needed to turn the current YOYOL codebase into a core
framework with installable modules and plugins, grouped by owning module or area and
ordered roughly in build sequence. Each feature has a stable ID (for example `KRN-IAM-03`)
for tests, pull requests and traceability (SRS TR-3); withdrawn features keep their ID.

## 1. Definition of Done (applies to every feature)

A feature is complete only when all of the following hold. These rules are not repeated
under each feature.

**Test-driven development (SRS 7)**

- Work starts with a failing test named after the feature ID, then the minimum code to pass,
  then refactoring. Bug fixes start with a failing regression test (SRS TR-7).
- Business rules have unit tests. Database code has integration tests on D1 through
  `@cloudflare/vitest-pool-workers`, and on PostgreSQL once the adapter exists. User-facing
  flows have at least one Playwright test. Coverage stays at or above 80% (SRS TR-5).

**Security and privacy (SRS 12, 13)**

- Every loader, action, service call and extension entry point validates input with `zod`.
- Permissions are checked on the server with `can(permissionKey)`. Hiding a button is never
  the only protection.
- Every query is scoped to the current school. A test proves that one school cannot read
  another school's data.
- Access to sensitive data (minors, guardians, payments) and every security-relevant action
  is written to the audit log.
- No secrets in code, logs, URLs or client bundles. Logs redact personal data.

**Documentation (SRS 8)**

- Endpoints are reflected in the OpenAPI 3.1 document, and tables and fields in the data
  dictionary. User-visible behaviour is described in the relevant role guide.
- Significant decisions get an ADR. The change is listed in `CHANGELOG.md`.

**Quality**

- TypeScript strict mode with no `any`. ESLint and Prettier are clean. The code follows
  `.cursor/rules/human-readable-code.mdc`.
- UI meets WCAG 2.2 AA, works on a small phone screen, and has English and Swahili text.
- Errors follow the error taxonomy (SRS OB-6), and logs carry the request id.
- Lands through a reviewed pull request with green CI and a Conventional Commit message.

## 2. Delivery phases

| Phase | Groups | Outcome |
|-------|--------|---------|
| 0. Repair | REP, ENG | The schema matches the code, and the test and CI pipeline exists |
| 1. Tenancy and data | KRN-IAM, KRN-DAT | Schools are tenants, roles are data, the database is behind an adapter |
| 2. Kernel | KRN-REG, KRN-EVT, KRN-UIX, KRN-SVC, SDK | Bundled extensions can be registered, enabled and rendered |
| 3. Dogfood | MOD-ACA, MOD-STU, MOD-STF, MOD-ASM, MOD-CAL | Existing features run as bundled modules |
| 4. New modules | MOD-ATT, MOD-FIN, and the rest of section 7 | SRS functional scope is covered |
| 5. Runtime install | RUN, PLG | Signed zips install and run in a sandbox |
| 6. Ecosystem | DOC, SDK-CLI | External publishers can build and ship extensions |

## 3. Foundation repair (REP)

- **REP-01 Restore missing student and teacher columns.** Re-add `students.admission_number`,
  `students.campus_id` and `teachers.campus_id`, which commit `67c0f08` removed while the code
  still reads and writes them. Add a unique index on admission number per school.
- **REP-02 Rebuild the migration journal.** Make `workers/drizzle/meta/_journal.json` match the
  files on disk, remove duplicate migration numbers, and guard re-created tables with
  `IF NOT EXISTS`.
- **REP-03 Reconcile remote databases.** Compare `d1_migrations` on the production and
  development databases with the repository, and write a one-off migration that brings both
  to the same state without data loss.
- **REP-04 Schema drift check in CI.** Fail CI when `drizzle-kit generate` would produce a new
  migration that is not committed, so the schema and migrations cannot diverge again.
- **REP-05 Resolve the duplicate ADR 0003.** Keep one data-access ADR and one table prefix
  convention (`mod_` or `ext_`), and update the specification to match.

## 4. Engineering platform (ENG)

- **ENG-01 pnpm workspace layout.** Introduce `apps/web`, `packages/core`, `packages/sdk`,
  `packages/ui`, `packages/cli` and `extensions/*`, moving today's `app/` and `workers/` into
  `apps/web` without changing behaviour.
- **ENG-02 Strict TypeScript everywhere.** Enable `strict` and `noImplicitAny` in every package
  and remove existing `any` usages (for example in `app/routes/students.tsx`).
- **ENG-03 Linting and formatting.** Add ESLint and Prettier with shared config, and a
  pre-commit hook that runs lint, format and fast tests (SRS CS-2, CS-8).
- **ENG-04 Unit and integration test harness.** Add Vitest with the Workers pool, real D1
  bindings, and `applyD1Migrations` in test setup. Provide factories for schools, users and
  students.
- **ENG-05 End-to-end test harness.** Add Playwright with a seeded test school and one test
  per role (admin, teacher, finance, student, parent).
- **ENG-06 Adapter contract suite.** A shared test suite that every `DatabaseAdapter`
  implementation must pass, run against D1 and PostgreSQL in CI (SRS TR-4).
- **ENG-07 CI pipeline.** GitHub Actions running lint, type check, tests, coverage threshold,
  OpenAPI validation, accessibility checks and build on every pull request; merges are blocked
  on failure (SRS 9.3, DV-4).
- **ENG-08 Dependency and secret scanning.** Automated dependency updates, `pnpm audit` in CI
  that blocks high-severity issues, and secret scanning on every push (SRS SEC-16).
- **ENG-09 Container image and local stack.** A Dockerfile for the Node target and a Docker
  Compose file that starts the app with PostgreSQL (SRS DV-1, DV-2).
- **ENG-10 Environment documentation.** A complete `.env.example` and `.dev.vars.example`
  listing every variable, its purpose and whether it is secret (SRS DV-3).
- **ENG-11 Release automation.** Tagged releases build artifacts, publish the Docker image and
  generate changelog entries following Semantic Versioning (SRS DV-6, OS-7).
- **ENG-12 Traceability report.** A CI step that lists every feature and requirement ID and
  the tests that reference it, and flags IDs with no test.

## 5. Core kernel

### 5.1 Tenancy, identity and access (KRN-IAM)

- **KRN-IAM-01 Schools as tenants.** Add a non-null `school_id` to every tenant table and
  back-fill it from today's `owner_user_id`, then remove `owner_user_id` (ADR 0002).
- **KRN-IAM-02 Campuses under schools.** Keep campuses as part of the school profile, and allow
  students, staff and classes to belong to a campus.
- **KRN-IAM-03 School memberships.** Users join schools through memberships that hold their
  role and optional link to a staff, student or guardian record (SRS FR-1.5).
- **KRN-IAM-04 Roles as data.** Per-school roles with the five system roles seeded and
  protected: admin, teacher, finance, student, parent (SRS 2.3).
- **KRN-IAM-05 Permission registry.** Extensions register namespaced permission keys with
  default roles. Admins can change which roles hold which permissions.
- **KRN-IAM-06 Server-side permission checks.** A `can()` helper used by every loader, action
  and extension call, replacing `isAdminRole()`. Denials return a typed authorization error.
- **KRN-IAM-07 Record-level scoping.** Teachers see only their assigned classes and subjects;
  parents see only their linked students; students see only themselves (SRS SEC-9, DP-8).
- **KRN-IAM-08 School switcher.** Users who belong to more than one school can switch the
  active school; the choice is kept in the session.
- **KRN-IAM-09 Adaptive password hashing.** Move from PBKDF2 (100k iterations, the Workers
  maximum) to Argon2id via WebAssembly, with a versioned hash format and automatic re-hashing
  at next sign-in (SRS SEC-1).
- **KRN-IAM-10 Short-lived access and rotating refresh tokens.** Replace the single 1-day JWT
  cookie with a 5 to 15 minute access token and a refresh token rotated on every use, both in
  HttpOnly, Secure, SameSite cookies (SRS SEC-2, SEC-3).
- **KRN-IAM-11 Server-side session store.** Sessions and refresh tokens stored server-side so
  logout and "sign out everywhere" take effect immediately (SRS SEC-4).
- **KRN-IAM-12 Sign-in rate limiting and lockout.** Limit failed attempts per account and per
  IP, with temporary lockout and an audit entry (SRS SEC-6).
- **KRN-IAM-13 Two-factor authentication.** Optional TOTP for all users, required for admin and
  finance roles by school policy. Restores the intent of the reverted migration `0040`.
- **KRN-IAM-14 Invitations.** Admins invite staff, parents and students by email or phone; the
  invitee sets a password and is linked to the right record and role.
- **KRN-IAM-15 Password reset.** Single-use, short-lived reset links or codes, with no
  disclosure of whether an account exists.
- **KRN-IAM-16 Security headers and CSRF protection.** Content-Security-Policy, HSTS and
  related headers on every response, and anti-CSRF tokens on every state-changing form
  (SRS SEC-13, SEC-14).

### 5.2 Data layer (KRN-DAT)

- **KRN-DAT-01 Database adapter.** A `DatabaseAdapter` exposing a Drizzle instance and a
  transaction wrapper, selected from `DB_DRIVER`; no feature code imports a driver directly
  (SRS DB-2, DB-3, DB-7).
- **KRN-DAT-02 D1 adapter.** The adapter for Cloudflare D1 using `drizzle-orm/d1` with the
  binding from the server context (SRS DB-4).
- **KRN-DAT-03 PostgreSQL adapter.** The adapter for Node using `drizzle-orm/node-postgres`
  with `DATABASE_URL` (SRS DB-5).
- **KRN-DAT-04 Dialect-neutral column helpers.** Shared helpers for ids, timestamps, dates,
  booleans, enums and JSON so one schema definition compiles for both databases, and
  `updated_at` is maintained automatically.
- **KRN-DAT-05 Kernel migrator.** Replaces `wrangler d1 migrations apply` with a migrator that
  tracks core and per-extension migrations per school, and runs the same way on D1 and
  PostgreSQL (SRS DB-6).
- **KRN-DAT-06 Declarative schema compiler.** Turns an extension's `schema/*.json` into DDL for
  each dialect, adds `school_id` and audit columns, and rejects unsafe operations (spec section 6).
- **KRN-DAT-07 Scoped data service.** Gives each extension a Drizzle instance limited to its own
  tables and the current school, used by bundled and installed extensions alike (ADR 0003).
- **KRN-DAT-08 Statement checker.** Parses every statement from an extension and verifies table
  ownership and the `school_id` predicate; anything it cannot verify is rejected.
- **KRN-DAT-09 Core read APIs.** Typed, capability-gated APIs for students, guardians, staff and
  academic data, so extensions never query core tables directly.
- **KRN-DAT-10 Safe delete rules.** Records about minors and money use restrict rules and
  explicit archive flows instead of cascading deletes.
- **KRN-DAT-11 Data export and erasure.** Export all data about one person, and erase it where
  lawful, across the core and every enabled module (SRS DP-3).
- **KRN-DAT-12 Retention policies.** Per-school retention periods per data type, with a
  scheduled purge that is logged (SRS DP-4).
- **KRN-DAT-13 Backup and restore.** Documented, tested backup and restore for PostgreSQL, and
  D1 Time Travel guidance for Cloudflare (SRS DP-5).

### 5.3 Extension registry and lifecycle (KRN-REG)

- **KRN-REG-01 Manifest schema.** One `zod` schema for `yoyol.extension.json`, shared by the
  SDK, the CLI and the core, with clear error messages.
- **KRN-REG-02 Registry tables.** `extensions`, `extension_versions`, `school_extensions`,
  `extension_migrations`, `extension_settings`, `hook_registrations` and
  `event_subscriptions` (spec section 10).
- **KRN-REG-03 Bundled extension discovery.** At build time, collect every extension under
  `extensions/*` and register its manifest and entrypoint.
- **KRN-REG-04 Dependency resolution.** Check `requires.core` and `requires.extensions` with
  semver ranges, detect cycles, and explain unmet dependencies to the admin.
- **KRN-REG-05 Enable for a school.** Run pending migrations, register permissions, navigation,
  hooks, slots, subscriptions and default settings, then call `onEnable`, all or nothing.
- **KRN-REG-06 Upgrade.** Apply new migrations, ask for consent when new capabilities are
  requested, then call `onUpgrade`, with automatic rollback on failure where the database allows.
- **KRN-REG-07 Disable.** Stop pages, hooks, slots and subscriptions immediately while keeping
  data, after warning about extensions that depend on it.
- **KRN-REG-08 Remove and purge.** Remove keeps data for later re-enabling; purge exports the
  extension's data to R2, then deletes it.
- **KRN-REG-09 Required extensions.** Bundled extensions marked required (academics, students,
  staff) cannot be disabled or removed.
- **KRN-REG-10 Registry-driven service container.** Replace the hard-coded `ServiceContainer`
  with one built from the extensions enabled for the current school.
- **KRN-REG-11 Registry-driven routes and navigation.** Generate `routes.ts` entries from bundled
  extensions and build the sidebar from registered navigation filtered by permission.
- **KRN-REG-12 Extension management screen.** An admin screen listing installed extensions,
  versions, status, granted capabilities and available updates.
- **KRN-REG-13 Extension installation page.** A page at `/extensions` where a school
  administrator installs an extension for one school. Bundled extensions install
  immediately. Signed zip upload stays on this page when RUN-06 exists.

### 5.4 Hooks and events (KRN-EVT)

- **KRN-EVT-01 Hook bus.** Runs synchronous hook handlers in priority order with a time budget,
  skipping and logging handlers that fail or time out (ADR 0007).
- **KRN-EVT-02 Blocking validation hooks.** Hooks such as `student.beforeCreate` whose handlers
  can return field errors that stop the operation.
- **KRN-EVT-03 Transactional event outbox.** Events are written to `domain_events` in the same
  transaction as the change that caused them.
- **KRN-EVT-04 Event dispatcher.** Delivers outbox events through Cloudflare Queues (or polling
  on Node) to subscribers, at least once, with retries and backoff.
- **KRN-EVT-05 Dead-letter handling.** Events that keep failing are parked, visible to admins,
  and can be retried after a fix.
- **KRN-EVT-06 Event payload schemas.** Every event name has a versioned payload schema that
  is validated on publish and on delivery.
- **KRN-EVT-07 Core event catalogue.** Publish the core events and hooks from spec section 9,
  with documentation and examples.

### 5.5 UI shell and view documents (KRN-UIX)

- **KRN-UIX-01 App shell.** Layout, sidebar, header, school branding and theme driven by the
  registry, replacing the fixed sidebar in `app/Dahsboard/SidebarContent.tsx`.
- **KRN-UIX-02 View document schema.** The `viewDocumentSchema` for every node in
  [view-documents.md](extensions/view-documents.md), exported from the SDK.
- **KRN-UIX-03 View document renderer.** Server-renders validated view documents with the
  shared components; invalid documents show a safe error and are logged.
- **KRN-UIX-04 Extension page route.** The `/x/:extension/*` route that checks session, school,
  extension status and permission, then calls the extension and renders the result.
- **KRN-UIX-05 Forms and actions.** Form rendering with CSRF tokens, labelled fields, and
  re-rendering with field errors when an action returns `invalid`.
- **KRN-UIX-06 Slots.** Render extension contributions in `student.profile.tabs`,
  `dashboard.widgets` and `navigation.items`.
- **KRN-UIX-07 Entity pickers.** Searchable pickers for students, classes, staff and subjects
  that respect the caller's scope and capabilities.
- **KRN-UIX-08 Error boundaries.** Friendly route-level error pages that never show internal
  details (SRS OB-7, OB-8).
- **KRN-UIX-09 Accessibility checks.** Automated axe checks on core screens and on rendered
  view documents in CI (SRS AC-5).

### 5.6 Shared services (KRN-SVC)

- **KRN-SVC-01 Settings service.** Typed per-school settings for the core and each extension,
  with defaults from manifests and an admin settings screen.
- **KRN-SVC-02 File storage.** Upload, download and delete files in R2, scoped to school and
  owner, with size and type limits and signed download links.
- **KRN-SVC-03 Notification service.** One API to send a message to a user or guardian, routed
  to channels by preference, with templates and a delivery log.
- **KRN-SVC-04 Notification channel interface.** The `notifications.channel` provider contract
  that SMS, email and in-app plugins implement.
- **KRN-SVC-05 In-app notifications.** A built-in channel with an inbox and unread count, so
  notifications work before any external channel is installed.
- **KRN-SVC-06 Scheduled jobs.** Extensions register cron-style jobs that run per school through
  Cron Triggers, with run history and failure alerts.
- **KRN-SVC-07 Translation registry.** Replace the single dictionary in `app/lib/i18n.tsx` with
  per-extension `locales/en.json` and `locales/sw.json` files merged at runtime, plus locale
  formatting for dates, numbers and currency (SRS 16.2).
- **KRN-SVC-08 Audit log.** Append-only log of actor, action, target, extension and time for
  sign-ins, permission changes, payments, deletions and sensitive reads (SRS OB-10, DP-6).
- **KRN-SVC-09 Audit log viewer.** Admin screen to search and export audit entries.
- **KRN-SVC-10 Structured logging.** JSON logs with severity and a request id carried through
  every extension call, with automatic redaction (SRS OB-1 to OB-3).
- **KRN-SVC-11 Error taxonomy.** Typed validation, authorization, not-found, conflict and
  internal errors mapped to HTTP status codes and one error response shape (SRS OB-6, API-3).
- **KRN-SVC-12 Health check.** An endpoint reporting app, database, queue and extension host
  status (SRS OB-4).
- **KRN-SVC-13 Public API foundation.** A versioned `/api/v1` with pagination, filtering, ISO
  8601 dates and an OpenAPI 3.1 document generated from the `zod` schemas (SRS 15).

## 6. Extension runtime and installation (RUN)

- **RUN-01 Extension host interface.** The `ExtensionHost` contract used by the rest of the
  system, so loading strategy can change without touching features (ADR 0004).
- **RUN-02 Bundled extension host.** Runs bundled extensions in-process with the same context
  and limits as installed ones.
- **RUN-03 Dynamic Worker host.** Loads installed bundles from R2 with the Worker Loader, passes
  only granted capability stubs, and blocks or filters outbound network access.
- **RUN-04 Capability stubs.** RPC objects for each capability in the catalogue, each checking
  the grant, the school and the caller on every call.
- **RUN-05 Execution limits.** Time limits per entry point, statement limits per request, and
  clear errors when an extension exceeds them (spec section 8.2).
- **RUN-06 Zip upload.** A platform-admin upload screen that enforces size and layout limits
  and rejects unsafe paths before anything is stored.
- **RUN-07 Package verification.** Validate the manifest, schema files and locales, compute
  checksums, and check core compatibility.
- **RUN-08 Signature verification.** Verify Ed25519 signatures against trusted publisher keys;
  reject unsigned packages unless development mode is on (ADR 0005).
- **RUN-09 Trusted publisher management.** Add, rotate and revoke publisher keys at platform
  level, with an audit entry for every change.
- **RUN-10 Bundle storage.** Store verified bundles in R2 by key and version, immutable once
  stored.
- **RUN-11 Consent screen.** Show a school admin the capabilities, sensitive data access,
  permissions and outbound hosts before enabling, in plain language in both languages.
- **RUN-12 Version revocation.** Revoking a version or key disables it everywhere at the next
  request and notifies affected admins.
- **RUN-13 Plan detection.** Detect when the Worker Loader binding is missing (free plan or
  Node target), hide zip upload, and explain why.

## 7. Extension SDK and tooling (SDK)

- **SDK-01 `defineModule` and `definePlugin`.** Typed builders that produce the entrypoint
  contract and prevent plugins from declaring module-only features.
- **SDK-02 Typed context.** Types for `data`, `core`, `settings`, `events`, `notifications`,
  `files`, `jobs`, `t` and `log`, generated from the manifest's declared capabilities.
- **SDK-03 View builders.** Helper functions to build view documents with type checking.
- **SDK-04 Scoped Drizzle client.** The proxy-based Drizzle client that adds school scoping
  automatically.
- **SDK-05 Test kit.** A fake core for extension unit tests, and a local core for integration
  tests, so extension authors can follow TDD.
- **SDK-CLI-01 Scaffold.** `yoyol-ext create` generates a module or plugin with manifest,
  locales, schema, a sample page and passing tests.
- **SDK-CLI-02 Validate.** `yoyol-ext validate` checks manifest, schema and locales with the same
  rules as the core.
- **SDK-CLI-03 Build and pack.** `yoyol-ext build` bundles for the Workers runtime;
  `yoyol-ext pack` produces the zip and canonical file list.
- **SDK-CLI-04 Sign.** `yoyol-ext sign` writes `signature.json` from a key held in CI secrets.
- **SDK-CLI-05 Local dev server.** Run an extension against a local core with hot reload and
  seeded data.

## 8. Bundled modules from existing features

### 8.1 Academics (MOD-ACA, required)

- **MOD-ACA-01 Move academic structure into a module.** Levels, streams, forms and form classes
  from `workers/database/academic-levels.ts` become the academics module, scoped by school.
- **MOD-ACA-02 Academic years and terms.** Move years and terms into the module, allow only one
  active year and one current term per school, and publish `academics.term.started`.
- **MOD-ACA-03 Subjects tied to levels.** Link subjects to levels as the SRS requires, keep the
  optional stream link, and drop the free-text `stream`, `instructor` and `enrolledStudents`
  columns.
- **MOD-ACA-04 Subjects per class.** Move `class_subjects` from the legacy `classes` table to
  `form_classes`.
- **MOD-ACA-05 A-Level combinations.** Define subject combinations and their subjects (SRS
  FR-4.5, open item 8).
- **MOD-ACA-06 Retire the university model.** Migrate remaining data, then remove `classes`,
  `teacher_classes`, `students.class_id` and the orphaned `department_id` columns.

### 8.2 Students and guardians (MOD-STU, required)

- **MOD-STU-01 Student records.** Move student create, edit, list and profile into the module
  with first, middle and last name, gender, date of birth and admission date (SRS FR-2.1).
- **MOD-STU-02 Admission numbers.** Generate or accept a unique admission number per school,
  with a configurable format (SRS FR-2.4).
- **MOD-STU-03 Year-scoped enrolment.** Record each student's class per academic year, so
  promotion keeps history (SRS FR-2.2, NFR-5).
- **MOD-STU-04 Promotion and graduation.** Move a class or selected students to the next form
  at year end, and mark leavers as graduated or transferred.
- **MOD-STU-05 Guardians.** Separate guardian records linked to students through a join with
  relationship and primary-contact flag, replacing `guardian_name` and `guardian_phone`
  (SRS FR-2.3).
- **MOD-STU-06 Guardian accounts.** Invite guardians to sign in and see only their linked
  students.
- **MOD-STU-07 Student subjects.** Year-scoped subject selection, including A-Level combinations.
- **MOD-STU-08 Student portal.** Students see their own profile, results, attendance, timetable
  and calendar through slots from other modules.

### 8.3 Staff (MOD-STF, required)

- **MOD-STF-01 Staff records.** Generalise `teachers` into staff with a staff type (teaching,
  finance, administration, support) (SRS FR-3.1).
- **MOD-STF-02 Teaching assignments.** Year-scoped assignment of teachers to subjects and
  classes, replacing the free-text `teachers.subject` column (SRS FR-3.2, FR-3.3).
- **MOD-STF-03 Staff accounts.** Link staff records to user accounts through memberships.

### 8.4 Assessment and results (MOD-ASM)

- **MOD-ASM-01 Assessment types.** Assignment, test, quiz, midterm and final exam, configurable
  per school (SRS FR-6.1).
- **MOD-ASM-02 Results.** Replace `grades` with results tied to student enrolment, subject,
  assessment type, academic year, term and the recording teacher (SRS FR-6.2, FR-6.3).
- **MOD-ASM-03 Grading scales.** Configurable score-to-grade scales per level, for example
  NECTA O-Level and A-Level divisions (open item 10).
- **MOD-ASM-04 Mark entry by class.** Teachers enter marks for a whole class and subject in one
  screen, limited to their assignments.
- **MOD-ASM-05 Report cards.** Generate per-term report cards as printable pages and PDF
  (SRS FR-6.4, roadmap 18.2).
- **MOD-ASM-06 Results release.** Results stay hidden from students and parents until an admin
  releases them for a term.

### 8.5 Calendar and notices (MOD-CAL)

- **MOD-CAL-01 Calendar events.** Replace `notices` with events that have real dates, type,
  academic year and optional attachment (SRS FR-10.1).
- **MOD-CAL-02 Event notifications.** Optionally notify parents of events and fee reminders
  through the notification service (SRS FR-10.2).
- **MOD-CAL-03 Dashboard widget.** Upcoming events shown in the `dashboard.widgets` slot.

## 9. New modules

### 9.1 Attendance (MOD-ATT)

- **MOD-ATT-01 Daily attendance.** Record present, absent or late with a comment per student per
  day, replacing the hard-coded mock data in `app/routes/attendance.tsx` (SRS FR-8.1).
- **MOD-ATT-02 Default status autofill.** Mark a whole class present by default and change only
  the exceptions (SRS FR-8.2).
- **MOD-ATT-03 Absence events.** Publish `attendance.record.marked_absent` so notification
  plugins can alert guardians (SRS FR-8.3).
- **MOD-ATT-04 Attendance reports.** Per student, class and term rates, with a student profile
  tab and dashboard widget.

### 9.2 Finance (MOD-FIN)

- **MOD-FIN-01 Fee items.** Define payment items such as Term 1 fees, books and registration
  (SRS FR-7.1).
- **MOD-FIN-02 Fee structures.** Amounts per class, fee item and academic year (SRS FR-7.2).
- **MOD-FIN-03 Invoices.** Generate invoices per student from fee structures, automatically on
  enrolment or in bulk, using integer minor units and a currency code.
- **MOD-FIN-04 Payments and allocations.** Record payments with method and transaction
  reference, and allocate them to invoices; balances are computed, not stored (SRS FR-7.3).
- **MOD-FIN-05 Receipts.** Numbered digital receipts, printable and sent to guardians.
- **MOD-FIN-06 Class and term summaries.** Expected, paid and outstanding totals per class and
  term (SRS FR-7.4).
- **MOD-FIN-07 Payment provider interface.** The `finance.paymentProvider` contract that mobile
  money plugins implement, including callback verification and idempotency.
- **MOD-FIN-08 Reconciliation.** Match provider transactions to invoices automatically and list
  unmatched ones for review (roadmap 18.1).
- **MOD-FIN-09 Financial audit trail.** Every payment, allocation, void and refund is audited and
  can only be reversed by a compensating entry.

### 9.3 Timetable (MOD-TTB)

- **MOD-TTB-01 Periods.** Define the school day as named periods with start and end times.
- **MOD-TTB-02 Timetable entries.** Map subject, teacher and class to a day and period
  (SRS FR-5.1).
- **MOD-TTB-03 Clash detection.** Prevent a teacher or class from being booked twice in one
  period.
- **MOD-TTB-04 Personal timetables.** Teachers and students see their own week.

### 9.4 Lesson plans (MOD-LSN)

- **MOD-LSN-01 Lesson plan templates.** School-defined templates for lesson plans (SRS FR-5.3).
- **MOD-LSN-02 Lesson plan submission.** Teachers submit plans per subject, class and year with
  attachments (SRS FR-5.2).
- **MOD-LSN-03 Review workflow.** Heads of department approve or return plans with comments.

### 9.5 Discipline (MOD-DIS)

- **MOD-DIS-01 Incident types.** Configurable discipline types and severity levels.
- **MOD-DIS-02 Incident records.** Record type, severity, description, action taken, date and
  recorder (SRS FR-9.1).
- **MOD-DIS-03 Restricted visibility.** Incidents are sensitive data; only permitted roles and
  linked guardians can see them, and every view is audited.

### 9.6 Clubs and activities (MOD-CLB)

- **MOD-CLB-01 Clubs.** Create clubs with name, description and patron (SRS FR-9.2).
- **MOD-CLB-02 Memberships.** Enrol students per academic year (SRS FR-9.3).
- **MOD-CLB-03 Activities.** Record activities with title, description, date and recorder
  (SRS FR-9.4).

### 9.7 Student leadership (MOD-LDR)

- **MOD-LDR-01 Leadership positions.** Define positions such as prefect, head boy and head girl
  (SRS FR-10.3).
- **MOD-LDR-02 Appointments.** Assign students to positions per year with start and end dates
  (SRS FR-10.4).

### 9.8 Reports and dashboards (MOD-RPT)

- **MOD-RPT-01 Role dashboards.** Dashboards per role built entirely from `dashboard.widgets`
  slots, replacing today's fixed dashboard components.
- **MOD-RPT-02 Bulk import and export.** CSV import with validation preview and CSV export for
  students, staff and fee structures (roadmap 18.2).

## 10. First plugins (PLG)

- **PLG-01 SMS channel.** A notification channel for a regional SMS gateway, with delivery
  receipts and per-school sender settings.
- **PLG-02 Email channel.** A notification channel for transactional email.
- **PLG-03 Mobile money provider.** A first `finance.paymentProvider`, for example M-Pesa,
  shipped as a signed zip to prove runtime installation end to end.
- **PLG-04 Absence alert.** Subscribes to absence events and notifies guardians in their
  preferred language.
- **PLG-05 Fee reminders.** A scheduled job that reminds guardians of outstanding balances.
- **PLG-06 Theme packages.** A `themes` plugin validates JSON colour tokens for light and dark. No CSS, HTML, or scripts. The reserved `yoyol` theme leaves the current stylesheet untouched (ADR 0008).
- **PLG-07 Upload and activate.** A school administrator uploads a theme on `/themes` and activates it for that school. The school profile links to that page. Packages are stored by the core.
- **PLG-08 Example theme.** A downloadable example that changes colours only after it is activated.
- **PLG-09 Themes installation page.** A page at `/themes` where a school administrator
  installs theme packages and sets the active theme. The built-in YOYOL theme stays
  available and leaves the current colours unchanged until another theme is activated.

## 11. Documentation (DOC)

- **DOC-01 Governance files.** `LICENSE` (MIT), `CONTRIBUTING`, `CODE_OF_CONDUCT`, `SECURITY`
  and `CHANGELOG` at the repository root, plus issue and pull request templates (SRS OS-1 to OS-8).
- **DOC-02 Architecture overview.** Layers, request flow, the kernel and extension model, and
  both deployment targets (SRS DR-4).
- **DOC-03 Data dictionary.** Every core and bundled module table and field, generated from the
  schema where possible (SRS DR-6).
- **DOC-04 API reference.** Browsable docs generated from the OpenAPI document (SRS DR-3).
- **DOC-05 Extension developer guide.** Tutorials for building a plugin and a module, the
  capability catalogue, hook and event catalogue, and view document reference.
- **DOC-06 Deployment guides.** Cloudflare (D1, R2, Queues, Worker Loader) and Docker with
  PostgreSQL, including backup and restore (SRS DR-7).
- **DOC-07 Role guides.** End-user guides for admin, teacher, finance, student and parent, in
  English and Swahili (SRS DR-10).
- **DOC-08 Security and incident procedures.** Key rotation, extension revocation and breach
  response steps (SRS DP-7).
- **DOC-09 Contributor quickstart.** One documented command sequence to get a working local
  environment with seeded data (SRS DR-9).

## 12. Catalog gaps (GAP)

These rows were in the adoption plan before they had catalog IDs. Phase 1 owns the school and identity gaps.

- **GAP-SCH-01 School profile.** Create, view, and update a school, including logo and colours. Theme packages are installed on `/themes`.
- **GAP-SCH-02 Archive a school.** An archived school leaves the school switcher. Permission checks fail except restore, so the owner can still sign in and restore it.
- **GAP-SCH-03 Campuses.** Search and filter campuses on the school profile. Removing a campus is refused while students, staff, or classes still use it. Setting a campus as main clears the previous main campus.
- **GAP-IAM-01 Own profile.** A signed-in person can update their name, phone, photo, and language, and can change their password.
- **GAP-IAM-02 Membership status.** Suspend, restore, or remove a membership without deleting the person. The last active admin cannot be removed.
- **GAP-IAM-03 Custom roles.** Create, rename, and delete roles that are not built in. Built-in roles stay protected, and a role in use cannot be deleted.
- **GAP-IAM-04 Registration.** Signing up still works. A new account is not placed in a school until onboarding or an invitation.
- **GAP-IAM-05 Members.** List the people in a school and change the role on a membership.
- **GAP-NTF-01 Contact channel.** A parent chooses a contact channel from the ones the school offers. This waits for phase 2.
