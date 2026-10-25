// node --test src/web/appleAuth.test.js
// Pins the web pages' sign-in rules (appleAuth.js): which account is a sign-up
// nobody finished, what a return URL says and how it is cleaned, names, and
// every sentence's wording rules. Pure: no browser, no Supabase.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from './appleAuth.js';
import {
  APPLE_CANCELLED, APPLE_SETTINGS_PATH, APPLE_TITLE, AUTH_RETURN_FAILED, CHECKOUT_RETURN_TTL_MS, HINTS,
  accountLabel, appleAvailable, appleSignUpUnfinished, cleanName, metadataName, nameStepHint, nameStepTitle, noAccountMessage,
  parkedCheckoutValue, parseAuthReturn, readParkedCheckout, signInHint, siteCopy, usedApple, whoStepBody,
} from './appleAuth.js';
import { normalizeCode } from './codes.js';

const apple = [{ provider: 'apple' }];

test('appleSignUpUnfinished: only an all-Apple account without a known role', () => {
  assert.equal(appleSignUpUnfinished({ identities: apple, user_metadata: {} }), true);
  assert.equal(appleSignUpUnfinished({ identities: apple, user_metadata: { role: '' } }), true);
  assert.equal(appleSignUpUnfinished({ identities: apple, user_metadata: { role: 'coach' } }), true, 'an unknown role counts as none');
  assert.equal(appleSignUpUnfinished({ identities: apple }), true, 'no metadata at all');

  assert.equal(appleSignUpUnfinished({ identities: apple, user_metadata: { role: 'client' } }), false);
  assert.equal(appleSignUpUnfinished({ identities: apple, user_metadata: { role: 'trainer' } }), false);
  assert.equal(appleSignUpUnfinished({ identities: [{ provider: 'apple' }, { provider: 'email' }], user_metadata: {} }), false, 'auto-linked email');
  assert.equal(appleSignUpUnfinished({ identities: [{ provider: 'email' }], user_metadata: {} }), false, 'a legacy coach without a role');
  assert.equal(appleSignUpUnfinished({ identities: [], user_metadata: {} }), false);
  assert.equal(appleSignUpUnfinished({ user_metadata: {} }), false, 'identities missing');
  assert.equal(appleSignUpUnfinished({ identities: 'apple', user_metadata: {} }), false, 'identities not an array');
  assert.equal(appleSignUpUnfinished(null), false);
  assert.equal(appleSignUpUnfinished(undefined), false);
});

test('usedApple: an identity or the app metadata names Apple', () => {
  assert.equal(usedApple({ identities: apple }), true);
  assert.equal(usedApple({ identities: [], app_metadata: { providers: ['email', 'apple'] } }), true);
  assert.equal(usedApple({ app_metadata: { provider: 'apple' } }), true);
  assert.equal(usedApple({ identities: [{ provider: 'email' }], app_metadata: { provider: 'email', providers: ['email'] } }), false);
  assert.equal(usedApple(null), false);
});

test('accountLabel: the email, else the phone with its "+", else nothing', () => {
  assert.equal(accountLabel({ email: 'sam@example.com', phone: '15555550123' }), 'sam@example.com');
  assert.equal(accountLabel({ email: '  sam@example.com ' }), 'sam@example.com');
  assert.equal(accountLabel({ email: '', phone: '15555550123' }), '+15555550123', 'GoTrue stores E.164 without the plus');
  assert.equal(accountLabel({ email: null, phone: '+15555550123' }), '+15555550123');
  assert.equal(accountLabel({ email: '', phone: '' }), '');
  assert.equal(accountLabel({}), '');
  assert.equal(accountLabel(null), '');
});

test('the signed-out sentences after an unfinished Apple sign-up was left', () => {
  assert.equal(A.JOIN_SIGNED_OUT, 'This browser is signed out, and nothing was bought.');
  assert.equal(A.RESUME_SIGNED_OUT, 'This browser is signed out, and nothing was bought. Sign in again when you pick a pass.');
});

test('whoStepBody: names the pass and says nothing happens before Continue', () => {
  assert.equal(whoStepBody('Strength block'), 'This browser is already signed in. Strength block goes on this account, and nothing changes until you continue.');
});

