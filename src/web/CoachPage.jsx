// /c/:handle — a coach's public page as a growth surface (launch plan Sprint 1 PR 3, 2026-10-25; fitlink-app
// migration 20261025130000, rollout `supabase/manual/ROLLOUT_20261025_coach_page.md`). Mobile-first, the shape of
// a bio link: ONE hero (photo, name, sport, the Founding badge, the next block's date), the passes for sale below,
// the session cancellation rules when a session is listed, and the footer "Coached on <brand> · Start coaching →".
// Nothing else (no marketing nav, no how-it-works).
//
// Everything on it is `coach_page(handle)`'s answer (coachPage.js pageModel): prices are the server's per-payment
// `total_cents` (Model B's booking fee inside it, said on its own line), so the "($X in all)" total and the Pay
// button show what create-subscription charges BEFORE the card form (the New York total rule). `buyable` /
// `on_sale` are the server's. A retired handle redirects (client-side replace) to the coach's new page; no page is
// the 404 page.
//
// Buying is the existing web checkout (Checkout.jsx), unchanged in its rules: nothing is joined or bought before
// the person acts (their own code, their own Apple return, or Continue under "Signed in as …"); then page_invite
// gives the coach's standing invite code and athlete-exit's preview / confirm run with the plan id;
// create-subscription gets `source: 'coach_page'` + this tab's page session. Apple returns through /join, which
// moves back here (the parked handle) and reopens the sheet.
//
// The funnel (log_page_event, fire and forget): page_view once per load, pass_tap on Buy, checkout_start when the
// card form opens; the referrer's host only and the utm_* values. Nothing is logged while the coach looks at their
// own page signed in (the stored session's uid is the coach's id). `paid` is the server's.
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { coachPage, freshUser, leaveUnfinishedAppleSignUp, logPageEvent, session, takeAuthReturnNote } from './api';
import { appleSignUpUnfinished, RESUME_PASS_GONE, RESUME_SIGNED_OUT } from './appleAuth';
import { coachPolicyIntro, freeCancelLine, passKind } from './blocks';
import { eventParams, isSessionKey, nextBlockLine, pageModel, passCard, sessionKeyFrom, PAGE_SESSION_KEY } from './coachPage';
import { pageHandle } from './handles';
import { BRAND_NAME } from './site/brand';
import Checkout from './Checkout';
import FoundingBadge from './FoundingBadge';
import NotFound from './site/NotFound';
import './web.css';

const Check = ({ dark }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" style={{ fill: 'none', stroke: dark ? '#F3F1EC' : '#15171C', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
  </svg>
);

/** This tab's page session (32 random characters, sessionStorage); an in-memory one when storage is unavailable. */
function readPageSession() {
  try {
    const kept = window.sessionStorage.getItem(PAGE_SESSION_KEY);
    if (isSessionKey(kept)) return kept;
  } catch { /* no storage */ }
  let key;
  try { key = sessionKeyFrom(window.crypto.getRandomValues(new Uint8Array(24))); } catch { return null; }
  if (!key) return null;
  try { window.sessionStorage.setItem(PAGE_SESSION_KEY, key); } catch { /* in memory for this load */ }
  return key;
}

const initials = (name) => String(name ?? '').trim().split(/\s+/).slice(0, 2).map((w) => Array.from(w)[0] ?? '').join('').toUpperCase();

