// /join — where Sign in with Apple returns when it started at checkout. A fixed path
// outside the AASA paths (/i/*, /live/*), so the installed app never takes the
// return (the app has no code verifier). Reads ONLY what this tab parked in
// sessionStorage before leaving (code, plan id, typed name; 30 minutes), never the
// URL, then moves client-side to the coach's page (/i/CODE, or /c/<handle> since 2026-10-25), which reopens the
// checkout.
//
// Nothing parked (another tab, storage cleared, more than 30 minutes) while the
// exchange still signed the browser in: a sign-up nobody finished (every identity
// Apple, no role, read from the server) loses the trainers row handle_new_user made
// by default (its name is public in trainers_public) and is signed out, as /coach
// does it; any other account is named, with Sign out. Never a silent sign-in.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { freshUser, leaveUnfinishedAppleSignUp, session, signOutLocal, takeAuthReturnNote, takeParkedCheckout } from './api';
import { accountLabel, appleSignUpUnfinished, usedApple, JOIN_NOTHING_TITLE, JOIN_NOTHING_BODY, JOIN_SIGNED_OUT } from './appleAuth';
import './web.css';

export default function JoinReturn() {
  const navigate = useNavigate();
  const started = useRef(false);
  /** null while working; { signedOut } | { who, apple } | {} once there is nothing to finish. */
  const [nothing, setNothing] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (started.current) return;      // StrictMode runs effects twice in development
    started.current = true;
    (async () => {
      const note = await takeAuthReturnNote();
      const parked = takeParkedCheckout();
      if (parked) {
        // An invite link (/i/CODE) or a coach page (/c/<handle>): both reopen the same checkout on that pass.
        const back = parked.handle ? `/c/${parked.handle}` : `/i/${parked.code}`;
        navigate(back, { replace: true, state: { resume: { planId: parked.planId, note, name: parked.name } } });
        return;
      }
      const s = await session();
      if (!s) { setNothing({}); return; }
      const user = await freshUser().catch(() => null);
      if (appleSignUpUnfinished(user)) {
        await leaveUnfinishedAppleSignUp();
        setNothing({ signedOut: true });
        return;
      }
      // Display only (the stored copy when the server can't be reached): who this browser is signed in as.
      const shown = user ?? s.user;
      setNothing({ who: accountLabel(shown), apple: usedApple(shown) });
    })();
  }, [navigate]);

  async function signOut() {
    setBusy(true);
    await signOutLocal();
    setBusy(false);
    setNothing({ signedOut: true });
  }

  if (!nothing) return <div className="fl"><div className="fl-empty"><p className="fl-note" aria-live="polite">One moment…</p></div></div>;
  const signedIn = nothing.who !== undefined;
  return (
    <div className="fl"><div className="fl-empty">
      <h1 className="fl-title">{JOIN_NOTHING_TITLE}</h1>
      <p className="fl-sub">{JOIN_NOTHING_BODY}</p>
      {nothing.signedOut && <p className="fl-note" role="status">{JOIN_SIGNED_OUT}</p>}
      {signedIn && (
        <p className="fl-note">Signed in{nothing.who ? <> as <b>{nothing.who}</b></> : ''}{nothing.apple ? ' with Apple' : ''}.</p>
      )}
      <div className="fl-actions">
        <Link className="fl-btn accent lg" to="/">FitLink home</Link>
        {signedIn && <button type="button" className="fl-btn lg" disabled={busy} onClick={signOut}>Sign out</button>}
      </div>
    </div></div>
  );
}
