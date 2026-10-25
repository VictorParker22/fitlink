// The server entry for the static pages (launch plan W7): `vite build --ssr src/web/site/prerender.jsx` bundles it,
// scripts/prerender.mjs calls render(path) for each of PRERENDERED_PAGES and writes the HTML into the client build.
// The tree is the one src/main.jsx hydrates for these paths (StrictMode → router → SiteShell → the page), so the
// markup React makes in the browser is the markup in the file: renderToString runs no effects, the Founding counter
// is in its loading state (nothing numeric), no date is drawn but the footer's year.
/* eslint-disable react-refresh/only-export-components -- the server entry for the prerender, never hot-reloaded */
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { Route, Routes, StaticRouter } from 'react-router-dom';
import SiteShell from './SiteShell';
import Home from './Home';
import Pricing from './Pricing';
import Athletes from './Athletes';
import Support from './Support';

export { PRERENDERED_PAGES, prerenderedHeadTags } from './pageMeta';

export function render(path) {
  return renderToString(
    <StrictMode>
      <StaticRouter location={path}>
        <Routes>
          <Route element={<SiteShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/athletes" element={<Athletes />} />
            <Route path="/support" element={<Support />} />
          </Route>
        </Routes>
      </StaticRouter>
    </StrictMode>,
  );
}
