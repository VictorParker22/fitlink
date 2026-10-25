// node --test src/web/season.test.js
// Pins the web's copy of the season formula to the server's table
// (fitlink-app supabase/functions/_shared/season.ts, tests/seasonBilling.test.ts)
// and the words every price on the site is built from.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addIntervals, billingPeriod, checkoutChargeLine, datedBlockPayments, planDayMs, coachPriceLine, finishedSeason, holdsRunningPass, lengthChangeLine,
  passBilling, passPriceParts, passPriceText, passSeasonLine, payingFor, priceCents, seasonPayments, seasonWeeks, usdFromCents,
} from './season.js';

test('the pinned table, monthly and yearly (the server pins the same one)', () => {
  const month = { 1: 1, 4: 1, 5: 2, 6: 2, 8: 2, 10: 3, 12: 3, 13: 3, 16: 4, 26: 6, 52: 12 };
  for (const [w, p] of Object.entries(month)) assert.equal(seasonPayments(Number(w), 'month'), p, `${w} weeks monthly`);
  assert.equal(seasonPayments(8, 'year'), 1);
  assert.equal(seasonPayments(52, 'year'), 1);
  assert.equal(seasonPayments(53, 'year'), 2);
});

test('integer arithmetic equals the float formula for every season length', () => {
  for (let w = 1; w <= 520; w++) {
    assert.equal(seasonPayments(w, 'month'), Math.max(1, Math.ceil((w * 7) / 30.4375)), `${w} monthly`);
    assert.equal(seasonPayments(w, 'year'), Math.max(1, Math.ceil((w * 7) / 365.25)), `${w} yearly`);
  }
});

test('only a whole number of weeks 1..520 is a season; every period but year bills monthly', () => {
  for (const bad of [0, -4, 1.5, 521, NaN, null, undefined, '', 'eight', '8.0', {}]) assert.equal(seasonPayments(bad, 'month'), null, String(bad));
  assert.equal(seasonWeeks('12'), 12);
  assert.equal(seasonWeeks(' 8 '), 8);
  assert.equal(billingPeriod('year'), 'year');
  for (const p of ['month', 'week', null, undefined, 'YEAR']) assert.equal(billingPeriod(p), 'month');
  assert.equal(seasonPayments(8, 'week'), 2);
});

test('prices are whole cents the way create-subscription reads them', () => {
  assert.equal(priceCents('180.00'), 18000);
  assert.equal(priceCents(19.99), 1999);
  assert.equal(priceCents('0.00'), null);
  assert.equal(priceCents(0.004), null);
  assert.equal(priceCents(null), null);
  assert.equal(usdFromCents(18000), '$180');
  assert.equal(usdFromCents(216000), '$2,160');
  assert.equal(usdFromCents(1999), '$19.99');
  assert.equal(usdFromCents(3998), '$39.98');
});

test('a season: price per period, its payments and the total', () => {
  const greek = { price: '180.00', period: 'month', duration_weeks: 8 };
  assert.deepEqual(passBilling(greek), { kind: 'season', period: 'month', adverb: 'monthly', priced: true, priceCents: 18000, weeks: 8, payments: 2, totalCents: 36000 });
  assert.deepEqual(passPriceParts(greek), { amount: '$180', unit: '/ month' });
  assert.equal(passPriceText(greek), '$180 / month');
  assert.equal(passSeasonLine(greek), '8-week season · 2 monthly payments ($360 in all)');
  assert.equal(checkoutChargeLine(greek), '$180 today, then monthly: 2 payments in all. Billing stops after the season.');
  assert.equal(coachPriceLine(greek), '$180 / month · Athletes pay 2 monthly payments ($360)');

  const spring = { price: 180, period: 'month', duration_weeks: 12 };
  assert.equal(passSeasonLine(spring), '12-week season · 3 monthly payments ($540 in all)');

  const odd = { price: 19.99, period: 'month', duration_weeks: 16 };
  assert.equal(passSeasonLine(odd), '16-week season · 4 monthly payments ($79.96 in all)');
});

