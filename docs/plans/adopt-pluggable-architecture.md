# Plan: Adopt the pluggable extension architecture

- Status: In progress
- Branch: `plan/adopt-pluggable-architecture`
- Base: `develop` at `d974da4`
- Date: 2026-10-06
- Sources: [ADRs](../adr/README.md), [extension specification](../extensions/specification.md), [view documents](../extensions/view-documents.md), [feature catalog](../features.md), [functional requirements](../srs-functional-requirements.md)

This plan is the checklist for turning today's hard-wired app into the core-and-extensions system in ADR 0001 to ADR 0007. The feature catalog (`docs/features.md`) remains the description of each feature. This document is the schedule, the coverage check, and the rule for when a phase is allowed to close.

Nothing in the inventories below is optional. A row is either done, or it is deferred in writing with a reason and a follow-up. Rows marked **out of v1** are still tracked so they are not forgotten.

## 1. How work lands

- All implementation branches start from `develop`. No one commits the architecture work directly on `develop`.
- One branch per slice. The branch name includes the feature IDs it closes, for example `krn-iam-01-school-tenancy`.
- Every pull request lists the feature IDs and requirement IDs it closes. A pull request that does not name its IDs is not reviewable against this plan.
- A feature is done only when it meets the definition of done in `docs/features.md` section 1: a failing test named after the feature ID comes first, permissions are checked with `can()`, queries are school-scoped, English and Swahili exist, and the change goes through a reviewed pull request.
- When a slice finishes, change its status in this file in the same pull request. Status values are `not started`, `in progress`, `done`, `deferred`, and `out of v1`.

### Phase board

| Phase | Outcome | Status | Closes when |
|-------|---------|--------|-------------|
| 0. Decisions and repair | One data-access ADR, schema matches the code, a test gate exists | in progress | Every REP row and every decision in section 2 is `done` |
| 1. Tenancy and data | A teacher signed in to a school sees that school's data, and only that school's data | in progress | Every KRN-IAM, KRN-DAT (except DAT-05 to DAT-09), and GAP-SCH / GAP-IAM row is `done` |
| 2. Kernel | A bundled hello plugin can be enabled and disabled per school, and can render a view document | not started | Every KRN-REG, KRN-EVT, KRN-UIX, KRN-SVC, SDK, and RUN-01 / RUN-02 row is `done` |
| 3. Dogfood | Academics, students, staff, assessment, and calendar run as bundled modules | not started | Every MOD-ACA, MOD-STU, MOD-STF, MOD-ASM, and MOD-CAL row is `done`, and no feature imports another feature's internals |
| 4. New modules | Attendance proves view documents, then the remaining SRS modules land | not started | Every remaining MOD-* row is `done` |
| 5. Runtime install | A signed zip installs on Cloudflare and runs in a sandbox | not started | Every RUN row and every PLG row is `done` |
| 6. Ecosystem | An external developer can build, sign, and ship an extension | not started | Every SDK-CLI and DOC row is `done` |

Phases run in this order. A later phase does not start until the previous phase's exit line is true. Inside a phase, slices may run in parallel when they do not share tables.

## 2. Decisions that block code

These are unresolved in the ADRs today. Slice 0.1 is docs only and must merge before any kernel or tenancy code.

