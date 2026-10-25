// node --test src/web/coachMoney.test.js — the coach dashboard's Elite panel and the earnings maths.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ELITE_BUTTONS, REREAD_CODES, buildEarnings, dateWords, eliteView, isStripeCheckoutUrl, money, noBreakdownLine,
  readEliteReturn, refundLabel, webEliteConfirmed,
} from './coachMoney.js';

const NOW = Date.parse('2026-10-25T12:00:00Z');
const base = (over = {}) => ({
  tier: 'free', fee_bps: 1000, org_seat: false, model_b: false, paying_athletes: 3, cap: 5, over_cap: false, read_only: false,
  elite: { app_store_until: null, web_status: null, web_interval: null, web_current_period_end: null, web_cancel_at_period_end: false, web_paid_through: null },
  founding: { member: false, active: false, granted_at: null, first_paid_at: null, free_until: null, notice_at: null, suspended_at: null },
  ...over,
});

test('buttons say the config prices', () => {
  assert.deepEqual(ELITE_BUTTONS.map((b) => b.label), ['Subscribe monthly · $29.99', 'Yearly · $249']);
  assert.deepEqual(ELITE_BUTTONS.map((b) => b.interval), ['month', 'year']);
});

test('dates are UTC words', () => {
  assert.equal(dateWords('2026-11-08T03:00:00Z'), 'November 8, 2026');
  assert.equal(dateWords(null), null);
  assert.equal(dateWords('nope'), null);
});

test('free under the cap: buttons, fee, count', () => {
  const v = eliteView(base(), NOW);
  assert.equal(v.tierLabel, 'Free plan');
  assert.equal(v.feeLine, '10% of each pass you sell');
  assert.equal(v.athletesLine, '3 of 5 paying athletes on the free plan');
  assert.equal(v.readOnly, false);
  assert.equal(v.warning, null);
  assert.equal(v.canBuy, true);
});

test('free over the cap: read-only, the sixth athlete paid', () => {
  const v = eliteView(base({ paying_athletes: 7, over_cap: true, read_only: true }), NOW);
  assert.equal(v.readOnly, true);
  assert.match(v.warning, /7 paying athletes, more than the free plan’s 5\. Their payments go through/);
  assert.equal(v.canBuy, true);
});

test('Elite on the web: renews, no buttons; cancelled at period end', () => {
  const terms = base({ tier: 'elite', fee_bps: 500, cap: null, paying_athletes: 9, elite: { ...base().elite, web_status: 'active', web_interval: 'month', web_current_period_end: '2026-11-20T00:00:00Z', web_paid_through: '2026-11-20T00:00:00Z' } });
  const v = eliteView(terms, NOW);
  assert.equal(v.tierLabel, 'Coach Elite');
  assert.equal(v.athletesLine, '9 paying athletes · no cap');
  assert.deepEqual(v.lines, ['Coach Elite on the web, monthly. Renews November 20, 2026.']);
  assert.equal(v.manage, 'Manage it from the link in your Stripe receipt.');
  assert.equal(v.canBuy, false);
  const c = eliteView({ ...terms, elite: { ...terms.elite, web_cancel_at_period_end: true } }, NOW);
  assert.deepEqual(c.lines, ['Coach Elite on the web is cancelled; it runs until November 20, 2026.']);
  assert.equal(webEliteConfirmed(terms), true);
  assert.equal(webEliteConfirmed(base()), false);
});

test('Elite through the App Store: managed there, no buttons', () => {
  const v = eliteView(base({ tier: 'elite', fee_bps: 500, cap: null, elite: { ...base().elite, app_store_until: '2027-01-02T00:00:00Z' } }), NOW);
  assert.deepEqual(v.lines, ['Coach Elite through the App Store until January 2, 2027.']);
  assert.equal(v.manage, 'Managed in the App Store.');
  assert.equal(v.canBuy, false);
  // An App Store date in the past says nothing.
  const old = eliteView(base({ elite: { ...base().elite, app_store_until: '2026-01-01T00:00:00Z' } }), NOW);
  assert.deepEqual(old.lines, []);
  assert.equal(old.canBuy, true);
});

test('past due: within the grace, then overdue; never buttons', () => {
  const pd = (paid) => base({ tier: 'elite', elite: { ...base().elite, web_status: 'past_due', web_paid_through: paid } });
  const within = eliteView(pd('2026-10-22T00:00:00Z'), NOW);
  assert.match(within.lines[0], /trying again\. Elite stays on until October 29, 2026/);
  assert.equal(within.canBuy, false);
  const past = eliteView({ ...pd('2026-10-01T00:00:00Z'), tier: 'free' }, NOW);
  assert.equal(past.lines[0], 'Your Coach Elite payment is overdue. Elite comes back with the payment.');
  assert.equal(past.manage, 'Update your card from the link in the email Stripe sent you.');
  assert.equal(past.canBuy, false);
});

