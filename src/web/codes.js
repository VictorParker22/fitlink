// Invite codes, shared by the pages and the pure sign-in helpers (appleAuth.js),
// so `node --test` can import it without the Supabase client.

/** Upper-case, letters and digits only, six of them; null otherwise. */
export function normalizeCode(value) {
  const code = String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  return code.length === 6 ? code : null;
}
