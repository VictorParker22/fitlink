// How a pass bills, for every page that shows a price or a season
// (fitlink-app `supabase/functions/_shared/season.ts`, owner decision 2026-10-17).
//
// A pass with plans.duration_weeks (a "season") is billed plans.price every
// plans.period (month, or year when period = 'year') for a FIXED number of
// payments P, then billing stops by itself. A pass without duration_weeks (an
// "open" pass) renews every period until it is cancelled.
//
//   P = seasonPayments(weeks, period)
//     month: max(1, ceil(weeks × 7 / 30.4375))      (30.4375 = 365.25 / 12)
//     year:  max(1, ceil(weeks × 7 / 365.25))
//
// create-subscription stamps P on the subscription from the plan as it is at
// purchase, so the number a page computes here is the one the server bills a
// buyer today, and a coach changing the season's length later does not change
// a stamped subscription. One bought before the stamp existed is billed by the
// plan as it is now (the server's seasonFor), so the editor says so when
// athletes already pay (lengthChangeLine). The price stays per period: "$X /
// month", never a one-off "$X once". Every other period value (a stray 'week') bills monthly,
// as create-subscription's planInterval does.
//
// Pure, no imports: `node --test src/web/season.test.js` loads it as it is and
// pins the server's table.

/** The longest season the server accepts (ten years); anything longer is an open pass. */
export const MAX_SEASON_WEEKS = 520;

/** plans.period → the interval create-subscription bills at: 'year', else 'month'. */
export function billingPeriod(period) {
  return period === 'year' ? 'year' : 'month';
}

/** A whole number of weeks 1..MAX_SEASON_WEEKS (a number or a digit string), else null. */
export function seasonWeeks(v) {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d{1,4}$/.test(v.trim()) ? Number(v.trim()) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= MAX_SEASON_WEEKS ? n : null;
}

/**
 * How many payments a season of `weeks` is billed in, every `period`. In
 * integers, as the server computes it (7 / 30.4375 = 112 / 487, 7 / 365.25 =
 * 28 / 1461). Null for anything that is not a season length.
 */
export function seasonPayments(weeks, period) {
  const w = seasonWeeks(weeks);
  if (w === null) return null;
  const p = billingPeriod(period) === 'year' ? Math.ceil((w * 28) / 1461) : Math.ceil((w * 112) / 487);
  return Math.max(1, p);
}

// ── A dated block (fitlink-app _shared/season.ts, launch plan Sprint 1 PR 4, 2026-10-25) ──
//
// A block with plans.starts_on is DATED: week 1 begins that day for every buyer. The first payment is taken at
// purchase; for a purchase before the start the next one moves to one interval after the start (the server's
// blockStartShiftDecision), and no installment falls after the block has ended (owner decision 2026-10-25). So a
// purchase is billed the count of its billing dates (the purchase, then anchor + k intervals, the anchor being the
// start for a purchase before it and the purchase otherwise) that fall before starts_on + weeks × 7 days, at least 1
// and never more than P. Before a purchase the page predicts the count with this port; after create-subscription
// answers, its `seasonPayments` is the truth (counted from the end of the server's idempotency hour).

/** The hour (UTC) a date-only plan day is placed at: noon UTC is the same calendar day from UTC-11 to UTC+11. */
export const PLAN_DAY_HOUR_UTC = 12;

const DAY_MS = 86_400_000;

/** A YYYY-MM-DD day → epoch ms at PLAN_DAY_HOUR_UTC, or null for anything that is not a real calendar day. */
export function planDayMs(day) {
  if (typeof day !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d, PLAN_DAY_HOUR_UTC);
  const back = new Date(ms);
  return back.getUTCFullYear() === y && back.getUTCMonth() === mo - 1 && back.getUTCDate() === d ? ms : null;
}

/**
 * `ms` plus k billing intervals counted from `ms` itself, the way Stripe counts them: the same day of the month (or
 * year), clamped to the last day of a shorter month, same time of day.
 */
