// /founding (launch plan Sprint 1 PR 2, 2026-10-25): the Founding offer, the
// live counter and the application form. Linked from nowhere yet (the site's
// "Claim a Founding spot" CTA is a later PR).
//
// What the server does (fitlink-app migration 20261025110000): founding_slots()
// is the counter, `{taken, total, closes_on, open}`, taken = spots the operator
// has GRANTED; apply_founding(...) writes the signed-in coach's own application,
// which takes no spot: Victor grants one after the setup call. A form that set
// founding itself would let anyone farm accounts and take all 15.
//
// Rules this page keeps:
// - The counter says only what founding_slots() said: nothing numeric while it
//   loads; when it fails, "Couldn't load how many spots are taken." with Try
//   again (never a guess). Full → a NEW application becomes a "tell me when a
//   spot opens" email; past the close → closed; an application already pending
//   or booked may still change its contact fields (the server keeps the rest).
//   The offer's own numbers (15, 12 months, $29.99, 5%, 10%, 5 athletes, 30 and
//   60 days, Dec 31) come from pricing.js.
// - Sign-in is the site's: an email code or Sign in with Apple (back to
//   /founding, a fixed path). The email code is sent with
//   `data: {signup: 'founding_web'}` and NO role (founding.js
//   FOUNDING_SIGN_UP_DATA): signInWithOtp makes the auth user when the code is
//   SENT, and fitlink-app 20261025110000's handle_new_user makes no trainers row
//   for that marker, so nothing is published for an address nobody proved.
//   An athlete account is told the page is for coach accounts and is never
//   converted (founding.js accountStep).
// - Nothing is written for an account before the person acts (review
//   2026-10-25: a role-less session left in the browser was made a coach on
//   page load). An account that is not a coach account yet (no rows and no
//   role, or an Apple sign-up nobody finished) is finished as a coach
//   (finishCoachSignUp: its trainers row, then role 'trainer') automatically
//   ONLY for this tab's own session: the code was typed here, or this tab
//   started Sign in with Apple on /founding (a sessionStorage marker, read once)
//   and the server says the account signed in after that (isOwnSession). Any
//   other session sees "Signed in as … · Not you? Sign out" and a "Continue as
//   a coach" button, and nothing is written before that tap. A coach account's
//   only write is Apply.
// - Who the account is: freshUser() + myRole(); a read that fails writes nothing
//   and offers Check again.
// - Refusals are worded from the RPC's keys (founding.js applyRefusal); an
//   answer that never came says the outcome is unknown, with Check again
//   (re-reads the caller's own application).
// - Nothing is emailed by the server. The booking link is the build's
//   VITE_FOUNDING_CALENDAR_URL (https only); without it the page says Victor
//   will write.
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import {
  appleAvailableHere, applyFounding, clearFoundingReturn, finishCoachSignUp, foundingSlots, freshUser, isStandaloneHere,
  myFoundingApplication, myRole, parkFoundingReturn, signInWithApple, signOutLocal, takeAuthReturnNote, takeFoundingReturn,
} from '../api';
import {
  accountLabel, metadataName, usedApple, FOUNDING_ATHLETE_ACCOUNT, FOUNDING_CONTINUE, FOUNDING_CONTINUE_BODY, FOUNDING_CONTINUE_TITLE,
  FOUNDING_CONTINUING, FOUNDING_NOT_COACH_TITLE, FOUNDING_SIGN_IN_SUB, OR_EMAIL, ROLE_ERROR_TITLE, TOO_MANY_CODES, signInHint,
} from '../appleAuth';
import { APPLE_WEB_ENABLED } from '../authConfig';
import AppleButton from '../AppleButton';
import FoundingBadge from '../FoundingBadge';
import {
  ATHLETE_BANDS, FOUNDING_SIGN_UP_DATA, NAME_MAX, PAY_METHODS, SPORT_MAX, accountStep, answersFrom, applyRefusal, bookingUrl,
  checkAnswers, closesLabel, closesLabelLong, contactOnly, foundingPhase, fullLine, isNewApplication, isOwnSession, parseSlots,
  slotsLine, statusLine,
} from '../founding';
import { usePageMeta } from './meta';
import {
  FOUNDING_CLOSES_ON, FOUNDING_ENDS_AFTER_DAYS_WITHOUT_PAYMENT, FOUNDING_FEE_PERCENT, FOUNDING_FREE_MONTHS,
  FOUNDING_MIN_PAYING_ATHLETES, FOUNDING_NOTICE_DAYS_BEFORE, FOUNDING_SLOTS, FOUNDING_THEN_MONTHLY_USD, FREE_ROSTER_CAP, NEEDS_CONFIRM,
  STANDARD_FEE_PERCENT, SUPPORT_EMAIL, usd,
} from './pricing';
import { BRAND_NAME, FOUNDER_FIRST_NAME } from './brand';

