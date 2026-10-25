// What a pass is, in words, for the coach's page, the checkout and the season editor
// (launch plan Sprint 1 PR 4, 2026-10-25; fitlink-app migration 20261025120000, `_shared/blocks.ts`,
// `_shared/season.ts`, rollout `supabase/manual/ROLLOUT_20261025_blocks.md`).
//
//   plans.kind 'block'    a season with a length (duration_weeks): billed plans.price every month (year when
//                         period = 'year') for P payments, then billing stops (season.js). With starts_on it is
//                         DATED: week 1 begins that day for everyone, on sale from 90 days before it until the end
//                         of its last sign-up day (enrollment_closes, else the day before it starts; a day ends when
//                         it has ended everywhere, 12:00 UTC the next day). A block with no length is the open pass
//                         that renews until cancelled (every pass sold before the change).
//   plans.kind 'session'  ONE payment, an appointment at session_at (optional: "time arranged with the coach") for
//                         session_minutes. Sold until it starts. The athlete cancels for a full refund up to 24 hours
//                         before (cancel-session, in the apps); inside that the coach's own policy applies
//                         (trainers_public.cancellation_policy, shown on the coach's page).
//
// The kind is fixed once the pass exists (guard_plan_shape kind_fixed). Every number comes from the server's config
// (site/pricing.js) or the server's formulas (season.js); after a purchase starts, create-subscription's
// `seasonPayments` is how many payments it makes, never this page's prediction.
//
// Dates: a block's days are calendar days (shown with timeZone UTC so Dec 1 is Dec 1 everywhere, the server's noon
// rule); a session's time is an instant, shown in the viewer's own zone. A date more than ~6 months from today carries
// its year (the iOS client's dateText rule).
import {
  BLOCK_DEFAULT_WEEKS, BLOCK_SALE_OPENS_DAYS_BEFORE, MINIMUM_CHARGE_USD, SESSION_FREE_CANCEL_HOURS,
} from './site/pricing.js';
import { BRAND_NAME } from './site/brand.js';
import {
  MAX_SEASON_WEEKS, billingPeriod, checkoutChargeLine, datedBlockPayments, passBilling, planDayMs,
  priceCents, seasonPayments, seasonWeeks, usdFromCents,
} from './season.js';

export { BLOCK_DEFAULT_WEEKS, SESSION_FREE_CANCEL_HOURS };

const DAY_MS = 86_400_000;
/** A date further than this from today carries its year. */
const YEAR_SHOWN_AFTER_DAYS = 183;

/** plans.kind: 'session', else a block (every pass sold before 2026-10-25 is a block). */
export function passKind(plan) {
  return plan?.kind === 'session' ? 'session' : 'block';
}

/** A block with a length and a start day: week 1 is starts_on for everyone. */
export function isDatedBlock(plan) {
  return passKind(plan) === 'block' && seasonWeeks(plan?.duration_weeks) !== null && planDayMs(plan?.starts_on) !== null;
}

const dayString = (ms) => new Date(ms).toISOString().slice(0, 10);

/** The last day of a dated block (YYYY-MM-DD): starts_on + weeks × 7 − 1. */
export function blockLastDay(plan) {
  const start = planDayMs(plan?.starts_on);
  const weeks = seasonWeeks(plan?.duration_weeks);
  if (start === null || weeks === null) return null;
  return dayString(start + (weeks * 7 - 1) * DAY_MS);
}

/** The last day a dated block can be bought: enrollment_closes, else the day before it starts. */
export function lastSignUpDay(plan) {
  const start = planDayMs(plan?.starts_on);
  if (start === null) return null;
  const closes = planDayMs(plan?.enrollment_closes);
  return dayString(closes ?? start - DAY_MS);
}

/** The first day a dated block is on sale (YYYY-MM-DD): BLOCK_SALE_OPENS_DAYS_BEFORE days before its start. */
export function saleOpensDay(plan) {
  const start = planDayMs(plan?.starts_on);
  return start === null ? null : dayString(start - BLOCK_SALE_OPENS_DAYS_BEFORE * DAY_MS);
}