test('cleanName and metadataName', () => {
  assert.equal(cleanName('  Sam\t\n Lee  '), 'Sam Lee');
  assert.equal(cleanName('Sa\u0000m\u0007 \u0085Lee\u009F'), 'Sam Lee');
  assert.equal(cleanName('é'.repeat(130)), 'é'.repeat(120));
  const emoji = '💪'.repeat(121);
  const cut = cleanName(emoji);
  assert.equal(Array.from(cut).length, 120);
  assert.equal(cut, '💪'.repeat(120), 'no split surrogates');
  assert.equal(cleanName(null), '');
  assert.equal(cleanName(undefined), '');
  assert.equal(metadataName({ user_metadata: { full_name: ' Sam  Lee ' } }), 'Sam Lee');
  assert.equal(metadataName({ user_metadata: { name: 'Dana', full_name: 'Dana Ruiz' } }), 'Dana');
  assert.equal(metadataName({ user_metadata: { name: '  ' } }), '');
  assert.equal(metadataName({ user_metadata: {} }), '');
  assert.equal(metadataName(null), '');
});

test('parseAuthReturn: notes are fixed sentences, auth keys go, everything else stays', () => {
  assert.deepEqual(parseAuthReturn('', ''), { note: null, search: '', hash: '', changed: false });

  assert.deepEqual(parseAuthReturn('?code=abc', ''), { note: AUTH_RETURN_FAILED, search: '', hash: '', changed: true });

  const injected = parseAuthReturn(
    '?error=access_denied&error_description=INJECTED+TEXT&error_code=bad',
    '#error=access_denied&error_description=INJECTED%20TEXT&sb=',
  );
  assert.equal(injected.note, AUTH_RETURN_FAILED);
  assert.ok(!injected.note.includes('INJECTED') && !injected.note.includes('access_denied'));
  assert.equal(injected.search, '');
  assert.equal(injected.hash, '');
  assert.equal(injected.changed, true);

  assert.equal(parseAuthReturn('?error=user_cancelled_authorize', '').note, APPLE_CANCELLED);
  assert.equal(parseAuthReturn('', '#error=user_cancelled_authorize').note, APPLE_CANCELLED);

  assert.deepEqual(
    parseAuthReturn('', '#access_token=x&refresh_token=y&expires_in=3600&token_type=bearer'),
    { note: null, search: '', hash: '', changed: true },
    'a token-only URL is cleaned silently',
  );

  const mixed = parseAuthReturn('?foo=1&code=x&bar=2', '#passes');
  assert.equal(mixed.search, '?foo=1&bar=2');
  assert.equal(mixed.hash, '#passes');
  assert.equal(mixed.note, AUTH_RETURN_FAILED);

  const stripe = '?payment_intent=pi_1&payment_intent_client_secret=s&redirect_status=succeeded';
  assert.deepEqual(parseAuthReturn(stripe, ''), { note: null, search: stripe, hash: '', changed: false });

  // Spelling of the keys that stay is kept exactly (no re-encoding).
  assert.equal(parseAuthReturn('?q=a%20b+c&code=x', '').search, '?q=a%20b+c');
});

test('noAccountMessage, by page and by whether Apple is offered', () => {
  assert.equal(noAccountMessage('coach', true), 'No FitLink account uses that email. If you signed up with Apple, use Continue with Apple.');
  assert.equal(noAccountMessage('delete', true), 'No FitLink account uses that email. If you signed up with Apple, use Continue with Apple.');
  assert.equal(noAccountMessage('coach', false), 'No FitLink account uses that email. Check the address, or sign up in the FitLink app first.');
  assert.equal(noAccountMessage('delete', false), 'No FitLink account uses that email. Check the address, or the one you used in the app.');
});

test('appleAvailable: the flag, a listed origin, and not a Home Screen web app', () => {
  for (const enabled of [true, false]) {
    for (const origin of ['https://fitlink.coach', 'http://localhost:4173', 'https://fitlink-abc.vercel.app']) {
      for (const standalone of [true, false]) {
        const want = enabled && origin !== 'https://fitlink-abc.vercel.app' && !standalone;
        assert.equal(appleAvailable({ enabled, origin, standalone }), want, `${enabled} ${origin} ${standalone}`);
      }
    }
  }
  assert.equal(appleAvailable({ enabled: 'on', origin: 'https://fitlink.coach', standalone: false }), false, 'only a boolean true turns it on');
  assert.equal(appleAvailable({ enabled: true, origin: 'http://localhost:5173' }), true);
});

const PLAN = '44444444-4444-4444-8444-444444444444';

