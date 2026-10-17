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
 * What a plan bills, from its own row: `{ kind: 'open' | 'season', period,
 * adverb, priced, priceCents, weeks, payments, totalCents }`. `totalCents` is
 * price × P for a priced season, null otherwise.
 */
export function passBilling(plan) {
  const period = billingPeriod(plan?.period);
  const adverb = period === 'year' ? 'yearly' : 'monthly';
  const cents = priceCents(plan?.price);
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
export function passPriceParts(plan) {
  const b = passBilling(plan);
  if (!b.priced) return null;
  const amount = usdFromCents(b.priceCents);
  if (b.kind === 'season' && b.payments === 1) return { amount, unit: `for the ${b.weeks}-week season` };
  return { amount, unit: `/ ${b.period}` };
}

/** The price as one phrase (a sheet title): "$180 / month", "$90 for the 4-week season". */
export function passPriceText(plan) {
  const parts = passPriceParts(plan);
  return parts ? `${parts.amount} ${parts.unit}` : null;
}

/**
 * The line under a season's price on the athlete's side; null for an open
 * pass. "8-week season · 2 monthly payments ($360 in all)"; one payment:
 * "One payment · nothing renews"; a season with no price yet: "8-week season".
 */
export function passSeasonLine(plan) {
  const b = passBilling(plan);
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
export function checkoutChargeLine(plan) {
  const b = passBilling(plan);
  if (b.kind !== 'season' || !b.priced) return `Charged today, then every ${b.period} until you cancel.`;
  const today = usdFromCents(b.priceCents);
  if (b.payments === 1) return `${today} today. One payment for the season.`;
  return `${today} today, then ${b.adverb}: ${b.payments} payments in all. Billing stops after the season.`;
}

/**
 * The coach's own line for a pass (the season editor). Season: "$180 / month ·
 * Athletes pay 2 monthly payments ($360)"; open: "$20 / month · renews until
 * the athlete cancels"; no price: null.
 */
export function coachPriceLine(plan) {
  const b = passBilling(plan);
  if (!b.priced) return null;
  const per = `${usdFromCents(b.priceCents)} / ${b.period}`;
  if (b.kind !== 'season') return `${per} · renews until the athlete cancels`;
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
  const pays = (count) => `${paymentsWord(count, b.adverb)} (${usdFromCents(b.priceCents * count)})`;
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
