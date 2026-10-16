// /delete-account (Web-Delete): the real flow, not instructions.
//   email → six-digit code (existing accounts only) → the page reads the
//   session's role (a trainers row → coach; a clients row → athlete) →
//   coach: the server's departure preview (athletes, refund total) with the
//   policy sentence; athlete: what goes → one explicit confirm →
//   delete-trainer-account or delete_client_account → Deleted, signed out.
// Nothing here says "deleted" before the server answered; errors are shown in
// words; every control is disabled while a call is in flight.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { deleteAthleteAccount, deleteCoachAccount, departurePreview, myRole, session, signOutLocal } from '../api';
import { usePageMeta } from './meta';
import { SUPPORT_EMAIL } from './pricing';

const STEP = { email: 'email', code: 'code', loading: 'loading', confirm: 'confirm', deleting: 'deleting', done: 'done' };

const COACH_POLICY = 'Athletes who prepaid are refunded the time they have not had, from your balance; they keep their accounts and history.';

function money(cents, currency) {
  const n = (Number(cents) || 0) / 100;
  try {
    return n.toLocaleString('en-US', { style: 'currency', currency: (currency || 'usd').toUpperCase(), minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

export default function DeleteAccount() {
  usePageMeta('Delete your account', 'Delete your FitLink account from the web: sign in with an email code, see what goes, confirm. Immediate and permanent.');
  const [step, setStep] = useState(STEP.loading);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [role, setRole] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewNote, setPreviewNote] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [outcome, setOutcome] = useState(null);

  /** Who is signed in, and for a coach what leaving would do (server truth). */
  async function prepare() {
    setStep(STEP.loading);
    setError(null);
    setPreview(null);
    setPreviewNote(null);
    setAgreed(false);
    const r = await myRole();
    setRole(r);
    if (r === 'coach') {
      try {
        const p = await departurePreview();
        setPreview(p);
      } catch (err) {
        // The policy still applies; the page says what it could not fetch.
        if (err.status === 429) setPreviewNote('We couldn’t fetch the numbers: too many previews in the last hour. The policy below still applies.');
        else if (err.code === 'stripe_error' || err.status === 502) setPreviewNote('We couldn’t reach our payment processor to work out what your athletes are owed, so the numbers aren’t shown. Deleting will still refund them before your account goes; if Stripe can’t be reached then either, nothing is deleted.');
        else setPreviewNote('We couldn’t fetch what your athletes are owed right now. The policy below still applies.');
      }
    }
    setStep(STEP.confirm);
  }

  // A session may already be in this browser (the coach editor, a checkout):
  // skip the code and go straight to the role and the preview.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await session();
      if (cancelled) return;
      if (!s) { setStep(STEP.email); return; }
      setEmail(s.user.email ?? '');
      await prepare();
    })();
    return () => { cancelled = true; };
  }, []);

  async function sendCode(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false } });
    setBusy(false);
    if (err) {
      const text = String(err.message ?? '').toLowerCase();
      if (text.includes('signup') || text.includes('not allowed') || text.includes('not found')) setError('No FitLink account uses that email. Check the address, or the one you used in the app.');
      else if (text.includes('rate') || err.status === 429) setError('Too many codes sent. Wait a minute and try again.');
      else setError('Couldn’t send the code. Check the address and try again.');
      return;
    }
    setToken('');
    setStep(STEP.code);
  }

  async function verify(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.replace(/\D/g, ''), type: 'email' });
    if (err) {
      setBusy(false);
      setError('That code didn’t match. Check it or ask for a new one.');
      return;
    }
    setBusy(false);
    await prepare();
  }

  async function confirmDelete() {
    setError(null);
    setStep(STEP.deleting);
    setBusy(true);
    try {
      if (role === 'coach') {
        const r = await deleteCoachAccount();
        setOutcome({ role, departure: r?.departure ?? null, mediaIncomplete: r?.mediaIncomplete === true });
      } else {
        const r = await deleteAthleteAccount();
        setOutcome({ role, mediaIncomplete: r.mediaIncomplete });
      }
      setStep(STEP.done);
    } catch (err) {
      if (err.status === 429) setError('Too many deletion attempts today. Nothing was deleted; try again tomorrow or write to support.');
      else setError(err.message || 'Couldn’t delete the account. Nothing was changed; try again.');
      setStep(STEP.confirm);
    } finally {
      setBusy(false);
    }
  }

  async function notMe() {
    setBusy(true);
    await signOutLocal();
    setBusy(false);
    setRole(null);
    setPreview(null);
    setToken('');
    setStep(STEP.email);
  }

  const intro = role === 'coach'
    ? 'This deletes your profile and your page, ends every pass and refunds what your athletes have not had yet. It can’t be undone.'
    : 'This deletes your profile, messages, check-ins and logged workouts. It can’t be undone. Any active pass stops renewing.';

  return (
    <div className="s-wrap tight s-delete">
      <h1 className="s-h1 sm">{step === STEP.done ? 'Deleted.' : 'Delete your FitLink account'}</h1>
      {step !== STEP.done && <p className="s-copy">{intro}</p>}

      {step === STEP.email && (
        <form className="s-form" onSubmit={sendCode}>
          <label htmlFor="d-email">The email you sign in with</label>
          <input id="d-email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
          <span className="hint">We’ll email a code to confirm it’s you. Accounts that sign in with Apple use the email on that Apple ID.</span>
          {error && <div className="fl-error" role="alert">{error}</div>}
          <button type="submit" className="fl-btn danger lg" disabled={busy || !/\S+@\S+\.\S+/.test(email)}>{busy ? 'Sending…' : 'Email me a code'}</button>
        </form>
      )}

      {step === STEP.code && (
        <form className="s-form" onSubmit={verify}>
          <p className="s-copy">We sent a six-digit code to <b>{email}</b>.</p>
          <div className="fl-field fl-code">
            <label htmlFor="d-code" className="s-visually-hidden">Code</label>
            <input id="d-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} value={token} onChange={(e) => setToken(e.target.value)} disabled={busy} autoFocus />
          </div>
          {error && <div className="fl-error" role="alert">{error}</div>}
          <button type="submit" className="fl-btn danger lg" disabled={busy || token.replace(/\D/g, '').length !== 6}>{busy ? 'Checking…' : 'Continue'}</button>
          <button type="button" className="fl-btn quiet" disabled={busy} onClick={() => { setToken(''); setError(null); setStep(STEP.email); }}>Use another email</button>
        </form>
      )}

      {step === STEP.loading && (
        <div className="s-form" aria-live="polite"><p className="s-copy">Checking your account…</p></div>
      )}

      {(step === STEP.confirm || step === STEP.deleting) && (
        <div className="s-form" aria-live="polite">
          <div className="s-who">
            <span>Signed in as <b>{email}</b>{role === 'coach' ? ' · coach' : role === 'athlete' ? ' · athlete' : ''}</span>
            <button type="button" onClick={notMe} disabled={busy}>Not you? Sign out</button>
          </div>

          {role === 'none' && (
            <>
              <p className="s-copy">This account has no coach or athlete profile left to delete. Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from this address and we’ll remove the sign-in itself.</p>
            </>
          )}

          {role === 'coach' && (
            <>
              <div className="s-preview">
                {preview ? (
                  <>
                    <b>{preview.athletes === 1 ? '1 athlete is on your roster.' : `${preview.athletes ?? 0} athletes are on your roster.`}</b>
                    <span>
                      {Number(preview.refundCentsTotal) > 0
                        ? `${money(preview.refundCentsTotal, preview.currency)} goes back to them from your balance for time they prepaid${Number(preview.subscriptions) > 0 ? `, and ${preview.subscriptions} ${preview.subscriptions === 1 ? 'subscription ends' : 'subscriptions end'} today` : ''}.`
                        : `Nothing is owed back to them${Number(preview.subscriptions) > 0 ? `; ${preview.subscriptions} ${preview.subscriptions === 1 ? 'subscription ends' : 'subscriptions end'} today` : ''}.`}
                    </span>
                  </>
                ) : (
                  <span>{previewNote}</span>
                )}
                <span>{COACH_POLICY}</span>
              </div>
              <ul className="s-bullets">
                <li>Every athlete’s pass with you ends today.</li>
                <li>Your athletes keep their accounts, logs, check-ins and the sessions they trained. Your profile, your page and your passes go; they see you as a former coach.</li>
                <li>Payment records may be kept where the law requires it.</li>
                <li>A Coach Elite subscription bought through Apple is not cancelled by this. Cancel it in your Apple Account’s subscriptions.</li>
              </ul>
            </>
          )}

          {role === 'athlete' && (
            <ul className="s-bullets">
              <li>Any pass you hold stops and won’t renew.</li>
              <li>Your coach can no longer see your history; they keep their own record of the coaching they delivered.</li>
              <li>Your profile, messages, check-ins, logged workouts and uploaded files are removed.</li>
              <li>Payment records may be kept where the law requires it.</li>
            </ul>
          )}

          {role && role !== 'none' && (
            <>
              <label className="s-checkrow">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} disabled={busy} />
                <span>I understand this deletes my account now and cannot be undone.</span>
              </label>
              {error && <div className="fl-error" role="alert">{error}</div>}
              <button type="button" className="fl-btn danger lg" disabled={busy || !agreed} onClick={confirmDelete}>
                {step === STEP.deleting ? (role === 'coach' ? 'Refunding and deleting…' : 'Deleting…') : 'Delete my account'}
              </button>
              <Link className="fl-btn quiet" to="/" aria-disabled={busy}>Keep my account</Link>
            </>
          )}
        </div>
      )}

      {step === STEP.done && outcome && (
        <div className="s-form" aria-live="polite">
          <div className="s-done" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" style={{ fill: 'none', stroke: '#fff', strokeWidth: 2.8, strokeLinecap: 'round', strokeLinejoin: 'round' }} /></svg>
          </div>
          <p className="s-copy">
            Your FitLink account is gone and this browser is signed out.
            {outcome.role === 'coach' && outcome.departure && (
              <> {outcome.departure.athletes === 1 ? '1 athlete was' : `${outcome.departure.athletes ?? 0} athletes were`} released from your roster
                {Number(outcome.departure.refundCents) > 0 ? `, and ${money(outcome.departure.refundCents, preview?.currency)} went back to them` : ''}.
                {Number(outcome.departure.refundsFailed) > 0 ? ` ${outcome.departure.refundsFailed} refund${outcome.departure.refundsFailed === 1 ? '' : 's'} could not be issued by Stripe; write to ${SUPPORT_EMAIL} and we will finish it.` : ''}
              </>
            )}
          </p>
          {outcome.mediaIncomplete && <p className="s-small">Some uploaded files could not be removed automatically. Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and they will be removed for you.</p>}
          <p className="s-small">If you had a subscription through Apple, cancel it in your Apple Account’s subscriptions: deleting the FitLink account does not cancel it.</p>
          <Link className="fl-btn lg" to="/">Back to FitLink</Link>
        </div>
      )}

      <p className="s-small">You can also delete from the app: Profile, then Delete account. Coaches with active athletes: {COACH_POLICY.charAt(0).toLowerCase() + COACH_POLICY.slice(1)}</p>

      <section className="s-doc" aria-labelledby="kept-h" style={{ gap: 18 }}>
        <h2 id="kept-h" className="s-h2 xs" style={{ fontSize: 22 }}>What is deleted, and what is kept</h2>
        <table className="s-kv">
          <thead><tr><th scope="col">Deleted</th><th scope="col">Kept, and why</th></tr></thead>
          <tbody>
            <tr>
              <td>Your profile and sign-in<br />Workouts, sessions and logged sets<br />Meal plans<br />Check-ins<br />Messages with your coach or athletes<br />Photos and uploaded files<br />Season enrolments and progress</td>
              <td><strong>Payment records</strong>, for as long as tax and accounting law requires (typically 7 years). These are transaction records, not profile data.<br /><br /><strong>A coach’s own record</strong> of coaching they delivered to you, in the same way any business keeps its books.</td>
            </tr>
          </tbody>
        </table>
        <p className="s-small">No longer have access to the email? Write to <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Delete my FitLink account')}`}>{SUPPORT_EMAIL}</a> with the subject “Delete my FitLink account”. We verify that the request comes from the account holder before deleting anything, and complete it within 30 days.</p>
      </section>
    </div>
  );
}
