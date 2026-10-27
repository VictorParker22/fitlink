// Which visitors of /c/<handle> get the link-preview HTML (launch plan Sprint 1 PR 3, review 2026-10-25). Pure:
// `node --test src/web/coachMeta.test.js` pins it AND checks that vercel.json carries exactly this pattern.
//
// Humans never wait on the preview function: vercel.json sends /c/<handle> to api/coach-meta/[handle].js only when the
// user agent matches this pattern, and everyone else gets the SPA's index.html straight from the CDN (the page reads
// coach_page itself and handles a retired handle client-side). A browser that matches by accident still gets the
// page, only slower; a bot that does not match gets the plain index.html (no preview), never an error.
//
// Case-sensitive and spelled as each service sends it, on purpose: Vercel's documentation does not say whether a
// `has` header value accepts an inline `(?i)` flag, so the pattern uses no flags, no lookaround, and a leading and
// trailing `.*`, which matches the same way whether the router anchors the value or searches it.
// Left out on purpose: in-app BROWSERS that people read pages in (Instagram, FBAN/FBAV, "Pinterest for iOS",
// Snapchat, Line), which are humans.
//   facebookexternalhit  Facebook, Instagram, Messenger, and Apple Messages (iMessage sends
//                        "facebookexternalhit/1.1 Facebot Twitterbot/1.0")
export const LINK_PREVIEW_BOTS = [
  'facebookexternalhit', 'Facebot', 'meta-externalagent', 'meta-externalfetcher',
  'Twitterbot', 'Slackbot', 'Slack-ImgProxy', 'Discordbot', 'WhatsApp', 'TelegramBot', 'LinkedInBot',
  'Pinterestbot', 'redditbot', 'Applebot', 'Googlebot', 'Google-InspectionTool', 'bingbot', 'BingPreview',
  'DuckDuckBot', 'YandexBot', 'Embedly', 'SkypeUriPreview', 'vkShare', 'Iframely', 'Mastodon', 'Bluesky',
  'Snap URL Preview',
];

/** The `has` value in vercel.json: `.*(a|b|…).*` (the names hold no regex metacharacters but `-` and ` `). */
export const LINK_PREVIEW_UA_PATTERN = `.*(${LINK_PREVIEW_BOTS.join('|')}).*`;

/** The same test in JavaScript: true for a user agent the preview function should answer. */
export function isLinkPreviewBot(ua) {
  return typeof ua === 'string' && new RegExp(`^${LINK_PREVIEW_UA_PATTERN}$`).test(ua);
}
