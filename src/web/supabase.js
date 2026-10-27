// One Supabase client for the coach-led web pages (public coach page, the
// season editor). The publishable key is public by design; the fallbacks
// let a fresh checkout run without a .env. Everything that matters is
// enforced on the server (RLS, definer RPCs, edge functions).
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_SUPABASE_KEY, DEFAULT_SUPABASE_URL } from './supabaseDefaults';
import { APP_SCHEME as BRAND_APP_SCHEME, SITE_ORIGIN } from './site/brand.js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_KEY;
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

/** brand.js holds the scheme; re-exported here for the pages that already import it from this module. */
export const APP_SCHEME = BRAND_APP_SCHEME;
export const WEB_ORIGIN = SITE_ORIGIN;
