export type FinanceChoice = { id: number; name: string };

export type FinanceItem = { id: number; name: string; code: string; active: boolean };

export type FinanceStructureLine = {
  itemName: string;
  className: string;
  amountMinor: number;
  currency: string;
};

export type FinanceInvoiceLine = {
  id: number;
  number: string;
  studentId: number;
  studentName: string;
  className: string;
  termName: string;
  status: 'open' | 'paid' | 'void';
  total: number;
  outstanding: number;
  currency: string;
};

export type FinanceSummaryLine = {
  className: string;
  termName: string;
  expected: number;
  paid: number;
  outstanding: number;
  currency: string;
};

export type FinanceHome = {
  kind: 'home';
  canWrite: boolean;
  currency: string;
  items: FinanceItem[];
  classes: FinanceChoice[];
  students: FinanceChoice[];
  terms: FinanceChoice[];
  structures: FinanceStructureLine[];
  invoices: FinanceInvoiceLine[];
  summaries: FinanceSummaryLine[];
  unmatched: { id: number; provider: string; externalId: string; amountMinor: number; currency: string }[];
};

export type FinanceInvoicePage = {
  kind: 'invoice';
  canWrite: boolean;
  invoice: FinanceInvoiceLine;
  lines: { description: string; amountMinor: number }[];
  payments: { id: number; amountMinor: number; method: string; reference: string; paidOn: string; reversed: boolean }[];
  receipts: { id: number; number: string }[];
};

export type FinanceReceiptPage = {
  kind: 'receipt';
  number: string;
  studentName: string;
  paidOn: string;
  method: string;
  reference: string;
  amountMinor: number;
  currency: string;
  invoiceNumber: string;
};

export type FinancePage = FinanceHome | FinanceInvoicePage | FinanceReceiptPage | { kind: 'missing'; message: string };

const minorDigits: Record<string, number> = {
  TZS: 2,
  KES: 2,
  UGX: 0,
};

export function refusalToSaveFeeItem(name: string): string | null {
  if (name.trim().length === 0) {
    return 'Enter the fee item name.';
  }
  return null;
}

export function minorUnits(amount: string, currency: string): { amountMinor: number } | { error: string } {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return { error: 'Enter an amount.' };
  }
  const digits = minorDigits[currency] ?? 2;
  const [whole, fraction = ''] = trimmed.split('.');
  if (fraction.length > digits) {
    return { error: 'Enter an amount.' };
  }
  const scale = 10 ** digits;
  const amountMinor = Number(whole) * scale + Number(fraction.padEnd(digits, '0') || 0);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    return { error: 'Enter an amount.' };
  }
  return { amountMinor };
}

export function invoiceOutstanding(input: {
  voided: boolean;
  lineAmounts: readonly number[];
  allocatedAmounts: readonly number[];
}): number {
  if (input.voided) {
    return 0;
  }
  const total = input.lineAmounts.reduce((sum, amount) => sum + amount, 0);
  const paid = input.allocatedAmounts.reduce((sum, amount) => sum + amount, 0);
  return Math.max(0, total - paid);
}

export function displayedInvoiceStatus(input: {
  voided: boolean;
  total: number;
  outstanding: number;
}): 'void' | 'paid' | 'open' {
  if (input.voided) {
    return 'void';
  }
  if (input.total > 0 && input.outstanding === 0) {
    return 'paid';
  }
  return 'open';
}

export function refusalToVoidInvoice(input: { voided: boolean; allocated: number }): string | null {
  if (input.voided) {
    return 'This invoice is already void.';
  }
  if (input.allocated !== 0) {
    return 'Only an unpaid invoice can be voided.';
  }
  return null;
}

export function refusalToAllocate(amountMinor: number, outstanding: number): string | null {
  if (amountMinor <= 0) {
    return 'Enter an amount.';
  }
  if (amountMinor > outstanding) {
    return 'That payment is more than the invoice balance.';
  }
  return null;
}

export function refusalToReversePayment(input: { reversed: boolean; reason: string }): string | null {
  if (input.reversed) {
    return 'This payment has already been reversed.';
  }
  if (input.reason.trim().length === 0) {
    return 'Record why this payment is being reversed.';
  }
  return null;
}

export function nextDocumentNumber(prefix: string, year: number, taken: readonly string[]): string {
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let highest = 0;
  for (const value of taken) {
    const match = pattern.exec(value);
    if (match) {
      highest = Math.max(highest, Number(match[1]));
    }
  }
  return `${prefix}-${year}-${String(highest + 1).padStart(4, '0')}`;
}

export function summariseFees(rows: readonly {
  className: string;
  termName: string;
  expected: number;
  paid: number;
}[]): { className: string; termName: string; expected: number; paid: number; outstanding: number }[] {
  const grouped = new Map<string, { className: string; termName: string; expected: number; paid: number }>();
  for (const row of rows) {
    const key = `${row.className}\n${row.termName}`;
    const current = grouped.get(key) ?? { className: row.className, termName: row.termName, expected: 0, paid: 0 };
    current.expected += row.expected;
    current.paid += row.paid;
    grouped.set(key, current);
  }
  return [...grouped.values()].map((row) => ({
    ...row,
    outstanding: Math.max(0, row.expected - row.paid),
  }));
}

export function providerDecision(input: {
  existingPaymentId: number | null;
  invoiceFound: boolean;
}): 'duplicate' | 'matched' | 'unmatched' {
  if (input.existingPaymentId != null) {
    return 'duplicate';
  }
  return input.invoiceFound ? 'matched' : 'unmatched';
}