| ID | Decision | Recommendation | Blocks | Status |
|----|----------|----------------|--------|--------|
| D-01 | Two files both claim to be ADR 0003 | Keep [0003-core-owns-data-access.md](../adr/0003-core-owns-data-access.md), the file the ADR index links. The other file is marked superseded. Its `ext_` prefix and direct Drizzle path are rejected. | KRN-DAT-06, KRN-DAT-07, KRN-DAT-08 | done |
| D-02 | Table prefix | Use `mod_<key>_`, with `-` in the key replaced by `_`. This matches the specification section 3.1 and the ADR the index links. The duplicate ADR's `ext_<key>_` prefix is dropped. | Schema compiler, every module table | done |
| D-03 | Bundled data path | Bundled and installed extensions both go through the statement checker. Bundled mode is an in-process call. Installed mode is RPC. The duplicate ADR's direct Drizzle path for bundled modules is rejected, because it would let trusted code skip the checker. | KRN-DAT-07, KRN-DAT-08, SDK-04 | done |
| D-04 | Accept the proposed ADRs | After D-01 to D-03, set ADR 0001, ADR 0002, the surviving ADR 0003, and ADR 0007 to Accepted. ADR 0004, ADR 0005, and ADR 0006 are already Accepted. | Every later slice | done |
| D-05 | Who may upload a zip on a self-hosted school | Platform administrators upload packages. On a single-school deployment the same person is the platform administrator, so the upload screen is available to that account only. School admins enable, disable, and purge. They do not upload. Confirm this before RUN-06. | RUN-06 | not started |
| D-06 | Shared database with a predicate check | Build the shared-database design in ADR 0003. Database-per-school stays an alternative, revisited only if the statement checker proves too restrictive. | KRN-DAT-07 | done |

### Explicitly out of v1

Tracked here so they are not built by accident and not dropped.

