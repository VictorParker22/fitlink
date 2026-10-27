// The /founding page's rules and sentences, kept pure so `node --test
// src/web/founding.test.js` pins them: no window, no React, no Supabase (the
// I/O is api.js; the numbers are pricing.js, passed in where a sentence needs
// one). The server is fitlink-app migration 20261025110000: founding_slots()
// answers {taken, total, closes_on, open}; apply_founding(...) writes the
// caller's own application and refuses with a stable key (P0001, the field or
// a sentence in HINT); an application is a REQUEST and takes no slot: the
// operator's grant does, after the setup call.
//
// Copy rules: sentence case, no emoji, no gendered pronouns ("you", "they"),
// never a number the server did not say for the counter.
import { appleSignUpUnfinished } from './appleAuth.js';

/**
 * The metadata the page's email-code sign-up sends (review 2026-10-25). NO role:
 * signInWithOtp makes the auth user when the code is SENT, and fitlink-app
 * migration 20261025110000's handle_new_user makes no trainers row (so nothing
 * in the public trainers_public) for this marker. The coach row is made by the
 * page after the code is verified (finishCoachSignUp). A role-less account
 * opened in the iOS app goes to its role screen, which handles a missing row.
 */
export const FOUNDING_SIGN_UP_DATA = Object.freeze({ signup: 'founding_web' });

/** sessionStorage key of a Sign in with Apple this tab started on /founding, and how long it is good for. */
export const FOUNDING_RETURN_KEY = 'fitlink-web-founding-return';
export const FOUNDING_RETURN_TTL_MS = 30 * 60 * 1000;
/** How far the browser's clock may sit from the server's when the return is matched to the sign-in. */
const CLOCK_SKEW_MS = 10 * 60 * 1000;

/** The value parked before the browser leaves for Apple. */
export function foundingReturnValue(now = Date.now()) {
  return JSON.stringify({ v: 1, at: now });
}

/** When this tab started Sign in with Apple on /founding (ms), or null (wrong shape, older than 30 minutes, from the future). */
export function readFoundingReturn(raw, now = Date.now()) {
  if (typeof raw !== 'string') return null;
  let o;
  try { o = JSON.parse(raw); } catch { return null; }
  if (!o || typeof o !== 'object' || o.v !== 1 || typeof o.at !== 'number' || !Number.isFinite(o.at)) return null;
  if (o.at > now + 60_000 || now - o.at > FOUNDING_RETURN_TTL_MS) return null;
  return o.at;
}

/**
 * Whether the signed-in session is THIS tab's own, so the page may finish the
 * account as a coach without asking (finding 1, review 2026-10-25). Own means
 * one of: the code was typed in this tab for this account's email
 * (`typedEmail`), or this tab started Sign in with Apple on /founding
 * (`appleStartedAt`, read once from sessionStorage), the return carried no
 * failure note, and the server says the account signed in after that start.
 * Anything else (a session someone left in the browser) is named first and
 * waits for a tap.
 */
export function isOwnSession(user, { typedEmail = null, appleStartedAt = null, note = null } = {}) {
  if (!user) return false;
  const email = String(user.email ?? '').trim().toLowerCase();
  if (typedEmail && email && email === String(typedEmail).trim().toLowerCase()) return true;
  if (appleStartedAt === null || appleStartedAt === undefined || note) return false;
  const signedIn = Date.parse(user.last_sign_in_at ?? '');
  return Number.isFinite(signedIn) && signedIn >= appleStartedAt - CLOCK_SKEW_MS;
}

/**
 * What the page does with a signed-in account. `role` is myRole()'s answer
 * (coach | athlete | none), `user` freshUser()'s.
 *   'notCoach' — an athlete account (a clients row, or made as one: metadata
 *                role 'client'); never converted here.
 *   'finish'   — not a coach account yet but may become one: no rows and no
 *                role (a /founding email sign-up), a coach role with its row
 *                missing, or an Apple sign-up nobody finished. The coach row and
 *                role 'trainer' are written by finishCoachSignUp, only for this
 *                tab's own session or after the Continue tap.
 *   'coach'    — a coach account: the application.
 */
export function accountStep(user, role) {
  if (role === 'athlete') return 'notCoach';
  if (appleSignUpUnfinished(user)) return 'finish';
  if (role === 'coach') return 'coach';
  if (user?.user_metadata?.role === 'client') return 'notCoach';
  return 'finish';
}

/** A pending or booked application while the house is full or closed: only instagram and phone may change (the server keeps the rest). */
export function contactOnly(phase, row) {
  return (phase === 'full' || phase === 'closed') && (row?.status === 'pending' || row?.status === 'booked');
}

/** No application that counts yet: no row, or a withdrawn one (applying again is a new application). */
export function isNewApplication(row) {
  return !row || row.status === 'withdrawn';
}

