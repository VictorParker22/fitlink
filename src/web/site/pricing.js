// Pricing constants for the website (Home, Pricing, Support, Founding, the coach dashboard).
//
// SOURCE: `src/web/pricingConfig.json`, a byte-for-byte copy of fitlink-app
// `supabase/config/pricing.json` (the owner's prices, rates and dates, launch plan
// 2026-10-25, decisions L5-L8). The server reads the same file (its
// `_shared/pricingData.ts` and `public.pricing_config()` are generated from it), so
// a number here is the number the server charges. Change the price in fitlink-app,
// copy the file here, and `node --test src/web/pricing.test.js` says what moved.
// Never type a price, rate, cap or date into a page: derive it here.
//
// Rates in the file are basis points (1000 = 10%), money is US cents.
//
// In a development build a number that is NOT in the config carries a small
// "[confirm]" marker (`NEEDS_CONFIRM`); production never shows it. Since the config
// became the source (2026-10-25) that is only FOUNDING_MIN_PAYING_ATHLETES.
import CONFIG from '../pricingConfig.json' with { type: 'json' };

export const PRICING_CONFIG = CONFIG;

const bpsToPercent = (bps) => Number(bps) / 100;
const centsToUsd = (cents) => Number(cents) / 100;
const { free, elite, founding } = CONFIG.tiers;

// ── Free and Elite ────────────────────────────────────────────────────────────
export const STANDARD_FEE_PERCENT = bpsToPercent(free.fee_bps);
/** A Free coach's paying athletes before the roster turns read-only (the 6th still pays and joins). */
export const FREE_ROSTER_CAP = free.active_athlete_cap;
export const ELITE_FEE_PERCENT = bpsToPercent(elite.fee_bps);
export const ELITE_MONTHLY_USD = centsToUsd(elite.monthly_cents);
export const ELITE_YEARLY_USD = centsToUsd(elite.yearly_cents);
/** Days a past-due web Elite subscription keeps Elite while Stripe retries the card. */
export const ELITE_PAST_DUE_GRACE_DAYS = elite.past_due_grace_days;

// ── Founding ──────────────────────────────────────────────────────────────────
// Elite free for a year from the coach's first paid athlete, then the Elite monthly
// price; closes on `closes_on` (California time). The live counter comes from the
// server's `founding_slots()`, never from here.
export const FOUNDING_SLOTS = founding.slots;
export const FOUNDING_FREE_DAYS = founding.free_days;
/** The free period in whole months (365 days → 12). */
export const FOUNDING_FREE_MONTHS = Math.round((founding.free_days * 12) / 365.25);
export const FOUNDING_THEN_MONTHLY_USD = centsToUsd(founding.then_monthly_cents);
export const FOUNDING_FEE_PERCENT = bpsToPercent(founding.fee_bps);
/** The notice before the free year ends (day 335 of 365 → 30 days before). */
export const FOUNDING_NOTICE_DAYS_BEFORE = founding.free_days - founding.notice_day;
/**
 * Founding pricing ENDS (the server suspends it; only the operator lifts it) when none
 * of the coach's athletes has paid through the platform for this many days, counted
 * from the grant or from the last athlete payment, whichever is later. The badge stays.
 */
export const FOUNDING_ENDS_AFTER_DAYS_WITHOUT_PAYMENT = founding.suspend_after_days_without_paid_event;
/** The last day to apply (the server closes at midnight after it, in `FOUNDING_CLOSES_TZ`). */
export const FOUNDING_CLOSES_ON = founding.closes_on;
export const FOUNDING_CLOSES_TZ = founding.closes_tz;
/**
 * NOT in the config: the launch plan's eligibility line ("live with 5+ paying athletes
 * by Dec 31"). Nothing on the server checks it (Victor decides at the setup call), so
 * it keeps the dev [confirm] marker.
 */
export const FOUNDING_MIN_PAYING_ATHLETES = 5;

// ── Every pass ────────────────────────────────────────────────────────────────
/** The least a pass may cost per payment (the server refuses a lower price, below_minimum). */
export const MINIMUM_CHARGE_USD = centsToUsd(CONFIG.minimum_charge_cents);
/** What a dispute costs the coach, won or lost (an inquiry costs nothing). */
export const DISPUTE_FEE_USD = centsToUsd(CONFIG.disputes.recovery_cents);
export const PAYOUT_INTERVAL = CONFIG.payouts.interval;
export const PAYOUT_WEEKLY_ANCHOR = CONFIG.payouts.weekly_anchor;