const isoMs = (v) => {
  if (typeof v !== 'string' || v.trim() === '') return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
};

/**
 * Whether create-subscription sells this pass now (its blockSale, beside the price, payouts and archive checks):
 * `{ open: true }`, or `{ open: false, code, day }` with code `session_over` (the session started), `block_closed`
 * (past the end of the last sign-up day; `day` = that day) or `block_not_open` (more than 90 days before the start;
 * `day` = the first day on sale).
 */
export function saleState(plan, nowMs) {
  if (passKind(plan) === 'session') {
    const at = isoMs(plan?.session_at);
    return at !== null && at <= nowMs ? { open: false, code: 'session_over', day: null } : { open: true };
  }
  const start = planDayMs(plan?.starts_on);
  if (start === null) return { open: true };
  const last = lastSignUpDay(plan);
  if (nowMs >= planDayMs(last) + DAY_MS) return { open: false, code: 'block_closed', day: last };
  if (nowMs < start - BLOCK_SALE_OPENS_DAYS_BEFORE * DAY_MS) return { open: false, code: 'block_not_open', day: saleOpensDay(plan) };
  return { open: true };
}

const MIN_CENTS = Math.round(MINIMUM_CHARGE_USD * 100);

/**
 * A pass priced above zero but under the minimum charge (the server's guard_plan_minimum keeps new ones out, but passes
 * made before it exist: live has $1, $5 and $20 ones). create-subscription refuses a new purchase of it (409
 * below_minimum), so no page offers to buy it.
 */
export function belowMinimum(plan) {
  const c = priceCents(plan?.price);
  return c !== null && c < MIN_CENTS;
}

/**
 * Whether a page may offer this pass for sale now, by what the page can read: priced, at least the minimum, inside its
 * sale window. `{ ok: true }` or `{ ok: false, code, sentence }` with create-subscription's code (plan_unpriced,
 * below_minimum, session_over, block_closed, block_not_open) and a sentence for a person (no trailing "Nothing was
 * changed."). The server judges again (athlete-exit with the planId, then create-subscription).
 */
export function saleCheck(plan, nowMs, { first = 'your coach', locale = undefined } = {}) {
  const name = typeof plan?.name === 'string' && plan.name.trim() ? plan.name.trim() : 'This pass';
  if (priceCents(plan?.price) === null) {
    return { ok: false, code: 'plan_unpriced', sentence: `This pass has no price set, so it can’t be bought yet. Ask ${first} to set one.` };
  }
  if (belowMinimum(plan)) return { ok: false, code: 'below_minimum', sentence: `${name} is no longer on sale. Ask ${first}.` };
  const notOnSale = notOnSaleSentence(plan, nowMs, locale);
  if (notOnSale) return { ok: false, code: saleState(plan, nowMs).code, sentence: notOnSale };
  return { ok: true };
}

const farFromNow = (ms, nowMs) => Math.abs(ms - nowMs) > YEAR_SHOWN_AFTER_DAYS * DAY_MS;

/** "Dec 1" (", 2027" when more than ~6 months away) for a YYYY-MM-DD plan day, in the viewer's locale. */
export function dayWords(day, nowMs, locale = undefined) {
  const ms = planDayMs(day);
  if (ms === null) return String(day ?? '');
  return new Date(ms).toLocaleDateString(locale, {
    month: 'short', day: 'numeric', timeZone: 'UTC', ...(farFromNow(ms, nowMs) ? { year: 'numeric' } : {}),
  });
}

/**
 * "Tue, Dec 3, 6:00 PM EST" for a session's time, in the viewer's locale and zone, the zone named (a coach and an
 * athlete in different zones read the same instant; review 2026-10-25), and a year when ~6 months away.
 */
export function sessionWhen(iso, nowMs, { locale = undefined, timeZone = undefined } = {}) {
  const ms = isoMs(iso);
  if (ms === null) return null;
  return new Date(ms).toLocaleString(locale, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    ...(farFromNow(ms, nowMs) ? { year: 'numeric' } : {}),
    ...(timeZone ? { timeZone } : {}),
  });
}