| ID | Item | Source | Status |
|----|------|--------|--------|
| OUT-01 | Sandboxed iframe for interactive extension UI (timetable builder and similar) | ADR 0006, spec question 3 | out of v1 |
| OUT-02 | A third `ExtensionHost` so zip installs work on Node.js and PostgreSQL | ADR 0004, spec question 4 | out of v1 |
| OUT-03 | Open marketplace, pricing, and plan checks | ADR 0005, spec question 5 | out of v1 |
| OUT-04 | Database-per-school tenancy | ADR 0003 alternative, spec question 1 | out of v1 |

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
| 0.2 | `rep-01-schema-repair` | REP-01, REP-02, REP-04 | 0.1 not required, can start now | not started |
| 0.3 | `rep-03-remote-reconcile` | REP-03 | 0.2 | not started |
| 0.4 | `eng-04-test-harness` | ENG-02, ENG-03, ENG-04, ENG-05, ENG-07, ENG-08, ENG-10 | 0.2 | not started |
| 0.5 | `eng-01-workspace-layout` | ENG-01 | 0.4, so the move is covered by tests | not started |
| 1.1 | `krn-iam-tenancy` | KRN-IAM-01, KRN-IAM-02, KRN-IAM-03, KRN-IAM-04, KRN-DAT-10, GAP-SCH-01, GAP-SCH-02, GAP-SCH-03 | 0.5 | in progress |
| 1.2 | `krn-iam-permissions` | KRN-IAM-05, KRN-IAM-06, KRN-IAM-07, KRN-IAM-08, GAP-IAM-02, GAP-IAM-03, GAP-IAM-05 | 1.1 | not started |
| 1.3 | `krn-iam-sessions` | KRN-IAM-09, KRN-IAM-10, KRN-IAM-11, KRN-IAM-12, KRN-IAM-13, KRN-IAM-14, KRN-IAM-15, KRN-IAM-16, GAP-IAM-01, GAP-IAM-04 | 1.1 | not started |
| 1.4 | `krn-dat-adapter` | KRN-DAT-01, KRN-DAT-02, KRN-DAT-03, KRN-DAT-04, ENG-06, ENG-09 | 0.5 | not started |
| 2.1 | `krn-reg-lifecycle` | KRN-REG-01 to KRN-REG-09, SDK-01 | 1.2, 1.4 | not started |
| 2.2 | `krn-dat-extensions` | KRN-DAT-05, KRN-DAT-06, KRN-DAT-07, KRN-DAT-08, KRN-DAT-09, SDK-02, SDK-04 | 2.1, D-03 | not started |
| 2.3 | `krn-evt-hooks` | KRN-EVT-01 to KRN-EVT-07 | 2.1 | not started |
| 2.4 | `krn-uix-views` | KRN-UIX-01 to KRN-UIX-09, SDK-03, KRN-REG-10, KRN-REG-11, KRN-REG-12 | 2.1 | not started |
| 2.5 | `krn-svc-shared` | KRN-SVC-01 to KRN-SVC-13, KRN-DAT-11, KRN-DAT-12, KRN-DAT-13, GAP-NTF-01 | 2.1 | not started |
| 2.6 | `run-bundled-host` | RUN-01, RUN-02, RUN-05, SDK-05 | 2.2, 2.3, 2.4 | not started |
| 2.7 | `ext-hello-plugin` | Proof only: a bundled hello plugin enables, renders one view document, and disables. No new feature ID. | 2.6 | not started |
| 3.1 | `mod-aca` | MOD-ACA-01 to MOD-ACA-06 | 2.7 | not started |
| 3.2 | `mod-stu` | MOD-STU-01 to MOD-STU-08 | 3.1 | not started |
| 3.3 | `mod-stf` | MOD-STF-01 to MOD-STF-03 | 3.1 | not started |
| 3.4 | `mod-asm` | MOD-ASM-01 to MOD-ASM-06 | 3.2, 3.3 | not started |
| 3.5 | `mod-cal` | MOD-CAL-01 to MOD-CAL-03 | 2.7, KRN-SVC-03 | not started |
| 4.1 | `mod-att` | MOD-ATT-01 to MOD-ATT-04 | 2.7, 3.2, 3.3. This is the first module that must use view documents only. | not started |
| 4.2 | `mod-fin` | MOD-FIN-01 to MOD-FIN-09 | 4.1's renderer is already proven, plus 3.2 | not started |
| 4.3 | `mod-rest` | MOD-TTB, MOD-LSN, MOD-DIS, MOD-CLB, MOD-LDR, MOD-RPT | 3.2, 3.3. These may be separate branches per module. | not started |
| 1.5 | `install-pages` | KRN-REG-13, PLG-09 | Themes page can ship before zip upload. Extension zips still wait for RUN-06. | done |
| 5.1 | `run-install` | RUN-03, RUN-04, RUN-06 to RUN-13, D-05, KRN-REG-13 zip half | 2.6 | not started |
| 5.2 | `plg-channels` | PLG-01, PLG-02, PLG-04, PLG-05 | 5.1, MOD-ATT, KRN-SVC-04 | not started |
| 5.3 | `plg-payments` | PLG-03 | 5.1, MOD-FIN-07 | not started |
| 6.1 | `sdk-cli` | SDK-CLI-01 to SDK-CLI-05, ENG-11, ENG-12 | 5.1 | not started |
| 6.2 | `docs-ecosystem` | DOC-01 to DOC-09 | the behaviour each guide describes | not started |

ENG-05 (Playwright) starts in slice 0.4 with one smoke test and grows with every user-facing slice. It is not a single late pull request.

## 5. Feature inventory

Every ID from `docs/features.md` is listed once. Descriptions live in that file. If an ID is missing from this section, the plan is wrong and must be updated before the phase closes.

### 5.1 Phase 0

| ID | Work | Status |
|----|------|--------|
| REP-01 | Restore `students.admission_number`, `students.campus_id`, `teachers.campus_id` | done |
| REP-02 | Rebuild the migration journal | in progress |
| REP-03 | Reconcile remote databases without data loss | not started |
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
| ENG-11 | Tagged releases, image publish, changelog | not started |
| ENG-12 | Traceability report: every ID below must be named by a test | not started |

### 5.2 Phase 1