test('cancelled web Elite: runs until paid-through, then may buy again', () => {
  const c = (paid, tier) => base({ tier, elite: { ...base().elite, web_status: 'canceled', web_paid_through: paid } });
  const running = eliteView(c('2026-11-01T00:00:00Z', 'elite'), NOW);
  assert.deepEqual(running.lines, ['Your cancelled Coach Elite runs until November 1, 2026.']);
  assert.equal(running.canBuy, false);
  const ended = eliteView(c('2026-10-01T00:00:00Z', 'free'), NOW);
  assert.deepEqual(ended.lines, ['Your Coach Elite on the web ended on October 1, 2026.']);
  assert.equal(ended.canBuy, true);
});

test('Founding: not started, running, suspended, ended', () => {
  const notStarted = eliteView(base({ tier: 'founding', fee_bps: 500, cap: null, founding: { ...base().founding, member: true, active: true, granted_at: '2026-10-20T00:00:00Z' } }), NOW);
  assert.equal(notStarted.tierLabel, 'Founding');
  assert.deepEqual(notStarted.lines, ['Founding coach since October 20, 2026. Elite is included; your free year starts with your first athlete payment.']);
  assert.equal(notStarted.canBuy, false);

  const running = eliteView(base({ tier: 'founding', fee_bps: 500, cap: null, founding: { ...base().founding, member: true, active: true, granted_at: '2026-10-20T00:00:00Z', first_paid_at: '2026-10-22T00:00:00Z', free_until: '2027-10-22T00:00:00Z' } }), NOW);
  assert.deepEqual(running.lines, ['Founding coach: Elite is free until October 22, 2027.']);
  assert.equal(running.canBuy, false);

  const suspended = eliteView(base({ founding: { ...base().founding, member: true, active: false, granted_at: '2026-07-01T00:00:00Z', suspended_at: '2026-09-01T00:00:00Z' } }), NOW);
  assert.deepEqual(suspended.lines, ['Founding pricing ended on September 1, 2026: none of your athletes paid through the platform for 60 days. Your Founding badge stays.']);
  assert.equal(suspended.canBuy, true);

  const ended = eliteView(base({ founding: { ...base().founding, member: true, active: false, granted_at: '2025-09-01T00:00:00Z', first_paid_at: '2025-10-01T00:00:00Z', free_until: '2026-10-01T00:00:00Z' } }), NOW);
  assert.deepEqual(ended.lines, ['Your Founding free year ended on October 1, 2026. Your Founding badge stays.']);
  assert.equal(ended.canBuy, true);
});

test('a Founding coach with Elite set up for after the year', () => {
  const v = eliteView(base({ tier: 'founding', founding: { ...base().founding, member: true, active: true, first_paid_at: '2026-01-01T00:00:00Z', free_until: '2027-01-01T00:00:00Z' }, elite: { ...base().elite, web_status: 'trialing', web_current_period_end: '2027-01-01T00:00:00Z' } }), NOW);
  assert.equal(v.lines[0], 'Coach Elite on the web is set up for after your free year. The first charge is on January 1, 2027.');
  assert.equal(v.canBuy, false);
});

test('refusal codes that re-read the terms', () => {
  for (const c of ['already_elite', 'already_elite_app_store', 'founding_active', 'elite_payment_due']) assert.ok(REREAD_CODES.has(c));
  assert.equal(REREAD_CODES.has('not_configured'), false);
});

test('only Stripe’s hosted checkout is opened', () => {
  assert.equal(isStripeCheckoutUrl('https://checkout.stripe.com/c/pay/cs_test_a1#fid'), true);
  assert.equal(isStripeCheckoutUrl('http://checkout.stripe.com/c/pay/cs_1'), false);
  assert.equal(isStripeCheckoutUrl('https://checkout.stripe.com.evil.test/c'), false);
  assert.equal(isStripeCheckoutUrl('https://evil.test/?https://checkout.stripe.com/'), false);
  assert.equal(isStripeCheckoutUrl('https://user:pw@checkout.stripe.com/c'), false);
  assert.equal(isStripeCheckoutUrl('https://checkout.stripe.com:8443/c'), false);
  assert.equal(isStripeCheckoutUrl('javascript:alert(1)'), false);
  assert.equal(isStripeCheckoutUrl(null), false);
});

test('the return parameter is read once and removed', () => {
  assert.deepEqual(readEliteReturn('?elite=started'), { state: 'started', search: '' });
  assert.deepEqual(readEliteReturn('?elite=cancelled&x=1'), { state: 'cancelled', search: '?x=1' });
  assert.deepEqual(readEliteReturn('?elite=<b>hi</b>'), { state: null, search: '' });
  assert.deepEqual(readEliteReturn('?x=1'), { state: null, search: '?x=1' });
  assert.deepEqual(readEliteReturn(''), { state: null, search: '' });
});

