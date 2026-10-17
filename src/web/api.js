// Typed-ish wrappers over the edge functions and tables the web pages use.
// The server identifies the caller from the session's JWT; the page only
// ever sends ids (invite code, plan id, client id), never a price or a payee.
import { supabase, SUPABASE_KEY, FUNCTIONS_URL } from './supabase';

/** Upper-case, letters and digits only, six of them. */
export function normalizeCode(value) {
  const code = String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  return code.length === 6 ? code : null;
}

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

/** Drops the browser's session without calling the server (the user may already be gone). */
export async function signOutLocal() {
  try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* the session is gone either way */ }
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
