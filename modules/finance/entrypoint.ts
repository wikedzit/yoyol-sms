import { defineModule } from '../../workers/kernel/sdk';
import { formatMoney } from '../../workers/kernel/locale-format';
import { view } from '../../workers/kernel/view-document';
import type {
  FinanceHome,
  FinanceInvoicePage,
  FinanceReceiptPage,
} from '../../workers/kernel/finance';
import source from './yoyol.extension.json';

const finance = defineModule({
  manifest: source,
  async handlePage(request, context) {
    const page = await context.finance?.open(request.path, request.search ?? '');
    if (!page || page.kind === 'missing') {
      return view.page('finance.title', [{ type: 'text', value: page?.message ?? 'finance.invoicesEmpty' }]);
    }
    if (page.kind === 'invoice') return invoiceDocument(page);
    if (page.kind === 'receipt') return receiptDocument(page);
    return homeDocument(page);
  },
  async handleAction(_name, fields, context) {
    return context.finance?.save(fields) ?? { error: 'Finance is not available.' };
  },
  async handleEvent(event, context) {
    if (event.name !== 'students.student.enrolled') return;
    const payload = event.payload as { studentId?: number; formClassId?: number; academicYearId?: number };
    if (!payload.studentId || !payload.formClassId || !payload.academicYearId) return;
    await context.finance?.onEnrolled({
      studentId: payload.studentId,
      formClassId: payload.formClassId,
      academicYearId: payload.academicYearId,
    });
  },
  async runHook(name, payload, context) {
    if (name !== 'student.profile.tabs') return null;
    const rawId = payload && typeof payload === 'object' && 'studentId' in payload ? payload.studentId : null;
    const studentId = typeof rawId === 'number' && Number.isInteger(rawId) && rawId > 0 ? rawId : null;
    const lines = await context.finance?.profileLines(studentId) ?? [];
    return {
      label: 'finance.profile',
      document: view.page('finance.profile', lines.length === 0
        ? [view.text('finance.profileEmpty')]
        : lines.map((line) => ({ type: 'text' as const, value: line }))),
    };
  },
});

function money(amountMinor: number, currency: string): string {
  return formatMoney(amountMinor, currency, 'en');
}

