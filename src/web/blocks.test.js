// node --test src/web/blocks.test.js
// What a pass is in words (blocks.js), against the server's rules (fitlink-app _shared/blocks.ts blockSale,
// _shared/season.ts datedBlockPayments, migration 20261025120000's CHECKs and guard sentences).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buyLabel, chargeLine, coachPolicyIntro, dayWords, editorKindLine, freeCancelLine, isDatedBlock, lastSignUpDay, listedOnPage,
  localInputToIso, isoToLocalInput, newPassRow, notOnSaleSentence, passKind, paymentsFor, planWriteError, priceLine, saleLine,
  saleState, scheduleLine, sessionCancelNote, sessionCardLine, sessionWhen, blockLastDay, BLOCK_DEFAULT_WEEKS,
  belowMinimum, saleCheck, timeZoneNote, lengthBreaksSignUpWindow, lengthWriteError, LENGTH_BREAKS_WINDOW,
} from './blocks.js';

const L = { locale: 'en-US', timeZone: 'America/New_York' };
const NOW = Date.UTC(2026, 9, 25, 15); // 2026-10-25 15:00 UTC
const at = (y, m, d, h = 15) => Date.UTC(y, m, d, h);
const winter = { id: 'w', name: 'Winter', kind: 'block', price: '640.00', period: 'month', duration_weeks: 8, starts_on: '2026-12-01' };

test('kinds: a session, else a block; a dated block has a length and a start', () => {
  assert.equal(passKind({ kind: 'session' }), 'session');
  assert.equal(passKind({ kind: 'block' }), 'block');
  assert.equal(passKind({}), 'block');
  assert.equal(isDatedBlock(winter), true);
  assert.equal(isDatedBlock({ ...winter, starts_on: null }), false);
  assert.equal(isDatedBlock({ ...winter, duration_weeks: null }), false);
  assert.equal(BLOCK_DEFAULT_WEEKS, 8);
});

test('sale window: 90 days before the start until the end of the last sign-up day (the server\'s blockSale)', () => {
  assert.equal(blockLastDay(winter), '2027-01-25');
  assert.equal(lastSignUpDay(winter), '2026-11-30');
  assert.equal(lastSignUpDay({ ...winter, enrollment_closes: '2026-12-20' }), '2026-12-20');
  // Opens Sep 2 (90 days before Dec 1) at 12:00 UTC.
  assert.deepEqual(saleState(winter, at(2026, 8, 2, 11)), { open: false, code: 'block_not_open', day: '2026-09-02' });
  assert.deepEqual(saleState(winter, at(2026, 8, 2, 12)), { open: true });
  // The last sign-up day (Nov 30) ends everywhere at Dec 1 12:00 UTC.
  assert.deepEqual(saleState(winter, at(2026, 11, 1, 11)), { open: true });
  assert.deepEqual(saleState(winter, at(2026, 11, 1, 12)), { open: false, code: 'block_closed', day: '2026-11-30' });
  // Joining in progress until enrollment_closes.
  assert.deepEqual(saleState({ ...winter, enrollment_closes: '2026-12-20' }, at(2026, 11, 15)), { open: true });
  // An undated block and an open pass are always on sale.
  assert.deepEqual(saleState({ ...winter, starts_on: null }, NOW), { open: true });
  assert.deepEqual(saleState({ kind: 'block', price: 20 }, NOW), { open: true });
  // A session until it starts; any time without a time.
  assert.deepEqual(saleState({ kind: 'session', session_at: '2026-12-03T23:00:00Z' }, NOW), { open: true });
  assert.deepEqual(saleState({ kind: 'session', session_at: '2026-10-25T14:00:00Z' }, NOW), { open: false, code: 'session_over', day: null });
  assert.deepEqual(saleState({ kind: 'session', session_at: null }, NOW), { open: true });
});

