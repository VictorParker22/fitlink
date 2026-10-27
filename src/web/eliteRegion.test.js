// Web Elite is offered in the United States only (owner, 2026-10-27): the country helpers (eliteRegion.js) and the
// Vercel function that names the visitor's country (api/geo.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { countryOf } from '../../api/geo.js';
import { eliteElsewhereWords, forgetCountry, readCountry, webEliteOffered } from './eliteRegion.js';
import { BRAND_NAME } from './site/brand.js';

test('only the United States is offered web Elite; an unknown country is not', () => {
  assert.equal(webEliteOffered('US'), true);
  for (const c of ['CA', 'GB', 'MX', 'PR', null, undefined, '', 'us']) assert.equal(webEliteOffered(c), false, String(c));
});

test('the sentence outside the US names the app, not a price', () => {
  assert.equal(eliteElsewhereWords(BRAND_NAME),
    `Coach Elite on the website is for coaches in the United States. Elsewhere, subscribe in the ${BRAND_NAME} app.`);
});

test('countryOf reads Vercel\'s two-letter header and nothing else', () => {
  assert.equal(countryOf({ 'x-vercel-ip-country': 'US' }), 'US');
  assert.equal(countryOf({ 'x-vercel-ip-country': ' gb ' }), 'GB');
  for (const h of [{}, undefined, { 'x-vercel-ip-country': 'USA' }, { 'x-vercel-ip-country': '' }, { 'x-vercel-ip-country': ['US'] }, { country: 'US' }]) {
    assert.equal(countryOf(h), null, JSON.stringify(h));
  }
});

test('the function answers the country as JSON and is never cached', () => {
  const headers = {};
  const res = { setHeader: (k, v) => { headers[k.toLowerCase()] = v; }, end(body) { this.body = body; } };
  handler({ headers: { 'x-vercel-ip-country': 'ca' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(headers['cache-control'], 'private, no-store');
  assert.match(headers['content-type'], /^application\/json/);
  assert.deepEqual(JSON.parse(res.body), { country: 'CA' });
  handler({ headers: {} }, res);
  assert.deepEqual(JSON.parse(res.body), { country: null });
});

test('readCountry asks once per page load and turns any failure into null', async () => {
  forgetCountry();
  let calls = 0;
  const ok = async (url) => { calls += 1; assert.equal(url, '/api/geo'); return { ok: true, json: async () => ({ country: 'US' }) }; };
  assert.equal(await readCountry(ok), 'US');
  assert.equal(await readCountry(ok), 'US');
  assert.equal(calls, 1);
  for (const f of [
    async () => { throw new Error('offline'); },
    async () => ({ ok: false, json: async () => ({ country: 'US' }) }),
    async () => ({ ok: true, json: async () => { throw new SyntaxError('the SPA answered HTML'); } }),
    async () => ({ ok: true, json: async () => ({ country: 'usa' }) }),
  ]) {
    forgetCountry();
    assert.equal(await readCountry(f), null);
  }
  forgetCountry();
});