const minutesWords = (m) => (Number.isInteger(m) && m >= 5 && m <= 720 ? `${m} min` : null);

/**
 * How many payments a purchase now makes, before create-subscription answers: a session 1; a dated block its count
 * from now (datedBlockPayments); a block with a length P; an open pass null (renews until cancelled). `answer`:
 * create-subscription's answer, whose `seasonPayments` wins whenever it carries one.
 */
export function paymentsFor(plan, nowMs, answer = null) {
  const told = answer?.seasonPayments;
  if (Number.isInteger(told) && told >= 1 && told <= MAX_SEASON_WEEKS) return told;
  if (passKind(plan) === 'session') return 1;
  if (isDatedBlock(plan)) {
    return datedBlockPayments({ startsOn: plan.starts_on, weeks: plan.duration_weeks, period: plan.period, purchaseMs: nowMs });
  }
  return seasonPayments(plan?.duration_weeks, plan?.period);
}

/**
 * The line that says what the pass is, without its price: a dated block "Starts Dec 1 · 8 weeks" (or "Started Nov 3 ·
 * 8 weeks" once week 1 has begun), a block that starts on purchase "8 weeks · starts when you join", a session
 * "Session · Tue, Dec 3, 6:00 PM · 60 min" (or "Session · Time arranged with Dana · 60 min"); an open pass null.
 */
export function scheduleLine(plan, nowMs, { first = 'your coach', locale, timeZone } = {}) {
  if (passKind(plan) === 'session') {
    const when = sessionWhen(plan?.session_at, nowMs, { locale, timeZone }) ?? `Time arranged with ${first}`;
    return ['Session', when, minutesWords(plan?.session_minutes)].filter(Boolean).join(' · ');
  }
  const weeks = seasonWeeks(plan?.duration_weeks);
  if (weeks === null) return null;
  const length = `${weeks} week${weeks === 1 ? '' : 's'}`;
  const start = planDayMs(plan?.starts_on);
  if (start === null) return `${length} · starts when you join`;
  return `${start <= nowMs ? 'Started' : 'Starts'} ${dayWords(plan.starts_on, nowMs, locale)} · ${length}`;
}

/**
 * The price, said the way the pass bills: "$320 / month · 2 payments"; once create-subscription answered
 * (`serverTotal: true`) "$320 / month · 2 payments ($640 in all)"; one payment "$320 · one payment · nothing renews";
 * an open pass "$20 / month · renews until you cancel"; null without a price. `payments`: paymentsFor; `total`:
 * chargedTotal(create-subscription's answer) for a Model B coach (the booking fee inside the amount).
 *
 * The "in all" total waits for the server (review 2026-10-25): a Model B coach's athletes pay plans.price plus the
 * booking fee on every payment, and nothing the invite page can read says whether this coach uses Model B, so a total
 * made from plans.price could be short. The per-payment price stays (the coach page PR shows the server's
 * `total_cents` from `coach_page`).
 */
export function priceLine(plan, { payments, total = null, serverTotal = false } = {}) {
  const b = passBilling(plan, total);
  if (!b.priced) return null;
  const amount = usdFromCents(b.priceCents);
  const period = passKind(plan) === 'session' ? 'month' : b.period;
  if (passKind(plan) === 'session' || payments === 1) return `${amount} · one payment · nothing renews`;
  if (!Number.isInteger(payments)) return `${amount} / ${period} · renews until you cancel`;
  const allIn = serverTotal ? ` (${usdFromCents(b.priceCents * payments)} in all)` : '';
  return `${amount} / ${period} · ${payments} payments${allIn}`;
}

/**
 * What the card is charged, under the card form. A session "$40 today. One payment for this session."; a block of one
 * payment "$320 today. One payment for the block."; a dated block bought before it starts "$320 today, then monthly
 * from one month after the block starts: 2 payments in all. Billing stops after the block."; any other block "$320
 * today, then monthly: 2 payments in all. Billing stops after the block."; an open pass as checkoutChargeLine says it.
 * Model B: the server's total with "(includes a $4 booking fee)".
 */