const Confirm = () => (NEEDS_CONFIRM ? <sup className="s-confirm" title="Confirm against pricing.json / the owner before launch">[confirm]</sup> : null);

/** The build's booking link, checked once: https or nothing. */
const BOOKING_URL = bookingUrl((import.meta.env ?? {}).VITE_FOUNDING_CALENDAR_URL);

const CLOSES = closesLabel(FOUNDING_CLOSES_ON);
const NOTIFY_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Tell me when a Founding spot opens')}`;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Founding() {
  usePageMeta('Founding coaches', `${FOUNDING_SLOTS} Founding spots for independent coaches: Elite free for a year from your first paid athlete, then ${usd(FOUNDING_THEN_MONTHLY_USD)} a month. Closes ${CLOSES}.`);

  /** founding_slots(): undefined while loading, null when the read failed, else parseSlots()'s answer. */
  const [slots, setSlots] = useState(undefined);
  /** Bumped to read the counter again (after a full or closed refusal). */
  const [slotsTick, setSlotsTick] = useState(0);
  useEffect(() => {
    let alive = true;
    foundingSlots().then((s) => { if (alive) setSlots(s); }, () => { if (alive) setSlots(null); });
    return () => { alive = false; };
  }, [slotsTick]);
  const loadSlots = useCallback(() => setSlotsTick((n) => n + 1), []);
  /** Try again after a failed read: back to "loading" (nothing numeric), then the server's answer. */
  const retrySlots = useCallback(() => { setSlots(undefined); setSlotsTick((n) => n + 1); }, []);
  const phase = foundingPhase(slots, todayIso());

  return (
    <div className="s-wrap tight s-founding">
      <section className="s-stack" aria-labelledby="f-h" style={{ gap: 16 }}>
        <span className="s-kicker">Founding coaches</span>
        <h1 id="f-h" className="s-h1 sm">
          {FOUNDING_SLOTS}<Confirm /> spots. Elite free for a year.<Confirm /> Closes {CLOSES}.<Confirm />
        </h1>
        <Counter phase={phase} slots={slots} onRetry={retrySlots} />
      </section>

      <section className="s-founding-cards" aria-label="The offer">
        <div className="s-founding-card">
          <h2 className="s-h3">What you get</h2>
          <ul className="s-bullets">
            <li>Coach Elite free for {FOUNDING_FREE_MONTHS}<Confirm /> months. The free year starts with the first payment one of your athletes makes through {BRAND_NAME} after your spot is granted, not the day you join.</li>
            <li>A {FOUNDING_FEE_PERCENT}%<Confirm /> fee on every pass you sell while your free year or Elite runs, instead of {STANDARD_FEE_PERCENT}%<Confirm /> on the free plan.</li>
            <li>The “Founding {FOUNDING_SLOTS}” badge on your coach page, for good.</li>
            <li>A setup call with {FOUNDER_FIRST_NAME} to get your passes, payouts and first athletes in.</li>
            <li>After the free year, Elite is {usd(FOUNDING_THEN_MONTHLY_USD)}<Confirm /> a month if you keep it. You get a notice {FOUNDING_NOTICE_DAYS_BEFORE}<Confirm /> days before the year ends; nothing is charged unless you start Elite. Without Elite you move to the free plan: a {STANDARD_FEE_PERCENT}%<Confirm /> fee and up to {FREE_ROSTER_CAP}<Confirm /> paying athletes.</li>
          </ul>
        </div>
        <div className="s-founding-card">
          <h2 className="s-h3">Who it’s for</h2>
          <ul className="s-bullets">
            <li>Independent coaches who will be live on {BRAND_NAME} with {FOUNDING_MIN_PAYING_ATHLETES}<Confirm /> or more paying athletes by {closesLabelLong(FOUNDING_CLOSES_ON)}.<Confirm /></li>
            <li>Coaches who get paid today by Venmo, Zelle, cash or card and want one place for passes, payment and training.</li>
            <li>Applications close {CLOSES}<Confirm />, or sooner when all {FOUNDING_SLOTS}<Confirm /> spots are taken.</li>
            <li>If none of your athletes pays through {BRAND_NAME} for {FOUNDING_ENDS_AFTER_DAYS_WITHOUT_PAYMENT}<Confirm /> days (counted from your grant or your last athlete payment), Founding pricing ends. The badge stays.</li>
          </ul>
        </div>
      </section>

      <Apply phase={phase} slots={slots} onSlots={(raw) => { const s = parseSlots(raw); if (s) setSlots(s); }} reloadSlots={loadSlots} />
    </div>
  );
}

