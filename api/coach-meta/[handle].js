// GET /c/<handle> FOR LINK-PREVIEW BOTS ONLY (vercel.json rewrites /c/:handle to /api/coach-meta/:handle when the
// user agent matches src/web/linkPreviewBots.js; every other visitor gets the SPA shell (spa.html) from the CDN, never this
// function): the SPA shell with the coach's link-preview tags, because link unfurlers do not run JavaScript
// (launch plan Sprint 1 PR 3, 2026-10-25; review 2026-10-25 M1).
//
// 1. The handle comes from the PATH segment (/api/coach-meta/<handle>), never from a query parameter a visitor could
//    also send (review m3). Only if the platform hands the function the dynamic-route form (`/api/coach-meta/[handle]`
//    with `?handle=`) is the query read, and then exactly one `handle` or the plain page.
// 2. The template: the built dist/spa.html (the SPA shell; dist/index.html is the static home page since launch plan
//    W7), read from the function's own files (vercel.json `includeFiles`), else
//    fetched from this deployment's own origin (the production domain in production; never the request's Host).
// 3. coach_page(p_handle) with the publishable key (the same anon read the page makes; 2.5 s cap), kept per instance
//    for 60 s by normalised handle (at most 500 handles; failures are not kept), so repeat unfurls of one link spend
//    one call of coach_page's anon budget (300 an hour per ADDRESS, and this function calls from Vercel's addresses).
// 4. Tags from src/web/coachMeta.js, every value escaped. A retired handle answers 307 to the coach's new page (the
//    visitor's query kept); no page answers 404 with the SPA (which draws the 404 page).
// Any failure serves the plain shell. Without a template at all the answer is a 307 to /c/<handle>?spa=1, which
// vercel.json serves as the plain SPA (the page drops the marker).
//
// Edge cache: a page 300 s (SWR 600); a 404, a 307 and the plain fallback 30 s with no stale-while-revalidate (a
// coach who claims the name, or takes the page down, is seen within 30 s). The body never depends on the query (utm_*,
// fbclid), only the 307's Location carries it; Vercel's CDN still keys on the full URL, which the in-memory answer
// cache above covers.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { headTags, injectHead, metaFor } from '../../src/web/coachMeta.js';
import { pageHandle } from '../../src/web/handles.js';
import { DEFAULT_SUPABASE_KEY, DEFAULT_SUPABASE_URL } from '../../src/web/supabaseDefaults.js';

const RPC_TIMEOUT_MS = 2500;
const TEMPLATE_TIMEOUT_MS = 2500;
const CACHE_PAGE = 'public, max-age=0, s-maxage=300, stale-while-revalidate=600';
const CACHE_SHORT = 'public, max-age=0, s-maxage=30';
export const ANSWER_TTL_MS = 60_000;
export const ANSWER_CACHE_MAX = 500;

let templateCache = null;
/** handle → { at, promise } of coach_page's answer (in flight or settled). Insertion order = age. */
const answers = new Map();

/** Forgets every kept coach_page answer (tests). */
export function clearAnswerCache() { answers.clear(); }

async function withTimeout(ms, run) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try { return await run(ctl.signal); } finally { clearTimeout(t); }
}

/** This deployment's own origin: the production domain in production, else the deployment URL; null when unknown. */
export function ownOrigin(env) {
  const host = env.VERCEL_ENV === 'production' && env.VERCEL_PROJECT_PRODUCTION_URL ? env.VERCEL_PROJECT_PRODUCTION_URL : env.VERCEL_URL;
  return typeof host === 'string' && /^[a-z0-9.-]+(:\d+)?$/i.test(host) ? `https://${host}` : null;
}

/** The built SPA shell (spa.html): from the function's files, else from this deployment's origin. Null when neither answers. */
export async function loadTemplate({ env = process.env, fetchImpl = fetch, readImpl = readFile, cookie = null } = {}) {
  if (templateCache) return templateCache;
  for (const file of [path.join(process.cwd(), 'dist', 'spa.html'), new URL('../../dist/spa.html', import.meta.url)]) {
    try {
      const html = await readImpl(file, 'utf8');
      if (typeof html === 'string' && /<\/head>/i.test(html)) { templateCache = html; return html; }
    } catch { /* next */ }
  }
  const origin = ownOrigin(env);
  if (!origin) return null;
  try {
    const res = await withTimeout(TEMPLATE_TIMEOUT_MS, (signal) => fetchImpl(`${origin}/spa.html`, {
      signal, headers: cookie ? { cookie } : {}, redirect: 'manual',
    }));
    if (!res.ok) return null;
    const html = await res.text();
    if (!/<\/head>/i.test(html) || !/<div id="root">/.test(html)) return null;
    templateCache = html;   // the same deployment's file: safe to keep for the instance's life
    return html;
  } catch {
    return null;
  }
}

/** coach_page's answer, or undefined on any failure (a refusal, a timeout, an unreadable body). */
export async function readCoachPage(handle, { env = process.env, fetchImpl = fetch } = {}) {
  const url = (env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_KEY;
  try {
    const res = await withTimeout(RPC_TIMEOUT_MS, (signal) => fetchImpl(`${url}/rest/v1/rpc/coach_page`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ p_handle: handle }),
    }));
    if (!res.ok) return undefined;
    const body = await res.json();
    return body && typeof body === 'object' ? body : undefined;
  } catch {
    return undefined;
  }
}