test('money', () => {
  assert.equal(money(18000), '$180.00');
  assert.equal(money(-9000, 'usd'), '-$90.00');
  assert.equal(money(null), '—');
  assert.equal(money(100, 'zz!'), '$1.00');
});

test('earnings: engine row, Model B row, pre-engine row, refund row, totals', () => {
  const names = { c1: 'Laurel Ames', c2: 'Kai' };
  const passes = { p1: 'Spring', p2: 'Sessions' };
  const payments = [
    { id: 'a', created_at: '2026-10-20T15:00:00Z', client_id: 'c1', plan_id: 'p1', amount: 18000, currency: 'usd', status: 'succeeded', gross_cents: 18000, platform_fee_cents: 1800, booking_fee_cents: 0, dispute_fee_cents: null, coach_net_cents: 16200, fee_bps: 1000, tier_at_charge: 'free' },
    { id: 'b', created_at: '2026-10-18T15:00:00Z', client_id: 'c2', plan_id: 'p2', amount: 10400, currency: 'usd', status: 'succeeded', gross_cents: 10400, platform_fee_cents: 600, booking_fee_cents: 400, dispute_fee_cents: 0, coach_net_cents: 9800, fee_bps: 200, tier_at_charge: 'free' },
    { id: 'c', created_at: '2026-10-02T15:00:00Z', client_id: 'gone', plan_id: 'p1', amount: 9000, currency: 'usd', status: 'refunded', gross_cents: null, platform_fee_cents: null, booking_fee_cents: null, coach_net_cents: null, fee_bps: null },
    { id: 'd', created_at: '2026-09-10T15:00:00Z', client_id: 'c1', plan_id: 'p1', amount: 5000, currency: 'usd', status: 'succeeded', gross_cents: 5000, platform_fee_cents: 250, dispute_fee_cents: 1500, coach_net_cents: 3250, fee_bps: 500, tier_at_charge: 'elite' },
    { id: 'e', created_at: '2026-10-21T15:00:00Z', client_id: 'c1', plan_id: 'p1', amount: 18000, status: 'pending' },
    { id: 'f', created_at: '2026-10-21T15:00:00Z', client_id: 'c1', plan_id: 'p1', amount: 18000, status: 'failed' },
  ];
  const refunds = [{ id: 'r1', created_at: '2026-10-05T15:00:00Z', client_id: 'gone', plan_id: 'p1', amount_cents: 9000, currency: 'usd', reason: 'coach_refund' }];
  const { rows, months } = buildEarnings({ payments, refunds, names, passes });
  assert.deepEqual(rows.map((r) => r.id), ['a', 'b', 'refund-r1', 'c', 'd']);
  const [a, b, r, c, d] = rows;
  assert.equal(a.athlete, 'Laurel');
  assert.equal(a.pass, 'Spring');
  assert.equal(a.feePercent, 10);
  assert.equal(a.bookingFee, null);
  assert.equal(b.bookingFee, 400);
  assert.equal(b.feePercent, 2);
  assert.equal(b.disputeFee, null);
  assert.equal(r.kind, 'refund');
  assert.equal(r.gross, -9000);
  assert.equal(r.athlete, 'Former athlete');
  assert.equal(c.breakdown, false);
  assert.equal(c.gross, 9000);
  assert.equal(c.net, null);
  assert.equal(c.refunded, true);
  assert.equal(d.disputeFee, 1500);

  assert.equal(months.length, 2);
  const oct = months[0];
  assert.equal(oct.key, '2026-10');
  assert.equal(oct.label, 'October 2026');
  assert.equal(oct.paid, 18000 + 10400 + 9000);
  assert.equal(oct.refunded, -9000);
  assert.equal(oct.platformFee, 2400);
  assert.equal(oct.bookingFee, 400);
  assert.equal(oct.disputeFee, 0);
  assert.equal(oct.net, 26000);
  assert.equal(oct.noBreakdown, 1);
  const sep = months[1];
  assert.equal(sep.disputeFee, 1500);
  assert.equal(sep.net, 3250);
  // gross = platform fee + dispute fee + net, for every engine row.
  for (const row of rows.filter((x) => x.breakdown)) assert.equal(row.gross, row.platformFee + (row.disputeFee ?? 0) + row.net);
});

test('earnings: nothing to read', () => {
  assert.deepEqual(buildEarnings({}), { rows: [], months: [] });
});

test('labels', () => {
  assert.equal(refundLabel('coach_left'), 'Refund when you left');
  assert.equal(refundLabel('dashboard'), 'Refund from Stripe');
  assert.equal(refundLabel('coach_refund'), 'Refund');
  assert.equal(noBreakdownLine(0), null);
  assert.match(noBreakdownLine(1), /^1 payment is from before/);
  assert.match(noBreakdownLine(3), /^3 payments are from before/);
});