/** The live counter: the server's numbers, or a sentence that says it couldn't load them (never a guess). */
function Counter({ phase, slots, onRetry }) {
  if (phase === 'loading') return <p className="s-founding-count" aria-busy="true" aria-label="Loading how many spots are taken" />;
  if (phase === 'unknown') {
    return (
      <div className="s-founding-count s-founding-count-failed" role="status">
        <span>Couldn’t load how many spots are taken.</span>
        <button type="button" className="fl-btn quiet" onClick={onRetry}>Try again</button>
      </div>
    );
  }
  if (phase === 'full') return <p className="s-founding-count" aria-live="polite"><b>{fullLine(slots.total)}</b></p>;
  if (phase === 'closed') return <p className="s-founding-count" aria-live="polite"><b>Founding spots closed on {closesLabelLong(slots.closesOn)}.</b></p>;
  const pct = Math.min(100, Math.round((slots.taken / slots.total) * 100));
  return (
    <div className="s-founding-count" aria-live="polite">
      <b>{slotsLine(slots)}</b>
      <span className="s-founding-meter" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
    </div>
  );
}

const STEP = {
  checking: 'checking', signin: 'signin', role: 'role', error: 'error', notCoach: 'notCoach',
  /** Not a coach account yet, and the session is not this tab's own: named, then the Continue tap. */
  confirm: 'confirm',
  finishing: 'finishing',
  coach: 'coach',
};

