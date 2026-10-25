// node --test src/web/admin/adminModel.test.js — the operator dashboard's view model (/admin).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  coachRows, coachSummary, count, dayLabel, dollars, dropOffWords, funnelView, monthKey, monthLabel, monthMetrics,
  monthOptions, percent, scorecardView,
} from './adminModel.js';
import { SCORECARD_TARGETS } from './targets.js';

// The fitlink-app proof's April 2026 numbers (supabase/security/admin_dashboard.sql), as the server answers them.
const APRIL = {
  month: '2026-04-01', as_of: '2026-05-01T00:00:00+00:00',
  coaches_activated: { total: 2, new_this_month: 0 },
  paying_athletes_per_coach: { per_coach: 2.0, athletes: 4, coaches: 2, window_start: '2026-04-01T00:00:00+00:00', window_end: '2026-05-01T00:00:00+00:00' },
  gmv: { gross_cents: 24200, payments: 5, refunds_cents: 3000, refunds: 1 },
  month2_retention: { cohort: 1, retained: 1, pct: 100.0 },
  platform_revenue: { fees_cents: 2160, booking_fees_cents: 1200, commission_cents: 960, subscriptions_cents: null, fee_unknown_payments: 2, fee_unknown_gross_cents: 7000 },
};
const MARCH = {
  month: '2026-03-01', as_of: '2026-04-01T00:00:00+00:00',
  coaches_activated: { total: 2, new_this_month: 1 },
  paying_athletes_per_coach: { per_coach: 2.0, athletes: 2, coaches: 1 },
  gmv: { gross_cents: 8500, payments: 3, refunds_cents: 0, refunds: 0 },
  month2_retention: { cohort: 1, retained: 0, pct: 0.0 },
  platform_revenue: { fees_cents: 850, booking_fees_cents: 0, commission_cents: 850, subscriptions_cents: null, fee_unknown_payments: 0, fee_unknown_gross_cents: 0 },
};
const CARD = {
  month: '2026-04-01', previous_month: '2026-03-01', in_progress: false, as_of: '2026-05-01T00:00:00+00:00',
  current: APRIL, previous: MARCH,
  definitions: {
    coaches_activated: 'Coaches with at least one paid athlete payment …', paying_athletes_per_coach: 'Distinct athletes …',
    gmv: 'Everything athletes were charged …', month2_retention: 'Of the coaches …', platform_revenue: 'Fees the platform took …',
    paid_payment: 'A payments row that succeeded …',
  },
  not_in_data: { stripe_fees: 'Stripe fees line.', subscriptions: 'Subscriptions line.', venmo_leakage: 'Venmo line.' },
};

test('cents become dollars; anything else is no number, never $0.00', () => {
  assert.equal(dollars(24200), '$242.00');
  assert.equal(dollars(123456789), '$1,234,567.89');
  assert.equal(dollars(0), '$0.00');
  assert.equal(dollars('960'), '$9.60');
  for (const v of [null, undefined, 'abc', NaN, {}]) assert.equal(dollars(v), null);
});

test('counts and percentages; null stays null', () => {
  assert.equal(count(1234), '1,234');
  assert.equal(count(null), null);
  assert.equal(percent(100), '100%');
  assert.equal(percent(12.5), '12.5%');
  assert.equal(percent(0), '0%');
  assert.equal(percent(null), null);
});

test('drop-off words: none for the first stage, negative said as more', () => {
  assert.equal(dropOffWords(null), null);
  assert.equal(dropOffWords(50), '50% dropped off');
  assert.equal(dropOffWords(0), '0% dropped off');
  assert.equal(dropOffWords(-100), '100% more than the stage before');
});

test('months: labels, the key of now, the picker from 2025-01 newest first', () => {
  assert.equal(monthLabel('2026-04-01'), 'April 2026');
  assert.equal(monthLabel(null), null);
  assert.equal(monthKey(Date.parse('2026-10-31T23:59:59Z')), '2026-10-01');
  assert.equal(monthKey(Date.parse('2026-11-01T00:00:00Z')), '2026-11-01');
  const opts = monthOptions(Date.parse('2026-10-25T12:00:00Z'));
  assert.equal(opts[0].value, '2026-10-01');
  assert.equal(opts[0].label, 'October 2026');
  assert.equal(opts.at(-1).value, '2025-01-01');
  assert.equal(opts.length, 22);
  assert.equal(dayLabel('2026-09-15T12:43:33Z'), 'Sep 15, 2026');
  assert.equal(dayLabel(null), null);
});

