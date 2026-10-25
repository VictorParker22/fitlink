// node --test src/web/coachMeta.test.js
// Link previews for /c/<handle>: the tags (coachMeta.js) and the Vercel function (api/coach-meta.js) against a
// stubbed fetch and template. Every value from coach_page is escaped; any failure serves the plain index.html.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, escapeHtml, headTags, injectHead, metaFor, ogImageUrl, shortDay } from './coachMeta.js';
import { renderCoachPage, ownOrigin } from '../../api/coach-meta.js';

const NOW = Date.UTC(2026, 9, 25, 15);
const SUPA = 'https://proj.supabase.co';
const TEMPLATE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content="Home description" />
    <title>FitLink — Home</title>
    <script type="module" crossorigin src="/assets/index-abc.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
const COACH = '33333333-3333-4333-8333-333333333333';
const found = (coach = {}, o = {}) => ({
  found: true, handle: 'dana-ruiz', next_block_starts_on: '2026-12-01', model_b: false, passes: [],
  coach: { id: COACH, name: 'Dana Ruiz', specialization: 'Strength', specializations: [], ...coach }, ...o,
});

test('escaping and cleaning: nothing a coach writes can open a tag, close a quote or flip the text', () => {
  assert.equal(escapeHtml(`"><script>alert('x')</script>&`), '&quot;&gt;&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;&amp;');
  assert.equal(cleanText('Dana‮evil\u0000  Ruiz\n', 40), 'Dana evil Ruiz');
  assert.equal(cleanText('   ', 10), null);
  assert.equal(cleanText('x'.repeat(100), 10), `${'x'.repeat(9)}…`);
  assert.equal(shortDay('2026-12-01', NOW), 'Dec 1');
  assert.equal(shortDay('2027-07-01', NOW), 'Jul 1, 2027');
  assert.equal(shortDay('soon', NOW), null);
  assert.equal(ogImageUrl(`${SUPA}/`, 'dana-ruiz'), `${SUPA}/functions/v1/coach-og?handle=dana-ruiz`);
});

test('metaFor: a page, a retired handle, no page, an unreadable answer', () => {
  const r = metaFor('Dana-Ruiz', found(), { supabaseUrl: SUPA, nowMs: NOW });
  assert.equal(r.status, 200);
  assert.deepEqual(r.meta, {
    title: 'Dana Ruiz · FitLink',
    ogTitle: 'Dana Ruiz · Strength',
    description: 'Strength. Next block starts Dec 1. Join and pay on the web, no app needed.',
    image: `${SUPA}/functions/v1/coach-og?handle=dana-ruiz`,
    imageAlt: 'Dana Ruiz on FitLink',
    url: 'https://fitlink.coach/c/dana-ruiz',
  });
  assert.equal(metaFor('dana', found({ name: '', specialization: null }, { next_block_starts_on: null }), { supabaseUrl: SUPA, nowMs: NOW }).meta.description,
    'Join and pay on the web, no app needed.');
  assert.deepEqual(metaFor('old', { found: false, redirect: 'dana-ruiz' }, { search: '?utm_source=ig&spa=1' }), { status: 307, location: '/c/dana-ruiz?utm_source=ig' });
  assert.deepEqual(metaFor('old', { found: false, redirect: '//evil.com' }), { status: 404 });
  assert.deepEqual(metaFor('nobody', { found: false }), { status: 404 });
  assert.deepEqual(metaFor('-bad', found()), { status: 404 });
  assert.deepEqual(metaFor('dana', undefined), { status: 200 });
  assert.deepEqual(metaFor('dana', { found: 'yes' }), { status: 200 });
});

test('the head: tags escaped, the template\'s title and description replaced, nothing else touched', () => {
  const r = metaFor('dana-ruiz', found({ name: 'Dana "><script>x</script>', specialization: '<img src=x onerror=alert(1)>' }), { supabaseUrl: SUPA, nowMs: NOW });
  const html = injectHead(TEMPLATE, { tags: headTags(r.meta) });
  assert.ok(!html.includes('<script>x'), 'no tag from a name');
  assert.ok(!html.includes('<img'), 'no tag from a sport');
  assert.ok(html.includes('&lt;script&gt;'));
  assert.equal((html.match(/<title>/g) ?? []).length, 1);
  assert.equal((html.match(/name="description"/g) ?? []).length, 1);
  assert.ok(!html.includes('Home description'));
  for (const p of ['og:title', 'og:description', 'og:image', 'og:url', 'og:image:width', 'og:image:height']) assert.ok(html.includes(`property="${p}"`), p);
  assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
  assert.ok(html.includes('<script type="module" crossorigin src="/assets/index-abc.js"></script>'), 'the app still loads');
  assert.ok(html.includes('<div id="root"></div>'));
  assert.equal(injectHead('<html>no head</html>', { tags: '<title>x</title>' }), null);
  const nf = injectHead(TEMPLATE, { noindex: true });
  assert.ok(nf.includes('<meta name="robots" content="noindex" />') && nf.includes('<title>FitLink — Home</title>'));
});

