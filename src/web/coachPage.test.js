// node --test src/web/coachPage.test.js
// The coach page's pure rules (coachPage.js, handles.js): the handle field, the route's handle, the page's view model
// from coach_page's answer (fitlink-app migration 20261025130000 §8), the funnel's event payloads (log_page_event's
// own checks) and the dashboard's set_handle / my_page_stats readings.
import test from 'node:test';
import assert from 'node:assert/strict';
import { handleFieldValue, handleHint, handleWellFormed, normalizeHandle, pageHandle } from './handles.js';
import {
  eventParams, isSessionKey, nextBlockLine, PAGE_INVITE_NOTE, pageModel, passCard, referrerHost, safeImageUrl, sessionKeyFrom, setHandleOutcome,
  sportLine, statsView, utmFrom, FUNNEL_STAGES,
} from './coachPage.js';
import { parkedCheckoutValue, readParkedCheckout } from './appleAuth.js';
import { SITE_HOST, SITE_ORIGIN } from './site/brand.js';

const NOW = Date.UTC(2026, 9, 25, 15);
const COACH = '33333333-3333-4333-8333-333333333333';
const PID = (n) => `a0000000-0000-4000-8000-00000000000${n}`;

test('handle: the server\'s normalising (cut 64, trim spaces, lower case, one @) and format rule', () => {
  assert.equal(normalizeHandle('  @Dana-Ruiz '), 'dana-ruiz');
  assert.equal(normalizeHandle('@@dana'), '@dana', 'only ONE leading @ goes');
  assert.equal(normalizeHandle('   '), null);
  assert.equal(normalizeHandle(42), null);
  assert.equal(normalizeHandle('\tdana'), '\tdana', 'btrim trims spaces only');
  assert.equal(normalizeHandle('a'.repeat(70)).length, 64);
  for (const ok of ['abc', 'dana-ruiz', 'a1b', 'x'.repeat(30), 'coach9']) assert.equal(handleWellFormed(ok), true, ok);
  for (const bad of ['ab', 'x'.repeat(31), '-dana', 'dana-', 'da--na', 'dana_ruiz', 'dana ruiz', 'DANA', 'dañа']) assert.equal(handleWellFormed(bad), false, bad);
  assert.equal(pageHandle('Dana-Ruiz'), 'dana-ruiz');
  assert.equal(pageHandle('../etc'), null);
  assert.equal(pageHandle(undefined), null);
});

test('handle field: lower case as typed, no leading @ or spaces; hints say why, never availability', () => {
  assert.equal(handleFieldValue('@Dana'), 'dana');
  assert.equal(handleFieldValue('  Dana Ruiz'), 'dana ruiz');
  assert.equal(handleFieldValue('X'.repeat(80)).length, 64);
  assert.equal(handleHint(''), null);
  assert.equal(handleHint('da'), 'At least 3 characters.');
  assert.equal(handleHint('x'.repeat(31)), 'At most 30 characters.');
  assert.match(handleHint('dana ruiz'), /letters, digits and hyphens/);
  assert.match(handleHint('dana_ruiz'), /letters, digits and hyphens/);
  assert.match(handleHint('-dana'), /Start and end/);
  assert.match(handleHint('da--na'), /two hyphens/);
  assert.equal(handleHint('dana-ruiz'), null);
  assert.equal(handleHint('admin'), null, 'reserved words are the server\'s answer ("That name isn\'t available.")');
});

