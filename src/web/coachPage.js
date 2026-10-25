// The coach page at /c/<handle> (launch plan Sprint 1 PR 3, 2026-10-25; fitlink-app migration 20261025130000,
// rollout `supabase/manual/ROLLOUT_20261025_coach_page.md`, threat model B40, A62–A65). Pure rules, no I/O:
// `node --test src/web/coachPage.test.js`.
//
//   coach_page(p_handle)   (anon) {found:false} | {found:false, redirect} | {found:true, handle, coach, model_b,
//                          minimum_charge_cents, next_block_starts_on, passes[]}. Every pass carries the server's
//                          price_cents, booking_fee_cents (Model B only) and total_cents = what create-subscription
//                          charges per payment, plus on_sale / not_on_sale / buyable. The page shows THOSE totals
//                          before checkout (the New York total rule): never a total made from plans.price.
//   log_page_event(...)    (anon) the funnel: page_view, pass_tap, checkout_start (paid is the server's). Fire and
//                          forget; a malformed event is refused (22023), so this file builds only well-formed ones.
//   my_page_stats(p_days)  the coach's own counts (distinct browser sessions per stage; paid = subscriptions).
//   set_handle(p_handle)   {ok:true, handle, previous, changed, path} | {ok:false, code, error}: show `error` as sent.
//
// Every value a page draws from an answer is checked here (type, range, shape); anything else is left out.
import { pageHandle } from './handles.js';
import {
  buyLabel, dayWords, passKind, paymentsFor, priceLine, saleLine, saleOpensDay, scheduleLine,
} from './blocks.js';
import { billingPeriod, usdFromCents } from './season.js';
import { SITE_ORIGIN } from './site/brand.js';
import { DEFAULT_SUPABASE_URL } from './supabaseDefaults.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PASSES = 50;

const str = (v, max = 2000) => (typeof v === 'string' && v.trim() ? Array.from(v.trim()).slice(0, max).join('') : null);
const intOrNull = (v, min = 0, max = Number.MAX_SAFE_INTEGER) => (Number.isInteger(v) && v >= min && v <= max ? v : null);

/** The first word of a name, or "your coach". */
export function firstWord(name) {
  return String(name ?? '').trim().split(/\s+/)[0] || 'your coach';
}

/** Where a coach photo may come from: this project's public Storage, and the site itself. */
const STORAGE_PUBLIC_PATH = '/storage/v1/object/public/';

/**
 * A photo URL the page may load: https, no credentials, at most 2048 characters, AND on one of our own origins: this
 * project's public Storage (`<supabaseUrl>/storage/v1/object/public/…`, where the apps upload `avatars`; read on live
 * 2026-10-25: every `trainers.avatar_url` is there) or the site's own origin. Anything else is null: no photo is
 * drawn (initials instead), so a coach cannot point the page at a host that logs every visitor's address and browser
 * (review 2026-10-25 m5). The URL is the coach's own write, so it is never put anywhere but an <img src>.
 */
export function safeImageUrl(raw, { supabaseUrl = DEFAULT_SUPABASE_URL, siteOrigin = SITE_ORIGIN } = {}) {
  if (typeof raw !== 'string' || raw.length > 2048) return null;
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'https:' || !u.hostname || u.username || u.password) return null;
  const originOf = (v) => { try { return new URL(v).origin; } catch { return null; } };
  const storage = originOf(supabaseUrl);
  // The parsed pathname: `..` and `%2e%2e` segments are already resolved, so the prefix test cannot be walked out of.
  if (storage && u.origin === storage && u.pathname.startsWith(STORAGE_PUBLIC_PATH) && u.pathname.length > STORAGE_PUBLIC_PATH.length) return u.href;
  if (u.origin === originOf(siteOrigin)) return u.href;
  return null;
}

/**
 * Under the name field on /coach (review 2026-10-25 m7; fitlink-app threat model A64): a purchase from the page joins
 * through the coach's standing invite link, and `page_invite` makes a new one when the coach had revoked theirs.
 */
