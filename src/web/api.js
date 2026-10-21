// Typed-ish wrappers over the edge functions and tables the web pages use.
// The server identifies the caller from the session's JWT; the page only
// ever sends ids (invite code, plan id, client id), never a price or a payee.
import { supabase, SUPABASE_KEY, FUNCTIONS_URL } from './supabase';
import { finishedSeason } from './season';
import {
  APPLE_RETURN_PATHS, CHECKOUT_RETURN_KEY, APPLE_START_FAILED, SIGN_UP_FAILED, TRAINER_IN_USE,
  appleAvailable, parseAuthReturn, parkedCheckoutValue, readParkedCheckout, cleanName,
} from './appleAuth';
import { APPLE_WEB_ENABLED } from './authConfig';

export { normalizeCode } from './codes';

/** The public invite card: coach name, photo, bio; kind coach | live. */
export async function inviteInfo(code) {
  const res = await fetch(`${FUNCTIONS_URL}/invite-info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify({ code }),
  });
  if (res.status === 404) return null;
  if (res.status === 429) throw new Error('rate_limited');
  if (!res.ok) throw new Error('lookup_failed');
  return res.json();
}

/** A coach's passes for sale, cheapest first. Readable by anyone (plans_select).
 *  An archived pass (`archived_at` set) stays with its holders but is never
 *  offered to a buyer; create-subscription refuses it on the server as well. */
export async function plansFor(trainerId) {
  const live = await supabase.from('plans').select('*').eq('trainer_id', trainerId).is('archived_at', null).order('price');
  if (live.error?.code === '42703') {
    // The column is not there yet (this build deployed ahead of the
    // plans.archived_at migration): nothing can be archived, so every pass is for sale.
    const all = await supabase.from('plans').select('*').eq('trainer_id', trainerId).order('price');
    if (all.error) throw all.error;
    return all.data ?? [];
  }
  if (live.error) throw live.error;
  return live.data ?? [];
}

/**
 * Whether a pass has a price create-subscription can charge: its own rule
 * (rules.ts planAmountCents), at least one cent after rounding. A pass
 * without one is refused 409 plan_unpriced, so no page offers to buy it.
 */
export function planIsPriced(plan) {
  const n = Math.round(Number(plan?.price) * 100);
  return Number.isFinite(n) && n > 0;
}

/**
 * Whether the pass's coach can take a card now: trainers_public
 * .stripe_charges_enabled (written by sync_trainer_public; SELECT for anon
 * and authenticated). create-subscription refuses 400 payouts_not_ready
 * without it. `null` when the coach has no public row (gone from FitLink);
 * a failed read throws. The server stays the authority: this only keeps a
 * page from ending a pass for a purchase it can already see will be refused.
 */
export async function coachTakesCards(trainerId) {
  const { data, error } = await supabase.from('trainers_public').select('stripe_charges_enabled').eq('id', trainerId).limit(1);
  if (error) throw error;
  if (!data?.length) return null;
  return data[0].stripe_charges_enabled === true;
}

let configCache;
/** Public config: the Stripe publishable key. Cached for the page's life. */
export async function appConfig() {
  if (configCache) return configCache;
  const { data, error } = await supabase.functions.invoke('app-config', { body: {} });
  if (error) throw error;
  configCache = data ?? {};
  return configCache;
}

export async function session() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

/**
 * After the auth client has looked at the URL (initialize() is cached, so this
 * waits for the exchange), remove every auth parameter from the address bar and
 * say, in ONE fixed sentence, whether a sign-in came back unfinished. Never the
 * URL's own text: anyone can craft ?error_description=<anything>.
 */
export async function takeAuthReturnNote() {
  try { await supabase.auth.initialize(); } catch { /* initialize never throws; belt and braces */ }
  const r = parseAuthReturn(window.location.search, window.location.hash);
  if (r.changed) window.history.replaceState(window.history.state, '', `${window.location.pathname}${r.search}${r.hash}`);
  return r.note;
}

/** The signed-in user with identities: the session's copy, else /auth/v1/user. null when signed out. */
export async function currentUser() {
  const s = await session();
  if (!s) return null;
  if (Array.isArray(s.user?.identities)) return s.user;
  const { data, error } = await supabase.auth.getUser();
  return error ? s.user : (data?.user ?? s.user);
}

/**
 * A brand-new Apple account reached /coach: sign-up happens in the app. Drop the
 * trainers row the sign-up trigger made by default (claim_athlete_role; it
 * refuses once the coach side is in use), so no empty coach profile is listed
 * in trainers_public, then sign this browser out. Best effort: the app's role
 * screen finds or recreates the row, and the account stays role-less either way.
 */
export async function leaveUnfinishedAppleSignUp() {
  try { await supabase.rpc('claim_athlete_role'); } catch { /* best effort */ }
  await signOutLocal();
}

/** A Home Screen web app (iOS standalone display). */
export function isStandaloneHere() {
  return window.matchMedia?.('(display-mode: standalone)')?.matches === true || window.navigator?.standalone === true;
}
/** Offered here at all: the flag, a known origin, not a Home Screen web app. */
export function appleAvailableHere() {
  return appleAvailable({ enabled: APPLE_WEB_ENABLED, origin: window.location.origin, standalone: isStandaloneHere() });
}

/**
 * Sign in with Apple through Supabase Auth (Services ID fitlink.app.web). The return
 * page is fixed per caller and never taken from the URL; it is never under /i/* or
 * /live/* (the AASA paths the installed app may claim). Resolves once the browser is
 * leaving; throws APPLE_START_FAILED when it could not start. Supabase always asks
 * Apple for name and email; `scopes` states the intent.
 */
export async function signInWithApple(where) {
  const path = APPLE_RETURN_PATHS[where];
  if (!path || !appleAvailableHere()) throw Object.assign(new Error(APPLE_START_FAILED), { code: 'apple_unavailable' });
  let error;
  try {
    ({ error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}${path}`, scopes: 'name email' },
    }));
  } catch (e) { error = e; }
  if (error) throw Object.assign(new Error(APPLE_START_FAILED), { code: 'apple_unavailable' });
}

