// /admin — the operator's funnel dashboard (launch plan Sprint 1 PR 6). Not linked from anywhere, noindex (a robots
// meta while mounted, and vercel.json's X-Robots-Tag). Sign-in is the email code of an EXISTING account
// (`shouldCreateUser: false`), as on /coach; there is no Apple button here (Apple's return paths are fixed and /admin is
// not one of them). The page writes nothing: the server's `platform_admins` decides who reads (fitlink-app migration
// 20261025140000), and `not_admin` from any of the three reads is "This account isn't an operator account." with
// Sign out. A failed read says so with Check again; a number the server did not send is never drawn as zero
// (adminModel.js; `node --test src/web/admin/adminModel.test.js`). Order: the scorecard (this month vs the month before,
// each number's one-line definition and Victor's targets from targets.js), the page funnel with drop-off per stage,
// then the coaches.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import {
  adminCoaches, adminPageFunnel, adminScorecard, freshUser, leaveUnfinishedAppleSignUp, signOutLocal, takeAuthReturnNote,
} from '../api';
import { appleSignUpUnfinished, CHECKING_ACCOUNT, ROLE_ERROR_TITLE, TOO_MANY_CODES } from '../appleAuth';
import { coachRows, coachSummary, dayLabel, funnelView, monthKey, monthOptions, scorecardView, WINDOWS } from './adminModel';
import { usePageMeta } from '../site/meta';
import { BRAND_NAME } from '../site/brand';
import '../web.css';
import './admin.css';

const NOT_OPERATOR = 'This account isn’t an operator account.';

/** A robots noindex while this page is mounted (the SPA has one index.html). */
function useNoIndex() {
  useEffect(() => {
    const tag = document.createElement('meta');
    tag.name = 'robots';
    tag.content = 'noindex, nofollow';
    document.head.appendChild(tag);
    return () => tag.remove();
  }, []);
}

function signOutHere() {
  return signOutLocal().then(() => window.location.assign('/admin'));
}

const Loading = ({ text = 'Loading…' }) => <div className="fl-empty"><p className="fl-note" aria-live="polite">{text}</p></div>;