export const PAGE_INVITE_NOTE = 'Your page uses your standing invite link: athletes who join from it join through that link. If you revoked that link, your page makes a new one the first time an athlete starts to join from it.';

/** The coach's sport: `specialization`, else up to three `specializations` (the share image's rule). */
export function sportLine(coach) {
  const main = str(coach?.specialization, 80);
  if (main) return main;
  const list = Array.isArray(coach?.specializations) ? coach.specializations.map((s) => str(s, 40)).filter(Boolean) : [];
  return list.length ? [...new Set(list)].slice(0, 3).join(' · ') : null;
}

/** A pass of the page: the server's numbers, the plan row Checkout and blocks.js read, and what the page may sell. */
function pagePass(p, coachId) {
  if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !UUID_RE.test(p.id)) return null;
  const name = str(p.name, 120);
  const priceCents = intOrNull(p.price_cents, 1);
  if (!name || priceCents === null) return null;
  const booking = intOrNull(p.booking_fee_cents, 0) ?? 0;
  const totalCents = intOrNull(p.total_cents, 1);
  // The total is what create-subscription charges: price + booking fee. Anything else is not a total to show.
  const total = totalCents !== null && totalCents === priceCents + booking ? { cents: totalCents, bookingCents: booking } : null;
  const kind = p.kind === 'session' ? 'session' : 'block';
  const plan = {
    id: p.id,
    name,
    description: str(p.description, 600),
    kind,
    price: priceCents / 100,
    period: billingPeriod(p.period),
    duration_weeks: intOrNull(p.duration_weeks, 1, 520),
    starts_on: typeof p.starts_on === 'string' && DAY_RE.test(p.starts_on) ? p.starts_on : null,
    enrollment_closes: typeof p.enrollment_closes === 'string' && DAY_RE.test(p.enrollment_closes) ? p.enrollment_closes : null,
    session_at: kind === 'session' && typeof p.session_at === 'string' && Number.isFinite(Date.parse(p.session_at)) ? p.session_at : null,
    session_minutes: kind === 'session' ? intOrNull(p.session_minutes, 5, 720) : null,
    trainer_id: coachId,
    archived_at: null,
    features: [],
  };
  const onSale = p.on_sale === true;
  return {
    id: p.id,
    plan,
    total,
    onSale,
    notOnSale: onSale ? null : (typeof p.not_on_sale === 'string' ? p.not_on_sale : 'not_on_sale'),
    buyable: p.buyable === true && onSale && total !== null,
  };
}

/**
 * coach_page's answer → what the page draws: `{ kind: 'found', handle, coach, modelB, nextBlock, passes }`,
 * `{ kind: 'redirect', handle }` (a retired handle of a coach who has a new one), `{ kind: 'not_found' }`, or
 * `{ kind: 'error' }` (an answer that is not one of those).
 */
export function pageModel(answer, { supabaseUrl = DEFAULT_SUPABASE_URL } = {}) {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return { kind: 'error' };
  if (answer.found === false) {
    const to = pageHandle(answer.redirect);
    return to ? { kind: 'redirect', handle: to } : { kind: 'not_found' };
  }
  if (answer.found !== true) return { kind: 'error' };
  const c = answer.coach;
  if (!c || typeof c !== 'object' || typeof c.id !== 'string' || !UUID_RE.test(c.id)) return { kind: 'error' };
  const name = str(c.name, 120);
  const coach = {
    id: c.id,
    name: name ?? 'Your coach',
    first: name ? firstWord(name) : 'your coach',
    photo: safeImageUrl(c.avatar_url, { supabaseUrl }),
    sport: sportLine(c),
    founding: c.founding_member === true,
    takesCards: c.takes_cards === true,
    policy: str(c.cancellation_policy, 600),
  };
  const passes = (Array.isArray(answer.passes) ? answer.passes : []).slice(0, MAX_PASSES).map((p) => pagePass(p, c.id)).filter(Boolean);
  const next = typeof answer.next_block_starts_on === 'string' && DAY_RE.test(answer.next_block_starts_on) ? answer.next_block_starts_on : null;
  return { kind: 'found', handle: pageHandle(answer.handle), coach, modelB: answer.model_b === true, nextBlock: next, passes };
}

