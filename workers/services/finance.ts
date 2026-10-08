import { and, asc, eq, inArray } from 'drizzle-orm';
import { academicYears, terms } from '../database/academic-years';
import type { AppDatabase } from '../database/app-database';
import { formClasses } from '../database/academic-levels';
import {
  financeAllocations,
  financeFeeItems,
  financeInvoices,
  financeLines,
  financePayments,
  financeProviderPayments,
  financeReceipts,
  financeStructures,
} from '../database/finance';
import { guardianStudents, guardians } from '../database/guardians';
import { studentEnrolments } from '../database/student-enrolments';
import { studentGuardians } from '../database/student-guardians';
import { students } from '../database/students';
import {
  displayedInvoiceStatus,
  invoiceOutstanding,
  minorUnits,
  nextDocumentNumber,
  providerDecision,
  refusalToAllocate,
  refusalToReversePayment,
  refusalToSaveFeeItem,
  refusalToVoidInvoice,
  summariseFees,
  type FinanceHome,
  type FinanceInvoiceLine,
  type FinanceInvoicePage,
  type FinancePage,
  type FinanceReceiptPage,
} from '../kernel/finance';
import { formatMoney } from '../kernel/locale-format';
import type { RecordScope } from './visible-records';
import { requireSchoolId } from '../utils/require-owner-user';

type FinanceDeps = {
  scope: () => Promise<RecordScope>;
  canWrite: () => Promise<boolean>;
  setting: (key: string) => Promise<string | null>;
  saveSetting: (key: string, value: string) => Promise<void>;
  audit: (action: string, target: string, detail: string) => Promise<void>;
  notify: (input: { userId: number; title: string; body: string }) => Promise<void>;
  publishPaid: (input: { paymentId: number; amountMinor: number; invoiceId: number | null }) => Promise<void>;
};

const paymentMethods = new Set(['cash', 'bank', 'mobile']);

export default class FinanceRecordService {
  constructor(
    private db: AppDatabase,
    private activeSchoolId: number | null = null,
    private currentUserId: number | null = null,
    private deps: FinanceDeps,
  ) {}

  async canWrite(): Promise<boolean> {
    return this.deps.canWrite();
  }

  async open(path: string, search: string): Promise<FinancePage> {
    const invoice = /^\/invoice\/(\d+)$/.exec(path);
    if (invoice) return this.invoicePage(Number(invoice[1]));
    const receipt = /^\/receipt\/(\d+)$/.exec(path);
    if (receipt) return this.receiptPage(Number(receipt[1]));
    return this.home(search);
  }

  async save(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const action = fields._action;
    if (action === 'fee-item') return this.saveItem(fields);
    if (action === 'deactivate-item') return this.deactivateItem(Number(fields.itemId));
    if (action === 'structure') return this.saveStructure(fields);
    if (action === 'bulk') return this.createInvoices();
    if (action === 'charge') return this.addCharge(fields);
    if (action === 'void') return this.voidInvoice(Number(fields.invoiceId));
    if (action === 'payment') return this.recordPayment(fields);
    if (action === 'reverse') return this.reversePayment(fields);
    if (action === 'provider') return this.acceptProvider(fields);
    if (action === 'match') return this.matchProvider(fields);
    if (action === 'reject') return this.rejectProvider(Number(fields.providerPaymentId));
    if (action === 'currency') return this.saveCurrency(fields.currency ?? '');
    return { error: 'That finance action is not available.' };
  }

  async profileLines(studentId: number | null): Promise<string[]> {
    const page = await this.home('');
    return page.invoices
      .filter((invoice) => invoice.status !== 'void')
      .filter((invoice) => studentId == null || invoice.studentId === studentId)
      .map((invoice) => `${invoice.studentName}, ${invoice.number}: ${formatMoney(invoice.outstanding, invoice.currency, 'en')} outstanding`);
  }

  async onEnrolled(input: { studentId: number; formClassId: number; academicYearId: number }): Promise<void> {
    await this.issueForEnrolment(input);
  }

