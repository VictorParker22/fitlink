// The App Store link, shown only in a build with VITE_APP_STORE_LIVE=on (flags.js). A plain text link on purpose:
// Apple's marketing guidelines allow the official "Download on the App Store" badge artwork only, unaltered, and
// that artwork is not in this repo yet (owner step: add Apple's badge SVG from Apple's marketing tools to
// public/ and draw it here). Never draw a look-alike badge.
import { APP_STORE_URL, BRAND_NAME } from './brand';
import { APP_STORE_LIVE } from './flags';

export default function AppStoreLink({ className, children }) {
  if (!APP_STORE_LIVE) return null;
  return <a className={className} href={APP_STORE_URL}>{children ?? `Get ${BRAND_NAME} on the App Store`}</a>;
}
