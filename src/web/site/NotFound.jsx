// * (Web-404). Its own dark page, no header: a wrong link is most often a
// coach's link that changed, so the copy says what to do about that.
import { Link } from 'react-router-dom';
import { useBodyClass, usePageMeta } from './meta';
import '../web.css';
import './site.css';
import { APP_STORE_URL } from './pricing';
import { BRAND_NAME } from './brand';

export default function NotFound() {
  usePageMeta('Page not found', 'This page took a rest day.');
  useBodyClass('fl-site-body-dark');
  return (
    <div className="fl fl-site">
      <div className="s-404">
        <main>
          <span className="code">404</span>
          <h1>This page took a rest day.</h1>
          <p>If you followed a coach’s link, ask them to send it again. It may have changed.</p>
          <div className="s-actions">
            <Link className="fl-btn accent" to="/">Go to {BRAND_NAME}</Link>
            <a className="fl-btn ghost-dark" href={APP_STORE_URL}>Get the app</a>
            <Link className="fl-btn ghost-dark" to="/support">Get help</Link>
          </div>
        </main>
      </div>
    </div>
  );
}
