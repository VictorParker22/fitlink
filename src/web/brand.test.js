// The brand is one file (launch plan W1): no page, sentence, test fixture or build file spells the product's name,
// domain or mailbox except src/web/site/brand.js. Comments may (they explain history); the server's config copy
// (pricingConfig.json) is a byte copy of fitlink-app's and is left alone. Run: node --test src/web/brand.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_STORE_URL, BRAND_NAME, SITE_HOST, SUPPORT_EMAIL } from './site/brand.js';
import { HOME_TITLE, siteHeadTags } from './site/pageMeta.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NEEDLES = [...new Set([BRAND_NAME, 'FitLink', SITE_HOST, 'fitlink.coach', SUPPORT_EMAIL, APP_STORE_URL, 'apps.apple.com'])];
const SKIP = new Set(['src/web/site/brand.js', 'src/web/pricingConfig.json', 'src/web/brand.test.js']);

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(jsx?|html|json)$/.test(name) ? [p] : [];
  });
}

/** The line without its comment: a line comment, a JSDoc / block line, a JSX comment, an HTML comment. */
function code(line) {
  const t = line.trim();
  if (/^(\/\/|\/\*|\*|\{\/\*|<!--)/.test(t)) return '';
  return line.replace(/(^|\s)\/\/.*$/, '$1').replace(/\{\/\*.*?\*\/\}/g, '').replace(/<!--.*?-->/g, '');
}

test('brand: the name, domain, mailbox and App Store address are spelled only in brand.js', () => {
  const targets = [...files(path.join(ROOT, 'src/web')), path.join(ROOT, 'src/main.jsx'), path.join(ROOT, 'index.html'),
    path.join(ROOT, 'vite.config.js'), ...files(path.join(ROOT, 'api'))];
  const hits = [];
  for (const file of targets) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (SKIP.has(rel)) continue;
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      const c = code(line);
      for (const n of NEEDLES) if (c.includes(n)) hits.push(`${rel}:${i + 1}: ${n}`);
    });
  }
  assert.deepEqual(hits, [], 'take it from src/web/site/brand.js');
});

test('brand: the static head (index.html at build time) carries the name, the share image and no canonical', () => {
  const head = siteHeadTags();
  assert.ok(head.includes(`<title>${HOME_TITLE}</title>`));
  assert.match(head, /<meta property="og:site_name" content="[^"]+" \/>/);
  assert.match(head, /<meta property="og:image" content="https:\/\/[^"]+\/og-image\.png" \/>/);
  assert.ok(!head.includes('canonical') && !head.includes('og:url'), 'the SPA shell answers every route: no canonical');
  const page = siteHeadTags({ title: 'Pricing — X', description: 'a "quoted" <b> & more', url: 'https://example.com/pricing' });
  assert.ok(page.includes('<link rel="canonical" href="https://example.com/pricing" />'));
  assert.ok(page.includes('content="a &quot;quoted&quot; &lt;b&gt; &amp; more"'), 'escaped');
});

test('brand: index.html has tokens, not a name', () => {
  const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(html.includes('<!--site-head-->') && html.includes('__BRAND_NAME__') && html.includes('__THEME_COLOR__'));
  assert.ok(!/<title>/.test(html));
});