  private async home(search: string): Promise<FinanceHome> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const query = new URLSearchParams(search);
    const currency = await this.currency();
    const [items, classes, people, termRows, structures, invoices, unmatched] = await Promise.all([
      this.itemRows(schoolId),
      this.classRows(),
      this.studentRows(schoolId),
      this.termRows(schoolId),
      this.structureRows(schoolId),
      this.invoiceRows(schoolId),
      this.unmatchedRows(schoolId),
    ]);
    const allowed = await this.allowedStudentIds();
    const visiblePeople = allowed == null ? people : people.filter((person) => allowed.has(person.id));
    const visibleInvoices = invoices.filter((invoice) => allowed == null || allowed.has(invoice.studentId));
    return {
      kind: 'home',
      canWrite: await this.canWrite(),
      currency,
      items,
      classes,
      students: visiblePeople,
      terms: termRows,
      structures,
      invoices: visibleInvoices.filter((invoice) => matchesFilter(invoice, query)),
      summaries: summariseFees(visibleInvoices.filter((invoice) => invoice.status !== 'void').map((invoice) => ({
        className: invoice.className,
        termName: invoice.termName,
        expected: invoice.total,
        paid: invoice.total - invoice.outstanding,
      }))).map((row) => ({ ...row, currency })),
      unmatched,
    };
  }

  private async invoicePage(invoiceId: number): Promise<FinanceInvoicePage | { kind: 'missing'; message: string }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const invoice = (await this.invoiceRows(schoolId)).find((row) => row.id === invoiceId);
    if (!invoice || !(await this.canSeeStudent(invoice.studentId))) {
      return { kind: 'missing', message: 'That invoice was not found.' };
    }
    const lines = await this.db
      .select({ description: financeLines.description, amountMinor: financeLines.amountMinor })
      .from(financeLines)
      .where(and(eq(financeLines.schoolId, schoolId), eq(financeLines.invoiceId, invoiceId)));
    const payments = await this.paymentRows(schoolId, invoiceId);
    const receipts = await this.receiptRows(schoolId, payments.map((payment) => payment.id));
    return {
      kind: 'invoice',
      canWrite: await this.canWrite(),
      invoice,
      lines,
      payments,
      receipts,
    };
  }

  private async receiptPage(receiptId: number): Promise<FinanceReceiptPage | { kind: 'missing'; message: string }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const receipt = await this.db
      .select({
        id: financeReceipts.id,
        number: financeReceipts.number,
        paymentId: financeReceipts.paymentId,
      })
      .from(financeReceipts)
      .where(and(eq(financeReceipts.schoolId, schoolId), eq(financeReceipts.id, receiptId)))
      .get();
    if (!receipt) return { kind: 'missing', message: 'That receipt was not found.' };
    const payment = await this.db
      .select()
      .from(financePayments)
      .where(and(eq(financePayments.schoolId, schoolId), eq(financePayments.id, receipt.paymentId)))
      .get();
    const allocation = await this.db
      .select({ invoiceId: financeAllocations.invoiceId })
      .from(financeAllocations)
      .where(eq(financeAllocations.paymentId, receipt.paymentId))
      .get();
    const invoice = allocation
      ? (await this.invoiceRows(schoolId)).find((row) => row.id === allocation.invoiceId)
      : undefined;
    if (!payment || !invoice || !(await this.canSeeStudent(invoice.studentId))) {
      return { kind: 'missing', message: 'That receipt was not found.' };
    }
    return {
      kind: 'receipt',
      number: receipt.number,
      studentName: invoice.studentName,
      paidOn: payment.paidOn,
      method: payment.method,
      reference: payment.reference ?? '',
      amountMinor: payment.amountMinor,
      currency: invoice.currency,
      invoiceNumber: invoice.number,
    };
  }

  private async saveItem(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const refused = await this.refuseWrite() ?? refusalToSaveFeeItem(fields.name ?? '');
    if (refused) return { error: refused };
    const schoolId = requireSchoolId(this.activeSchoolId);
    const name = fields.name.trim();
    const code = fields.code?.trim() ?? '';
    if (code.length > 0) {
      const taken = await this.db
        .select({ id: financeFeeItems.id })
        .from(financeFeeItems)
        .where(and(eq(financeFeeItems.schoolId, schoolId), eq(financeFeeItems.code, code)))
        .get();
      const itemId = Number(fields.itemId);
      if (taken && taken.id !== itemId) return { error: 'That fee code is already in use.' };
    }
    const now = Date.now();
    const itemId = Number(fields.itemId);
    if (itemId > 0) {
      await this.db.update(financeFeeItems).set({ name, code: code || null, updatedAt: now }).where(and(
        eq(financeFeeItems.id, itemId),
        eq(financeFeeItems.schoolId, schoolId),
      ));
    } else {
      await this.db.insert(financeFeeItems).values({
        ...this.stamp(schoolId, now),
        name,
        code: code || null,
        active: true,
      });
    }
    await this.deps.audit('finance.feeItem.write', name, code);
    return { ok: true };
  }

  private async deactivateItem(itemId: number): Promise<{ error: string } | { ok: true }> {
    const refused = await this.refuseWrite();
    if (refused) return { error: refused };
    const schoolId = requireSchoolId(this.activeSchoolId);
    await this.db.update(financeFeeItems).set({ active: false, updatedAt: Date.now() }).where(and(
      eq(financeFeeItems.id, itemId),
      eq(financeFeeItems.schoolId, schoolId),
    ));
    await this.deps.audit('finance.feeItem.deactivate', String(itemId), 'inactive');
    return { ok: true };
  }

  private async saveStructure(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const refused = await this.refuseWrite();
    if (refused) return { error: refused };
    const schoolId = requireSchoolId(this.activeSchoolId);
    const currency = await this.currency();
    const amount = minorUnits(fields.amount ?? '', currency);
    if ('error' in amount) return amount;
    const feeItemId = Number(fields.feeItemId);
    const formClassId = Number(fields.formClassId);
    const year = await this.activeYear(schoolId);
    if (!year) return { error: 'Choose an active academic year before setting a fee.' };
    if (!feeItemId || !formClassId) return { error: 'Choose a fee item and a class.' };
    const now = Date.now();
    const existing = await this.db
      .select({ id: financeStructures.id })
      .from(financeStructures)
      .where(and(
        eq(financeStructures.schoolId, schoolId),
        eq(financeStructures.feeItemId, feeItemId),
        eq(financeStructures.formClassId, formClassId),
        eq(financeStructures.academicYearId, year.id),
      ))
      .get();
    if (existing) {
      await this.db.update(financeStructures).set({
        amountMinor: amount.amountMinor,
        currency,
        updatedAt: now,
      }).where(eq(financeStructures.id, existing.id));
    } else {
      await this.db.insert(financeStructures).values({
        ...this.stamp(schoolId, now),
        feeItemId,
        formClassId,
        academicYearId: year.id,
        amountMinor: amount.amountMinor,
        currency,
      });
    }
    await this.deps.audit('finance.structure.write', `${feeItemId}:${formClassId}`, String(amount.amountMinor));
    return { ok: true };
  }

  private async createInvoices(): Promise<{ error: string } | { ok: true }> {
    const refused = await this.refuseWrite();
    if (refused) return { error: refused };
    const schoolId = requireSchoolId(this.activeSchoolId);
    const year = await this.activeYear(schoolId);
    if (!year) return { error: 'Choose an active academic year before creating invoices.' };
    const rows = await this.db
      .select({
        studentId: studentEnrolments.studentId,
        formClassId: studentEnrolments.formClassId,
        status: studentEnrolments.status,
      })
      .from(studentEnrolments)
      .where(and(eq(studentEnrolments.schoolId, schoolId), eq(studentEnrolments.academicYearId, year.id)));
    for (const row of rows) {
      if ((row.status === 'enrolled' || row.status === 'promoted') && row.formClassId != null) {
        await this.issueForEnrolment({
          studentId: row.studentId,
          formClassId: row.formClassId,
          academicYearId: year.id,
        });
      }
    }
    return { ok: true };
  }

  private async issueForEnrolment(input: {
    studentId: number;
    formClassId: number;
    academicYearId: number;
  }): Promise<void> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const term = await this.currentTerm(schoolId);
    if (!term) return;
    const existing = await this.db
      .select({ id: financeInvoices.id })
      .from(financeInvoices)
      .where(and(
        eq(financeInvoices.schoolId, schoolId),
        eq(financeInvoices.studentId, input.studentId),
        eq(financeInvoices.termId, term.id),
        eq(financeInvoices.voided, false),
      ))
      .get();
    if (existing) return;
    const structures = await this.db
      .select({
        feeItemId: financeStructures.feeItemId,
        amountMinor: financeStructures.amountMinor,
        currency: financeStructures.currency,
        itemName: financeFeeItems.name,
      })
      .from(financeStructures)
      .innerJoin(financeFeeItems, eq(financeFeeItems.id, financeStructures.feeItemId))
      .where(and(
        eq(financeStructures.schoolId, schoolId),
        eq(financeStructures.formClassId, input.formClassId),
        eq(financeStructures.academicYearId, input.academicYearId),
        eq(financeFeeItems.active, true),
      ));
    if (structures.length === 0) return;
    const now = Date.now();
    const number = await this.nextNumber(schoolId, 'INV', now);
    const created = await this.db.insert(financeInvoices).values({
      ...this.stamp(schoolId, now),
      studentId: input.studentId,
      formClassId: input.formClassId,
      academicYearId: input.academicYearId,
      termId: term.id,
      number,
      currency: structures[0]?.currency ?? 'TZS',
      voided: false,
    }).returning({ id: financeInvoices.id });
    const invoiceId = created[0]?.id ?? 0;
    for (const structure of structures) {
      await this.db.insert(financeLines).values({
        ...this.stamp(schoolId, now),
        invoiceId,
        feeItemId: structure.feeItemId,
        description: structure.itemName,
        amountMinor: structure.amountMinor,
      });
    }
    await this.deps.audit('finance.invoice.issued', number, String(input.studentId));
  }

  private async addCharge(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const refused = await this.refuseWrite();
    if (refused) return { error: refused };
    const description = fields.description?.trim() ?? '';
    if (description.length === 0) return { error: 'Enter the charge name.' };
    const schoolId = requireSchoolId(this.activeSchoolId);
    const invoice = await this.ownedInvoice(schoolId, Number(fields.invoiceId));
    if (!invoice) return { error: 'That invoice was not found.' };
    if (invoice.voided) return { error: 'This invoice is already void.' };
    const amount = minorUnits(fields.amount ?? '', invoice.currency);
    if ('error' in amount) return amount;
    const now = Date.now();
    await this.db.insert(financeLines).values({
      ...this.stamp(schoolId, now),
      invoiceId: invoice.id,
      feeItemId: null,
      description,
      amountMinor: amount.amountMinor,
    });
    await this.deps.audit('finance.charge.added', invoice.number, description);
    return { ok: true };
  }

  private async voidInvoice(invoiceId: number): Promise<{ error: string } | { ok: true }> {
    const refused = await this.refuseWrite();
    if (refused) return { error: refused };
    const schoolId = requireSchoolId(this.activeSchoolId);
    const invoice = await this.ownedInvoice(schoolId, invoiceId);
    if (!invoice) return { error: 'That invoice was not found.' };
    const totals = await this.totals(schoolId, invoiceId);
    const blocked = refusalToVoidInvoice({ voided: invoice.voided, allocated: totals.paid });
    if (blocked) return { error: blocked };
    await this.db.update(financeInvoices).set({ voided: true, updatedAt: Date.now() }).where(eq(financeInvoices.id, invoice.id));
    await this.deps.audit('finance.invoice.void', invoice.number, 'void');
    return { ok: true };
  }

  private async recordPayment(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const refused = await this.refuseWrite();
    if (refused) return { error: refused };
    const method = fields.method ?? '';
    if (!paymentMethods.has(method)) return { error: 'Choose cash, bank, or mobile money.' };
    const paidOn = fields.paidOn ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) return { error: 'Choose the payment date.' };
    const schoolId = requireSchoolId(this.activeSchoolId);
    const invoice = await this.ownedInvoice(schoolId, Number(fields.invoiceId));
    if (!invoice || invoice.voided) return { error: 'That invoice was not found.' };
    const amount = minorUnits(fields.amount ?? '', invoice.currency);
    if ('error' in amount) return amount;
    const totals = await this.totals(schoolId, invoice.id);
    const blocked = refusalToAllocate(amount.amountMinor, totals.outstanding);
    if (blocked) return { error: blocked };
    const paymentId = await this.insertPayment({
      schoolId,
      amountMinor: amount.amountMinor,
      paidOn,
      method,
      reference: fields.reference?.trim() ?? '',
      invoiceId: invoice.id,
      currency: invoice.currency,
      studentId: invoice.studentId,
    });
    await this.deps.publishPaid({ paymentId, amountMinor: amount.amountMinor, invoiceId: invoice.id });
    return { ok: true };
  }

  private async reversePayment(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const refused = await this.refuseWrite();
    if (refused) return { error: refused };
    const schoolId = requireSchoolId(this.activeSchoolId);
    const paymentId = Number(fields.paymentId);
    const payment = await this.db
      .select()
      .from(financePayments)
      .where(and(eq(financePayments.schoolId, schoolId), eq(financePayments.id, paymentId)))
      .get();
    if (!payment || payment.kind !== 'payment') return { error: 'That payment was not found.' };
    const prior = await this.db
      .select({ id: financePayments.id })
      .from(financePayments)
      .where(eq(financePayments.reversesPaymentId, payment.id))
      .get();
    const blocked = refusalToReversePayment({ reversed: prior != null, reason: fields.reason ?? '' });
    if (blocked) return { error: blocked };
    const allocations = await this.db
      .select()
      .from(financeAllocations)
      .where(eq(financeAllocations.paymentId, payment.id));
    const now = Date.now();
    const created = await this.db.insert(financePayments).values({
      ...this.stamp(schoolId, now),
      amountMinor: -payment.amountMinor,
      paidOn: payment.paidOn,
      method: payment.method,
      reference: payment.reference,
      kind: 'reversal',
      reversesPaymentId: payment.id,
      reason: fields.reason.trim(),
    }).returning({ id: financePayments.id });
    const reversalId = created[0]?.id ?? 0;
    for (const allocation of allocations) {
      await this.db.insert(financeAllocations).values({
        ...this.stamp(schoolId, now),
        paymentId: reversalId,
        invoiceId: allocation.invoiceId,
        amountMinor: -allocation.amountMinor,
      });
    }
    await this.deps.audit('finance.payment.reversed', String(payment.id), fields.reason.trim());
    return { ok: true };
  }

  private async acceptProvider(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const refused = await this.refuseWrite();
    if (refused) return { error: refused };
    const provider = fields.provider?.trim() ?? '';
    const externalId = fields.externalId?.trim() ?? '';
    if (provider.length === 0 || externalId.length === 0) {
      return { error: 'Enter the provider and the external reference.' };
    }
    const schoolId = requireSchoolId(this.activeSchoolId);
    const existing = await this.db
      .select({ id: financeProviderPayments.id })
      .from(financeProviderPayments)
      .where(and(
        eq(financeProviderPayments.schoolId, schoolId),
        eq(financeProviderPayments.provider, provider),
        eq(financeProviderPayments.externalId, externalId),
      ))
      .get();
    if (existing) return { ok: true };
    const invoiceId = Number(fields.invoiceId);
    const invoice = invoiceId > 0 ? await this.ownedInvoice(schoolId, invoiceId) : null;
    const decision = providerDecision({
      existingPaymentId: null,
      invoiceFound: invoice != null && !invoice.voided,
    });
    const currency = invoice?.currency ?? await this.currency();
    const amount = minorUnits(fields.amount ?? '', currency);
    if ('error' in amount) return amount;
    const paidOn = /^\d{4}-\d{2}-\d{2}$/.test(fields.paidOn ?? '') ? fields.paidOn : new Date().toISOString().slice(0, 10);
    const now = Date.now();
    if (decision === 'unmatched' || !invoice) {
      await this.db.insert(financeProviderPayments).values({
        ...this.stamp(schoolId, now),
        provider,
        externalId,
        amountMinor: amount.amountMinor,
        currency,
        paidOn,
        invoiceId: null,
        paymentId: null,
        status: 'unmatched',
      });
      await this.deps.audit('finance.provider.unmatched', externalId, provider);
      return { ok: true };
    }
    const totals = await this.totals(schoolId, invoice.id);
    const blocked = refusalToAllocate(amount.amountMinor, totals.outstanding);
    if (blocked) return { error: blocked };
    const paymentId = await this.insertPayment({
      schoolId,
      amountMinor: amount.amountMinor,
      paidOn,
      method: 'mobile',
      reference: externalId,
      invoiceId: invoice.id,
      currency,
      studentId: invoice.studentId,
    });
    await this.db.insert(financeProviderPayments).values({
      ...this.stamp(schoolId, now),
      provider,
      externalId,
      amountMinor: amount.amountMinor,
      currency,
      paidOn,
      invoiceId: invoice.id,
      paymentId,
      status: 'matched',
    });
    await this.deps.publishPaid({ paymentId, amountMinor: amount.amountMinor, invoiceId: invoice.id });
    return { ok: true };
  }

  private async matchProvider(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const refused = await this.refuseWrite();
    if (refused) return { error: refused };
    const schoolId = requireSchoolId(this.activeSchoolId);
    const row = await this.db
      .select()
      .from(financeProviderPayments)
      .where(and(
        eq(financeProviderPayments.schoolId, schoolId),
        eq(financeProviderPayments.id, Number(fields.providerPaymentId)),
      ))
      .get();
    if (!row || row.status !== 'unmatched') return { error: 'That payment is not waiting to be matched.' };
    const invoice = await this.ownedInvoice(schoolId, Number(fields.invoiceId));
    if (!invoice || invoice.voided) return { error: 'That invoice was not found.' };
    const totals = await this.totals(schoolId, invoice.id);
    const blocked = refusalToAllocate(row.amountMinor, totals.outstanding);
    if (blocked) return { error: blocked };
    const paymentId = await this.insertPayment({
      schoolId,
      amountMinor: row.amountMinor,
      paidOn: row.paidOn,
      method: 'mobile',
      reference: row.externalId,
      invoiceId: invoice.id,
      currency: invoice.currency,
      studentId: invoice.studentId,
    });
    await this.db.update(financeProviderPayments).set({
      status: 'matched',
      invoiceId: invoice.id,
      paymentId,
      updatedAt: Date.now(),
    }).where(eq(financeProviderPayments.id, row.id));
    await this.deps.audit('finance.provider.matched', row.externalId, invoice.number);
    await this.deps.publishPaid({ paymentId, amountMinor: row.amountMinor, invoiceId: invoice.id });
    return { ok: true };
  }

  private async rejectProvider(providerPaymentId: number): Promise<{ error: string } | { ok: true }> {
    const refused = await this.refuseWrite();
    if (refused) return { error: refused };
    const schoolId = requireSchoolId(this.activeSchoolId);
    const row = await this.db
      .select()
      .from(financeProviderPayments)
      .where(and(eq(financeProviderPayments.schoolId, schoolId), eq(financeProviderPayments.id, providerPaymentId)))
      .get();
    if (!row || row.status !== 'unmatched') return { error: 'That payment is not waiting to be matched.' };
    await this.db.update(financeProviderPayments).set({ status: 'rejected', updatedAt: Date.now() }).where(eq(financeProviderPayments.id, row.id));
    await this.deps.audit('finance.provider.rejected', row.externalId, row.provider);
    return { ok: true };
  }

  private async saveCurrency(currency: string): Promise<{ error: string } | { ok: true }> {
    const refused = await this.refuseWrite();
    if (refused) return { error: refused };
    if (currency !== 'TZS' && currency !== 'KES' && currency !== 'UGX') {
      return { error: 'Choose TZS, KES, or UGX.' };
    }
    await this.deps.saveSetting('currency', currency);
    return { ok: true };
  }

  private async insertPayment(input: {
    schoolId: number;
    amountMinor: number;
    paidOn: string;
    method: string;
    reference: string;
    invoiceId: number;
    currency: string;
    studentId: number;
  }): Promise<number> {
    const now = Date.now();
    const created = await this.db.insert(financePayments).values({
      ...this.stamp(input.schoolId, now),
      amountMinor: input.amountMinor,
      paidOn: input.paidOn,
      method: input.method,
      reference: input.reference || null,
      kind: 'payment',
      reversesPaymentId: null,
      reason: null,
    }).returning({ id: financePayments.id });
    const paymentId = created[0]?.id ?? 0;
    await this.db.insert(financeAllocations).values({
      ...this.stamp(input.schoolId, now),
      paymentId,
      invoiceId: input.invoiceId,
      amountMinor: input.amountMinor,
    });
    const number = await this.nextNumber(input.schoolId, 'RCT', now);
    await this.db.insert(financeReceipts).values({
      ...this.stamp(input.schoolId, now),
      paymentId,
      number,
    });
    await this.deps.audit('finance.payment.recorded', number, input.reference);
    await this.tellGuardians(input.schoolId, input.studentId, number, formatMoney(input.amountMinor, input.currency, 'en'));
    return paymentId;
  }

  private async tellGuardians(schoolId: number, studentId: number, receiptNumber: string, amount: string) {
    const primary = await this.db
      .select({ userId: guardians.userId })
      .from(guardianStudents)
      .innerJoin(guardians, eq(guardians.id, guardianStudents.guardianId))
      .where(and(
        eq(guardianStudents.schoolId, schoolId),
        eq(guardianStudents.studentId, studentId),
        eq(guardianStudents.isPrimary, true),
      ));
    const linked = await this.db
      .select({ userId: studentGuardians.userId })
      .from(studentGuardians)
      .where(and(eq(studentGuardians.schoolId, schoolId), eq(studentGuardians.studentId, studentId)));
    const primaryIds = primary.flatMap((row) => row.userId == null ? [] : [row.userId]);
    const userIds = primaryIds.length > 0
      ? primaryIds
      : linked.flatMap((row) => row.userId == null ? [] : [row.userId]);
    for (const userId of [...new Set(userIds)]) {
      await this.deps.notify({
        userId,
        title: 'Receipt',
        body: `${receiptNumber} records a payment of ${amount}.`,
      });
    }
  }

  private async totals(schoolId: number, invoiceId: number): Promise<{ total: number; paid: number; outstanding: number }> {
    const lines = await this.db
      .select({ amountMinor: financeLines.amountMinor })
      .from(financeLines)
      .where(and(eq(financeLines.schoolId, schoolId), eq(financeLines.invoiceId, invoiceId)));
    const allocations = await this.db
      .select({ amountMinor: financeAllocations.amountMinor })
      .from(financeAllocations)
      .where(and(eq(financeAllocations.schoolId, schoolId), eq(financeAllocations.invoiceId, invoiceId)));
    const invoice = await this.ownedInvoice(schoolId, invoiceId);
    const total = lines.reduce((sum, line) => sum + line.amountMinor, 0);
    const paid = allocations.reduce((sum, row) => sum + row.amountMinor, 0);
    return {
      total,
      paid,
      outstanding: invoiceOutstanding({
        voided: invoice?.voided ?? false,
        lineAmounts: lines.map((line) => line.amountMinor),
        allocatedAmounts: allocations.map((row) => row.amountMinor),
      }),
    };
  }

  private async invoiceRows(schoolId: number): Promise<FinanceInvoiceLine[]> {
    const invoices = await this.db
      .select({
        id: financeInvoices.id,
        number: financeInvoices.number,
        studentId: financeInvoices.studentId,
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
        className: formClasses.name,
        termName: terms.name,
        currency: financeInvoices.currency,
        voided: financeInvoices.voided,
      })
      .from(financeInvoices)
      .innerJoin(students, eq(students.id, financeInvoices.studentId))
      .innerJoin(formClasses, eq(formClasses.id, financeInvoices.formClassId))
      .innerJoin(terms, eq(terms.id, financeInvoices.termId))
      .where(eq(financeInvoices.schoolId, schoolId))
      .orderBy(asc(financeInvoices.number));
    if (invoices.length === 0) return [];
    const ids = invoices.map((invoice) => invoice.id);
    const lines = await this.db.select({
      invoiceId: financeLines.invoiceId,
      amountMinor: financeLines.amountMinor,
    }).from(financeLines).where(inArray(financeLines.invoiceId, ids));
    const allocations = await this.db.select({
      invoiceId: financeAllocations.invoiceId,
      amountMinor: financeAllocations.amountMinor,
    }).from(financeAllocations).where(inArray(financeAllocations.invoiceId, ids));
    return invoices.map((invoice) => {
      const lineAmounts = lines.filter((line) => line.invoiceId === invoice.id).map((line) => line.amountMinor);
      const allocatedAmounts = allocations.filter((row) => row.invoiceId === invoice.id).map((row) => row.amountMinor);
      const total = lineAmounts.reduce((sum, amount) => sum + amount, 0);
      const outstanding = invoiceOutstanding({ voided: invoice.voided, lineAmounts, allocatedAmounts });
      return {
        id: invoice.id,
        number: invoice.number,
        studentId: invoice.studentId,
        studentName: [invoice.firstName, invoice.middleName, invoice.lastName].filter(Boolean).join(' '),
        className: invoice.className,
        termName: invoice.termName,
        status: displayedInvoiceStatus({ voided: invoice.voided, total, outstanding }),
        total,
        outstanding,
        currency: invoice.currency,
      };
    });
  }

  private async paymentRows(schoolId: number, invoiceId: number) {
    const allocations = await this.db
      .select({ paymentId: financeAllocations.paymentId })
      .from(financeAllocations)
      .where(and(eq(financeAllocations.schoolId, schoolId), eq(financeAllocations.invoiceId, invoiceId)));
    const ids = [...new Set(allocations.map((row) => row.paymentId))];
    if (ids.length === 0) return [];
    const payments = await this.db
      .select()
      .from(financePayments)
      .where(inArray(financePayments.id, ids));
    const reversals = await this.db
      .select({ reversesPaymentId: financePayments.reversesPaymentId })
      .from(financePayments)
      .where(eq(financePayments.schoolId, schoolId));
    const reversed = new Set(reversals.flatMap((row) => row.reversesPaymentId == null ? [] : [row.reversesPaymentId]));
    return payments
      .filter((payment) => payment.kind === 'payment')
      .map((payment) => ({
        id: payment.id,
        amountMinor: payment.amountMinor,
        method: payment.method,
        reference: payment.reference ?? '',
        paidOn: payment.paidOn,
        reversed: reversed.has(payment.id),
      }));
  }

  private async receiptRows(schoolId: number, paymentIds: number[]) {
    if (paymentIds.length === 0) return [];
    return this.db
      .select({ id: financeReceipts.id, number: financeReceipts.number })
      .from(financeReceipts)
      .where(and(eq(financeReceipts.schoolId, schoolId), inArray(financeReceipts.paymentId, paymentIds)));
  }

  private async itemRows(schoolId: number) {
    const rows = await this.db
      .select()
      .from(financeFeeItems)
      .where(eq(financeFeeItems.schoolId, schoolId))
      .orderBy(asc(financeFeeItems.name));
    return rows.map((row) => ({ id: row.id, name: row.name, code: row.code ?? '', active: row.active }));
  }

  private async classRows() {
    return this.db
      .select({ id: formClasses.id, name: formClasses.name })
      .from(formClasses)
      .orderBy(asc(formClasses.name));
  }

  private async studentRows(schoolId: number) {
    const rows = await this.db
      .select({
        id: students.id,
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
      })
      .from(students)
      .where(eq(students.schoolId, schoolId))
      .orderBy(asc(students.lastName));
    return rows.map((row) => ({
      id: row.id,
      name: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
    }));
  }

  private async termRows(schoolId: number) {
    return this.db
      .select({ id: terms.id, name: terms.name })
      .from(terms)
      .where(eq(terms.schoolId, schoolId))
      .orderBy(asc(terms.name));
  }

  private async structureRows(schoolId: number) {
    const rows = await this.db
      .select({
        itemName: financeFeeItems.name,
        className: formClasses.name,
        amountMinor: financeStructures.amountMinor,
        currency: financeStructures.currency,
      })
      .from(financeStructures)
      .innerJoin(financeFeeItems, eq(financeFeeItems.id, financeStructures.feeItemId))
      .innerJoin(formClasses, eq(formClasses.id, financeStructures.formClassId))
      .where(eq(financeStructures.schoolId, schoolId))
      .orderBy(asc(formClasses.name));
    return rows;
  }

  private async unmatchedRows(schoolId: number) {
    return this.db
      .select({
        id: financeProviderPayments.id,
        provider: financeProviderPayments.provider,
        externalId: financeProviderPayments.externalId,
        amountMinor: financeProviderPayments.amountMinor,
        currency: financeProviderPayments.currency,
      })
      .from(financeProviderPayments)
      .where(and(eq(financeProviderPayments.schoolId, schoolId), eq(financeProviderPayments.status, 'unmatched')));
  }

  private async ownedInvoice(schoolId: number, invoiceId: number) {
    return this.db
      .select()
      .from(financeInvoices)
      .where(and(eq(financeInvoices.schoolId, schoolId), eq(financeInvoices.id, invoiceId)))
      .get();
  }

  private async currency(): Promise<string> {
    const stored = await this.deps.setting('currency');
    return stored === 'KES' || stored === 'UGX' || stored === 'TZS' ? stored : 'TZS';
  }

  private async activeYear(schoolId: number) {
    return this.db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.status, 'active')))
      .get();
  }

  private async currentTerm(schoolId: number) {
    return this.db
      .select({ id: terms.id })
      .from(terms)
      .where(and(eq(terms.schoolId, schoolId), eq(terms.isCurrent, true)))
      .get();
  }

  private async nextNumber(schoolId: number, prefix: 'INV' | 'RCT', now: number): Promise<string> {
    const year = new Date(now).getFullYear();
    const taken = prefix === 'INV'
      ? (await this.db.select({ number: financeInvoices.number }).from(financeInvoices).where(eq(financeInvoices.schoolId, schoolId))).map((row) => row.number)
      : (await this.db.select({ number: financeReceipts.number }).from(financeReceipts).where(eq(financeReceipts.schoolId, schoolId))).map((row) => row.number);
    return nextDocumentNumber(prefix, year, taken);
  }

  private async allowedStudentIds(): Promise<Set<number> | null> {
    const scope = await this.deps.scope();
    if (scope.kind === 'school') return null;
    return new Set(scope.studentIds);
  }

  private async canSeeStudent(studentId: number): Promise<boolean> {
    const allowed = await this.allowedStudentIds();
    return allowed == null || allowed.has(studentId);
  }

  private async refuseWrite(): Promise<string | null> {
    if (await this.canWrite()) return null;
    return 'You do not have permission to change finance records.';
  }

  private stamp(schoolId: number, now: number) {
    return {
      schoolId,
      createdAt: now,
      updatedAt: now,
      createdBy: this.currentUserId,
    };
  }
}

function matchesFilter(invoice: FinanceInvoiceLine, query: URLSearchParams): boolean {
  const studentId = Number(query.get('studentId'));
  const className = query.get('className');
  const termId = query.get('termName');
  const status = query.get('status');
  if (studentId > 0 && invoice.studentId !== studentId) return false;
  if (className && className !== 'any' && invoice.className !== className) return false;
  if (termId && termId !== 'any' && invoice.termName !== termId) return false;
  if (status && status !== 'any' && invoice.status !== status) return false;
  return true;
}