test('a season of one payment reads as one price for the season', () => {
  const four = { price: 90, period: 'month', duration_weeks: 4 };
  assert.deepEqual(passPriceParts(four), { amount: '$90', unit: 'for the 4-week season' });
  assert.equal(passPriceText(four), '$90 for the 4-week season');
  assert.equal(passSeasonLine(four), 'One payment · nothing renews');
  assert.equal(checkoutChargeLine(four), '$90 today. One payment for the season.');
  assert.equal(coachPriceLine(four), '$90 / month · Athletes pay one payment ($90)');

  const year = { price: 900, period: 'year', duration_weeks: 52 };
  assert.equal(passPriceText(year), '$900 for the 52-week season');
  assert.equal(checkoutChargeLine(year), '$900 today. One payment for the season.');

  const twoYears = { price: 900, period: 'year', duration_weeks: 104 };
  assert.equal(passSeasonLine(twoYears), '104-week season · 2 yearly payments ($1,800 in all)');
  assert.equal(checkoutChargeLine(twoYears), '$900 today, then yearly: 2 payments in all. Billing stops after the season.');
});

test('an open pass is unchanged: every period until cancelled', () => {
  const open = { price: '20.00', period: 'month', duration_weeks: null };
  assert.equal(passBilling(open).kind, 'open');
  assert.equal(passBilling(open).totalCents, null);
  assert.deepEqual(passPriceParts(open), { amount: '$20', unit: '/ month' });
  assert.equal(passSeasonLine(open), null);
  assert.equal(checkoutChargeLine(open), 'Charged today, then every month until you cancel.');
  assert.equal(checkoutChargeLine({ price: 200, period: 'year' }), 'Charged today, then every year until you cancel.');
  assert.equal(coachPriceLine(open), '$20 / month · renews until the athlete cancels');
});

test('no price: nothing to sell, no payment words', () => {
  const unpriced = { price: '0.00', period: 'month', duration_weeks: 8 };
  assert.equal(passPriceParts(unpriced), null);
  assert.equal(passPriceText(unpriced), null);
  assert.equal(passSeasonLine(unpriced), '8-week season');
  assert.equal(coachPriceLine(unpriced), null);
  assert.equal(lengthChangeLine(unpriced, 12), null);
});

test('a new week count tells the coach what buyers pay from now on', () => {
  const greek = { price: 180, period: 'month', duration_weeks: 8 };
  assert.equal(lengthChangeLine(greek, 8), null);
  assert.equal(lengthChangeLine(greek, 9), 'The season becomes 9 weeks. Athletes who buy it from now on pay 3 monthly payments ($540) instead of 2 monthly payments ($360).');
  assert.equal(lengthChangeLine(greek, 6), 'The season becomes 6 weeks. Athletes who buy it still pay 2 monthly payments ($360).');
  assert.equal(lengthChangeLine({ price: 180, period: 'month', duration_weeks: 5 }, 4), 'The season becomes 4 weeks. Athletes who buy it from now on pay one payment ($180) instead of 2 monthly payments ($360).');
  // A dated block: the count is the most a buyer pays (one who joins after the start pays fewer).
  const dated = { price: 180, period: 'month', duration_weeks: 8, starts_on: '2026-12-01' };
  assert.equal(coachPriceLine(dated), '$180 / month · Athletes pay up to 2 monthly payments (up to $360); later joiners pay fewer');
  assert.equal(coachPriceLine({ ...dated, duration_weeks: 4 }), '$180 / month · Athletes pay one payment ($180)');
  assert.equal(lengthChangeLine(dated, 12), 'The season becomes 12 weeks. Athletes who buy it from now on pay up to 3 monthly payments (up to $540) instead of up to 2 monthly payments (up to $360).');
  assert.equal(lengthChangeLine({ price: 180, period: 'month' }, 9), null);
  assert.equal(lengthChangeLine(greek, 0), null);
});

const HOLDERS = ' A pass bought before seasons were billed a fixed number of payments may be billed by the new length too, so tell them before you publish.';

test('a new length that changes P names the athletes already paying (an unstamped subscription follows the plan)', () => {
  const greek = { price: 180, period: 'month', duration_weeks: 8 };
  const buyers = 'The season becomes 9 weeks. Athletes who buy it from now on pay 3 monthly payments ($540) instead of 2 monthly payments ($360).';
  assert.equal(lengthChangeLine(greek, 9, 0), buyers);
  assert.equal(lengthChangeLine(greek, 9, 1), `${buyers} 1 athlete pays for this pass now.${HOLDERS}`);
  assert.equal(lengthChangeLine(greek, 9, 3), `${buyers} 3 athletes pay for this pass now.${HOLDERS}`);
  // The paying count could not be read: said as unknown, never as nobody.
  assert.equal(lengthChangeLine(greek, 9, null), `${buyers} Athletes may already pay for this pass.${HOLDERS}`);
  // The same P for everyone, stamped or not: nothing to warn about.
  assert.equal(lengthChangeLine(greek, 6, 2), 'The season becomes 6 weeks. Athletes who buy it still pay 2 monthly payments ($360).');
  assert.equal(lengthChangeLine(greek, 6, null), 'The season becomes 6 weeks. Athletes who buy it still pay 2 monthly payments ($360).');
});

