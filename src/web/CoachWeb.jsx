// /coach — the coach on the web: an email-code sign-in (existing accounts
// only; sign-up happens in the app), then the season editor. The header
// has what exists on the web (Seasons, Public page, Open the app); Home,
// Athletes and Money stay in the app until they are built here.
import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { supabase, APP_SCHEME } from './supabase';
import { standingInvite } from './api';
import SeasonEditor from './SeasonEditor';
import './web.css';

export default function CoachWeb() {
  const [sess, setSess] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSess(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSess(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (sess === undefined) return <div className="fl"><div className="fl-empty"><p className="fl-note">Loading…</p></div></div>;
  if (!sess) return <div className="fl"><SignIn /></div>;
  return (
    <div className="fl">
      <Routes>
        <Route index element={<Navigate to="seasons" replace />} />
        <Route path="seasons" element={<Shell session={sess}><SeasonEditor session={sess} /></Shell>} />
        <Route path="seasons/:planId" element={<Shell session={sess}><SeasonEditor session={sess} /></Shell>} />
        <Route path="*" element={<Navigate to="seasons" replace />} />
      </Routes>
    </div>
  );
}

function Shell({ session, children }) {
  const [coach, setCoach] = useState(null);
  const [publicCode, setPublicCode] = useState(null);
  const navigate = useNavigate();

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
          <Link className="fl-brand" to="/coach/seasons">FitLink{coach?.name && <small>{coach.name}</small>}</Link>
          <nav className="fl-nav" aria-label="Coach">
            <a href={APP_SCHEME}>Home · in the app</a>
            <Link to="/coach/seasons" aria-current="page">Seasons</Link>
            {publicCode && <Link to={`/i/${publicCode}`}>Public page</Link>}
            <button type="button" onClick={async () => { await supabase.auth.signOut(); navigate('/coach'); }}>Sign out</button>
          </nav>
        </div>
      </header>
      {coach === null && coach !== undefined ? null : null}
      {children}
    </>
  );
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function send(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false } });
    setBusy(false);
    if (err) { setError(err.message?.toLowerCase().includes('signups') ? 'No account with that email. Sign up in the FitLink app first.' : 'Couldn’t send the code. Check the address and try again.'); return; }
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
      <span className="fl-kicker">FitLink · coach</span>
      <h1>{sent ? 'Check your email' : 'Sign in'}</h1>
      <p className="fl-sub" style={{ fontSize: 16 }}>{sent ? `We sent a six-digit code to ${email}.` : 'The same account as the app. We email you a six-digit code; no password.'}</p>
      {!sent ? (
        <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="fl-field"><label htmlFor="si-email">Email</label><input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
          {error && <div className="fl-error" role="alert">{error}</div>}
          <button type="submit" className="fl-btn accent lg" disabled={busy}>{busy ? 'Sending…' : 'Email me a code'}</button>
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
