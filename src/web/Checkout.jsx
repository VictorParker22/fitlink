// Buying a pass on the web: email → six-digit code → card → done. The
// account is the same Supabase user the app uses, so the first week lands
// in the app. The server computes the price and the payee from the plan
// (create-subscription); this sheet only ever sends ids.
import { useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { supabase, APP_SCHEME } from './supabase';
import { acceptInvite, appConfig, confirmSubscription, createSubscription, dollars, firstName, myClient, session } from './api';

const STEP = { email: 'email', code: 'code', switch: 'switch', pay: 'pay', done: 'done' };

export default function Checkout({ plan, coach, code, onClose }) {
  const first = firstName(coach?.name);
  const [step, setStep] = useState(STEP.email);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [switchFrom, setSwitchFrom] = useState(null);
  const [client, setClient] = useState(null);
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [alreadyActive, setAlreadyActive] = useState(false);

  // A session may already exist (the person bought before, or opened the
  // code screen earlier): skip straight to joining.
  useEffect(() => {
    (async () => {
      const s = await session();
      if (s) {
        setEmail(s.user.email ?? '');
        await join(false);
      }
    })();
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
    try {
      const { error: err } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.replace(/\D/g, ''), type: 'email' });
      if (err) throw err;
      await join(false);
    } catch {
      setError('That code didn’t match. Check it or ask for a new one.');
      setBusy(false);
    }
  }

  /** accept_invite, then the server's checkout. */
  async function join(confirmSwitch) {
    setError(null);
    setBusy(true);
    try {
      try {
        await acceptInvite(code, confirmSwitch);
      } catch (err) {
        const text = String(err?.message ?? '');
        if (text.includes('needs_switch_confirmation')) {
          setSwitchFrom(text.split('needs_switch_confirmation:')[1]?.trim() || 'your coach');
          setStep(STEP.switch);
          setBusy(false);
          return;
        }
        if (text.includes('trainer_cannot_accept')) throw new Error('This email belongs to a coach account. Athletes need their own account; use another email.', { cause: err });
        if (text.includes('invite_expired')) throw new Error('This link has expired. Ask the coach for a fresh one.', { cause: err });
        throw new Error('Couldn’t join the coach. Reload and try again.', { cause: err });
      }
      const me = await myClient();
      if (!me) throw new Error('Your athlete record isn’t ready yet. Reload and try again.');
      setClient(me);
      const cfg = await appConfig().catch(() => ({}));
      const pk = cfg?.stripePublishableKey;
      if (!pk || !String(pk).startsWith('pk_')) throw new Error('Payments aren’t set up on this page yet. Buy the pass in the FitLink app instead.');
      const res = await createSubscription(plan.id, me.id);
      if (res?.alreadyActive) {
        setAlreadyActive(true);
        setStep(STEP.done);
        return;
      }
      if (!res?.clientSecret) throw new Error('Checkout didn’t start. Try again in a moment.');
      setStripePromise(loadStripe(pk));
      setClientSecret(res.clientSecret);
      setStep(STEP.pay);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      if (step === STEP.code) setStep(STEP.email);
    } finally {
      setBusy(false);
    }
  }

  async function paid() {
    // confirm-subscription activates the pass without waiting for the webhook.
    for (let i = 0; i < 3; i++) {
      try {
        const r = await confirmSubscription(client.id);
        if (r?.active) break;
      } catch { /* retry */ }
      await new Promise((r) => setTimeout(r, 1500));
    }
    setStep(STEP.done);
  }

  const elementsOptions = useMemo(() => clientSecret ? ({
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: { colorPrimary: '#C2410C', colorBackground: '#FFFFFF', colorText: '#15171C', borderRadius: '14px', fontFamily: '-apple-system, BlinkMacSystemFont, Helvetica, sans-serif' },
    },
  }) : null, [clientSecret]);

  const price = plan.duration_weeks ? `${dollars(plan.price)} once` : `${dollars(plan.price)} / ${plan.period === 'year' ? 'year' : 'month'}`;

  return (
    <div className="fl-scrim" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="fl-sheet" role="dialog" aria-modal="true" aria-labelledby="co-title">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <h2 id="co-title">
            {step === STEP.done ? (alreadyActive ? 'You’re already in' : `You’re in`) : `${plan.name} · ${price}`}
          </h2>
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

        {step === STEP.switch && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="fl-note">You train with <b>{switchFrom}</b> now. Buying this pass moves you to {first}; your history with {switchFrom} stays in their records.</p>
            {error && <div className="fl-error" role="alert">{error}</div>}
            <button type="button" className="fl-btn accent lg" disabled={busy} onClick={() => join(true)}>Yes, switch to {first}</button>
            <button type="button" className="fl-btn quiet" disabled={busy} onClick={onClose}>Keep my coach</button>
          </div>
        )}

        {step === STEP.pay && stripePromise && elementsOptions && (
          <Elements stripe={stripePromise} options={elementsOptions}>
            <PayForm price={price} onPaid={paid} />
          </Elements>
        )}

        {step === STEP.done && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
            <div className="fl-ok" aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" style={{ fill: 'none', stroke: '#fff', strokeWidth: 2.8, strokeLinecap: 'round', strokeLinejoin: 'round' }} /></svg>
            </div>
            <p style={{ fontSize: 17 }}>{first} sees you on their roster now. Your first week comes from them; you’ll find it in the FitLink app, signed in with <b>{email}</b>.</p>
            <a className="fl-btn accent lg" href={`${APP_SCHEME}invite/${code}`}>Open the FitLink app</a>
            <p className="fl-note">No app yet? Install FitLink from the App Store, sign in with the same email code, and the pass is already there.</p>
          </div>
        )}

        {busy && step !== STEP.pay && step !== STEP.email && step !== STEP.code && <p className="fl-note">Working…</p>}
      </div>
    </div>
  );
}

function PayForm({ price, onPaid }) {
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
      <button type="submit" className="fl-btn accent lg" disabled={!stripe || busy}>{busy ? 'Paying…' : `Pay ${price.split(' ')[0]}`}</button>
      <p className="fl-note">Charged today, then as the pass says. Cancel any time from the app. Card details go to Stripe, never to FitLink.</p>
    </form>
  );
}