test('a length past what a season can be billed says the pass renews until cancelled, and back', () => {
  const greek = { price: 180, period: 'month', duration_weeks: 8 };
  assert.equal(lengthChangeLine(greek, 521, 0), 'The season becomes 521 weeks, longer than a season can be billed (520 weeks at most): athletes who buy it from now on are billed every month until they cancel, instead of 2 monthly payments ($360).');
  assert.equal(lengthChangeLine(greek, 600, 1), `The season becomes 600 weeks, longer than a season can be billed (520 weeks at most): athletes who buy it from now on are billed every month until they cancel, instead of 2 monthly payments ($360). 1 athlete pays for this pass now.${HOLDERS}`);
  const huge = { price: 10, period: 'month', duration_weeks: 600 };
  assert.equal(passBilling(huge).kind, 'open');
  assert.equal(lengthChangeLine(huge, 8, 0), 'The pass becomes a season of 8 weeks. Athletes who buy it from now on pay 2 monthly payments ($20) and then billing stops, instead of every month until they cancel.');
  assert.equal(lengthChangeLine(huge, 601, 5), null);
  assert.equal(lengthChangeLine({ price: 10, period: 'month', duration_weeks: 600 }, 600), null);
});

test('payingFor counts running subscriptions of one pass, null when unread', () => {
  const subs = [
    { plan_id: 'a', status: 'active' }, { plan_id: 'a', status: 'past_due' }, { plan_id: 'a', status: 'canceled' },
    { plan_id: 'a', status: 'incomplete' }, { plan_id: 'b', status: 'active' }, null,
  ];
  assert.equal(payingFor(subs, 'a'), 2);
  assert.equal(payingFor(subs, 'b'), 1);
  assert.equal(payingFor(subs, 'c'), 0);
  assert.equal(payingFor(null, 'a'), null);
  assert.equal(payingFor(undefined, 'a'), null);
});

const COACH = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const plans = [
  { id: 'p-greek', trainer_id: COACH, name: 'Greek' },
  { id: 'p-spring', trainer_id: COACH, name: 'Spring' },
  { id: 'p-else', trainer_id: OTHER, name: 'Elsewhere' },
];

test('Start another season: a completed season with this coach and no pass still running with them', () => {
  const enrollments = [
    { plan_id: 'p-spring', status: 'completed', completed_at: '2026-08-01T00:00:00Z' },
    { plan_id: 'p-greek', status: 'completed', completed_at: '2026-10-01T00:00:00Z' },
  ];
  assert.deepEqual(finishedSeason({ enrollments, coachPlans: plans, subscriptions: [], coachId: COACH }), { planId: 'p-greek', planName: 'Greek', paidInFull: false });
  const ended = [{ trainer_id: COACH, status: 'canceled' }, { trainer_id: COACH, status: 'incomplete' }, { trainer_id: COACH, status: 'incomplete_expired' }];
  assert.deepEqual(finishedSeason({ enrollments, coachPlans: plans, subscriptions: ended, coachId: COACH })?.planId, 'p-greek');
});

test('no offer while a pass with that coach still runs, for a season ended early, or another coach’s season', () => {
  const done = [{ plan_id: 'p-greek', status: 'completed', completed_at: '2026-10-01T00:00:00Z' }];
  for (const status of ['active', 'trialing', 'past_due', 'unpaid', 'paused']) {
    assert.equal(finishedSeason({ enrollments: done, coachPlans: plans, subscriptions: [{ trainer_id: COACH, status }], coachId: COACH }), null, status);
  }
  // A running pass with ANOTHER coach does not hide this coach's offer.
  assert.equal(finishedSeason({ enrollments: done, coachPlans: plans, subscriptions: [{ trainer_id: OTHER, status: 'active' }], coachId: COACH })?.planId, 'p-greek');
  for (const status of ['cancelled', 'active', 'paused']) {
    assert.equal(finishedSeason({ enrollments: [{ plan_id: 'p-greek', status }], coachPlans: plans, subscriptions: [], coachId: COACH }), null, status);
  }
  assert.equal(finishedSeason({ enrollments: [{ plan_id: 'p-else', status: 'completed' }], coachPlans: plans, subscriptions: [], coachId: COACH }), null);
  assert.equal(finishedSeason({ enrollments: done, coachPlans: plans, subscriptions: [], coachId: null }), null);
  assert.equal(finishedSeason({ enrollments: null, coachPlans: null, subscriptions: null, coachId: COACH }), null);
  assert.equal(holdsRunningPass(null, COACH), false);
});

