// node --test src/web/founding.test.js — the /founding page's pure rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATHLETE_BANDS, FOUNDING_RETURN_TTL_MS, FOUNDING_SIGN_UP_DATA, PAY_METHODS, accountStep, answersFrom, applyRefusal, bookingUrl,
  checkAnswers, cleanInstagram, cleanPhone, cleanText, closesLabel, closesLabelLong, contactOnly, foundingPhase, foundingReturnValue,
  fullLine, isNewApplication, isOwnSession, parseSlots, readFoundingReturn, slotsLine, statusLine,
} from './founding.js';
import { FOUNDING_ATHLETE_ACCOUNT, FOUNDING_NOT_COACH_TITLE } from './appleAuth.js';
import {
  ELITE_FEE_PERCENT, FOUNDING_ENDS_AFTER_DAYS_WITHOUT_PAYMENT, FOUNDING_FEE_PERCENT, FREE_ROSTER_CAP, STANDARD_FEE_PERCENT,
} from './site/pricing.js';

test('the bands and pay methods are exactly what apply_founding accepts', () => {
  assert.deepEqual(ATHLETE_BANDS.map((b) => b.value), ['0', '1-4', '5-9', '10-24', '25+']);
  assert.deepEqual(PAY_METHODS.map((m) => m.value), ['venmo', 'zelle', 'cash', 'card', 'other']);
});

test('closes labels', () => {
  assert.equal(closesLabel('2026-12-31'), 'Dec 31');
  assert.equal(closesLabelLong('2026-12-31'), 'Dec 31, 2026');
  assert.equal(closesLabel('2026-13-01'), '');
  assert.equal(closesLabel('Dec 31'), '');
  assert.equal(closesLabel(null), '');
});

test('parseSlots takes only the server shape', () => {
  assert.deepEqual(parseSlots({ taken: 9, total: 15, closes_on: '2026-12-31', open: true }), { taken: 9, total: 15, closesOn: '2026-12-31', open: true });
  assert.equal(parseSlots(null), null);
  assert.equal(parseSlots([]), null);
  assert.equal(parseSlots({ taken: '9', total: 15, closes_on: '2026-12-31', open: true }), null);
  assert.equal(parseSlots({ taken: 9, total: 0, closes_on: '2026-12-31', open: true }), null);
  assert.equal(parseSlots({ taken: -1, total: 15, closes_on: '2026-12-31', open: true }), null);
  assert.equal(parseSlots({ taken: 9, total: 15, closes_on: 'soon', open: true }), null);
  assert.equal(parseSlots({ taken: 9, total: 15, closes_on: '2026-12-31', open: 'yes' }), null);
});

test('foundingPhase: nothing numeric while loading, no guess on a failure, closed beats full after the date', () => {
  const s = (taken, open, closesOn = '2026-12-31') => ({ taken, total: 15, closesOn, open });
  assert.equal(foundingPhase(undefined, '2026-10-25'), 'loading');
  assert.equal(foundingPhase(null, '2026-10-25'), 'unknown');
  assert.equal(foundingPhase(s(9, true), '2026-10-25'), 'open');
  assert.equal(foundingPhase(s(15, false), '2026-10-25'), 'full');
  assert.equal(foundingPhase(s(15, false), '2027-01-02'), 'closed');
  assert.equal(foundingPhase(s(3, false), '2026-12-31'), 'closed');
});

test('the counter says only the server numbers', () => {
  assert.equal(slotsLine({ taken: 9, total: 15 }), '9 of 15 taken');
  assert.equal(slotsLine({ taken: 0, total: 15 }), '0 of 15 taken');
  assert.equal(fullLine(15), 'All 15 spots are taken.');
});

test('bookingUrl: https with a host only, no credentials', () => {
  assert.equal(bookingUrl('https://cal.com/victor/founding'), 'https://cal.com/victor/founding');
  assert.equal(bookingUrl('  https://calendly.com/x  '), 'https://calendly.com/x');
  assert.equal(bookingUrl('http://cal.com/x'), null);
  assert.equal(bookingUrl('javascript:alert(1)'), null);
  assert.equal(bookingUrl('https://user:pw@cal.com/x'), null);
  assert.equal(bookingUrl('cal.com/x'), null);
  assert.equal(bookingUrl(''), null);
  assert.equal(bookingUrl(undefined), null);
});

test('instagram and phone are cleaned the server way', () => {
  assert.equal(cleanInstagram('@Jimmy.Lifts'), 'jimmy.lifts');
  assert.equal(cleanInstagram('https://www.instagram.com/jimmy_lifts/'), 'jimmy_lifts');
  assert.equal(cleanInstagram('  '), '');
  assert.equal(cleanInstagram('not a handle!'), null);
  assert.equal(cleanInstagram('a'.repeat(31)), null);
  assert.equal(cleanPhone('+1 (555) 123-4567'), '+15551234567');
  assert.equal(cleanPhone(''), '');
  assert.equal(cleanPhone('12ab'), null);
  assert.equal(cleanPhone('123'), null);
});