// ── Blocks and single sessions (fitlink-app migration 20261025120000) ─────────
/** The length a new block is offered with (no column default: a block with no length is an open pass). */
export const BLOCK_DEFAULT_WEEKS = CONFIG.blocks.default_weeks;
/** How many days before its start a dated block goes on sale (create-subscription refuses earlier: block_not_open). */
export const BLOCK_SALE_OPENS_DAYS_BEFORE = CONFIG.blocks.sale_opens_days_before;
/** Up to this many hours before a session the athlete cancels for a full refund (cancel-session); inside it, the coach's policy. */
export const SESSION_FREE_CANCEL_HOURS = CONFIG.sessions.free_cancel_hours;

// ── Model B (a per-coach switch, off by default) ─────────────────────────────
// The athlete's booking fee sits INSIDE the total the athlete sees at checkout, and the
// coach's own rate drops. Shown on a Model B coach's dashboard fee line and earnings, and at
// checkout only as part of create-subscription's total; the public pages say only that a
// booking fee, when a coach uses one, is included in the total shown before paying.
// Gate: Model B must not be switched on for a coach until the coach page shows the total
// before checkout (PR 3).
export const MODEL_B_DEFAULT_ON = CONFIG.model_b.default_on;
export const MODEL_B_FEE_PERCENT = bpsToPercent(CONFIG.model_b.coach_fee_bps);
export const MODEL_B_BOOKING_FEE_USD = Object.freeze({
  single_session: centsToUsd(CONFIG.model_b.booking_fee_cents.single_session),
  block_payment: centsToUsd(CONFIG.model_b.booking_fee_cents.block_payment),
});

// ── Stripe's card processing (display arithmetic only) ───────────────────────
// Stripe's standard US card price. It comes out of the platform's fee on a destination
// charge: never charged to the athlete, never taken from what the coach keeps.
export const STRIPE_ESTIMATE_PERCENT = bpsToPercent(CONFIG.stripe_processing_estimate.percent_bps);
export const STRIPE_ESTIMATE_FIXED_USD = centsToUsd(CONFIG.stripe_processing_estimate.fixed_cents);

// `?? {}`: node --test imports this file too (no Vite there, so no import.meta.env).
export const NEEDS_CONFIRM = Boolean((import.meta.env ?? {}).DEV);

/**
 * `$1,234` or `$12.50`: whole dollars when there are no cents. A negative amount reads `-$29.99`.
 * `{ cents: true }` always shows them (`$120.00`): the receipt on the home page reads like a receipt.
 */
export function usd(amount, { cents = false } = {}) {
  const n = Number(amount) || 0;
  const whole = !cents && Math.abs(n - Math.round(n)) < 0.005;
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** "a year" for 12 months, else "N months": the Founding offer's free period in words. */
export function foundingFreeWords(months = FOUNDING_FREE_MONTHS) {
  return months === 12 ? 'a year' : `${months} months`;
}

/** "about 2.9% + 30¢": Stripe's estimate in words. */
export function stripeEstimateWords() {
  return `about ${STRIPE_ESTIMATE_PERCENT}% + ${Math.round(STRIPE_ESTIMATE_FIXED_USD * 100)}¢ a payment`;
}

/** Elite's monthly cost for the billing the coach picked. */
export function eliteMonthlyCost(yearly) {
  return yearly ? ELITE_YEARLY_USD / 12 : ELITE_MONTHLY_USD;
}

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * What a coach keeps each month on Free, Elite and Founding (its first year), from what
 * their athletes pay them that month. All-in: athletes pay the price, nothing is added,
 * and Stripe's processing comes out of the platform's fee, so the coach's side is the
 * price minus the tier's fee (minus the Elite subscription on Elite). Founding's first
 * year has no subscription.
 */
export function keepsByTier(monthlyRevenue, yearly = false) {
  const rev = Math.max(0, Number(monthlyRevenue) || 0);
  const eliteSub = eliteMonthlyCost(yearly);
  const freeFee = round2((rev * STANDARD_FEE_PERCENT) / 100);
  const eliteFee = round2((rev * ELITE_FEE_PERCENT) / 100);
  const foundingFee = round2((rev * FOUNDING_FEE_PERCENT) / 100);
  const free = { fee: freeFee, subscription: 0, keep: round2(rev - freeFee) };
  const eliteT = { fee: eliteFee, subscription: round2(eliteSub), keep: round2(rev - eliteFee - eliteSub) };
  const foundingT = { fee: foundingFee, subscription: 0, keep: round2(rev - foundingFee) };
  const spread = (STANDARD_FEE_PERCENT - ELITE_FEE_PERCENT) / 100;
  return {
    rev,
    free,
    elite: eliteT,
    founding: foundingT,
    /** Free leaves the coach at least as much as Elite. */
    freeWins: free.keep >= eliteT.keep,
    /** Monthly volume above which Elite leaves more than Free; null when the fees never cross. */
    breakEven: spread > 0 ? round2(eliteSub / spread) : null,
    /** How much more Elite leaves than Free (negative when Free leaves more). */
    eliteGain: round2(eliteT.keep - free.keep),
  };
}
