// The project's public address and publishable key, used when the build carries no VITE_SUPABASE_* env (a fresh
// checkout) — by the browser client (supabase.js) and by the Vercel function that renders a coach page's link-preview
// tags (api/coach-meta.js). The publishable key is public by design; everything that matters is enforced on the server.
export const DEFAULT_SUPABASE_URL = 'https://qcmtaskhyhwzyoegtfpw.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_IxZ1QUlo0for6NcOQvf-xw_D0-vmrXL';
