// /privacy and /terms (the design's page_legal.py): the page hero with the title and date, a
// sticky "On this page" list that follows the scroll, the "In plain words" card, the sentence
// that says the service was renamed, the sections, and the operator line. The text itself lives
// in privacyContent.jsx and termsContent.jsx (one copy of the truth), each exporting `Body` (the
// sections, one <h2 id> per legalMeta.js entry) and `Plain` (the plain-words content).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from './meta';
import { LEGAL_DOCS } from './legalMeta';
import { BRAND_NAME, FORMER_NAME, LEGAL_ENTITY } from './brand';
import PrivacyBody, { Plain as PrivacyPlain } from './privacyContent';
import TermsBody, { Plain as TermsPlain } from './termsContent';

const CONTENT = {
  privacy: { Body: PrivacyBody, Plain: PrivacyPlain, other: 'terms' },
  terms: { Body: TermsBody, Plain: TermsPlain, other: 'privacy' },
};

const RENAMED = `${BRAND_NAME} was called ${FORMER_NAME} until October 2026. It is the same service under a new name; if you agreed to the ${FORMER_NAME} terms or privacy policy, these replace them.`;

export default function Legal({ doc }) {
  const d = LEGAL_DOCS[doc];
  const { Body, Plain, other } = CONTENT[doc];
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
    <>
      <section className="page-hero">
        <div className="wrap">
          <span className="kicker">Legal</span>
          <h1 className="display d-xl">{d.title}</h1>
          <p className="updated">Last updated {d.updated}</p>
        </div>
      </section>
      {/* The design's inline padding: the generated stylesheet has no rule for this section. */}
      <section style={{ paddingBottom: 'clamp(72px, 9vw, 120px)' }}>
        <div className="wrap legal">
          <nav className="toc" aria-label="On this page">
            {d.sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} aria-current={current === s.id ? 'true' : undefined}>{s.label}</a>
            ))}
          </nav>
          <article className="legal-body">
            <div className="plain" id="plain"><h2>In plain words</h2><Plain /></div>
            <p>{RENAMED}</p>
            <Body />
            <p className="small" style={{ marginTop: 24 }}>
              © 2026 {LEGAL_ENTITY} · <Link to={`/${other}`}>{LEGAL_DOCS[other].title}</Link> · <Link to="/delete-account">Delete your account</Link>
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
