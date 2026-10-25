// The home page's <title> and description, and the share tags every page of the site carries in its static head.
// Pure (no React): vite.config.js writes them into index.html at build time (W1), meta.js sets them at run time.
import { escapeHtml } from '../coachMeta.js';
import {
  BRAND_NAME, OG_IMAGE_ALT, OG_IMAGE_HEIGHT, OG_IMAGE_URL, OG_IMAGE_WIDTH, SITE_ORIGIN,
} from './brand.js';
import { ELITE_FEE_PERCENT, ELITE_MONTHLY_USD, STANDARD_FEE_PERCENT, usd } from './pricing.js';

/** The hero line (launch plan W2): the home page's title and the share title of the site. */
export const HERO_LINE = 'Monday, handled.';
export const HOME_TITLE = `${BRAND_NAME} — ${HERO_LINE}`;
export const HOME_DESCRIPTION = `${HERO_LINE} ${BRAND_NAME} is where independent coaches sell passes and blocks, run their athletes’ weeks and get paid through Stripe. Open it on Monday and see who needs you.`;

/**
 * The pages written to static HTML at build time (launch plan W7, scripts/prerender.mjs): path, the file under dist/,
 * and the title and description the page sets (usePageMeta) and the static head carries. One list: the prerender,
 * vercel.json's rewrites and the service worker's denylist are checked against it (prerender.test.js).
 */
export const PRERENDERED_PAGES = Object.freeze([
  { path: '/', file: 'index.html', title: null, description: HOME_DESCRIPTION },
  {
    path: '/pricing', file: 'prerendered/pricing.html', title: 'Pricing',
    description: `${BRAND_NAME} is free to try and takes ${STANDARD_FEE_PERCENT}% of each pass sold. Coach Elite is ${usd(ELITE_MONTHLY_USD)} a month: a ${ELITE_FEE_PERCENT}% fee, no athlete cap and the assistant.`,
  },
  {
    path: '/athletes', file: 'prerendered/athletes.html', title: 'For athletes',
    description: `Got a link from your coach? Open it, pay on the web, sign in to the ${BRAND_NAME} app the same way, and train. Here is how it works.`,
  },
  {
    path: '/support', file: 'prerendered/support.html', title: 'Help',
    description: `Answers for coaches and athletes on ${BRAND_NAME}: payouts and Stripe, passes, refunds, the assistant, paying and cancelling, finding your plan. Or write to us.`,
  },
]);

/** A prerendered page's meta by path (the pages read their own title and description from here). */
export function pageMetaFor(path) {
  const p = PRERENDERED_PAGES.find((x) => x.path === path);
  if (!p) throw new Error(`no page meta for ${path}`);
  return p;
}

/** The head of a prerendered page: its title, description, canonical and share tags. */
export function prerenderedHeadTags(path) {
  const p = pageMetaFor(path);
  return siteHeadTags({ title: pageTitle(p.title), description: p.description, url: `${SITE_ORIGIN}${p.path === '/' ? '/' : p.path}` });
}

/** "Pricing — FitLink"; the home page's own title for null. */
export function pageTitle(title) {
  return title ? `${title} — ${BRAND_NAME}` : HOME_TITLE;
}

/**
 * The head tags for a page: <title>, description, and the Open Graph / Twitter tags with the brand's share image.
 * `url` (an absolute address) adds canonical and og:url; the SPA shell has none, because it answers every route.
 */
export function siteHeadTags({ title = HOME_TITLE, description = HOME_DESCRIPTION, url = null } = {}) {
  const m = (property, content) => `<meta property="${property}" content="${escapeHtml(content)}" />`;
  const n = (name, content) => `<meta name="${name}" content="${escapeHtml(content)}" />`;
  return [
    `<title>${escapeHtml(title)}</title>`,
    n('description', description),
    url ? `<link rel="canonical" href="${escapeHtml(url)}" />` : null,
    m('og:type', 'website'),
    m('og:site_name', BRAND_NAME),
    m('og:title', title),
    m('og:description', description),
    url ? m('og:url', url) : null,
    m('og:image', OG_IMAGE_URL),
    m('og:image:type', 'image/png'),
    m('og:image:width', String(OG_IMAGE_WIDTH)),
    m('og:image:height', String(OG_IMAGE_HEIGHT)),
    m('og:image:alt', OG_IMAGE_ALT),
    n('twitter:card', 'summary_large_image'),
    n('twitter:title', title),
    n('twitter:description', description),
    n('twitter:image', OG_IMAGE_URL),
  ].filter(Boolean).join('\n    ');
}
