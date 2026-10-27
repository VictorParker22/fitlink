// GET /api/geo → { country }: the visitor's country as Vercel's edge reads it from their address
// (x-vercel-ip-country, two letters), or null when Vercel names none. The website offers Coach Elite only in the
// United States (owner, 2026-10-27; src/web/eliteRegion.js). A VPN gets round it; the Terms say web Elite is for
// coaches in the United States. Never cached: the answer belongs to the address that asked.

/** The two-letter country Vercel put on the request, upper case, else null. */
export function countryOf(headers) {
  const raw = headers?.['x-vercel-ip-country'];
  const v = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  return /^[A-Z]{2}$/.test(v) ? v : null;
}

export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.end(JSON.stringify({ country: countryOf(req.headers) }));
}
