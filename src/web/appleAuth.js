// The web pages' sign-in rules and every sign-in sentence they show, kept
// pure so `node --test src/web/appleAuth.test.js` pins them: no window, no
// React, no Supabase. The I/O around them is api.js.
//
// Copy rules: no gendered pronouns ("your", "they", "their" only); never ask
// for a "real" or "personal" email (an Apple user may have hidden theirs:
// point them to Apple instead); never show text taken from a URL; the Apple
// button's title is always "Continue with Apple" (one of the three Apple allows).
import { normalizeCode } from './codes.js';

/** Where Sign in with Apple can come back to this browser: Supabase Auth allows these return URLs (a Vercel preview's falls back to production, where this browser's verifier is missing). */
export const APPLE_ORIGINS = Object.freeze(['https://fitlink.coach', 'http://localhost:5173', 'http://localhost:4173']);
/** The fixed return page per caller; never under /i/* or /live/* (the paths the installed app may claim), never from a query. */
export const APPLE_RETURN_PATHS = Object.freeze({ coach: '/coach', delete: '/delete-account', checkout: '/join' });
/** sessionStorage key of the checkout an Apple sign-in started from, and how long it is good for. */
export const CHECKOUT_RETURN_KEY = 'fitlink-web-checkout-return';
export const CHECKOUT_RETURN_TTL_MS = 30 * 60 * 1000;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Query and fragment keys Supabase Auth (implicit or PKCE) can put on a return URL. */
export const AUTH_URL_KEYS = Object.freeze(['code', 'error', 'error_code', 'error_description', 'sb',
  'access_token', 'refresh_token', 'expires_in', 'expires_at', 'token_type', 'provider_token', 'provider_refresh_token', 'type']);
const AUTH_KEYS = new Set(AUTH_URL_KEYS);
/** The role metadata values the apps write (iOS `enum UserRole: String { case trainer, client }`). */
const ROLES = new Set(['trainer', 'client']);

export const APPLE_TITLE = 'Continue with Apple';
export const APPLE_OPENING = 'Opening Apple…';
export const OR_EMAIL = 'or get a six-digit code by email';
export const APPLE_START_FAILED = 'Sign in with Apple isn’t available right now. Get a code by email instead.';
export const APPLE_PARK_FAILED = 'This browser wouldn’t let the page remember your pass while you sign in with Apple. Get a code by email instead.';
export const AUTH_RETURN_FAILED = 'That sign-in didn’t finish, so this page isn’t signed in. Try again.';
export const APPLE_CANCELLED = 'Sign in with Apple was cancelled. Nothing changed.';
export const APPLE_NOT_COACH = 'This Apple ID isn’t a FitLink coach account yet. Create your account in the FitLink app with Sign in with Apple, then sign in here again.';
export const NOT_COACH_TITLE = 'Not a coach account';
export const NOT_COACH = 'This account isn’t a coach account. The season editor is for coaches; open the FitLink app to train.';
export const ROLE_ERROR_TITLE = 'Couldn’t check your account';
export const CHECKING_ACCOUNT = 'Checking your account…';
export const TOO_MANY_CODES = 'Too many codes sent. Wait a minute and try again.';
export const DELETE_CODE_HINT = 'We’ll email a code to confirm it’s you.';
export const UNFINISHED_DELETE_INTRO = 'This Apple ID never finished setting up a FitLink account. Deleting removes the empty account and signs this browser out.';
/** The iPhone path to the Sign in with Apple list (iPhone User Guide, iOS 26). */
export const APPLE_SETTINGS_PATH = 'Settings, then your name, then Sign in with Apple, then FitLink';
export const APPLE_STILL_LISTED = `FitLink may still be listed under Sign in with Apple on your iPhone. To remove it, open ${APPLE_SETTINGS_PATH}, then tap Delete, then Stop Using.`;
export const SETTING_UP = 'Setting up your account…';
export const SIGN_UP_FAILED = 'We couldn’t finish setting up your account. You haven’t been charged. Try again in a moment.';
export const TRAINER_IN_USE = 'This Apple ID already has a coach account on FitLink. To train with this coach, open the link in the FitLink app.';
export const RESUME_PASS_GONE = 'The pass you chose isn’t for sale any more. Pick another pass below.';
export const JOIN_NOTHING_TITLE = 'Nothing to finish here';
export const JOIN_NOTHING_BODY = 'This page finishes a sign-in that started on a coach’s page. Open your coach’s link again to choose a pass.';
/** /join with nothing to finish, after an unfinished Apple sign-up was left (or the person signed out). */
export const JOIN_SIGNED_OUT = 'This browser is signed out, and nothing was bought.';
/** Back from Apple to a pass that is gone, for a sign-up nobody finished: under RESUME_PASS_GONE. */
export const RESUME_SIGNED_OUT = 'This browser is signed out, and nothing was bought. Sign in again when you pick a pass.';

