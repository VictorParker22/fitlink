// node --test src/web/coachMoney.test.js — the coach dashboard's Elite panel and the earnings maths.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ELITE_BUTTONS, FOUNDING_BEFORE_FIRST_PAYMENT, FOUNDING_ELITE_BUTTONS, LOST_DISPUTE_SHOWN_DAYS, REREAD_CODES, buildEarnings,
  checkoutKeepsPromise, dateWords, disputeNote, eliteView, isStripeCheckoutUrl, money, noBreakdownLine, readEliteReturn,
  refundLabel, refundTag, truncatedNote, webEliteConfirmed,
} from './coachMoney.js';

const NOW = Date.parse('2026-10-25T12:00:00Z');
const base = (over = {}) => ({
  tier: 'free', fee_bps: 1000, org_seat: false, model_b: false, model_b_fee_bps: 200, booking_fee_cents: { single_session: 400, block_payment: 1200 }, paying_athletes: 3, cap: 5, over_cap: false, read_only: false,
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
  assert.equal(v.buy.intro, 'Elite lowers your fee, removes the athlete cap and drafts your replies. You pay on Stripe’s page.');
  assert.equal(v.buy.buttons, ELITE_BUTTONS);
  assert.equal(v.buy.defersUntil, null);
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
  // Before the first paid athlete: elite-checkout refuses (founding_active), so no buttons and its own reason.
  assert.deepEqual(notStarted.lines, [`Founding coach since October 20, 2026. ${FOUNDING_BEFORE_FIRST_PAYMENT}`]);
  assert.equal(FOUNDING_BEFORE_FIRST_PAYMENT, 'Your Founding spot already includes Elite. Your free year starts with your first paid athlete; you can set up Elite for after it then.');
  assert.equal(notStarted.canBuy, false);
  assert.equal(notStarted.buy, null);

  // In the free year (an athlete has paid): Elite can be set up for after it, nothing charged until the year ends.
  const running = eliteView(base({ tier: 'founding', fee_bps: 500, cap: null, founding: { ...base().founding, member: true, active: true, granted_at: '2026-10-20T00:00:00Z', first_paid_at: '2026-10-22T00:00:00Z', free_until: '2027-10-22T00:00:00Z' } }), NOW);
  assert.deepEqual(running.lines, ['Founding coach: Elite is free until October 22, 2027.']);
  assert.equal(running.canBuy, true);
  assert.equal(running.noticeWindow, false);
  assert.equal(running.buy.intro, 'Set up Elite for after your free year · Nothing is charged until October 22, 2027.');
  assert.deepEqual(running.buy.buttons.map((b) => b.label), ['Monthly · $29.99', 'Yearly · $249']);
  assert.equal(running.buy.buttons, FOUNDING_ELITE_BUTTONS);
  assert.equal(running.buy.defersUntil, '2027-10-22T00:00:00Z');

  const suspended = eliteView(base({ founding: { ...base().founding, member: true, active: false, granted_at: '2026-07-01T00:00:00Z', suspended_at: '2026-09-01T00:00:00Z' } }), NOW);
  assert.deepEqual(suspended.lines, ['Founding pricing ended on September 1, 2026: none of your athletes paid through the platform for 60 days. Your Founding badge stays.']);
  assert.equal(suspended.canBuy, true);

  const ended = eliteView(base({ founding: { ...base().founding, member: true, active: false, granted_at: '2025-09-01T00:00:00Z', first_paid_at: '2025-10-01T00:00:00Z', free_until: '2026-10-01T00:00:00Z' } }), NOW);
  assert.deepEqual(ended.lines, ['Your Founding free year ended on October 1, 2026. Your Founding badge stays.']);
  assert.equal(ended.canBuy, true);
});

