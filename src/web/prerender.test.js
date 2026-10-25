// The static pages (launch plan W7): one list (site/pageMeta.js PRERENDERED_PAGES) that vercel.json, the service
// worker and the prerender all follow. Run: node --test src/web/prerender.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PRERENDERED_PAGES, prerenderedHeadTags, pageMetaFor, HOME_TITLE } from './site/pageMeta.js';
import { SITE_ORIGIN } from './site/brand.js';

const VERCEL = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
const VITE = readFileSync(new URL('../../vite.config.js', import.meta.url), 'utf8');

test('prerender: home, pricing, athletes and help, each with its file', () => {
  assert.deepEqual(PRERENDERED_PAGES.map((p) => p.path), ['/', '/pricing', '/athletes', '/support']);
  assert.equal(pageMetaFor('/').file, 'index.html', 'Vercel serves "/" from the file system');
  for (const p of PRERENDERED_PAGES.slice(1)) assert.equal(p.file, `prerendered${p.path}.html`);
});

test('prerender: vercel.json serves each static page before the SPA catch-all, which keeps /api/ and the AASA file out', () => {
  // vercel.json names the build command, so the dashboard's Vite preset (`vite build`) can never skip the prerender.
  assert.equal(VERCEL.buildCommand, 'npm run build');
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts.build, 'vite build && vite build --ssr src/web/site/prerender.jsx --outDir dist-ssr && node scripts/prerender.mjs');
  const rw = VERCEL.rewrites;
  const catchAll = rw.findIndex((r) => r.destination === '/spa.html' && !r.has);
  assert.ok(catchAll > 0, 'the catch-all serves the shell (spa.html), never the static home page');
  assert.equal(rw[catchAll].source, '/((?!api/|\\.well-known/apple-app-site-association$).*)');
  for (const p of PRERENDERED_PAGES) {
    const i = rw.findIndex((r) => r.source === p.path && !r.has);
    assert.ok(i >= 0 && i < catchAll, `${p.path} has its own rewrite before the catch-all`);
    assert.equal(rw[i].destination, `/${p.file}`);
  }
  assert.ok(!rw.some((r) => r.destination === '/index.html' && r.source !== '/'), 'only "/" is the static home page');
  assert.equal(VERCEL.functions['api/coach-meta/*.js'].includeFiles, 'dist/spa.html', 'link previews start from the shell');
  const aasa = VERCEL.headers.find((h) => h.source === '/.well-known/apple-app-site-association');
  assert.ok(aasa.headers.some((x) => x.key === 'Content-Type' && x.value === 'application/json'));
});

test('prerender: the service worker answers navigations with the shell and never shadows a static page', () => {
  assert.match(VITE, /navigateFallback: 'spa\.html'/);
  assert.match(VITE, /navigateFallbackDenylist: \[\/\^\\\/\\\.well-known\\\/\/, \/\^\\\/api\\\/\/, \.\.\.PRERENDERED_NAVIGATIONS\]/);
  assert.match(VITE, /PRERENDERED_NAVIGATIONS = PRERENDERED_PAGES\.map/);
  assert.match(VITE, /globIgnores: \[[^\]]*'index\.html'[^\]]*'prerendered\/\*\*'/);
});

test('prerender: each page’s head has its own title, description, canonical and og:url', () => {
  const home = prerenderedHeadTags('/');
  assert.ok(home.includes(`<title>${HOME_TITLE}</title>`) && home.includes(`<link rel="canonical" href="${SITE_ORIGIN}/" />`));
  const pricing = prerenderedHeadTags('/pricing');
  assert.match(pricing, /<title>Pricing — [^<]+<\/title>/);
  assert.ok(pricing.includes(`<meta property="og:url" content="${SITE_ORIGIN}/pricing" />`));
  assert.ok(pricing.includes(`content="${pageMetaFor('/pricing').description.replace(/&/g, '&amp;')}"`));
  assert.match(prerenderedHeadTags('/support'), /<title>Help — /);
});
