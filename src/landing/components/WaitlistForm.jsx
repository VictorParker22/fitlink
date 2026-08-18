import { useState } from 'react';

/**
 * WaitlistForm — the site's first CTA that actually captures anyone.
 *
 * The audit's verdict on the mailto-only site was blunt and correct: a
 * visitor will not email a stranger's inbox to "get launch news", so every
 * visit converted to nothing. This form writes to a real table
 * (waitlist_signups) that exists solely as a write-only mailbox: the anon
 * key may insert under tight database CHECKs and can never read anything
 * back — see the migration for the whole security posture.
 *
 * DESIGN OF THE FAILURE PATHS, because a signup form's failures are where
 * trust is won or lost:
 *  · duplicate email → the database's unique index rejects it, and we show
 *    SUCCESS ("you're already on the list") — from the visitor's side,
 *    joining twice IS being on the list.
 *  · backend unreachable / table not yet migrated → the form degrades to
 *    the mailto link with an apology, so the path to us never fully closes.
 *  · junk input → caught client-side first, but the database CHECK is the
 *    actual gate; the client check is just faster feedback.
 *
 * The publishable key below is exactly that — publishable. It is the same
 * key that ships inside every copy of the app binary; the database's row
 * security is the boundary, not the key's secrecy.
 */

const SUPABASE_URL = 'https://qcmtaskhyhwzyoegtfpw.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_IxZ1QUlo0for6NcOQvf-xw_D0-vmrXL';
const FALLBACK = 'mailto:hello@fitlink.coach?subject=Tell%20me%20when%20FitLink%20launches';

const ROLES = [
  { key: 'coach', label: 'I coach' },
  { key: 'athlete', label: 'I train' },
  { key: 'gym', label: 'I run a gym' },
];

export default function WaitlistForm({ source = 'home' }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('coach');
  const [state, setState] = useState('idle'); // idle | sending | done | fallback

  const submit = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) return;

    setState('sending');
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist_signups`, {
        method: 'POST',
        headers: {
          apikey: PUBLISHABLE_KEY,
          Authorization: `Bearer ${PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
          // No representation back — the table is write-only by design and
          // asking for the row would just surface a permissions error.
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ email: value, role, source }),
      });

      // 201 = joined. 409 = unique index says they already joined, which is
      // the same outcome from where the visitor stands.
      if (res.status === 201 || res.status === 409) {
        setState('done');
        return;
      }
      setState('fallback');
    } catch {
      setState('fallback');
    }
  };

  if (state === 'done') {
    return (
      <div className="fl-wl fl-wl-done" role="status">
        <p className="fl-wl-done-title">You’re on the list.</p>
        <p className="fl-wl-done-body">
          One email when FitLink goes live{role === 'coach' ? ', and early access goes to coaches first' : ''}. No newsletter, no drip — the launch, and that’s it.
        </p>
      </div>
    );
  }

  if (state === 'fallback') {
    return (
      <div className="fl-wl fl-wl-done" role="alert">
        <p className="fl-wl-done-title">That didn’t go through.</p>
        <p className="fl-wl-done-body">
          Our fault, not yours. <a className="fl-inline-link" href={FALLBACK}>Email us instead</a> — it reaches a person.
        </p>
      </div>
    );
  }

  return (
    <form className="fl-wl" onSubmit={submit}>
      <div className="fl-wl-roles" role="radiogroup" aria-label="I am a">
        {ROLES.map((r) => (
          <button
            key={r.key}
            type="button"
            role="radio"
            aria-checked={role === r.key}
            className={`fl-chip ${role === r.key ? 'fl-chip-on' : ''}`}
            onClick={() => setRole(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="fl-wl-row">
        <input
          className="fl-wl-input"
          type="email"
          required
          placeholder="you@example.com"
          aria-label="Email address"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="fl-btn fl-wl-btn" type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? 'Joining…' : 'Get early access'}
        </button>
      </div>
      <p className="fl-wl-note">
        One email at launch. Nothing else, ever.
      </p>
    </form>
  );
}