function homeDocument(page: FinanceHome) {
  const body: Record<string, unknown>[] = [
    view.text('finance.description'),
    {
      type: 'section',
      heading: { t: 'finance.items' },
      body: page.items.length === 0
        ? [view.text('finance.itemsEmpty')]
        : page.items.flatMap((item) => [
          { type: 'text', value: `${item.name}${item.code ? ` (${item.code})` : ''}${item.active ? '' : ', inactive'}` },
          ...(page.canWrite && item.active ? [{
            type: 'button',
            label: { t: 'finance.deactivate' },
            action: 'deactivate-item',
            values: { itemId: String(item.id) },
          }] : []),
        ]),
    },
  ];
  if (page.canWrite) {
    body.push({
      type: 'form',
      action: 'fee-item',
      method: 'post',
      submitLabel: { t: 'finance.saveItem' },
      fields: [
        { name: 'name', kind: 'text', label: { t: 'finance.itemName' } },
        { name: 'code', kind: 'text', label: { t: 'finance.itemCode' } },
      ],
    });
    body.push(structureForm(page));
    body.push({
      type: 'button',
      label: { t: 'finance.createInvoices' },
      action: 'bulk',
    });
  }
  body.push({
    type: 'section',
    heading: { t: 'finance.structures' },
    body: page.structures.length === 0
      ? [view.text('finance.structuresEmpty')]
      : page.structures.map((row) => ({
        type: 'text',
        value: `${row.className}, ${row.itemName}: ${money(row.amountMinor, row.currency)}`,
      })),
  });
  body.push(filterForm(page));
  body.push({
    type: 'section',
    heading: { t: 'finance.invoices' },
    body: page.invoices.length === 0
      ? [view.text('finance.invoicesEmpty')]
      : page.invoices.map((invoice) => ({
        type: 'link',
        label: `${invoice.number}, ${invoice.studentName}, ${invoice.className}, ${invoice.termName}, ${invoice.status}, ${money(invoice.outstanding, invoice.currency)} outstanding`,
        href: `/x/finance/invoice/${invoice.id}`,
      })),
  });
  body.push({
    type: 'section',
    heading: { t: 'finance.summary' },
    body: page.summaries.length === 0
      ? [view.text('finance.summaryEmpty')]
      : page.summaries.map((row) => ({
        type: 'text',
        value: `${row.className}, ${row.termName}: expected ${money(row.expected, row.currency)}, paid ${money(row.paid, row.currency)}, outstanding ${money(row.outstanding, row.currency)}`,
      })),
  });
  if (page.canWrite) {
    body.push(providerForm(page));
    body.push({
      type: 'section',
      heading: { t: 'finance.unmatched' },
      body: page.unmatched.length === 0
        ? [view.text('finance.unmatchedEmpty')]
        : page.unmatched.flatMap((row) => [
          { type: 'text', value: `${row.provider} ${row.externalId}: ${money(row.amountMinor, row.currency)}` },
          {
            type: 'form',
            action: 'match',
            method: 'post',
            submitLabel: { t: 'finance.match' },
            fields: [
              { name: 'providerPaymentId', kind: 'hidden', value: String(row.id) },
              {
                name: 'invoiceId',
                kind: 'select',
                label: { t: 'finance.invoice' },
                options: page.invoices.filter((invoice) => invoice.status === 'open').map((invoice) => ({
                  value: String(invoice.id),
                  label: invoice.number,
                })),
              },
            ],
          },
          {
            type: 'button',
            label: { t: 'finance.reject' },
            action: 'reject',
            values: { providerPaymentId: String(row.id) },
          },
        ]),
    });
    body.push({
      type: 'form',
      action: 'currency',
      method: 'post',
      submitLabel: { t: 'finance.saveSettings' },
      fields: [{
        name: 'currency',
        kind: 'select',
        label: { t: 'finance.currency' },
        value: page.currency,
        options: ['TZS', 'KES', 'UGX'].map((currency) => ({ value: currency, label: currency })),
      }],
    });
  }
  return view.page('finance.title', body);
}

function structureForm(page: FinanceHome) {
  const activeItems = page.items.filter((item) => item.active);
  return {
    type: 'form',
    action: 'structure',
    method: 'post',
    submitLabel: { t: 'finance.saveStructure' },
    fields: [
      {
        name: 'feeItemId',
        kind: 'select',
        label: { t: 'finance.itemName' },
        options: activeItems.map((item) => ({ value: String(item.id), label: item.name })),
      },
      {
        name: 'formClassId',
        kind: 'select',
        label: { t: 'finance.class' },
        options: page.classes.map((formClass) => ({ value: String(formClass.id), label: formClass.name })),
      },
      { name: 'amount', kind: 'text', label: { t: 'finance.amount' } },
    ],
  };
}

function filterForm(page: FinanceHome) {
  return {
    type: 'form',
    action: '/x/finance',
    method: 'get',
    submitLabel: { t: 'finance.filter' },
    fields: [
      {
        name: 'className',
        kind: 'select',
        label: { t: 'finance.class' },
        options: [{ value: 'any', label: { t: 'finance.any' } }, ...page.classes.map((formClass) => ({
          value: formClass.name,
          label: formClass.name,
        }))],
      },
      {
        name: 'studentId',
        kind: 'select',
        label: { t: 'finance.student' },
        options: [{ value: '0', label: { t: 'finance.any' } }, ...page.students.map((student) => ({
          value: String(student.id),
          label: student.name,
        }))],
      },
      {
        name: 'termName',
        kind: 'select',
        label: { t: 'finance.term' },
        options: [{ value: 'any', label: { t: 'finance.any' } }, ...page.terms.map((term) => ({
          value: term.name,
          label: term.name,
        }))],
      },
      {
        name: 'status',
        kind: 'select',
        label: { t: 'finance.status' },
        options: [
          { value: 'any', label: { t: 'finance.any' } },
          { value: 'open', label: 'open' },
          { value: 'paid', label: 'paid' },
          { value: 'void', label: 'void' },
        ],
      },
    ],
  };
}