export default function AdminDashboard() {
  useNoIndex();
  usePageMeta('Operator dashboard', `${BRAND_NAME}'s launch numbers.`);
  const [sess, setSess] = useState(undefined);
  const [note, setNote] = useState(null);
  const [gate, setGate] = useState({ uid: null, state: 'checking' });
  const [attempt, setAttempt] = useState(0);
  // A read answered 401: the sentence for the sign-in screen first, then the sign-out (it ends this screen).
  const signedOut = useCallback((message) => { setNote(message); signOutLocal().then(() => setSess(null)); }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const n = await takeAuthReturnNote();
      if (!alive) return;
      if (n) setNote(n);
      setSess(data.session ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSess(s ?? null));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  // Who the account is comes from the server (freshUser), never the stored copy. Nothing is written here except the
  // one rule every web path keeps: an Apple sign-up nobody finished loses its default coach row and is signed out.
  const uid = sess?.user?.id ?? null;
  useEffect(() => {
    if (!uid) return undefined;
    let alive = true;
    (async () => {
      let user;
      try {
        user = await freshUser();
      } catch (err) {
        if (!alive) return;
        if (err.code === 'unauthorized') {
          setNote(err.message);
          await signOutLocal();
          if (alive) setSess(null);
          return;
        }
        setGate({ uid, state: 'error', message: err.message });
        return;
      }
      if (!alive) return;
      if (appleSignUpUnfinished(user)) {
        setNote(NOT_OPERATOR);
        await leaveUnfinishedAppleSignUp();
        if (alive) setSess(null);
        return;
      }
      setNote(null);
      setGate({ uid, state: 'ready', email: user?.email || (user?.phone ? `+${String(user.phone).replace(/^\+/, '')}` : '') });
    })();
    return () => { alive = false; };
  }, [uid, attempt]);

  let body;
  if (sess === undefined) body = <Loading />;
  else if (!sess) body = <SignIn key={note ?? ''} note={note} />;
  else {
    const state = gate.uid === uid ? gate.state : 'checking';
    if (state === 'checking') body = <Loading text={CHECKING_ACCOUNT} />;
    else if (state === 'error') {
      body = (
        <div className="fl-signin">
          <h1>{ROLE_ERROR_TITLE}</h1>
          <p className="fl-sub" role="alert">{gate.message}</p>
          <button type="button" className="fl-btn accent lg" onClick={() => { setGate({ uid, state: 'checking' }); setAttempt((n) => n + 1); }}>Check again</button>
          <button type="button" className="fl-btn quiet" onClick={signOutHere}>Sign out</button>
        </div>
      );
    } else {
      body = (
        <Dashboard
          key={uid}
          email={gate.email}
          onSignedOut={signedOut}
        />
      );
    }
  }
  return <div className="fl ad">{body}</div>;
}

function SignIn({ note }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(note);

  async function send(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false } });
    setBusy(false);
    if (err) {
      const text = String(err.message ?? '').toLowerCase();
      if (text.includes('signups') || text.includes('not allowed')) setError(`No ${BRAND_NAME} account uses that email. Check the address.`);
      else if (text.includes('rate') || err.status === 429) setError(TOO_MANY_CODES);
      else setError('Couldn’t send the code. Check the address and try again.');
      return;
    }
    setSent(true);
  }

  async function verify(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.replace(/\D/g, ''), type: 'email' });
    setBusy(false);
    if (err) setError('That code didn’t match. Check it or ask for a new one.');
  }

  return (
    <div className="fl-signin">
      <span className="fl-kicker">{BRAND_NAME} · operator</span>
      <h1>{sent ? 'Check your email' : 'Sign in'}</h1>
      <p className="fl-sub">{sent ? `We sent a six-digit code to ${email}.` : 'The launch numbers, for operator accounts. We’ll email you a six-digit code.'}</p>
      {!sent ? (
        <form onSubmit={send} className="ad-form">
          <div className="fl-field"><label htmlFor="ad-email">Email</label><input id="ad-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" disabled={busy} /></div>
          {error && <div className="fl-error" role="alert">{error}</div>}
          <button type="submit" className="fl-btn accent lg" disabled={busy}>{busy ? 'Sending…' : 'Email me a code'}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="ad-form">
          <div className="fl-field fl-code"><label htmlFor="ad-code" className="ad-sr">Code</label>
            <input id="ad-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
          </div>
          {error && <div className="fl-error" role="alert">{error}</div>}
          <button type="submit" className="fl-btn accent lg" disabled={busy || code.replace(/\D/g, '').length !== 6}>{busy ? 'Checking…' : 'Sign in'}</button>
          <button type="button" className="fl-btn quiet" onClick={() => { setSent(false); setCode(''); }}>Use another email</button>
        </form>
      )}
    </div>
  );
}

/** One server read: {state: 'loading' | 'ok' | 'error', data, error}. Re-read on `key` or `again()`. */
function useRead(read, key) {
  const [res, setRes] = useState({ state: 'loading', key: null });
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    read()
      .then((data) => { if (alive) setRes({ state: 'ok', data, key }); })
      .catch((error) => { if (alive) setRes({ state: 'error', error, key }); });
    return () => { alive = false; };
    // `read` is rebuilt each render; the key and the attempt decide when to read again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, n]);
  const current = res.key === key && res.state !== 'loading' ? res : { state: 'loading' };
  return [current, () => { setRes({ state: 'loading', key: null }); setN((x) => x + 1); }];
}