test('dates: a block day is the same calendar day everywhere; a year only when ~6 months away', () => {
  assert.equal(dayWords('2026-12-01', NOW, 'en-US'), 'Dec 1');
  assert.equal(dayWords('2027-01-05', NOW, 'en-US'), 'Jan 5');
  assert.equal(dayWords('2027-06-01', NOW, 'en-US'), 'Jun 1, 2027');
  assert.equal(dayWords('2026-12-01', NOW, 'en-GB'), '1 Dec');
  // A session's time names its zone: the coach and the athlete may read it in different ones.
  assert.equal(sessionWhen('2026-12-03T23:00:00Z', NOW, L), 'Thu, Dec 3, 6:00 PM EST');
  assert.equal(sessionWhen('2027-08-03T22:00:00Z', NOW, L), 'Tue, Aug 3, 2027, 6:00 PM EDT');
  assert.equal(sessionWhen('2026-12-03T23:00:00Z', NOW, { locale: 'en-US', timeZone: 'America/Los_Angeles' }), 'Thu, Dec 3, 3:00 PM PST');
  assert.equal(sessionWhen('2026-12-03T23:00:00Z', NOW, { locale: 'en-US', timeZone: 'UTC' }), 'Thu, Dec 3, 11:00 PM UTC');
  assert.equal(sessionWhen(null, NOW, L), null);
});

test('card lines: "Starts Dec 1 · 8 weeks", the price with its payments, a session with its time', () => {
  assert.equal(scheduleLine(winter, NOW, L), 'Starts Dec 1 · 8 weeks');
  assert.equal(scheduleLine(winter, at(2026, 11, 10), L), 'Started Dec 1 · 8 weeks');
  assert.equal(scheduleLine({ ...winter, starts_on: null }, NOW, L), '8 weeks · starts when you join');
  assert.equal(scheduleLine({ kind: 'block', price: 20 }, NOW, L), null);
  // L6: a $640 8-week block sells as $320 / month × 2. (The page shows plans.price, the coach's per-payment price.)
  // The "in all" total only once create-subscription answered: a Model B booking fee is on top of plans.price.
  const l6 = { ...winter, price: '320.00' };
  assert.equal(priceLine(l6, { payments: paymentsFor(l6, NOW) }), '$320 / month · 2 payments');
  assert.equal(priceLine(l6, { payments: 2, serverTotal: true }), '$320 / month · 2 payments ($640 in all)');
  assert.equal(priceLine(l6, { payments: 2, total: { cents: 33200, bookingCents: 1200 }, serverTotal: true }), '$332 / month · 2 payments ($664 in all)');
  // Joined late: one payment.
  assert.equal(paymentsFor(l6, at(2026, 11, 29)), 1);
  assert.equal(priceLine(l6, { payments: paymentsFor(l6, at(2026, 11, 29)) }), '$320 · one payment · nothing renews');
  assert.equal(priceLine({ kind: 'block', price: 20, period: 'month' }, { payments: paymentsFor({ kind: 'block', price: 20 }, NOW) }), '$20 / month · renews until you cancel');
  assert.equal(priceLine({ kind: 'block', price: 0, duration_weeks: 8 }, { payments: 2 }), null);
  const s = { kind: 'session', name: 'PT', price: '40.00', period: 'month', session_at: '2026-12-03T23:00:00Z', session_minutes: 60 };
  assert.equal(scheduleLine(s, NOW, { ...L, first: 'Dana' }), 'Session · Thu, Dec 3, 6:00 PM EST · 60 min');
  assert.equal(sessionCardLine(s, NOW, { ...L, first: 'Dana' }), 'Session · Thu, Dec 3, 6:00 PM EST · 60 min · $40');
  assert.equal(sessionCardLine({ ...s, session_at: null }, NOW, { ...L, first: 'Dana' }), 'Session · Time arranged with Dana · 60 min · $40');
  assert.equal(sessionCardLine({ ...s, session_at: null, session_minutes: null }, NOW, { ...L, first: 'Dana' }), 'Session · Time arranged with Dana · $40');
  assert.equal(paymentsFor(s, NOW), 1);
  assert.equal(priceLine(s, { payments: 1 }), '$40 · one payment · nothing renews');
  assert.equal(buyLabel(s), 'Book this session');
  assert.equal(buyLabel(winter), 'Join the block');
  assert.equal(buyLabel({ kind: 'block', name: 'Monthly', price: 20 }), 'Buy Monthly');
});