/**
 * coach_page's answer through the per-instance cache: one call per handle per ANSWER_TTL_MS, concurrent misses share
 * the call, a failure (undefined) is forgotten at once so the next unfurl tries again. At most ANSWER_CACHE_MAX
 * handles: the oldest goes first.
 */
export function cachedCoachPage(handle, { env = process.env, fetchImpl = fetch, clockMs = Date.now() } = {}) {
  const hit = answers.get(handle);
  if (hit && clockMs - hit.at < ANSWER_TTL_MS) return hit.promise;
  if (hit) answers.delete(handle);
  const promise = readCoachPage(handle, { env, fetchImpl }).then((answer) => {
    if (answer === undefined && answers.get(handle)?.promise === promise) answers.delete(handle);
    return answer;
  });
  answers.set(handle, { at: clockMs, promise });
  while (answers.size > ANSWER_CACHE_MAX) answers.delete(answers.keys().next().value);
  return promise;
}

/**
 * The answer for /c/<handle>: `{ status, headers, body }`. Pure apart from the injected I/O, so the test drives it
 * with a stubbed fetch and template.
 */
export async function renderCoachPage({ handle: raw, search = '', env = process.env, fetchImpl = fetch, readImpl = readFile, cookie = null, nowMs = Date.now(), clockMs = Date.now() }) {
  const html = await loadTemplate({ env, fetchImpl, readImpl, cookie });
  const handle = pageHandle(raw);
  if (!html) {
    // No template to serve: hand the visitor to the plain SPA (vercel.json serves /c/<h>?spa=1 as spa.html).
    const q = new URLSearchParams(typeof search === 'string' ? search : '');
    q.set('spa', '1');
    const target = handle ? `/c/${handle}?${q}` : '/404';
    return { status: 307, headers: { Location: target, 'Cache-Control': 'no-store' }, body: '' };
  }
  const plain = (status, cache) => ({ status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': cache }, body: html });
  if (!handle) return { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': CACHE_SHORT }, body: injectHead(html, { noindex: true }) ?? html };
  const answer = await cachedCoachPage(handle, { env, fetchImpl, clockMs });
  const supabaseUrl = env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const r = metaFor(raw, answer, { supabaseUrl, nowMs, search });
  if (r.status === 307) return { status: 307, headers: { Location: r.location, 'Cache-Control': CACHE_SHORT }, body: '' };
  if (r.status === 404) {
    return { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': CACHE_SHORT }, body: injectHead(html, { noindex: true }) ?? html };
  }
  if (!r.meta) return plain(200, CACHE_SHORT);
  const body = injectHead(html, { tags: headTags(r.meta) });
  return body ? { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': CACHE_PAGE }, body } : plain(200, CACHE_SHORT);
}

/**
 * The handle and the query to keep, from the URL the function was called with: `{ raw, search }`, or `{ raw: null }`
 * when the request names no handle or names it ambiguously (two `handle` parameters). The path segment wins
 * (`/api/coach-meta/<h>`, or `/c/<h>` should the platform pass the visitor's own path); the dynamic-route form
 * `/api/coach-meta/[handle]?handle=<h>` is read only with exactly one `handle`. `search` never carries `handle`.
 */
export function requestHandle(reqUrl) {
  let url;
  try { url = new URL(typeof reqUrl === 'string' && reqUrl ? reqUrl : '/', 'http://localhost'); } catch { return { raw: null, search: '' }; }
  const fromQuery = url.searchParams.getAll('handle');
  url.searchParams.delete('handle');
  const search = url.search;
  const m = /^\/(?:api\/coach-meta|c)\/([^/]+)\/?$/.exec(url.pathname);
  let seg = null;
  if (m) {
    try { seg = decodeURIComponent(m[1]); } catch { seg = null; }
  }
  if (seg && seg !== '[handle]') return { raw: seg, search };
  if (fromQuery.length === 1) return { raw: fromQuery[0], search };
  return { raw: null, search };
}

/** The plain shell (cached 30 s), or a 307 to the 404 page when there is no template. */
async function plainPage(deps = {}) {
  const html = await loadTemplate(deps);
  return html
    ? { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': CACHE_SHORT }, body: html }
    : { status: 307, headers: { Location: '/404', 'Cache-Control': 'no-store' }, body: '' };
}

/** Vercel Node function. `deps` (env, fetchImpl, readImpl, nowMs, clockMs) are for the tests. */
export default async function handler(req, res, deps = {}) {
  let out;
  let handle = null;
  try {
    const { raw, search } = requestHandle(req.url);
    const cookie = typeof req.headers?.cookie === 'string' ? req.headers.cookie : null;
    if (raw === null) {
      out = await plainPage({ ...deps, cookie });
    } else {
      handle = pageHandle(raw);
      out = await renderCoachPage({ ...deps, handle: raw, search, cookie });
    }
  } catch {
    // Never an error page for a coach's link: the plain SPA draws the page (or its 404).
    out = { status: 307, headers: { Location: handle ? `/c/${handle}?spa=1` : '/404', 'Cache-Control': 'no-store' }, body: '' };
  }
  res.statusCode = out.status;
  for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
  res.end(out.body);
}
