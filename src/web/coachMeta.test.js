// node --test src/web/coachMeta.test.js
// Link previews for /c/<handle>: the tags (coachMeta.js) and the Vercel function (api/coach-meta/[handle].js) against a
// stubbed fetch and template. Every value from coach_page is escaped; any failure serves the plain index.html.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, escapeHtml, headTags, injectHead, metaFor, ogImageUrl, shortDay } from './coachMeta.js';
import { readFileSync } from 'node:fs';
import handler, { ANSWER_CACHE_MAX, cachedCoachPage, clearAnswerCache, renderCoachPage, ownOrigin, requestHandle } from '../../api/coach-meta/[handle].js';
import { LINK_PREVIEW_UA_PATTERN, isLinkPreviewBot } from './linkPreviewBots.js';

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
  clearAnswerCache();
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
  clearAnswerCache();
  const redirect = await renderCoachPage({ handle: 'old', search: '?utm_source=ig', env: ENV, fetchImpl: stubFetch({ rpc: { found: false, redirect: 'dana-ruiz' } }), readImpl: readOk, nowMs: NOW });
  assert.equal(redirect.status, 307);
  assert.equal(redirect.headers.Location, '/c/dana-ruiz?utm_source=ig');
  assert.equal(redirect.headers['Cache-Control'], 'public, max-age=0, s-maxage=30', 'a 307 is kept 30 s, no stale-while-revalidate');

  const nf = await renderCoachPage({ handle: 'nobody', env: ENV, fetchImpl: stubFetch({ rpc: { found: false } }), readImpl: readOk, nowMs: NOW });
  assert.equal(nf.status, 404);
  assert.ok(nf.body.includes('noindex') && nf.body.includes('<div id="root">'), 'the SPA draws its 404 page');
  assert.equal(nf.headers['Cache-Control'], 'public, max-age=0, s-maxage=30', 'a 404 is kept 30 s: a coach who claims the name is seen soon');

  for (const f of [stubFetch({ rpc: { message: 'rate_limited' }, rpcStatus: 400 }), stubFetch({ throwRpc: true }), stubFetch({ rpc: 'garbage' })]) {
    clearAnswerCache();
    const out = await renderCoachPage({ handle: 'dana-ruiz', env: ENV, fetchImpl: f, readImpl: readOk, nowMs: NOW });
    assert.equal(out.status, 200);
    assert.equal(out.body, TEMPLATE, 'any failure: the plain index.html');
    assert.match(out.headers['Cache-Control'], /s-maxage=30\b/);
  }

  const bad = stubFetch({ rpc: found() });
  clearAnswerCache();
  const badOut = await renderCoachPage({ handle: '../../etc', env: ENV, fetchImpl: bad, readImpl: readOk, nowMs: NOW });
  assert.equal(badOut.status, 404);
  assert.match(badOut.headers['Cache-Control'], /s-maxage=30$/);
  assert.equal(bad.calls.filter((c) => c.url.includes('/rpc/')).length, 0, 'no RPC for a handle that cannot be a page');
});

test('function: the template from the deployment\'s own origin, never the request\'s host; none at all → the plain SPA', async () => {
  assert.equal(ownOrigin({ VERCEL_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: 'fitlink.coach', VERCEL_URL: 'x-abc.vercel.app' }), 'https://fitlink.coach');
  assert.equal(ownOrigin({ VERCEL_ENV: 'preview', VERCEL_URL: 'x-abc.vercel.app' }), 'https://x-abc.vercel.app');
  assert.equal(ownOrigin({ VERCEL_URL: 'evil.com/path' }), null);
  assert.equal(ownOrigin({}), null);
  // (templateCache: renderCoachPage above already cached the file template for this process, so test the loader alone.)
  const { loadTemplate } = await import(`../../api/coach-meta/[handle].js?fresh=${Date.now()}`);
  const f = stubFetch({ rpc: found(), page: TEMPLATE });
  assert.equal(await loadTemplate({ env: { VERCEL_URL: 'x-abc.vercel.app' }, fetchImpl: f, readImpl: readNone }), TEMPLATE);
  assert.equal(f.calls[0].url, 'https://x-abc.vercel.app/index.html');
  const { renderCoachPage: fresh } = await import(`../../api/coach-meta/[handle].js?fresh2=${Date.now()}`);
  const none = await fresh({ handle: 'Dana-Ruiz', search: '?utm_source=ig', env: {}, fetchImpl: stubFetch({ rpc: found() }), readImpl: readNone, nowMs: NOW });
  assert.equal(none.status, 307);
  assert.equal(none.headers.Location, '/c/dana-ruiz?utm_source=ig&spa=1');
  assert.equal(none.headers['Cache-Control'], 'no-store');
});

