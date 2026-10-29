// /coach — the coach's dashboard on the web (fee engine, launch plan Sprint 1 PR 1): the
// Coach Elite panel (coach_fee_terms: tier, fee, paying athletes vs cap, read-only state,
// Founding dates, web / App Store Elite) with web Elite checkout (elite-checkout → Stripe's
// hosted page), and links to Earnings and Seasons. CoachWeb's gate lets only a coach
// account in. The rules and every sentence the panel builds are coachMoney.js.
//
// Elite checkout returns to /coach?elite=started|cancelled. The parameter is read once,
// removed from the address bar, and the terms read again: Stripe's webhook may land after
// the coach does, so "started" says Stripe is confirming (with Check again) until
// coach_fee_terms shows the subscription. Never "You're on Elite" before the server says so.
//
// A Founding coach in the free year (an athlete has paid) sets Elite up for after it: the
// buttons say nothing is charged until the year's end (coach_fee_terms `founding.free_until`),
// and the page leaves for Stripe only when elite-checkout's `firstChargeAt` names that same
// day; otherwise it says Stripe would charge today and asks again. Before the first paid
// athlete the panel shows elite-checkout's founding_active reason and no buttons.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { coachFeeTerms, signOutLocal, startEliteCheckout } from './api';
import {
  REREAD_CODES, RETURN_CANCELLED, RETURN_CONFIRMED, RETURN_CONFIRMING, checkoutKeepsPromise, dateWords, eliteView,
  isStripeCheckoutUrl, readEliteReturn, webEliteConfirmed,
} from './coachMoney';
import { usePageMeta } from './site/meta';
import CoachPagePanel from './CoachPagePanel';
import { APP_STORE_URL, BRAND_NAME } from './site/brand';
import { eliteElsewhereWords } from './eliteRegion';
import { useWebEliteOffered } from './useWebEliteOffered';

/** Re-reads after a "started" return while the webhook has not landed (ms after the first read). */
const CONFIRM_RETRIES_MS = [3000, 6000, 10000];

function signInAgain() {
  return signOutLocal().then(() => window.location.assign('/coach'));
}

export default function CoachDashboard() {
  usePageMeta('Coach dashboard', `Your ${BRAND_NAME} plan, fee and earnings.`);
  const location = useLocation();
  const navigate = useNavigate();
  // Read once, on arrival: a reload after the clean-up says nothing twice.
  const [ret] = useState(() => readEliteReturn(location.search).state);

  useEffect(() => {
    const r = readEliteReturn(location.search);
    if (r.search !== location.search) navigate({ pathname: location.pathname, search: r.search, hash: location.hash }, { replace: true });
  }, [location.search, location.pathname, location.hash, navigate]);

  return (
    <main className="fl-dash">
      <div className="fl-dash-head">
        <span className="fl-kicker">{BRAND_NAME} · coach</span>
        <h1>Dashboard</h1>
      </div>
      <ElitePanel ret={ret} />
      <CoachPagePanel />
      <nav className="fl-dash-links" aria-label="Coach pages">
        <Link className="fl-panel fl-dash-link" to="/coach/earnings">
          <b>Earnings</b>
          <span>Every payment with its fees, and what reached you, by month.</span>
        </Link>
        <Link className="fl-panel fl-dash-link" to="/coach/seasons">
          <b>Seasons</b>
          <span>Edit the weeks of a pass and publish them to your athletes.</span>
        </Link>
      </nav>
    </main>
  );
}

