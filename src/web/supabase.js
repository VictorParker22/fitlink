// One Supabase client for the coach-led web pages (public coach page, the
// season editor). The publishable key is public by design; the fallbacks
// let a fresh checkout run without a .env. Everything that matters is
// enforced on the server (RLS, definer RPCs, edge functions).
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qcmtaskhyhwzyoegtfpw.supabase.co';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_IxZ1QUlo0for6NcOQvf-xw_D0-vmrXL';
export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// PKCE (2026-10-21): a session is made in this browser only by a flow this
// browser started (the code verifier lives in localStorage under
// `fitlink-web-code-verifier`) or by a six-digit code typed here; tokens in a
// URL are ignored (they used to sign the visitor into whoever's tokens they
// were). The code exchange runs once, here, at import (detectSessionInUrl);
// pages await getSession()/initialize() and never call exchangeCodeForSession
// themselves.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'fitlink-web' },
});

export const APP_SCHEME = 'fitlink://';
export const WEB_ORIGIN = 'https://fitlink.coach';
