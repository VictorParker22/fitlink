// /coach — the coach on the web: sign-in by email code or (when this build
// offers it) Sign in with Apple, existing accounts only (sign-up happens in
// the app); then a role gate: only a coach account sees the editor
// (2026-10-21; it used to open for any signed-in account).
// The header has what exists on the web (Dashboard with Coach Elite, Earnings,
// Seasons, Public page, Open the app); Athletes stays in the app. /coach itself is
// the dashboard (fee engine, 2026-10-25): web Elite checkout returns to
// /coach?elite=started|cancelled, so the index must not redirect (a redirect drops
// the query).
import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { supabase, APP_SCHEME } from './supabase';
import {
  appleAvailableHere, freshUser, isStandaloneHere, leaveUnfinishedAppleSignUp, myRole, signInWithApple, signOutLocal,
  standingInvite, takeAuthReturnNote,
} from './api';
import {
  appleSignUpUnfinished, usedApple, APPLE_NOT_COACH, CHECKING_ACCOUNT, NOT_COACH, NOT_COACH_TITLE, OR_EMAIL, ROLE_ERROR_TITLE,
  TOO_MANY_CODES, noAccountMessage, signInHint, siteCopy,
} from './appleAuth';
import { APPLE_WEB_ENABLED } from './authConfig';
import AppleButton from './AppleButton';
import SeasonEditor from './SeasonEditor';
import CoachDashboard from './CoachDashboard';
import CoachEarnings from './CoachEarnings';
import { BRAND_NAME } from './site/brand';
import './web.css';

const Loading = ({ text = 'Loading…' }) => <div className="fl"><div className="fl-empty"><p className="fl-note" aria-live="polite">{text}</p></div></div>;

/**
 * Sign out of this browser (even offline), then a fresh /coach: onAuthStateChange is
 * silent when storage had to be cleared by hand. Local scope, always: a global sign-out
 * would also sign the coach out of the app, and when /logout fails auth-js keeps the
 * session (the editor would stay signed in on a shared computer).
 */
function signOutHere() {
  return signOutLocal().then(() => window.location.assign('/coach'));
}

export default function CoachWeb() {
  const [sess, setSess] = useState(undefined);
  /** The one sentence the sign-in screen opens with: a failed return, a refused account, an expired sign-in. */
  const [note, setNote] = useState(null);
  /** Whose account the gate checked, and what it found: checking | coach | not_coach | error. */
  const [gate, setGate] = useState({ uid: null, state: 'checking' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();   // waits for the PKCE exchange
      const n = await takeAuthReturnNote();
      if (!alive) return;
      if (n) setNote(n);
      setSess(data.session ?? null);
    })();
    // Only state here: never await a Supabase call inside this callback (auth-js holds its lock).
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSess(s ?? null));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  // Re-checked when the signed-in user changes, never on a token refresh. Every
  // sentence for the sign-in screen is set BEFORE the sign-out: signing out
  // clears the session, which ends this run. Who the account is comes from the
  // server (freshUser), never the stored copy: a stale "unfinished Apple sign-up"
  // would make claim_athlete_role delete a coach row made in the app since.
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
        // Could not check: never the editor, never a write.
        setGate({ uid, state: 'error', message: err.message });
        return;
      }
      if (!alive) return;
      if (appleSignUpUnfinished(user)) {
        setNote(APPLE_NOT_COACH);
        await leaveUnfinishedAppleSignUp();
        if (alive) setSess(null);
        return;
      }
      setNote(null);
      try {
        const role = await myRole();
        if (!alive) return;
        if (role === 'coach') setGate({ uid, state: 'coach' });
        else setGate({ uid, state: 'not_coach', email: user?.email ?? '', apple: usedApple(user) });
      } catch (err) {
        if (!alive) return;
        if (err.code === 'unauthorized') {
          setNote(err.message);
          await signOutLocal();
          if (alive) setSess(null);
          return;
        }
        setGate({ uid, state: 'error', message: err.message });
      }
    })();
    return () => { alive = false; };
  }, [uid, attempt]);

  if (sess === undefined) return <Loading />;
  // Keyed by the sentence: a sentence that arrives after the screen is up opens it again with that sentence.
  if (!sess) return <div className="fl"><SignIn key={note ?? ''} note={note} /></div>;
  // A gate result belongs to the account it checked; anything else is still being checked.
  const state = gate.uid === uid ? gate.state : 'checking';
  if (state === 'checking') return <Loading text={CHECKING_ACCOUNT} />;
  if (state === 'error') {
    return <div className="fl"><RoleError message={gate.message} onRetry={() => { setGate({ uid, state: 'checking' }); setAttempt((n) => n + 1); }} /></div>;
  }
  if (state === 'not_coach') return <div className="fl"><NotCoach email={gate.email} apple={gate.apple} /></div>;
  return (
    <div className="fl">
      <Routes>
        <Route index element={<Shell session={sess}><CoachDashboard /></Shell>} />
        <Route path="earnings" element={<Shell session={sess}><CoachEarnings session={sess} /></Shell>} />
        <Route path="seasons" element={<Shell session={sess}><SeasonEditor session={sess} /></Shell>} />
        <Route path="seasons/:planId" element={<Shell session={sess}><SeasonEditor session={sess} /></Shell>} />
        <Route path="*" element={<Navigate to="/coach" replace />} />
      </Routes>
    </div>
  );
}

