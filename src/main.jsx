import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import CoachPublicPage from './web/CoachPublicPage.jsx'
import CoachPage from './web/CoachPage.jsx'
import CoachWeb from './web/CoachWeb.jsx'
import JoinReturn from './web/JoinReturn.jsx'
import AdminDashboard from './web/admin/AdminDashboard.jsx'
import SiteShell from './web/site/SiteShell.jsx'
import Home from './web/site/Home.jsx'
import Pricing from './web/site/Pricing.jsx'
import Athletes from './web/site/Athletes.jsx'
import Support from './web/site/Support.jsx'
import Legal from './web/site/Legal.jsx'
import DeleteAccount from './web/site/DeleteAccount.jsx'
import Founding from './web/site/Founding.jsx'
import NotFound from './web/site/NotFound.jsx'

// The marketing and policy pages share SiteShell (header, footer); a coach's
// public page at /i/CODE (and /live/CODE, the same card for a live link), the
// coach page at /c/<handle> (2026-10-25: one hero, the passes, a footer; no site nav),
// the coach's web editor under /coach and /join (where Sign in with Apple
// returns when it started at checkout) keep their own chrome, and so does /admin (the operator's
// dashboard, 2026-10-25: linked from nowhere, noindex); everything else
// is the 404. The legacy dark landing page (src/App.jsx) and the legacy
// trainer/client PWA under src/pages are kept in the tree but not routed:
// the PWA was already unreachable (App.jsx rendered only the landing page),
// and the new home replaces that landing page.
const app = (
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<SiteShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/athletes" element={<Athletes />} />
          <Route path="/support" element={<Support />} />
          <Route path="/privacy" element={<Legal key="privacy" doc="privacy" />} />
          <Route path="/terms" element={<Legal key="terms" doc="terms" />} />
          <Route path="/delete-account" element={<DeleteAccount />} />
          <Route path="/founding" element={<Founding />} />
        </Route>
        <Route path="/i/:code" element={<CoachPublicPage />} />
        <Route path="/live/:code" element={<CoachPublicPage />} />
        <Route path="/c/:handle" element={<CoachPage />} />
        <Route path="/coach/*" element={<CoachWeb />} />
        <Route path="/join" element={<JoinReturn />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)

// Home, pricing, for athletes and help are static HTML written at build time (launch plan W7, scripts/prerender.mjs):
// their #root carries the page's path in data-prerendered, and React adopts that markup (hydrateRoot) when the
// browser is on that very path. Everything else, and a static page reached at another address (a trailing slash),
// renders from the empty shell.
const root = document.getElementById('root')
if (root.dataset.prerendered && root.dataset.prerendered === window.location.pathname && root.firstElementChild) {
  hydrateRoot(root, app)
} else {
  createRoot(root).render(app)
}
