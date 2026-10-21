// /delete-account (Web-Delete): the real flow, not instructions.
//   email → six-digit code (existing accounts only) → the page reads the
//   session's role (a trainers row → coach; a clients row → athlete; neither
//   → a plain account, which athlete-exit deletes too) → coach: the server's
//   departure preview (athletes, refund total, the coach's own passes that
//   end) with the policy sentence; otherwise athlete-exit's preview (every
//   pass that ends today, in the server's own sentences, and who is told) →
//   one explicit confirm → delete-trainer-account or athlete-exit {action:
//   'delete_account', confirm: true} → Deleted, signed out.
// No commit without the server's preview on screen: both deletions end
// passes with no refund (an athlete's own; a coach's own passes with other
// coaches), and each preview has its own rate limit, so it can fail while the
// commit would still work. A role read that fails is said so, never "no profile".
// An athlete's passes end at Stripe before the account goes (no refund, open
// invoices forgiven; operator decision 2026-10-17); if one cannot be ended,
// nothing is deleted and the server's sentence says what did end.
// Nothing here says "deleted" before the server answered `deleted: true` (an
// athlete) or `success` with the auth user gone (a coach); errors are shown
// in words; every control is disabled while a call is in flight.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import {
  currentUser, deleteAthleteAccount, deleteCoachAccount, departurePreview, myRole, previewAthleteDeletion, session, signOutLocal,
  takeAuthReturnNote,
} from '../api';
import { appleSignUpUnfinished, usedApple, APPLE_STILL_LISTED, UNFINISHED_DELETE_INTRO } from '../appleAuth';
import { usePageMeta } from './meta';
import { SUPPORT_EMAIL } from './pricing';

const STEP = { email: 'email', code: 'code', loading: 'loading', confirm: 'confirm', deleting: 'deleting', done: 'done' };

const COACH_POLICY = 'Athletes who prepaid are refunded the time they have not had, from your balance; they keep their accounts and history.';
const ATHLETE_POLICY = 'Deleting ends every pass you hold today, before the account goes: it stops billing and won’t renew, and any unpaid amount on it is forgiven. Time already paid isn’t refunded. If a pass can’t be ended, nothing is deleted.';
const UNKNOWN_OUTCOME = 'We couldn’t reach FitLink, so we can’t tell whether your account was deleted. Check your connection, then reload this page to see whether it is still there.';

/**
 * A deletion went out and no decided answer came back (no answer, a gateway
 * timeout, a 5xx the function threw part-way): it may have happened. Never
 * "try again" alone, never "nothing was deleted".
 */
function unknownOutcome(err) {
  if (err.status === 0) return UNKNOWN_OUTCOME;
  const check = 'Reload this page to see whether it is still there.';
  return err.fromServer
    ? `${err.message} We can’t tell from this answer whether your account was deleted. ${check}`
    : `FitLink didn’t answer clearly, so we can’t tell whether your account was deleted. ${check}`;
}

/**
 * Why the athlete preview is missing, in words; the policy sentence follows
 * it on the page. The server's own sentence (guardRate's hourly or daily one,
 * a Stripe or database refusal) is shown as it came.
 */
function athletePreviewNote(err) {
  return err?.message ? `We couldn’t list your passes. ${err.message}` : 'We couldn’t list your passes right now.';
}