function Shell({ session, children }) {
  const [coach, setCoach] = useState(null);
  const [publicCode, setPublicCode] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('trainers').select('id, name').eq('id', session.user.id).limit(1);
      setCoach(data?.[0] ?? null);
      try { const inv = await standingInvite(); if (inv?.code) setPublicCode(inv.code); } catch { /* no link yet */ }
    })();
  }, [session.user.id]);

  return (
    <>
      <header className="fl-header">
        <div className="fl-header-bar fl-glass wide">
          <Link className="fl-brand" to="/coach">{BRAND_NAME}{coach?.name && <small>{coach.name}</small>}</Link>
          <nav className="fl-nav" aria-label="Coach">
            <NavLink to="/coach" end>Dashboard</NavLink>
            <NavLink to="/coach/earnings">Earnings</NavLink>
            <NavLink to="/coach/seasons">Seasons</NavLink>
            <a href={APP_SCHEME}>Home · in the app</a>
            {publicCode && <Link to={`/i/${publicCode}`}>Public page</Link>}
            <button type="button" onClick={signOutHere}>Sign out</button>
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}

/** The role read did not answer: never the editor, never "no profile". */
function RoleError({ message, onRetry }) {
  return (
    <div className="fl-signin">
      <span className="fl-kicker">{BRAND_NAME} · coach</span>
      <h1>{ROLE_ERROR_TITLE}</h1>
      <p className="fl-sub" style={{ fontSize: 16 }} role="alert">{message}</p>
      <button type="button" className="fl-btn accent lg" onClick={onRetry}>Check again</button>
      <button type="button" className="fl-btn quiet" onClick={signOutHere}>Sign out</button>
    </div>
  );
}

/** Signed in, but not as a coach (an athlete, or an account with neither row). */
function NotCoach({ email, apple }) {
  return (
    <div className="fl-signin">
      <span className="fl-kicker">{BRAND_NAME} · coach</span>
      <h1>{NOT_COACH_TITLE}</h1>
      <p className="fl-sub" style={{ fontSize: 16 }}>{NOT_COACH}</p>
      {email && <p className="fl-note">Signed in as <b>{email}</b>{apple ? ' with Apple' : ''}.</p>}
      <a className="fl-btn accent lg" href={APP_SCHEME}>Open the {BRAND_NAME} app</a>
      <button type="button" className="fl-btn quiet" onClick={signOutHere}>Sign out</button>
    </div>
  );
}

function SignIn({ note }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(note);
  const appleOk = appleAvailableHere();
  const [appleBusy, setAppleBusy] = useState(false);

  async function startApple() {
    setError(null);
    try { await signInWithApple('coach'); return true; } catch (e) { setError(e.message); return false; }
  }

  async function send(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false } });
    setBusy(false);
    if (err) {
      const text = String(err.message ?? '').toLowerCase();
      if (text.includes('signups') || text.includes('not allowed')) setError(noAccountMessage('coach', appleOk));
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
      <span className="fl-kicker">{BRAND_NAME} · coach</span>
      <h1>{sent ? 'Check your email' : 'Sign in'}</h1>
      <p className="fl-sub" style={{ fontSize: 16 }}>{sent ? `We sent a six-digit code to ${email}.` : siteCopy(appleOk).coachSignInSub}</p>
      {!sent && appleOk && (
        <>
          <AppleButton onPress={startApple} disabled={busy} onBusyChange={setAppleBusy} />
          <p className="fl-or">{OR_EMAIL}</p>
        </>
      )}
      {!sent ? (
        <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="fl-field"><label htmlFor="si-email">Email</label><input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" disabled={busy || appleBusy} /></div>
          <p className="fl-note">{signInHint('coach', { available: appleOk, enabled: APPLE_WEB_ENABLED, standalone: isStandaloneHere() })}</p>
          {error && <div className="fl-error" role="alert">{error}</div>}
          <button type="submit" className="fl-btn accent lg" disabled={busy || appleBusy}>{busy ? 'Sending…' : 'Email me a code'}</button>
        </form>
      ) : (
        <form onSubmit={verify} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="fl-field fl-code"><label htmlFor="si-code" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Code</label>
            <input id="si-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
          </div>
          {error && <div className="fl-error" role="alert">{error}</div>}
          <button type="submit" className="fl-btn accent lg" disabled={busy || code.replace(/\D/g, '').length !== 6}>{busy ? 'Checking…' : 'Sign in'}</button>
          <button type="button" className="fl-btn quiet" onClick={() => { setSent(false); setCode(''); }}>Use another email</button>
        </form>
      )}
    </div>
  );
}
