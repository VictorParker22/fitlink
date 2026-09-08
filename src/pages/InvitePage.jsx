/* eslint-disable react-refresh/only-export-components --
   The helpers below are shared with LiveInvitePage. They belong in a
   src/lib/invite.js of their own; until then this file trades dev-only
   fast refresh for one source of truth. */
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import './InvitePage.css';

/**
 * /i/:code — the page a coach's invite link lands on.
 *
 * It lives outside the marketing Shell on purpose: an invite is a single
 * decision, and the nav, the pricing links and the three-column footer are
 * all exits from it. The page carries its own chrome (wordmark, the link
 * itself, and a one-line footer) inside the same .fl token scope, so the
 * palette, type and glass material are the site's, not a second look.
 *
 * Everything on the page comes from one edge function, invite-info, and
 * nothing that isn't in that payload is shown. The helpers below are also
 * used by /live/:code (LiveInvitePage), which imports them from here.
 */

export const APP_STORE = 'https://apps.apple.com/app/id6779058450';

/** Upper case, A–Z and 2–9 only; the server decides what is a real code. */
export function normaliseCode(raw) {
  return String(raw || '').toUpperCase().replace(/[^A-Z2-9]/g, '');
}

export function firstNameOf(name) {
  const first = String(name || '').trim().split(/\s+/)[0];
  return first || 'Your coach';
}

export function initialsOf(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function specialityLine(coach) {
  if (!coach) return '';
  const list = Array.isArray(coach.specializations)
    ? coach.specializations.map((s) => String(s || '').trim()).filter(Boolean)
    : [];
  if (list.length) return list.join(' · ');
  return String(coach.specialization || '').trim();
}

/**
 * Loads invite-info for a code. `every` (ms) re-polls while mounted, for
 * the live page. A poll that fails because the network dropped keeps the
 * last good answer; a poll the server answered with an error is final.
 */
export function useInviteInfo(rawCode, every = 0) {
  const code = normaliseCode(rawCode);
  // The answer is stored with the code it answers, so a code change reads
  // as "loading" by comparison instead of by a reset inside the effect.
  const [answer, setAnswer] = useState({ code: '', status: 'loading', info: null });

  useEffect(() => {
    if (!code) return undefined;
    let alive = true;
    let timer;

    const load = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('invite-info', { body: { code } });
        if (error || !data || !data.kind) throw error || new Error('empty');
        if (alive) setAnswer({ code, status: 'ready', info: data });
      } catch (err) {
        if (!alive) return;
        const transient = err && err.name === 'FunctionsFetchError';
        setAnswer((s) => (
          transient && s.code === code && s.status === 'ready' ? s : { code, status: 'invalid', info: null }
        ));
      }
      if (alive && every > 0) timer = setTimeout(load, every);
    };
    load();

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [code, every]);

  if (!code) return { code, status: 'invalid', info: null };
  if (answer.code !== code) return { code, status: 'loading', info: null };
  return { code, status: answer.status, info: answer.info };
}

export function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => { document.title = previous; };
  }, [title]);
}

/** Page frame: .fl for the tokens and ambient light, fl-body for the ground. */
export function InviteFrame({ code, path, children }) {
  useEffect(() => {
    document.body.classList.add('fl-body');
    return () => document.body.classList.remove('fl-body');
  }, []);

  const host = typeof window !== 'undefined' ? window.location.host : 'fitlink.coach';

  return (
    <div className="fl inv">
      <div className="inv-wrap">
        <header className="inv-bar">
          <Link className="inv-mark" to="/" aria-label="FitLink home">
            <img className="inv-mark-tile" src="/icon-192.png" alt="" aria-hidden="true" />
            <span className="inv-mark-word">FitLink</span>
          </Link>
          {code ? <span className="inv-link">{host}/{path}/{code}</span> : null}
        </header>
        {children}
      </div>
    </div>
  );
}