const pass = (o) => ({
  id: PID(1), name: 'Winter block', description: null, cover_url: null, kind: 'block', price: 320, period: 'month',
  price_cents: 32000, booking_fee_cents: 0, total_cents: 32000, duration_weeks: 8, starts_on: '2026-12-01',
  enrollment_closes: null, session_at: null, session_minutes: null, on_sale: true, not_on_sale: null, buyable: true, ...o,
});
const answer = (o = {}, coach = {}) => ({
  found: true, handle: 'dana-ruiz', model_b: false, minimum_charge_cents: 2500, next_block_starts_on: '2026-12-01',
  coach: {
    id: COACH, name: 'Dana Ruiz', avatar_url: 'https://qcmtaskhyhwzyoegtfpw.supabase.co/storage/v1/object/public/avatars/dana/a.jpg', cover_url: null, specialization: 'Strength',
    specializations: ['Strength', 'Rowing'], bio: 'x', cancellation_policy: null, founding_member: true, takes_cards: true, ...coach,
  },
  passes: [pass()],
  ...o,
});

test('page model: found / redirect / not found / unreadable', () => {
  assert.deepEqual(pageModel({ found: false }), { kind: 'not_found' });
  assert.deepEqual(pageModel({ found: false, redirect: 'Dana-New' }), { kind: 'redirect', handle: 'dana-new' });
  assert.deepEqual(pageModel({ found: false, redirect: '../x' }), { kind: 'not_found' }, 'a redirect that cannot be a page is not followed');
  assert.equal(pageModel(null).kind, 'error');
  assert.equal(pageModel([]).kind, 'error');
  assert.equal(pageModel({ found: true, coach: { id: 'nope' } }).kind, 'error');
  const m = pageModel(answer());
  assert.equal(m.kind, 'found');
  assert.equal(m.handle, 'dana-ruiz');
  assert.equal(m.coach.first, 'Dana');
  assert.equal(m.coach.photo, 'https://qcmtaskhyhwzyoegtfpw.supabase.co/storage/v1/object/public/avatars/dana/a.jpg');
  assert.equal(m.coach.sport, 'Strength');
  assert.equal(m.coach.founding, true);
  assert.equal(m.nextBlock, '2026-12-01');
  assert.equal(m.passes.length, 1);
  assert.equal(m.passes[0].plan.trainer_id, COACH, 'Checkout reads the coach from the plan row');
  assert.equal(m.passes[0].plan.price, 320);
  assert.deepEqual(m.passes[0].total, { cents: 32000, bookingCents: 0 });
});