test('the head: `$` patterns in a name or a sport are text, never replacement patterns (review m1)', () => {
  const name = 'Dana $` $\' $& $$ Ruiz';
  const r = metaFor('dana-ruiz', found({ name, specialization: "Lift $' $& $$ $` heavy" }), { supabaseUrl: SUPA, nowMs: NOW });
  const html = injectHead(TEMPLATE, { tags: headTags(r.meta) });
  assert.ok(html.includes('<title>Dana $` $&#39; $&amp; $$ Ruiz · FitLink</title>'));
  assert.ok(html.includes('content="Lift $&#39; $&amp; $$ $` heavy. Next block starts Dec 1.'));
  assert.equal((html.match(/<\/head>/g) ?? []).length, 1, 'no </head> copied in');
  assert.equal((html.match(/<script /g) ?? []).length, 1, 'the template head is not copied into a tag');
  assert.equal((html.match(/<html/g) ?? []).length, 1);
  assert.ok(html.indexOf('<title>') < html.indexOf('</head>') && html.indexOf('</head>') < html.indexOf('<body>'));
});

test('function: coach_page answers are kept 60 s per handle, failures are not, at most 500 handles', async () => {
  clearAnswerCache();
  const f = stubFetch({ rpc: found() });
  const t0 = NOW;
  for (const [raw, at] of [['dana-ruiz', t0], ['Dana-Ruiz', t0 + 1000], ['@dana-ruiz', t0 + 59_000]]) {
    const out = await renderCoachPage({ handle: raw, search: `?utm_source=ig&fbclid=${at}`, env: ENV, fetchImpl: f, readImpl: readOk, nowMs: NOW, clockMs: at });
    assert.equal(out.status, 200);
  }
  const rpcCalls = () => f.calls.filter((c) => c.url.endsWith('/rpc/coach_page')).length;
  assert.equal(rpcCalls(), 1, 'one call for three unfurls of one handle (query and case ignored)');
  await renderCoachPage({ handle: 'dana-ruiz', env: ENV, fetchImpl: f, readImpl: readOk, nowMs: NOW, clockMs: t0 + 60_000 });
  assert.equal(rpcCalls(), 2, 'kept 60 s, then asked again');

  clearAnswerCache();
  const down = stubFetch({ rpc: { message: 'rate_limited' }, rpcStatus: 400 });
  await renderCoachPage({ handle: 'dana-ruiz', env: ENV, fetchImpl: down, readImpl: readOk, nowMs: NOW, clockMs: t0 });
  const up = stubFetch({ rpc: found() });
  const after = await renderCoachPage({ handle: 'dana-ruiz', env: ENV, fetchImpl: up, readImpl: readOk, nowMs: NOW, clockMs: t0 + 1 });
  assert.ok(after.body.includes('<title>Dana Ruiz · FitLink</title>'), 'a refused call is not kept');

  clearAnswerCache();
  const many = stubFetch({ rpc: found() });
  const shared = await Promise.all([cachedCoachPage('a-1', { env: ENV, fetchImpl: many, clockMs: t0 }), cachedCoachPage('a-1', { env: ENV, fetchImpl: many, clockMs: t0 })]);
  assert.deepEqual(shared[0], shared[1]);
  assert.equal(many.calls.length, 1, 'concurrent misses share one call');
  for (let i = 0; i < ANSWER_CACHE_MAX + 20; i += 1) await cachedCoachPage(`h-${i}`, { env: ENV, fetchImpl: many, clockMs: t0 });
  const before = many.calls.length;
  await cachedCoachPage('h-0', { env: ENV, fetchImpl: many, clockMs: t0 });
  assert.equal(many.calls.length, before + 1, 'the oldest handle left the bounded cache');
  await cachedCoachPage(`h-${ANSWER_CACHE_MAX + 19}`, { env: ENV, fetchImpl: many, clockMs: t0 });
  assert.equal(many.calls.length, before + 1, 'the newest is still kept');
  clearAnswerCache();
});

