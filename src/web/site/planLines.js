// The pricing page's plan lines (launch plan Track B copy, owner-locked 2026-10-25): the
// words are fixed, every number comes from pricing.js (the server's config). Pinned by
// `node --test src/web/pricing.test.js`.
import { closesLabel } from '../founding.js';
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