| ID | Work | ADR | Status |
|----|------|-----|--------|
| KRN-IAM-01 | `school_id` on every tenant table, back-fill from `owner_user_id`, then drop `owner_user_id`. Memberships land first. Existing screens keep filtering by `owner_user_id` until every service reads the membership. | 0002 | in progress |
| KRN-IAM-02 | Campuses under the school | 0002 | not started |
| KRN-IAM-03 | `school_memberships`. Owner is an admin. Screens still filter by `owner_user_id`. | 0002 | done |
| KRN-IAM-04 | Roles as data. Five system roles are seeded per school and marked system. Custom role editing stays GAP-IAM-03. | 0002 | done |
| KRN-IAM-05 | Permission registry, namespaced keys | 0002 | not started |
| KRN-IAM-06 | `can(permissionKey)` replaces `isAdminRole()` | 0002 | not started |
| KRN-IAM-07 | Teachers, parents, and students see only their own records | 0002 | not started |
| KRN-IAM-08 | School switcher in the session | 0002 | not started |
| KRN-IAM-09 | Argon2id password hashes | 0002 | not started |
| KRN-IAM-10 | Short-lived access token and rotating refresh token | 0002 | not started |
| KRN-IAM-11 | Server-side sessions, sign-out everywhere | 0002 | not started |
| KRN-IAM-12 | Sign-in rate limit and lockout | 0002 | not started |
| KRN-IAM-13 | TOTP, required for admin and finance when the school says so | 0002 | not started |
| KRN-IAM-14 | Invitations by email or phone | 0002 | not started |
| KRN-IAM-15 | Password reset that does not reveal whether the account exists | 0002 | not started |
| KRN-IAM-16 | Security headers and CSRF | 0002 | not started |
| KRN-DAT-01 | `DatabaseAdapter` selected by `DB_DRIVER` | 0003 | not started |
| KRN-DAT-02 | D1 adapter | 0003 | not started |
| KRN-DAT-03 | PostgreSQL adapter | 0003 | not started |
| KRN-DAT-04 | Dialect-neutral column helpers | 0003 | not started |
| KRN-DAT-10 | `ON DELETE RESTRICT` for minors and money, archive instead of cascade | 0002 | not started |

KRN-DAT-05 to KRN-DAT-09 and KRN-DAT-11 to KRN-DAT-13 are kernel work and are listed in phase 2, because they need the registry. They are still required.

### 5.3 Phase 2