/**
 * A new Apple account at checkout becomes an athlete exactly as the iOS app does
 * it (AuthService.claimRole(.client)): claim_athlete_role (removes the trainers row
 * handle_new_user made by default; refuses `trainer_in_use`), then role 'client' in
 * metadata, plus the name the person typed when Apple gave none. Called ONLY when
 * appleSignUpUnfinished(user): on a finished coach claim_athlete_role would delete a
 * real coach row. Throws { code: 'trainer_in_use' | 'unauthorized' | 'sign_up_failed' }.
 */
export async function finishAthleteSignUp({ name = '' } = {}) {
  const { error: claimErr, status } = await supabase.rpc('claim_athlete_role');
  if (claimErr) {
    if (status === 401) throw Object.assign(new Error(SIGNED_OUT_SENTENCE), { code: 'unauthorized' });
    if (String(claimErr.message ?? '').includes('trainer_in_use')) throw Object.assign(new Error(TRAINER_IN_USE), { code: 'trainer_in_use' });
    throw Object.assign(new Error(SIGN_UP_FAILED), { code: 'sign_up_failed' });
  }
  const clean = cleanName(name);
  const { error } = await supabase.auth.updateUser({ data: { role: 'client', ...(clean ? { name: clean } : {}) } });
  if (error) {
    const unauthorized = error.status === 401;
    throw Object.assign(new Error(unauthorized ? SIGNED_OUT_SENTENCE : SIGN_UP_FAILED), { code: unauthorized ? 'unauthorized' : 'sign_up_failed' });
  }
}

/** Remember, in this tab only, which pass an Apple sign-in started from. false when the browser refuses. */
export function parkCheckout({ code, planId, name }) {
  const value = parkedCheckoutValue({ code, planId, name });
  if (!value) return false;
  try { window.sessionStorage.setItem(CHECKOUT_RETURN_KEY, value); return true; } catch { return false; }
}
/** Read and forget the parked checkout: { code, planId, name } or null. */
export function takeParkedCheckout() {
  let raw = null;
  try { raw = window.sessionStorage.getItem(CHECKOUT_RETURN_KEY); window.sessionStorage.removeItem(CHECKOUT_RETURN_KEY); } catch { /* none */ }
  return readParkedCheckout(raw);
}
export function clearParkedCheckout() { try { window.sessionStorage.removeItem(CHECKOUT_RETURN_KEY); } catch { /* none */ } }

