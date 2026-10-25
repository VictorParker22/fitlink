// GET /c/<handle> (vercel.json rewrites it here as /api/coach-meta?handle=<handle>): the SPA's index.html with the
// coach's link-preview tags, because link unfurlers do not run JavaScript (launch plan Sprint 1 PR 3, 2026-10-25).
//
// 1. The template: the built dist/index.html, read from the function's own files (vercel.json `includeFiles`), else
//    fetched from this deployment's own origin (the production domain in production; never the request's Host).
// 2. coach_page(p_handle) with the publishable key (the same anon read the page makes; 2.5 s cap).
// 3. Tags from src/web/coachMeta.js, every value escaped. A retired handle answers 307 to the coach's new page; no page
//    answers 404 with the SPA (which draws the 404 page).
// Any failure serves the plain index.html. Without a template at all the answer is a 307 to /c/<handle>?spa=1, which
// vercel.json serves as the plain SPA (the page drops the marker): the page itself never depends on this function.
//
// The HTML is cached at Vercel's edge (s-maxage), so a busy page costs one coach_page call per few minutes per region:
// coach_page paces 300 calls an hour per address, and this function's calls come from Vercel's addresses.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { headTags, injectHead, metaFor } from '../src/web/coachMeta.js';
import { pageHandle } from '../src/web/handles.js';
import { DEFAULT_SUPABASE_KEY, DEFAULT_SUPABASE_URL } from '../src/web/supabaseDefaults.js';

const RPC_TIMEOUT_MS = 2500;
const TEMPLATE_TIMEOUT_MS = 2500;
const CACHE_PAGE = 'public, max-age=0, s-maxage=300, stale-while-revalidate=600';
const CACHE_SHORT = 'public, max-age=0, s-maxage=30';

let templateCache = null;

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

/** The built index.html: from the function's files, else from this deployment's origin. Null when neither answers. */
export async function loadTemplate({ env = process.env, fetchImpl = fetch, readImpl = readFile, cookie = null } = {}) {
  if (templateCache) return templateCache;
  for (const file of [path.join(process.cwd(), 'dist', 'index.html'), new URL('../dist/index.html', import.meta.url)]) {
    try {
      const html = await readImpl(file, 'utf8');
      if (typeof html === 'string' && /<\/head>/i.test(html)) { templateCache = html; return html; }
    } catch { /* next */ }
  }
  const origin = ownOrigin(env);
  if (!origin) return null;
  try {
    const res = await withTimeout(TEMPLATE_TIMEOUT_MS, (signal) => fetchImpl(`${origin}/index.html`, {
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
 * The answer for /c/<handle>: `{ status, headers, body }`. Pure apart from the injected I/O, so the test drives it
 * with a stubbed fetch and template.
 */
export async function renderCoachPage({ handle: raw, search = '', env = process.env, fetchImpl = fetch, readImpl = readFile, cookie = null, nowMs = Date.now() }) {
  const html = await loadTemplate({ env, fetchImpl, readImpl, cookie });
  const handle = pageHandle(raw);
  if (!html) {
    // No template to serve: hand the visitor to the plain SPA (vercel.json serves /c/<h>?spa=1 as index.html).
    const q = new URLSearchParams(typeof search === 'string' ? search : '');
    q.set('spa', '1');
    const target = handle ? `/c/${handle}?${q}` : '/404';
    return { status: 307, headers: { Location: target, 'Cache-Control': 'no-store' }, body: '' };
  }
  const plain = (status, cache) => ({ status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': cache }, body: html });
  if (!handle) return { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': CACHE_PAGE }, body: injectHead(html, { noindex: true }) ?? html };
  const answer = await readCoachPage(handle, { env, fetchImpl });
  const supabaseUrl = env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const r = metaFor(raw, answer, { supabaseUrl, nowMs, search });
  if (r.status === 307) return { status: 307, headers: { Location: r.location, 'Cache-Control': CACHE_PAGE }, body: '' };
  if (r.status === 404) {
    return { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': CACHE_PAGE }, body: injectHead(html, { noindex: true }) ?? html };
  }
  if (!r.meta) return plain(200, CACHE_SHORT);
  const body = injectHead(html, { tags: headTags(r.meta) });
  return body ? { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': CACHE_PAGE }, body } : plain(200, CACHE_SHORT);
}

/** Vercel Node function. */
export default async function handler(req, res) {
  let out;
  let handle = null;
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const raw = url.searchParams.get('handle') ?? '';
    handle = pageHandle(raw);
    url.searchParams.delete('handle');
    out = await renderCoachPage({ handle: raw, search: url.search, cookie: typeof req.headers?.cookie === 'string' ? req.headers.cookie : null });
  } catch {
    // Never an error page for a coach's link: the plain SPA draws the page (or its 404).
    out = { status: 307, headers: { Location: handle ? `/c/${handle}?spa=1` : '/404', 'Cache-Control': 'no-store' }, body: '' };
  }
  res.statusCode = out.status;
  for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
  res.end(out.body);
}
