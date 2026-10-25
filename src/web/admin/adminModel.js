// The operator dashboard's view model (/admin, launch plan Sprint 1 PR 6): turns the three server answers
// (admin_scorecard, admin_coaches, admin_page_funnel; fitlink-app migration 20261025140000) into words and numbers.
// Real data or omitted: a value the server sent as null, or did not send, is never printed as 0 or 0%; the row says
// why there is no number instead. Money arrives in cents and is printed in dollars. Pure: `node --test
// src/web/admin/adminModel.test.js`.
import { SCORECARD_TARGETS, TARGET_COLUMNS } from './targets.js';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const num = (v) => (isNum(v) ? v : (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null));

/** Cents → "$1,234.56"; null for anything that is not a number. */
export function dollars(cents) {
  const n = num(cents);
  if (n === null) return null;
  return (Math.round(n) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** A count, "1,234"; null when absent. */
export function count(v) {
  const n = num(v);
  return n === null ? null : Math.round(n).toLocaleString('en-US');
}

/** A percentage the server already rounded: 12.5 → "12.5%", 100 → "100%"; null when absent. */
export function percent(v) {
  const n = num(v);
  if (n === null) return null;
  return `${Number.isInteger(n) ? n : Number(n.toFixed(1))}%`;
}

/**
 * Drop-off from the stage before, in words. null for the first stage or when the stage before had nobody (the server
 * sends null). Negative when this stage counted more than the one before (each stage is counted on its own).
 */
export function dropOffWords(v) {
  const n = num(v);
  if (n === null) return null;
  if (n < 0) return `${percent(-n)} more than the stage before`;
  return `${percent(n)} dropped off`;
}

/** "2026-10-01" → "October 2026" (UTC calendar month). null for anything else. */
export function monthLabel(iso) {
  const m = /^(\d{4})-(\d{2})/.exec(String(iso ?? ''));
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** A timestamp as "Oct 25, 2026" in UTC; null when absent or unreadable. */
export function dayLabel(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** "YYYY-MM-01" of the UTC month of `now`. */
export function monthKey(now = Date.now()) {
  const d = new Date(now);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/** The months the server answers for (2025-01 .. this month, UTC), newest first. */
export function monthOptions(now = Date.now(), first = '2025-01-01') {
  const out = [];
  const end = monthKey(now);
  let [y, m] = end.split('-').map(Number);
  const [fy, fm] = first.split('-').map(Number);
  while (y > fy || (y === fy && m >= fm)) {
    const key = `${y}-${String(m).padStart(2, '0')}-01`;
    out.push({ value: key, label: monthLabel(key) });
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
  }
  return out;
}

const get = (o, path) => path.reduce((x, k) => (x && typeof x === 'object' ? x[k] : undefined), o);

/**
 * One scorecard month's five numbers as display parts. Each metric: {key, label, value (string|null), detail
 * (string|null), empty (why there is no value, when value is null)}.
 */
export function monthMetrics(numbers) {
  const n = numbers && typeof numbers === 'object' ? numbers : {};
  const activated = count(get(n, ['coaches_activated', 'total']));
  const fresh = num(get(n, ['coaches_activated', 'new_this_month']));
  const perCoach = num(get(n, ['paying_athletes_per_coach', 'per_coach']));
  const athletes = num(get(n, ['paying_athletes_per_coach', 'athletes']));
  const coaches = num(get(n, ['paying_athletes_per_coach', 'coaches']));
  const gmv = dollars(get(n, ['gmv', 'gross_cents']));
  const payments = num(get(n, ['gmv', 'payments']));
  const refunds = num(get(n, ['gmv', 'refunds_cents']));
  const refundCount = num(get(n, ['gmv', 'refunds']));
  const pct = percent(get(n, ['month2_retention', 'pct']));
  const cohort = num(get(n, ['month2_retention', 'cohort']));
  const retained = num(get(n, ['month2_retention', 'retained']));
  const fees = dollars(get(n, ['platform_revenue', 'fees_cents']));
  const booking = num(get(n, ['platform_revenue', 'booking_fees_cents']));
  const commission = num(get(n, ['platform_revenue', 'commission_cents']));
  const unknown = num(get(n, ['platform_revenue', 'fee_unknown_payments']));
  const unknownGross = num(get(n, ['platform_revenue', 'fee_unknown_gross_cents']));
  const subs = get(n, ['platform_revenue', 'subscriptions_cents']);

  const plural = (k, one, many) => `${count(k)} ${k === 1 ? one : many}`;
  const revenueParts = [];
  if (commission !== null) revenueParts.push(`${dollars(commission)} commission`);
  if (booking !== null && booking > 0) revenueParts.push(`${dollars(booking)} booking fees`);
  const revenueNotes = [];
  if (unknown !== null && unknown > 0) {
    revenueNotes.push(`${plural(unknown, 'payment', 'payments')} (${dollars(unknownGross) ?? 'amount unknown'}) were recorded before fees were tracked and are not in this number.`);
  }
  if (!isNum(subs)) revenueNotes.push('Coach Elite subscriptions are not included (they are not in the database).');

  return [
    {
      key: 'coaches_activated',
      label: 'Coaches activated',
      value: activated,
      detail: fresh === null ? null : `${count(fresh)} new this month`,
      empty: activated === null ? 'The server sent no number.' : null,
    },
    {
      key: 'paying_athletes_per_coach',
      label: 'Paying athletes per coach',
      value: perCoach === null ? null : perCoach.toFixed(1),
      detail: athletes === null || coaches === null || coaches === 0 ? null
        : `${plural(athletes, 'athlete', 'athletes')} across ${plural(coaches, 'coach', 'coaches')}, last 30 days`,
      empty: perCoach === null ? 'No coach had a paying athlete in these 30 days.' : null,
    },
    {
      key: 'gmv',
      label: 'GMV',
      value: gmv,
      detail: [
        payments === null ? null : plural(payments, 'payment', 'payments'),
        refunds !== null && refunds > 0 ? `${dollars(refunds)} refunded (${plural(refundCount ?? 0, 'refund', 'refunds')}, not subtracted)` : null,
      ].filter(Boolean).join(' · ') || null,
      empty: gmv === null ? 'The server sent no number.' : null,
    },
    {
      key: 'month2_retention',
      label: 'Coach month-2 retention',
      value: pct,
      detail: pct === null || cohort === null || retained === null ? null : `${count(retained)} of ${count(cohort)}`,
      empty: pct === null ? (cohort === 0 ? 'No coach was activated the month before.' : 'The server sent no number.') : null,
    },
    {
      key: 'platform_revenue',
      label: 'Platform revenue',
      value: fees === null ? null : `${fees}`,
      qualifier: fees === null ? null : 'before Stripe fees',
      detail: revenueParts.length ? revenueParts.join(' · ') : null,
      notes: revenueNotes,
      empty: fees === null ? 'The server sent no number.' : null,
    },
  ];
}

/**
 * The scorecard: one row per metric with this month, the month before, the definition (the server's sentence) and
 * Victor's targets. `card` is admin_scorecard's answer.
 */
export function scorecardView(card, targets = SCORECARD_TARGETS) {
  const now = monthMetrics(card?.current);
  const before = monthMetrics(card?.previous);
  const defs = card?.definitions && typeof card.definitions === 'object' ? card.definitions : {};
  const rows = now.map((m, i) => ({
    ...m,
    previous: before[i],
    definition: typeof defs[m.key] === 'string' ? defs[m.key] : null,
    targets: TARGET_COLUMNS.map((c) => ({ label: c.label, text: targets?.[m.key]?.[c.key] ?? null })).filter((t) => t.text !== null),
  }));
  const notIn = card?.not_in_data && typeof card.not_in_data === 'object' ? card.not_in_data : {};
  return {
    month: monthLabel(card?.month),
    previousMonth: monthLabel(card?.previous_month),
    inProgress: card?.in_progress === true,
    asOf: dayLabel(card?.as_of),
    rows,
    paidPayment: typeof defs.paid_payment === 'string' ? defs.paid_payment : null,
    notInData: ['stripe_fees', 'subscriptions', 'venmo_leakage'].map((k) => notIn[k]).filter((s) => typeof s === 'string' && s),
  };
}

export const STAGE_LABELS = Object.freeze({
  page_view: 'Opened a coach page',
  pass_tap: 'Tapped a pass',
  checkout_start: 'Started checkout',
  paid: 'Paid',
});

/**
 * The page funnel: stages in the server's order with a bar width relative to the largest stage (0..100), the
 * drop-off in words and the share of page views. Top referrers / sources with their share of page-view sessions.
 */
export function funnelView(f) {
  const stages = Array.isArray(f?.stages) ? f.stages : [];
  const counts = stages.map((s) => num(s?.count));
  const max = Math.max(0, ...counts.filter((c) => c !== null));
  const views = num(stages.find((s) => s?.stage === 'page_view')?.count);
  const top = (list, key) => (Array.isArray(list) ? list : []).map((r) => ({
    name: typeof r?.[key] === 'string' && r[key] ? r[key] : null,
    sessions: num(r?.sessions),
  })).filter((r) => r.sessions !== null).map((r) => ({
    label: r.name ?? (key === 'host' ? 'No referrer' : 'No UTM source'),
    none: r.name === null,
    sessions: count(r.sessions),
    share: views ? percent(Math.round((1000 * r.sessions) / views) / 10) : null,
  }));
  return {
    days: num(f?.days),
    pagesViewed: count(f?.pages_viewed),
    empty: views === 0 || views === null,
    stages: stages.map((s, i) => ({
      key: String(s?.stage ?? i),
      label: STAGE_LABELS[s?.stage] ?? String(s?.stage ?? ''),
      count: count(counts[i]),
      unit: s?.unit === 'subscriptions' ? (counts[i] === 1 ? 'subscription' : 'subscriptions') : (counts[i] === 1 ? 'session' : 'sessions'),
      bar: counts[i] !== null && max > 0 ? Math.round((100 * counts[i]) / max) : 0,
      dropOff: dropOffWords(s?.drop_off_pct),
      ofViews: i === 0 ? null : percent(s?.of_views_pct),
    })),
    referrers: top(f?.top_referrers, 'host'),
    sources: top(f?.top_utm_sources, 'source'),
  };
}

const TIER_LABELS = Object.freeze({ free: 'Free', elite: 'Elite', founding: 'Founding' });
const ELITE_SOURCES = Object.freeze({ web: 'web', app: 'App Store', both: 'web + App Store' });

/** The coach table: one row per coach, every figure formatted, nothing invented for a missing value. */
export function coachRows(answer) {
  const list = Array.isArray(answer?.coaches) ? answer.coaches : [];
  return list.map((c) => {
    const tier = TIER_LABELS[c?.tier] ?? null;
    const status = [
      tier,
      tier === 'Elite' && ELITE_SOURCES[c?.elite_source] ? `(${ELITE_SOURCES[c.elite_source]})` : null,
      c?.founding === 'active' && tier !== 'Founding' ? 'Founding' : null,
      c?.founding === 'suspended' ? 'Founding suspended' : null,
      c?.founding === 'ended' ? 'Founding year over' : null,
    ].filter(Boolean).join(' ');
    const page = c?.page && typeof c.page === 'object' ? c.page : {};
    return {
      id: String(c?.id ?? ''),
      name: typeof c?.name === 'string' && c.name.trim() ? c.name.trim() : 'Unnamed coach',
      handle: typeof c?.handle === 'string' && c.handle ? `/c/${c.handle}` : null,
      activated: dayLabel(c?.activated_at) ?? 'Not yet',
      athletes: count(c?.paying_athletes_30d) ?? '—',
      gmv: dollars(c?.gmv_cents) ?? '—',
      payments: count(c?.payments) ?? '—',
      status: status || '—',
      funnel: ['page_view', 'pass_tap', 'checkout_start', 'paid'].map((k) => count(page[k]) ?? '—').join(' → '),
    };
  });
}

/** The line above the coach table. */
export function coachSummary(answer) {
  const days = num(answer?.days);
  const listed = num(answer?.listed);
  const total = num(answer?.total_coaches);
  if (listed === null || total === null) return null;
  const parts = [`${count(listed)} of ${count(total)} coach accounts listed (a public page, a paid payment, or a page visit${days ? ` in the last ${days} days` : ''}).`];
  if (answer?.truncated === true) parts.push('Only the first 500 are shown.');
  return parts.join(' ');
}

/** The windows the funnel and the coach table can be read over. */
export const WINDOWS = Object.freeze([7, 30, 90]);