/** The hero's date line: "Next block starts Dec 1" (with the year when ~6 months away), or null. */
export function nextBlockLine(day, nowMs, locale = undefined) {
  return day ? `Next block starts ${dayWords(day, nowMs, locale)}` : null;
}

/**
 * One card of the page, in words, from the server's numbers: `{ amount, unit, lines, button, reason }`. The big
 * amount is the server's `total_cents` per payment (the booking fee inside it, named on its own line); the price line
 * says the payments and "($X in all)" from that total (coach_page is the server's answer, so the total is shown before
 * checkout). `button` is the Buy label when the pass can be bought here, else null with `reason` in words.
 */
export function passCard(pass, nowMs, { first = 'your coach', takesCards = true, locale, timeZone } = {}) {
  const { plan, total } = pass;
  const isSession = passKind(plan) === 'session';
  const payments = paymentsFor(plan, nowMs);
  const cents = total?.cents ?? Math.round(plan.price * 100);
  const amount = usdFromCents(cents);
  const unit = isSession || payments === 1 ? 'one payment' : `/ ${billingPeriod(plan.period)}`;
  const lines = [];
  const what = scheduleLine(plan, nowMs, { first, locale, timeZone });
  if (isSession) {
    lines.push([what, amount].filter(Boolean).join(' · '));
  } else {
    if (what) lines.push(what);
    if (total) lines.push(priceLine(plan, { payments, total, serverTotal: true }));
    if (pass.onSale) {
      const sale = saleLine(plan, nowMs, locale);
      if (sale) lines.push(sale);
    } else if (pass.notOnSale === 'block_not_open' && saleOpensDay(plan)) {
      lines.push(`On sale from ${dayWords(saleOpensDay(plan), nowMs, locale)}`);
    }
  }
  if (total?.bookingCents > 0) {
    lines.push(isSession
      ? `Includes a ${usdFromCents(total.bookingCents)} booking fee.`
      : `Includes a ${usdFromCents(total.bookingCents)} booking fee on each payment.`);
  }
  if (plan.description) lines.push(plan.description);
  let reason = null;
  if (!pass.onSale) reason = `Not on sale yet. Come back then, or ask ${first} about it.`;
  else if (!takesCards) reason = `${first} isn’t taking card payments yet. Ask them about it.`;
  else if (!pass.buyable) reason = `This pass can’t be bought here right now. Ask ${first} about it.`;
  return { amount, unit, lines: lines.filter(Boolean), button: reason ? null : buyLabel(plan), reason };
}

// ── The funnel (log_page_event) ──────────────────────────────────────────────

export const EVENT_KINDS = Object.freeze(['page_view', 'pass_tap', 'checkout_start']);
/** sessionStorage key of this tab's page session (the funnel's browser-session key). */
export const PAGE_SESSION_KEY = 'fitlink-web-page-session';
const SESSION_RE = /^[A-Za-z0-9_-]{16,64}$/;

/** log_page_event's rule for a session key: 16–64 of A-Z a-z 0-9 _ -. */
export function isSessionKey(v) {
  return typeof v === 'string' && SESSION_RE.test(v);
}

/** 24 random bytes → 32 base64url characters (the caller passes crypto.getRandomValues' bytes). */
export function sessionKeyFrom(bytes) {
  if (!bytes || bytes.length !== 24) return null;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let out = '';
  for (let i = 0; i < 24; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63] + alphabet[(n >> 6) & 63] + alphabet[n & 63];
  }
  return out;
}