test('paymentsFor: create-subscription\'s seasonPayments wins once it answered', () => {
  const l6 = { ...winter, price: '320.00' };
  assert.equal(paymentsFor(l6, NOW), 2);
  for (const n of [1, 2, 3]) assert.equal(paymentsFor(l6, NOW, { seasonPayments: n }), n);
  assert.equal(paymentsFor(l6, NOW, { seasonPayments: 0 }), 2);
  assert.equal(paymentsFor(l6, NOW, { seasonPayments: 'x' }), 2);
  assert.equal(paymentsFor({ kind: 'block', price: 50, duration_weeks: 12 }, NOW), 3);
  assert.equal(paymentsFor({ kind: 'block', price: 50 }, NOW), null);
});

test('charge lines under the card form', () => {
  const l6 = { ...winter, price: '320.00' };
  assert.equal(chargeLine(l6, { nowMs: NOW, payments: 2 }), '$320 today, then monthly from one month after the block starts: 2 payments in all. Billing stops after the block.');
  assert.equal(chargeLine(l6, { nowMs: at(2026, 11, 10), payments: 2 }), '$320 today, then monthly: 2 payments in all. Billing stops after the block.');
  assert.equal(chargeLine(l6, { nowMs: NOW, payments: 3 }), '$320 today, then monthly from one month after the block starts: 3 payments in all. Billing stops after the block.');
  assert.equal(chargeLine(l6, { nowMs: NOW, payments: 1 }), '$320 today. One payment for the block.');
  const s = { kind: 'session', price: '40.00', session_at: '2026-12-03T23:00:00Z' };
  assert.equal(chargeLine(s, { nowMs: NOW, payments: 1 }), '$40 today. One payment for this session.');
  // Model B: the server's total, the booking fee inside it.
  assert.equal(chargeLine(s, { nowMs: NOW, payments: 1, total: { cents: 4400, bookingCents: 400 } }), '$44 (includes a $4 booking fee) today. One payment for this session.');
  assert.equal(chargeLine(l6, { nowMs: NOW, payments: 2, total: { cents: 33200, bookingCents: 1200 } }), '$332 (includes a $12 booking fee) today, then monthly from one month after the block starts: 2 payments in all. Billing stops after the block.');
  assert.equal(chargeLine({ kind: 'block', price: 20, period: 'month' }, { nowMs: NOW, payments: null }), 'Charged today, then every month until you cancel.');
});

test('not on sale: shown, not buyable, with the day; a started session is not listed', () => {
  assert.equal(saleLine(winter, at(2026, 7, 1), 'en-US'), 'On sale from Sep 2');
  assert.equal(saleLine(winter, at(2026, 11, 5), 'en-US'), 'Sign-ups closed Nov 30');
  assert.equal(saleLine(winter, NOW, 'en-US'), 'Sign-ups close Nov 30');
  assert.equal(saleLine({ ...winter, starts_on: null }, NOW, 'en-US'), null);
  assert.equal(notOnSaleSentence(winter, at(2026, 7, 1), 'en-US'), 'Sign-ups for Winter open on Sep 2.');
  assert.equal(notOnSaleSentence(winter, at(2026, 11, 5), 'en-US'), 'Sign-ups for Winter closed on Nov 30.');
  assert.equal(notOnSaleSentence(winter, NOW, 'en-US'), null);
  const past = { kind: 'session', name: 'PT', session_at: '2026-10-24T14:00:00Z' };
  assert.equal(notOnSaleSentence(past, NOW), 'PT has already started, so it can’t be booked. Pick another time with the coach.');
  assert.equal(listedOnPage(past, NOW), false);
  assert.equal(listedOnPage(winter, at(2026, 11, 5)), true);
  assert.equal(listedOnPage(winter, at(2026, 7, 1)), true);
});