test('page model: hostile or odd values are left out', () => {
  for (const bad of ['http://x.com/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,AA', 'https://u:p@x.com/a.jpg', `https://x.com/${'a'.repeat(2100)}`, 42]) {
    assert.equal(safeImageUrl(bad), null, String(bad).slice(0, 40));
  }
  // Only our own origins (review m5): this project's public Storage, and the site. A tracker host is never loaded.
  const STORE = 'https://qcmtaskhyhwzyoegtfpw.supabase.co/storage/v1/object/public/avatars/u1/a.jpg';
  assert.equal(safeImageUrl(STORE), STORE);
  assert.equal(safeImageUrl(`${SITE_ORIGIN}/apple/logo.png`), `${SITE_ORIGIN}/apple/logo.png`);
  assert.equal(safeImageUrl('https://proj.supabase.co/storage/v1/object/public/avatars/a.jpg', { supabaseUrl: 'https://proj.supabase.co/' }),
    'https://proj.supabase.co/storage/v1/object/public/avatars/a.jpg', 'the configured project, not a literal');
  for (const bad of [
    'https://tracker.example/pixel.gif',
    'https://images.example.com/a.jpg',
    'https://qcmtaskhyhwzyoegtfpw.supabase.co/rest/v1/rpc/coach_page',
    'https://qcmtaskhyhwzyoegtfpw.supabase.co/storage/v1/object/sign/avatars/a.jpg',
    'https://qcmtaskhyhwzyoegtfpw.supabase.co/storage/v1/object/public/../../../functions/v1/x',
    'https://qcmtaskhyhwzyoegtfpw.supabase.co/storage/v1/object/public/%2e%2e/%2e%2e/%2e%2e/functions/v1/x',
    'https://qcmtaskhyhwzyoegtfpw.supabase.co/storage/v1/object/public/',
    'https://qcmtaskhyhwzyoegtfpw.supabase.co.evil.com/storage/v1/object/public/a.jpg',
    'https://qcmtaskhyhwzyoegtfpw.supabase.co:8443/storage/v1/object/public/a.jpg',
    'https://other.supabase.co/storage/v1/object/public/avatars/a.jpg',
    `${SITE_ORIGIN}.evil.com/a.png`,
  ]) assert.equal(safeImageUrl(bad), null, bad);
  const tracked = pageModel(answer({ coach: { ...answer().coach, avatar_url: 'https://tracker.example/p.gif' } }));
  assert.equal(tracked.coach.photo, null, 'a photo on another host is not drawn');
  const ours = pageModel(answer({ coach: { ...answer().coach, avatar_url: STORE } }));
  assert.equal(ours.coach.photo, STORE);
  const m = pageModel(answer({
    next_block_starts_on: 'soon',
    passes: [
      pass({ id: 'not-a-uuid' }),
      pass({ id: PID(2), price_cents: 0 }),
      pass({ id: PID(3), total_cents: 99999 }),            // a total that is not price + fee: no total, not buyable
      pass({ id: PID(4), kind: 'session', duration_weeks: 8, starts_on: '2026-12-01', session_at: 'garbage', session_minutes: 4000 }),
    ],
  }, { name: '   ', avatar_url: 'javascript:x', specialization: '', specializations: ['Run', 'Run', 'Bike', 'Swim', 'Yoga'] }));
  assert.equal(m.coach.name, 'Your coach');
  assert.equal(m.coach.photo, null);
  assert.equal(m.coach.sport, 'Run · Bike · Swim');
  assert.equal(m.nextBlock, null);
  assert.deepEqual(m.passes.map((p) => p.id), [PID(3), PID(4)]);
  assert.equal(m.passes[0].total, null);
  assert.equal(m.passes[0].buyable, false);
  assert.equal(m.passes[1].plan.session_at, null);
  assert.equal(m.passes[1].plan.session_minutes, null);
  assert.equal(sportLine({ specialization: 'Boxing', specializations: ['Run'] }), 'Boxing');
  assert.equal(sportLine({}), null);
  assert.equal(pageModel(answer({ passes: Array.from({ length: 60 }, (_, i) => pass({ id: `a0000000-0000-4000-8000-${String(i).padStart(12, '0')}` })) })).passes.length, 50);
});

test('cards: the server\'s totals, before checkout (Model B\'s booking fee inside, said on its own line)', () => {
  const card = (p, opts = {}) => passCard(pageModel(answer({ passes: [p] })).passes[0], NOW, { first: 'Dana', locale: 'en-US', timeZone: 'America/New_York', ...opts });
  const block = card(pass());
  assert.equal(block.amount, '$320');
  assert.equal(block.unit, '/ month');
  assert.deepEqual(block.lines, ['Starts Dec 1 · 8 weeks', '$320 / month · 2 payments ($640 in all)', 'Sign-ups close Nov 30']);
  assert.equal(block.button, 'Join the block');

  const b = card(pass({ booking_fee_cents: 1200, total_cents: 33200 }));
  assert.equal(b.amount, '$332');
  assert.ok(b.lines.includes('$332 / month · 2 payments ($664 in all)'), b.lines.join(' | '));
  assert.ok(b.lines.includes('Includes a $12 booking fee on each payment.'));

  const s = card(pass({ kind: 'session', price_cents: 4000, booking_fee_cents: 400, total_cents: 4400, duration_weeks: null, starts_on: null, session_at: '2026-12-03T23:00:00Z', session_minutes: 60 }));
  assert.equal(s.amount, '$44');
  assert.equal(s.unit, 'one payment');
  assert.equal(s.lines[0], 'Session · Thu, Dec 3, 6:00 PM EST · 60 min · $44');
  assert.ok(s.lines.includes('Includes a $4 booking fee.'));
  assert.equal(s.button, 'Book this session');

  const open = card(pass({ duration_weeks: null, starts_on: null, price_cents: 5000, total_cents: 5000 }));
  assert.deepEqual(open.lines, ['$50 / month · renews until you cancel']);
  assert.equal(open.button, 'Buy Winter block');

  const later = card(pass({ starts_on: '2027-03-01', on_sale: false, not_on_sale: 'block_not_open', buyable: false }));
  assert.equal(later.button, null);
  assert.ok(later.lines.includes('On sale from Dec 1'), later.lines.join(' | '));
  assert.match(later.reason, /Not on sale yet/);

  const noCards = passCard(pageModel(answer({ passes: [pass({ buyable: false })] }, { takes_cards: false })).passes[0], NOW, { first: 'Dana', takesCards: false });
  assert.equal(noCards.button, null);
  assert.equal(noCards.reason, 'Dana isn’t taking card payments yet. Ask them about it.');

  assert.equal(nextBlockLine('2026-12-01', NOW, 'en-US'), 'Next block starts Dec 1');
  assert.equal(nextBlockLine('2027-06-01', NOW, 'en-US'), 'Next block starts Jun 1, 2027');
  assert.equal(nextBlockLine(null, NOW), null);
});

