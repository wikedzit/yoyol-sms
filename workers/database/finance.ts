import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { school } from './school';

const schoolColumns = {
  schoolId: integer('school_id').notNull().references(() => school.id),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  createdBy: integer('created_by'),
};

export const financeFeeItems = sqliteTable('mod_finance_fee_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  code: text('code'),
  active: integer('active', { mode: 'boolean' }).notNull(),
  ...schoolColumns,
});

export const financeStructures = sqliteTable('mod_finance_structures', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  feeItemId: integer('fee_item_id').notNull(),
  formClassId: integer('form_class_id').notNull(),
  academicYearId: integer('academic_year_id').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  currency: text('currency').notNull(),
  ...schoolColumns,
}, (table) => ({
  itemClassYear: uniqueIndex('mod_finance_structures_item_class_year').on(
    table.schoolId,
    table.feeItemId,
    table.formClassId,
    table.academicYearId,
  ),
}));

export const financeInvoices = sqliteTable('mod_finance_invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  studentId: integer('student_id').notNull(),
  formClassId: integer('form_class_id').notNull(),
  academicYearId: integer('academic_year_id').notNull(),
  termId: integer('term_id').notNull(),
  number: text('number').notNull(),
  currency: text('currency').notNull(),
  voided: integer('voided', { mode: 'boolean' }).notNull(),
  ...schoolColumns,
});

export const financeLines = sqliteTable('mod_finance_lines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').notNull(),
  feeItemId: integer('fee_item_id'),
  description: text('description').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  ...schoolColumns,
});

export const financePayments = sqliteTable('mod_finance_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amountMinor: integer('amount_minor').notNull(),
  paidOn: text('paid_on').notNull(),
  method: text('method').notNull(),
  reference: text('reference'),
  kind: text('kind').notNull(),
  reversesPaymentId: integer('reverses_payment_id'),
  reason: text('reason'),
  ...schoolColumns,
});

export const financeAllocations = sqliteTable('mod_finance_allocations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  paymentId: integer('payment_id').notNull(),
  invoiceId: integer('invoice_id').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  ...schoolColumns,
});

export const financeReceipts = sqliteTable('mod_finance_receipts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  paymentId: integer('payment_id').notNull(),
  number: text('number').notNull(),
  ...schoolColumns,
});

export const financeProviderPayments = sqliteTable('mod_finance_provider_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  provider: text('provider').notNull(),
  externalId: text('external_id').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  currency: text('currency').notNull(),
  paidOn: text('paid_on').notNull(),
  invoiceId: integer('invoice_id'),
  paymentId: integer('payment_id'),
  status: text('status').notNull(),
  ...schoolColumns,
});