test('Founding notice window (day 335): the reminder line and the buttons', () => {
  const f = { ...base().founding, member: true, active: true, granted_at: '2025-11-01T00:00:00Z', first_paid_at: '2025-11-20T00:00:00Z', free_until: '2026-11-20T00:00:00Z' };
  // The notice was sent (founding_daily stamps notice_at).
  const sent = eliteView(base({ tier: 'founding', fee_bps: 500, cap: null, founding: { ...f, notice_at: '2026-10-16T09:07:00Z' } }), NOW);
  assert.equal(sent.noticeWindow, true);
  assert.deepEqual(sent.lines, [
    'Founding coach: Elite is free until November 20, 2026.',
    'Your free year ends on November 20, 2026. To keep Elite and your 5% fee, set up Elite before then; nothing is charged until that day.',
  ]);
  assert.equal(sent.canBuy, true);
  assert.equal(sent.buy.intro, 'Set up Elite for after your free year · Nothing is charged until November 20, 2026.');
  // Inside the 30 days before the end even before the daily job stamped it.
  const unstamped = eliteView(base({ tier: 'founding', founding: f }), NOW);
  assert.equal(unstamped.noticeWindow, true);
  assert.equal(unstamped.canBuy, true);
  // The last 48 hours: Stripe can't hold the first charge, so the words say it is charged from today.
  const last = eliteView(base({ tier: 'founding', founding: { ...f, free_until: '2026-10-26T12:00:00Z' } }), NOW);
  assert.equal(last.canBuy, true);
  assert.equal(last.buy.intro, 'Your free year ends on October 26, 2026, so Elite started now is charged from today.');
  assert.equal(last.buy.buttons, ELITE_BUTTONS);
  assert.equal(last.buy.defersUntil, null);
});

test('the page leaves for Stripe only when firstChargeAt keeps the panel’s date', () => {
  const offer = { defersUntil: '2027-10-22T00:00:00Z' };
  assert.equal(checkoutKeepsPromise(offer, { url: 'x', firstChargeAt: '2027-10-22T00:00:00.000Z' }), true);
  assert.equal(checkoutKeepsPromise(offer, { url: 'x' }), false);
  assert.equal(checkoutKeepsPromise(offer, { url: 'x', firstChargeAt: '2027-10-23T00:00:00Z' }), false);
  assert.equal(checkoutKeepsPromise({ defersUntil: null }, { url: 'x' }), true);
  assert.equal(checkoutKeepsPromise(null, { url: 'x' }), true);
});

test('Model B: the coach’s rate and the booking fee inside the athlete’s total', () => {
  const v = eliteView(base({ model_b: true, fee_bps: 1000 }), NOW);
  assert.equal(v.feeLine, '2% of each pass you sell. Your athletes’ total also holds a $12 booking fee on each payment, shown in the total before they pay; it goes to the platform, not to you.');
  assert.equal(v.canBuy, true);
  assert.doesNotMatch(v.buy.intro, /lowers your fee/);
  assert.match(v.buy.intro, /removes the athlete cap/);
});

test('org seat: the seat covers fee and cap; no lower-fee or no-cap pitch', () => {
  const v = eliteView(base({ org_seat: true, fee_bps: 0, cap: null, paying_athletes: 8 }), NOW);
  assert.equal(v.feeLine, 'No fee on the passes you sell: your gym’s seat covers it.');
  assert.equal(v.athletesLine, '8 paying athletes · no cap (your gym’s seat)');
  assert.equal(v.canBuy, true);
  assert.equal(v.buy.intro, 'Your gym’s seat already covers your fee and the athlete cap. Elite adds the assistant that drafts your replies. You pay on Stripe’s page.');
  assert.doesNotMatch(v.buy.intro, /lowers your fee|removes the athlete cap/);
  const paid = eliteView(base({ org_seat: true, fee_bps: 300, cap: null }), NOW);
  assert.equal(paid.feeLine, '3% of each pass you sell (your gym’s seat)');
});

