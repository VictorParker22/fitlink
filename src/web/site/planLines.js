// The pricing page's plan lines (launch plan Track B copy, owner-locked 2026-10-25): the
// words are fixed, every number comes from pricing.js (the server's config). Pinned by
// `node --test src/web/pricing.test.js`.
import { closesLabel } from '../founding.js';
import { APP_STORE_LIVE } from './flags.js';
import {
  ELITE_FEE_PERCENT, ELITE_MONTHLY_USD, FOUNDING_CLOSES_ON, FOUNDING_SLOTS, FREE_ROSTER_CAP, STANDARD_FEE_PERCENT,
  foundingFreeWords, usd,
} from './pricing.js';

export const FOUNDING_CLOSES_LABEL = closesLabel(FOUNDING_CLOSES_ON);

/** Free, Elite, Founding: the three rows, in this order. */
export const PLAN_LINES = Object.freeze({
  free: `Free to try. Up to ${FREE_ROSTER_CAP} athletes, ${STANDARD_FEE_PERCENT}% per pass.`,
  elite: `${usd(ELITE_MONTHLY_USD)}/mo. ${ELITE_FEE_PERCENT}%, no cap, your assistant.`,
  founding: `${FOUNDING_SLOTS} spots. Elite free for ${foundingFreeWords()}. Closes ${FOUNDING_CLOSES_LABEL}.`,
});

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh'];

/**
 * The free cap in words. The server never refuses at the cap (fee engine): the athlete past
 * it pays and joins, and the coach's roster turns read-only for plan changes until Elite.
 */
export const SIXTH_ATHLETE_RULE = `On the free plan, your ${ORDINALS[FREE_ROSTER_CAP] ?? `${FREE_ROSTER_CAP + 1}th`} paying athlete’s payment goes through and they join. From then on you need Elite to keep changing your athletes’ plans; their payments keep coming either way.`;

/**
 * Where Coach Elite is bought (launch plan W5; owner decision R3, 2026-10-25): the iOS app offers the App Store purchase
 * on EVERY storefront (and on the US storefront the web option beside it), and the web checkout (elite-checkout,
 * Stripe, US dollars) sells to anyone. So one sentence is true everywhere, with no region clause. The App Store clause
 * is said only in a build with VITE_APP_STORE_LIVE=on (`storeLive`): until the app is public, no page sends anyone to
 * the App Store (review 2026-10-25, M1). Never "billed through Apple" for everyone, never "web only".
 */
export function eliteWhere(storeLive) {
  return Object.freeze({
    buy: storeLive
      ? 'Subscribe on the web from your coach dashboard (Stripe, US dollars), or in the iPhone app through the App Store.'
      : 'Subscribe on the web from your coach dashboard (Stripe, US dollars).',
    manage: 'A web subscription is managed or cancelled from the link in your Stripe receipt and stays on until the end of the period you paid for. An App Store subscription is managed in your Apple subscriptions.',
  });
}

/** This build's words (flags.js APP_STORE_LIVE). */
export const ELITE_WHERE = eliteWhere(APP_STORE_LIVE);
