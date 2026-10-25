// A coach page's public name, /c/<handle> (launch plan Sprint 1 PR 3, 2026-10-25; fitlink-app migration
// 20261025130000, `_shared/handles.ts`). Pure: `node --test src/web/coachPage.test.js` imports it, and so does
// appleAuth.js (the parked checkout of a coach page).
//
// The server decides (set_handle, coach_page): it normalises the same way (cut at 64 characters, trim spaces, lower
// case, drop ONE leading '@') and rewrites nothing else. This file is the same rule for instant feedback in the
// dashboard field and for reading the route's parameter; it does not know the reserved words (the operator adds rows
// the web never sees), so a well-formed handle can still be refused as "That name isn't available.".

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 30;
const HANDLE_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

/** public.handle_normalize: cut at 64, trim spaces, lower case, one leading '@' dropped; null when nothing is left. */
export function normalizeHandle(raw) {
  if (typeof raw !== 'string') return null;
  const cut = Array.from(raw).slice(0, 64).join('');
  const out = cut.replace(/^ +| +$/g, '').toLowerCase().replace(/^@/, '');
  return out === '' ? null : out;
}

/** The format rule (3..30 of a-z 0-9 -, a letter or digit at each end, no '--'): true when a normalised handle meets it. */
export function handleWellFormed(h) {
  return typeof h === 'string' && h.length >= HANDLE_MIN && h.length <= HANDLE_MAX && HANDLE_RE.test(h) && !h.includes('--');
}

/** A handle a page could exist under (normalised and well formed), else null. */
export function pageHandle(raw) {
  const h = normalizeHandle(raw);
  return handleWellFormed(h) ? h : null;
}

/**
 * What the dashboard field holds as the coach types: lower case, the leading '@' and spaces at the ends gone, nothing
 * else rewritten (a space or an underscore stays, so the hint can say why it is refused). At most 64 characters.
 */
export function handleFieldValue(raw) {
  return Array.from(String(raw ?? '')).slice(0, 64).join('').toLowerCase().replace(/^ +/, '').replace(/^@/, '');
}

/** The hint under the field for a value the server would refuse on format alone, or null. Never about availability. */
export function handleHint(raw) {
  const h = normalizeHandle(raw);
  if (h === null) return null;
  if (h.length < HANDLE_MIN) return `At least ${HANDLE_MIN} characters.`;
  if (h.length > HANDLE_MAX) return `At most ${HANDLE_MAX} characters.`;
  if (/[^a-z0-9-]/.test(h)) return 'Use only letters, digits and hyphens (no spaces or underscores).';
  if (!/^[a-z0-9]/.test(h) || !/[a-z0-9]$/.test(h)) return 'Start and end with a letter or a digit.';
  if (h.includes('--')) return 'No two hyphens in a row.';
  return null;
}