test('a Founding coach with Elite set up for after the year', () => {
  const v = eliteView(base({ tier: 'founding', founding: { ...base().founding, member: true, active: true, first_paid_at: '2026-01-01T00:00:00Z', free_until: '2027-01-01T00:00:00Z' }, elite: { ...base().elite, web_status: 'trialing', web_current_period_end: '2027-01-01T00:00:00Z' } }), NOW);
  assert.equal(v.lines[0], 'Coach Elite on the web is set up for after your free year. The first charge is on January 1, 2027.');
  assert.equal(v.canBuy, false);
  assert.equal(v.buy, null);
  // No second "set up" reminder once it is set up.
  assert.equal(v.lines.some((l) => /set up Elite before then/.test(l)), false);
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

test('earnings: a part refund is "part refunded", a whole one "refunded"', () => {
  const payments = [
    { id: 'p1', created_at: '2026-09-01T10:00:00Z', client_id: 'c1', plan_id: 'p', amount: 18000, status: 'succeeded', gross_cents: 18000, platform_fee_cents: 1800, coach_net_cents: 16200, fee_bps: 1000 },
    { id: 'p2', created_at: '2026-10-01T10:00:00Z', client_id: 'c1', plan_id: 'p', amount: 18000, status: 'refunded', gross_cents: 18000, platform_fee_cents: 1800, coach_net_cents: 16200, fee_bps: 1000 },
    { id: 'p3', created_at: '2026-10-02T10:00:00Z', client_id: 'c2', plan_id: 'p', amount: 9000, status: 'refunded' },
    { id: 'p4', created_at: '2026-10-03T10:00:00Z', client_id: 'c3', plan_id: 'p', amount: 9000, status: 'succeeded' },
  ];
  const refunds = [
    // A half on the October payment (refund-pass half that ended the pass: the server marks the payment refunded).
    { id: 'r1', created_at: '2026-10-05T10:00:00Z', client_id: 'c1', plan_id: 'p', amount_cents: 9000 },
    // The whole of c3's payment.
    { id: 'r2', created_at: '2026-10-04T10:00:00Z', client_id: 'c3', plan_id: 'p', amount_cents: 9000 },
  ];
  const { rows } = buildEarnings({ payments, refunds });
  const by = Object.fromEntries(rows.filter((r) => r.kind === 'payment').map((r) => [r.id, r]));
  assert.equal(by.p1.refundState, null);
  assert.equal(by.p2.refundedCents, 9000);
  assert.equal(by.p2.refundState, 'part');
  assert.equal(refundTag(by.p2.refundState), 'part refunded');
  assert.equal(by.p3.refundState, 'full');   // marked refunded, no refund row of ours: the server's word
  assert.equal(by.p4.refundState, 'full');
  assert.equal(refundTag('full'), 'refunded');
  assert.equal(refundTag(null), null);
  // Two halves make a whole.
  const two = buildEarnings({ payments: [payments[1]], refunds: [refunds[0], { ...refunds[0], id: 'r3', created_at: '2026-10-09T10:00:00Z' }] });
  assert.equal(two.rows.find((r) => r.id === 'p2').refundState, 'full');
});

test('earnings: disputes note counts disputes, not inquiries or long-closed ones', () => {
  assert.equal(disputeNote(null, NOW), null);
  assert.equal(disputeNote([], NOW), null);
  const old = new Date(NOW - (LOST_DISPUTE_SHOWN_DAYS + 5) * 86_400_000).toISOString();
  const recent = new Date(NOW - 10 * 86_400_000).toISOString();
  assert.equal(disputeNote([
    { status: 'warning_needs_response', amount_cents: 5000 },
    { status: 'warning_closed', amount_cents: 5000 },
    { status: 'won', amount_cents: 5000, updated_at: recent },
    { status: 'lost', amount_cents: 5000, updated_at: old },
  ], NOW), null);
  const note = disputeNote([
    { status: 'needs_response', amount_cents: 18000, currency: 'usd' },
    { status: 'under_review', amount_cents: 2000, currency: 'usd' },
    { status: 'lost', amount_cents: 9000, currency: 'usd', updated_at: recent },
    { status: 'warning_under_review', amount_cents: 7000 },
  ], NOW);
  assert.equal(note, '2 open disputes hold $200.00 back from your balance while the bank decides. 1 dispute was lost in the last 90 days: $90.00 was taken back from your balance. The disputed payments below still show their full net payout; what a dispute holds back or takes isn’t in these totals.');
  assert.match(disputeNote([{ status: 'lost', amount_cents: 100, updated_at: recent }], NOW), /^1 dispute was lost/);
  assert.match(disputeNote([{ status: 'under_review', amount_cents: 100 }], NOW), /^1 open dispute holds \$1\.00/);
});

test('earnings: a list at its limit says the oldest month may be partial', () => {
  assert.equal(truncatedNote(500), 'Showing your latest 500 payments and refunds. Older ones weren’t loaded, so the oldest month shown may be missing some.');
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
