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

/** A coach's passes, cheapest first. Readable by anyone (plans_select). */
export async function plansFor(trainerId) {
  const { data, error } = await supabase.from('plans').select('*').eq('trainer_id', trainerId).order('price');
  if (error) throw error;
  return data ?? [];
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

async function functionErrorMessage(error) {
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.json();
      if (body?.error) return String(body.error);
    }
  } catch { /* fall through */ }
  return error?.message || 'Something went wrong.';
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