export default function CoachPage() {
  const { handle: raw } = useParams();
  const handle = pageHandle(raw);
  const location = useLocation();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  // The answer for one handle and attempt; anything else is still loading (no reset inside the effect).
  const loadKey = `${handle}:${attempt}`;
  const [loaded, setLoaded] = useState({ key: null, status: 'loading', model: null, message: null });
  const state = !handle ? { status: 'not_found', model: null, message: null } : loaded.key === loadKey ? loaded : { status: 'loading', model: null, message: null };
  const [buying, setBuying] = useState(null);
  const [now] = useState(() => Date.now());
  const [pageSession] = useState(readPageSession);
  /** null while unknown; true when the signed-in browser is the coach (no events). */
  const [isSelf, setIsSelf] = useState(null);
  const viewLogged = useRef(null);

  // Back from Sign in with Apple through /join: { planId, note, name }.
  const resumeRef = useRef(location.state?.resume ?? null);
  const [resume, setResume] = useState(null);
  const [resumeMissing, setResumeMissing] = useState(false);
  const [resumeSignedOut, setResumeSignedOut] = useState(false);

  // No sign-in returns here: take any auth parameters out of the address bar, silently. The `spa` marker (the
  // link-preview function's fallback) goes too, and a handle typed in capitals becomes the page's own.
  useEffect(() => {
    takeAuthReturnNote();
    const q = new URLSearchParams(location.search);
    const hadSpa = q.has('spa');
    q.delete('spa');
    const path = handle && raw !== handle ? `/c/${handle}` : location.pathname;
    if (hadSpa || path !== location.pathname) {
      const s = q.toString();
      navigate(`${path}${s ? `?${s}` : ''}${location.hash}`, { replace: true, state: location.state });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  useEffect(() => {
    if (!handle) return undefined;
    let alive = true;
    const setState = (v) => setLoaded({ key: loadKey, ...v });
    coachPage(handle).then((answer) => {
      if (!alive) return;
      const model = pageModel(answer);
      if (model.kind === 'redirect') {
        const q = new URLSearchParams(location.search);
        q.delete('spa');
        const s = q.toString();
        navigate(`/c/${model.handle}${s ? `?${s}` : ''}`, { replace: true, state: location.state });
        return;
      }
      if (model.kind === 'not_found') { setState({ status: 'not_found', model: null, message: null }); return; }
      if (model.kind !== 'found') {
        setState({ status: 'error', model: null, message: `${BRAND_NAME} sent an answer this page can’t read. Try again in a moment.` });
        return;
      }
      setState({ status: 'found', model, message: null });
    }).catch((err) => {
      if (!alive) return;
      setState({ status: 'error', model: null, message: err?.code === 'rate_limited' ? (err.message || 'Too many pages opened from this connection. Try again in an hour.') : err?.message });
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadKey]);

  const model = state.status === 'found' ? state.model : null;
  const coachId = model?.coach.id ?? null;

  // The coach looking at their own page while signed in: no events (the stored session is enough to tell).
  useEffect(() => {
    if (!coachId) return undefined;
    let alive = true;
    session().then((s) => { if (alive) setIsSelf(s?.user?.id === coachId); }).catch(() => { if (alive) setIsSelf(false); });
    return () => { alive = false; };
  }, [coachId]);

  const pageName = model?.handle ?? handle;
  function log(kind, planId = null) {
    if (isSelf !== false || !pageName) return;
    logPageEvent(eventParams({ handle: pageName, kind, planId, sessionKey: pageSession, referrer: document.referrer, search: location.search }));
  }

  // page_view: once per page load (per handle), after the self check.
  useEffect(() => {
    if (!model || isSelf !== false || viewLogged.current === pageName) return;
    viewLogged.current = pageName;
    log('page_view');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, isSelf, pageName]);

  useEffect(() => {
    if (model) document.title = `${model.coach.name} · ${BRAND_NAME}`;
  }, [model]);

  // Reopen the checkout after this tab's Apple sign-in, or say the pass is gone (and leave an unfinished sign-up).
  useEffect(() => {
    const r = resumeRef.current;
    if (!r || state.status === 'loading') return;
    resumeRef.current = null;
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });   // a reload must not reopen it
    const pass = model?.passes.find((p) => p.id === r.planId && p.buyable) ?? null;
    if (pass && model.coach.takesCards) { setResume({ returnNote: r.note ?? null, resumeName: r.name ?? '' }); setBuying(pass); return; }
    setResumeMissing(true);
    (async () => {
      if (!(await session())) return;
      const user = await freshUser().catch(() => null);
      if (!appleSignUpUnfinished(user)) return;
      await leaveUnfinishedAppleSignUp();
      setResumeSignedOut(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  if (state.status === 'not_found') return <NotFound />;
  if (state.status === 'loading') {
    return <div className="fl fl-cp"><main className="fl-cp-col"><p className="fl-note" aria-live="polite">Loading…</p></main></div>;
  }
  if (state.status === 'error') {
    return (
      <div className="fl fl-cp"><main className="fl-cp-col">
        <h1 className="fl-title">Couldn’t load this page</h1>
        <p className="fl-sub" role="alert">{state.message || `${BRAND_NAME} couldn’t load this page right now. Try again in a moment.`}</p>
        <div className="fl-actions"><button type="button" className="fl-btn accent lg" onClick={() => setAttempt((n) => n + 1)}>Try again</button></div>
      </main></div>
    );
  }

  const { coach, passes } = model;
  const first = coach.first;
  const next = nextBlockLine(model.nextBlock, now);
  const sessions = passes.filter((p) => passKind(p.plan) === 'session');
  const anyOnSale = passes.some((p) => p.onSale);

  function buy(pass) {
    setResumeMissing(false);
    setResumeSignedOut(false);
    setResume(null);
    log('pass_tap', pass.id);
    setBuying(pass);
  }

  return (
    <div className="fl fl-cp">
      <main className="fl-cp-col">
        <header className="fl-cp-hero" aria-label={coach.name}>
          {coach.photo
            ? <img className="fl-cp-photo" src={coach.photo} alt="" referrerPolicy="no-referrer" />
            : <div className="fl-cp-photo empty" aria-hidden="true">{initials(coach.name)}</div>}
          <h1 className="fl-cp-name">{coach.name}</h1>
          {coach.sport && <p className="fl-cp-sport">{coach.sport}</p>}
          {coach.founding && <FoundingBadge />}
          {next && <p className="fl-cp-next">{next}</p>}
        </header>

        <section aria-labelledby="cp-passes-h" className="fl-cp-passes">
          <h2 id="cp-passes-h" className="fl-cp-h2">{passes.length > 0 ? 'Pick a pass' : 'No pass for sale yet'}</h2>
          {passes.length === 0 && <p className="fl-sub">{first} hasn’t put a pass on sale. Ask them, or check back soon.</p>}
          {passes.length > 0 && anyOnSale && !coach.takesCards && (
            <p className="fl-note" role="note">{first} isn’t taking card payments yet, so nothing here can be bought today.</p>
          )}
          {passes.length > 0 && coach.takesCards && <p className="fl-note">Pay here by card. No app needed to buy.</p>}
          {resumeMissing && <div className="fl-error" role="alert">{RESUME_PASS_GONE}{resumeSignedOut ? ` ${RESUME_SIGNED_OUT}` : ''}</div>}
          {passes.map((pass) => {
            const card = passCard(pass, now, { first, takesCards: coach.takesCards });
            return (
              <article key={pass.id} className="fl-pass fl-cp-pass" aria-labelledby={`cp-${pass.id}`}>
                <div className="fl-pass-head"><h3 id={`cp-${pass.id}`}>{pass.plan.name}</h3></div>
                <div className="fl-price"><b>{card.amount}</b><span>{card.unit}</span></div>
                {card.lines.length > 0 && <ul>{card.lines.map((l, i) => <li key={i}><Check />{l}</li>)}</ul>}
                {card.button
                  ? <button type="button" className="fl-btn accent lg" onClick={() => buy(pass)}>{card.button}</button>
                  : <p className="fl-unpriced">{card.reason}</p>}
              </article>
            );
          })}
        </section>

        {sessions.length > 0 && (
          <section aria-labelledby="cp-cancel-h" className="fl-policy fl-cp-policy">
            <h2 id="cp-cancel-h" className="fl-h3">Cancelling a session</h2>
            <p>{freeCancelLine()}</p>
            <p>{coachPolicyIntro(first, coach.policy)}</p>
            {coach.policy && <blockquote className="fl-policy-text">{coach.policy}</blockquote>}
          </section>
        )}

        <footer className="fl-cp-foot">
          <span>Coached on {BRAND_NAME}</span>
          <span aria-hidden="true"> · </span>
          <Link to="/founding">Start coaching →</Link>
        </footer>
      </main>

      {buying && (
        <Checkout plan={buying.plan} coach={{ id: coach.id, name: coach.name }} code={null}
          pageHandle={pageName} pageSession={pageSession} pageTotal={buying.total}
          onCardForm={() => log('checkout_start', buying.id)}
          returnNote={resume?.returnNote ?? null} resumeName={resume?.resumeName ?? ''} resumed={resume !== null}
          onClose={() => { setBuying(null); setResume(null); }} />
      )}
    </div>
  );
}
