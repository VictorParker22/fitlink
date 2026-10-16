// The shell every marketing and policy page shares: the glass header with the
// F mark and the four-item nav, the footer with the legal links and the
// support mailbox, scroll-to-top on navigation, and the body class that keeps
// overscroll cream instead of the legacy app's dark body.
import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { APP_STORE_URL, SUPPORT_EMAIL } from './pricing';
import { useBodyClass } from './meta';
import '../web.css';
import './site.css';

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
  return <span aria-hidden="true" className={`s-mark${small ? ' sm' : ''}`}>F</span>;
}

export function SiteHeader() {
  return (
    <header className="fl-header">
      <div className="fl-header-bar fl-glass">
        <Link className="s-brand" to="/" aria-label="FitLink home"><Mark />FitLink</Link>
        <nav className="s-nav" aria-label="Site">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
          <NavLink to="/athletes">For athletes</NavLink>
          <NavLink to="/support">Help</NavLink>
        </nav>
        <div className="s-header-actions">
          <Link className="signin" to="/coach">Sign in</Link>
          <a className="fl-btn accent" href={APP_STORE_URL}>Get the app</a>
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
          <span className="s-footer-brand"><Mark small />FitLink</span>
          <nav aria-label="Footer">
            <Link to="/support">Help</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/delete-account">Delete account</Link>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </nav>
        </div>
        <div className="s-footer-row legal">
          <span>© {new Date().getFullYear()} [Legal entity name]</span>
          <span>Payments processed by Stripe. Apple, iPhone and App Store are trademarks of Apple Inc.</span>
        </div>
      </div>
    </footer>
  );
}

export default function SiteShell() {
  useBodyClass('fl-site-body');
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
