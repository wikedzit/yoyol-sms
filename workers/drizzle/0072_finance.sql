CREATE TABLE mod_finance_fee_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  school_id INTEGER NOT NULL REFERENCES school(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by INTEGER
);

CREATE TABLE mod_finance_structures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fee_item_id INTEGER NOT NULL,
  form_class_id INTEGER NOT NULL,
  academic_year_id INTEGER NOT NULL,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  school_id INTEGER NOT NULL REFERENCES school(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by INTEGER
);

CREATE UNIQUE INDEX mod_finance_structures_item_class_year
  ON mod_finance_structures (school_id, fee_item_id, form_class_id, academic_year_id);

CREATE TABLE mod_finance_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  form_class_id INTEGER NOT NULL,
  academic_year_id INTEGER NOT NULL,
  term_id INTEGER NOT NULL,
  number TEXT NOT NULL,
  currency TEXT NOT NULL,
  voided INTEGER NOT NULL DEFAULT 0,
  school_id INTEGER NOT NULL REFERENCES school(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by INTEGER
);

CREATE UNIQUE INDEX mod_finance_invoices_number ON mod_finance_invoices (school_id, number);

CREATE UNIQUE INDEX mod_finance_invoices_open_student_term
  ON mod_finance_invoices (school_id, student_id, term_id)
  WHERE voided = 0;

CREATE TABLE mod_finance_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  fee_item_id INTEGER,
  description TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  school_id INTEGER NOT NULL REFERENCES school(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by INTEGER
);

CREATE TABLE mod_finance_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount_minor INTEGER NOT NULL,
  paid_on TEXT NOT NULL,
  method TEXT NOT NULL,
  reference TEXT,
  kind TEXT NOT NULL,
  reverses_payment_id INTEGER,
  reason TEXT,
  school_id INTEGER NOT NULL REFERENCES school(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by INTEGER
);

CREATE TABLE mod_finance_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER NOT NULL,
  invoice_id INTEGER NOT NULL,
  amount_minor INTEGER NOT NULL,
  school_id INTEGER NOT NULL REFERENCES school(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by INTEGER
);

CREATE TABLE mod_finance_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER NOT NULL,
  number TEXT NOT NULL,
  school_id INTEGER NOT NULL REFERENCES school(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by INTEGER
);

CREATE UNIQUE INDEX mod_finance_receipts_number ON mod_finance_receipts (school_id, number);

CREATE TABLE mod_finance_provider_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  paid_on TEXT NOT NULL,
  invoice_id INTEGER,
  payment_id INTEGER,
  status TEXT NOT NULL,
  school_id INTEGER NOT NULL REFERENCES school(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by INTEGER
);

CREATE UNIQUE INDEX mod_finance_provider_external
  ON mod_finance_provider_payments (school_id, provider, external_id);
