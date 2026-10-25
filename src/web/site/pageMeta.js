// The home page's <title> and description, and the share tags every page of the site carries in its static head.
// Pure (no React): vite.config.js writes them into index.html at build time (W1), meta.js sets them at run time.
import { escapeHtml } from '../coachMeta.js';
import {
  BRAND_NAME, OG_IMAGE_ALT, OG_IMAGE_HEIGHT, OG_IMAGE_URL, OG_IMAGE_WIDTH,
} from './brand.js';

/** The hero line (launch plan W2): the home page's title and the share title of the site. */
export const HERO_LINE = 'Monday, handled.';
export const HOME_TITLE = `${BRAND_NAME} — ${HERO_LINE}`;
export const HOME_DESCRIPTION = `${HERO_LINE} ${BRAND_NAME} is where independent coaches sell passes and blocks, run their athletes’ weeks and get paid through Stripe. Open it on Monday and see who needs you.`;

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