/** A fetch stub: coach_page answers `rpc`; /index.html answers `page` (or fails). */
function stubFetch({ rpc, rpcStatus = 200, page = null, throwRpc = false } = {}) {
  const calls = [];
  const f = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith('/rest/v1/rpc/coach_page')) {
      if (throwRpc) throw new Error('offline');
      return new Response(JSON.stringify(rpc), { status: rpcStatus, headers: { 'Content-Type': 'application/json' } });
    }
    if (String(url).endsWith('/index.html') && page !== null) return new Response(page, { status: 200 });
    return new Response('nope', { status: 401 });
  };
  f.calls = calls;
  return f;
}
const ENV = { VITE_SUPABASE_URL: SUPA, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' };
const readOk = async () => TEMPLATE;
const readNone = async () => { throw new Error('ENOENT'); };

test('function: a page gets its tags, cached at the edge; the RPC is the anon coach_page', async () => {
  const fetchImpl = stubFetch({ rpc: found() });
  const out = await renderCoachPage({ handle: 'Dana-Ruiz', env: ENV, fetchImpl, readImpl: readOk, nowMs: NOW });
  assert.equal(out.status, 200);
  assert.match(out.headers['Content-Type'], /text\/html/);
  assert.match(out.headers['Cache-Control'], /s-maxage=300/);
  assert.ok(out.body.includes('<meta property="og:image" content="https://proj.supabase.co/functions/v1/coach-og?handle=dana-ruiz" />'));
  assert.ok(out.body.includes('<title>Dana Ruiz · FitLink</title>'));
  const rpc = fetchImpl.calls.find((c) => c.url.endsWith('/rpc/coach_page'));
  assert.equal(rpc.init.method, 'POST');
  assert.equal(rpc.init.headers.apikey, 'sb_publishable_test');
  assert.deepEqual(JSON.parse(rpc.init.body), { p_handle: 'dana-ruiz' });
});

test('function: redirect, not found, failures, a bad handle, no template', async () => {
  const redirect = await renderCoachPage({ handle: 'old', search: '?utm_source=ig', env: ENV, fetchImpl: stubFetch({ rpc: { found: false, redirect: 'dana-ruiz' } }), readImpl: readOk, nowMs: NOW });
  assert.equal(redirect.status, 307);
  assert.equal(redirect.headers.Location, '/c/dana-ruiz?utm_source=ig');

  const nf = await renderCoachPage({ handle: 'nobody', env: ENV, fetchImpl: stubFetch({ rpc: { found: false } }), readImpl: readOk, nowMs: NOW });
  assert.equal(nf.status, 404);
  assert.ok(nf.body.includes('noindex') && nf.body.includes('<div id="root">'), 'the SPA draws its 404 page');

  for (const f of [stubFetch({ rpc: { message: 'rate_limited' }, rpcStatus: 400 }), stubFetch({ throwRpc: true }), stubFetch({ rpc: 'garbage' })]) {
    const out = await renderCoachPage({ handle: 'dana-ruiz', env: ENV, fetchImpl: f, readImpl: readOk, nowMs: NOW });
    assert.equal(out.status, 200);
    assert.equal(out.body, TEMPLATE, 'any failure: the plain index.html');
    assert.match(out.headers['Cache-Control'], /s-maxage=30\b/);
  }

  const bad = stubFetch({ rpc: found() });
  const badOut = await renderCoachPage({ handle: '../../etc', env: ENV, fetchImpl: bad, readImpl: readOk, nowMs: NOW });
  assert.equal(badOut.status, 404);
  assert.equal(bad.calls.filter((c) => c.url.includes('/rpc/')).length, 0, 'no RPC for a handle that cannot be a page');
});

test('function: the template from the deployment\'s own origin, never the request\'s host; none at all → the plain SPA', async () => {
  assert.equal(ownOrigin({ VERCEL_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: 'fitlink.coach', VERCEL_URL: 'x-abc.vercel.app' }), 'https://fitlink.coach');
  assert.equal(ownOrigin({ VERCEL_ENV: 'preview', VERCEL_URL: 'x-abc.vercel.app' }), 'https://x-abc.vercel.app');
  assert.equal(ownOrigin({ VERCEL_URL: 'evil.com/path' }), null);
  assert.equal(ownOrigin({}), null);
  // (templateCache: renderCoachPage above already cached the file template for this process, so test the loader alone.)
  const { loadTemplate } = await import(`../../api/coach-meta.js?fresh=${Date.now()}`);
  const f = stubFetch({ rpc: found(), page: TEMPLATE });
  assert.equal(await loadTemplate({ env: { VERCEL_URL: 'x-abc.vercel.app' }, fetchImpl: f, readImpl: readNone }), TEMPLATE);
  assert.equal(f.calls[0].url, 'https://x-abc.vercel.app/index.html');
  const { renderCoachPage: fresh } = await import(`../../api/coach-meta.js?fresh2=${Date.now()}`);
  const none = await fresh({ handle: 'Dana-Ruiz', search: '?utm_source=ig', env: {}, fetchImpl: stubFetch({ rpc: found() }), readImpl: readNone, nowMs: NOW });
  assert.equal(none.status, 307);
  assert.equal(none.headers.Location, '/c/dana-ruiz?utm_source=ig&spa=1');
  assert.equal(none.headers['Cache-Control'], 'no-store');
});
