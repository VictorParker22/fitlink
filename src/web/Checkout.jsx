// Buying a pass on the web: email → six-digit code → what joining ends →
// card → done. The account is the same Supabase user the app uses, so the
// first week lands in the app. The server computes the price and the payee
// from the plan (create-subscription); this sheet only ever sends ids.
//
// Joining goes through athlete-exit (fitlink-app, 2026-10-17): a preview
// first, which lists every pass the athlete still pays that the move would
// end, in the server's own sentences. Only after the person confirms does the
// server end those passes (now, at Stripe, no refund, open invoices forgiven)
// and move them to this coach, BEFORE the card form: the old pass stays ended
// even if this payment is never finished, and the sheet says so up front.
// Nothing here says "switched", "ended" or "you're in" before the server
// answered it.
//
// Before anything can end a pass, the sheet checks what the page can already
// see would make the purchase fail afterwards (create-subscription's own
// rules): the pass has a price (plan_unpriced) and the coach can take a card
// (trainers_public.stripe_charges_enabled; payouts_not_ready). The server
// stays the authority; what only it can know (live_subscription on a second
// pass, stripe_error, db_error) can still refuse after a confirmed switch,
// and the sheet then says the old pass ended.
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { supabase, APP_SCHEME } from './supabase';
import {
  acceptInvite, appConfig, coachTakesCards, confirmSubscription, createSubscription, dollars, firstName,
  myClient, planIsPriced, previewInvite, session, signOutLocal,
} from './api';
import { SUPPORT_EMAIL } from './site/pricing';

const STEP = { email: 'email', code: 'code', checking: 'checking', switch: 'switch', pay: 'pay', done: 'done', stopped: 'stopped' };

// Refusals a second try cannot change: the sheet offers Close only.
const FINAL_CODES = new Set([
  'invite_not_found', 'invite_expired', 'invite_already_accepted', 'cannot_coach_yourself',
  'athlete_only', 'plan_archived', 'plan_not_found', 'coach_not_found', 'plan_unpriced', 'payouts_not_ready',
]);