export function CoachAvatar({ coach, size = 96 }) {
  const [broken, setBroken] = useState(false);
  const src = coach && coach.avatar_url;
  const style = { width: size, height: size };
  if (src && !broken) {
    return <img className="inv-avatar" style={style} src={src} alt="" onError={() => setBroken(true)} />;
  }
  return (
    <div className="inv-avatar inv-monogram" style={{ ...style, fontSize: Math.round(size / 3) }} aria-hidden="true">
      {initialsOf(coach && coach.name)}
    </div>
  );
}

export function Check() {
  return (
    <span className="inv-check" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8.5l3.2 3L13 4.5" />
      </svg>
    </span>
  );
}

export function InvalidInvite() {
  return (
    <section className="inv-hero inv-hero-short" role="status">
      <h1 className="inv-title">This invite link is not valid.</h1>
    </section>
  );
}

function InviteSkeleton() {
  return (
    <section className="inv-hero" aria-busy="true" aria-label="Loading invite">
      <div className="inv-sk inv-sk-avatar" />
      <div className="inv-sk inv-sk-line" style={{ width: 150 }} />
      <div className="inv-sk inv-sk-title" />
      <div className="inv-sk inv-sk-title" style={{ width: '70%' }} />
      <div className="inv-sk inv-sk-line" style={{ width: 200 }} />
      <div className="inv-sk inv-sk-card" />
      <div className="inv-sk inv-sk-btn" />
      <div className="inv-sk inv-sk-btn inv-sk-btn-ghost" />
    </section>
  );
}

export default function InvitePage() {
  const params = useParams();
  const { code, status, info } = useInviteInfo(params.code);
  const coach = info && info.coach;
  const first = firstNameOf(coach && coach.name);

  useDocumentTitle(
    status === 'ready' ? `${first} invited you · FitLink` : 'Invite · FitLink',
  );

  // A class link pasted into the coach route: send it to the player.
  if (status === 'ready' && info.kind === 'live') {
    return <Navigate to={`/live/${code}`} replace />;
  }

  const bio = coach ? String(coach.bio || '').trim() : '';
  const speciality = specialityLine(coach);

  return (
    <InviteFrame code={code} path="i">
      {status === 'loading' && <InviteSkeleton />}

      {status === 'invalid' && <InvalidInvite />}

      {status === 'ready' && info.expired && (
        <section className="inv-hero" role="status">
          <CoachAvatar coach={coach} />
          <p className="fl-kicker inv-eyebrow">An invite from your coach</p>
          <h1 className="inv-title">This invite has expired.</h1>
          <p className="inv-bio">Ask {first} for a new one.</p>
        </section>
      )}

      {status === 'ready' && !info.expired && (
        <>
          <section className="inv-hero">
            <CoachAvatar coach={coach} />
            <p className="fl-kicker inv-eyebrow">An invite from your coach</p>
            <h1 className="inv-title">{first} wants you training with them on FitLink.</h1>
            {bio ? <p className="inv-bio">“{bio}”</p> : null}
            {speciality ? <p className="inv-spec">{speciality}</p> : null}
          </section>

          <section className="fl-card inv-card" aria-labelledby="inv-what">
            <p id="inv-what" className="fl-kicker inv-card-kicker">What you get</p>
            <ul className="inv-list">
              <li className="inv-row"><Check /><span>Your week, written by {first}, on your phone</span></li>
              <li className="inv-row"><Check /><span>Check-ins {first} reads, and answers</span></li>
              <li className="inv-row"><Check /><span>Sessions, messages and live classes in one place</span></li>
            </ul>
          </section>

          <section className="inv-actions">
            <a className="fl-btn inv-btn inv-btn-primary" href={APP_STORE}>
              Get FitLink and join {first}
            </a>
            <a className="fl-btn-ghost inv-btn inv-btn-secondary" href={`fitlink://invite/${code}`}>
              I have the app, open it
            </a>
            <p className="inv-code">
              <span>Or enter this code in the app</span>
              <code className="inv-code-value">{code}</code>
            </p>
          </section>

          <p className="inv-foot">
            Sent by {String(coach.name || '').trim() || first}. Nothing is shared with them until you join.
            The link works for 30 days.
          </p>
        </>
      )}
    </InviteFrame>
  );
}
