// Pricing constants for the website (Home, Pricing, Support).
//
// source of truth: App Store Connect (Elite) and platform_config (fee); confirm before launch.
//
// What the repos say on 2026-10-16, so a number here is never invented:
// - fitlink-app `supabase/migrations/enterprise_03_money_split.sql`:
//   `platform_config.platform_fee_bps` defaults to 1000 (10%) for an
//   independent coach; `payment_split_for_trainer()` returns 500 bps (5%)
//   while `trainers.elite_until > now()` (`20260822090000_elite_tier.sql`).
// - The same migration caps a free coach's roster at 5 active athletes
//   (`enforce_roster_cap`: "free plan holds 5 active athletes; Elite is unlimited").
// - fitlink-app `lib/revenuecat.ts` lists `fitlink_coach_elite_monthly $29.99/mo`
//   and `fitlink_coach_elite_annual $249/yr`. The app itself shows StoreKit's
//   price, never these; the website has no StoreKit, so these are the figures to
//   confirm against App Store Connect before launch.
// In a development build every number rendered from here carries a small
// "[confirm]" marker (`NEEDS_CONFIRM`); production never shows it.

export const STANDARD_FEE_PERCENT = 10;
export const ELITE_FEE_PERCENT = 5;
export const ELITE_MONTHLY_USD = 29.99;
export const ELITE_YEARLY_USD = 249;
export const FREE_ROSTER_CAP = 5;

// Founding (launch plan 2026-10-25, owner-locked): 15 spots, Elite free for a
// year from the coach's first paid athlete, then the Elite monthly price, for
// coaches live with 5+ paying athletes by Dec 31, 2026; closes Dec 31. The
// server's copy is fitlink-app `supabase/config/pricing.json` tiers.founding
// (slots 15, free_days 365, notice_day 335, then_monthly_cents 2999, fee_bps
// 500, suspend_after_days_without_paid_event 60, closes_on 2026-12-31); the
// live counter comes from `founding_slots()`, never from here.
export const FOUNDING_SLOTS = 15;
export const FOUNDING_FREE_MONTHS = 12;
export const FOUNDING_THEN_MONTHLY_USD = ELITE_MONTHLY_USD;
export const FOUNDING_FEE_PERCENT = ELITE_FEE_PERCENT;
export const FOUNDING_MIN_PAYING_ATHLETES = 5;
/** The notice before the free year ends (day 335 of 365). */
export const FOUNDING_NOTICE_DAYS_BEFORE = 30;
/**
 * Founding pricing ENDS (the server suspends it; only the operator lifts it, and
 * whether it ever comes back by itself is not decided) when none of the coach's
 * athletes has paid through the platform for this many days, counted from the
 * grant or from the last athlete payment, whichever is later. The badge stays.
 * Server: pricing.json tiers.founding.suspend_after_days_without_paid_event.
 */
export const FOUNDING_ENDS_AFTER_DAYS_WITHOUT_PAYMENT = 60;
/** The last day to apply (the server closes at midnight after it, California time). */
export const FOUNDING_CLOSES_ON = '2026-12-31';

/** App Store Connect app 6779058450 (bundle id fitlink.app). */
export const APP_STORE_URL = 'https://apps.apple.com/app/id6779058450';
/** The mailbox the iOS submission pack names. It must exist before launch. */
export const SUPPORT_EMAIL = 'support@fitlink.coach';

// `?? {}`: node --test imports this file too (no Vite there, so no import.meta.env).
export const NEEDS_CONFIRM = Boolean((import.meta.env ?? {}).DEV);

/** `$1,234` or `$12.50`: whole dollars when there are no cents. */
export function usd(amount) {
  const n = Number(amount) || 0;
  const whole = Math.abs(n - Math.round(n)) < 0.005;
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** Elite's monthly cost for the billing the coach picked. */
export function eliteMonthlyCost(yearly) {
  return yearly ? ELITE_YEARLY_USD / 12 : ELITE_MONTHLY_USD;
}

/**
 * What a coach pays FitLink each month on Free and on Elite, from what their
 * athletes pay them. Pure arithmetic over the constants above.
 */
export function compare(monthlyRevenue, yearly = false) {
  const rev = Math.max(0, Number(monthlyRevenue) || 0);
  const freeCost = rev * STANDARD_FEE_PERCENT / 100;
  const eliteSub = eliteMonthlyCost(yearly);
  const eliteCost = eliteSub + rev * ELITE_FEE_PERCENT / 100;
  const spread = (STANDARD_FEE_PERCENT - ELITE_FEE_PERCENT) / 100;
  const breakEven = spread > 0 ? eliteSub / spread : null;
  return {
    rev,
    freeCost,
    eliteCost,
    freeKeep: rev - freeCost,
    eliteKeep: rev - eliteCost,
    freeWins: freeCost <= eliteCost,
    breakEven,
    saves: freeCost - eliteCost,
  };
}
