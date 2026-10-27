// Typed-ish wrappers over the edge functions and tables the web pages use.
// The server identifies the caller from the session's JWT; the page only
// ever sends ids (invite code, plan id, client id), never a price or a payee.
import { supabase, SUPABASE_KEY, FUNCTIONS_URL } from './supabase';
import { finishedSeason } from './season';
import {
  APPLE_RETURN_PATHS, CHECKOUT_RETURN_KEY, APPLE_START_FAILED, SIGN_UP_FAILED, TRAINER_IN_USE, FOUNDING_FINISH_FAILED,
  appleAvailable, parseAuthReturn, parkedCheckoutValue, readParkedCheckout, cleanName, metadataName,
} from './appleAuth';
import { FOUNDING_RETURN_KEY, foundingReturnValue, parseSlots, readFoundingReturn } from './founding';
import { APPLE_WEB_ENABLED } from './authConfig';
import { BRAND_NAME } from './site/brand';
import { isSessionKey } from './coachPage';

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

/**
 * The signed-in user as the server has it NOW (GET /auth/v1/user), with
 * identities and metadata. The browser's stored copy can be an hour old: an
 * Apple sign-up that picked Coach in the app since then still reads as
 * unfinished there, and claim_athlete_role would delete that coach's new
 * trainers row. Every write decided on who the account is (claim_athlete_role,
 * role 'client') reads this, never the stored session. Never null: throws
 * `{ status, code, message }` (code `unauthorized` when the session is gone, a
 * 401/403 or no session; the role read's sentences otherwise), so a caller
 * that cannot check writes nothing.
 */
export async function freshUser() {
  let data;
  let error;
  try { ({ data, error } = await supabase.auth.getUser()); } catch (e) { data = null; error = e; }
  if (!error && data?.user) return data.user;
  const status = Number(error?.status) || 0;
  const gone = !error || status === 401 || status === 403 || error?.name === 'AuthSessionMissingError';
  throw roleReadError(gone ? 401 : status);
}

/**
 * A brand-new Apple account reached /coach, /join with nothing to finish, or a
 * pass that is gone on the way back from Apple: sign-up happens in the app or at a
 * checkout. Drop the trainers row the sign-up trigger made by default
 * (claim_athlete_role; it refuses once the coach side is in use), so no coach
 * profile under the person's name is listed in trainers_public, then sign this
 * browser out. Best effort: the app's role screen finds or recreates the row, and
 * the account stays role-less either way. Decide it on freshUser(), never the
 * stored session.
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
 * Step 1 of a new Apple account at checkout (AuthService.claimRole(.client)):
 * claim_athlete_role removes the trainers row handle_new_user made by default (its
 * name, Apple's full name or the email's local part, is anon-readable in
 * trainers_public) and refuses `trainer_in_use` once the coach side is in use.
 * Idempotent (a second call deletes nothing). Runs FIRST, before a name step or any
 * check that can stop the sheet, so an abandoned checkout leaves no coach row.
 * Called ONLY when appleSignUpUnfinished(await freshUser()): on a finished coach it
 * would delete a real coach row. Throws { code: 'trainer_in_use' | 'unauthorized' |
 * 'sign_up_failed' }.
 */
export async function claimAthleteRole() {
  const { error, status } = await supabase.rpc('claim_athlete_role');
  if (!error) return;
  if (status === 401) throw Object.assign(new Error(SIGNED_OUT_SENTENCE), { code: 'unauthorized' });
  if (String(error.message ?? '').includes('trainer_in_use')) throw Object.assign(new Error(TRAINER_IN_USE), { code: 'trainer_in_use' });
  throw Object.assign(new Error(SIGN_UP_FAILED), { code: 'sign_up_failed' });
}

/**
 * Step 2, after claimAthleteRole(): role 'client' in metadata, plus the name the
 * person typed when Apple gave none. Throws { code: 'unauthorized' | 'sign_up_failed' }.
 */