function cents(amount) {
  const n = Math.max(0, Number(amount) || 0) / 100;
  return `$${n.toFixed(2)}`;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** A refusal this page raises itself, before it sent anything. */
function stop(message, code = null) {
  return Object.assign(new Error(message), { code });
}

/** create-subscription's payouts_not_ready sentence ("Coach has not completed payment setup") is not written for a person. */
function payoutsNotReady(first, tail) {
  return `${first} hasn’t finished setting up payments, so this pass can’t be bought yet. Ask them to finish Payouts in the FitLink app. ${tail}`;
}

/**
 * The switch confirm went out and no decided answer came back (no answer, a
 * gateway timeout, a 5xx the function threw): the pass may have ended and the
 * coach may have changed. Say that nobody can tell; Check again re-runs the
 * read-only preview, which shows where things stand.
 */
function unknownSwitch(err) {
  const what = 'whether your pass ended or you switched';
  const message = err.status === 0
    ? `We couldn’t reach FitLink, so we can’t tell ${what}. Check again to see where things stand.`
    : err.fromServer
      ? `${err.message} We can’t tell from this answer ${what}. Check again to see where things stand.`
      : `FitLink didn’t answer clearly, so we can’t tell ${what}. Check again to see where things stand.`;
  return stop(message);
}

export default function Checkout({ plan, coach, code, onClose }) {
  const first = firstName(coach?.name);
  const [step, setStep] = useState(STEP.checking);
  const [checkingNote, setCheckingNote] = useState('One moment…');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  /** athlete-exit's view: the preview, or the body of a 409 needs_confirmation. */
  const [view, setView] = useState(null);
  /** athlete-exit's answer once the join went through: { switched, passesEnded, clientId, … }. */
  const [joined, setJoined] = useState(null);
  const [clientId, setClientId] = useState(null);
  /** create-subscription's answer: { clientSecret, subscriptionId, payingOpenInvoice?, amountDueCents? }. */
  const [purchase, setPurchase] = useState(null);
  const [stripePromise, setStripePromise] = useState(null);
  /** { kind: 'active' | 'already' } on done; { kind: 'not_started' | 'unconfirmed', message } after paying. */
  const [outcome, setOutcome] = useState(null);
  const [canRetry, setCanRetry] = useState(true);
  /** The server said the session is no longer valid: offer to sign in again. */
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const started = useRef(false);
  /** The Stripe publishable key, read before anything can end a pass. */
  const stripeKey = useRef(null);

  // Whether the page can sell this pass at all, before asking for an email;
  // a session that already exists (the person bought before, or opened the
  // code screen earlier) goes straight on to what joining would end.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  async function sendCode(e) {
    e?.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const clean = email.trim().toLowerCase();
      const { error: err } = await supabase.auth.signInWithOtp({
        email: clean,
        options: { shouldCreateUser: true, data: { role: 'client', name: name.trim() || undefined } },
      });
      if (err) throw err;
      setStep(STEP.code);
    } catch (err) {
      setError(err.message?.includes('rate') ? 'Too many codes sent. Wait a minute and try again.' : 'Couldn’t send the code. Check the address and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function verify(e) {
    e?.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.replace(/\D/g, ''), type: 'email' });
    setBusy(false);
    if (err) {
      setError('That code didn’t match. Check it or ask for a new one.');
      return;
    }
    await begin();
  }

  /** Any refusal: the server's sentence, and a fresh look rather than a blind retry. */
  function stopWith(err) {
    const signIn = err?.code === 'unauthorized';
    setError(err?.message || 'Something went wrong. Try again in a moment.');
    setNeedsSignIn(signIn);
    setCanRetry(!signIn && !FINAL_CODES.has(err?.code));
    setView(null);
    setStep(STEP.stopped);
  }

  /** The session expired: drop it here and ask for a fresh code. Nothing on the server changes. */
  async function signInAgain() {
    setBusy(true);
    await signOutLocal();
    setBusy(false);
    setToken('');
    setError(null);
    setNeedsSignIn(false);
    setStep(STEP.email);
  }

  /**
   * What this page can see would make the purchase fail, checked before
   * anything can end a pass (create-subscription refuses the same cases, but
   * only after a confirmed switch has already ended the old pass). Throws a
   * sentence that ends "Nothing was changed."
   */
  async function assertSellable() {
    if (!planIsPriced(plan)) {
      throw stop(`This pass has no price set, so it can’t be bought yet. Ask ${first} to set one. Nothing was changed.`, 'plan_unpriced');
    }
    const cfg = await appConfig().catch(() => ({}));
    const pk = cfg?.stripePublishableKey;
    if (!pk || !String(pk).startsWith('pk_')) throw stop('Payments aren’t set up on this page yet. Buy the pass in the FitLink app instead. Nothing was changed.');
    stripeKey.current = String(pk);
    let takesCards;
    try {
      takesCards = await coachTakesCards(plan.trainer_id);
    } catch {
      throw stop('We couldn’t check that this coach can take payments. Nothing was changed. Try again in a moment.');
    }
    if (takesCards === null) throw stop('This coach is no longer on FitLink. Nothing was changed.', 'coach_not_found');
    if (!takesCards) throw stop(payoutsNotReady(first, 'Nothing was changed.'), 'payouts_not_ready');
  }

  /**
   * Open, after the code, and Check again: whether this page can sell the
   * pass, then (signed in) what joining this coach would end (athlete-exit
   * preview). Nothing here changes anything, except a join that the server
   * says needs no confirmation (no pass ends and no coach changes).
   */
  async function begin() {
    setError(null);
    setOutcome(null);
    setNeedsSignIn(false);
    setBusy(true);
    setCheckingNote('One moment…');
    setStep(STEP.checking);
    try {
      await assertSellable();
      const s = await session();
      if (!s) {
        setStep(STEP.email);
        return;
      }
      setEmail(s.user.email ?? '');
      setCheckingNote('Checking your passes…');
      const v = await previewInvite(code);
      if (v?.needsConfirmation) {
        setView(v);
        setStep(STEP.switch);
        return;
      }
      await join(false);
    } catch (err) {
      stopWith(err);
    } finally {
      setBusy(false);
    }
  }

  /** The person said yes to what the preview listed. */
  async function confirmSwitch() {
    setError(null);
    setBusy(true);
    try {
      await join(true);
    } catch (err) {
      stopWith(err);
    } finally {
      setBusy(false);
    }
  }

  /** Join (athlete-exit), then the server's checkout. Throws refusals to the caller. */
  async function join(confirm) {
    let accepted;
    try {
      accepted = await acceptInvite(code, { confirm });
    } catch (err) {
      // The server found something to confirm that the preview did not show
      // (a pass started in between): show its list, ask again.
      if (err?.code === 'needs_confirmation' && Array.isArray(err.body?.passesEnding)) {
        setView(err.body);
        setError(err.message);
        setStep(STEP.switch);
        return;
      }
      // A confirm can end a pass before its answer is lost: never call that "try again".
      if (confirm && err?.outcomeUnknown) throw unknownSwitch(err);
      throw err;
    }
    // What the server confirmed in this sheet adds up across tries (a second
    // look after a refusal must not hide that a pass already ended).
    setJoined((prev) => ({
      ...accepted,
      switched: prev?.switched === true || accepted?.switched === true,
      passesEnded: (Number(prev?.passesEnded) || 0) + (Number(accepted?.passesEnded) || 0),
    }));
    setView(null);
    await checkout(accepted?.clientId ?? null);
  }

  async function checkout(joinedClientId) {
    const id = joinedClientId ?? (await myClient())?.id ?? null;
    if (!id) throw new Error('Your athlete record isn’t ready yet. Reload and try again.');
    setClientId(id);
    const pk = stripeKey.current;
    if (!pk) throw new Error('Payments aren’t set up on this page yet. Buy the pass in the FitLink app instead.');
    let res;
    try {
      res = await createSubscription(plan.id, id);
    } catch (err) {
      // The one refusal whose server sentence is not written for a person.
      if (err?.code === 'payouts_not_ready') {
        throw Object.assign(new Error(`${first} hasn’t finished setting up payments, so this pass can’t be bought yet. Ask them to finish Payouts in the FitLink app. You haven’t been charged.`), { code: err.code });
      }
      throw err;
    }
    if (res?.alreadyActive) {
      setOutcome({ kind: 'already' });
      setStep(STEP.done);
      return;
    }
    if (!res?.clientSecret) throw new Error('Checkout didn’t start. You haven’t been charged. Try again in a moment.');
    setPurchase(res);
    setStripePromise(loadStripe(pk));
    setStep(STEP.pay);
  }

  /**
   * confirm-subscription starts the pass without waiting for the webhook; the
   * sheet says only what it answered. Asked again only when no decided answer
   * came back (no answer, a 5xx); a refusal (400, 401, 403, 404, 429) is
   * final for this tap and its sentence is shown.
   */
  async function paid() {
    let answer = null;
    let refused = null;
    for (let i = 0; i < 3; i++) {
      try {
        answer = await confirmSubscription(clientId, purchase?.subscriptionId);
        refused = null;
        if (answer?.active || answer?.code === 'roster_full') break;
      } catch (err) {
        refused = err;
        if (!err?.outcomeUnknown) break;
      }
      if (i < 2) await wait(1500);
    }
    const base = 'Your payment went to Stripe, but we couldn’t confirm your pass yet.';
    if (answer?.active) {
      setOutcome({ kind: 'active' });
      setStep(STEP.done);
    } else if (answer?.code === 'roster_full') {
      setOutcome({ kind: 'not_started', message: answer.error || `${first}’s roster is full right now, so your pass hasn’t started.` });
    } else if (refused?.code === 'unauthorized') {
      // Asking again from this page would be refused the same way; the app, signed in, shows the pass.
      setOutcome({ kind: 'unconfirmed', message: `${base} Your sign-in on this page has expired.`, canCheck: false });
    } else {
      setOutcome({ kind: 'unconfirmed', message: refused?.message ? `${base} ${refused.message}` : base, canCheck: true });
    }
  }

  async function checkAgain() {
    setBusy(true);
    await paid();
    setBusy(false);
  }

  const clientSecret = purchase?.clientSecret ?? null;
  const elementsOptions = useMemo(() => clientSecret ? ({
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: { colorPrimary: '#C2410C', colorBackground: '#FFFFFF', colorText: '#15171C', borderRadius: '14px', fontFamily: '-apple-system, BlinkMacSystemFont, Helvetica, sans-serif' },
    },
  }) : null, [clientSecret]);

  const price = plan.duration_weeks ? `${dollars(plan.price)} once` : `${dollars(plan.price)} / ${plan.period === 'year' ? 'year' : 'month'}`;
  const owing = purchase?.payingOpenInvoice === true;
  const payLabel = owing && Number(purchase?.amountDueCents) > 0 ? cents(purchase.amountDueCents) : price.split(' ')[0];
  const ending = Array.isArray(view?.passesEnding) ? view.passesEnding.filter((p) => p && typeof p.line === 'string' && p.line) : [];
  const currentName = view?.currentCoach?.name || null;
  const passEnded = Number(joined?.passesEnded) > 0;
  const switched = joined?.switched === true;

  // What the server confirmed about the join, kept on screen through payment.
  const joinedNote = (passEnded || switched) ? (
    <p className="fl-done-note" role="status">
      {switched ? `You’ve switched to ${first}.` : `You’ve joined ${first}.`}
      {passEnded ? ` ${Number(joined.passesEnded) === 1 ? 'Your previous pass has ended' : `${joined.passesEnded} previous passes have ended`} and won’t renew.` : ''}
    </p>
  ) : null;

  const title = step === STEP.done
    ? (outcome?.kind === 'already' ? 'You’re already in' : 'You’re in')
    : step === STEP.switch
      ? (view?.needsSwitch ? `Switch to ${first}?` : `Before you join ${first}`)
      : `${plan.name} · ${price}`;

  return (
    <div className="fl-scrim" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="fl-sheet" role="dialog" aria-modal="true" aria-labelledby="co-title">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <h2 id="co-title">{title}</h2>
          <button type="button" className="fl-btn sm" onClick={onClose} disabled={busy} aria-label="Close">✕</button>
        </div>

        {step === STEP.email && (
          <form onSubmit={sendCode} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="fl-note">One account for the pass and the app. We email you a six-digit code; no password.</p>
            <div className="fl-field"><label htmlFor="co-name">Your name</label><input id="co-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} /></div>
            <div className="fl-field"><label htmlFor="co-email">Email</label><input id="co-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" /></div>
            {error && <div className="fl-error" role="alert">{error}</div>}
            <button type="submit" className="fl-btn accent lg" disabled={busy || !/\S+@\S+\.\S+/.test(email)}>{busy ? 'Sending…' : 'Email me a code'}</button>
            <p className="fl-note">By continuing you agree to the <a href="/terms">Terms</a> and the <a href="/privacy">Privacy Policy</a>.</p>
          </form>
        )}

        {step === STEP.code && (
          <form onSubmit={verify} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="fl-note">We sent a six-digit code to <b>{email}</b>.</p>
            <div className="fl-field fl-code"><label htmlFor="co-code" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Code</label>
              <input id="co-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} value={token} onChange={(e) => setToken(e.target.value)} autoFocus />
            </div>
            {error && <div className="fl-error" role="alert">{error}</div>}
            <button type="submit" className="fl-btn accent lg" disabled={busy || token.replace(/\D/g, '').length !== 6}>{busy ? 'Checking…' : 'Continue'}</button>
            <button type="button" className="fl-btn quiet" disabled={busy} onClick={() => { setToken(''); setStep(STEP.email); }}>Use another email</button>
          </form>
        )}

        {step === STEP.checking && (
          <p className="fl-note" aria-live="polite">{checkingNote}</p>
        )}

        {step === STEP.switch && view && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} aria-live="polite">
            {view.needsSwitch
              ? <p className="fl-copy">You train with <b>{currentName || 'another coach'}</b> now. Joining {first} moves you to them; your history with {currentName ? firstName(currentName) : 'your coach'} stays in their records.</p>
              : <p className="fl-copy">Joining {first} ends this:</p>}
            {ending.length > 0 && (
              <>
                {view.needsSwitch && <p className="fl-copy">Switching ends this:</p>}
                <ul className="fl-ending">{ending.map((p, i) => <li key={p.stripeSubscriptionId || `${p.planId || 'pass'}-${i}`}>{p.line}</li>)}</ul>
                <p className="fl-copy"><b>This happens as soon as you confirm, before the card form.</b> What’s listed stays ended even if you don’t finish paying for {plan.name}.</p>
              </>
            )}
            {error && <div className="fl-error" role="alert">{error}</div>}
            <button type="button" className="fl-btn accent lg" disabled={busy} onClick={confirmSwitch}>
              {busy ? 'Working…' : ending.length > 0 ? (view.needsSwitch ? `End my pass and switch to ${first}` : `End it and join ${first}`) : `Yes, switch to ${first}`}
            </button>
            <button type="button" className="fl-btn quiet" disabled={busy} onClick={onClose}>{view.needsSwitch ? 'Keep my coach' : 'Not now'}</button>
          </div>
        )}

        {step === STEP.pay && stripePromise && elementsOptions && !outcome && (
          <>
            {joinedNote}
            {owing && (
              <p className="fl-copy">
                This pass has an unpaid payment{Number(purchase?.amountDueCents) > 0 ? ` of ${cents(purchase.amountDueCents)}` : ''}. Paying it here settles the pass you already hold; it doesn’t start a second one.
              </p>
            )}
            <Elements stripe={stripePromise} options={elementsOptions}>
              <PayForm payLabel={payLabel} owing={owing} onPaid={paid} />
            </Elements>
          </>
        )}

        {step === STEP.pay && outcome && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} aria-live="polite">
            {joinedNote}
            <div className="fl-error" role="alert">{outcome.message}</div>
            {outcome.kind === 'unconfirmed' && (
              <>
                <p className="fl-note">It can take a minute. Open the FitLink app signed in with <b>{email}</b>; if the pass isn’t there soon, write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
                {outcome.canCheck !== false && (
                  <button type="button" className="fl-btn accent lg" disabled={busy} onClick={checkAgain}>{busy ? 'Checking…' : 'Check again'}</button>
                )}
              </>
            )}
            <button type="button" className="fl-btn quiet" disabled={busy} onClick={onClose}>Close</button>
          </div>
        )}

        {step === STEP.stopped && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} aria-live="polite">
            {joinedNote}
            <div className="fl-error" role="alert">{error}</div>
            {needsSignIn && <button type="button" className="fl-btn accent lg" disabled={busy} onClick={signInAgain}>Sign in again</button>}
            {canRetry && <button type="button" className="fl-btn accent lg" disabled={busy} onClick={begin}>{busy ? 'Checking…' : 'Check again'}</button>}
            <button type="button" className="fl-btn quiet" disabled={busy} onClick={onClose}>Close</button>
          </div>
        )}

        {step === STEP.done && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
            <div className="fl-ok" aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" style={{ fill: 'none', stroke: '#fff', strokeWidth: 2.8, strokeLinecap: 'round', strokeLinejoin: 'round' }} /></svg>
            </div>
            {joinedNote}
            <p style={{ fontSize: 17 }}>{first} sees you on their roster now. Your first week comes from them; you’ll find it in the FitLink app, signed in with <b>{email}</b>.</p>
            <a className="fl-btn accent lg" href={`${APP_SCHEME}invite/${code}`}>Open the FitLink app</a>
            <p className="fl-note">No app yet? Install FitLink from the App Store, sign in with the same email code, and the pass is already there.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PayForm({ payLabel, owing, onPaid }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error: err } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: window.location.href },
    });
    if (err) {
      setError(err.message || 'The card was declined.');
      setBusy(false);
      return;
    }
    await onPaid();
    setBusy(false);
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && <div className="fl-error" role="alert">{error}</div>}
      <button type="submit" className="fl-btn accent lg" disabled={!stripe || busy}>{busy ? 'Paying…' : `Pay ${payLabel}`}</button>
      <p className="fl-note">
        {owing ? 'Charged today. ' : 'Charged today, then as the pass says. '}
        Cancel any time from the app. Card details go to Stripe, never to FitLink.
      </p>
    </form>
  );
}