function Dashboard({ email, onSignedOut }) {
  const [month, setMonth] = useState(() => monthKey());
  const [days, setDays] = useState(30);
  const options = useMemo(() => monthOptions(), []);
  const [card, againCard] = useRead(() => adminScorecard(month), month);
  const [funnel, againFunnel] = useRead(() => adminPageFunnel(days), `f${days}`);
  const [coaches, againCoaches] = useRead(() => adminCoaches(days), `c${days}`);

  const errors = [card, funnel, coaches].filter((r) => r.state === 'error').map((r) => r.error);
  const signedOut = errors.find((e) => e.code === 'unauthorized');
  useEffect(() => { if (signedOut) onSignedOut(signedOut.message); }, [signedOut, onSignedOut]);

  if (errors.some((e) => e.code === 'not_admin')) {
    return (
      <div className="fl-signin">
        <span className="fl-kicker">{BRAND_NAME} · operator</span>
        <h1>Not an operator account</h1>
        <p className="fl-sub">{NOT_OPERATOR}</p>
        {email && <p className="fl-note">Signed in as <b>{email}</b>.</p>}
        <button type="button" className="fl-btn accent lg" onClick={signOutHere}>Sign out</button>
      </div>
    );
  }

  const again = () => { againCard(); againFunnel(); againCoaches(); };
  return (
    <main className="fl-dash ad-dash">
      <div className="ad-top">
        <div className="fl-dash-head">
          <span className="fl-kicker">{BRAND_NAME} · operator</span>
          <h1>Launch numbers</h1>
        </div>
        <div className="ad-who">
          {email && <span>Signed in as <b>{email}</b></span>}
          <button type="button" className="fl-btn" onClick={again}>Reload</button>
          <button type="button" className="fl-btn quiet" onClick={signOutHere}>Sign out</button>
        </div>
      </div>

      <section className="fl-panel" aria-labelledby="ad-score">
        <div className="ad-row">
          <h2 id="ad-score">Scorecard</h2>
          <label className="ad-pick">
            <span>Month</span>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {options.map((o, i) => <option key={o.value} value={o.value}>{i === 0 ? `${o.label} (this month)` : o.label}</option>)}
            </select>
          </label>
        </div>
        <Read res={card} onAgain={againCard} loading="Loading the scorecard…">{(data) => <Scorecard data={data} />}</Read>
      </section>

      <div className="ad-row ad-window">
        <span>Page funnel and coaches over</span>
        <div className="ad-chips" role="group" aria-label="Window">
          {WINDOWS.map((d) => (
            <button key={d} type="button" className="fl-chip" aria-pressed={days === d} onClick={() => setDays(d)}>Last {d} days</button>
          ))}
        </div>
      </div>

      <section className="fl-panel" aria-labelledby="ad-funnel">
        <h2 id="ad-funnel">Coach page funnel</h2>
        <Read res={funnel} onAgain={againFunnel} loading="Loading the funnel…">{(data) => <Funnel data={data} />}</Read>
      </section>

      <section className="fl-panel" aria-labelledby="ad-coaches">
        <h2 id="ad-coaches">Coaches</h2>
        <Read res={coaches} onAgain={againCoaches} loading="Loading the coaches…">{(data) => <Coaches data={data} />}</Read>
      </section>
    </main>
  );
}

/** A section's read: loading line, the failure in words with Check again, or the content. */
function Read({ res, onAgain, loading, children }) {
  if (res.state === 'loading') return <p className="fl-note" aria-live="polite">{loading}</p>;
  if (res.state === 'error') {
    return (
      <div className="ad-fail">
        <div className="fl-error" role="alert">{res.error?.message}</div>
        <button type="button" className="fl-btn" onClick={onAgain}>Check again</button>
      </div>
    );
  }
  return children(res.data);
}

