// Generates src/web/site/site.css from the Benchside design's stylesheet (the owner's static site,
// `assets/site.css` in the benchside-website repo, 2026-10-29), scoped under `.fl-site` so it styles only the
// marketing and policy pages: the coach page, checkout, the season editor and /admin keep their own `.fl` and
// `.ad` styles (web.css, admin.css) and share one bundle with these pages. Run `node scripts/site-css.mjs
// <path to the design's site.css>`; never edit the output by hand. What changes on the way through:
//   :root            → kept global (the tokens: --ground, --ink, --violet, --lime …; nothing else names them)
//   html             → kept global (text-size-adjust, smooth scroll, scroll-padding-top)
//   body             → body.fl-site-body (the shell's body class) + .fl-site (font and colour for the root)
//   @font-face       → dropped: Archivo is declared once in web.css, which every route loads
//   *, img, a, p …   → .fl-site *, .fl-site img …
//   .js .reveal      → .js .fl-site .reveal (the shell adds "js" to <html>)
//   everything else  → .fl-site <selector>
// Before the design's rules it writes a block that REVERTS the legacy stylesheet inside the site: src/index.css
// (the old trainer/client PWA's design system) is imported by main.jsx and loads on every route, and its element
// rules (*, html, body, a, button, input, ul, img, the hidden scrollbar) and the classes it shares with the design
// (.btn, .btn-primary, .badge, .tag …) styled the site wherever the design was silent (2026-10-29: `.badge` came
// out uppercase, `.btn { white-space: nowrap }` clipped the menu's two-line button). Every such declaration is set
// to `revert` under .fl-site, so the pages render as the design's own file does; the design's own rules follow and
// win where they speak. Only selectors made of elements, pseudo-elements and design classes are reverted.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const postcss = require('postcss');

const source = process.argv[2];
if (!source) { console.error('usage: node scripts/site-css.mjs <design site.css>'); process.exit(1); }
const css = readFileSync(source, 'utf8');
const root = postcss.parse(css);

const SCOPE = '.fl-site';
const BODY = 'body.fl-site-body';

// ── The legacy stylesheet, reverted inside the site ──
const designClasses = new Set();
const designHtmlProps = new Set(); // what the design's own global `html` rule sets: a revert there would outrank it
postcss.parse(css).walkRules((r) => {
  for (const m of r.selector.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) designClasses.add(m[1]);
  if (r.selector.trim() === 'html') r.walkDecls((d) => designHtmlProps.add(d.prop));
});

/**
 * The selector(s) under which a legacy rule's declarations are reverted, or [] when the rule cannot reach the site.
 * The scope goes inside `:where()`, which adds no specificity: each revert then has exactly the legacy rule's own
 * specificity and beats it by order alone (site.css is bundled after index.css), so every rule that outranked the
 * legacy sheet before (web.css's `.fl-btn { border: 0 }` on the Founding page, the design's own rules) still does.
 */
function revertSelectors(sel) {
  const s = sel.trim();
  if (s === ':root' || s.startsWith('#')) return [];           // the tokens; #root is the shell's own layout
  if (s === 'html') return [`html:where(:has(${BODY}))`];
  if (s === 'body') return [`body:where(.fl-site-body)`];
  if (s.startsWith('::')) return [`:where(${SCOPE}) ${s}`, `html:where(:has(${BODY}))${s}`]; // the hidden scrollbar, the viewport's too
  const classes = [...s.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)].map((m) => m[1]);
  if (!classes.every((c) => designClasses.has(c))) return [];
  return [`:where(${SCOPE}) ${s}`];
}

const legacy = postcss.parse(readFileSync(path.join(ROOT, 'src/index.css'), 'utf8'));
const reverted = postcss.root();
legacy.walkRules((rule) => {
  if (rule.parent?.type !== 'root') return;                   // top level only: no @media, no keyframes
  const selectors = rule.selectors.flatMap(revertSelectors);
  if (!selectors.length) return;
  const copy = postcss.rule({ selector: selectors.join(', ') });
  const props = new Set();
  const isHtml = rule.selectors.some((s) => s.trim() === 'html');
  rule.walkDecls((d) => { if (!d.prop.startsWith('--') && !(isHtml && designHtmlProps.has(d.prop))) props.add(d.prop); });
  for (const prop of props) copy.append({ prop, value: 'revert' });
  if (copy.nodes.length) reverted.append(copy);
});

function scopeSelector(sel) {
  const s = sel.trim();
  if (s === ':root' || s === 'html') return s;
  if (s === 'body') return null; // handled below
  if (s.startsWith('.js ')) return `.js ${SCOPE} ${s.slice(4)}`;
  if (s.startsWith('html ') || s.startsWith('body ')) return `${s.split(' ')[0]} ${SCOPE} ${s.split(' ').slice(1).join(' ')}`;
  return `${SCOPE} ${s}`;
}

root.walkAtRules('font-face', (at) => at.remove());

root.walkRules((rule) => {
  if (rule.parent?.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
  const selectors = rule.selectors;
  if (selectors.length === 1 && selectors[0].trim() === 'body') {
    // The design's body rule: the page colour on the shell's body class, the type on the site root.
    const bodyRule = rule.clone({ selector: 'body.fl-site-body' });
    bodyRule.walkDecls((d) => { if (!['margin', 'background', 'color'].includes(d.prop)) d.remove(); });
    const rootRule = rule.clone({ selector: SCOPE });
    rootRule.walkDecls((d) => { if (['margin', 'background'].includes(d.prop)) d.remove(); });
    rule.replaceWith(bodyRule, rootRule);
    return;
  }
  rule.selectors = selectors.map(scopeSelector).filter(Boolean);
});

const header = `/* Benchside marketing and policy pages. GENERATED by scripts/site-css.mjs from the owner's design
   (benchside-website/assets/site.css, 2026-10-29), scoped under .fl-site: do not edit by hand, regenerate.
   The tokens (:root) and the html rule are global; Archivo's @font-face lives in web.css. The forms, the
   Founding page and the delete flow keep their own classes in forms.css. */

/* The shell's body classes: overscroll shows the canvas, or ink on the 404. */
body.fl-site-body-dark { background: #0B0620; }

/* The legacy stylesheet (src/index.css, loaded on every route) reverted inside the site, so the design's rules
   below start from the browser's defaults as the design's own file does. */
`;

const out = header + reverted.toString() + '\n\n' + root.toString().replace(/^\/\* Benchside marketing site[^\n]*\n/, '');
writeFileSync(path.join(ROOT, 'src/web/site/site.css'), out);
console.log('wrote src/web/site/site.css', out.length);