export function chargeLine(plan, { nowMs, payments, total = null }) {
  const b = passBilling(plan, total);
  if (!b.priced) return checkoutChargeLine(plan, total);
  const inside = total?.bookingCents ? ` (includes a ${usdFromCents(total.bookingCents)} booking fee)` : '';
  const today = `${usdFromCents(b.priceCents)}${inside} today`;
  if (passKind(plan) === 'session') return `${today}. One payment for this session.`;
  if (!Number.isInteger(payments)) return checkoutChargeLine(plan, total);
  if (payments === 1) return `${today}. One payment for the block.`;
  const adverb = billingPeriod(plan?.period) === 'year' ? 'yearly' : 'monthly';
  const unit = billingPeriod(plan?.period) === 'year' ? 'year' : 'month';
  const start = planDayMs(plan?.starts_on);
  const when = start !== null && start > nowMs ? `${adverb} from one ${unit} after the block starts` : adverb;
  return `${today}, then ${when}: ${payments} payments in all. Billing stops after the block.`;
}

/**
 * The card's line about when it can be bought, or null: "On sale from Sep 2", "Sign-ups closed Nov 30", "Sign-ups
 * close Nov 30". A session that started is not shown on the page at all.
 */
export function saleLine(plan, nowMs, locale = undefined) {
  const s = saleState(plan, nowMs);
  if (!s.open && s.code === 'block_not_open') return `On sale from ${dayWords(s.day, nowMs, locale)}`;
  if (!s.open && s.code === 'block_closed') return `Sign-ups closed ${dayWords(s.day, nowMs, locale)}`;
  if (s.open && isDatedBlock(plan)) return `Sign-ups close ${dayWords(lastSignUpDay(plan), nowMs, locale)}`;
  return null;
}

/**
 * The sentence the checkout stops with, before anything can end a pass, when the pass is not on sale now (the
 * server's own words for the same three codes end "You haven't been charged.").
 */
export function notOnSaleSentence(plan, nowMs, locale = undefined) {
  const s = saleState(plan, nowMs);
  if (s.open) return null;
  const name = typeof plan?.name === 'string' && plan.name.trim() ? plan.name.trim() : 'This pass';
  if (s.code === 'session_over') return `${name} has already started, so it can’t be booked. Pick another time with the coach.`;
  if (s.code === 'block_closed') return `Sign-ups for ${name} closed on ${dayWords(s.day, nowMs, locale)}.`;
  return `Sign-ups for ${name} open on ${dayWords(s.day, nowMs, locale)}.`;
}

/** A session's card line with its price: "Session · Tue, Dec 3, 6:00 PM · 60 min · $40". */
export function sessionCardLine(plan, nowMs, opts = {}) {
  if (passKind(plan) !== 'session') return null;
  const b = passBilling(plan);
  return [scheduleLine(plan, nowMs, opts), b.priced ? usdFromCents(b.priceCents) : null].filter(Boolean).join(' · ');
}

/** The buy button: "Book this session", "Join the block" (a block with a length), else "Buy <name>". */
export function buyLabel(plan) {
  if (passKind(plan) === 'session') return 'Book this session';
  return seasonWeeks(plan?.duration_weeks) !== null ? 'Join the block' : `Buy ${plan?.name ?? 'this pass'}`;
}

/** The platform's rule, under the sessions: "Cancel up to 24 hours before for a full refund." */
export function freeCancelLine() {
  return `Cancel up to ${SESSION_FREE_CANCEL_HOURS} hours before for a full refund.`;
}

/** The line that introduces the coach's own policy (or says there is none written). */
export function coachPolicyIntro(first, policy) {
  return typeof policy === 'string' && policy.trim()
    ? `Inside ${SESSION_FREE_CANCEL_HOURS} hours, or for a session with no time set, ${first}’s own cancellation policy applies:`
    : `Inside ${SESSION_FREE_CANCEL_HOURS} hours, or for a session with no time set, ${first}’s own cancellation policy applies. ${first} hasn’t written one here yet, so ask them before you book.`;
}