/** Who is signed in, then the coach's application or the form. */
function Apply({ phase, slots, onSlots, reloadSlots }) {
  const [step, setStep] = useState(STEP.checking);
  const [uid, setUid] = useState(null);
  const [user, setUser] = useState(null);
  /** The one sentence the sign-in screen opens with (a failed return, an expired sign-in). */
  const [note, setNote] = useState(null);
  const [errorText, setErrorText] = useState(null);
  /** { row, open } from myFoundingApplication. */
  const [app, setApp] = useState(null);
  const [attempt, setAttempt] = useState(0);
  /** Show the sign-in under a full or closed house (someone who already applied). */
  const [wantSignIn, setWantSignIn] = useState(false);
  /**
   * This tab's own sign-in, the only session finished as a coach without a tap:
   * `typedEmail` (a code typed in this tab), `appleStartedAt` (this tab's Sign
   * in with Apple marker, read and forgotten once on arrival; undefined until
   * read), `note` (the arrival's failure sentence: a failed return is not own).
   */
  const ownRef = useRef({ typedEmail: null, appleStartedAt: undefined, note: null });
  /** Resolves once the arrival's return has been read: the account step waits for it. */
  const arrivalRef = useRef(null);

  useEffect(() => {
    let alive = true;
    // Read and forget the marker before anything awaits (refs survive React's development double run).
    if (ownRef.current.appleStartedAt === undefined) ownRef.current.appleStartedAt = takeFoundingReturn();
    arrivalRef.current = (async () => {
      const { data } = await supabase.auth.getSession();   // waits for the PKCE exchange
      const n = await takeAuthReturnNote();
      if (n) ownRef.current.note = n;
      return data;
    })();
    (async () => {
      const data = await arrivalRef.current;
      if (!alive) return;
      const n = ownRef.current.note;
      if (n) { setNote(n); setWantSignIn(true); }
      const s = data.session ?? null;
      setUid(s?.user?.id ?? null);
      if (!s) setStep(STEP.signin);
    })();
    // Only state here: never await a Supabase call inside this callback (auth-js holds its lock).
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUid(s?.user?.id ?? null);
      if (!s) setStep(STEP.signin);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  // Who the account is, from the server, whenever the signed-in user changes.
  // Every sentence for the sign-in screen is set BEFORE a sign-out.
  useEffect(() => {
    if (!uid) return undefined;
    let alive = true;
    const goneTo = async (message) => {
      setNote(message);
      setWantSignIn(true);
      await signOutLocal();
      if (alive) { setUid(null); setStep(STEP.signin); }
    };
    (async () => {
      setStep(STEP.role);
      setErrorText(null);
      await arrivalRef.current;
      if (!alive) return;
      let u;
      try { u = await freshUser(); } catch (err) {
        if (!alive) return;
        if (err.code === 'unauthorized') { await goneTo(err.message); return; }
        setErrorText(err.message); setStep(STEP.error); return;
      }
      if (!alive) return;
      setUser(u);
      let role;
      try { role = await myRole(); } catch (err) {
        if (!alive) return;
        if (err.code === 'unauthorized') { await goneTo(err.message); return; }
        setErrorText(err.message); setStep(STEP.error); return;
      }
      if (!alive) return;
      const next = accountStep(u, role);
      // An athlete account stays an athlete account: never converted here.
      if (next === 'notCoach') { setStep(STEP.notCoach); return; }
      if (next === 'finish') {
        // Not a coach account yet. Finished without asking ONLY for this tab's own sign-in; any other
        // session (someone's, left in this browser) is named and waits for Continue as a coach.
        if (!isOwnSession(u, ownRef.current)) { setStep(STEP.confirm); return; }
        setStep(STEP.finishing);
        const done = await finishAsCoach(u, () => alive, goneTo);
        if (!done || !alive) return;
      }
      await loadApplication(u, () => alive, goneTo);
    })();
    return () => { alive = false; };
  }, [uid, attempt]);

  /**
   * The ONLY place this page makes a coach account: its trainers row when missing, then role 'trainer'
   * (finishCoachSignUp). Reached for this tab's own sign-in, or from the Continue tap. True when done.
   */
  async function finishAsCoach(u, isAlive, goneTo) {
    try { await finishCoachSignUp(u); } catch (err) {
      if (!isAlive()) return false;
      if (err.code === 'unauthorized') { await goneTo(err.message); return false; }
      setErrorText(err.message); setStep(STEP.error); return false;
    }
    // Used once: a later sign-in in this tab is judged afresh.
    ownRef.current = { typedEmail: null, appleStartedAt: null, note: null };
    if (!isAlive()) return false;
    try { setUser(await freshUser()); } catch { /* the name line only */ }
    return true;
  }

  /** The coach's own application (a read), then the coach step. */
  async function loadApplication(u, isAlive, goneTo) {
    try {
      const a = await myFoundingApplication(u.id);
      if (!isAlive()) return;
      setApp(a);
      setStep(STEP.coach);
    } catch (err) {
      if (!isAlive()) return;
      if (err.code === 'unauthorized') { await goneTo('Your sign-in has expired. Sign in again to continue.'); return; }
      setErrorText('We couldn’t read your application right now. Check again in a moment.');
      setStep(STEP.error);
    }
  }

  /** The Continue as a coach tap: the first write for a session this tab did not make. */
  async function continueAsCoach() {
    if (!user) return;
    setErrorText(null);
    setStep(STEP.finishing);
    const goneTo = (message) => signOut(message);
    const done = await finishAsCoach(user, () => true, goneTo);
    if (done) await loadApplication(user, () => true, goneTo);
  }

  /** Sign this browser out; `message` is the sentence the sign-in screen then opens with. */
  async function signOut(message = null) {
    setNote(message);
    if (message) setWantSignIn(true);
    await signOutLocal();
    setUid(null); setUser(null); setApp(null);
    setStep(STEP.signin);
  }

  const who = user ? (
    <div className="s-who">
      <span>Signed in as <b>{accountLabel(user) || 'this account'}</b>{usedApple(user) ? ' with Apple' : ''}</span>
      <button type="button" onClick={() => signOut()}>Not you? Sign out</button>
    </div>
  ) : null;

  const closedHouse = phase === 'full' || phase === 'closed';

  return (
    <section className="s-stack" aria-labelledby="apply-h" style={{ gap: 16 }}>
      <h2 id="apply-h" className="s-h2 xs">{step === STEP.coach && app?.row ? 'Your application' : 'Apply for a spot'}</h2>

      {step === STEP.checking && <div className="s-form" aria-live="polite"><p className="s-copy">Loading…</p></div>}

      {step === STEP.signin && closedHouse && !wantSignIn && (
        <div className="s-form">
          {phase === 'full' ? (
            <>
              <p className="s-copy">{fullLine(slots.total)} If one opens before {closesLabel(slots.closesOn)}, you can be the first to hear.</p>
              <a className="fl-btn accent lg" href={NOTIFY_MAILTO}>Tell me when a spot opens</a>
            </>
          ) : (
            <p className="s-copy">Founding spots closed on {closesLabelLong(slots.closesOn)}. The free plan and Elite are open to every coach.</p>
          )}
          <button type="button" className="fl-btn quiet" onClick={() => setWantSignIn(true)}>Already applied? Sign in</button>
        </div>
      )}

      {step === STEP.signin && (!closedHouse || wantSignIn) && (
        <SignIn key={note ?? ''} note={note} onCodeTyped={(email) => { ownRef.current.typedEmail = email; }} />
      )}

      {step === STEP.role && <div className="s-form" aria-live="polite"><p className="s-copy">Checking your account…</p></div>}

      {step === STEP.error && (
        <div className="s-form">
          {who}
          <b>{ROLE_ERROR_TITLE}</b>
          <p className="s-copy" role="alert">{errorText}</p>
          <button type="button" className="fl-btn accent lg" onClick={() => setAttempt((n) => n + 1)}>Check again</button>
        </div>
      )}

      {step === STEP.confirm && (
        <div className="s-form">
          {who}
          <b>{FOUNDING_CONTINUE_TITLE}</b>
          <p className="s-copy">{FOUNDING_CONTINUE_BODY}</p>
          <button type="button" className="fl-btn accent lg" onClick={continueAsCoach}>{FOUNDING_CONTINUE}</button>
        </div>
      )}

      {step === STEP.finishing && <div className="s-form" aria-live="polite">{who}<p className="s-copy">{FOUNDING_CONTINUING}</p></div>}

      {step === STEP.notCoach && (
        <div className="s-form">
          {who}
          <b>{FOUNDING_NOT_COACH_TITLE}</b>
          <p className="s-copy">{FOUNDING_ATHLETE_ACCOUNT}</p>
        </div>
      )}

      {step === STEP.coach && app && (
        <CoachApplication key={uid} user={user} who={who} app={app} setApp={setApp} phase={phase} slots={slots}
          onSlots={onSlots} reloadSlots={reloadSlots} onSignedOut={signOut}
          onRecheckRole={() => setAttempt((n) => n + 1)} />
      )}
    </section>
  );
}

/** The signed-in coach: their application's status, or the form. */
function CoachApplication({ user, who, app, setApp, phase, slots, onSlots, reloadSlots, onSignedOut, onRecheckRole }) {
  const row = app.row;
  const [editing, setEditing] = useState(false);
  const [answers, setAnswers] = useState(() => answersFrom(row, metadataName(user)));
  const [fieldError, setFieldError] = useState(null);
  const [error, setError] = useState(null);
  const [unknown, setUnknown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const email = String(user?.email ?? '').trim();
  const closedHouse = phase === 'full' || phase === 'closed';
  const decided = row?.status === 'granted' || row?.status === 'declined';
  const showForm = app.open && !decided && (editing || !row || row.status === 'withdrawn');
  /** Full or closed, with an application already pending or booked: only instagram and phone change (the server keeps the rest). */
  const limited = contactOnly(phase, row);

  async function submit(e) {
    e.preventDefault();
    setError(null); setFieldError(null); setUnknown(false); setJustSent(false);
    const checked = checkAnswers(answers);
    if (!checked.ok) { setFieldError(checked); return; }
    setBusy(true);
    const { data, error: err, status } = await applyFounding(checked.params);
    setBusy(false);
    if (!err && data?.application) {
      setApp({ row: data.application, open: true });
      onSlots(data.slots);
      setEditing(false);
      setJustSent(true);
      return;
    }
    const r = !err
      ? { message: 'We couldn’t tell whether your application was saved. Check again to see.', unknown: true, code: 'unknown' }
      : applyRefusal(err, status, { total: slots?.total, closesOn: slots?.closesOn, supportEmail: SUPPORT_EMAIL });
    if (r.code === 'not_authenticated') { await onSignedOut(r.message); return; }
    if (r.code === 'not_a_coach') { onRecheckRole(); return; }
    if (r.code === 'founding_full' || r.code === 'founding_closed') reloadSlots();
    setUnknown(r.unknown);
    setError(r.message);
  }

  /** After an answer that never came: read the caller's own application again. */
  async function checkAgain() {
    setBusy(true);
    try {
      const a = await myFoundingApplication(user.id);
      setApp(a);
      setUnknown(false);
      if (a.row && (!row || a.row.updated_at !== row.updated_at)) {
        setEditing(false); setError(null); setJustSent(true);
      } else {
        setError('Your application wasn’t saved. Your answers are still here; send it again.');
      }
    } catch {
      setError('We still couldn’t check. Check your connection, then check again.');
    } finally {
      setBusy(false);
    }
  }

  if (!app.open) {
    return <div className="s-form">{who}<p className="s-copy">Applications aren’t open yet. Try again later.</p></div>;
  }

  // Full or closed: a NEW application (no row, or a withdrawn one) is not taken. One already filed keeps its place.
  if (isNewApplication(row) && closedHouse) {
    return (
      <div className="s-form">
        {who}
        {phase === 'full' ? (
          <>
            <p className="s-copy">{fullLine(slots.total)}</p>
            <a className="fl-btn accent lg" href={NOTIFY_MAILTO}>Tell me when a spot opens</a>
          </>
        ) : <p className="s-copy">Founding spots closed on {closesLabelLong(slots.closesOn)}.</p>}
      </div>
    );
  }

  const set = (k) => (e) => setAnswers((a) => ({ ...a, [k]: e.target.value }));
  const toggle = (v) => setAnswers((a) => ({ ...a, pay: a.pay.includes(v) ? a.pay.filter((p) => p !== v) : [...a.pay, v] }));
  const fe = (k) => (fieldError?.field === k ? fieldError.message : null);

  return (
    <div className="s-form">
      {who}

      {row && !editing && (
        <div className="s-preview" aria-live="polite">
          {row.status === 'granted' && <FoundingBadge />}
          <b>{justSent && row.status === 'pending' ? 'Application sent.' : statusLine(row.status, SUPPORT_EMAIL)}</b>
          {justSent && row.status === 'pending' && <span>{statusLine('pending', SUPPORT_EMAIL)}</span>}
          {(row.status === 'pending' || row.status === 'booked') && (
            BOOKING_URL ? (
              <>
                {row.status === 'pending' && <span>Next: book your setup call with {FOUNDER_FIRST_NAME}.</span>}
                <a className="fl-btn accent lg" href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
                  {row.status === 'booked' ? 'Change your setup call' : 'Book your setup call'}
                </a>
              </>
            ) : row.status === 'pending' ? (
              <span>
                Nothing is emailed automatically: {FOUNDER_FIRST_NAME} will email you {email ? <>at <b>{email}</b></> : 'at the email on this account'} to set up the call.<Confirm />
              </span>
            ) : null
          )}
        </div>
      )}

      {row && !editing && !showForm && (
        <dl className="s-founding-answers">
          <dt>Name</dt><dd>{row.name}</dd>
          <dt>Coaches</dt><dd>{row.sport}</dd>
          <dt>Athletes today</dt><dd>{ATHLETE_BANDS.find((b) => b.value === row.athlete_band)?.label ?? row.athlete_band}</dd>
          <dt>Paid by</dt><dd>{(row.pay_methods ?? []).map((p) => PAY_METHODS.find((m) => m.value === p)?.label ?? p).join(', ')}</dd>
          {row.instagram && <><dt>Instagram</dt><dd>@{row.instagram}</dd></>}
          {row.phone && <><dt>Phone</dt><dd>{row.phone}</dd></>}
        </dl>
      )}

      {row && !editing && !decided && row.status !== 'withdrawn' && (
        <button type="button" className="fl-btn quiet" onClick={() => { setAnswers(answersFrom(row)); setEditing(true); setJustSent(false); }}>{limited ? 'Edit your contact details' : 'Edit your answers'}</button>
      )}

      {showForm && (
        <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!row && <p className="s-small">Applying doesn’t take a spot. {FOUNDER_FIRST_NAME} reads every application and sets up a call; a spot is yours after it.</p>}
          {limited && (
            <p className="s-small" role="note">
              {phase === 'full' ? 'All spots are taken now' : 'Founding spots are closed now'}, so only your Instagram and phone can change. The rest stays as you sent it.
            </p>
          )}
          <label htmlFor="f-name">Your name</label>
          <input id="f-name" value={answers.name} onChange={set('name')} maxLength={NAME_MAX} autoComplete="name" required aria-invalid={Boolean(fe('name'))} aria-describedby={fe('name') ? 'f-name-e' : undefined} disabled={busy || limited} />
          {fe('name') && <span id="f-name-e" className="fl-error">{fe('name')}</span>}

          <label htmlFor="f-sport">What you coach</label>
          <input id="f-sport" value={answers.sport} onChange={set('sport')} maxLength={SPORT_MAX} placeholder="Strength, running, Olympic lifting…" required aria-invalid={Boolean(fe('sport'))} aria-describedby={fe('sport') ? 'f-sport-e' : undefined} disabled={busy || limited} />
          {fe('sport') && <span id="f-sport-e" className="fl-error">{fe('sport')}</span>}

          <fieldset className="s-founding-set" aria-describedby={fe('band') ? 'f-band-e' : undefined}>
            <legend>Athletes you coach today</legend>
            <div className="s-founding-chips">
              {ATHLETE_BANDS.map((b) => (
                <button key={b.value} type="button" className="fl-chip" aria-pressed={answers.band === b.value} disabled={busy || limited}
                  onClick={() => setAnswers((a) => ({ ...a, band: b.value }))}>{b.label}</button>
              ))}
            </div>
            {fe('band') && <span id="f-band-e" className="fl-error">{fe('band')}</span>}
          </fieldset>

          <fieldset className="s-founding-set" aria-describedby={fe('pay') ? 'f-pay-e' : undefined}>
            <legend>How they pay you today</legend>
            <div className="s-founding-chips">
              {PAY_METHODS.map((m) => (
                <button key={m.value} type="button" className="fl-chip" aria-pressed={answers.pay.includes(m.value)} disabled={busy || limited}
                  onClick={() => toggle(m.value)}>{m.label}</button>
              ))}
            </div>
            <span className="hint">Pick every one that applies.</span>
            {fe('pay') && <span id="f-pay-e" className="fl-error">{fe('pay')}</span>}
          </fieldset>

          <label htmlFor="f-ig">Instagram <span className="hint">(optional)</span></label>
          <input id="f-ig" value={answers.instagram} onChange={set('instagram')} maxLength={80} placeholder="@yourhandle" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-invalid={Boolean(fe('instagram'))} aria-describedby={fe('instagram') ? 'f-ig-e' : undefined} disabled={busy} />
          {fe('instagram') && <span id="f-ig-e" className="fl-error">{fe('instagram')}</span>}

          <label htmlFor="f-phone">Phone <span className="hint">(optional, for the setup call)</span></label>
          <input id="f-phone" type="tel" value={answers.phone} onChange={set('phone')} maxLength={30} autoComplete="tel" aria-invalid={Boolean(fe('phone'))} aria-describedby={fe('phone') ? 'f-phone-e' : undefined} disabled={busy} />
          {fe('phone') && <span id="f-phone-e" className="fl-error">{fe('phone')}</span>}

          {error && <div className="fl-error" role="alert">{error}</div>}
          {unknown ? (
            <button type="button" className="fl-btn accent lg" disabled={busy} onClick={checkAgain}>{busy ? 'Checking…' : 'Check again'}</button>
          ) : (
            <button type="submit" className="fl-btn accent lg" disabled={busy}>{busy ? 'Sending…' : row && row.status !== 'withdrawn' ? 'Save your answers' : 'Apply for a Founding spot'}</button>
          )}
          {editing && <button type="button" className="fl-btn quiet" disabled={busy} onClick={() => { setEditing(false); setError(null); setFieldError(null); setUnknown(false); }}>Keep the answers I sent</button>}
          <p className="s-small">Your answers go to {FOUNDER_FIRST_NAME} only. Nothing is shown on your coach page.</p>
        </form>
      )}
    </div>
  );
}

/** Email code (a new account becomes a coach account once the code is verified) or Sign in with Apple, back to /founding. */
function SignIn({ note, onCodeTyped }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(note);
  const appleOk = appleAvailableHere();
  const [appleBusy, setAppleBusy] = useState(false);

  async function startApple() {
    setError(null);
    // This tab started it: the return to /founding may finish the account without asking (isOwnSession).
    parkFoundingReturn();
    try { await signInWithApple('founding'); return true; } catch (e) { clearFoundingReturn(); setError(e.message); return false; }
  }

  async function send(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    // A NEW account is made when the code is SENT, for an address nobody has proven yet: the marker (no role) keeps the
    // server from making a coach row for it (handle_new_user, 20261025110000). The page makes the coach row after the
    // code is verified. An existing account keeps its own metadata (Supabase ignores `data` for it).
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true, data: { ...FOUNDING_SIGN_UP_DATA } },
    });
    setBusy(false);
    if (err) {
      const text = String(err.message ?? '').toLowerCase();
      if (text.includes('rate') || err.status === 429) setError(TOO_MANY_CODES);
      else setError('Couldn’t send the code. Check the address and try again.');
      return;
    }
    setSent(true);
  }

  async function verify(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    const typed = email.trim().toLowerCase();
    // Before the call: the session it makes is this tab's own (the account step may run before verifyOtp resolves).
    onCodeTyped(typed);
    const { error: err } = await supabase.auth.verifyOtp({ email: typed, token: code.replace(/\D/g, ''), type: 'email' });
    setBusy(false);
    if (err) { onCodeTyped(null); setError('That code didn’t match. Check it or ask for a new one.'); }
  }

  return (
    <div className="s-form">
      <p className="s-copy">{sent ? <>We sent a six-digit code to <b>{email}</b>.</> : FOUNDING_SIGN_IN_SUB}</p>
      {!sent && appleOk && (
        <>
          <AppleButton size="md" onPress={startApple} disabled={busy} onBusyChange={setAppleBusy} />
          <p className="fl-or">{OR_EMAIL}</p>
        </>
      )}
      {!sent ? (
        <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label htmlFor="f-email">Email</label>
          <input id="f-email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy || appleBusy} />
          <span className="hint">{signInHint('founding', { available: appleOk, enabled: APPLE_WEB_ENABLED, standalone: isStandaloneHere() })}</span>
          {error && <div className="fl-error" role="alert">{error}</div>}
          <button type="submit" className="fl-btn accent lg" disabled={busy || appleBusy || !/\S+@\S+\.\S+/.test(email)}>{busy ? 'Sending…' : 'Email me a code'}</button>
        </form>
      ) : (
        <form onSubmit={verify} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="fl-field fl-code">
            <label htmlFor="f-code" className="s-visually-hidden">Code</label>
            <input id="f-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} autoFocus disabled={busy} />
          </div>
          {error && <div className="fl-error" role="alert">{error}</div>}
          <button type="submit" className="fl-btn accent lg" disabled={busy || code.replace(/\D/g, '').length !== 6}>{busy ? 'Checking…' : 'Continue'}</button>
          <button type="button" className="fl-btn quiet" disabled={busy} onClick={() => { setSent(false); setCode(''); setError(null); }}>Use another email</button>
        </form>
      )}
    </div>
  );
}