test('a completed season on a plan without a name still offers, without inventing one', () => {
  const unnamed = [{ id: 'p-x', trainer_id: COACH, name: '  ' }];
  assert.deepEqual(finishedSeason({ enrollments: [{ plan_id: 'p-x', status: 'completed' }], coachPlans: unnamed, subscriptions: [], coachId: COACH }), { planId: 'p-x', planName: null, paidInFull: false });
});

test('"every payment is made" only from the server’s season_complete notice, never from the enrollment alone', () => {
  const season = { plan_id: 'p-greek', status: 'completed', started_at: '2026-09-08T10:00:00+00:00', completed_at: '2026-11-08T23:06:35+00:00' };
  const notice = { type: 'season_complete', created_at: '2026-11-08T23:07:00+00:00', metadata: { plan_id: 'p-greek', stripe_subscription_id: 'sub_1' } };
  const run = (notices, enrollments = [season]) => finishedSeason({ enrollments, coachPlans: plans, subscriptions: [{ trainer_id: COACH, status: 'canceled' }], coachId: COACH, notices });
  // The athlete marked it completed (finished or skipped the last node): an offer, no payment claim.
  assert.deepEqual(run([]), { planId: 'p-greek', planName: 'Greek', paidInFull: false });
  assert.deepEqual(run(undefined), { planId: 'p-greek', planName: 'Greek', paidInFull: false });
  // stripe-webhook wrote the notice after all P payments.
  assert.deepEqual(run([notice]), { planId: 'p-greek', planName: 'Greek', paidInFull: true });
  // A notice for another plan, another type, or with no plan does not count.
  assert.equal(run([{ ...notice, metadata: { plan_id: 'p-spring' } }]).paidInFull, false);
  assert.equal(run([{ ...notice, type: 'payment_issue' }]).paidInFull, false);
  assert.equal(run([{ ...notice, metadata: null }]).paidInFull, false);
  assert.equal(run([{ ...notice, created_at: null }]).paidInFull, false);
  // A notice from an earlier purchase of the same pass: the season was bought again (started later) and not paid in full.
  const again = { ...season, started_at: '2026-12-01T09:00:00+00:00', completed_at: '2027-01-10T00:00:00+00:00' };
  assert.equal(run([notice], [again]).paidInFull, false);
  assert.equal(run([notice, { ...notice, created_at: '2027-02-01T00:00:00+00:00' }], [again]).paidInFull, true);
  // A season with no recorded start still counts its notice.
  assert.equal(run([notice], [{ ...season, started_at: null }]).paidInFull, true);
  // A notice never makes an offer by itself, and never while a pass with the coach runs.
  assert.equal(run([notice], [{ ...season, status: 'cancelled' }]), null);
  assert.equal(finishedSeason({ enrollments: [season], coachPlans: plans, subscriptions: [{ trainer_id: COACH, status: 'active' }], coachId: COACH, notices: [notice] }), null);
});

test('Model B: the server’s total replaces the price from the card form on, the booking fee inside it', async () => {
  const { chargedTotal, checkoutChargeLine, passPriceParts, passPriceText, passSeasonLine } = await import('./season.js');
  assert.equal(chargedTotal(null), null);
  assert.equal(chargedTotal({ clientSecret: 'x' }), null);
  assert.equal(chargedTotal({ amountCents: 0 }), null);
  assert.equal(chargedTotal({ amountCents: '19200' }), null);
  assert.deepEqual(chargedTotal({ amountCents: 19200, bookingFeeCents: 1200 }), { cents: 19200, bookingCents: 1200 });
  assert.deepEqual(chargedTotal({ amountCents: 19200, bookingFeeCents: 99999 }), { cents: 19200, bookingCents: 0 });
  const total = chargedTotal({ amountCents: 19200, bookingFeeCents: 1200 });
  const season = { price: 180, period: 'month', duration_weeks: 8 };
  assert.equal(passPriceParts(season, total).amount, '$192');
  assert.equal(passPriceText(season, total), '$192 / month');
  assert.equal(passSeasonLine(season, total), '8-week season · 2 monthly payments ($384 in all)');
  assert.equal(checkoutChargeLine(season, total), '$192 (includes a $12 booking fee) today, then monthly: 2 payments in all. Billing stops after the season.');
  const open = { price: 180, period: 'month' };
  assert.equal(checkoutChargeLine(open, total), '$192 (includes a $12 booking fee) today, then every month until you cancel.');
  const one = { price: 90, period: 'month', duration_weeks: 4 };
  assert.equal(checkoutChargeLine(one, chargedTotal({ amountCents: 10200, bookingFeeCents: 1200 })), '$102 (includes a $12 booking fee) today. One payment for the season.');
  // Without a total nothing moves.
  assert.equal(checkoutChargeLine(open), 'Charged today, then every month until you cancel.');
  assert.equal(passPriceText(season), '$180 / month');
});

