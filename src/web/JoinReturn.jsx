// /join — where Sign in with Apple returns when it started at checkout. A fixed path
// outside the AASA paths (/i/*, /live/*), so the installed app never takes the
// return (the app has no code verifier). Reads ONLY what this tab parked in
// sessionStorage before leaving (code, plan id, typed name; 30 minutes), never the
// URL, then moves client-side to the coach's page, which reopens the checkout.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { takeAuthReturnNote, takeParkedCheckout } from './api';
import { JOIN_NOTHING_TITLE, JOIN_NOTHING_BODY } from './appleAuth';
import './web.css';

export default function JoinReturn() {
  const navigate = useNavigate();
  const started = useRef(false);
  const [nothing, setNothing] = useState(false);
  useEffect(() => {
    if (started.current) return;      // StrictMode runs effects twice in development
    started.current = true;
    (async () => {
      const note = await takeAuthReturnNote();
      const parked = takeParkedCheckout();
      if (!parked) { setNothing(true); return; }
      navigate(`/i/${parked.code}`, { replace: true, state: { resume: { planId: parked.planId, note, name: parked.name } } });
    })();
  }, [navigate]);
  if (!nothing) return <div className="fl"><div className="fl-empty"><p className="fl-note" aria-live="polite">One moment…</p></div></div>;
  return (
    <div className="fl"><div className="fl-empty">
      <h1 className="fl-title">{JOIN_NOTHING_TITLE}</h1>
      <p className="fl-sub">{JOIN_NOTHING_BODY}</p>
      <div className="fl-actions"><Link className="fl-btn accent lg" to="/">FitLink home</Link></div>
    </div></div>
  );
}
