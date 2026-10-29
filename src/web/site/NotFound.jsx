// * (the design's build.py not_found()): "Rest day", with the shell's header and footer. It is
// also what the coach page shows for a handle that is nobody's (src/web/CoachPage.jsx), outside
// the site shell, so it carries its own root, body class and styles.
import { Link } from 'react-router-dom';
import { useBodyClass, usePageMeta } from './meta';
import { SiteFooter, SiteHeader } from './SiteShell';
import '../web.css';
import './site.css';
import './shell.css';
import { BRAND_NAME } from './brand';

export default function NotFound() {
  usePageMeta('Page not found', `This page doesn’t exist on ${BRAND_NAME}.`);
  useBodyClass('fl-site-body');
  return (
    <div className="fl fl-site">
      <SiteHeader />
      <main id="main">
        <section className="pad">
          <div className="wrap lost">
            <span className="kicker">404</span>
            <h1 className="display d-xl">Rest day<span className="dot v" aria-hidden="true" /></h1>
            <p className="lede">This page doesn’t exist. If a coach sent you a link, check it with them, or start from the home page.</p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/">Go to the home page</Link>
              <Link className="link-arrow" to="/support">Help</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
