// Link previews for /c/<handle> (launch plan Sprint 1 PR 3, 2026-10-25). Pure: the Vercel function
// `api/coach-meta/[handle].js` uses it, `node --test src/web/coachMeta.test.js` pins it. No JSON imports and no React, so the
// function bundles it as plain ES modules.
//
// Link unfurlers (iMessage, WhatsApp, Instagram, Slack, X…) do not run JavaScript: they read the HTML the server
// sends. For /c/<handle> that HTML is the SPA's own index.html with its <title> and description replaced and the
// Open Graph / Twitter tags added, every value from `coach_page` (the anon RPC the page itself reads) and escaped. The
// image is fitlink-app's `coach-og` function (1200 × 630 PNG, drawn from the same answer). Any failure serves the
// plain index.html: the page itself never depends on this.
import { BRAND_NAME, SITE_ORIGIN } from './site/brand.js';
import { pageHandle } from './handles.js';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Escapes text for an HTML attribute or text node: & < > " ' (nothing in a value can open a tag or close a quote). */
export function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * A coach-written string made safe to print as one line: control, format and bidi characters out (a name cannot
 * reverse the text around it), whitespace collapsed, cut at `max` code points with an ellipsis. Null when empty.
 */
export function cleanText(v, max) {
  if (typeof v !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  if (!s) return null;
  const chars = Array.from(s);
  return chars.length > max ? `${chars.slice(0, max - 1).join('').trimEnd()}…` : s;
}

/** "Dec 1" for a YYYY-MM-DD day (UTC, the server's calendar-day rule), with the year when ~6 months away. */
export function shortDay(day, nowMs) {
  if (typeof day !== 'string' || !DAY_RE.test(day)) return null;
  const ms = Date.parse(`${day}T12:00:00Z`);
  if (!Number.isFinite(ms)) return null;
  const far = Math.abs(ms - nowMs) > 183 * 86_400_000;
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC', ...(far ? { year: 'numeric' } : {}) });
}

function sport(coach) {
  const main = cleanText(coach?.specialization, 60);
  if (main) return main;
  const list = Array.isArray(coach?.specializations) ? coach.specializations.map((s) => cleanText(s, 30)).filter(Boolean) : [];
  return list.length ? [...new Set(list)].slice(0, 3).join(' · ') : null;
}

/** coach-og's address for a handle. */
export function ogImageUrl(supabaseUrl, handle) {
  return `${String(supabaseUrl).replace(/\/+$/, '')}/functions/v1/coach-og?handle=${encodeURIComponent(handle)}`;
}

/**
 * What the server answers for /c/<raw>: `{ status: 200, meta }` for a page, `{ status: 307, location }` for a retired
 * handle (the coach's new page; temporary, because the coach can take the old name back), `{ status: 404 }` for no
 * page, or `{ status: 200 }` (plain index.html) for anything this cannot read. `answer`: coach_page's jsonb, or
 * undefined when the call failed.
 */
export function metaFor(raw, answer, { supabaseUrl, nowMs = Date.now(), search = '' } = {}) {
  const handle = pageHandle(raw);
  if (!handle) return { status: 404 };
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return { status: 200 };
  if (answer.found === false) {
    const to = pageHandle(answer.redirect);
    if (!to) return { status: 404 };
    return { status: 307, location: `/c/${to}${keepQuery(search)}` };
  }
  if (answer.found !== true || !answer.coach || typeof answer.coach !== 'object') return { status: 200 };
  const shown = pageHandle(answer.handle) ?? handle;
  const name = cleanText(answer.coach.name, 70) ?? 'Coach';
  const line = sport(answer.coach);
  const next = shortDay(answer.next_block_starts_on, nowMs);
  const description = [
    line ? `${line}.` : null,
    next ? `Next block starts ${next}.` : null,
    'Join and pay on the web, no app needed.',
  ].filter(Boolean).join(' ');
  return {
    status: 200,
    meta: {
      title: `${name} · ${BRAND_NAME}`,
      ogTitle: line ? `${name} · ${line}` : name,
      description,
      image: ogImageUrl(supabaseUrl, shown),
      imageAlt: `${name} on ${BRAND_NAME}`,
      url: `${SITE_ORIGIN}/c/${shown}`,
    },
  };
}

/** The query to carry through a redirect (utm_* and the like), without the `spa` marker. */
function keepQuery(search) {
  let q;
  try { q = new URLSearchParams(typeof search === 'string' ? search : ''); } catch { return ''; }
  q.delete('spa');
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** The tags for the head, every value escaped. */
export function headTags(meta) {
  const m = (property, content) => `<meta property="${property}" content="${escapeHtml(content)}" />`;
  const n = (name, content) => `<meta name="${name}" content="${escapeHtml(content)}" />`;
  return [
    `<title>${escapeHtml(meta.title)}</title>`,
    n('description', meta.description),
    `<link rel="canonical" href="${escapeHtml(meta.url)}" />`,
    m('og:type', 'website'),
    m('og:site_name', BRAND_NAME),
    m('og:title', meta.ogTitle),
    m('og:description', meta.description),
    m('og:url', meta.url),
    m('og:image', meta.image),
    m('og:image:type', 'image/png'),
    m('og:image:width', '1200'),
    m('og:image:height', '630'),
    m('og:image:alt', meta.imageAlt),
    n('twitter:card', 'summary_large_image'),
    n('twitter:title', meta.ogTitle),
    n('twitter:description', meta.description),
    n('twitter:image', meta.image),
  ].join('\n    ');
}

const TITLE_RE = /<title>[\s\S]*?<\/title>\s*/i;
const DESCRIPTION_RE = /<meta\s+name=["']description["'][^>]*>\s*/i;

/**
 * index.html with its <title> and description replaced by `tags` (headTags), or by nothing but a robots noindex
 * (`{ noindex: true }`, the 404). Null when the template has no </head> (the caller then serves it unchanged).
 */
export function injectHead(html, { tags = null, noindex = false } = {}) {
  if (typeof html !== 'string' || !/<\/head>/i.test(html)) return null;
  if (!tags && !noindex) return html;
  let out = html;
  if (tags) out = out.replace(TITLE_RE, '').replace(DESCRIPTION_RE, '');
  const add = [tags, noindex ? '<meta name="robots" content="noindex" />' : null].filter(Boolean).join('\n    ');
  // A replacement FUNCTION: a string replacement would read `$&`, `$'`, `` $` `` and `$$` in a coach's name as
  // patterns and copy parts of the template into the tags (review 2026-10-25).
  return out.replace(/<\/head>/i, () => `    ${add}\n  </head>`);
}
