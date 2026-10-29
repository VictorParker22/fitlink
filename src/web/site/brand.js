// The brand, in ONE file (launch plan W1, 2026-10-25). Every page, the index.html head, the PWA manifest
// (vite.config.js reads this file at build time), the legal text, the sign-in sentences (appleAuth.js) and the coach
// page's link previews take the product's name, domain, mailbox and App Store address from here. The rename (launch
// plan Track A) changes this file and regenerates the share image (`node scripts/og-image.mjs`), nothing else on
// the website.
//
// Pure ES module with no imports: Vite's config, the Vercel function `api/coach-meta` and `node --test` read it too.

/** The product's name as people read it (Benchside since 2026-10-29; FitLink before). */
export const BRAND_NAME = 'Benchside';
/** The name the product had until October 2026: the legal pages say the two are one service. */
export const FORMER_NAME = 'FitLink';
/** The one-letter mark (the share-image script's fallback; the header draws the wordmark SVG). */
export const BRAND_MARK = 'b';
/** Who runs the Founding setup calls and writes to applicants (no email provider sends anything). */
export const FOUNDER_FIRST_NAME = 'Victor';

/**
 * The site's public host: coach pages are `${SITE_HOST}/c/<handle>` (the dashboard's preview, the copied link, the
 * link previews' og:url), and Sign in with Apple is offered only on `SITE_ORIGIN`. The rename may move the domain;
 * change it here, and the AASA file / Apple Services ID return URLs with it (an owner step, not this file).
 */
export const SITE_HOST = 'benchside.coach';
export const SITE_ORIGIN = `https://${SITE_HOST}`;

/** The mailbox the site publishes (Victor set it up 2026-10-28; the iOS pack still names the old one). */
export const SUPPORT_EMAIL = 'hello@benchside.coach';
/** The brand's Instagram, linked from the footer. */
export const INSTAGRAM_URL = 'https://www.instagram.com/benchside.coach/';
/** The operator named in the Terms, the Privacy Policy and the footer (HANDOFF 2026-10-29). */
export const LEGAL_ENTITY = 'ORYNTLabs LLC';
export const LEGAL_ENTITY_STATE = 'New Jersey';

/** App Store Connect's app id: the rename makes a NEW App Store Connect record (decision L2), so a new id. */
export const APP_STORE_ID = '6779058450';
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;
/** The iOS app's URL scheme (invite hand-off from the web, "Open the app"). Changes with the bundle id. */
export const APP_SCHEME = 'fitlink://';

/** The PWA manifest's one-line description and the theme colour (the Benchside canvas). */
export const APP_DESCRIPTION = 'The app that runs an independent coach’s business: passes, programs, check-ins and payouts.';
export const THEME_COLOR = '#F4F4F2';

/**
 * The share image for the site's own pages (og:image / twitter:image). `public/og-image.png`, 1200 × 630, drawn from
 * this file by `node scripts/og-image.mjs` (the mark and the name; no screenshot, no price). Coach pages use the
 * server's per-coach image instead (coach-og).
 */
export const OG_IMAGE_PATH = '/og-image.png';
export const OG_IMAGE_URL = `${SITE_ORIGIN}${OG_IMAGE_PATH}`;
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_ALT = `${BRAND_NAME}: coach people, get paid for it`;
