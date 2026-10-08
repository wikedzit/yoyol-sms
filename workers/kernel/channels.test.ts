import assert from 'node:assert/strict';
import test from 'node:test';
import {
  absenceNotice,
  deliveryReceipt,
  feeReminderNotice,
  preferredLanguage,
  refusalToQueueChannel,
} from './channels.ts';

test('PLG-01 an SMS is recorded only with a sender and a phone number', () => {
  assert.equal(
    refusalToQueueChannel({ channel: 'sms', sender: '', recipient: '255712000111' }),
    'Set the SMS sender before a message can be recorded.',
  );
  assert.equal(
    refusalToQueueChannel({ channel: 'sms', sender: 'RIVERSIDE', recipient: '12' }),
    'Enter a phone number.',
  );
  assert.equal(
    refusalToQueueChannel({ channel: 'sms', sender: 'RIVERSIDE', recipient: '255712000111' }),
    null,
  );
  assert.equal(
    deliveryReceipt('sms', '').detail,
    'No SMS gateway is configured, so this message was not sent.',
  );
  assert.match(deliveryReceipt('sms', 'https://sms.example').detail, /does not place the call/);
});

test('PLG-02 an email is recorded only with a sender and an email address', () => {
  assert.equal(
    refusalToQueueChannel({ channel: 'email', sender: '', recipient: 'neema@riverside.test' }),
    'Set the email sender before a message can be recorded.',
  );
  assert.equal(
    refusalToQueueChannel({ channel: 'email', sender: 'fees@riverside.test', recipient: 'not-an-email' }),
    'Enter an email address.',
  );
  assert.equal(
    refusalToQueueChannel({ channel: 'email', sender: 'fees@riverside.test', recipient: 'neema@riverside.test' }),
    null,
  );
  assert.equal(
    deliveryReceipt('email', '').detail,
    'No email gateway is configured, so this message was not sent.',
  );
});

test('PLG-04 an absence notice follows the guardian language', () => {
  assert.equal(preferredLanguage('sw'), 'sw');
  assert.equal(preferredLanguage('en'), 'en');
  assert.equal(preferredLanguage(null), 'en');
  assert.deepEqual(absenceNotice({
    studentName: 'Amina Juma Hassan',
    date: '2026-10-08',
    language: 'en',
  }), {
    title: 'Absent',
    body: 'Amina Juma Hassan was marked absent on 2026-10-08.',
  });
  assert.deepEqual(absenceNotice({
    studentName: 'Amina Juma Hassan',
    date: '2026-10-08',
    language: 'sw',
  }), {
    title: 'Hayupo',
    body: 'Amina Juma Hassan hakuwepo tarehe 2026-10-08.',
  });
});

test('PLG-05 a fee reminder names the outstanding amount', () => {
  assert.deepEqual(feeReminderNotice({
    studentName: 'Amina Juma Hassan',
    amount: 'TZS 45,000.00',
    language: 'en',
  }), {
    title: 'Fee reminder',
    body: 'Amina Juma Hassan has TZS 45,000.00 still to pay.',
  });
  assert.equal(
    feeReminderNotice({ studentName: 'Amina', amount: 'TZS 45,000.00', language: 'sw' }).title,
    'Kumbusho la ada',
  );
});
