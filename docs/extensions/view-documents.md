# View Documents

- View version: 1 (draft)
- Date: 2026-10-02
- Decision: [ADR 0006](../adr/0006-view-documents-for-extension-ui.md)

A view document is JSON that an extension returns to describe a page or a slot. The core
validates it and server-renders it with the shared component library in `packages/ui`.
Extensions never send HTML, scripts or styles.

## 1. Envelope

```json
{
  "viewVersion": 1,
  "title": { "t": "invoices.title" },
  "breadcrumbs": [{ "label": { "t": "nav.finance" }, "href": "/x/finance" }],
  "actions": [
    { "type": "link", "label": { "t": "invoices.new" }, "href": "/x/finance/invoices/new", "variant": "primary" }
  ],
  "body": []
}
```

- `body` is an array of nodes (section 3).
- Slot responses (`student.profile.tabs`, `dashboard.widgets`) return only a `body` array plus
  the slot-specific fields from the specification.

## 2. Text

Every user-visible string is a `Text` value:

| Form | Meaning |
|------|---------|
| `"Plain text"` | Literal text, for data values such as names and numbers |
| `{ "t": "invoices.title" }` | Translation key from the extension's `locales/` |
| `{ "t": "invoices.count", "params": { "count": 3 } }` | Translation with parameters |

Labels, headings and messages must use translation keys (SRS I18N-1). Literal strings are
for data only.

Values that need locale formatting use typed nodes instead of pre-formatted strings:

```json
{ "format": "money", "amountMinor": 1500000, "currency": "TZS" }
{ "format": "date", "value": "2026-10-02" }
{ "format": "number", "value": 0.934, "style": "percent" }
```

## 3. Nodes (v1)

| Node | Key fields | Notes |
|------|------------|-------|
| `section` | `heading?`, `description?`, `body` | Groups nodes, renders as an open section |
| `card` | `heading?`, `body`, `footer?` | Bordered surface |
| `grid` | `columns` (1 to 4), `body` | Collapses to one column on small screens (SRS NFR-2) |
| `stats` | `items: { label, value, tone? }[]` | Key figures |
| `text` | `value`, `tone?`, `size?` | Paragraph |
| `callout` | `tone` (`info`, `success`, `warning`, `danger`), `title?`, `body` | Notices and errors |
| `badge` | `label`, `tone?` | Status labels |
| `table` | `columns`, `rows`, `pagination?`, `emptyText` | Server-driven paging and sorting |
| `descriptionList` | `items: { label, value }[]` | Record detail view |
| `form` | `action`, `fields`, `submitLabel`, `method?` | Posts to the extension's `handleAction` |
| `tabs` | `items: { key, label, href }[]`, `activeKey` | Each tab is a link; no client state |
| `link` | `label`, `href`, `variant?` | Relative app paths only |
| `button` | `label`, `action`, `variant?`, `confirm?` | Submits a one-field form, for example "Void invoice" |
| `chart` | `kind` (`bar`, `line`), `title`, `xLabel`, `yLabel`, `series` | Rendered with the existing Recharts setup |
| `divider` | none | |

### 3.1 Table

```json
{
  "type": "table",
  "columns": [
    { "key": "student", "label": { "t": "invoices.student" } },
    { "key": "amount", "label": { "t": "invoices.amount" }, "align": "right", "sortable": true },
    { "key": "status", "label": { "t": "invoices.status" } }
  ],
  "rows": [
    {
      "href": "/x/finance/invoices/42",
      "cells": {
        "student": "Amina Juma",
        "amount": { "format": "money", "amountMinor": 1500000, "currency": "TZS" },
        "status": { "type": "badge", "label": { "t": "status.partial" }, "tone": "warning" }
      }
    }
  ],
  "pagination": { "page": 1, "pageSize": 25, "totalItems": 312 },
  "emptyText": { "t": "invoices.empty" }
}
```

Paging and sorting are query-string links (`?page=2&sort=amount`), so tables work without
client JavaScript and on slow connections (SRS NFR-1, API-4).

### 3.2 Form

```json
{
  "type": "form",
  "action": "recordPayment",
  "fields": [
    { "name": "invoiceId", "kind": "hidden", "value": "42" },
    { "name": "amount", "kind": "money", "label": { "t": "payments.amount" }, "currency": "TZS", "required": true },
    { "name": "paidOn", "kind": "date", "label": { "t": "payments.paidOn" }, "required": true },
    {
      "name": "method",
      "kind": "select",
      "label": { "t": "payments.method" },
      "options": [
        { "value": "cash", "label": { "t": "payments.method.cash" } },
        { "value": "mobile_money", "label": { "t": "payments.method.mobileMoney" } }
      ]
    },
    { "name": "reference", "kind": "text", "label": { "t": "payments.reference" }, "maxLength": 64 }
  ],
  "submitLabel": { "t": "payments.record" }
}
```

Field kinds: `text`, `textarea`, `number`, `money`, `date`, `select`, `multiselect`,
`checkbox`, `radio`, `hidden`, `file` (requires `files:write`), and `entity` (a picker for
core records such as students or classes, limited to granted capabilities).

The core adds the CSRF token (SRS SEC-13), labels every input (SRS AC-3), and on an
`invalid` action response re-renders the form with `fieldErrors` next to each field.

## 4. Rendering rules

1. The document is validated against the `viewDocumentSchema` exported by `@yoyol/sdk`.
   An invalid document renders a safe error page and is logged with the correlation id.
2. Unknown node types are rejected, not ignored, so mistakes surface during development.
3. `href` and `action` targets must stay inside the app. External links are allowed only for
   hosts listed in the extension's `outboundHosts`, and open with `rel="noopener noreferrer"`.
4. Text is always escaped. There is no node that accepts HTML.
5. Colours come from `tone` values mapped to the school's theme, never from the extension
   (SRS AC-4).
6. Maximum document size is 256 KB. Larger lists must paginate.

## 5. Versioning

- Adding a node type or an optional field is a minor change within `viewVersion: 1`.
- Removing or changing the meaning of a field requires `viewVersion: 2`. The core renders
  every supported version for at least one major core release after a new one appears.