export async function finishAthleteSignUp({ name = '' } = {}) {
  const clean = cleanName(name);
  const { error } = await supabase.auth.updateUser({ data: { role: 'client', ...(clean ? { name: clean } : {}) } });
  if (error) {
    const unauthorized = error.status === 401;
    throw Object.assign(new Error(unauthorized ? SIGNED_OUT_SENTENCE : SIGN_UP_FAILED), { code: unauthorized ? 'unauthorized' : 'sign_up_failed' });
  }
}

/**
 * /founding (2026-10-25): finish an account as a COACH, the way the iOS app's
 * AuthService.claimRole(.trainer) does it: the caller's own trainers row when it
 * is missing (RLS trainers_insert_own: id = auth.uid()), then role 'trainer' in
 * metadata. Called ONLY when founding.js accountStep() says 'finish' (never on an
 * athlete account), and ONLY for this tab's own session (a code typed here, this
 * tab's Apple return) or after the person tapped Continue as a coach under
 * "Signed in as …" (review 2026-10-25: a role-less session someone left in the
 * browser was made a coach on page load). A /founding email sign-up has no
 * trainers row (fitlink-app 20261025110000 handle_new_user skips
 * signup 'founding_web'), so this is where the coach card is first made: after
 * the code was verified. `user` is freshUser()'s answer. Throws
 * { code: 'unauthorized' | 'finish_failed' }.
 */
export async function finishCoachSignUp(user) {
  const fail = (status) => {
    const unauthorized = status === 401 || status === 403;
    return Object.assign(new Error(unauthorized ? SIGNED_OUT_SENTENCE : FOUNDING_FINISH_FAILED), { code: unauthorized ? 'unauthorized' : 'finish_failed' });
  };
  const have = await supabase.from('trainers').select('id').eq('id', user.id).limit(1);
  if (have.error) throw fail(have.status);
  if (!have.data?.length) {
    const ins = await supabase.from('trainers').insert({ id: user.id, name: metadataName(user), email: user.email ?? '' });
    // 23505: made meanwhile (another tab), which is what was wanted.
    if (ins.error && ins.error.code !== '23505') throw fail(ins.status);
  }
  const { error } = await supabase.auth.updateUser({ data: { role: 'trainer' } });
  if (error) throw fail(error.status);
}

/**
 * The public Founding counter: founding_slots() (anon; fitlink-app migration
 * 20261025110000) → parseSlots()'s `{ taken, total, closesOn, open }`. Throws on
 * a failed read or an answer of another shape: the page then shows no number.
 */
export async function foundingSlots() {
  const { data, error } = await supabase.rpc('founding_slots');
  if (error) throw error;
  const slots = parseSlots(data);
  if (!slots) throw new Error('founding_slots answered an unexpected shape');
  return slots;
}

/**
 * The signed-in coach's own Founding application (RLS: own row only), or null.
 * `{ row, open }`: `open` is false when the table is not on the server yet (the
 * migration lands after this page), so the page can say applications aren't
 * open instead of failing. Any other failed read throws `{ status, code }`.
 */
export async function myFoundingApplication(uid) {
  const { data, error, status } = await supabase.from('founding_applications').select('*').eq('user_id', uid).limit(1);
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205' || status === 404) return { row: null, open: false };
    throw Object.assign(new Error(error.message || 'read failed'), { status: Number(status) || 0, code: status === 401 ? 'unauthorized' : error.code ?? null });
  }
  return { row: data?.[0] ?? null, open: true };
}

/**
 * apply_founding: the caller's own application (it takes no slot; the operator
 * grants one after the setup call). `params` is founding.js checkAnswers()'s.
 * Never throws: `{ data, error, status }` for applyRefusal() to word.
 */
export async function applyFounding(params) {
  try {
    const { data, error, status } = await supabase.rpc('apply_founding', params);
    return { data: data ?? null, error: error ?? null, status: Number(status) || 0 };
  } catch (e) {
    return { data: null, error: { message: String(e?.message ?? e) }, status: 0 };
  }
}

