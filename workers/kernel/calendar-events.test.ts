import assert from 'node:assert/strict';
import test from 'node:test';
import { refusalToEditCancelledEvent, upcomingEventLines } from './calendar-events.ts';

test('MOD-CAL-02 a parent notice names the event and its date', () => {
  const title = 'Parents meeting';
  const eventDate = '2026-10-20';
  assert.equal(`${title} is on ${eventDate}.`, 'Parents meeting is on 2026-10-20.');
});

test('MOD-CAL-03 the dashboard lists upcoming events', () => {
  assert.deepEqual(upcomingEventLines([
    { title: 'Parents meeting', eventDate: '2026-10-20', eventType: 'meeting', status: 'scheduled' },
  ], '2026-10-08'), ['2026-10-20: Parents meeting (meeting)']);
});

test('MOD-CAL-01 upcoming events keep their date and a cancelled event stays put', () => {
  assert.deepEqual(upcomingEventLines([
    { title: 'Old meeting', eventDate: '2026-09-01', eventType: 'meeting', status: 'scheduled' },
    { title: 'Parents meeting', eventDate: '2026-10-20', eventType: 'meeting', status: 'scheduled' },
    { title: 'Sports day', eventDate: '2026-11-02', eventType: 'other', status: 'cancelled' },
  ], '2026-10-08'), ['2026-10-20: Parents meeting (meeting)']);
  assert.equal(refusalToEditCancelledEvent('cancelled'), 'That event is cancelled.');
  assert.equal(refusalToEditCancelledEvent('scheduled'), null);
});