export function addIntervals(ms, period, k) {
  const d = new Date(ms);
  const months = (billingPeriod(period) === 'year' ? 12 : 1) * Math.max(0, Math.floor(k));
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  return Date.UTC(y, mo, Math.min(d.getUTCDate(), lastDay), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
}

/** How many payments a purchase of a DATED block at `purchaseMs` makes (see above); null when it is not a dated block. */
export function datedBlockPayments({ startsOn, weeks, period, purchaseMs }) {
  const start = planDayMs(startsOn);
  const w = seasonWeeks(weeks);
  const p = seasonPayments(weeks, period);
  if (start === null || w === null || p === null || !Number.isFinite(purchaseMs)) return null;
  const end = start + w * 7 * DAY_MS;
  const anchor = start > purchaseMs ? start : purchaseMs;
  let count = 1;
  for (let k = 1; k < 1000 && addIntervals(anchor, period, k) < end; k++) count++;
  return Math.max(1, Math.min(count, p));
}

/** The price in whole cents create-subscription would charge (rules.ts planAmountCents), or null when there is none. */
export function priceCents(price) {
  const n = Math.round(Number(price) * 100);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** `$180`, `$1,080` or `$12.50` from cents: whole dollars when there are no cents. */
export function usdFromCents(cents) {
  const n = Math.max(0, Math.round(Number(cents) || 0));
  const whole = n % 100 === 0;
  return (n / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/**
 * create-subscription's own total for a Model B coach: `{ cents, bookingCents }`
 * from its answer's `amountCents` (what the athlete is charged each payment,
 * the booking fee inside it) and `bookingFeeCents`, or null when the answer
 * carries none (every other coach: the athlete pays plans.price). The page
 * shows this total and never adds a fee itself.
 */
export function chargedTotal(answer) {
  const cents = answer?.amountCents;
  if (typeof cents !== 'number' || !Number.isInteger(cents) || cents <= 0) return null;
  const booking = answer?.bookingFeeCents;
  const bookingCents = typeof booking === 'number' && Number.isInteger(booking) && booking > 0 && booking < cents ? booking : 0;
  return { cents, bookingCents };
}

/**
 * What a plan bills, from its own row: `{ kind: 'open' | 'season', period,
 * adverb, priced, priceCents, weeks, payments, totalCents }`. `totalCents` is
 * price × P for a priced season, null otherwise. `total` (chargedTotal) is the
 * server's per-payment amount when it differs from plans.price (Model B).
 */
export function passBilling(plan, total = null) {
  const period = billingPeriod(plan?.period);
  const adverb = period === 'year' ? 'yearly' : 'monthly';
  const cents = total?.cents ?? priceCents(plan?.price);
  const weeks = seasonWeeks(plan?.duration_weeks);
  const payments = weeks === null ? null : seasonPayments(weeks, period);
  return {
    kind: weeks === null ? 'open' : 'season',
    period,
    adverb,
    priced: cents !== null,
    priceCents: cents,
    weeks,
    payments,
    totalCents: cents !== null && payments !== null ? cents * payments : null,
  };
}

const paymentsWord = (p, adverb) => (p === 1 ? 'one payment' : `${p} ${adverb} payments`);

/**
 * The price block on a pass card: `{ amount, unit }`, or null for a pass
 * without a price. A season of one payment reads "$X for the 4-week season";
 * every other pass "$X / month" (or "/ year").
 */
export function passPriceParts(plan, total = null) {
  const b = passBilling(plan, total);
  if (!b.priced) return null;
  const amount = usdFromCents(b.priceCents);
  if (b.kind === 'season' && b.payments === 1) return { amount, unit: `for the ${b.weeks}-week season` };
  return { amount, unit: `/ ${b.period}` };
}

/** The price as one phrase (a sheet title): "$180 / month", "$90 for the 4-week season". */
export function passPriceText(plan, total = null) {
  const parts = passPriceParts(plan, total);
  return parts ? `${parts.amount} ${parts.unit}` : null;
}

/**
 * The line under a season's price on the athlete's side; null for an open
 * pass. "8-week season · 2 monthly payments ($360 in all)"; one payment:
 * "One payment · nothing renews"; a season with no price yet: "8-week season".
 */
export function passSeasonLine(plan, total = null) {
  const b = passBilling(plan, total);
  if (b.kind !== 'season') return null;
  if (!b.priced) return `${b.weeks}-week season`;
  if (b.payments === 1) return 'One payment · nothing renews';
  return `${b.weeks}-week season · ${paymentsWord(b.payments, b.adverb)} (${usdFromCents(b.totalCents)} in all)`;
}

/**
 * What the card is charged, under the card form (not for paying an amount
 * already owed). Open: "Charged today, then every month until you cancel."
 * Season: "$180 today, then monthly: 2 payments in all. Billing stops after
 * the season." One payment: "$90 today. One payment for the season."
 */
export function checkoutChargeLine(plan, total = null) {
  const b = passBilling(plan, total);
  // Model B: the amount is the server's total and the booking fee is said as part of it, never as a line of its own.
  const inside = total?.bookingCents ? ` (includes a ${usdFromCents(total.bookingCents)} booking fee)` : '';
  if (b.kind !== 'season' || !b.priced) {
    return total ? `${usdFromCents(b.priceCents)}${inside} today, then every ${b.period} until you cancel.` : `Charged today, then every ${b.period} until you cancel.`;
  }
  const today = usdFromCents(b.priceCents);
  if (b.payments === 1) return `${today}${inside} today. One payment for the season.`;
  return `${today}${inside} today, then ${b.adverb}: ${b.payments} payments in all. Billing stops after the season.`;
}

/** A season with a start day (plans.starts_on): an athlete who joins after it started pays fewer payments. */
const isDated = (plan, b) => b.kind === 'season' && planDayMs(plan?.starts_on) !== null;

/**
 * The coach's own line for a pass (the season editor). Season: "$180 / month ·
 * Athletes pay 2 monthly payments ($360)"; a dated block (a start day): "$180 /
 * month · Athletes pay up to 2 monthly payments (up to $360); later joiners
 * pay fewer" (datedBlockPayments counts from the purchase); open: "$20 / month
 * · renews until the athlete cancels"; no price: null.
 */
export function coachPriceLine(plan) {
  const b = passBilling(plan);
  if (!b.priced) return null;
  const per = `${usdFromCents(b.priceCents)} / ${b.period}`;
  if (b.kind !== 'season') return `${per} · renews until the athlete cancels`;
  if (isDated(plan, b) && b.payments > 1) {
    return `${per} · Athletes pay up to ${paymentsWord(b.payments, b.adverb)} (up to ${usdFromCents(b.totalCents)}); later joiners pay fewer`;
  }
  return `${per} · Athletes pay ${paymentsWord(b.payments, b.adverb)} (${usdFromCents(b.totalCents)})`;
}

/**
 * What publishing a new week count does to what athletes pay (the season
 * editor writes plans.duration_weeks after a publish, and only onto a pass
 * that has one). Null when nothing changes: no price, no length on the pass,
 * the same length, or an open pass that stays open.
 *
 * Buyers from then on are billed by the new length (create-subscription
 * stamps it). `paying` is how many athletes pay for the pass now (running
 * subscriptions, `payingFor`), or null when that could not be read: a
 * subscription bought before seasons were billed a fixed number of payments
 * carries no stamp, and the server then bills it by the plan as it is now
 * (fitlink-app _shared/season.ts seasonFor), so a change to P can reach them
 * too. Said as "may": the page cannot see which subscriptions carry a stamp.
 */
export function lengthChangeLine(plan, newWeeks, paying = 0) {
  const b = passBilling(plan);
  const n = Number(newWeeks);
  if (!b.priced || !plan?.duration_weeks || !Number.isInteger(n) || n < 1 || n === Number(plan.duration_weeks)) return null;
  const w = seasonWeeks(n);
  const p = w === null ? null : seasonPayments(w, b.period);
  // A dated block: the count is the most a buyer pays; one who joins after the start pays fewer.
  const upTo = planDayMs(plan?.starts_on) !== null;
  const pays = (count) => (upTo && count > 1
    ? `up to ${paymentsWord(count, b.adverb)} (up to ${usdFromCents(b.priceCents * count)})`
    : `${paymentsWord(count, b.adverb)} (${usdFromCents(b.priceCents * count)})`);
  let buyers;
  if (b.kind === 'season' && p !== null) {
    if (p === b.payments) return `The season becomes ${w} weeks. Athletes who buy it still pay ${pays(p)}.`;
    buyers = `The season becomes ${w} weeks. Athletes who buy it from now on pay ${pays(p)} instead of ${pays(b.payments)}.`;
  } else if (b.kind === 'season') {
    buyers = `The season becomes ${n} weeks, longer than a season can be billed (${MAX_SEASON_WEEKS} weeks at most): athletes who buy it from now on are billed every ${b.period} until they cancel, instead of ${pays(b.payments)}.`;
  } else if (p !== null) {
    buyers = `The pass becomes a season of ${w} weeks. Athletes who buy it from now on pay ${pays(p)} and then billing stops, instead of every ${b.period} until they cancel.`;
  } else {
    return null;
  }
  if (paying === 0) return buyers;
  const who = typeof paying === 'number' && paying > 0
    ? `${paying} athlete${paying === 1 ? ' pays' : 's pay'} for this pass now.`
    : 'Athletes may already pay for this pass.';
  return `${buyers} ${who} A pass bought before seasons were billed a fixed number of payments may be billed by the new length too, so tell them before you publish.`;
}

/**
 * A pass the athlete still holds: anything Stripe has not ended. 'incomplete'
 * (a checkout never paid) and 'incomplete_expired' / 'canceled' hold nothing.
 */
export const RUNNING_STATUSES = ['active', 'trialing', 'past_due', 'unpaid', 'paused'];

export function holdsRunningPass(subscriptions, coachId) {
  return (subscriptions ?? []).some((s) => s && s.trainer_id === coachId && RUNNING_STATUSES.includes(s.status));
}

/**
 * How many athletes pay for each pass now: subscriptions Stripe has not
 * ended (RUNNING_STATUSES), counted for `planId`. Null when the rows could not
 * be read (`subscriptions` null), so the editor says it does not know.
 */
export function payingFor(subscriptions, planId) {
  if (!Array.isArray(subscriptions)) return null;
  return subscriptions.filter((s) => s && s.plan_id === planId && RUNNING_STATUSES.includes(s.status)).length;
}

const msOf = (v) => (typeof v === 'string' || typeof v === 'number' ? Date.parse(String(v)) : NaN);

/**
 * "Start another season": the athlete's most recent season with this coach
 * that reads 'completed', while they hold no pass with that coach that is still
 * running. `coachPlans` are the coach's plans, archived ones included (the
 * season may be on a pass no longer for sale). Answers `{ planId, planName,
 * paidInFull }` or null.
 *
 * 'completed' alone is NOT a payment fact: the athlete writes it too (finishing
 * or skipping the last node; guard_enrollment_columns lets them move a season
 * between active and completed), whatever was paid. `paidInFull` is true only
 * with a 'season_complete' notice for that plan (`notices`, the athlete's own
 * notifications rows): only stripe-webhook inserts that type
 * (guard_notification_insert), after all P payments, once per subscription. A notice older than the season's
 * `started_at` belongs to an earlier purchase of the same pass and does not count.
 */
export function finishedSeason({ enrollments, coachPlans, subscriptions, coachId, notices }) {
  if (!coachId || holdsRunningPass(subscriptions, coachId)) return null;
  const plans = new Map((coachPlans ?? []).filter((p) => p && p.trainer_id === coachId).map((p) => [p.id, p]));
  const done = (enrollments ?? [])
    .filter((e) => e && e.status === 'completed' && plans.has(e.plan_id))
    .sort((a, b) => String(b.completed_at ?? '').localeCompare(String(a.completed_at ?? '')));
  if (done.length === 0) return null;
  const season = done[0];
  const plan = plans.get(season.plan_id);
  const name = typeof plan?.name === 'string' && plan.name.trim() ? plan.name.trim() : null;
  const started = msOf(season.started_at);
  const paidInFull = (notices ?? []).some((n) => {
    if (!n || n.type !== 'season_complete' || n.metadata?.plan_id !== season.plan_id) return false;
    const at = msOf(n.created_at);
    return Number.isFinite(at) && (!Number.isFinite(started) || at >= started);
  });
  return { planId: season.plan_id, planName: name, paidInFull };
}
