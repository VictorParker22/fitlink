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

export async function acceptInvite(code, confirmSwitch = false) {
  const { data, error } = await supabase.rpc('accept_invite', { p_code: code, p_confirm_switch: confirmSwitch });
  if (error) throw error;
  return data;
}

/** create-subscription: `{ clientSecret, customerId }` or `{ alreadyActive: true }`. */
export async function createSubscription(planId, clientId) {
  const { data, error } = await supabase.functions.invoke('create-subscription', { body: { planId, clientId } });
  if (error) {
    const msg = await functionErrorMessage(error);
    throw new Error(msg);
  }
  return data;
}

export async function confirmSubscription(clientId) {
  const { data, error } = await supabase.functions.invoke('confirm-subscription', { body: { clientId } });
  if (error) throw new Error(await functionErrorMessage(error));
  return data;
}

/**
 * An edge function's refusal as `{ status, code, message }`. supabase-js wraps
 * a non-2xx answer in a FunctionsHttpError whose `context` is the Response;
 * the body is our `{ error, code? }` shape, and a 429 from guardRate has no
 * body worth showing.
 */
export async function functionError(error) {
  const status = Number(error?.context?.status) || 0;
  let code = null;
  let message = null;
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.json();
      if (body?.error) message = String(body.error);
      if (body?.code) code = String(body.code);
    }
  } catch { /* fall through */ }
  return { status, code, message: message || error?.message || 'Something went wrong.' };
}

async function functionErrorMessage(error) {
  return (await functionError(error)).message;
}

/** coach | athlete | none for the signed-in user; null when signed out. */
export async function myRole() {
  const s = await session();
  if (!s) return null;
  const { data: t } = await supabase.from('trainers').select('id').eq('id', s.user.id).limit(1);
  if (t?.length) return 'coach';
  const { data: c } = await supabase.from('clients').select('id').eq('auth_user_id', s.user.id).limit(1);
  return c?.length ? 'athlete' : 'none';
}

function refusal(e) {
  return Object.assign(new Error(e.message), { status: e.status, code: e.code });
}

/**
 * delete-trainer-account {preview: true}: `{ athletes, placeholders,
 * subscriptions, refunds: [{clientId, passName, cents}], refundCentsTotal,
 * currency, refundsAlreadyIssued }`. Reads only; 3 per hour per coach.
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
 * The athlete's own deletion: files first (delete-account-media, best effort
 * and reported), then the delete_client_account RPC, which removes the
 * clients row (its children cascade) and the auth user.
 */
export async function deleteAthleteAccount() {
  const mediaIncomplete = await supabase.functions.invoke('delete-account-media', { body: {} })
    .then(({ data, error }) => Boolean(error) || data?.success === false)
    .catch(() => true);
  const { error } = await supabase.rpc('delete_client_account');
  if (error) throw new Error(error.message || 'Couldn’t delete the account.');
  await signOutLocal();
  return { mediaIncomplete };
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