/** The referrer's host alone (lower case), never its path or query; null for anything that is not http(s). */
export function referrerHost(referrer) {
  if (typeof referrer !== 'string' || !referrer) return null;
  let u;
  try { u = new URL(referrer); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  return u.hostname ? u.hostname.toLowerCase() : null;
}

/** One UTM value: printable characters, trimmed, at most 100; null when empty. */
function utmValue(v) {
  if (typeof v !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const clean = Array.from(v.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim()).slice(0, 100).join('').trim();
  return clean || null;
}

/** utm_source / utm_medium / utm_campaign from a location.search string. */
export function utmFrom(search) {
  let q;
  try { q = new URLSearchParams(typeof search === 'string' ? search : ''); } catch { q = new URLSearchParams(); }
  return { source: utmValue(q.get('utm_source')), medium: utmValue(q.get('utm_medium')), campaign: utmValue(q.get('utm_campaign')) };
}

/**
 * log_page_event's parameters for one event, or null when the event is not well formed (the server would refuse it:
 * an unknown kind, a bad session key, a pass event without a pass id, a handle that cannot be a page).
 */
export function eventParams({ handle, kind, planId = null, sessionKey, referrer = '', search = '' }) {
  const h = pageHandle(handle);
  if (!h || !EVENT_KINDS.includes(kind) || !isSessionKey(sessionKey)) return null;
  const plan = kind === 'page_view' ? null : planId;
  if (kind !== 'page_view' && (typeof plan !== 'string' || !UUID_RE.test(plan))) return null;
  const utm = utmFrom(search);
  return {
    p_handle: h,
    p_kind: kind,
    p_plan_id: plan,
    p_session_key: sessionKey,
    p_referrer_host: referrerHost(referrer),
    p_utm_source: utm.source,
    p_utm_medium: utm.medium,
    p_utm_campaign: utm.campaign,
  };
}

// ── The coach's dashboard ────────────────────────────────────────────────────

/** The page's address without the scheme, for the preview line: "fitlink.coach/c/dana-ruiz". */
export function pageAddress(host, handle) {
  return `${host}/c/${handle}`;
}

/**
 * set_handle's answer → `{ ok, handle, message, previous }`. A refusal is `{ ok: false, message: <error as sent> }`;
 * an answer that is neither shape is `{ ok: null }` (nobody can tell whether the name changed).
 */
export function setHandleOutcome(answer, host) {
  if (answer && answer.ok === false) {
    const message = str(answer.error, 300) ?? 'That name couldn’t be saved.';
    return { ok: false, code: typeof answer.code === 'string' ? answer.code : null, message };
  }
  if (!answer || answer.ok !== true) return { ok: null };
  const handle = answer.handle === null ? null : pageHandle(answer.handle);
  const previous = answer.previous ? pageHandle(answer.previous) : null;
  if (answer.handle !== null && !handle) return { ok: null };
  if (handle === null) {
    return {
      ok: true, handle: null, previous,
      message: previous ? `Your page is down. ${pageAddress(host, previous)} no longer opens it, and the name stays yours to take back for a year.` : 'Your page is down.',
    };
  }
  if (answer.changed === false) return { ok: true, handle, previous: null, message: 'That’s already your page’s name.' };
  return {
    ok: true, handle, previous,
    message: previous
      ? `Saved. Your page is ${pageAddress(host, handle)}. ${pageAddress(host, previous)} sends people there for a year.`
      : `Saved. Your page is ${pageAddress(host, handle)}.`,
  };
}

/** The funnel's stages, in order, with what each counts. */
export const FUNNEL_STAGES = Object.freeze([
  { key: 'page_view', label: 'Opened your page' },
  { key: 'pass_tap', label: 'Tapped a pass' },
  { key: 'checkout_start', label: 'Reached the card form' },
  { key: 'paid', label: 'Paid' },
]);

/** The note under the funnel: which stages the server counts and which the browser reports. */
export const FUNNEL_NOTE = 'The first three are reported by visitors’ browsers (counted once per browser session, '
  + 'and a blocker can hide them); Paid is counted by the server from Stripe. Your own visits while signed in aren’t counted.';

/** my_page_stats' answer → `{ days, rows: [{ key, label, count }] }`, or null when it is not that shape. */
export function statsView(answer) {
  if (!answer || typeof answer !== 'object') return null;
  const days = intOrNull(answer.days, 1, 400);
  const rows = FUNNEL_STAGES.map((s) => ({ ...s, count: intOrNull(Number(answer[s.key]), 0) }));
  if (days === null || rows.some((r) => r.count === null)) return null;
  return { days, rows };
}
