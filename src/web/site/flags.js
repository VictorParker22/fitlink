// Build flags for the marketing pages (launch plan W3, 2026-10-25). Read at build time; `import.meta.env` is
// undefined under node --test, hence the `?? {}`.
//
// VITE_APP_STORE_LIVE=on: the iPhone app is public on the App Store. Until then no page links to the App Store (the
// app page would not exist for a visitor) and every "get the app" call to action is the Founding one instead.
export const APP_STORE_LIVE = (import.meta.env ?? {}).VITE_APP_STORE_LIVE === 'on';

/** The coaches' call to action while Founding is open (or its state is still loading or unknown): the Founding offer. */
export const FOUNDING_CTA = 'Claim a Founding spot';
/** The same call to action once Founding is full or closed (owner decision R4): /founding is then the coach sign-up. */
export const JOIN_CTA = 'Join as a coach';
export const FOUNDING_PATH = '/founding';