/**
 * "Start another season": the signed-in person's most recent season with this
 * coach that reads 'completed' (client_plan_enrollments), while they hold no
 * pass with the coach that is still running (client_subscriptions). Whether
 * every payment was made is read from the server-written 'season_complete'
 * notice (notifications; stripe-webhook writes it only after all P payments),
 * never from the enrollment, which the athlete can mark completed themselves.
 * All three are readable by the athlete for their own rows. `{ planId,
 * planName, paidInFull }`, or null when signed out, never a client, or nothing
 * to offer. A failed read throws; the page then shows nothing. Reads only.
 */
export async function finishedSeasonWith(coachId) {
  const s = await session();
  if (!s || !coachId) return null;
  const rows = await supabase.from('clients').select('id').eq('auth_user_id', s.user.id);
  if (rows.error) throw rows.error;
  const ids = (rows.data ?? []).map((r) => r.id);
  if (ids.length === 0) return null;
  const [enrollments, subscriptions, coachPlans, notices] = await Promise.all([
    supabase.from('client_plan_enrollments').select('plan_id, status, started_at, completed_at').in('client_id', ids).eq('status', 'completed'),
    supabase.from('client_subscriptions').select('trainer_id, status').in('client_id', ids),
    // Archived passes included: the season may be on a pass no longer for sale.
    supabase.from('plans').select('id, name, trainer_id').eq('trainer_id', coachId),
    supabase.from('notifications').select('type, metadata, created_at').eq('type', 'season_complete').in('client_id', ids),
  ]);
  for (const r of [enrollments, subscriptions, coachPlans, notices]) if (r.error) throw r.error;
  return finishedSeason({
    enrollments: enrollments.data, subscriptions: subscriptions.data, coachPlans: coachPlans.data, notices: notices.data, coachId,
  });
}

/** The signed-in athlete's own row, if any. */
export async function myClient() {
  const s = await session();
  if (!s) return null;
  const { data } = await supabase.from('clients').select('*').eq('auth_user_id', s.user.id).order('created_at').limit(1);
  return data?.[0] ?? null;
}

/**
 * athlete-exit, the athletes' one exit (fitlink-app, 2026-10-17): deleting an
 * athlete account and joining a coach both go through it, preview first, then
 * confirm. The body names an action and an invite code, never a person, a
 * subscription or an amount; the caller is the session's JWT. A refusal
 * throws `{ status, code, message, body }` with the server's sentence.
 */
async function athleteExit(body) {
  const { data, error } = await supabase.functions.invoke('athlete-exit', { body });
  if (error) throw refusal(await functionError(error));
  return data ?? {};
}

/**
 * What joining this coach would end, changing nothing: `{ preview: true,
 * kind, newCoach: {id, name}, currentCoach: {id, name} | null, needsSwitch,
 * needsConfirmation, passesEnding: [{ line, … }], refund: 'none' }`.
 */
export function previewInvite(code) {
  return athleteExit({ action: 'accept_invite', code, preview: true });
}

/**
 * Join the coach. `confirm` only after the person saw the preview's lines:
 * the server then ends every pass that would not pay the new coach (cancel
 * now at Stripe, no refund, open invoices forgiven) and only after that runs
 * accept_invite. Answers `{ accepted: true, kind, trainerId, clientId,
 * liveClassId, switched, passesEnded }`. Without `confirm`, a join that
 * needs one is refused 409 `needs_confirmation` with the same view as the
 * preview in the body.
 */
export function acceptInvite(code, { confirm = false } = {}) {
  return athleteExit({ action: 'accept_invite', code, ...(confirm ? { confirm: true } : {}) });
}

/**
 * create-subscription. 200 answers: `{ clientSecret, customerId,
 * subscriptionId }` (a payment to confirm), `{ alreadyActive: true,
 * subscriptionId, customerId }`, or the same pass owed: `{ clientSecret, …,
 * payingOpenInvoice: true, amountDueCents }`. A refusal throws `{ status,
 * code, message }`: 400 bad_request / payouts_not_ready, 403 athlete_only,
 * 404 plan_not_found / coach_not_found, 409 plan_archived / plan_unpriced /
 * cannot_coach_yourself / live_subscription / roster_full /
 * payment_processing, 502 stripe_error, 500 db_error.
 */