test('the cancellation words: the platform rule from the config, the coach\'s own policy', () => {
  assert.equal(freeCancelLine(), 'Cancel up to 24 hours before for a full refund.');
  assert.equal(coachPolicyIntro('Dana', 'No refunds inside 24 hours.'), 'Inside 24 hours, or for a session with no time set, Dana’s own cancellation policy applies:');
  assert.match(coachPolicyIntro('Dana', '  '), /Dana hasn’t written one here yet, so ask them before you book\.$/);
  assert.equal(sessionCancelNote({ kind: 'session', session_at: '2026-12-03T23:00:00Z' }, 'Dana'), 'Cancel up to 24 hours before for a full refund. Cancel in the FitLink app; inside 24 hours Dana’s own policy applies (it’s on this page).');
  assert.match(sessionCancelNote({ kind: 'session', session_at: null }, 'Dana'), /^No time is set yet: you arrange it with Dana/);
  assert.equal(sessionCancelNote(winter, 'Dana'), null);
});

test('a new pass row: only what the kind allows, the $25 minimum, the default length', () => {
  const U = 'u1';
  assert.deepEqual(newPassRow({ kind: 'block', name: ' Winter ', price: '320', weeks: 8, startsOn: '2026-12-01', enrollmentCloses: '' }, U),
    { row: { trainer_id: U, name: 'Winter', price: 320, period: 'month', kind: 'block', duration_weeks: 8, starts_on: '2026-12-01', enrollment_closes: null } });
  assert.deepEqual(newPassRow({ kind: 'block', name: 'Anytime', price: 99.5, weeks: 12, startsOn: '' }, U).row,
    { trainer_id: U, name: 'Anytime', price: 99.5, period: 'month', kind: 'block', duration_weeks: 12, starts_on: null, enrollment_closes: null });
  assert.equal(newPassRow({ kind: 'block', name: 'W', price: 24.99, weeks: 8 }, U).error, 'A pass costs at least $25 per payment.');
  assert.equal(newPassRow({ kind: 'block', name: '', price: 30, weeks: 8 }, U).error, 'Give the pass a name.');
  assert.equal(newPassRow({ kind: 'block', name: 'W', price: 30, weeks: 0 }, U).error, 'A block lasts 1 to 520 whole weeks.');
  assert.equal(newPassRow({ kind: 'block', name: 'W', price: 30, weeks: 8, enrollmentCloses: '2026-12-01' }, U).error, 'A last sign-up day needs a start date.');
  assert.equal(newPassRow({ kind: 'block', name: 'W', price: 30, weeks: 8, startsOn: '2026-12-01', enrollmentCloses: '2027-01-26' }, U).error, 'The last sign-up day must fall on or before the block’s last day.');
  assert.equal(newPassRow({ kind: 'block', name: 'W', price: 30, weeks: 8, startsOn: '2026-12-01', enrollmentCloses: '2027-01-25' }, U).row.enrollment_closes, '2027-01-25');
  assert.equal(newPassRow({ kind: 'block', name: 'W', price: 30, weeks: 8, startsOn: '2026-02-30' }, U).error, 'Pick a real start date.');
  const sess = newPassRow({ kind: 'session', name: 'PT', price: '40', sessionAt: '2026-12-03T18:00', minutes: 60, weeks: 8, startsOn: '2026-12-01', timeZone: 'America/New_York' }, U).row;
  assert.deepEqual(Object.keys(sess).sort(), ['kind', 'name', 'period', 'price', 'session_at', 'session_minutes', 'trainer_id']);
  assert.equal(sess.session_at, '2026-12-03T23:00:00.000Z');
  assert.equal(newPassRow({ kind: 'session', name: 'PT', price: '40', sessionAt: '2026-12-03T18:00', minutes: 60, timeZone: 'Asia/Tokyo' }, U).row.session_at, '2026-12-03T09:00:00.000Z');
  assert.equal(newPassRow({ kind: 'session', name: 'PT', price: 40, sessionAt: '', minutes: 45 }, U).row.session_at, null);
  assert.equal(newPassRow({ kind: 'session', name: 'PT', price: 40, sessionAt: '', minutes: 4 }, U).error, 'A session lasts 5 to 720 minutes.');
  assert.equal(newPassRow({ kind: 'session', name: 'PT', price: 40, sessionAt: 'soon', minutes: 60 }, U).error, 'Pick a date and time for the session, or leave it empty to arrange it with each athlete.');
});