| ID | Work | ADR | Status |
|----|------|-----|--------|
| KRN-DAT-05 | Kernel migrator, per extension, per school | 0003 | not started |
| KRN-DAT-06 | Declarative schema compiler, `mod_` prefix | 0003 | not started |
| KRN-DAT-07 | Scoped data service for bundled and installed extensions | 0003 | not started |
| KRN-DAT-08 | Statement checker, fail closed | 0003 | not started |
| KRN-DAT-09 | Capability-gated core read APIs | 0003 | not started |
| KRN-DAT-11 | Export and erasure of one person across core and modules | 0003 | not started |
| KRN-DAT-12 | Retention policies and logged purge | 0003 | not started |
| KRN-DAT-13 | Backup and restore for PostgreSQL, D1 Time Travel notes | 0003 | not started |
| KRN-REG-01 | `extensionManifestSchema` shared by SDK, CLI, and core | 0001 | not started |
| KRN-REG-02 | Registry tables from spec section 10 | 0001 | not started |
| KRN-REG-03 | Build-time discovery of `extensions/*` | 0001 | not started |
| KRN-REG-04 | Semver dependency check, no cycles | 0001 | not started |
| KRN-REG-05 | Enable for a school, all or nothing | 0001 | not started |
| KRN-REG-06 | Upgrade, fresh consent for new capabilities | 0001 | not started |
| KRN-REG-07 | Disable keeps data | 0001 | not started |
| KRN-REG-08 | Remove keeps data, purge exports then deletes | 0001 | not started |
| KRN-REG-09 | Academics, students, and staff cannot be disabled | 0001 | not started |
| KRN-REG-10 | Registry-driven service container | 0001 | not started |
| KRN-REG-11 | Registry-driven routes and sidebar | 0001 | not started |
| KRN-REG-12 | Extension management screen | 0001 | not started |
| KRN-REG-13 | `/extensions` installation page. Bundled install now. Zip upload when RUN-06 exists. | 0001, 0005 | done |
| KRN-EVT-01 | Hook bus, priority order, time budget, skip on failure | 0007 | not started |
| KRN-EVT-02 | Blocking validation hooks | 0007 | not started |
| KRN-EVT-03 | `domain_events` written in the same transaction | 0007 | not started |
| KRN-EVT-04 | Queue dispatcher, polling dispatcher on Node, at least once | 0007 | not started |
| KRN-EVT-05 | Dead letter, visible, retryable | 0007 | not started |
| KRN-EVT-06 | Versioned payload schemas | 0007 | not started |
| KRN-EVT-07 | Core hook, slot, and event catalogue from spec section 9 | 0007 | not started |
| KRN-UIX-01 | App shell from the registry, school branding | 0001, 0006 | not started |
| KRN-UIX-02 | `viewDocumentSchema` for view version 1 | 0006 | not started |
| KRN-UIX-03 | Server renderer, invalid documents become a safe error | 0006 | not started |
| KRN-UIX-04 | `/x/:extension/*` | 0006 | not started |
| KRN-UIX-05 | Forms, CSRF, field errors | 0006 | not started |
| KRN-UIX-06 | Slots: `student.profile.tabs`, `dashboard.widgets`, `navigation.items` | 0006, 0007 | not started |
| KRN-UIX-07 | Entity pickers that respect scope | 0003, 0006 | not started |
| KRN-UIX-08 | Route error pages with no internal details | 0006 | not started |
| KRN-UIX-09 | axe checks in CI | 0006 | not started |
| KRN-SVC-01 | Settings service | 0001 | not started |
| KRN-SVC-02 | R2 files, school scoped, size and type limits | 0001 | not started |
| KRN-SVC-03 | Notification service and delivery log | 0001 | not started |
| KRN-SVC-04 | `notifications.channel` provider contract | 0001 | not started |
| KRN-SVC-05 | In-app inbox | 0001 | not started |
| KRN-SVC-06 | Scheduled jobs per school | 0001 | not started |
| KRN-SVC-07 | Per-extension `en` and `sw` catalogs, date and money formatting | 0001 | not started |
| KRN-SVC-08 | Append-only audit log | 0002 | not started |
| KRN-SVC-09 | Audit log search and export | 0002 | not started |
| KRN-SVC-10 | Structured logs, request id, redaction | 0007 | not started |
| KRN-SVC-11 | Error taxonomy | 0001 | not started |
| KRN-SVC-12 | Health check | 0004 | not started |
| KRN-SVC-13 | `/api/v1` and OpenAPI 3.1 | 0001 | not started |
| SDK-01 | `defineModule` and `definePlugin` | 0001 | not started |
| SDK-02 | Typed context from declared capabilities | 0003 | not started |
| SDK-03 | View document builders | 0006 | not started |
| SDK-04 | Scoped Drizzle client that adds `school_id` | 0003 | not started |
| SDK-05 | Fake core and local core for extension tests | 0001 | not started |
| RUN-01 | `ExtensionHost` interface | 0004 | not started |
| RUN-02 | `BundledExtensionHost` | 0004 | not started |
| RUN-05 | Time and statement limits | 0004, 0007 | not started |

### 5.4 Phase 3