export async function createSubscription(planId, clientId) {
  const { data, error } = await supabase.functions.invoke('create-subscription', { body: { planId, clientId } });
  if (error) throw refusal(await functionError(error));
  return data ?? {};
}

const SUBSCRIPTION_ID = /^sub_[A-Za-z0-9]{1,250}$/;

/**
 * confirm-subscription: `{ active, planId, subscriptionId, results, code?,
 * error? }`. `subscriptionId` (what create-subscription returned) narrows the
 * check to the subscription just paid; anything that is not a Stripe id is
 * left out (the server answers 400 for it). `active: false` with `code:
 * 'roster_full'` carries the server's sentence in `error`.
 */
export async function confirmSubscription(clientId, subscriptionId = null) {
  const body = { clientId, ...(SUBSCRIPTION_ID.test(String(subscriptionId ?? '')) ? { subscriptionId } : {}) };
  const { data, error } = await supabase.functions.invoke('confirm-subscription', { body });
  if (error) throw refusal(await functionError(error));
  return data ?? {};
}

/** Shown when a call never reached the server, or its answer never came back. */
export const NETWORK_SENTENCE = 'We couldn’t reach FitLink. Check your connection and try again.';
/** Shown when an answer came back with no sentence in it (a gateway's HTML page, a timeout). */
export const NO_ANSWER_SENTENCE = 'FitLink didn’t send a readable answer. Try again in a moment.';
const SIGNED_OUT_SENTENCE = 'Your sign-in has expired. Sign in again to continue.';

/**
 * An edge function's refusal as `{ status, code, message, body, fromServer,
 * outcomeUnknown }`. supabase-js wraps a non-2xx answer in a
 * FunctionsHttpError whose `context` is the Response (read once, here).
 * Bodies: ours `{ error: <sentence>, code }` (a decided refusal, whatever its
 * status); internalError's `{ error: <sentence> }` (500, no code: the
 * function threw part-way); guardRate's `{ error: <code>, message:
 * <sentence> }` (refused before the function did anything); the auth check's
 * `{ error }`; the gateway's `{ code: 401, message }` or `{ code:
 * 'WORKER_LIMIT', message }`; a gateway timeout's HTML page (no body). A
 * network failure has status 0.
 *
 * `fromServer`: `message` is FitLink's own sentence. `outcomeUnknown`: the
 * call may have done something nobody heard about (no answer at all, or a
 * 5xx that is not one of our decided refusals). A page that sent a commit
 * (a switch, a deletion) says so in place of a plain "try again".
 */
export async function functionError(error) {
  const status = Number(error?.context?.status) || 0;
  let code = null;
  let message = null;
  let body = null;
  let fromServer = false;
  let decided = false;
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === 'function') {
      const parsed = await ctx.json();
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed;
    }
  } catch { /* no readable body */ }
  if (body) {
    if (typeof body.error === 'string' && typeof body.message === 'string' && body.message && body.code === undefined) {
      code = body.error;
      message = body.message;
      fromServer = true;
      decided = true;
    } else {
      if (typeof body.error === 'string' && body.error) {
        message = body.error;
        fromServer = true;
      }
      if (typeof body.code === 'string' && body.code) code = body.code;
      decided = fromServer && code !== null;
    }
  }
  if (status === 401) {
    message = SIGNED_OUT_SENTENCE;
    code = code ?? 'unauthorized';
    fromServer = false;
    decided = true;
  }
  // No sentence of ours: the gateway's own words when it gave some, else say plainly that none came.
  if (!message && typeof body?.message === 'string' && body.message) message = body.message;
  if (!message) message = status === 0 ? NETWORK_SENTENCE : NO_ANSWER_SENTENCE;
  const outcomeUnknown = status === 0 || (status >= 500 && !decided);
  return { status, code, message, body, fromServer, outcomeUnknown };
}

/**
 * coach | athlete | none for the signed-in user; null when signed out. A read
 * that did not answer is never taken for "no profile": it throws `{ status,
 * code, message }` (code `unauthorized` on a 401).
 */
export async function myRole() {
  const s = await session();
  if (!s) return null;
  const t = await supabase.from('trainers').select('id').eq('id', s.user.id).limit(1);
  if (t.error) throw roleReadError(t.status);
  if (t.data?.length) return 'coach';
  const c = await supabase.from('clients').select('id').eq('auth_user_id', s.user.id).limit(1);
  if (c.error) throw roleReadError(c.status);
  return c.data?.length ? 'athlete' : 'none';
}