/**
 * Whether a coach holds a Founding grant: trainers_public.founding_member
 * (anon-readable; true once the operator granted it, kept on suspension). A
 * read that fails, a missing row, or the column not being there yet (before the
 * migration) all answer false: a badge shows only when the server says so.
 */
export async function foundingMember(trainerId) {
  if (!trainerId) return false;
  try {
    const { data, error } = await supabase.from('trainers_public').select('founding_member').eq('id', trainerId).limit(1);
    if (error) return false;
    return data?.[0]?.founding_member === true;
  } catch {
    return false;
  }
}

/** Remember, in this tab only, that Sign in with Apple was started on /founding. false when the browser refuses. */
export function parkFoundingReturn() {
  try { window.sessionStorage.setItem(FOUNDING_RETURN_KEY, foundingReturnValue()); return true; } catch { return false; }
}
/** Read and forget it: when this tab started Sign in with Apple on /founding (ms), or null. */
export function takeFoundingReturn() {
  let raw = null;
  try { raw = window.sessionStorage.getItem(FOUNDING_RETURN_KEY); window.sessionStorage.removeItem(FOUNDING_RETURN_KEY); } catch { /* none */ }
  return readFoundingReturn(raw);
}
export function clearFoundingReturn() { try { window.sessionStorage.removeItem(FOUNDING_RETURN_KEY); } catch { /* none */ } }

/** Remember, in this tab only, which pass an Apple sign-in started from. false when the browser refuses. */
export function parkCheckout({ code = null, handle = null, planId, name }) {
  const value = parkedCheckoutValue({ code, handle, planId, name });
  if (!value) return false;
  try { window.sessionStorage.setItem(CHECKOUT_RETURN_KEY, value); return true; } catch { return false; }
}
/** Read and forget the parked checkout: { code, handle, planId, name } (one of code / handle) or null. */
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** `{ planId }` for the pass being bought, when it is a plan id (else nothing is sent). */
const planField = (planId) => (UUID.test(String(planId ?? '')) ? { planId: String(planId) } : {});

/**
 * What joining this coach would end, changing nothing: `{ preview: true,
 * kind, newCoach: {id, name}, currentCoach: {id, name} | null, needsSwitch,
 * needsConfirmation, passesEnding: [{ line, … }], refund: 'none' }`.
 *
 * `planId` (fitlink-app launch/4-blocks, review 2026-10-25): the pass this join
 * is for. The server then refuses, before it ends anything, a plan
 * create-subscription would refuse (plan_archived, plan_unpriced,
 * below_minimum, session_over, block_closed, block_not_open, a session about
 * to start), in create-subscription's sentence plus "Nothing was changed.".
 */
