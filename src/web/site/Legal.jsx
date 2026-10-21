// /privacy and /terms (Web-Legal). One layout: the Privacy · Terms switch, the
// title and date, "In plain words" in ink, the sections, and a sticky "On
// this page" list that follows the scroll. The text itself lives in
// privacyContent.jsx and termsContent.jsx (one copy of the truth; the old
// public/*.html files are gone).
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { usePageMeta } from './meta';
import { LEGAL_DOCS } from './legalMeta';
import PrivacyBody from './privacyContent';
import TermsBody from './termsContent';

const BODIES = { privacy: PrivacyBody, terms: TermsBody };

export default function Legal({ doc }) {
  const d = LEGAL_DOCS[doc];
  const Body = BODIES[doc];
  usePageMeta(d.title, d.description);
  // The route renders <Legal key={doc}>, so switching documents remounts and
  // this starts at the first section again.
  const [current, setCurrent] = useState(d.sections[0]?.id);

  useEffect(() => {
    const els = d.sections.map((s) => document.getElementById(s.id)).filter(Boolean);
    if (els.length === 0 || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (hit) setCurrent(hit.target.id);
    }, { rootMargin: '-96px 0px -60% 0px', threshold: 0 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [d]);

  return (
    <div className="s-wrap s-legal">
      <nav className="s-toc" aria-label="On this page">
        <span>On this page</span>
        {d.sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} aria-current={current === s.id ? 'true' : undefined}>{s.label}</a>
        ))}
      </nav>
      <article className="s-article">
        <nav className="s-legal-tabs" aria-label="Legal documents">
          <NavLink to="/privacy">Privacy</NavLink>
          <NavLink to="/terms">Terms</NavLink>
        </nav>
        <div className="s-stack" style={{ gap: 8 }}>
          <h1 className="s-h1 sm">{d.title}</h1>
          <span className="s-small">Last updated {d.updated}</span>
        </div>
        <Body />
      </article>
    </div>
  );
}
