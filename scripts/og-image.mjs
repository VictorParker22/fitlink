// Draws public/og-image.png (1200 × 630), the share image of the site's own pages, from the brand files: the
// wordmark on the ink canvas, the host, the home page's headline in Archivo with "Get paid" in lime, and the
// coach's Today screen (the owner's design kit, `benchside-website/_source/og.html`, 2026-10-29). Run it on a
// machine with Playwright's Chromium after changing the brand: `node scripts/og-image.mjs`. Not part of
// `npm run build` (Vercel's build has no browser). The page is served from `public/` over a file URL so the
// font, the wordmark and the screen load from the same files the site ships.
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BRAND_NAME, OG_IMAGE_HEIGHT, OG_IMAGE_PATH, OG_IMAGE_WIDTH, SITE_HOST } from '../src/web/site/brand.js';
import { escapeHtml } from '../src/web/coachMeta.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'package.json'));
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('playwright')); }

const pub = pathToFileURL(path.join(ROOT, 'public')).href;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
  @font-face { font-family: Archivo; src: url(${pub}/fonts/archivo-var.woff2) format('woff2'); font-weight: 100 900; font-stretch: 62% 125%; }
  html, body { margin: 0; }
  .og { position: relative; width: ${OG_IMAGE_WIDTH}px; height: ${OG_IMAGE_HEIGHT}px; overflow: hidden; background: #160A3D; color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; }
  .wm { position: absolute; left: 72px; top: 64px; width: 230px; }
  .url { position: absolute; left: 72px; top: 118px; font-size: 22px; color: #B9AEE6; font-family: Archivo; font-weight: 500; }
  h1 { position: absolute; left: 72px; bottom: 72px; margin: 0; font-family: Archivo; font-stretch: 72%; font-weight: 800;
    font-size: 102px; line-height: .88; letter-spacing: -.005em; text-transform: uppercase; }
  h1 .l { color: #D7FF3A; }
  .ph { position: absolute; right: 84px; top: 70px; width: 330px; aspect-ratio: 390 / 844; padding: 9px; border-radius: 50px;
    background: #0F0A1F; box-shadow: 0 0 0 1px rgba(255,255,255,.08); }
  .ph img { width: 100%; height: 100%; border-radius: 42px; display: block; }
</style></head><body><div class="og">
  <img class="wm" src="${pub}/brand/wordmark-on-dark.svg" alt="${escapeHtml(BRAND_NAME)}">
  <div class="url">${escapeHtml(SITE_HOST)}</div>
  <h1>Coach people.<br><span class="l">Get paid</span><br>for it.</h1>
  <div class="ph"><img src="${pub}/screens/coach-today.webp" alt=""></div>
</div></body></html>`;

const dir = mkdtempSync(path.join(tmpdir(), 'og-'));
const file = path.join(dir, 'og.html');
writeFileSync(file, html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT } });
await page.goto(pathToFileURL(file).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const out = path.join(ROOT, 'public', OG_IMAGE_PATH.replace(/^\//, ''));
await page.screenshot({ path: out, type: 'png' });
await browser.close();
rmSync(dir, { recursive: true, force: true });
console.log(`wrote ${path.relative(ROOT, out)}`);