test("April's scorecard reads the server's numbers, with March beside them and Victor's targets", () => {
  const v = scorecardView(CARD);
  assert.equal(v.month, 'April 2026');
  assert.equal(v.previousMonth, 'March 2026');
  assert.equal(v.inProgress, false);
  assert.deepEqual(v.rows.map((r) => r.key), ['coaches_activated', 'paying_athletes_per_coach', 'gmv', 'month2_retention', 'platform_revenue']);
  const [act, per, gmv, ret, rev] = v.rows;
  assert.equal(act.value, '2');
  assert.equal(act.detail, '0 new this month');
  assert.equal(act.previous.value, '2');
  assert.equal(per.value, '2.0');
  assert.equal(per.detail, '4 athletes across 2 coaches, last 30 days');
  assert.equal(gmv.value, '$242.00');
  assert.equal(gmv.detail, '5 payments · $30.00 refunded (1 refund, not subtracted)');
  assert.equal(gmv.previous.value, '$85.00');
  assert.equal(gmv.previous.detail, '3 payments');
  assert.equal(ret.value, '100%');
  assert.equal(ret.detail, '1 of 1');
  assert.equal(ret.previous.value, '0%');
  assert.equal(ret.previous.detail, '0 of 1');
  assert.equal(rev.value, '$21.60');
  assert.equal(rev.qualifier, 'before Stripe fees');
  assert.equal(rev.detail, '$9.60 commission · $12.00 booking fees');
  assert.deepEqual(rev.notes, [
    '2 payments ($70.00) were recorded before fees were tracked and are not in this number.',
    'Coach Elite subscriptions are not included (they are not in the database).',
  ]);
  assert.equal(act.definition, 'Coaches with at least one paid athlete payment …');
  assert.deepEqual(gmv.targets, [{ label: 'Week 4', text: '$8,000' }, { label: 'Dec 31', text: '$30,000' }]);
  assert.deepEqual(ret.targets, [{ label: 'Week 4', text: '—' }, { label: 'Dec 31', text: '100% of the five' }]);
  assert.deepEqual(v.notInData, ['Stripe fees line.', 'Subscriptions line.', 'Venmo line.']);
  assert.equal(v.paidPayment, 'A payments row that succeeded …');
});

test("the targets are Victor's numbers from the plan", () => {
  assert.deepEqual(SCORECARD_TARGETS, {
    coaches_activated: { week4: '5', dec31: '9' },
    paying_athletes_per_coach: { week4: '5', dec31: '8' },
    gmv: { week4: '$8,000', dec31: '$30,000' },
    month2_retention: { week4: '—', dec31: '100% of the five' },
    platform_revenue: { week4: '$450', dec31: '$1,800' },
  });
});

test('missing numbers are omitted with a reason, never printed as zero', () => {
  const empty = monthMetrics({
    coaches_activated: { total: 0, new_this_month: 0 },
    paying_athletes_per_coach: { per_coach: null, athletes: 0, coaches: 0 },
    gmv: { gross_cents: 0, payments: 0, refunds_cents: 0, refunds: 0 },
    month2_retention: { cohort: 0, retained: 0, pct: null },
    platform_revenue: { fees_cents: 0, booking_fees_cents: 0, commission_cents: 0, subscriptions_cents: null, fee_unknown_payments: 0, fee_unknown_gross_cents: 0 },
  });
  const by = Object.fromEntries(empty.map((m) => [m.key, m]));
  assert.equal(by.paying_athletes_per_coach.value, null);
  assert.equal(by.paying_athletes_per_coach.empty, 'No coach had a paying athlete in these 30 days.');
  assert.equal(by.paying_athletes_per_coach.detail, null);
  assert.equal(by.month2_retention.value, null);
  assert.equal(by.month2_retention.empty, 'No coach was activated the month before.');
  assert.equal(by.coaches_activated.value, '0');
  assert.equal(by.gmv.value, '$0.00');
  // A whole answer missing (a failed or partial read) gives no number anywhere.
  for (const m of monthMetrics(undefined)) {
    assert.equal(m.value, null, m.key);
    assert.ok(m.empty, m.key);
  }
  // A month whose fees are all recorded says nothing about unknown fees.
  const known = monthMetrics(MARCH).find((m) => m.key === 'platform_revenue');
  assert.deepEqual(known.notes, ['Coach Elite subscriptions are not included (they are not in the database).']);
  assert.equal(known.detail, '$8.50 commission');
});