test('the parked checkout: written, read back, and refused when it is not ours or too old', () => {
  const now = 1_800_000_000_000;
  const raw = parkedCheckoutValue({ code: 'abc-d2e', planId: PLAN, name: '  Sam\t Lee ' }, now);
  assert.deepEqual(JSON.parse(raw), { v: 1, code: 'ABCD2E', planId: PLAN, name: 'Sam Lee', at: now });
  assert.deepEqual(readParkedCheckout(raw, now + 60_000), { code: 'ABCD2E', planId: PLAN, name: 'Sam Lee' });

  assert.equal(parkedCheckoutValue({ code: 'ABC12', planId: PLAN, name: '' }, now), null, 'a 5-character code');
  assert.equal(parkedCheckoutValue({ code: 'ABCDEF', planId: 'not-a-uuid', name: '' }, now), null, 'a bad UUID');
  assert.equal(parkedCheckoutValue({ code: 'ABCDEF', planId: undefined, name: '' }, now), null);

  const good = { v: 1, code: 'ABCDEF', planId: PLAN, name: 'Sam', at: now };
  const read = (o, at = now) => readParkedCheckout(JSON.stringify(o), at);
  assert.deepEqual(read(good), { code: 'ABCDEF', planId: PLAN, name: 'Sam' });
  assert.equal(readParkedCheckout('{not json', now), null, 'bad JSON');
  assert.equal(read({ ...good, v: 2 }), null, 'v: 2');
  assert.equal(read({ ...good, code: 'abcdef' }), null, 'a code that is not already normalized');
  assert.equal(read({ ...good, code: 'ABCDE' }), null, 'a 5-character code');
  assert.equal(read({ ...good, planId: 'x' }), null, 'a bad UUID');
  assert.equal(read({ ...good, at: String(now) }), null, 'a non-number at');
  assert.equal(read({ ...good, at: now - 31 * 60 * 1000 }), null, '31 minutes old');
  assert.notEqual(read({ ...good, at: now - CHECKOUT_RETURN_TTL_MS }), null, 'exactly 30 minutes is still good');
  assert.equal(read({ ...good, at: now + 2 * 60 * 1000 }), null, '2 minutes in the future');
  assert.equal(readParkedCheckout(undefined, now), null);
  assert.equal(readParkedCheckout(null, now), null);
  assert.equal(read({ ...good, name: 'x'.repeat(130) }).name.length, 120, 'a long name is cut to 120');
  assert.equal(JSON.parse(parkedCheckoutValue({ code: 'ABCDEF', planId: PLAN, name: 'y'.repeat(130) }, now)).name.length, 120);
});

test('signInHint and noAccountMessage: every page and state, the §5 words', () => {
  const states = { apple: { available: true, enabled: true, standalone: false }, safari: { available: false, enabled: true, standalone: true }, off: { available: false, enabled: false, standalone: false } };
  const want = {
    coach: {
      apple: 'Signed up with Sign in with Apple and hid your email? Use Continue with Apple.',
      safari: 'Signed up with Sign in with Apple? Open fitlink.coach/coach in Safari to continue with Apple.',
      off: 'Signed up with Sign in with Apple and hid your email? Sign in in the FitLink app instead.',
    },
    delete: {
      apple: 'Signed up with Sign in with Apple and hid your email? Use Continue with Apple.',
      safari: 'Signed up with Sign in with Apple? Open fitlink.coach/delete-account in Safari to continue with Apple.',
      off: 'Signed up with Sign in with Apple and hid your email? Delete from the FitLink app instead: Profile, then Delete account.',
    },
    founding: {
      apple: 'Signed up in the app with Sign in with Apple and hid your email? Use Continue with Apple.',
      safari: 'Signed up in the app with Sign in with Apple? Open fitlink.coach/founding in Safari to continue with Apple.',
      off: 'Signed up in the app with Sign in with Apple and hid your email? Write to support (the address is at the bottom of this page) and the application is taken by email.',
    },
    checkout: {
      apple: 'Signed up in the app with Sign in with Apple? Use Continue with Apple, so the pass lands on that account.',
      safari: 'Signed up in the app with Sign in with Apple? Open this page in Safari to continue with Apple, so the pass lands on that account.',
      off: 'Signed up in the app with Sign in with Apple? Open this link in the FitLink app instead, so the pass lands on that account.',
    },
  };
  for (const page of Object.keys(want)) for (const [state, args] of Object.entries(states)) assert.equal(signInHint(page, args), want[page][state], `${page} ${state}`);
  // Enabled but not standalone and not available (an unlisted origin): the app, not Safari.
  assert.equal(signInHint('coach', { available: false, enabled: true, standalone: false }), want.coach.off);
  assert.equal(nameStepTitle('Dana'), 'What should Dana call you?');
  assert.equal(nameStepHint('Dana'), 'Optional. Dana sees it on their roster.');
});