// fitlink-app tests/blocks.test.ts "a dated block's installments never fall after it has ended (datedBlockPayments,
// owner decision 2026-10-25)": the same cases, the same answers.
test('a dated block: payments counted from the purchase, none after the block has ended (the server\'s table)', () => {
  // Winter block: Dec 1 2026 (12:00 UTC), 8 weeks, ends Jan 26 2027 12:00 UTC. Monthly price.
  const winter = { startsOn: '2026-12-01', weeks: 8, period: 'month' };
  const at = (y, m, d, h = 15) => Date.UTC(y, m, d, h);
  const cases = [
    ['bought a month before it starts (the next payment moves to Jan 1)', 2, at(2026, 10, 1)],
    ['bought on day 1, before 12:00 UTC (still before the start: anchored on the start)', 2, at(2026, 11, 1, 9)],
    ['bought on day 1, after the start (Dec 1, Jan 1)', 2, at(2026, 11, 1)],
    ['bought mid-block, Dec 15 (Dec 15, Jan 15)', 2, at(2026, 11, 15)],
    ['bought Dec 29 (Jan 29 is after the end)', 1, at(2026, 11, 29)],
    ['bought in the last week, Jan 20', 1, at(2027, 0, 20)],
  ];
  for (const [label, n, purchaseMs] of cases) assert.equal(datedBlockPayments({ ...winter, purchaseMs }), n, label);

  // Never more than an undated block of the same length (P), never fewer than 1; null for an undated or open pass.
  assert.equal(datedBlockPayments({ startsOn: '2027-02-01', weeks: 13, period: 'month', purchaseMs: at(2027, 0, 10) }), 3);
  assert.equal(datedBlockPayments({ startsOn: '2026-12-01', weeks: 4, period: 'month', purchaseMs: at(2026, 10, 1) }), 1);
  assert.equal(datedBlockPayments({ startsOn: '2026-12-01', weeks: 52, period: 'year', purchaseMs: at(2026, 10, 1) }), 1);
  assert.equal(datedBlockPayments({ startsOn: '2026-12-01', weeks: 12, period: 'month', purchaseMs: at(2026, 10, 1) }), 3);
  assert.equal(datedBlockPayments({ startsOn: '2026-12-01', weeks: 12, period: 'month', purchaseMs: at(2027, 0, 10) }), 2);
  assert.equal(datedBlockPayments({ startsOn: null, weeks: 8, period: 'month', purchaseMs: at(2026, 10, 1) }), null);
  assert.equal(datedBlockPayments({ startsOn: '2026-12-01', weeks: null, period: 'month', purchaseMs: at(2026, 10, 1) }), null);
});

test('addIntervals counts from the anchor itself (the 31st bills on the 31st again); planDayMs reads real days only', () => {
  const iso = (ms) => new Date(ms).toISOString();
  assert.equal(iso(addIntervals(Date.UTC(2027, 0, 31, 12), 'month', 1)), '2027-02-28T12:00:00.000Z');
  assert.equal(iso(addIntervals(Date.UTC(2027, 0, 31, 12), 'month', 2)), '2027-03-31T12:00:00.000Z');
  assert.equal(iso(addIntervals(Date.UTC(2026, 11, 1, 12), 'year', 2)), '2028-12-01T12:00:00.000Z');
  assert.equal(planDayMs('2026-12-01'), Date.UTC(2026, 11, 1, 12));
  for (const bad of ['2026-02-30', '2026-13-01', 'Dec 1', '', null, 20261201]) assert.equal(planDayMs(bad), null, String(bad));
});