export function previewInvite(code, { planId = null } = {}) {
  return athleteExit({ action: 'accept_invite', code, ...planField(planId), preview: true });
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
export function acceptInvite(code, { confirm = false, planId = null } = {}) {
  return athleteExit({ action: 'accept_invite', code, ...planField(planId), ...(confirm ? { confirm: true } : {}) });
}

/**
 * The pass as the server has it now, read right before a confirm that can end
 * another pass: the row, `null` when it is gone or archived (no longer for
 * sale), and a failed read throws.
 */
export async function planNow(planId) {
  const { data, error } = await supabase.from('plans').select('*').eq('id', planId).limit(1);
  if (error) throw error;
  const row = data?.[0] ?? null;
  return row && !row.archived_at ? row : null;
}

/**
 * create-subscription. 200 answers: `{ clientSecret, customerId,
 * subscriptionId, amountCents?, bookingFeeCents?, seasonPayments? }` (a payment
 * to confirm; `seasonPayments` is how many payments this purchase makes: a
 * block's P, a dated block's count from now, 1 for a session, absent for an
 * open pass), `{ alreadyActive: true, subscriptionId, customerId }`, or the
 * same pass owed: `{ clientSecret, …, payingOpenInvoice: true, amountDueCents }`.
 * A refusal throws `{ status, code, message }`: 400 bad_request /
 * payouts_not_ready, 403 athlete_only, 404 plan_not_found / coach_not_found,
 * 409 plan_archived / plan_unpriced / below_minimum / cannot_coach_yourself /
 * live_subscription / roster_full / payment_processing / session_over /
 * block_closed / block_not_open (blocks, 2026-10-25: each sentence ends "You
 * haven't been charged."), 502 stripe_error, 500 db_error.
 */
export async function createSubscription(planId, clientId, { fromPage = false, pageSession = null } = {}) {
  // A purchase started on a coach page (/c/<handle>) says so (fitlink-app 20261025130000: create-subscription stamps
  // the subscription, and the server records `paid` for the page's funnel after the grant). Analytics only: the
  // server never lets it change who is paid or what is charged.
  const page = fromPage ? { source: 'coach_page', ...(isSessionKey(pageSession) ? { pageSession } : {}) } : {};
  const { data, error } = await supabase.functions.invoke('create-subscription', { body: { planId, clientId, ...page } });
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
export const NETWORK_SENTENCE = `We couldn’t reach ${BRAND_NAME}. Check your connection and try again.`;
/** Shown when an answer came back with no sentence in it (a gateway's HTML page, a timeout). */
export const NO_ANSWER_SENTENCE = `${BRAND_NAME} didn’t send a readable answer. Try again in a moment.`;
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

// ── Blocks and single sessions (fitlink-app migration 20261025120000) ──────────

/**
 * The coach's own cancellation policy as anyone reads it (trainers_public.cancellation_policy): a string, or null when
 * none is written. Before the migration the column is missing (42703): null as well. Any other failed read throws.
 */
export async function coachCancellationPolicy(coachId) {
  const { data, error } = await supabase.from('trainers_public').select('cancellation_policy').eq('id', coachId).limit(1);
  if (error?.code === '42703') return null;
  if (error) throw error;
  const v = data?.[0]?.cancellation_policy;
  return typeof v === 'string' && v.trim() ? v : null;
}

/**
 * The signed-in coach's own policy (trainers, their own row): `{ policy, available }`; `available` false before the
 * migration (42703). A failed read throws.
 */
export async function myCancellationPolicy(uid) {
  const { data, error } = await supabase.from('trainers').select('cancellation_policy').eq('id', uid).limit(1);
  if (error?.code === '42703') return { policy: '', available: false };
  if (error) throw error;
  return { policy: typeof data?.[0]?.cancellation_policy === 'string' ? data[0].cancellation_policy : '', available: true };
}

/**
 * Save the coach's policy on their own row (trainers_update_own; the server's CHECK keeps it to 600 characters and
 * sync_trainer_public copies it to the public table). An empty text clears it. Returns the error or null; the row
 * must come back, so a write the server did not make is never reported as saved.
 */
export async function saveCancellationPolicy(uid, text) {
  const value = String(text ?? '').trim();
  const { data, error } = await supabase.from('trainers').update({ cancellation_policy: value || null }).eq('id', uid).select('cancellation_policy');
  if (error) return error;
  if (!data?.length) return { code: 'no_row', message: 'not saved' };
  return null;
}

/** Insert a new pass (plans_insert: the coach's own trainer_id). Answers `{ plan }` or `{ error }`. */
export async function createPass(row) {
  const { data, error } = await supabase.from('plans').insert(row).select('*');
  if (error) return { error };
  if (!data?.length) return { error: { code: 'no_row', message: 'not saved' } };
  return { plan: data[0] };
}

/** Change a pass's details (plans_update: the coach's own). Answers `{ plan }` or `{ error }`. */
export async function updatePass(planId, patch) {
  const { data, error } = await supabase.from('plans').update(patch).eq('id', planId).select('*');
  if (error) return { error };
  if (!data?.length) return { error: { code: 'no_row', message: 'not saved' } };
  return { plan: data[0] };
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

// ── The coach's money (fee engine, fitlink-app migration 20261025100000) ──────

/**
 * coach_fee_terms(): the signed-in coach's own tier, fee, paying athletes vs cap,
 * read-only state, web / App Store Elite and Founding dates (shape in coachMoney.js).
 * Throws `{ code, message }`: `not_deployed` (the function is not on the server
 * yet), `unauthorized` (session gone), `not_a_coach`, else a read failure.
 */
export async function coachFeeTerms() {
  const { data, error, status } = await supabase.rpc('coach_fee_terms');
  if (!error && data && typeof data === 'object') return data;
  const code = error?.code === 'PGRST202' || error?.code === '42883' ? 'not_deployed'
    : status === 401 ? 'unauthorized'
      : error?.code === 'P0002' ? 'not_a_coach'
        : 'read_failed';
  const message = code === 'not_deployed' ? 'Coach Elite on the web isn’t available yet.'
    : code === 'unauthorized' ? SIGNED_OUT_SENTENCE
      : code === 'not_a_coach' ? 'This account has no coach profile.'
        : status === 0 ? `We couldn’t reach ${BRAND_NAME} to load your plan. Check your connection, then check again.`
          : 'We couldn’t load your plan right now. Check again in a moment.';
  throw Object.assign(new Error(message), { code, status: Number(status) || 0 });
}

/**
 * elite-checkout: opens a Stripe Checkout Session for Coach Elite on the web. The body
 * names an interval (`month` | `year`) and the source, never a price or a coach.
 * Answers `{ url, sessionId, firstChargeAt?, reused? }`; a refusal throws `{ status,
 * code, message }` with the server's sentence (coach_only, already_elite,
 * already_elite_app_store, founding_active, elite_payment_due, checkout_in_progress,
 * not_configured, rate_limited, stripe_error, db_error).
 */
export async function startEliteCheckout(interval) {
  const body = { interval: interval === 'year' ? 'year' : 'month', source: 'web' };
  const { data, error } = await supabase.functions.invoke('elite-checkout', { body });
  if (error) throw refusal(await functionError(error));
  return data ?? {};
}

const PAYMENT_BASE = 'id, created_at, client_id, plan_id, amount, currency, status';
const PAYMENT_FEES = 'gross_cents, platform_fee_cents, booking_fee_cents, dispute_fee_cents, coach_net_cents, fee_bps, tier_at_charge';
export const EARNINGS_LIMIT = 500;

/**
 * What the coach may read for /coach/earnings, as the coach (RLS: payments,
 * pass_refunds and payment_disputes rows whose trainer_id is theirs; clients on their
 * roster; plans are public). Throws when payments or refunds can't be read; the names,
 * passes and disputes are best effort and say so (`namesFailed`, `disputes: null`).
 * Before the fee engine's migration the fee columns don't exist (42703): every row is
 * then read without them and shows no breakdown.
 */
export async function earningsData(uid) {
  let pay = await supabase.from('payments').select(`${PAYMENT_BASE}, ${PAYMENT_FEES}`)
    .eq('trainer_id', uid).in('status', ['succeeded', 'refunded']).order('created_at', { ascending: false }).limit(EARNINGS_LIMIT);
  if (pay.error?.code === '42703') {
    pay = await supabase.from('payments').select(PAYMENT_BASE)
      .eq('trainer_id', uid).in('status', ['succeeded', 'refunded']).order('created_at', { ascending: false }).limit(EARNINGS_LIMIT);
  }
  if (pay.error) throw earningsError(pay.status);
  const ref = await supabase.from('pass_refunds').select('id, created_at, client_id, plan_id, amount_cents, currency, reason')
    .eq('trainer_id', uid).order('created_at', { ascending: false }).limit(EARNINGS_LIMIT);
  if (ref.error) throw earningsError(ref.status);
  const payments = pay.data ?? [];
  const refunds = ref.data ?? [];

  const clientIds = [...new Set([...payments, ...refunds].map((r) => r.client_id).filter(Boolean))];
  const planIds = [...new Set([...payments, ...refunds].map((r) => r.plan_id).filter(Boolean))];
  const [cl, pl, disp] = await Promise.all([
    clientIds.length ? supabase.from('clients').select('id, name').in('id', clientIds) : Promise.resolve({ data: [] }),
    planIds.length ? supabase.from('plans').select('id, name').in('id', planIds) : Promise.resolve({ data: [] }),
    supabase.from('payment_disputes').select('id, status, amount_cents, currency, created_at, updated_at').eq('trainer_id', uid).order('created_at', { ascending: false }).limit(EARNINGS_LIMIT),
  ]);
  const names = Object.fromEntries((cl.data ?? []).map((c) => [c.id, c.name]));
  const passes = Object.fromEntries((pl.data ?? []).map((p) => [p.id, p.name]));
  return {
    payments,
    refunds,
    names,
    passes,
    namesFailed: Boolean(cl.error || pl.error),
    disputes: disp.error ? null : (disp.data ?? []),
    truncated: payments.length >= EARNINGS_LIMIT || refunds.length >= EARNINGS_LIMIT,
  };
}

function earningsError(httpStatus) {
  const status = Number(httpStatus) || 0;
  const message = status === 401 ? SIGNED_OUT_SENTENCE
    : status === 0 ? `We couldn’t reach ${BRAND_NAME} to load your earnings. Check your connection, then try again.`
      : 'We couldn’t load your earnings right now. Try again in a moment.';
  return Object.assign(new Error(message), { status, code: status === 401 ? 'unauthorized' : 'read_failed' });
}

// ── The coach page, /c/<handle> (fitlink-app migration 20261025130000) ────────

/** An RPC failure as `{ code, message, status }`: rate_limited (P0001), not_deployed (PGRST202), unauthorized, network. */
function rpcError(error, status, fallback) {
  const st = Number(status) || 0;
  const msg = String(error?.message ?? '');
  const code = error?.code === 'PGRST202' || error?.code === '42883' ? 'not_deployed'
    : st === 401 ? 'unauthorized'
      : error?.code === 'P0001' && msg ? msg
        : st === 0 ? 'network' : 'failed';
  const message = code === 'not_deployed' ? 'Coach pages aren’t available on the server yet.'
    : code === 'unauthorized' ? SIGNED_OUT_SENTENCE
      : error?.code === 'P0001' && typeof error?.hint === 'string' && error.hint ? error.hint
        : code === 'network' ? NETWORK_SENTENCE : fallback;
  return Object.assign(new Error(message), { code, status: st });
}

/** coach_page(p_handle) (anon): the page's one read. Throws `{ code, message }` (rate_limited, network, failed…). */
export async function coachPage(handle) {
  const { data, error, status } = await supabase.rpc('coach_page', { p_handle: handle });
  if (error) throw rpcError(error, status, `${BRAND_NAME} couldn’t load this page right now. Try again in a moment.`);
  return data;
}

/**
 * page_invite(p_handle) (signed in): the coach's standing invite code, for athlete-exit. Only after the person acted
 * (their own sign-in, or Continue under "Signed in as …"): the server renews or makes the coach's link. Answers
 * `{ ok: true, invite_code }` | `{ ok: false, code, error }` (never raised); a transport failure throws.
 */
export async function pageInvite(handle) {
  const { data, error, status } = await supabase.rpc('page_invite', { p_handle: handle });
  if (error) throw rpcError(error, status, `${BRAND_NAME} couldn’t open checkout for this page. Nothing was changed. Try again in a moment.`);
  return data;
}

/** log_page_event: fire and forget. Never awaited by a page, never throws, never logs the event. */
export function logPageEvent(params) {
  if (!params) return;
  try {
    Promise.resolve(supabase.rpc('log_page_event', params)).then(() => {}, () => {});
  } catch { /* the funnel never stops the page */ }
}

/** The signed-in coach's own handle (trainers.handle): a string, null (none), or throws (`not_deployed` before the migration). */
export async function myHandle(uid) {
  const { data, error, status } = await supabase.from('trainers').select('handle').eq('id', uid).limit(1);
  if (error) {
    if (error.code === '42703') throw Object.assign(new Error('Coach pages aren’t available on the server yet.'), { code: 'not_deployed' });
    throw rpcError(error, status, 'We couldn’t load your page’s name right now. Check again in a moment.');
  }
  return typeof data?.[0]?.handle === 'string' ? data[0].handle : null;
}

/**
 * set_handle(p_handle): `{ ok: true, handle, previous, changed, path }` | `{ ok: false, code, error }` (the server
 * never raises a refusal). A transport failure throws (`outcomeUnknown` when the call may have run).
 */
export async function setHandle(handle) {
  const { data, error, status } = await supabase.rpc('set_handle', { p_handle: handle });
  if (error) {
    const e = rpcError(error, status, `${BRAND_NAME} didn’t answer clearly.`);
    e.outcomeUnknown = e.code === 'network' || (Number(status) || 0) >= 500;
    throw e;
  }
  return data;
}

/** my_page_stats(p_days): the coach's own funnel. Throws `{ code, message }` (rate_limited, not_a_coach, not_deployed…). */
export async function myPageStats(days = 30) {
  const { data, error, status } = await supabase.rpc('my_page_stats', { p_days: days });
  if (error) throw rpcError(error, status, 'We couldn’t load your page’s numbers right now. Try again in a moment.');
  return data;
}

// ── The operator dashboard (/admin; fitlink-app migration 20261025140000, launch plan Sprint 1 PR 6) ──
// Three reads; the server decides who may read them (`platform_admins`): anyone else gets `not_admin`. Every failure
// throws `{ code, message }`: not_admin, rate_limited (the server's HINT), unauthorized, not_deployed, network, failed.

export const ADMIN_LOAD_FAILED = 'We couldn’t load these numbers right now. Check again in a moment.';

function adminRpcError(error, status) {
  const st = Number(status) || 0;
  const msg = String(error?.message ?? '');
  const hint = typeof error?.hint === 'string' && error.hint ? error.hint : null;
  if (error?.code === 'PGRST202' || error?.code === '42883') {
    return Object.assign(new Error('The dashboard isn’t on the server yet.'), { code: 'not_deployed', status: st });
  }
  if (error?.code === 'P0001' && msg === 'not_admin') {
    return Object.assign(new Error(hint ?? 'This account isn’t an operator account.'), { code: 'not_admin', status: st });
  }
  if (error?.code === 'P0001' && msg === 'rate_limited') {
    return Object.assign(new Error(hint ?? 'Too many dashboard reads. Try again in an hour.'), { code: 'rate_limited', status: st });
  }
  if (st === 401) return Object.assign(new Error(SIGNED_OUT_SENTENCE), { code: 'unauthorized', status: st });
  if (st === 0) return Object.assign(new Error(NETWORK_SENTENCE), { code: 'network', status: st });
  return Object.assign(new Error(ADMIN_LOAD_FAILED), { code: 'failed', status: st });
}

async function adminRpc(name, args) {
  let res;
  try { res = await supabase.rpc(name, args); } catch { throw adminRpcError(null, 0); }
  const { data, error, status } = res;
  if (error) throw adminRpcError(error, status);
  if (!data || typeof data !== 'object') throw adminRpcError(null, status || 500);
  return data;
}

/** admin_scorecard(p_month): the five numbers for one UTC month ('YYYY-MM-01'; null = this month) and the month before. */
export function adminScorecard(month = null) {
  return adminRpc('admin_scorecard', { p_month: month });
}

/** admin_coaches(p_days): one row per coach with a page, a paid payment or a page visit in the window. */
export function adminCoaches(days = 30) {
  return adminRpc('admin_coaches', { p_days: days });
}

/** admin_page_funnel(p_days): platform-wide sessions per stage with drop-off, top referrers and UTM sources. */
export function adminPageFunnel(days = 30) {
  return adminRpc('admin_page_funnel', { p_days: days });
}
