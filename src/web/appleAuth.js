// The web pages' sign-in rules and every sign-in sentence they show, kept
// pure so `node --test src/web/appleAuth.test.js` pins them: no window, no
// React, no Supabase. The I/O around them is api.js.
//
// Copy rules: no gendered pronouns ("your", "they", "their" only); never ask
// for a "real" or "personal" email (an Apple user may have hidden theirs:
// point them to Apple instead); never show text taken from a URL.

/** Query and fragment keys Supabase Auth (implicit or PKCE) can put on a return URL. */
export const AUTH_URL_KEYS = Object.freeze(['code', 'error', 'error_code', 'error_description', 'sb',
  'access_token', 'refresh_token', 'expires_in', 'expires_at', 'token_type', 'provider_token', 'provider_refresh_token', 'type']);
const AUTH_KEYS = new Set(AUTH_URL_KEYS);
/** The role metadata values the apps write (iOS `enum UserRole: String { case trainer, client }`). */
const ROLES = new Set(['trainer', 'client']);

export const AUTH_RETURN_FAILED = 'That sign-in didn’t finish, so this page isn’t signed in. Try again.';
export const APPLE_CANCELLED = 'Sign in with Apple was cancelled. Nothing changed.';
export const APPLE_NOT_COACH = 'This Apple ID isn’t a FitLink coach account yet. Create your account in the FitLink app with Sign in with Apple, then sign in here again.';
export const NOT_COACH_TITLE = 'Not a coach account';
export const NOT_COACH = 'This account isn’t a coach account. The season editor is for coaches; open the FitLink app to train.';
export const ROLE_ERROR_TITLE = 'Couldn’t check your account';
export const CHECKING_ACCOUNT = 'Checking your account…';
export const TOO_MANY_CODES = 'Too many codes sent. Wait a minute and try again.';
export const UNFINISHED_DELETE_INTRO = 'This Apple ID never finished setting up a FitLink account. Deleting removes the empty account and signs this browser out.';
/** The iPhone path to the Sign in with Apple list (iPhone User Guide, iOS 26). */
export const APPLE_SETTINGS_PATH = 'Settings, then your name, then Sign in with Apple, then FitLink';
export const APPLE_STILL_LISTED = `FitLink may still be listed under Sign in with Apple on your iPhone. To remove it, open ${APPLE_SETTINGS_PATH}, then tap Delete, then Stop Using.`;

/**
 * A sign-up nobody finished: every identity is Apple's and the metadata holds
 * no role the apps know. OAuth cannot carry metadata, so such an account was
 * made by a first Apple sign-in (handle_new_user then gave it a trainers row by
 * default). A legacy email coach without a role has an email identity, so it
 * never counts. Identities missing → false (currentUser() fetches them).
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