test('cleanText collapses and cuts like the server', () => {
  assert.equal(cleanText('  Jimmy \t Coach ', 80), 'Jimmy Coach');
  assert.equal(cleanText('x'.repeat(200), 80).length, 80);
});

test('checkAnswers names the field it refuses, and builds apply_founding params', () => {
  const ok = { name: 'Jimmy', sport: 'Powerlifting', band: '5-9', pay: ['venmo', 'cash', 'venmo', 'paypal'], instagram: '@jimmy', phone: '' };
  assert.deepEqual(checkAnswers(ok), {
    ok: true,
    params: { p_name: 'Jimmy', p_sport: 'Powerlifting', p_athlete_band: '5-9', p_pay_methods: ['venmo', 'cash'], p_instagram: 'jimmy', p_phone: null },
  });
  assert.equal(checkAnswers({ ...ok, name: '  ' }).field, 'name');
  assert.equal(checkAnswers({ ...ok, sport: '' }).field, 'sport');
  assert.equal(checkAnswers({ ...ok, band: '6' }).field, 'band');
  assert.equal(checkAnswers({ ...ok, pay: [] }).field, 'pay');
  assert.equal(checkAnswers({ ...ok, instagram: 'bad handle' }).field, 'instagram');
  assert.equal(checkAnswers({ ...ok, phone: 'abc' }).field, 'phone');
});

test('answersFrom reads a saved application back into the form', () => {
  assert.deepEqual(answersFrom({ name: 'J', sport: 'S', athlete_band: '25+', pay_methods: ['cash', 'bitcoin'], instagram: 'j', phone: null }), {
    name: 'J', sport: 'S', band: '25+', pay: ['cash'], instagram: '@j', phone: '',
  });
  assert.equal(answersFrom(null, '  Jo  Smith ').name, 'Jo Smith');
});

test('statusLine covers every status and nothing else', () => {
  for (const s of ['pending', 'booked', 'granted', 'declined', 'withdrawn']) assert.ok(statusLine(s, 'a@b.c'));
  assert.equal(statusLine('granted', 'a@b.c'), 'You’re a Founding coach.');
  assert.equal(statusLine('other', 'a@b.c'), '');
  assert.match(statusLine('pending', 'a@b.c'), /doesn’t take a spot/);
});

test('applyRefusal: the RPC keys in words; a lost answer is unknown, never "not sent"', () => {
  const ctx = { total: 15, closesOn: '2026-12-31', supportEmail: 'support@x' };
  assert.equal(applyRefusal({ message: 'founding_full' }, 400, ctx).message, 'All 15 spots are taken, so this application wasn’t sent.');
  assert.equal(applyRefusal({ message: 'founding_closed' }, 400, ctx).message, 'Founding spots closed on Dec 31, 2026, so this application wasn’t sent.');
  assert.equal(applyRefusal({ message: 'not_a_coach' }, 400, ctx).code, 'not_a_coach');
  assert.equal(applyRefusal({ message: 'rate_limited' }, 400, ctx).unknown, false);
  assert.equal(applyRefusal({ code: 'PGRST202', message: 'Could not find the function' }, 404, ctx).code, 'not_open');
  assert.equal(applyRefusal({ message: 'TypeError: Failed to fetch' }, 0, ctx).unknown, true);
  assert.equal(applyRefusal({ message: 'upstream' }, 503, ctx).unknown, true);
  assert.equal(applyRefusal({ message: 'JWT expired' }, 401, ctx).code, 'not_authenticated');
  // never the server's raw text
  assert.equal(applyRefusal({ message: '<b>hi</b>' }, 400, ctx).message, 'Your application wasn’t sent. Try again in a moment.');
});

test('the /founding sign-up carries the marker and NO role (the server makes no coach row for an unproven address)', () => {
  assert.deepEqual({ ...FOUNDING_SIGN_UP_DATA }, { signup: 'founding_web' });
  assert.ok(!('role' in FOUNDING_SIGN_UP_DATA));
  assert.ok(Object.isFrozen(FOUNDING_SIGN_UP_DATA));
});

