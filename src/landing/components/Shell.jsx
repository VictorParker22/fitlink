import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

/**
 * Shell — nav, footer, and the between-pages behaviour.
 *
 * Each nav item is a real route with its own URL, not an anchor into one
 * long scroll. That buys three things a single page cannot give:
 * shareable/bookmarkable sections, per-page heroes (each with its own
 * three.js scene), and room for each audience's story to run at full
 * length instead of one paragraph per tab.
 */

export const SUPPORT = 'hello@fitlink.coach';
export const NOTIFY_HREF = `mailto:${SUPPORT}?subject=${encodeURIComponent('Tell me when FitLink launches')}`;

const LINKS = [
  { to: '/coaches', label: 'Coaches' },
  { to: '/athletes', label: 'Athletes' },
  { to: '/gyms', label: 'Gyms' },
  { to: '/pricing', label: 'Pricing' },
];

function ScrollReset() {
  const { pathname } = useLocation();
  // Browsers preserve scroll across SPA "navigation"; landing mid-page on a
  // fresh route reads as a rendering bug to anyone who doesn't know that.
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function Shell() {
  useEffect(() => {
    document.body.classList.add('fl-body');
    return () => document.body.classList.remove('fl-body');
  }, []);

  return (
    <div className="fl">
      <ScrollReset />
      <a className="fl-skip" href="#main">Skip to content</a>

      <header className="fl-nav">
        <Link className="fl-mark" to="/" aria-label="FitLink home">
          <span className="fl-mark-tile" aria-hidden="true">FL</span>
          <span className="fl-mark-word">FitLink</span>
        </Link>
        <nav className="fl-nav-links" aria-label="Sections">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => (isActive ? 'fl-nav-on' : undefined)}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        {/* The app itself, exported for web, lives at app.fitlink.coach —
            a separate Vercel project on the fitlink-native repo. Until that
            domain is attached this 404s, which is honest: the button appears
            when the door exists. */}
        <a className="fl-nav-signin" href="https://app.fitlink.coach">Sign in</a>
        <Link className="fl-btn fl-btn-sm" to="/">Get early access</Link>
      </header>

      <main id="main">
        <Outlet />
      </main>

      <footer className="fl-footer">
        <div className="fl-footer-mark">
          <span className="fl-mark-tile" aria-hidden="true">FL</span>
          <span>FitLink</span>
        </div>
        <nav className="fl-footer-cols" aria-label="Footer">
          <div className="fl-footer-col">
            <p className="fl-footer-col-h">Product</p>
            <Link to="/coaches">Coaches</Link>
            <Link to="/athletes">Athletes</Link>
            <Link to="/gyms">Gyms</Link>
            <Link to="/pricing">Pricing</Link>
          </div>
          <div className="fl-footer-col">
            <p className="fl-footer-col-h">Company</p>
            <a href="https://app.fitlink.coach">Sign in</a>
            <a href={`mailto:${SUPPORT}`}>{SUPPORT}</a>
          </div>
          <div className="fl-footer-col">
            <p className="fl-footer-col-h">Legal</p>
            {/* Static files served by vercel rewrites, outside the SPA. */}
            <a href="/privacy">Privacy</a>
            <a href="/delete-account">Delete your account</a>
          </div>
        </nav>
        <p className="fl-footer-copy">© {new Date().getFullYear()} FitLink</p>
      </footer>
    </div>
  );
}