/** The checkout's optional name step, when Apple sent no name for a new account. */
export const nameStepTitle = (first) => `What should ${first} call you?`;
export const nameStepHint = (first) => `Optional. ${first} sees it on their roster.`;
/** The checkout's first step when the browser was already signed in (a session this sheet did not make): under "Signed in as … · Not you? Sign out". */
export const whoStepBody = (planName) => `This browser is already signed in. ${planName} goes on this account, and nothing changes until you continue.`;

/**
 * How the who-line names an account: its email, else its phone (GoTrue stores
 * E.164 without the "+"), else '' (the line then reads "Signed in" alone).
 */
export function accountLabel(user) {
  const email = String(user?.email ?? '').trim();
  if (email) return email;
  const phone = String(user?.phone ?? '').trim();
  if (!phone) return '';
  return /^\d{4,15}$/.test(phone) ? `+${phone}` : phone;
}

/** Offered here at all: the build's flag, a return origin Supabase allows, and not a Home Screen web app (it may finish an off-origin flow outside its own storage; device check A-L8). */
export function appleAvailable({ enabled, origin, standalone }) {
  return enabled === true && APPLE_ORIGINS.includes(origin) && standalone !== true;
}

/**
 * A sign-up nobody finished: every identity is Apple's and the metadata holds
 * no role the apps know. OAuth cannot carry metadata, so such an account was
 * made by a first Apple sign-in (handle_new_user then gave it a trainers row by
 * default). A legacy email coach without a role has an email identity, so it
 * never counts. Identities missing → false. Decide a write on it only with the
 * server's copy of the user (api.js freshUser()): the browser's stored copy can be
 * an hour old, from before the person picked a role in the app.
 */
export function appleSignUpUnfinished(user) {
  const ids = user?.identities;
  if (!Array.isArray(ids) || ids.length === 0) return false;
  if (!ids.every((i) => i?.provider === 'apple')) return false;
  return !ROLES.has(user?.user_metadata?.role);
}

/** The account has signed in with Apple at some point (iOS AppleAccount.usedApple). */
export function usedApple(user) {
  if (!user) return false;
  if (Array.isArray(user.identities) && user.identities.some((i) => i?.provider === 'apple')) return true;
  const meta = user.app_metadata ?? {};
  return (Array.isArray(meta.providers) && meta.providers.includes('apple')) || meta.provider === 'apple';
}