test('function: the handle is the path segment, never a query parameter the visitor sends (review m3)', () => {
  assert.deepEqual(requestHandle('/api/coach-meta/dana-ruiz?utm_source=ig'), { raw: 'dana-ruiz', search: '?utm_source=ig' });
  assert.deepEqual(requestHandle('/api/coach-meta/dana-ruiz?handle=old-name&utm_source=ig'), { raw: 'dana-ruiz', search: '?utm_source=ig' });
  assert.deepEqual(requestHandle('/c/Dana-Ruiz?handle=old-name'), { raw: 'Dana-Ruiz', search: '' });
  // The dynamic-route form, should the platform hand it over: exactly one handle, else nothing.
  assert.deepEqual(requestHandle('/api/coach-meta/[handle]?handle=dana-ruiz'), { raw: 'dana-ruiz', search: '' });
  assert.deepEqual(requestHandle('/api/coach-meta/%5Bhandle%5D?handle=dana-ruiz&handle=old-name'), { raw: null, search: '' });
  assert.deepEqual(requestHandle('/api/coach-meta?handle=a&handle=b&utm_source=x'), { raw: null, search: '?utm_source=x' });
  assert.deepEqual(requestHandle('/api/coach-meta'), { raw: null, search: '' });
  assert.deepEqual(requestHandle('/api/coach-meta/%E0%A4%A'), { raw: null, search: '' });
  assert.deepEqual(requestHandle('/api/coach-meta/a/b'), { raw: null, search: '' });
});

// ---- vercel.json: who reaches the function -------------------------------------------------------------------------
const VERCEL = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
const UA = {
  iMessage: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.4 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.4 facebookexternalhit/1.1 Facebot Twitterbot/1.0',
  facebook: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  whatsapp: 'WhatsApp/2.23.20.0 A',
  slack: 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
  discord: 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
  x: 'Twitterbot/1.0',
  linkedin: 'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
  telegram: 'TelegramBot (like TwitterBot)',
  google: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  bluesky: 'Mozilla/5.0 (compatible; Bluesky Cardyb/1.1; +mailto:support@bsky.app)',
};
const HUMANS = {
  safari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 400.0.0.0.0 (iPhone16,2; iOS 26_0; en_US)',
  facebookApp: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0.0;FBBV/1]',
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  pinterestApp: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [Pinterest/iOS]',
  xApp: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Twitter for iPhone/11.0',
};

/** vercel.json's rewrites, applied the way the platform documents them (first match wins; `has` is a regex). */
function route(pathname, query, ua) {
  for (const r of VERCEL.rewrites) {
    let m;
    let params = {};
    if (r.source === '/c/:handle') {
      m = /^\/c\/([^/]+?)\/?$/.exec(pathname);
      if (m) params = { handle: m[1] };
    } else {
      m = new RegExp(`^${r.source}$`).exec(pathname);
    }
    if (!m) continue;
    const ok = (r.has ?? []).every((h) => (h.type === 'query' ? new URLSearchParams(query).has(h.key)
      : h.type === 'header' && h.key === 'user-agent' ? new RegExp(`^${h.value}$`).test(ua ?? '') : false));
    if (!ok) continue;
    const dest = r.destination.replace(/:(\w+)/g, (_, k) => params[k] ?? '');
    return query ? `${dest}${dest.includes('?') ? '&' : '?'}${query.replace(/^\?/, '')}` : dest;
  }
  return pathname;
}