| ID | Module | Status |
|----|--------|--------|
| MOD-ACA-01 | Academics structure | not started |
| MOD-ACA-02 | Years and terms, `academics.term.started` | not started |
| MOD-ACA-03 | Subjects tied to levels | not started |
| MOD-ACA-04 | Subjects per form class | not started |
| MOD-ACA-05 | A-Level combinations | not started |
| MOD-ACA-06 | Remove the university-style `classes` model | not started |
| MOD-STU-01 | Student records | not started |
| MOD-STU-02 | Admission numbers | not started |
| MOD-STU-03 | Year-scoped enrolment | not started |
| MOD-STU-04 | Promotion and graduation | not started |
| MOD-STU-05 | Guardian records | not started |
| MOD-STU-06 | Guardian accounts | not started |
| MOD-STU-07 | Year-scoped student subjects | not started |
| MOD-STU-08 | Student portal via slots | not started |
| MOD-STF-01 | Staff records and staff type | not started |
| MOD-STF-02 | Year-scoped teaching assignments | not started |
| MOD-STF-03 | Staff accounts via memberships | not started |
| MOD-ASM-01 | Assessment types | not started |
| MOD-ASM-02 | Results tied to enrolment | not started |
| MOD-ASM-03 | Grading scales | not started |
| MOD-ASM-04 | Mark entry by class | not started |
| MOD-ASM-05 | Report cards | not started |
| MOD-ASM-06 | Results release | not started |
| MOD-CAL-01 | Calendar events | not started |
| MOD-CAL-02 | Event notifications | not started |
| MOD-CAL-03 | Dashboard widget | not started |

Dogfood rule from ADR 0001: ordinary create, view, update, and remove screens in these modules should return view documents, so the vocabulary is exercised before any third party uses it. Custom React routes are allowed only where a view document cannot express the screen, and that exception is written in the pull request.

### 5.5 Phase 4

Attendance is first. It is the proof that a module can ship with view documents and no custom React routes (specification phase 4, ADR 0006).

| ID | Module | Status |
|----|--------|--------|
| MOD-ATT-01 | Daily attendance | not started |
| MOD-ATT-02 | Mark the class present, then edit exceptions | not started |
| MOD-ATT-03 | `attendance.record.marked_absent` | not started |
| MOD-ATT-04 | Attendance reports, profile tab, dashboard widget | not started |
| MOD-FIN-01 | Fee items | not started |
| MOD-FIN-02 | Fee structures | not started |
| MOD-FIN-03 | Invoices, including automatic creation on enrolment | not started |
| MOD-FIN-04 | Payments and allocations, balances computed | not started |
| MOD-FIN-05 | Numbered receipts | not started |
| MOD-FIN-06 | Class and term summaries | not started |
| MOD-FIN-07 | `finance.paymentProvider` | not started |
| MOD-FIN-08 | Reconciliation | not started |
| MOD-FIN-09 | Financial audit, reversals only | not started |
| MOD-TTB-01 | Periods | not started |
| MOD-TTB-02 | Timetable entries | not started |
| MOD-TTB-03 | Clash detection | not started |
| MOD-TTB-04 | Personal timetables | not started |
| MOD-LSN-01 | Lesson-plan templates | not started |
| MOD-LSN-02 | Submission with files | not started |
| MOD-LSN-03 | Review workflow | not started |
| MOD-DIS-01 | Incident types | not started |
| MOD-DIS-02 | Incident records | not started |
| MOD-DIS-03 | Restricted visibility and audited views | not started |
| MOD-CLB-01 | Clubs | not started |
| MOD-CLB-02 | Year-scoped membership | not started |
| MOD-CLB-03 | Activities | not started |
| MOD-LDR-01 | Leadership positions | not started |
| MOD-LDR-02 | Appointments | not started |
| MOD-RPT-01 | Role dashboards made only of widgets | not started |
| MOD-RPT-02 | CSV import with preview, and CSV export | not started |

### 5.6 Phase 5