test('events: only well-formed payloads, the referrer\'s host only, utm values cleaned', () => {
  const key = sessionKeyFrom(new Uint8Array(24).map((_, i) => i * 11));
  assert.equal(key.length, 32);
  assert.equal(isSessionKey(key), true);
  assert.equal(sessionKeyFrom(new Uint8Array(10)), null);
  assert.equal(isSessionKey('short'), false);
  assert.equal(isSessionKey('a'.repeat(65)), false);
  assert.equal(isSessionKey('has space in it 123'), false);

  assert.equal(referrerHost('https://L.Instagram.com/path?u=secret#x'), 'l.instagram.com');
  assert.equal(referrerHost('android-app://com.instagram'), null);
  assert.equal(referrerHost(''), null);
  assert.equal(referrerHost('not a url'), null);

  assert.deepEqual(utmFrom('?utm_source=ig&utm_medium=%20bio%20&utm_campaign=' + 'x'.repeat(150)), { source: 'ig', medium: 'bio', campaign: 'x'.repeat(100) });
  assert.deepEqual(utmFrom('?utm_source=%00%01'), { source: null, medium: null, campaign: null });

  const view = eventParams({ handle: 'Dana-Ruiz', kind: 'page_view', planId: PID(1), sessionKey: key, referrer: 'https://l.instagram.com/x', search: '?utm_source=ig' });
  assert.deepEqual(view, {
    p_handle: 'dana-ruiz', p_kind: 'page_view', p_plan_id: null, p_session_key: key, p_referrer_host: 'l.instagram.com',
    p_utm_source: 'ig', p_utm_medium: null, p_utm_campaign: null,
  });
  assert.equal(eventParams({ handle: 'dana-ruiz', kind: 'pass_tap', planId: PID(1), sessionKey: key }).p_plan_id, PID(1));
  assert.equal(eventParams({ handle: 'dana-ruiz', kind: 'pass_tap', planId: null, sessionKey: key }), null, 'a pass event needs its pass');
  assert.equal(eventParams({ handle: 'dana-ruiz', kind: 'checkout_start', planId: 'x', sessionKey: key }), null);
  assert.equal(eventParams({ handle: 'dana-ruiz', kind: 'paid', planId: PID(1), sessionKey: key }), null, 'paid is the server\'s');
  assert.equal(eventParams({ handle: 'dana-ruiz', kind: 'page_view', sessionKey: 'nope' }), null);
  assert.equal(eventParams({ handle: '-x', kind: 'page_view', sessionKey: key }), null);
});

