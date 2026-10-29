// Where the website offers Coach Elite (owner, 2026-10-27): the United States only, by the visitor's address as
// Vercel reads it (api/geo.js). The app sells Elite through the App Store everywhere, so outside the US the dashboard
// and /pricing point to the app instead of Stripe. A VPN gets round this; a billing-address check at Stripe is the
// firmer step if it is ever needed. A coach who already has web Elite still sees it and its manage link anywhere.

export const WEB_ELITE_COUNTRIES = new Set(['US']);

/** Whether the website may offer Elite to a visitor in `country` (two letters, or null when unknown). */
export function webEliteOffered(country) {
  return WEB_ELITE_COUNTRIES.has(country);
}

/** The sentence shown in place of the web offer outside the US. */
export function eliteElsewhereWords(brand) {
  return `Coach Elite on the website is for coaches in the United States. Elsewhere, subscribe in the ${brand} app.`;
}

let asked = null;

/** The visitor's country from /api/geo, read once per page load; null when it can't be read (never retried). */
export function readCountry(fetchImpl = globalThis.fetch) {
  if (!asked) {
    asked = Promise.resolve()
      .then(() => fetchImpl('/api/geo', { headers: { Accept: 'application/json' } }))
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => (typeof body?.country === 'string' && /^[A-Z]{2}$/.test(body.country) ? body.country : null))
      .catch(() => null);
  }
  return asked;
}

/** Forgets the read country (tests). */
export function forgetCountry() {
  asked = null;
}
