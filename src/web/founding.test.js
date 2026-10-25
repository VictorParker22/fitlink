// node --test src/web/founding.test.js — the /founding page's pure rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATHLETE_BANDS, PAY_METHODS, answersFrom, applyRefusal, bookingUrl, checkAnswers, cleanInstagram, cleanPhone, cleanText,
  closesLabel, closesLabelLong, foundingPhase, fullLine, parseSlots, slotsLine, statusLine,
} from './founding.js';

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