function Scorecard({ data }) {
  const v = scorecardView(data);
  return (
    <>
      <p className="fl-note">
        {v.month}{v.inProgress ? ` so far (as of ${v.asOf ?? 'now'})` : ''} beside {v.previousMonth}. Months are UTC calendar months.
        {v.paidPayment ? ` ${v.paidPayment}` : ''}
      </p>
      <ul className="ad-metrics">
        {v.rows.map((r) => (
          <li key={r.key} className="ad-metric">
            <h3>{r.label}</h3>
            <div className="ad-values">
              <div className="ad-now">
                <span className="ad-when">{v.month}</span>
                {r.value !== null
                  ? <><b>{r.value}</b>{r.qualifier && <span className="ad-qual">{r.qualifier}</span>}</>
                  : <span className="ad-none">{r.empty}</span>}
                {r.detail && <span className="ad-detail">{r.detail}</span>}
              </div>
              <div className="ad-prev">
                <span className="ad-when">{v.previousMonth}</span>
                {r.previous.value !== null
                  ? <b>{r.previous.value}</b>
                  : <span className="ad-none">{r.previous.empty}</span>}
                {r.previous.detail && <span className="ad-detail">{r.previous.detail}</span>}
              </div>
            </div>
            {r.definition && <p className="ad-def">{r.definition}</p>}
            {r.notes?.map((n) => <p key={n} className="ad-def">{n}</p>)}
            {r.targets.length > 0 && (
              <p className="ad-targets">Targets — {r.targets.map((t) => `${t.label}: ${t.text}`).join(' · ')}</p>
            )}
          </li>
        ))}
      </ul>
      {v.notInData.length > 0 && (
        <div className="ad-notin">
          <h3>Not in this data</h3>
          <ul>{v.notInData.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      )}
    </>
  );
}

function Funnel({ data }) {
  const v = funnelView(data);
  return (
    <>
      <p className="fl-note">
        Last {v.days ?? '—'} days, every coach page together{v.pagesViewed ? ` (${v.pagesViewed} pages opened)` : ''}. Each stage counts
        browser sessions; Paid counts page purchases that took their payment. The first three are reported by the browser.
      </p>
      {v.empty && <p className="ad-none">No coach page was opened in these days.</p>}
      <ol className="ad-funnel">
        {v.stages.map((s) => (
          <li key={s.key}>
            <div className="ad-stage">
              <span>{s.label}</span>
              <b>{s.count ?? '—'} <small>{s.unit}</small></b>
            </div>
            <div className="ad-bar" aria-hidden="true"><span style={{ width: `${s.bar}%` }} /></div>
            {(s.dropOff || s.ofViews) && (
              <p className="ad-detail">{[s.dropOff, s.ofViews ? `${s.ofViews} of page openers` : null].filter(Boolean).join(' · ')}</p>
            )}
          </li>
        ))}
      </ol>
      <div className="ad-sources">
        <Sources title="Where visitors came from" rows={v.referrers} empty="No page views in these days." />
        <Sources title="UTM sources" rows={v.sources} empty="No page views in these days." />
      </div>
    </>
  );
}

function Sources({ title, rows, empty }) {
  return (
    <div>
      <h3>{title}</h3>
      {rows.length === 0 ? <p className="fl-note">{empty}</p> : (
        <ul className="ad-src">
          {rows.map((r) => (
            <li key={r.label}><span className={r.none ? 'ad-muted' : undefined}>{r.label}</span><b>{r.sessions}{r.share && <small> · {r.share}</small>}</b></li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Coaches({ data }) {
  const rows = coachRows(data);
  const summary = coachSummary(data);
  return (
    <>
      {summary && <p className="fl-note">{summary} Paying athletes is always the last 30 days; GMV, payments and the funnel are the window.</p>}
      {data?.generated_at && <p className="fl-note">Read {dayLabel(data.generated_at)}.</p>}
      {rows.length === 0 ? <p className="ad-none">No coach has a page, a payment or a page visit yet.</p> : (
        <table className="ad-table">
          <thead>
            <tr>
              <th scope="col">Coach</th>
              <th scope="col">Activated</th>
              <th scope="col">Paying athletes</th>
              <th scope="col">GMV</th>
              <th scope="col">Payments</th>
              <th scope="col">Plan</th>
              <th scope="col">Page funnel</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row" data-label="Coach">{r.name}{r.handle && <small>{r.handle}</small>}</th>
                <td data-label="Activated">{r.activated}</td>
                <td data-label="Paying athletes">{r.athletes}</td>
                <td data-label="GMV">{r.gmv}</td>
                <td data-label="Payments">{r.payments}</td>
                <td data-label="Plan">{r.status}</td>
                <td data-label="Page funnel" title="Opened → tapped a pass → started checkout → paid">{r.funnel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
