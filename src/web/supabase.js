// One Supabase client for the coach-led web pages (public coach page, the
// season editor). The publishable key is public by design; the fallbacks
// let a fresh checkout run without a .env. Everything that matters is
// enforced on the server (RLS, definer RPCs, edge functions).
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qcmtaskhyhwzyoegtfpw.supabase.co';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_IxZ1QUlo0for6NcOQvf-xw_D0-vmrXL';
export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'fitlink-web' },
});

export const APP_SCHEME = 'fitlink://';
export const WEB_ORIGIN = 'https://fitlink.coach';
