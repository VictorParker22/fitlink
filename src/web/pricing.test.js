// node --test src/web/pricing.test.js — the website's numbers come from the server's config.
//
// src/web/pricingConfig.json is a byte-for-byte copy of fitlink-app
// `supabase/config/pricing.json` (the owner's prices, rates and dates; the server's
// _shared/pricingData.ts and public.pricing_config() are generated from it). This file
// pins every value the site uses, so a changed config fails here and says which
// sentence on the site moves with it. Update the copy, then this test, never a page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import CONFIG from './pricingConfig.json' with { type: 'json' };
import * as P from './site/pricing.js';

// The sha256 of fitlink-app `supabase/config/pricing.json` at commit d4b0267 (branch launch/4-blocks, "Blocks review
// fixes: a held session's time, one refund per payment, counted installments"), the commit this copy was taken from. A re-copy
// that does not update this pin (and the commit named here) fails, so a changed config is always a reviewed change.
// Re-sync: copy the server file byte for byte, then `sha256sum src/web/pricingConfig.json` and paste the hash here.
const SERVER_CONFIG_SHA256 = '201ec4c34793fa55949adf2bb89a71b59b1ddae497998d5ca759d126aa9672d5';

test('the copy is the server file at the pinned commit (sha256)', () => {
  const raw = readFileSync(new URL('./pricingConfig.json', import.meta.url));
  assert.equal(createHash('sha256').update(raw).digest('hex'), SERVER_CONFIG_SHA256);
  assert.equal(CONFIG.version, '2026-10-25');
  assert.equal(CONFIG.currency, 'usd');
  assert.deepEqual(Object.keys(CONFIG.tiers).sort(), ['elite', 'founding', 'free']);
});

test('every value the site uses, pinned', () => {
  assert.equal(CONFIG.tiers.free.fee_bps, 1000);
  assert.equal(CONFIG.tiers.free.active_athlete_cap, 5);
  assert.equal(CONFIG.tiers.elite.fee_bps, 500);
  assert.equal(CONFIG.tiers.elite.monthly_cents, 2999);
  assert.equal(CONFIG.tiers.elite.yearly_cents, 24900);
  assert.equal(CONFIG.tiers.elite.past_due_grace_days, 7);
  assert.equal(CONFIG.tiers.founding.fee_bps, 500);
  assert.equal(CONFIG.tiers.founding.slots, 15);
  assert.equal(CONFIG.tiers.founding.free_days, 365);
  assert.equal(CONFIG.tiers.founding.notice_day, 335);
  assert.equal(CONFIG.tiers.founding.then_monthly_cents, 2999);
  assert.equal(CONFIG.tiers.founding.suspend_after_days_without_paid_event, 60);
  assert.equal(CONFIG.tiers.founding.closes_on, '2026-12-31');
  assert.equal(CONFIG.tiers.founding.closes_tz, 'America/Los_Angeles');
  assert.equal(CONFIG.model_b.default_on, false);
  assert.equal(CONFIG.model_b.coach_fee_bps, 200);
  assert.deepEqual(CONFIG.model_b.booking_fee_cents, { single_session: 400, block_payment: 1200 });
  assert.equal(CONFIG.minimum_charge_cents, 2500);
  assert.equal(CONFIG.blocks.default_weeks, 8);
  assert.equal(CONFIG.blocks.sale_opens_days_before, 90);
  assert.equal(CONFIG.sessions.free_cancel_hours, 24);
  assert.deepEqual(CONFIG.payouts, { interval: 'weekly', weekly_anchor: 'monday' });
  assert.equal(CONFIG.disputes.recovery_cents, 1500);
  assert.equal(CONFIG.stripe_processing_estimate.percent_bps, 290);
  assert.equal(CONFIG.stripe_processing_estimate.fixed_cents, 30);
});