/** A person's name as the roster stores it: no control characters, single spaces, at most 120 code points (clients.name). */
export function cleanName(value) {
  // eslint-disable-next-line no-control-regex -- removing C0/C1 control characters is the point
  const s = String(value ?? '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '').replace(/\s+/g, ' ').trim();
  return Array.from(s).slice(0, 120).join('');
}

/** The name Apple (or the app) put in the account's metadata, cleaned; '' when none. */
export function metadataName(user) {
  return cleanName(user?.user_metadata?.name) || cleanName(user?.user_metadata?.full_name);
}

/** Removes the auth keys from one raw `a=1&b=2` string; null when nothing was removed. */
function withoutAuthKeys(raw) {
  const parts = raw.split('&');
  const kept = parts.filter((part) => {
    const rawKey = part.split('=')[0].replace(/\+/g, ' ');
    let key = rawKey;
    try { key = decodeURIComponent(rawKey); } catch { /* keep the raw key */ }
    return !AUTH_KEYS.has(key);
  });
  return kept.length === parts.length ? null : kept.join('&');
}

/**
 * What a return URL says, and the same URL without any auth parameter.
 * `search` is `location.search` ('' or '?…'), `hash` is `location.hash`
 * ('' or '#…'). `note` is one fixed sentence or null, never derived from a
 * parameter's text: Apple's cancel → APPLE_CANCELLED; any error key, or a
 * `code` still in the query (no exchange, or a failed one) →
 * AUTH_RETURN_FAILED; a token-only URL (an old implicit link, or someone
 * else's tokens) is cleaned silently, since nobody here tried to sign in.
 * Other keys keep their order and spelling; a fragment that is not key=value
 * (`#passes`) is left alone.
 */
export function parseAuthReturn(search, hash) {
  const s = String(search ?? '');
  const h = String(hash ?? '');
  const queryRaw = s.startsWith('?') ? s.slice(1) : s;
  const fragRaw = h.startsWith('#') ? h.slice(1) : h;
  const fragIsParams = fragRaw.includes('=');
  const q = new URLSearchParams(queryRaw);
  const f = new URLSearchParams(fragIsParams ? fragRaw : '');
  const has = (k) => q.has(k) || f.has(k);

  let note = null;
  if (q.get('error') === 'user_cancelled_authorize' || f.get('error') === 'user_cancelled_authorize') note = APPLE_CANCELLED;
  else if (has('error') || has('error_code') || has('error_description') || q.has('code')) note = AUTH_RETURN_FAILED;

  const keptQuery = queryRaw ? withoutAuthKeys(queryRaw) : null;
  const keptFrag = fragIsParams ? withoutAuthKeys(fragRaw) : null;
  const outSearch = keptQuery === null ? s : (keptQuery ? `?${keptQuery}` : '');
  const outHash = keptFrag === null ? h : (keptFrag ? `#${keptFrag}` : '');
  return { note, search: outSearch, hash: outHash, changed: outSearch !== s || outHash !== h };
}

/** "No account with that email", for a page that offers Apple (`available`) or not. */
export function noAccountMessage(page, available) {
  if (available) return 'No FitLink account uses that email. If you signed up with Apple, use Continue with Apple.';
  return page === 'coach'
    ? 'No FitLink account uses that email. Check the address, or sign up in the FitLink app first.'
    : 'No FitLink account uses that email. Check the address, or the one you used in the app.';
}

/** The line under the email field for someone who signed up with Apple: use the button, open Safari, or use the app. */
export const HINTS = Object.freeze({
  coach: Object.freeze({
    apple: 'Signed up with Sign in with Apple and hid your email? Use Continue with Apple.',
    safari: 'Signed up with Sign in with Apple? Open fitlink.coach/coach in Safari to continue with Apple.',
    off: 'Signed up with Sign in with Apple and hid your email? Sign in in the FitLink app instead.',
  }),
  delete: Object.freeze({
    apple: 'Signed up with Sign in with Apple and hid your email? Use Continue with Apple.',
    safari: 'Signed up with Sign in with Apple? Open fitlink.coach/delete-account in Safari to continue with Apple.',
    off: 'Signed up with Sign in with Apple and hid your email? Delete from the FitLink app instead: Profile, then Delete account.',
  }),
  checkout: Object.freeze({
    apple: 'Signed up in the app with Sign in with Apple? Use Continue with Apple, so the pass lands on that account.',
    safari: 'Signed up in the app with Sign in with Apple? Open this page in Safari to continue with Apple, so the pass lands on that account.',
    off: 'Signed up in the app with Sign in with Apple? Open this link in the FitLink app instead, so the pass lands on that account.',
  }),
});

/** page: 'coach' | 'delete' | 'checkout'. The button is drawn → use it; the build offers Apple but this is a Home Screen web app → Safari; else the app. */
export function signInHint(page, { available, enabled, standalone }) {
  const h = HINTS[page];
  if (available) return h.apple;
  if (enabled && standalone) return h.safari;
  return h.off;
}

const SITE_COPY = Object.freeze({
  on: Object.freeze({
    coachSignInSub: 'The same account as the app. No password.',
    checkoutIntro: 'One account for the pass and the app; no password.',
    supportSignInA: 'With Sign in with Apple or a six-digit code sent to your email. There are no passwords. The season editor on the web signs in the same two ways.',
    supportHidEmailA: `Use Continue with Apple on the website too. It opens the same account, so you never need the hidden address. To see the address FitLink has for you, on your iPhone open ${APPLE_SETTINGS_PATH}.`,
    supportBuyA: 'Open your coach’s link and pick a pass. Continue with Apple, or enter your email and the six-digit code we send, then pay by card. Stripe handles the card; FitLink never sees the number. Sign in to the app the same way. If you signed up in the app with Sign in with Apple, choose Continue with Apple, so the pass lands on that account.',
    supportPaidNoPlanLead: 'Sign in to the app the same way you paid: with Apple, or with the same email.',
    athletesStep2: 'Card checkout, handled by Stripe. Continue with Apple or get a six-digit code by email; no password.',
    athletesStep3: 'Sign in the same way you paid. Your plan is already there.',
    athletesPaidNoPlanLead: 'Sign in to the app the same way you paid: with Apple, or with the same email.',
    homeNeedAppA: 'No. They pay on your page in any browser, then get the app to train. Their plan is waiting when they sign in the same way they paid.',
  }),
  off: Object.freeze({
    coachSignInSub: 'The same account as the app. We email you a six-digit code; no password.',
    checkoutIntro: 'One account for the pass and the app. We email you a six-digit code; no password.',
    supportSignInA: 'With Sign in with Apple or a six-digit code sent to your email. There are no passwords. The season editor on the web signs in with the same email code.',
    supportHidEmailA: `Sign in in the FitLink app with Sign in with Apple; it opens the same account. To see the address FitLink has for you, on your iPhone open ${APPLE_SETTINGS_PATH}.`,
    supportBuyA: 'Open your coach’s link, pick a pass, enter your email and the six-digit code we send, then pay by card. Stripe handles the card; FitLink never sees the number. The same email signs you in to the app.',
    supportPaidNoPlanLead: 'Sign in to the app with the same email you paid with.',
    athletesStep2: 'Card checkout, handled by Stripe. We email you a six-digit code; no password.',
    athletesStep3: 'Sign in with the email you paid with. Your plan is already there.',
    athletesPaidNoPlanLead: 'Sign in to the app with the same email you paid with.',
    homeNeedAppA: 'No. They pay on your page in any browser, then get the app to train. Their plan is waiting when they sign in with the same email.',
  }),
});

/** The site's sign-in words for a build that offers Apple (`enabled`) or not. The off values are the pages' words before Apple came to the web. */
export function siteCopy(enabled) {
  return enabled ? SITE_COPY.on : SITE_COPY.off;
}

/** What /join may read back: the code, the plan and a typed name, stamped now. null when the code or plan id is not one. */
export function parkedCheckoutValue({ code, planId, name }, now = Date.now()) {
  const c = normalizeCode(code);
  if (!c || typeof planId !== 'string' || !UUID_RE.test(planId)) return null;
  return JSON.stringify({ v: 1, code: c, planId, name: cleanName(name), at: now });
}

/** The parked checkout, checked again on the way back: { code, planId, name } or null (wrong shape, or older than 30 minutes, or from the future). */
export function readParkedCheckout(raw, now = Date.now()) {
  if (typeof raw !== 'string') return null;
  let o;
  try { o = JSON.parse(raw); } catch { return null; }
  if (!o || typeof o !== 'object' || o.v !== 1) return null;
  if (typeof o.code !== 'string' || normalizeCode(o.code) !== o.code) return null;
  if (typeof o.planId !== 'string' || !UUID_RE.test(o.planId)) return null;
  if (typeof o.at !== 'number' || !Number.isFinite(o.at)) return null;
  if (o.at > now + 60_000 || now - o.at > CHECKOUT_RETURN_TTL_MS) return null;
  return { code: o.code, planId: o.planId, name: cleanName(o.name) };
}