test('dashboard: set_handle answers in words, my_page_stats in four stages', () => {
  const host = SITE_HOST;
  assert.deepEqual(setHandleOutcome({ ok: false, code: 'handle_unavailable', error: 'That name isn\'t available.' }, host),
    { ok: false, code: 'handle_unavailable', message: 'That name isn\'t available.' });
  assert.equal(setHandleOutcome({ ok: false, code: 'rate_limited', error: 'Too many changes today.' }, host).message, 'Too many changes today.');
  assert.deepEqual(setHandleOutcome(null, host), { ok: null });
  assert.deepEqual(setHandleOutcome({ ok: true, handle: '<b>', previous: null, changed: true }, host), { ok: null });
  assert.equal(setHandleOutcome({ ok: true, handle: 'dana', previous: null, changed: true, path: '/c/dana' }, host).message, `Saved. Your page is ${SITE_HOST}/c/dana.`);
  assert.equal(setHandleOutcome({ ok: true, handle: 'dana2', previous: 'dana', changed: true }, host).message,
    `Saved. Your page is ${SITE_HOST}/c/dana2. ${SITE_HOST}/c/dana sends people there for a year.`);
  assert.equal(setHandleOutcome({ ok: true, handle: 'dana', previous: 'dana', changed: false }, host).message, 'That’s already your page’s name.');
  const down = setHandleOutcome({ ok: true, handle: null, previous: 'dana', changed: true, path: null }, host);
  assert.equal(down.handle, null);
  assert.ok(down.message.startsWith(`Your page is down. ${SITE_HOST}/c/dana no longer opens it`), down.message);

  const v = statsView({ days: 30, since: '2026-09-25T00:00:00Z', page_view: 41, pass_tap: 12, checkout_start: 5, paid: 2 });
  assert.equal(v.days, 30);
  assert.deepEqual(v.rows.map((r) => r.count), [41, 12, 5, 2]);
  assert.deepEqual(v.rows.map((r) => r.key), FUNNEL_STAGES.map((s) => s.key));
  assert.equal(statsView({ days: 30, page_view: -1, pass_tap: 0, checkout_start: 0, paid: 0 }), null);
  assert.equal(statsView({ days: 30, page_view: 1 }), null);
  assert.equal(statsView(null), null);
});

test('the Apple return parks a coach page by its handle (v2), an invite link by its code (v1)', () => {
  const plan = PID(1);
  const now = NOW;
  const v2 = parkedCheckoutValue({ handle: '@Dana-Ruiz', planId: plan, name: ' Sam ' }, now);
  assert.deepEqual(readParkedCheckout(v2, now + 1000), { handle: 'dana-ruiz', planId: plan, name: 'Sam' });
  assert.deepEqual(readParkedCheckout(parkedCheckoutValue({ code: 'abcdef', planId: plan, name: '' }, now), now), { code: 'ABCDEF', planId: plan, name: '' });
  assert.equal(parkedCheckoutValue({ handle: '-bad', planId: plan, name: '' }, now), null);
  assert.equal(parkedCheckoutValue({ code: 'ABC', handle: 'dana', planId: plan, name: '' }, now), null, 'a bad code is not quietly swapped for the handle');
  assert.equal(readParkedCheckout(JSON.stringify({ v: 2, handle: 'Dana', planId: plan, name: '', at: now }), now), null);
  assert.equal(readParkedCheckout(JSON.stringify({ v: 2, handle: 'dana', planId: plan, name: '', at: now - 31 * 60_000 }), now), null);
});

test('the panel says a page uses the standing invite link, and remakes a revoked one (review m7)', () => {
  assert.match(PAGE_INVITE_NOTE, /standing invite link/);
  assert.match(PAGE_INVITE_NOTE, /revoked/);
  assert.match(PAGE_INVITE_NOTE, /makes a new one/);
  assert.doesNotMatch(PAGE_INVITE_NOTE, /\b(he|she|him|her|his|hers)\b/i, 'no gendered pronouns');
});
