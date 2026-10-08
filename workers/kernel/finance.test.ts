import assert from 'node:assert/strict';
import test from 'node:test';
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
} from './finance.ts';

test('MOD-FIN-01 a fee item needs a name', () => {
  assert.equal(refusalToSaveFeeItem(''), 'Enter the fee item name.');
  assert.equal(refusalToSaveFeeItem('Term fees'), null);
});

test('MOD-FIN-02 an amount is stored in minor units', () => {
  assert.deepEqual(minorUnits('50000', 'TZS'), { amountMinor: 5_000_000 });
  assert.deepEqual(minorUnits('10.5', 'TZS'), { amountMinor: 1_050 });
  assert.deepEqual(minorUnits('abc', 'TZS'), { error: 'Enter an amount.' });
});

test('MOD-FIN-03 and MOD-FIN-04 a balance is invoices minus allocations', () => {
  const outstanding = invoiceOutstanding({
    voided: false,
    lineAmounts: [5_000_000, 1_000_000],
    allocatedAmounts: [2_000_000],
  });
  assert.equal(outstanding, 4_000_000);
  assert.equal(displayedInvoiceStatus({ voided: false, total: 6_000_000, outstanding }), 'open');
  assert.equal(displayedInvoiceStatus({ voided: false, total: 6_000_000, outstanding: 0 }), 'paid');
  assert.equal(refusalToAllocate(7_000_000, outstanding), 'That payment is more than the invoice balance.');
  assert.equal(refusalToVoidInvoice({ voided: false, allocated: 2_000_000 }), 'Only an unpaid invoice can be voided.');
  assert.equal(refusalToVoidInvoice({ voided: false, allocated: 0 }), null);
});

test('MOD-FIN-05 a receipt number continues the sequence', () => {
  assert.equal(nextDocumentNumber('RCT', 2026, []), 'RCT-2026-0001');
  assert.equal(nextDocumentNumber('RCT', 2026, ['RCT-2026-0001']), 'RCT-2026-0002');
});

test('MOD-FIN-06 class totals keep expected, paid, and outstanding apart', () => {
  assert.deepEqual(summariseFees([
    { className: '1A', termName: 'Term 1', expected: 5_000_000, paid: 2_000_000 },
    { className: '1A', termName: 'Term 1', expected: 1_000_000, paid: 0 },
  ]), [{ className: '1A', termName: 'Term 1', expected: 6_000_000, paid: 2_000_000, outstanding: 4_000_000 }]);
});

test('MOD-FIN-07 a repeated provider reference is the same payment', () => {
  assert.equal(providerDecision({ existingPaymentId: 4, invoiceFound: true }), 'duplicate');
  assert.equal(providerDecision({ existingPaymentId: null, invoiceFound: true }), 'matched');
  assert.equal(providerDecision({ existingPaymentId: null, invoiceFound: false }), 'unmatched');
});

test('MOD-FIN-09 a payment is reversed only with a reason', () => {
  assert.equal(
    refusalToReversePayment({ reversed: false, reason: '' }),
    'Record why this payment is being reversed.',
  );
  assert.equal(
    refusalToReversePayment({ reversed: true, reason: 'Wrong amount' }),
    'This payment has already been reversed.',
  );
  assert.equal(refusalToReversePayment({ reversed: false, reason: 'Wrong amount' }), null);
});