function providerForm(page: FinanceHome) {
  return {
    type: 'form',
    action: 'provider',
    method: 'post',
    submitLabel: { t: 'finance.saveProvider' },
    fields: [
      { name: 'provider', kind: 'text', label: { t: 'finance.providerName' }, value: 'manual' },
      { name: 'externalId', kind: 'text', label: { t: 'finance.externalId' } },
      { name: 'amount', kind: 'text', label: { t: 'finance.amount' } },
      { name: 'paidOn', kind: 'date', label: { t: 'finance.date' } },
      {
        name: 'invoiceId',
        kind: 'select',
        label: { t: 'finance.invoice' },
        options: [{ value: '0', label: { t: 'finance.any' } }, ...page.invoices.map((invoice) => ({
          value: String(invoice.id),
          label: invoice.number,
        }))],
      },
    ],
  };
}

function invoiceDocument(page: FinanceInvoicePage) {
  const invoice = page.invoice;
  const body: Record<string, unknown>[] = [
    { type: 'link', label: { t: 'finance.title' }, href: '/x/finance' },
    {
      type: 'text',
      value: `${invoice.number}, ${invoice.studentName}, ${invoice.className}, ${invoice.termName}, ${invoice.status}, ${money(invoice.outstanding, invoice.currency)} outstanding`,
    },
    ...page.lines.map((line) => ({
      type: 'text',
      value: `${line.description}: ${money(line.amountMinor, invoice.currency)}`,
    })),
    ...page.receipts.map((receipt) => ({
      type: 'link',
      label: receipt.number,
      href: `/x/finance/receipt/${receipt.id}`,
    })),
  ];
  if (page.canWrite && invoice.status !== 'void') {
    body.push({
      type: 'form',
      action: 'charge',
      method: 'post',
      submitLabel: { t: 'finance.saveCharge' },
      fields: [
        { name: 'invoiceId', kind: 'hidden', value: String(invoice.id) },
        { name: 'description', kind: 'text', label: { t: 'finance.chargeName' } },
        { name: 'amount', kind: 'text', label: { t: 'finance.amount' } },
      ],
    });
    body.push({
      type: 'form',
      action: 'payment',
      method: 'post',
      submitLabel: { t: 'finance.savePayment' },
      fields: [
        { name: 'invoiceId', kind: 'hidden', value: String(invoice.id) },
        { name: 'amount', kind: 'text', label: { t: 'finance.amount' } },
        { name: 'paidOn', kind: 'date', label: { t: 'finance.date' } },
        {
          name: 'method',
          kind: 'select',
          label: { t: 'finance.method' },
          options: [
            { value: 'cash', label: { t: 'finance.cash' } },
            { value: 'bank', label: { t: 'finance.bank' } },
            { value: 'mobile', label: { t: 'finance.mobile' } },
          ],
        },
        { name: 'reference', kind: 'text', label: { t: 'finance.reference' } },
      ],
    });
    for (const payment of page.payments.filter((row) => !row.reversed)) {
      body.push({
        type: 'text',
        value: `${payment.paidOn} ${payment.method} ${payment.reference}: ${money(payment.amountMinor, invoice.currency)}`,
      });
      body.push({
        type: 'form',
        action: 'reverse',
        method: 'post',
        submitLabel: { t: 'finance.saveReverse' },
        fields: [
          { name: 'paymentId', kind: 'hidden', value: String(payment.id) },
          { name: 'reason', kind: 'text', label: { t: 'finance.reason' } },
        ],
      });
    }
    if (invoice.status === 'open' && invoice.outstanding === invoice.total) {
      body.push({
        type: 'button',
        label: { t: 'finance.void' },
        action: 'void',
        values: { invoiceId: String(invoice.id) },
      });
    }
  }
  return view.page('finance.invoice', body);
}

function receiptDocument(page: FinanceReceiptPage) {
  return view.page('finance.receipt', [
    { type: 'text', value: page.number },
    { type: 'text', value: `${page.studentName}, ${page.invoiceNumber}` },
    { type: 'text', value: `${page.paidOn}, ${page.method}, ${page.reference}` },
    { type: 'text', value: money(page.amountMinor, page.currency) },
    view.text('finance.receiptHint'),
  ]);
}

export default finance;
