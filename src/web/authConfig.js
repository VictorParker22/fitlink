// Whether this build offers Sign in with Apple. Off until the owner has done
// OWNER_APPLE_WEB.md (Services ID, key, client secret, Supabase Client IDs
// "fitlink.app.web,fitlink.app") and set VITE_APPLE_WEB_SIGN_IN=on for the
// Vercel build: before that, Supabase answers the start of the flow with a raw
// 400 JSON page on supabase.co. `import.meta.env` is undefined under node --test.
export const APPLE_WEB_ENABLED = (import.meta.env ?? {}).VITE_APPLE_WEB_SIGN_IN === 'on';
