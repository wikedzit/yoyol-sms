# 0001. Pluggable extension architecture (core, modules, plugins)

- Status: Proposed
- Date: 2026-10-02

## Context

YOYOL is meant to be a school ERP that grows by adding features after deployment, in the
spirit of WordPress or Joomla, including installing new functionality from a zip file.

Today every feature is hard-wired:

- `workers/services/index.ts` (`ServiceContainer`) constructs 15 services by hand.
- `app/routes.ts` lists every route.
- `workers/database/index.ts` exports every table, and one migrations folder serves the
  whole app.

SRS NFR-7 asks for modules that are independently extensible, but neither the code nor
the SRS data model has any notion of an installable unit.

## Decision

Split YOYOL into a **core kernel** and **extensions**. Every extension follows one
contract, defined in [the extension specification](../extensions/specification.md).

### Core kernel

Owns everything that extensions attach to and must not reimplement:

- tenancy, authentication, sessions, roles and the permission registry (ADR 0002)
- the extension registry and lifecycle (install, enable, upgrade, disable, uninstall)
- data access through the database adapter (ADR 0003)
- the hook bus and event outbox (ADR 0007)
- navigation, settings, files (R2), notifications, jobs, audit log and i18n
- the view-document renderer (ADR 0006)

### Two extension types

- **Plugin**: a small extension. No tables, no pages of its own. It listens to hooks and
  events, contributes to UI slots, stores key-value settings through the core, and may
  implement a provider interface (for example an SMS channel or a mobile money provider).
- **Module**: a business area. Everything a plugin can do, plus its own tables, pages,
  permissions, navigation entries, new hooks, and services that other extensions can
  depend on.

### Two loading modes, one contract

- **Bundled**: source lives in `extensions/<key>/` in this repository, is compiled into the
  app, and is trusted. Bundled extensions may be marked `required` so they cannot be
  uninstalled.
- **Installed**: uploaded as a signed zip (ADR 0005), stored in R2, and run in a sandbox
  (ADR 0004) with only the capabilities an administrator approved.

An extension written against `@yoyol/sdk` must run unchanged in either mode.

### Domain placement

Students, guardians, staff and the academic structure (levels, streams, forms, classes,
subjects, academic years, terms) are **required bundled modules**, not kernel code. Almost
every other module depends on them, but they still follow the extension contract so the
contract is exercised by real code from day one.

### Target repository layout

```
apps/web/              React Router host (today's app/ and workers/)
packages/core/         kernel
packages/sdk/          @yoyol/sdk for extension authors
packages/ui/           view-document renderer and shared components
packages/cli/          yoyol-ext validate | build | pack | sign
extensions/academics/  required bundled module
extensions/students/   required bundled module
extensions/staff/      required bundled module
extensions/assessment/ bundled module
extensions/notices/    bundled module
```

## Consequences

- New features (attendance, finance, timetables, discipline, clubs, leadership) are built as
  modules, not as edits to the core.
- `ServiceContainer`, `routes.ts`, the sidebar and the schema index become registry-driven.
- The existing features must be migrated into `extensions/*`. This is planned as a phase on
  its own (see the specification's migration plan) and it validates the contract before
  any third party depends on it.
- The kernel's public API becomes a compatibility promise. It is versioned with semver and
  extensions declare `requires.core`.