test('the funnel: stages in order, bars relative to the largest, drop-off and share of views, sources counted', () => {
  const v = funnelView({
    days: 30, pages_viewed: 2,
    stages: [
      { stage: 'page_view', count: 4, unit: 'sessions', drop_off_pct: null, of_views_pct: 100 },
      { stage: 'pass_tap', count: 2, unit: 'sessions', drop_off_pct: 50.0, of_views_pct: 50.0 },
      { stage: 'checkout_start', count: 1, unit: 'sessions', drop_off_pct: 50.0, of_views_pct: 25.0 },
      { stage: 'paid', count: 1, unit: 'subscriptions', drop_off_pct: 0.0, of_views_pct: 25.0 },
    ],
    top_referrers: [{ host: 'instagram.com', sessions: 2 }, { host: 'linktr.ee', sessions: 1 }, { host: null, sessions: 1 }],
    top_utm_sources: [{ source: 'ig', sessions: 2 }, { source: null, sessions: 2 }],
  });
  assert.equal(v.empty, false);
  assert.deepEqual(v.stages.map((s) => s.label), ['Opened a coach page', 'Tapped a pass', 'Started checkout', 'Paid']);
  assert.deepEqual(v.stages.map((s) => s.bar), [100, 50, 25, 25]);
  assert.deepEqual(v.stages.map((s) => s.dropOff), [null, '50% dropped off', '50% dropped off', '0% dropped off']);
  assert.deepEqual(v.stages.map((s) => s.ofViews), [null, '50%', '25%', '25%']);
  assert.deepEqual(v.stages.map((s) => s.unit), ['sessions', 'sessions', 'session', 'subscription']);
  assert.deepEqual(v.referrers.map((r) => [r.label, r.sessions, r.share]), [['instagram.com', '2', '50%'], ['linktr.ee', '1', '25%'], ['No referrer', '1', '25%']]);
  assert.deepEqual(v.sources.map((r) => [r.label, r.none]), [['ig', false], ['No UTM source', true]]);
});

test('an empty funnel has no bars and no percentages', () => {
  const v = funnelView({
    days: 7, pages_viewed: 0,
    stages: ['page_view', 'pass_tap', 'checkout_start', 'paid'].map((stage) => ({ stage, count: 0, drop_off_pct: null, of_views_pct: null })),
    top_referrers: [], top_utm_sources: [],
  });
  assert.equal(v.empty, true);
  assert.deepEqual(v.stages.map((s) => [s.bar, s.dropOff, s.ofViews]), Array(4).fill([0, null, null]));
  assert.deepEqual(v.referrers, []);
});

test('coach rows: dollars, dates, tier words, the funnel in one line; nothing invented', () => {
  const rows = coachRows({
    days: 30, listed: 2, total_coaches: 21, truncated: false,
    coaches: [
      { id: 'a', name: 'Jimmy', handle: 'jimmy-lifts', activated_at: '2026-09-15T12:43:33Z', paying_athletes_30d: 2, gmv_cents: 14200, payments: 2, tier: 'elite', elite_source: 'web', founding: null, page: { page_view: 2, pass_tap: 1, checkout_start: 1, paid: 1 } },
      { id: 'y', name: '  ', handle: null, activated_at: null, paying_athletes_30d: 0, gmv_cents: 0, payments: 0, tier: 'founding', elite_source: null, founding: 'active', page: {} },
    ],
  });
  assert.deepEqual(rows[0], {
    id: 'a', name: 'Jimmy', handle: '/c/jimmy-lifts', activated: 'Sep 15, 2026', athletes: '2', gmv: '$142.00', payments: '2',
    status: 'Elite (web)', funnel: '2 → 1 → 1 → 1',
  });
  assert.equal(rows[1].name, 'Unnamed coach');
  assert.equal(rows[1].activated, 'Not yet');
  assert.equal(rows[1].status, 'Founding');
  assert.equal(rows[1].funnel, '— → — → — → —');
  assert.equal(coachSummary({ days: 30, listed: 2, total_coaches: 21, truncated: false }),
    '2 of 21 coach accounts listed (a public page, a paid payment, or a page visit in the last 30 days).');
  assert.match(coachSummary({ days: 30, listed: 500, total_coaches: 900, truncated: true }), /Only the first 500 are shown\.$/);
  assert.equal(coachSummary({}), null);
});