test('vercel.json: only link-preview bots reach the function; people get the SPA from the CDN (review M1)', async () => {
  const rule = VERCEL.rewrites.find((r) => r.destination === '/api/coach-meta/:handle');
  assert.ok(rule, 'the path form, not ?handle=');
  assert.deepEqual(rule.has, [{ type: 'header', key: 'user-agent', value: LINK_PREVIEW_UA_PATTERN }], 'vercel.json carries linkPreviewBots.js exactly');
  assert.ok(!/\(\?i\)|\(\?[=!<]/.test(rule.has[0].value), 'no inline flags or lookaround in the has value');
  assert.ok(VERCEL.rewrites.indexOf(rule) === 1 && VERCEL.rewrites[0].has[0].key === 'spa', 'the ?spa fallback still comes first');
  assert.ok(VERCEL.functions['api/coach-meta/*.js'], 'the function config matches the moved file');
  for (const [who, ua] of Object.entries(UA)) {
    assert.ok(isLinkPreviewBot(ua), who);
    assert.ok(new RegExp(LINK_PREVIEW_UA_PATTERN).test(ua), `${who} (unanchored)`);
  }
  for (const [who, ua] of Object.entries(HUMANS)) assert.ok(!isLinkPreviewBot(ua), who);

  for (const ua of Object.values(HUMANS)) {
    assert.equal(route('/c/dana-ruiz', 'utm_source=ig&fbclid=abc', ua), '/index.html?utm_source=ig&fbclid=abc');
  }
  assert.equal(route('/c/dana-ruiz', 'spa=1', UA.facebook), '/index.html?spa=1', 'the no-template fallback never loops');
  assert.equal(route('/.well-known/apple-app-site-association', '', UA.facebook), '/.well-known/apple-app-site-association');
  assert.equal(route('/i/ABC123', '', UA.facebook), '/index.html');
  // The catch-all must not swallow the function itself (seen on the preview deploy 2026-10-25: /api/coach-meta/x
  // came back as the static index.html).
  assert.equal(route('/api/coach-meta/dana-ruiz', '', UA.facebook), '/api/coach-meta/dana-ruiz');

  // A bot, end to end: vercel.json's destination → the function → the coach's tags. A visitor's own ?handle= loses.
  clearAnswerCache();
  const dest = route('/c/Dana-Ruiz', 'handle=old-name&utm_source=ig', UA.iMessage);
  assert.equal(dest, '/api/coach-meta/Dana-Ruiz?handle=old-name&utm_source=ig');
  const f = stubFetch({ rpc: found() });
  const res = { statusCode: 0, headers: {}, body: null, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } };
  await handler({ url: dest, headers: { 'user-agent': UA.iMessage } }, res, { env: ENV, fetchImpl: f, readImpl: readOk, nowMs: NOW, clockMs: NOW });
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.includes('<meta property="og:title" content="Dana Ruiz · Strength" />'));
  assert.deepEqual(JSON.parse(f.calls.find((c) => c.url.endsWith('/rpc/coach_page')).init.body), { p_handle: 'dana-ruiz' });

  // Two handles in the dynamic-route form: the plain page, no RPC.
  const g = stubFetch({ rpc: found() });
  const res2 = { statusCode: 0, headers: {}, body: null, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } };
  await handler({ url: '/api/coach-meta/[handle]?handle=a-b&handle=c-d', headers: {} }, res2, { env: ENV, fetchImpl: g, readImpl: readOk });
  assert.equal(res2.statusCode, 200);
  assert.equal(res2.body, TEMPLATE);
  assert.equal(g.calls.length, 0);
  clearAnswerCache();
});