| ID | Work | ADR | Status |
|----|------|-----|--------|
| RUN-03 | `DynamicWorkerExtensionHost` | 0004 | not started |
| RUN-04 | Capability RPC stubs | 0003, 0004 | not started |
| RUN-06 | Zip upload limits and path checks | 0005 | not started |
| RUN-07 | Manifest, schema, locale, and core-version checks | 0005 | not started |
| RUN-08 | Ed25519 verification, unsigned only when `EXTENSIONS_ALLOW_UNSIGNED=true` | 0005 | not started |
| RUN-09 | Trusted publishers, add, rotate, revoke | 0005 | not started |
| RUN-10 | Immutable R2 storage by key and version | 0004, 0005 | not started |
| RUN-11 | Consent screen in English and Swahili | 0005 | not started |
| RUN-12 | Revocation disables the version on the next request and notifies admins | 0005 | not started |
| RUN-13 | Hide upload when the Worker Loader binding is absent | 0004 | not started |
| PLG-01 | SMS channel | 0005 | not started |
| PLG-02 | Email channel | 0005 | not started |
| PLG-03 | Mobile money provider, shipped as a signed zip | 0004, 0005 | not started |
| PLG-04 | Absence alert | 0007 | not started |
| PLG-05 | Fee reminder job | 0007 | not started |
| PLG-06 | Theme package schema. JSON colour tokens only. The `yoyol` key injects nothing, so the current look stays. | 0008 | done |
| PLG-07 | Upload and activate on `/themes`. Stored by the core in `school_themes`. The school profile only links there. | 0008 | done |
| PLG-08 | Example theme download. It changes colours only after a school activates it. | 0008 | done |
| PLG-09 | `/themes` installation page. Install packages and set the active theme. | 0008 | done |

### 5.7 Phase 6

| ID | Work | Status |
|----|------|--------|
| SDK-CLI-01 | `yoyol-ext create` | not started |
| SDK-CLI-02 | `yoyol-ext validate` | not started |
| SDK-CLI-03 | `yoyol-ext build` and `yoyol-ext pack` | not started |
| SDK-CLI-04 | `yoyol-ext sign` in CI only, private key never in this repo | not started |
| SDK-CLI-05 | Local dev server | not started |
| DOC-01 | LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG, templates | not started |
| DOC-02 | Architecture overview | not started |
| DOC-03 | Data dictionary | not started |
| DOC-04 | API reference | not started |
| DOC-05 | Extension developer guide | not started |
| DOC-06 | Cloudflare and Docker deployment guides | not started |
| DOC-07 | Role guides in English and Swahili | not started |
| DOC-08 | Key rotation, revocation, and breach steps | not started |
| DOC-09 | Contributor quickstart | not started |

### 5.8 Catalog gaps

These requirements are in the SRS and are not a feature ID in `docs/features.md`. They are in scope. Before the phase that needs them starts, add the ID to `docs/features.md` and point it at the same requirement. Do not implement them under an unnamed change.

| ID | Add to catalog as | Covers | Phase | Status |
|----|-------------------|--------|-------|--------|
| GAP-SCH-01 | School profile create, view, update, logo, and theme applied across the app | FR-SCH-01, FR-SCH-02, FR-SCH-03, FR-SCH-04 | 1 | not started |
| GAP-SCH-02 | Archive a school and block new sign-in | FR-SCH-05 | 1 | not started |
| GAP-SCH-03 | Campus search and filter, refuse removal while in use, exactly one main campus | FR-SCH-07, FR-SCH-09, FR-SCH-10. Create and update sit on KRN-IAM-02. | 1 | not started |
| GAP-IAM-01 | Own profile (name, phone, photo, language) and change password | FR-IAM-10, FR-IAM-11 | 1 | not started |
| GAP-IAM-02 | Suspend, restore, and remove a membership without deleting the linked record | FR-IAM-16, FR-IAM-17 | 1 | not started |
| GAP-IAM-03 | Create, rename, and delete custom roles. System roles stay protected. | FR-IAM-18. Seeding is KRN-IAM-04. | 1 | not started |
| GAP-IAM-04 | Account registration still works after tenancy, and lands in no school until invited or onboarded | FR-IAM-01 | 1 | not started |
| GAP-IAM-05 | Member list and change-role screen | FR-IAM-14, FR-IAM-15 | 1 | not started |
| GAP-NTF-01 | Parent chooses a contact channel from the ones the school offers | FR-NTF-03 | 2 | not started |

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