test('datetime-local values are read and written in a named zone, whatever the machine\'s own', () => {
  const NY = 'America/New_York';
  assert.equal(localInputToIso('2026-12-03T18:00', NY), '2026-12-03T23:00:00.000Z');
  assert.equal(localInputToIso('2026-07-03T18:00', NY), '2026-07-03T22:00:00.000Z');
  assert.equal(localInputToIso('2026-12-03T18:00', 'America/Los_Angeles'), '2026-12-04T02:00:00.000Z');
  assert.equal(localInputToIso('2026-12-03T18:00', 'Pacific/Kiritimati'), '2026-12-03T04:00:00.000Z');
  assert.equal(localInputToIso('2026-12-03T18:00', 'UTC'), '2026-12-03T18:00:00.000Z');
  // 2:30 on a spring-forward night does not exist: an hour later on the wall (3:30 EDT), as browsers do.
  assert.equal(localInputToIso('2027-03-14T02:30', NY), '2027-03-14T07:30:00.000Z');
  // 1:30 on the fall-back night happens twice: the first (EDT).
  assert.equal(localInputToIso('2026-11-01T01:30', NY), '2026-11-01T05:30:00.000Z');
  assert.equal(isoToLocalInput('2026-12-03T23:00:00Z', NY), '2026-12-03T18:00');
  assert.equal(isoToLocalInput('2026-12-03T23:00:00Z', 'Asia/Tokyo'), '2026-12-04T08:00');
  assert.equal(isoToLocalInput('2026-12-03T23:00:00Z', 'Pacific/Kiritimati'), '2026-12-04T13:00');
  assert.equal(localInputToIso('2026-12-03 18:00', NY), null);
  assert.equal(localInputToIso('2026-02-30T18:00', NY), null);
  assert.equal(isoToLocalInput(null, NY), '');
  assert.equal(timeZoneNote(NY, Date.UTC(2026, 11, 3), 'en-US'), 'Times are in America/New_York (EST).');
  assert.equal(timeZoneNote(NY, Date.UTC(2026, 6, 3), 'en-US'), 'Times are in America/New_York (EDT).');
  assert.equal(timeZoneNote('UTC', NOW, 'en-US'), 'Times are in UTC.');
  assert.equal(timeZoneNote(null), 'Times are in this device’s time zone.');
});

test('a pass under the minimum charge is not for sale (live has $1, $5 and $20 passes)', () => {
  for (const price of ['1.00', 5, '20.00', '24.99']) assert.equal(belowMinimum({ price }), true, String(price));
  for (const price of ['25.00', 320, null, 0]) assert.equal(belowMinimum({ price }), false, String(price));
  const twenty = { kind: 'block', name: 'Monthly', price: '20.00' };
  assert.deepEqual(saleCheck(twenty, NOW, { first: 'Dana' }), { ok: false, code: 'below_minimum', sentence: 'Monthly is no longer on sale. Ask Dana.' });
  assert.deepEqual(saleCheck({ ...twenty, price: 0 }, NOW, { first: 'Dana' }), { ok: false, code: 'plan_unpriced', sentence: 'This pass has no price set, so it can’t be bought yet. Ask Dana to set one.' });
  assert.deepEqual(saleCheck({ ...winter, price: '320.00' }, at(2026, 11, 5), { first: 'Dana', locale: 'en-US' }), { ok: false, code: 'block_closed', sentence: 'Sign-ups for Winter closed on Nov 30.' });
  assert.deepEqual(saleCheck({ ...winter, price: '320.00' }, NOW, { first: 'Dana' }), { ok: true });
  assert.deepEqual(saleCheck({ ...twenty, price: '25.00' }, NOW), { ok: true });
});