/** The athlete-count bands apply_founding accepts, with their words. */
export const ATHLETE_BANDS = Object.freeze([
  Object.freeze({ value: '0', label: 'None yet' }),
  Object.freeze({ value: '1-4', label: '1–4' }),
  Object.freeze({ value: '5-9', label: '5–9' }),
  Object.freeze({ value: '10-24', label: '10–24' }),
  Object.freeze({ value: '25+', label: '25 or more' }),
]);

/** How athletes pay the coach today: the values apply_founding accepts. */
export const PAY_METHODS = Object.freeze([
  Object.freeze({ value: 'venmo', label: 'Venmo' }),
  Object.freeze({ value: 'zelle', label: 'Zelle' }),
  Object.freeze({ value: 'cash', label: 'Cash' }),
  Object.freeze({ value: 'card', label: 'Card' }),
  Object.freeze({ value: 'other', label: 'Something else' }),
]);

/** The column lengths (founding_applications CHECKs). */
export const NAME_MAX = 80;
export const SPORT_MAX = 60;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-12-31" → "Dec 31" (no year: the page names it once); '' for anything else. */
export function closesLabel(isoDay) {
  if (typeof isoDay !== 'string' || !ISO_DAY.test(isoDay)) return '';
  const [, m, d] = isoDay.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return '';
  return `${MONTHS[m - 1]} ${d}`;
}

/** "2026-12-31" → "Dec 31, 2026"; '' for anything else. */
export function closesLabelLong(isoDay) {
  const short = closesLabel(isoDay);
  return short ? `${short}, ${isoDay.slice(0, 4)}` : '';
}

/**
 * founding_slots()'s answer checked: `{ taken, total, closesOn, open }` or null
 * when it is not the shape the server sends (then the page shows no number).
 */
export function parseSlots(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const { taken, total, open } = raw;
  const closesOn = raw.closes_on;
  if (!Number.isInteger(taken) || !Number.isInteger(total) || taken < 0 || total < 1 || taken > 10_000 || total > 10_000) return null;
  if (typeof open !== 'boolean') return null;
  if (typeof closesOn !== 'string' || !ISO_DAY.test(closesOn)) return null;
  return { taken, total, closesOn, open };
}

/**
 * What the top of the page says: 'loading' (nothing numeric), 'unknown' (the
 * read failed: no number, never a guessed one), 'open', 'full', 'closed'.
 * `slots` is parseSlots()'s answer, `undefined` while loading, null on a
 * failure. Closed wins over full: the server says open = false for both, and
 * a past close date is the reason that never changes.
 */
export function foundingPhase(slots, todayIso) {
  if (slots === undefined) return 'loading';
  if (slots === null) return 'unknown';
  if (slots.open) return 'open';
  if (slots.taken >= slots.total) {
    return typeof todayIso === 'string' && todayIso > slots.closesOn ? 'closed' : 'full';
  }
  return 'closed';
}

/** "9 of 15 taken" from the server's numbers only. */
export function slotsLine({ taken, total }) {
  return `${taken} of ${total} taken`;
}

/** The full-house sentence, with the server's total. */
export function fullLine(total) {
  return `All ${total} spots are taken.`;
}

/**
 * The booking link from the build's VITE_FOUNDING_CALENDAR_URL: an https URL
 * with a host and no credentials, or null (then the page shows no button and
 * says the operator will email). Never taken from the page's own URL.
 */
export function bookingUrl(raw) {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s || s.length > 2000) return null;
  let u;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol !== 'https:' || !u.hostname || u.username || u.password) return null;
  return u.href;
}

