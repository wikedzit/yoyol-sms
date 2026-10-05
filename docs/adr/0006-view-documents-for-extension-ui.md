# 0006. View documents for installed extension UI

- Status: Accepted
- Date: 2026-10-02

## Context

React Router 7 compiles routes at build time, and installed extensions run in a separate
isolate (ADR 0004), so they cannot hand React components to the host for server rendering.
Shipping arbitrary client JavaScript from a zip would also let third-party code run in a
browser session that can see minors' data.

The SRS requires WCAG 2.2 AA (AC-1 to AC-5), English and Swahili (I18N-1 to I18N-4),
mobile-first layouts and low-bandwidth tolerance (NFR-1, NFR-2).

## Decision

1. Installed extensions describe UI as **view documents**: versioned JSON trees built from a
   fixed vocabulary of core components (page, section, stats, table, form, tabs, callout,
   chart, and so on). The vocabulary is defined in
   [view-documents.md](../extensions/view-documents.md).
2. A single catch-all route, `/x/:extension/*`, serves every installed extension page.
   Its loader and action:
   1. verify the session, tenant, extension status and the page's permission;
   2. call the extension's `handlePage` or `handleAction` over RPC;
   3. validate the returned document against the schema;
   4. server-render it with the core component library.
3. Extensions contribute to existing screens through **slots** (for example
   `student.profile.tabs`, `dashboard.widgets`), which also return view documents.
4. View documents contain no raw HTML, no scripts and no style overrides. Links and form
   targets must be relative paths inside the app.
5. Bundled extensions may still ship normal React route modules. They should prefer view
   documents for ordinary CRUD screens so the component vocabulary is exercised and stays
   complete.
6. **Later, not in v1:** trusted, signed extensions may declare a client bundle rendered in a
   sandboxed iframe for highly interactive tools (for example a drag-and-drop timetable
   builder). That will be a separate ADR.

## Consequences

- Extension pages automatically follow the app's design, accessibility and translation
  rules, and work without client-side JavaScript (progressive enhancement).
- The component vocabulary becomes a versioned public API (`viewVersion`). Adding components
  is backward compatible; changing them needs a new version.
- Some interactive experiences are not possible for installed extensions until the iframe
  escape hatch exists.
