// The home page's coach-page illustration (launch plan W6): what a coach's own page at /c/<handle> looks like, with
// a placeholder name ("Your name"), never a real or realistic coach. Every number is computed from pricing.js (the
// server's config) with the same sentence builders the real page uses (blocks.js, season.js), so a price change in
// the config changes the picture. Pure, so `node --test src/web/site/coachPageSample.test.js` pins it.
import { SESSION_MINUTES_DEFAULT, freeCancelLine, priceLine, scheduleLine } from '../blocks.js';
import { seasonPayments } from '../season.js';
import { BRAND_NAME, SITE_HOST } from './brand.js';
import { BLOCK_DEFAULT_WEEKS, FOUNDING_SLOTS, MINIMUM_CHARGE_USD, usd } from './pricing.js';

/**
 * Drawn literally, brackets and all: outside the handle rule (handles.js handleWellFormed), so no coach can ever own the
 * example's address (review 2026-10-25: `your-name` was a claimable handle).
 */
export const SAMPLE_HANDLE = '<your-name>';
export const SAMPLE_NAME = 'Your name';
/** Sample prices as multiples of the minimum charge (the least a pass may cost per payment). */
export const SAMPLE_BLOCK_PRICE_USD = MINIMUM_CHARGE_USD * 6;
export const SAMPLE_SESSION_PRICE_USD = MINIMUM_CHARGE_USD * 2;

export function coachPageSample() {
  const block = { kind: 'block', price: SAMPLE_BLOCK_PRICE_USD, period: 'month', duration_weeks: BLOCK_DEFAULT_WEEKS, starts_on: null };
  const payments = seasonPayments(BLOCK_DEFAULT_WEEKS, 'month');
  // Undated block: the schedule line never depends on today's date (the static page and the browser draw the same).
  const schedule = scheduleLine(block, 0);
  const line = priceLine(block, { payments, serverTotal: true });
  return Object.freeze({
    address: `${SITE_HOST}/c/${SAMPLE_HANDLE}`,
    name: SAMPLE_NAME,
    initials: 'YN',
    sport: 'What you coach',
    badge: `Founding ${FOUNDING_SLOTS}`,
    block: Object.freeze({
      title: `${BLOCK_DEFAULT_WEEKS}-week block`,
      schedule,
      amount: usd(SAMPLE_BLOCK_PRICE_USD),
      unit: '/ month',
      // "2 payments ($300 in all)": the price line without its leading amount, which the card shows big.
      line: line.replace(/^\S+ \/ month · /, ''),
      button: 'Join the block',
    }),
    session: Object.freeze({
      title: '1:1 session',
      line: `Session · ${SESSION_MINUTES_DEFAULT} min · ${usd(SAMPLE_SESSION_PRICE_USD)}`,
      button: 'Book this session',
    }),
    cancel: freeCancelLine(),
    foot: `Coached on ${BRAND_NAME}`,
  });
}