/** Instagram as the server stores it (the bare lower-case handle), '' for blank, null when it can't be one. */
export function cleanInstagram(value) {
  let s = String(value ?? '').trim().toLowerCase();
  s = s.replace(/^(https?:\/\/)?(www\.)?instagram\.com\//, '').replace(/^@/, '').replace(/\/+$/, '');
  if (!s) return '';
  return /^[a-z0-9._]{1,30}$/.test(s) ? s : null;
}

/** A phone as the server stores it (digits with an optional +), '' for blank, null when it can't be one. */
export function cleanPhone(value) {
  const s = String(value ?? '').trim().replace(/[\s().-]/g, '');
  if (!s) return '';
  return /^\+?[0-9]{7,15}$/.test(s) ? s : null;
}

/** Collapses runs of space and cuts to `max` code points, as the server does. */
export function cleanText(value, max) {
  // eslint-disable-next-line no-control-regex -- removing control characters is the point
  const s = String(value ?? '').replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ').replace(/\s+/g, ' ').trim();
  return Array.from(s).slice(0, max).join('');
}

/**
 * The form's answers checked the server's way before sending, so a mistake is
 * said next to the field: `{ ok: true, params }` (apply_founding's arguments)
 * or `{ ok: false, field, message }`.
 */
export function checkAnswers({ name, sport, band, pay, instagram, phone }) {
  const n = cleanText(name, NAME_MAX);
  if (!n) return { ok: false, field: 'name', message: 'Add your name.' };
  const s = cleanText(sport, SPORT_MAX);
  if (!s) return { ok: false, field: 'sport', message: 'Say what you coach.' };
  if (!ATHLETE_BANDS.some((b) => b.value === band)) return { ok: false, field: 'band', message: 'Pick how many athletes you train today.' };
  const methods = [...new Set((Array.isArray(pay) ? pay : []).filter((p) => PAY_METHODS.some((m) => m.value === p)))];
  if (methods.length === 0) return { ok: false, field: 'pay', message: 'Pick at least one way your athletes pay you today.' };
  const ig = cleanInstagram(instagram);
  if (ig === null) return { ok: false, field: 'instagram', message: 'That doesn’t look like an Instagram handle. Use letters, numbers, dots and underscores, or leave it blank.' };
  const ph = cleanPhone(phone);
  if (ph === null) return { ok: false, field: 'phone', message: 'That doesn’t look like a phone number. Use 7 to 15 digits, or leave it blank.' };
  return {
    ok: true,
    params: { p_name: n, p_sport: s, p_athlete_band: band, p_pay_methods: methods, p_instagram: ig || null, p_phone: ph || null },
  };
}

/** The form's starting values from a saved application (or blanks, with a name the account already has). */
export function answersFrom(application, fallbackName = '') {
  const a = application ?? {};
  return {
    name: typeof a.name === 'string' ? a.name : cleanText(fallbackName, NAME_MAX),
    sport: typeof a.sport === 'string' ? a.sport : '',
    band: typeof a.athlete_band === 'string' ? a.athlete_band : '',
    pay: Array.isArray(a.pay_methods) ? a.pay_methods.filter((p) => PAY_METHODS.some((m) => m.value === p)) : [],
    instagram: typeof a.instagram === 'string' ? `@${a.instagram}` : '',
    phone: typeof a.phone === 'string' ? a.phone : '',
  };
}

export const STATUSES = Object.freeze(['pending', 'booked', 'granted', 'declined', 'withdrawn']);

/** The status line under the application, from the row's own status. */
export function statusLine(status, supportEmail) {
  switch (status) {
    case 'pending': return 'Application received. Each one is read in person; applying doesn’t take a spot until the setup call.';
    case 'booked': return 'Your setup call is booked.';
    case 'granted': return 'You’re a Founding coach.';
    case 'declined': return `This application was closed. Questions? Write to ${supportEmail}.`;
    case 'withdrawn': return 'You withdrew this application. Send it again below if you change your mind.';
    default: return '';
  }
}

/**
 * apply_founding's refusal in words. `error` is PostgREST's error object
 * ({ code, message, hint, details }) and `status` the HTTP status (0 when no
 * answer came). `{ message, unknown }`: `unknown` is true when the call may
 * have been saved without anyone hearing about it (no answer, a 5xx that is
 * not one of the RPC's own keys); the page then offers Check again, which
 * re-reads the caller's own application.
 */
export function applyRefusal(error, status, { total, closesOn, supportEmail }) {
  const key = String(error?.message ?? '').trim();
  const known = {
    not_authenticated: 'Your sign-in has expired. Sign in again to apply.',
    not_a_coach: 'Founding spots are for coach accounts, and this account isn’t one.',
    founding_full: Number.isInteger(total) ? `All ${total} spots are taken, so this application wasn’t sent.` : 'Every spot is taken, so this application wasn’t sent.',
    founding_closed: closesOn ? `Founding spots closed on ${closesLabelLong(closesOn)}, so this application wasn’t sent.` : 'Founding spots are closed, so this application wasn’t sent.',
    rate_limited: 'Too many tries in the last hour. Wait a while, then send it again.',
    application_closed: `This application was closed, so it can’t be sent again. Questions? Write to ${supportEmail}.`,
    invalid_name: 'Add your name.',
    invalid_sport: 'Say what you coach.',
    invalid_athlete_band: 'Pick how many athletes you train today.',
    invalid_pay_methods: 'Pick at least one way your athletes pay you today.',
    invalid_instagram: 'That doesn’t look like an Instagram handle.',
    invalid_phone: 'That doesn’t look like a phone number.',
  };
  if (Object.hasOwn(known, key)) return { message: known[key], unknown: false, code: key };
  // The function is not on the server yet (PostgREST: no such function).
  if (error?.code === 'PGRST202' || status === 404) {
    return { message: 'Applications aren’t open yet. Try again later.', unknown: false, code: 'not_open' };
  }
  if (status === 401 || status === 403) return { message: known.not_authenticated, unknown: false, code: 'not_authenticated' };
  if (status === 0 || status >= 500 || !status) {
    return { message: 'We couldn’t tell whether your application was saved. Check again to see.', unknown: true, code: 'unknown' };
  }
  return { message: 'Your application wasn’t sent. Try again in a moment.', unknown: false, code: 'refused' };
}