test('the server\'s refusals in words: the HINT sentence first', () => {
  const held = { code: '23514', message: 'session_held', hint: 'An athlete booked this session, so its time can\'t be cleared or moved into the past. Move it to a later time, or ask them to cancel.' };
  assert.equal(planWriteError(held), held.hint);
  assert.equal(planWriteError({ code: '23514', message: 'block_has_holders', hint: 'Athletes already hold this block, so its start date stays. Make a new block for another date.' }), 'Athletes already hold this block, so its start date stays. Make a new block for another date.');
  assert.equal(planWriteError({ code: '23514', message: 'kind_fixed' }), 'A pass stays a block or a single session. Make a new pass instead.');
  assert.equal(planWriteError({ code: '23514', message: 'below_minimum', hint: 'A pass costs at least $25.00 per payment.' }), 'A pass costs at least $25.00 per payment.');
  assert.equal(planWriteError({ code: 'PGRST204', message: 'Could not find the \'kind\' column' }), 'Blocks and single sessions aren’t available on the server yet. Nothing was saved.');
  assert.equal(planWriteError({ code: '23514', message: 'new row for relation "plans" violates check constraint "plans_enrollment_closes_window"' }), 'The last sign-up day must fall on or before the block’s last day, and needs a start date.');
  assert.equal(planWriteError({ code: '23514', message: 'new row for relation "trainers" violates check constraint "trainers_cancellation_policy_len"' }), 'Keep the policy to 600 characters.');
  assert.equal(planWriteError(null), null);
});

test('a shorter dated block whose last sign-up day would fall after its new end', () => {
  const w = { ...winter, enrollment_closes: '2027-01-15' };   // 8 weeks from Dec 1: last day Jan 25
  assert.equal(lengthBreaksSignUpWindow(w, 6), 'The last sign-up day is after the new end. Move it first (Edit dates).');   // 6 weeks: last day Jan 11
  assert.equal(lengthBreaksSignUpWindow(w, 5), LENGTH_BREAKS_WINDOW);
  assert.equal(lengthBreaksSignUpWindow(w, 7), null);   // last day Jan 18
  assert.equal(lengthBreaksSignUpWindow(winter, 2), null);   // no last sign-up day: it is the day before the start
  assert.equal(lengthBreaksSignUpWindow({ ...w, starts_on: null }, 2), null);
  const refused = { code: '23514', message: 'new row for relation "plans" violates check constraint "plans_enrollment_closes_window"' };
  assert.equal(lengthWriteError(refused), 'The last sign-up day is after the new end. Move it first (Edit dates).');
  assert.equal(lengthWriteError({ code: '42501', message: 'permission denied' }), 'Not allowed: this isn’t yours to change.');
});

test('the editor\'s kind line', () => {
  assert.equal(editorKindLine(winter, NOW, 'en-US'), 'Block · starts Dec 1 · 8 weeks · Sign-ups close Nov 30');
  assert.equal(editorKindLine(winter, at(2026, 11, 10), 'en-US'), 'Block · started Dec 1 · 8 weeks · Sign-ups closed Nov 30');
  assert.equal(editorKindLine(winter, at(2026, 7, 1), 'en-US'), 'Block · starts Dec 1 · 8 weeks · On sale from Sep 2');
  assert.equal(editorKindLine({ ...winter, starts_on: null }, NOW, 'en-US'), 'Block · starts when each athlete joins · 8 weeks');
  assert.equal(editorKindLine({ kind: 'block' }, NOW), 'Open pass · renews until the athlete cancels');
  assert.match(editorKindLine({ kind: 'session', session_at: null, session_minutes: 60 }, NOW), /^Session · time arranged with each athlete · 60 min$/);
});