test('pricing.js derives each constant from the config', () => {
  assert.equal(P.PRICING_CONFIG, CONFIG);
  assert.equal(P.STANDARD_FEE_PERCENT, 10);
  assert.equal(P.ELITE_FEE_PERCENT, 5);
  assert.equal(P.FREE_ROSTER_CAP, 5);
  assert.equal(P.ELITE_MONTHLY_USD, 29.99);
  assert.equal(P.ELITE_YEARLY_USD, 249);
  assert.equal(P.ELITE_PAST_DUE_GRACE_DAYS, 7);
  assert.equal(P.FOUNDING_SLOTS, 15);
  assert.equal(P.FOUNDING_FREE_DAYS, 365);
  assert.equal(P.FOUNDING_FREE_MONTHS, 12);
  assert.equal(P.FOUNDING_THEN_MONTHLY_USD, 29.99);
  assert.equal(P.FOUNDING_FEE_PERCENT, 5);
  assert.equal(P.FOUNDING_NOTICE_DAYS_BEFORE, 30);
  assert.equal(P.FOUNDING_ENDS_AFTER_DAYS_WITHOUT_PAYMENT, 60);
  assert.equal(P.FOUNDING_CLOSES_ON, '2026-12-31');
  assert.equal(P.FOUNDING_CLOSES_TZ, 'America/Los_Angeles');
  assert.equal(P.MINIMUM_CHARGE_USD, 25);
  assert.equal(P.BLOCK_DEFAULT_WEEKS, 8);
  assert.equal(P.BLOCK_SALE_OPENS_DAYS_BEFORE, 90);
  assert.equal(P.SESSION_FREE_CANCEL_HOURS, 24);
  assert.equal(P.DISPUTE_FEE_USD, 15);
  assert.equal(P.PAYOUT_INTERVAL, 'weekly');
  assert.equal(P.PAYOUT_WEEKLY_ANCHOR, 'monday');
  assert.equal(P.MODEL_B_DEFAULT_ON, false);
  assert.equal(P.MODEL_B_FEE_PERCENT, 2);
  assert.deepEqual({ ...P.MODEL_B_BOOKING_FEE_USD }, { single_session: 4, block_payment: 12 });
  assert.equal(P.STRIPE_ESTIMATE_PERCENT, 2.9);
  assert.equal(P.STRIPE_ESTIMATE_FIXED_USD, 0.3);
});

test('the one number not in the config', () => {
  assert.equal(P.FOUNDING_MIN_PAYING_ATHLETES, 5);
});

test('words built from the numbers', () => {
  assert.equal(P.usd(P.ELITE_MONTHLY_USD), '$29.99');
  assert.equal(P.usd(P.ELITE_YEARLY_USD), '$249');
  assert.equal(P.usd(-29.99), '-$29.99');
  assert.equal(P.foundingFreeWords(), 'a year');
  assert.equal(P.foundingFreeWords(6), '6 months');
  assert.equal(P.stripeEstimateWords(), 'about 2.9% + 30¢ a payment');
});

test('what a coach keeps: Free / Elite / Founding at three volumes', () => {
  const at500 = P.keepsByTier(500);
  assert.deepEqual(at500.free, { fee: 50, subscription: 0, keep: 450 });
  assert.deepEqual(at500.elite, { fee: 25, subscription: 29.99, keep: 445.01 });
  assert.deepEqual(at500.founding, { fee: 25, subscription: 0, keep: 475 });
  assert.equal(at500.freeWins, true);

  const at3000 = P.keepsByTier(3000);
  assert.equal(at3000.free.keep, 2700);
  assert.equal(at3000.elite.keep, 2820.01);
  assert.equal(at3000.founding.keep, 2850);
  assert.equal(at3000.freeWins, false);
  assert.equal(at3000.eliteGain, 120.01);

  const at10000 = P.keepsByTier(10000, true);
  assert.equal(at10000.elite.subscription, 20.75);
  assert.equal(at10000.elite.keep, 9479.25);
  assert.equal(at10000.free.keep, 9000);

  assert.equal(P.keepsByTier(0).elite.keep, -29.99);
  assert.equal(P.keepsByTier(-5).rev, 0);
  assert.equal(P.keepsByTier(500).breakEven, 599.8);
  assert.equal(P.keepsByTier(500, true).breakEven, 415);
});

test('the pricing page’s owner-locked lines', async () => {
  const { PLAN_LINES, SIXTH_ATHLETE_RULE, FOUNDING_CLOSES_LABEL } = await import('./site/planLines.js');
  assert.deepEqual(Object.keys(PLAN_LINES), ['free', 'elite', 'founding']);
  assert.equal(PLAN_LINES.free, 'Free to try. Up to 5 athletes, 10% per pass.');
  assert.equal(PLAN_LINES.elite, '$29.99/mo. 5%, no cap, your assistant.');
  assert.equal(PLAN_LINES.founding, '15 spots. Elite free for a year. Closes Dec 31.');
  // Where Elite is bought, per region (W5): the US on the web, elsewhere the App Store or the web; never Apple for all.
  const { ELITE_WHERE } = await import('./site/planLines.js');
  assert.match(ELITE_WHERE.us, /^In the US: subscribe on the web/);
  assert.match(ELITE_WHERE.elsewhere, /^Outside the US: subscribe in the .+ iPhone app through the App Store.*, or on the web\.$/);
  assert.match(ELITE_WHERE.short, /^In the US on the web\. Elsewhere in the app through the App Store, or on the web\.$/);
  for (const line of Object.values(ELITE_WHERE)) assert.doesNotMatch(line, /billed through Apple|web only|only on the web/i);
  assert.equal(FOUNDING_CLOSES_LABEL, 'Dec 31');
  assert.match(SIXTH_ATHLETE_RULE, /^On the free plan, your sixth paying athlete’s payment goes through and they join\. From then on you need Elite to keep changing your athletes’ plans/);
});
