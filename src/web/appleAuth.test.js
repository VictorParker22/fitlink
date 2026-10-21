// node --test src/web/appleAuth.test.js
// Pins the web pages' sign-in rules (appleAuth.js): which account is a sign-up
// nobody finished, what a return URL says and how it is cleaned, names, and
// every sentence's wording rules. Pure: no browser, no Supabase.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from './appleAuth.js';
import {
  APPLE_CANCELLED, APPLE_SETTINGS_PATH, AUTH_RETURN_FAILED,
  appleSignUpUnfinished, cleanName, metadataName, noAccountMessage, parseAuthReturn, usedApple,
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

/** Every sentence the module can show: its string exports and what its sentence functions return. */
function everySentence() {
  const out = [];
  for (const [name, value] of Object.entries(A)) {
    if (typeof value === 'string') out.push([name, value]);
  }
  for (const page of ['coach', 'delete']) for (const available of [true, false]) out.push([`noAccountMessage(${page}, ${available})`, noAccountMessage(page, available)]);
  return out;
}

test('copy rules: no gendered pronouns, never a "real" or "personal" email', () => {
  const sentences = everySentence();
  assert.ok(sentences.length > 10);
  for (const [name, text] of sentences) {
    assert.doesNotMatch(text, /\b(he|she|him|her|his|hers)\b/i, name);
    assert.doesNotMatch(text, /real email|personal email/i, name);
  }
  assert.ok(APPLE_SETTINGS_PATH.startsWith('Settings, then your name, then Sign in with Apple'));
});

test('normalizeCode (codes.js)', () => {
  assert.equal(normalizeCode(' abc-def '), 'ABCDEF');
  assert.equal(normalizeCode('ABC12'), null);
  assert.equal(normalizeCode(null), null);
});