test('Apple returns only to fixed pages, never under /i/ or /live/ (the AASA paths), /founding included', () => {
  assert.deepEqual({ ...A.APPLE_RETURN_PATHS }, { coach: '/coach', delete: '/delete-account', checkout: '/join', founding: '/founding' });
  for (const path of Object.values(A.APPLE_RETURN_PATHS)) {
    assert.match(path, /^\/[a-z-]+$/);
    assert.doesNotMatch(path, /^\/(i|live)(\/|$)/);
  }
  assert.ok(Object.isFrozen(A.APPLE_RETURN_PATHS));
});

test('siteCopy(false) is the pages’ words before Apple came to the web', () => {
  // Copied from Support.jsx, Athletes.jsx, Home.jsx, CoachWeb.jsx and Checkout.jsx as they stood at cd85bf4.
  assert.deepEqual({ ...siteCopy(false), supportHidEmailA: undefined }, {
    coachSignInSub: 'The same account as the app. We email you a six-digit code; no password.',
    checkoutIntro: 'One account for the pass and the app. We email you a six-digit code; no password.',
    supportSignInA: 'With Sign in with Apple or a six-digit code sent to your email. There are no passwords. The season editor on the web signs in with the same email code.',
    supportHidEmailA: undefined,
    supportBuyA: 'Open your coach’s link, pick a pass, enter your email and the six-digit code we send, then pay by card. Stripe handles the card; FitLink never sees the number. The same email signs you in to the app.',
    supportPaidNoPlanLead: 'Sign in to the app with the same email you paid with.',
    athletesStep2: 'Card checkout, handled by Stripe. We email you a six-digit code; no password.',
    athletesStep3: 'Sign in with the email you paid with. Your plan is already there.',
    athletesPaidNoPlanLead: 'Sign in to the app with the same email you paid with.',
    homeNeedAppA: 'No. They pay on your page in any browser, then get the app to train. Their plan is waiting when they sign in with the same email.',
  });
  // The one new answer (no old words to keep): the app, never the hidden address.
  assert.equal(siteCopy(false).supportHidEmailA, `Sign in in the FitLink app with Sign in with Apple; it opens the same account. To see the address FitLink has for you, on your iPhone open ${APPLE_SETTINGS_PATH}.`);
  assert.deepEqual(Object.keys(siteCopy(true)).sort(), Object.keys(siteCopy(false)).sort());
  assert.equal(siteCopy(true).coachSignInSub, 'The same account as the app. No password.');
});

/** Every sentence the module can show: its string exports and what its sentence functions return. */
function everySentence() {
  const out = [];
  for (const [name, value] of Object.entries(A)) {
    if (typeof value === 'string') out.push([name, value]);
  }
  for (const page of ['coach', 'delete']) for (const available of [true, false]) out.push([`noAccountMessage(${page}, ${available})`, noAccountMessage(page, available)]);
  for (const [page, h] of Object.entries(HINTS)) for (const [state, v] of Object.entries(h)) out.push([`HINTS.${page}.${state}`, v]);
  for (const enabled of [true, false]) for (const [k, v] of Object.entries(siteCopy(enabled))) out.push([`siteCopy(${enabled}).${k}`, v]);
  out.push(['nameStepTitle', nameStepTitle('Dana')], ['nameStepHint', nameStepHint('Dana')], ['whoStepBody', whoStepBody('Strength block')]);
  return out;
}

test('copy rules: no gendered pronouns, never a "real" or "personal" email', () => {
  const sentences = everySentence();
  assert.ok(sentences.length > 10);
  for (const [name, text] of sentences) {
    assert.doesNotMatch(text, /\b(he|she|him|her|his|hers)\b/i, name);
    assert.doesNotMatch(text, /real email|personal email/i, name);
  }
  assert.equal(APPLE_TITLE, 'Continue with Apple');
  assert.ok(APPLE_SETTINGS_PATH.startsWith('Settings, then your name, then Sign in with Apple'));
});

test('normalizeCode (codes.js)', () => {
  assert.equal(normalizeCode(' abc-def '), 'ABCDEF');
  assert.equal(normalizeCode('ABC12'), null);
  assert.equal(normalizeCode(null), null);
});
