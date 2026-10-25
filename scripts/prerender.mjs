// Writes the static pages (launch plan W7) after the two builds in `npm run build`:
//   1. `vite build` (the client, into dist/: index.html = the SPA shell, spa.html = the same shell);
//   2. `vite build --ssr src/web/site/prerender.jsx --outDir dist-ssr` (the server entry);
//   3. this: for each of PRERENDERED_PAGES, the shell with the page's markup in #root (data-prerendered = its path)
//      and its own title, description, canonical and share tags in the head. "/" overwrites dist/index.html (Vercel
//      serves "/" from the file system); the others go to dist/prerendered/<name>.html, which vercel.json's rewrites
//      serve for /pricing, /athletes and /support before the SPA catch-all.
// Pure Node (react-dom/server's renderToString): no browser, so Vercel's build runs it. Any failure fails the build.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const { render, PRERENDERED_PAGES, prerenderedHeadTags } = await import(pathToFileURL(path.join(ROOT, 'dist-ssr', 'prerender.js')).href);
const { injectHead } = await import(pathToFileURL(path.join(ROOT, 'src/web/coachMeta.js')).href);

const shell = readFileSync(path.join(DIST, 'spa.html'), 'utf8');
if (!shell.includes('<div id="root"></div>')) throw new Error('prerender: the shell has no empty #root');

for (const page of PRERENDERED_PAGES) {
  const markup = render(page.path);
  if (!markup || markup.length < 500) throw new Error(`prerender: ${page.path} rendered nothing`);
  // A function replacement: page text may hold "$&" and the like.
  const body = shell.replace('<div id="root"></div>', () => `<div id="root" data-prerendered="${page.path}">${markup}</div>`);
  const html = injectHead(body, { tags: prerenderedHeadTags(page.path) });
  if (!html) throw new Error(`prerender: no </head> for ${page.path}`);
  const out = path.join(DIST, page.file);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log(`prerendered ${page.path} → dist/${page.file} (${Math.round(html.length / 1024)} KiB)`);
}
// supabase-js keeps a refresh timer alive in Node; the work is done.
process.exit(0);
