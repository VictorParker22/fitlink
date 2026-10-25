// The coach-page illustration on the home page (W6): placeholder name, numbers from pricing.js. Run: node --test src/web/site/coachPageSample.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_BLOCK_PRICE_USD, SAMPLE_HANDLE, SAMPLE_SESSION_PRICE_USD, coachPageSample } from './coachPageSample.js';
import { handleWellFormed, pageHandle } from '../handles.js';
import { BLOCK_DEFAULT_WEEKS, FOUNDING_SLOTS, MINIMUM_CHARGE_USD, usd } from './pricing.js';
import { seasonPayments } from '../season.js';
import { BRAND_NAME, SITE_HOST } from './brand.js';

test('coach page sample: every number from pricing.js, the real page’s sentences', () => {
  const s = coachPageSample();
  assert.ok(SAMPLE_BLOCK_PRICE_USD >= MINIMUM_CHARGE_USD && SAMPLE_SESSION_PRICE_USD >= MINIMUM_CHARGE_USD, 'never below the minimum charge');
  const p = seasonPayments(BLOCK_DEFAULT_WEEKS, 'month');
  assert.equal(s.block.amount, usd(SAMPLE_BLOCK_PRICE_USD));
  assert.equal(s.block.line, `${p} payments (${usd(SAMPLE_BLOCK_PRICE_USD * p)} in all)`);
  assert.equal(s.block.title, `${BLOCK_DEFAULT_WEEKS}-week block`);
  assert.equal(s.block.schedule, `${BLOCK_DEFAULT_WEEKS} weeks · starts when you join`);
  assert.equal(s.session.line, `Session · 60 min · ${usd(SAMPLE_SESSION_PRICE_USD)}`);
  assert.equal(s.badge, `Founding ${FOUNDING_SLOTS}`);
  assert.equal(s.address, `${SITE_HOST}/c/<your-name>`);
  assert.equal(handleWellFormed(SAMPLE_HANDLE), false, 'the example can never be a real coach’s address');
  assert.equal(pageHandle(SAMPLE_HANDLE), null);
  assert.equal(s.foot, `Coached on ${BRAND_NAME}`);
  // Today (with the config of 2026-10-25): $150 / month, 2 payments ($300 in all), a $50 session.
  assert.equal(`${s.block.amount} ${s.block.unit} · ${s.block.line}`, '$150 / month · 2 payments ($300 in all)');
});

test('coach page sample: a placeholder, never a person', () => {
  const s = coachPageSample();
  assert.equal(s.name, 'Your name');
  assert.equal(s.initials, 'YN');
  assert.doesNotMatch(JSON.stringify(s), /\b(he|she|his|her|him)\b/i, 'no gendered pronouns');
});
