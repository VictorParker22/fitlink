// The shell every marketing and policy page shares: the glass header with the
// F mark and the four-item nav, the footer with the legal links and the
// support mailbox, scroll-to-top on navigation, and the body class that keeps
// overscroll cream instead of the legacy app's dark body.
import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useBodyClass } from './meta';
import { takeAuthReturnNote } from '../api';
import '../web.css';
import './site.css';
import { BRAND_MARK, BRAND_NAME, SUPPORT_EMAIL } from './brand';
import { FOUNDING_CTA, FOUNDING_PATH } from './flags';

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) { el.scrollIntoView(); return; }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export function Mark({ small }) {
  return <span aria-hidden="true" className={`s-mark${small ? ' sm' : ''}`}>{BRAND_MARK}</span>;
}

export function SiteHeader() {
  return (
    <header className="fl-header">
      <div className="fl-header-bar fl-glass">
        <Link className="s-brand" to="/" aria-label={`${BRAND_NAME} home`}><Mark />{BRAND_NAME}</Link>
        <nav className="s-nav" aria-label="Site">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
          <NavLink to="/athletes">For athletes</NavLink>
          <NavLink to="/support">Help</NavLink>
        </nav>
        <div className="s-header-actions">
          <Link className="signin" to="/coach">Sign in</Link>
          <Link className="fl-btn accent" to={FOUNDING_PATH}>{FOUNDING_CTA}</Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="s-footer">
      <div>
        <div className="s-footer-row">
          <span className="s-footer-brand"><Mark small />{BRAND_NAME}</span>
          <nav aria-label="Footer">
            <Link to="/support">Help</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/delete-account">Delete account</Link>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </nav>
        </div>
        <div className="s-footer-row legal">
          {/* The static pages are written at build time (W7): a year that turned since then is the one difference allowed. */}
          <span suppressHydrationWarning>© {new Date().getFullYear()} [Legal entity name]</span>
          <span>Payments processed by Stripe. Apple, iPhone and App Store are trademarks of Apple Inc.</span>
        </div>
      </div>
    </footer>
  );
}

export default function SiteShell() {
  useBodyClass('fl-site-body');
  // Take any tokens or error text out of the address bar, silently: none of
  // these pages receives a sign-in return. Not on /delete-account or /founding,
  // which take the return themselves and show its sentence (parent effects run
  // after the child's, and the first to read the URL cleans it).
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname !== '/delete-account' && pathname !== '/founding') takeAuthReturnNote();
    // Once, on the page the visitor arrived at.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="fl fl-site">
      <ScrollToTop />
      <SiteHeader />
      <main>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
