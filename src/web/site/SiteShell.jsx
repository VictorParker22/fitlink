// The shell every marketing and policy page shares, from the design's common.py header() and
// footer() and site.js (the sheet menu, the scrolled hairline, the reveal): the skip link, the
// sticky header with the wordmark, Pricing / For athletes / Help, Sign in and the App Store
// button, the mobile sheet menu, <main id="main"> with the page, and the ink footer with four
// columns and the operator line. Scroll-to-top on navigation, the body class that keeps overscroll
// the canvas colour, and the reveal observer for every page's `.reveal`.
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useBodyClass } from './meta';
import { useReveal } from './reveal';
import { takeAuthReturnNote } from '../api';
import '../web.css';
import './site.css';
import './shell.css';
import {
  APP_STORE_URL, BRAND_NAME, INSTAGRAM_URL, LEGAL_ENTITY, LEGAL_ENTITY_STATE, SUPPORT_EMAIL,
} from './brand';
import { FOUNDING_SLOTS } from './pricing';

const NAV = [
  { to: '/pricing', label: 'Pricing' },
  { to: '/athletes', label: 'For athletes' },
  { to: '/support', label: 'Help' },
];
/** The design's desktop breakpoint: the sheet menu closes when the window grows past it. */
const DESKTOP = '(min-width: 861px)';

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) { el.scrollIntoView(); return; }
    }
    // At once: the design's `html { scroll-behavior: smooth }` would animate the jump to the new page's top.
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return null;
}

/**
 * The header's contents: the bar and the sheet menu. Rendered with the route as its key, so a
 * navigation (a link in the sheet, the back button) remounts it with the menu closed, with no
 * effect that sets state.
 */
function HeaderChrome() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    // The page behind the sheet must not scroll; Escape and a grown window close it.
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const desktop = window.matchMedia(DESKTOP);
    const onGrow = (m) => { if (m.matches) setOpen(false); };
    document.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onGrow);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      desktop.removeEventListener('change', onGrow);
    };
  }, [open]);

  const onSheetClick = (e) => { if (e.target.closest('a')) setOpen(false); };

  return (
    <>
      <div className="wrap">
        <Link className="brand" to="/" aria-label={`${BRAND_NAME} home`}>
          <img src="/brand/wordmark.svg" alt={BRAND_NAME} width="128" height="19" />
        </Link>
        <nav className="nav" aria-label="Main">
          {NAV.map(({ to, label }) => <NavLink key={to} to={to}>{label}</NavLink>)}
          <Link className="signin" to="/coach">Sign in</Link>
        </nav>
        <div className="header-cta">
          <a className="btn btn-primary btn-sm" href={APP_STORE_URL}>Get the app</a>
          <button
            className="menu-btn"
            type="button"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 8h16M4 16h16" /></svg>
          </button>
        </div>
      </div>
      <nav className={open ? 'mobile-nav open' : 'mobile-nav'} id="mobile-nav" aria-label="Main" onClick={onSheetClick}>
        {NAV.map(({ to, label }) => <Link key={to} to={to}>{label}<span aria-hidden="true">→</span></Link>)}
        <Link to="/coach">Coach sign in<span aria-hidden="true">→</span></Link>
        <a className="btn btn-primary" href={APP_STORE_URL}>Get {BRAND_NAME} for iPhone</a>
      </nav>
    </>
  );
}

export function SiteHeader() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(() => window.scrollY > 8);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className={scrolled ? 'site-header scrolled' : 'site-header'}>
        <HeaderChrome key={pathname} />
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer on-deep">
      <div className="wrap">
        <div className="foot-top">
          <div className="foot-brand">
            <img src="/brand/wordmark-on-dark.svg" alt={BRAND_NAME} width="150" height="22" loading="lazy" />
            <p>The app that runs an independent coach’s business. Passes, programs, check-ins and payouts in one place.</p>
          </div>
          <div className="foot-col">
            <h2>{BRAND_NAME}</h2>
            <ul>
              <li><Link to="/pricing">Pricing</Link></li>
              <li><Link to="/athletes">For athletes</Link></li>
              <li><Link to="/founding">Founding {FOUNDING_SLOTS}</Link></li>
              <li><a href={APP_STORE_URL}>Get the app</a></li>
            </ul>
          </div>
          <div className="foot-col">
            <h2>Help</h2>
            <ul>
              <li><Link to="/support">Help center</Link></li>
              <li><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></li>
              <li><Link to="/coach">Coach sign in</Link></li>
              <li><Link to="/delete-account">Delete your account</Link></li>
            </ul>
          </div>
          <div className="foot-col">
            <h2>More</h2>
            <ul>
              <li><Link to="/privacy">Privacy</Link></li>
              <li><Link to="/terms">Terms</Link></li>
              <li><a href={INSTAGRAM_URL} rel="noopener">Instagram</a></li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 {LEGAL_ENTITY} · {LEGAL_ENTITY_STATE}, USA</span>
          <span>Payments by Stripe · iPhone app</span>
        </div>
      </div>
    </footer>
  );
}

export default function SiteShell() {
  useBodyClass('fl-site-body');
  const rootRef = useRef(null);
  // Every `.reveal` on every page under this shell fades up once it scrolls into view.
  useReveal(rootRef);
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
    <div className="fl fl-site" ref={rootRef}>
      <ScrollToTop />
      <SiteHeader />
      <main id="main">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