/** The checkout's line for a session: the platform rule for a timed one, the coach's policy for one with no time. */
export function sessionCancelNote(plan, first) {
  if (passKind(plan) !== 'session') return null;
  return isoMs(plan?.session_at) === null
    ? `No time is set yet: you arrange it with ${first}, and ${first}’s own cancellation policy applies (it’s on this page).`
    : `${freeCancelLine()} Cancel in the ${BRAND_NAME} app; inside ${SESSION_FREE_CANCEL_HOURS} hours ${first}’s own policy applies (it’s on this page).`;
}

/** The longest cancellation policy the server keeps (trainers_cancellation_policy_len). */
export const POLICY_MAX = 600;

// ── The coach makes a pass (the season editor) ───────────────────────────────

/** The session lengths the server accepts (plans_session_minutes_range). */
export const SESSION_MINUTES_MIN = 5;
export const SESSION_MINUTES_MAX = 720;
export const SESSION_MINUTES_DEFAULT = 60;

/** The viewer's own IANA zone ("America/New_York"), or null when the browser does not say. */
export function viewerTimeZone() {
  try {
    const z = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof z === 'string' && z ? z : null;
  } catch {
    return null;
  }
}

/** The note under a datetime-local input: "Times are in America/New_York (EST)." (the zone the input is read in). */
export function timeZoneNote(timeZone = viewerTimeZone(), nowMs = Date.now(), locale = undefined) {
  if (!timeZone) return 'Times are in this device’s time zone.';
  let short;
  try {
    short = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'short' }).formatToParts(new Date(nowMs))
      .find((p) => p.type === 'timeZoneName')?.value ?? null;
  } catch {
    short = null;
  }
  return `Times are in ${timeZone}${short && short !== timeZone ? ` (${short})` : ''}.`;
}

/** The wall clock of an instant in a zone, as [year, month, day, hour, minute, second] (month 1..12). */
function wallParts(ms, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (t) => Number(parts.find((p) => p.type === t)?.value);
  return [get('year'), get('month'), get('day'), get('hour') % 24, get('minute'), get('second')];
}

/** How far a zone's wall clock is ahead of UTC at an instant, in ms. */
function zoneOffsetMs(ms, timeZone) {
  const [y, mo, d, h, mi, se] = wallParts(ms, timeZone);
  return Date.UTC(y, mo - 1, d, h, mi, se) - Math.floor(ms / 1000) * 1000;
}

/**
 * A datetime-local value ("2026-12-03T18:00") read in `timeZone` (the viewer's own by default, the zone the editor's
 * note names) → an ISO instant, or null. A wall time skipped by a clock change (2:30 on a spring-forward night)
 * resolves an hour later on the wall, as browsers resolve it.
 */
export function localInputToIso(v, timeZone = viewerTimeZone()) {
  const m = typeof v === 'string' ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v) : null;
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  if (!Number.isFinite(wall) || new Date(wall).getUTCDate() !== d) return null;
  if (!timeZone) {
    const t = new Date(y, mo - 1, d, h, mi).getTime();
    return Number.isFinite(t) ? new Date(t).toISOString() : null;
  }
  try {
    const first = wall - zoneOffsetMs(wall, timeZone);
    const second = wall - zoneOffsetMs(first, timeZone);
    const shows = (t) => { const [yy, mm, dd, hh, mn] = wallParts(t, timeZone); return Date.UTC(yy, mm - 1, dd, hh, mn) === wall; };
    // The instant whose wall clock reads the input; inside a gap (none does), the later one, as browsers resolve it.
    const t = shows(second) ? second : shows(first) ? first : Math.max(first, second);
    return new Date(t).toISOString();
  } catch {
    return null;
  }
}