/** Why the coach's departure preview is missing, in words; the policy sentence follows it. */
function coachPreviewNote(err) {
  if (err?.status === 429) return 'We couldn’t fetch the numbers: too many previews in the last hour. Check again later.';
  if (err?.code === 'stripe_error' || err?.status === 502) return 'We couldn’t reach our payment processor to work out what your athletes are owed. Check again in a moment.';
  return 'We couldn’t fetch what your athletes are owed right now. Check again in a moment.';
}

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
  /** Who the session is, from its identities: a sign-up nobody finished (every identity Apple, no role), an account that used Apple. */
  const [account, setAccount] = useState({ unfinished: false, apple: false });

  /** The server no longer accepts this browser's session: drop it and ask for a fresh code. */
  async function sessionExpired(message) {
    await signOutLocal();
    setAccount({ unfinished: false, apple: false });
    setRole(null);
    setPreview(null);
    setPreviewNote(null);
    setAgreed(false);
    setToken('');
    setError(message);
    setStep(STEP.email);
  }

  /** Who is signed in, and for a coach what leaving would do (server truth). */
  async function prepare() {
    setStep(STEP.loading);
    setError(null);
    setPreview(null);
    setPreviewNote(null);
    setAgreed(false);
    const user = await currentUser();
    setAccount({ unfinished: appleSignUpUnfinished(user), apple: usedApple(user) });
    let r;
    try {
      r = await myRole();
    } catch (err) {
      if (err.code === 'unauthorized') { await sessionExpired(err.message); return; }
      // Not "no profile": the read did not answer. Nothing can be deleted until it does.
      setRole('unknown');
      setPreviewNote(err.message);
      setStep(STEP.confirm);
      return;
    }
    setRole(r);
    // A coach leaves through delete-trainer-account; anyone else (an athlete, or a plain
    // account with neither row) through athlete-exit, which deletes both.
    const err = r === 'coach' ? await loadCoachPreview() : r ? await loadAthletePreview() : null;
    if (err?.code === 'unauthorized') { await sessionExpired(err.message); return; }
    setStep(STEP.confirm);
  }

  /**
   * delete-trainer-account's preview: athletes, refunds and the coach's own
   * passes that end. Changes nothing. Resolves the refusal when there is one.
   */
  async function loadCoachPreview() {
    try {
      const p = await departurePreview();
      setPreview(p);
      setPreviewNote(null);
      return null;
    } catch (err) {
      setPreview(null);
      setPreviewNote(coachPreviewNote(err));
      return err;
    }
  }

  /**
   * athlete-exit's preview: what ends today and who is told. Changes nothing.
   * Resolves the refusal when there is one (the page shows it as a note).
   */
  async function loadAthletePreview() {
    try {
      const p = await previewAthleteDeletion();
      setPreview(p);
      setPreviewNote(null);
      return null;
    } catch (err) {
      setPreview(null);
      setPreviewNote(athletePreviewNote(err));
      return err;
    }
  }

  async function retryPreview() {
    setBusy(true);
    const err = role === 'coach' ? await loadCoachPreview() : await loadAthletePreview();
    setBusy(false);
    if (err?.code === 'unauthorized') await sessionExpired(err.message);
  }

  // A session may already be in this browser (the coach editor, a checkout):
  // skip the code and go straight to the role and the preview.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await session();
      const n = await takeAuthReturnNote();
      if (cancelled) return;
      if (!s) { setError(n); setStep(STEP.email); return; }
      setEmail(s.user.email ?? '');
      await prepare();
    })();
    return () => { cancelled = true; };
    // Once per visit: prepare() reads the role and the preview (rate-limited server calls).
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Read before the session goes: the Deleted step says where Apple still lists FitLink.
      const apple = account.apple;
      if (role === 'coach') {
        const r = await deleteCoachAccount();
        setOutcome({ role, departure: r?.departure ?? null, mediaIncomplete: r?.mediaIncomplete === true, usedApple: apple });
      } else {
        // Resolves only on the server's `deleted: true`, after the session is dropped.
        const r = await deleteAthleteAccount();
        setOutcome({ role, passesEnded: r.passesEnded, mediaIncomplete: r.mediaIncomplete, usedApple: apple });
      }
      setStep(STEP.done);
    } catch (err) {
      if (err.code === 'unauthorized') {
        // Refused before anything ran (requireCaller). After a deletion whose answer was lost,
        // this is also what the next tap gets: the email step then says whether the account exists.
        setBusy(false);
        await sessionExpired(err.message);
        return;
      }
      let message;
      if (err.status === 429) message = 'Too many deletion attempts today. Nothing was deleted; try again tomorrow or write to support.';
      else if (err.outcomeUnknown) message = unknownOutcome(err);
      else message = err.message || 'Couldn’t delete the account. Nothing was changed; try again.';
      if (role !== 'coach' && err.code === 'coach_account') {
        // The account also coaches: its exit is the coach departure. Read the role again.
        await prepare();
        setError(message);
        return;
      }
      if (role !== 'coach' && err.code === 'needs_confirmation' && Array.isArray(err.body?.passesEnding)) {
        setPreview(err.body);
        setPreviewNote(null);
      } else if (role !== 'coach' && Number(err.body?.passesEnded) > 0) {
        // Something already ended: the list on screen is out of date.
        await loadAthletePreview();
      }
      setError(message);
      setStep(STEP.confirm);
    } finally {
      setBusy(false);
    }
  }

  async function notMe() {
    setBusy(true);
    await signOutLocal();
    setBusy(false);
    setAccount({ unfinished: false, apple: false });
    setRole(null);
    setPreview(null);
    setToken('');
    setStep(STEP.email);
  }

  const intro = role === 'coach'
    ? 'This deletes your profile and your page, ends every pass and refunds what your athletes have not had yet. It can’t be undone.'
    : 'This deletes your profile, messages, check-ins and logged workouts, and ends any pass you hold today. Time already paid isn’t refunded. It can’t be undone.';
  // athlete-exit's deletion: an athlete, or a plain account with neither row.
  const exitsAsAthlete = role === 'athlete' || role === 'none';
  const athleteEnding = exitsAsAthlete && Array.isArray(preview?.passesEnding)
    ? preview.passesEnding.filter((p) => p && typeof p.line === 'string' && p.line)
    : [];
  // Confirm only what the server listed: no preview on screen, no commit (the preview and
  // the deletion have separate rate limits, so one can fail while the other works).
  const canDelete = role === 'coach' || exitsAsAthlete;
  const unlisted = canDelete && preview == null;
  const ownEnding = role === 'coach' && Array.isArray(preview?.ownPassesEnding)
    ? preview.ownPassesEnding.filter((p) => p && typeof p.line === 'string' && p.line)
    : [];

  return (
    <div className="s-wrap tight s-delete">
      <h1 className="s-h1 sm">{step === STEP.done ? 'Deleted.' : 'Delete your FitLink account'}</h1>
      {step !== STEP.done && <p className="s-copy">{account.unfinished ? UNFINISHED_DELETE_INTRO : intro}</p>}

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
            <span>Signed in as <b>{email}</b>{account.apple ? ' with Apple' : ''}{account.unfinished ? '' : role === 'coach' ? ' · coach' : role === 'athlete' ? ' · athlete' : ''}</span>
            <button type="button" onClick={notMe} disabled={busy}>Not you? Sign out</button>
          </div>

          {role === 'unknown' && (
            <div className="s-preview">
              <span>{previewNote}</span>
              <button type="button" className="fl-btn sm" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={prepare}>Check again</button>
            </div>
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
                  <>
                    <span>{previewNote}</span>
                    <button type="button" className="fl-btn sm" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={retryPreview}>Check again</button>
                  </>
                )}
                <span>{COACH_POLICY}</span>
              </div>
              {ownEnding.length > 0 && (
                <div className="s-preview">
                  <b>Also ending today</b>
                  {ownEnding.map((p, i) => <span key={p.stripeSubscriptionId || `${p.planId || 'own'}-${i}`}>{p.line}</span>)}
                </div>
              )}
              {/* An unfinished Apple sign-up holds only the default trainers row: none of this applies. */}
              {!account.unfinished && <ul className="s-bullets">
                <li>Every athlete’s pass with you ends today.</li>
                <li>Your athletes keep their accounts, logs, check-ins and the sessions they trained. Your profile, your page and your passes go; they see you as a former coach.</li>
                <li>Payment records may be kept where the law requires it.</li>
                <li>A Coach Elite subscription bought through Apple is not cancelled by this. Cancel it in your Apple Account’s subscriptions.</li>
              </ul>}
            </>
          )}

          {exitsAsAthlete && (
            <>
              <div className="s-preview">
                {preview ? (
                  <>
                    {athleteEnding.length > 0 ? (
                      <>
                        <b>What ends today</b>
                        {athleteEnding.map((p, i) => <span key={p.stripeSubscriptionId || `${p.planId || 'pass'}-${i}`}>{p.line}</span>)}
                      </>
                    ) : (
                      <b>You don’t hold a pass that’s still billing, so there is nothing to end.</b>
                    )}
                    {preview.coachNotice && <span>{preview.coachNotice}</span>}
                  </>
                ) : (
                  <>
                    <span>{previewNote}</span>
                    <span>{ATHLETE_POLICY}</span>
                    <button type="button" className="fl-btn sm" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={retryPreview}>Check again</button>
                  </>
                )}
              </div>
              <ul className="s-bullets">
                <li>Any pass you hold ends today and won’t renew. Time already paid isn’t refunded.</li>
                <li>Your coach can no longer see your history; they keep their own record of the coaching they delivered.</li>
                <li>Your profile, messages, check-ins, logged workouts and uploaded files are removed.</li>
                <li>Payment records may be kept where the law requires it.</li>
              </ul>
            </>
          )}

          {canDelete && (
            <>
              <label className="s-checkrow">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} disabled={busy} />
                <span>I understand this deletes my account now and cannot be undone.</span>
              </label>
              {error && <div className="fl-error" role="alert">{error}</div>}
              {unlisted && (
                <p className="s-small" id="d-unlisted">
                  {role === 'coach' ? 'What deleting ends has to be listed before you can delete the account.' : 'Your passes have to be listed before you can delete the account.'} Use Check again above.
                </p>
              )}
              <button type="button" className="fl-btn danger lg" disabled={busy || !agreed || unlisted} aria-describedby={unlisted ? 'd-unlisted' : undefined} onClick={confirmDelete}>
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
                {Number(outcome.departure.ownPassesEnded) > 0 ? ` ${Number(outcome.departure.ownPassesEnded) === 1 ? '1 pass' : `${outcome.departure.ownPassesEnded} passes`} paying another coach ended too.` : ''}
              </>
            )}
            {outcome.role === 'athlete' && Number(outcome.passesEnded) > 0 && (
              <> {Number(outcome.passesEnded) === 1 ? 'Your pass has ended' : `${outcome.passesEnded} passes have ended`} and won’t renew.</>
            )}
          </p>
          {outcome.mediaIncomplete && <p className="s-small">Some uploaded files could not be removed automatically. Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and they will be removed for you.</p>}
          <p className="s-small">If you had a subscription through Apple, cancel it in your Apple Account’s subscriptions: deleting the FitLink account does not cancel it.</p>
          {outcome.usedApple && <p className="s-small">{APPLE_STILL_LISTED}</p>}
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
