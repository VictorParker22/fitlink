// Draws public/og-image.png (1200 × 630), the share image of the site's own pages, from src/web/site/brand.js: the
// mark, the name and the host on the cream canvas. Run it on a machine with Playwright's Chromium after changing
// the brand (the rename): `node scripts/og-image.mjs`. Not part of `npm run build` (Vercel's build has no browser).
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND_MARK, BRAND_NAME, OG_IMAGE_HEIGHT, OG_IMAGE_PATH, OG_IMAGE_WIDTH, SITE_HOST, THEME_COLOR } from '../src/web/site/brand.js';
import { escapeHtml } from '../src/web/coachMeta.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'package.json'));
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('playwright')); }

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: ${OG_IMAGE_WIDTH}px; height: ${OG_IMAGE_HEIGHT}px; background: ${THEME_COLOR}; }
  body { display: flex; flex-direction: column; justify-content: center; padding: 0 110px; box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #15171C; }
  .row { display: flex; align-items: center; gap: 40px; }
  .mark { width: 168px; height: 168px; border-radius: 44px; background: #C2410C; color: #fff; display: flex;
    align-items: center; justify-content: center; font-size: 104px; font-weight: 800; }
  .name { font-size: 128px; font-weight: 800; letter-spacing: -0.03em; }
  .host { margin-top: 56px; font-size: 40px; color: #4A4D55; font-weight: 500; }
</style></head><body>
  <div class="row"><div class="mark">${escapeHtml(BRAND_MARK)}</div><div class="name">${escapeHtml(BRAND_NAME)}</div></div>
  <div class="host">${escapeHtml(SITE_HOST)}</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT } });
await page.setContent(html);
const out = path.join(ROOT, 'public', OG_IMAGE_PATH.replace(/^\//, ''));
await page.screenshot({ path: out, type: 'png' });
await browser.close();
console.log(`wrote ${path.relative(ROOT, out)}`);