/** An ISO instant → a datetime-local value in `timeZone` (the viewer's own by default), or ''. */
export function isoToLocalInput(iso, timeZone = viewerTimeZone()) {
  const ms = isoMs(iso);
  if (ms === null) return '';
  const p = (n) => String(n).padStart(2, '0');
  let y; let mo; let d; let h; let mi;
  try {
    if (!timeZone) throw new Error('no zone');
    [y, mo, d, h, mi] = wallParts(ms, timeZone);
  } catch {
    const x = new Date(ms);
    [y, mo, d, h, mi] = [x.getFullYear(), x.getMonth() + 1, x.getDate(), x.getHours(), x.getMinutes()];
  }
  return `${y}-${p(mo)}-${p(d)}T${p(h)}:${p(mi)}`;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The row a new pass is inserted as (plans INSERT is the coach's own: plans_insert, trainer_id = auth.uid()), or
 * `{ error }` in words. Form: { kind, name, price, weeks, startsOn, enrollmentCloses, sessionAt (datetime-local),
 * minutes }. Only what the server's CHECKs allow for the kind is sent; the price is per month (a session is one
 * payment) and at least MINIMUM_CHARGE_USD (guard_plan_minimum).
 */
export function newPassRow(form, trainerId) {
  const kind = form?.kind === 'session' ? 'session' : 'block';
  const name = String(form?.name ?? '').trim();
  if (!name) return { error: 'Give the pass a name.' };
  if (name.length > 120) return { error: 'Keep the name to 120 characters.' };
  const cents = Math.round(Number(form?.price) * 100);
  if (!Number.isFinite(cents) || cents < MIN_CENTS) return { error: `A pass costs at least ${usdFromCents(MIN_CENTS)} per payment.` };
  const base = { trainer_id: trainerId, name, price: cents / 100, period: 'month', kind };
  if (kind === 'session') {
    const raw = String(form?.sessionAt ?? '').trim();
    const at = raw ? localInputToIso(raw, form?.timeZone === undefined ? viewerTimeZone() : form.timeZone) : null;
    if (raw && !at) return { error: 'Pick a date and time for the session, or leave it empty to arrange it with each athlete.' };
    const minutes = Number(form?.minutes);
    if (!Number.isInteger(minutes) || minutes < SESSION_MINUTES_MIN || minutes > SESSION_MINUTES_MAX) {
      return { error: `A session lasts ${SESSION_MINUTES_MIN} to ${SESSION_MINUTES_MAX} minutes.` };
    }
    return { row: { ...base, session_at: at, session_minutes: minutes } };
  }
  const weeks = seasonWeeks(Number(form?.weeks));
  if (weeks === null) return { error: `A block lasts 1 to ${MAX_SEASON_WEEKS} whole weeks.` };
  const startsOn = String(form?.startsOn ?? '').trim();
  const closes = String(form?.enrollmentCloses ?? '').trim();
  if (startsOn && (!DAY_RE.test(startsOn) || planDayMs(startsOn) === null)) return { error: 'Pick a real start date.' };
  if (closes) {
    if (!startsOn) return { error: 'A last sign-up day needs a start date.' };
    if (!DAY_RE.test(closes) || planDayMs(closes) === null) return { error: 'Pick a real last sign-up day.' };
    const last = blockLastDay({ starts_on: startsOn, duration_weeks: weeks });
    if (closes > last) return { error: 'The last sign-up day must fall on or before the block’s last day.' };
  }
  return { row: { ...base, duration_weeks: weeks, starts_on: startsOn || null, enrollment_closes: closes || null } };
}

/**
 * A write to plans or trainers refused by the server, in words. guard_plan_shape / guard_plan_minimum /
 * guard_roster_read_only put the sentence in HINT (kind_fixed, block_has_holders, session_held, below_minimum,
 * elite_required); a CHECK names its constraint; a column the server does not have yet (42703 / PGRST204) means the
 * blocks migration is not on the server. Null for no error.
 */
export function planWriteError(error) {
  if (!error) return null;
  const msg = String(error.message ?? '');
  const hint = typeof error.hint === 'string' && error.hint.trim() ? error.hint.trim() : null;
  const code = String(error.code ?? '');
  if (['kind_fixed', 'block_has_holders', 'session_held', 'below_minimum', 'elite_required'].some((k) => msg.includes(k))) {
    if (hint) return hint;
    if (msg.includes('kind_fixed')) return 'A pass stays a block or a single session. Make a new pass instead.';
    if (msg.includes('block_has_holders')) return 'Athletes already hold this block, so its start date stays. Make a new block for another date.';
    if (msg.includes('session_held')) return 'An athlete booked this session, so its time can’t be cleared or moved into the past. Move it to a later time, or ask them to cancel.';
    if (msg.includes('below_minimum')) return `A pass costs at least ${usdFromCents(MIN_CENTS)} per payment.`;
    return 'Your roster is read-only on the free plan right now. Start Elite to change it.';
  }
  if (code === '42703' || code === 'PGRST204') return 'Blocks and single sessions aren’t available on the server yet. Nothing was saved.';
  if (msg.includes('plans_enrollment_closes_window')) return 'The last sign-up day must fall on or before the block’s last day, and needs a start date.';
  if (msg.includes('plans_session_minutes_range')) return `A session lasts ${SESSION_MINUTES_MIN} to ${SESSION_MINUTES_MAX} minutes.`;
  if (msg.includes('plans_dated_block_has_length')) return 'A block with a start date needs a length.';
  if (msg.includes('plans_kind_shape')) return 'A block has no session time, and a session has no length or start date.';
  if (msg.includes('trainers_cancellation_policy_len')) return `Keep the policy to ${POLICY_MAX} characters.`;
  if (code === '42501' || /permission|row-level security/i.test(msg)) return 'Not allowed: this isn’t yours to change.';
  return 'Couldn’t save that. Check your connection and try again.';
}

/**
 * A new week count for a dated block whose last sign-up day would fall after the block's new last day: the server's
 * plans_enrollment_closes_window refuses that length (review 2026-10-25). The sentence, or null when the length fits.
 */
export function lengthBreaksSignUpWindow(plan, newWeeks) {
  const closes = planDayMs(plan?.enrollment_closes);
  const weeks = seasonWeeks(Number(newWeeks));
  if (closes === null || weeks === null || planDayMs(plan?.starts_on) === null) return null;
  const last = blockLastDay({ starts_on: plan.starts_on, duration_weeks: weeks });
  return plan.enrollment_closes > last ? LENGTH_BREAKS_WINDOW : null;
}

export const LENGTH_BREAKS_WINDOW = 'The last sign-up day is after the new end. Move it first (Edit dates).';

/** A refused write of plans.duration_weeks (publishing a new week count), in words. */
export function lengthWriteError(error) {
  if (!error) return null;
  if (String(error.message ?? '').includes('plans_enrollment_closes_window')) return LENGTH_BREAKS_WINDOW;
  return planWriteError(error);
}

/** The editor's short line for a pass: "Block · starts Dec 1 · 8 weeks", "Session · Tue, Dec 3, 6:00 PM", "Open pass". */
export function editorKindLine(plan, nowMs, locale = undefined) {
  if (passKind(plan) === 'session') {
    return `Session · ${sessionWhen(plan?.session_at, nowMs, { locale }) ?? 'time arranged with each athlete'}${minutesWords(plan?.session_minutes) ? ` · ${minutesWords(plan.session_minutes)}` : ''}`;
  }
  const weeks = seasonWeeks(plan?.duration_weeks);
  if (weeks === null) return 'Open pass · renews until the athlete cancels';
  const start = planDayMs(plan?.starts_on);
  const when = start === null ? 'starts when each athlete joins' : `${start <= nowMs ? 'started' : 'starts'} ${dayWords(plan.starts_on, nowMs, locale)}`;
  const sale = saleLine(plan, nowMs, locale);
  return [`Block · ${when} · ${weeks} week${weeks === 1 ? '' : 's'}`, sale].filter(Boolean).join(' · ');
}

/** Whether the coach's page should list this pass: everything but a session that has already started. */
export function listedOnPage(plan, nowMs) {
  const s = saleState(plan, nowMs);
  return s.open || s.code !== 'session_over';
}