function ElitePanel({ ret }) {
  const [terms, setTerms] = useState({ state: 'loading' });
  const [busy, setBusy] = useState(null);
  const [refusal, setRefusal] = useState(null);
  /** elite-checkout opened a page that charges sooner than the panel said: { url, promised }. */
  const [chargesNow, setChargesNow] = useState(null);
  const [returnState, setReturnState] = useState(ret);
  const [attempt, setAttempt] = useState(0);
  const retries = useRef(0);
  // Web Elite is offered in the United States only (eliteRegion.js); null while the country is read.
  const offeredHere = useWebEliteOffered();

  // One read per attempt; "Check again" and the confirming retries start a new attempt.
  useEffect(() => {
    let alive = true;
    coachFeeTerms()
      .then((data) => { if (alive) setTerms({ state: 'ok', data }); })
      .catch((err) => { if (alive) setTerms({ state: 'error', message: err.message, code: err.code }); });
    return () => { alive = false; };
  }, [attempt]);

  const load = useCallback(() => {
    setTerms((t) => (t.state === 'ok' ? { ...t, rechecking: true } : { state: 'loading' }));
    setAttempt((n) => n + 1);
  }, []);

  // A "started" return: read again a few times while the webhook has not written the subscription.
  const confirmed = terms.state === 'ok' && webEliteConfirmed(terms.data);
  useEffect(() => {
    if (returnState !== 'started' || terms.state !== 'ok' || confirmed || terms.rechecking) return undefined;
    if (retries.current >= CONFIRM_RETRIES_MS.length) return undefined;
    const wait = CONFIRM_RETRIES_MS[retries.current];
    retries.current += 1;
    const id = setTimeout(load, wait);
    return () => clearTimeout(id);
  }, [returnState, terms, confirmed, load]);

  async function buy(interval, offer) {
    setBusy(interval);
    setRefusal(null);
    setChargesNow(null);
    setReturnState(null);
    try {
      const answer = await startEliteCheckout(interval);
      if (!isStripeCheckoutUrl(answer?.url)) {
        setRefusal({ message: 'Stripe didn’t send a payment page. Nothing was charged. Try again in a moment.' });
        setBusy(null);
        return;
      }
      if (!checkoutKeepsPromise(offer, answer)) {
        setChargesNow({ url: answer.url, promised: dateWords(offer.defersUntil), firstChargeAt: dateWords(answer?.firstChargeAt) });
        setBusy(null);
        return;
      }
      window.location.assign(answer.url);   // busy stays: the page is leaving for Stripe
    } catch (err) {
      setBusy(null);
      const message = err.outcomeUnknown ? `${err.message} Nothing is charged until you pay on Stripe’s page.` : err.message;
      setRefusal({ message, code: err.code, signedOut: err.code === 'unauthorized' || err.status === 401 });
      if (REREAD_CODES.has(err.code)) load();
    }
  }

  if (terms.state === 'loading') {
    return <section className="fl-panel fl-elite" aria-labelledby="elite-h" aria-busy="true"><h2 id="elite-h">Coach Elite</h2><p className="fl-note" aria-live="polite">Loading your plan…</p></section>;
  }
  if (terms.state === 'error') {
    return (
      <section className="fl-panel fl-elite" aria-labelledby="elite-h">
        <h2 id="elite-h">Coach Elite</h2>
        <div className="fl-error" role="alert">{terms.message}</div>
        {terms.code === 'unauthorized'
          ? <div className="fl-btnrow"><button type="button" className="fl-btn accent" onClick={signInAgain}>Sign in again</button></div>
          : terms.code !== 'not_deployed' && <div className="fl-btnrow"><button type="button" className="fl-btn" onClick={load}>Check again</button></div>}
      </section>
    );
  }

  const v = eliteView(terms.data);
  return (
    <section className="fl-panel fl-elite" aria-labelledby="elite-h">
      <div className="fl-elite-head">
        <h2 id="elite-h">Coach Elite</h2>
        <span className={`fl-tier ${v.tier}`}>{v.tierLabel}</span>
      </div>

      {returnState === 'cancelled' && <p className="fl-notice" role="status">{RETURN_CANCELLED}</p>}
      {returnState === 'started' && (
        confirmed
          ? <p className="fl-notice ok" role="status">{RETURN_CONFIRMED}</p>
          : (
            <div className="fl-notice" role="status">
              <p>{RETURN_CONFIRMING}</p>
              <button type="button" className="fl-btn sm" onClick={load} disabled={terms.rechecking}>{terms.rechecking ? 'Checking…' : 'Check again'}</button>
            </div>
          )
      )}

      <dl className="fl-facts">
        {v.feeLine && <div><dt>Your fee</dt><dd>{v.feeLine}</dd></div>}
        {v.athletesLine && <div><dt>Athletes</dt><dd>{v.athletesLine}</dd></div>}
      </dl>
      {v.warning && <p className="fl-warn" role="note">{v.warning}</p>}
      {v.lines.map((line) => <p key={line} className="fl-elite-line">{line}</p>)}
      {v.manage && <p className="fl-note">{v.manage}</p>}

      {/* Outside the United States the website offers no Elite checkout, only the app (eliteRegion.js). */}
      {v.canBuy && v.buy && offeredHere === false && (
        <>
          <p className="fl-elite-line fl-elite-offer">{eliteElsewhereWords(BRAND_NAME)}</p>
          <div className="fl-btnrow"><a className="fl-btn lg accent" href={APP_STORE_URL}>Get the app</a></div>
        </>
      )}
      {/* While Stripe is confirming a checkout that just went through, no second one. */}
      {v.canBuy && v.buy && offeredHere === true && !(returnState === 'started' && !confirmed) && (
        <>
          <p className="fl-elite-line fl-elite-offer">{v.buy.intro}</p>
          <div className="fl-btnrow">
            {v.buy.buttons.map((b) => (
              <button key={b.interval} type="button" className={`fl-btn lg ${b.interval === 'month' ? 'accent' : 'ink'}`} disabled={busy !== null} onClick={() => buy(b.interval, v.buy)}>
                {busy === b.interval ? 'Opening Stripe…' : b.label}
              </button>
            ))}
          </div>
          <p className="fl-note"><Link to="/pricing">Compare plans</Link></p>
        </>
      )}
      {chargesNow && (
        <div className="fl-warn" role="alert">
          <p>{chargesNow.firstChargeAt
            ? `Stripe would charge the first Elite payment on ${chargesNow.firstChargeAt}, not on ${chargesNow.promised}.`
            : `Stripe would charge the first Elite payment today, not on ${chargesNow.promised}.`} Nothing has been charged yet.</p>
          <div className="fl-btnrow">
            <a className="fl-btn sm" href={chargesNow.url}>Continue to Stripe anyway</a>
            <button type="button" className="fl-btn sm" onClick={() => { setChargesNow(null); load(); }}>Not now</button>
          </div>
        </div>
      )}
      {refusal && (
        <div className="fl-error" role="alert">
          {refusal.message}
          {refusal.signedOut && <> <button type="button" className="fl-btn sm" onClick={signInAgain}>Sign in again</button></>}
        </div>
      )}
    </section>
  );
}