function roleReadError(httpStatus) {
  const status = Number(httpStatus) || 0;
  const message = status === 401
    ? SIGNED_OUT_SENTENCE
    : status === 0
      ? 'We couldn’t reach FitLink to check your account. Check your connection, then check again.'
      : 'We couldn’t check your account right now. Check again in a moment.';
  return Object.assign(new Error(message), { status, code: status === 401 ? 'unauthorized' : null });
}

function refusal(e) {
  return Object.assign(new Error(e.message), {
    status: e.status,
    code: e.code,
    body: e.body ?? null,
    fromServer: e.fromServer === true,
    outcomeUnknown: e.outcomeUnknown === true,
  });
}

/**
 * delete-trainer-account {preview: true}: `{ athletes, placeholders,
 * subscriptions, refunds: [{clientId, passName, cents}], refundCentsTotal,
 * currency, refundsAlreadyIssued, ownPassesEnding: [{ line, whose, … }] }`
 * (`ownPassesEnding`: passes on the coach's own training rows and on the
 * placeholders they typed, which end with the account, no refund). Reads
 * only; 3 per hour per coach.
 */
export async function departurePreview() {
  const { data, error } = await supabase.functions.invoke('delete-trainer-account', { body: { preview: true } });
  if (error) throw refusal(await functionError(error));
  return data ?? {};
}

/**
 * delete-trainer-account: refunds undelivered prepaid time from the coach's
 * balance, cancels the subscriptions, detaches the athletes, deletes the
 * coach and the auth user. Resolves only when the server said `success` AND
 * the auth user is gone; the local session is dropped afterwards.
 */
export async function deleteCoachAccount() {
  const { data, error } = await supabase.functions.invoke('delete-trainer-account', { body: {} });
  if (error) throw refusal(await functionError(error));
  if (!data?.success) throw new Error('The server did not confirm the deletion. Nothing was changed; try again or write to support.');
  const { data: who, error: userErr } = await supabase.auth.getUser();
  if (!userErr && who?.user) throw new Error('The server did not delete the account. Try again or write to support.');
  await signOutLocal();
  return data;
}

/**
 * What deleting this athlete account would end, changing nothing:
 * `{ preview: true, passesEnding: [{ line, … }], refund: 'none', coachNotice }`.
 */
export function previewAthleteDeletion() {
  return athleteExit({ action: 'delete_account', preview: true });
}

/**
 * The athlete's own deletion, through athlete-exit: every pass the account
 * still pays ends at Stripe (no refund, open invoices forgiven), then the
 * account is deleted, then the files. Resolves only on the server's
 * `deleted: true`; the browser's session is dropped only then. Answers
 * `{ passesEnded, mediaIncomplete }`.
 */
export async function deleteAthleteAccount() {
  const data = await athleteExit({ action: 'delete_account', confirm: true });
  if (data?.deleted !== true) throw new Error('The server did not confirm the deletion. Reload this page to see whether your account is still there, or write to support.');
  await signOutLocal();
  return { passesEnded: Number(data.passesEnded) || 0, mediaIncomplete: data.mediaIncomplete === true };
}

/**
 * Drops the browser's session. When /logout can't be reached, forgets it locally
 * anyway: "Signed out" must be true. (auth-js keeps the stored session when
 * /logout fails with anything but 401/403/404.)
 */
export async function signOutLocal() {
  let failed;
  try { const { error } = await supabase.auth.signOut({ scope: 'local' }); failed = Boolean(error); } catch { failed = true; }
  if (failed) {
    try { window.localStorage.removeItem('fitlink-web'); window.localStorage.removeItem('fitlink-web-code-verifier'); } catch { /* storage blocked */ }
  }
}

/** The coach's standing invite (created once, reused): the public page URL. */
export async function standingInvite() {
  const { data, error } = await supabase.rpc('create_invite', { p_kind: 'coach', p_invitee_name: null, p_invitee_contact: null, p_message: null });
  if (error) throw error;
  return data;
}

export function dollars(price) {
  const n = Number(price) || 0;
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

export function firstName(name) {
  return String(name ?? '').trim().split(/\s+/)[0] || 'your coach';
}