test('accountStep: athletes are never converted; not-yet-coach accounts may be finished; coaches apply', () => {
  const apple = (meta = {}) => ({ identities: [{ provider: 'apple' }], user_metadata: meta });
  const email = (meta = {}) => ({ identities: [{ provider: 'email' }], user_metadata: meta });
  assert.equal(accountStep(email({ role: 'client' }), 'athlete'), 'notCoach');
  assert.equal(accountStep(apple(), 'athlete'), 'notCoach');
  assert.equal(accountStep(email({ role: 'client' }), 'none'), 'notCoach');   // made as an athlete, no coach yet
  assert.equal(accountStep(email({ signup: 'founding_web' }), 'none'), 'finish');   // a /founding email sign-up
  assert.equal(accountStep(email({ role: 'trainer' }), 'none'), 'finish');   // a coach whose row is missing
  assert.equal(accountStep(apple(), 'coach'), 'finish');   // an Apple sign-up nobody finished (default row, no role)
  assert.equal(accountStep(email({ role: 'trainer' }), 'coach'), 'coach');
  assert.equal(accountStep(apple({ role: 'trainer' }), 'coach'), 'coach');
});

test('the athlete refusal says the account was made as an athlete account (not that it trains with a coach)', () => {
  assert.equal(FOUNDING_NOT_COACH_TITLE, 'This page is for coach accounts');
  assert.match(FOUNDING_ATHLETE_ACCOUNT, /^This account was made as an athlete account/);
  assert.doesNotMatch(FOUNDING_ATHLETE_ACCOUNT, /trains with a coach/);
});

test('the Apple marker: this tab only, 30 minutes, never from the future', () => {
  const now = 1_800_000_000_000;
  assert.equal(readFoundingReturn(foundingReturnValue(now), now + 5_000), now);
  assert.equal(readFoundingReturn(foundingReturnValue(now), now + FOUNDING_RETURN_TTL_MS + 1), null);
  assert.equal(readFoundingReturn(foundingReturnValue(now + 120_000), now), null);
  for (const raw of [null, '', '{', '{"v":2,"at":1}', '{"v":1}', '{"v":1,"at":"x"}', '[]']) assert.equal(readFoundingReturn(raw, now), null);
});

test('isOwnSession: a code typed here, or this tab\'s Apple start with a sign-in after it; anything else waits for the tap', () => {
  const start = Date.parse('2026-10-25T18:00:00Z');
  const u = (email, at) => ({ email, last_sign_in_at: at });
  // The code typed in this tab, for this account.
  assert.equal(isOwnSession(u('dana@example.com', '2026-01-01T00:00:00Z'), { typedEmail: 'Dana@Example.com ' }), true);
  assert.equal(isOwnSession(u('someone@example.com', '2026-10-25T18:01:00Z'), { typedEmail: 'dana@example.com' }), false);
  // This tab started Apple, and the account signed in after it.
  assert.equal(isOwnSession(u('x@privaterelay.appleid.com', '2026-10-25T18:00:40Z'), { appleStartedAt: start }), true);
  // ...but not after a failed return, and not a session older than the start (left in the browser).
  assert.equal(isOwnSession(u('x@privaterelay.appleid.com', '2026-10-25T18:00:40Z'), { appleStartedAt: start, note: 'failed' }), false);
  assert.equal(isOwnSession(u('left@example.com', '2026-10-24T09:00:00Z'), { appleStartedAt: start }), false);
  // No evidence at all: a stored session is somebody's.
  assert.equal(isOwnSession(u('left@example.com', '2026-10-25T18:00:40Z'), {}), false);
  assert.equal(isOwnSession(u('left@example.com', '2026-10-25T18:00:40Z'), { appleStartedAt: null }), false);
  assert.equal(isOwnSession(null, { typedEmail: 'a@b.c' }), false);
  assert.equal(isOwnSession(u('', '2026-10-25T18:00:40Z'), { typedEmail: '' }), false);
});

test('after full or close: a filed application (pending, booked) edits contact fields only; a new or withdrawn one is not taken', () => {
  for (const phase of ['full', 'closed']) {
    assert.equal(contactOnly(phase, { status: 'pending' }), true);
    assert.equal(contactOnly(phase, { status: 'booked' }), true);
    assert.equal(contactOnly(phase, { status: 'withdrawn' }), false);
    assert.equal(contactOnly(phase, { status: 'granted' }), false);
    assert.equal(contactOnly(phase, null), false);
  }
  for (const phase of ['open', 'loading', 'unknown']) assert.equal(contactOnly(phase, { status: 'pending' }), false);
  assert.equal(isNewApplication(null), true);
  assert.equal(isNewApplication({ status: 'withdrawn' }), true);
  for (const status of ['pending', 'booked', 'granted', 'declined']) assert.equal(isNewApplication({ status }), false);
});

test('the offer\'s numbers are pricing.js\'s (the server\'s tiers.founding and tiers.free)', () => {
  assert.equal(FOUNDING_FEE_PERCENT, ELITE_FEE_PERCENT);
  assert.equal(FOUNDING_FEE_PERCENT, 5);
  assert.equal(STANDARD_FEE_PERCENT, 10);
  assert.equal(FREE_ROSTER_CAP, 5);
  assert.equal(FOUNDING_ENDS_AFTER_DAYS_WITHOUT_PAYMENT, 60);
});
