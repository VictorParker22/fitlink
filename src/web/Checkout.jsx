// Buying a pass on the web: email → six-digit code (or Sign in with Apple,
// when this build offers it) → what joining ends → card → done. The account
// is the same Supabase user the app uses, so the first week lands in the app.
// The server computes the price and the payee from the plan
// (create-subscription); this sheet only ever sends ids.
//
// Apple leaves the page: the sheet parks {code, plan id, typed name} in this
// tab's sessionStorage, Apple returns to /join, and /join moves back to
// /i/CODE, which reopens this sheet with `returnNote` / `resumeName`. A
// brand-new Apple account (every identity Apple, no role) is first made an
// athlete the way the iOS app does it: claim_athlete_role at once (the
// trainers row handle_new_user made by default carries the person's name in
// trainers_public, so it goes before anything can stop the sheet, a name step
// closed included), then role 'client', asking for a name only when Apple
// gave none.
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
// A session this sheet did not make (by a code typed in it, or by this tab's
// own Apple return) may be somebody else's: a shared computer, an old tab, a
// coach who used /coach. The sheet then opens on "Signed in as … · Not you? Sign out" with
// Continue, and nothing is finished, joined or bought before that tap (review
// 2026-10-21: the join used to run on open, before the who-line). Who the
// account is comes from the server (freshUser), never the stored copy.
//
// Before anything can end a pass, the sheet checks what the page can already
// see would make the purchase fail afterwards (create-subscription's own
// rules): the pass has a price (plan_unpriced) and the coach can take a card
// (trainers_public.stripe_charges_enabled; payouts_not_ready). The server
// stays the authority; what only it can know (live_subscription on a second
// pass, stripe_error, db_error) can still refuse after a confirmed switch,
// and the sheet then says the old pass ended.
//
// create-subscription bills every pass as a subscription at the plan's price
// every month (or year). An open pass renews until it is cancelled; a season
// (plans.duration_weeks) is billed a fixed number of payments and then stops
// by itself (2026-10-17; season.js holds the server's formula). The sheet
// says which, with the number of payments and the total, before the card form.
//
// Blocks and single sessions (2026-10-25, fitlink-app migration 20261025120000; words in blocks.js): the sheet says
// what is bought, "Starts Dec 1 · 8 weeks · $320 / month · 2 payments" (+ "($640 in all)" once create-subscription
// answered) or "Session · Thu, Dec 3, 6:00 PM EST
// · 60 min · $40 · one payment · nothing renews". Before create-subscription answers, a dated block's payments are the
// page's count from now (season.js datedBlockPayments, the server's formula); once it answers, its `seasonPayments` is
// the number on every line. A pass outside its sale window (a session that started, a dated block before its sale
// opens or after its last sign-up day) stops the sheet before anything can end a pass; the server's own refusals
// (409 session_over / block_closed / block_not_open) are shown in its words. A pass priced under the minimum charge
// (made before guard_plan_minimum; live has $1, $5 and $20 ones) is not for sale either (below_minimum).
//
// Review 2026-10-25: the athlete-exit preview and confirm carry the plan id, so the SERVER refuses, before it ends
// anything, a plan create-subscription would refuse (archived, unpriced, under the minimum, outside its sale window, a
// session about to start), in create-subscription's sentence plus "Nothing was changed."; and right before the confirm
// the sheet reads the plan again and re-runs its own sale check (a coach can archive or reprice it, and a session can
// start, while the confirmation is on screen). The "($X in all)" total waits for create-subscription's answer: a Model
// B coach's athletes pay a booking fee on top of plans.price, and the invite page cannot read whether this coach uses it.
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { supabase, APP_SCHEME } from './supabase';
import {
  acceptInvite, appConfig, appleAvailableHere, claimAthleteRole, clearParkedCheckout, coachTakesCards, confirmSubscription,
  createSubscription, finishAthleteSignUp, firstName, freshUser, functionError, isStandaloneHere, myClient, pageInvite,
  parkCheckout, planNow, previewInvite, session, signInWithApple, signOutLocal,
} from './api';
import { chargedTotal, passBilling, passPriceParts } from './season';
import { chargeLine as blockChargeLine, passKind, paymentsFor, priceLine, saleCheck, scheduleLine, sessionCancelNote } from './blocks';
import {
  accountLabel, appleSignUpUnfinished, cleanName, metadataName, nameStepHint, nameStepTitle, signInHint, siteCopy, usedApple,
  whoStepBody, APPLE_PARK_FAILED, OR_EMAIL, SETTING_UP,
} from './appleAuth';
import { APPLE_WEB_ENABLED } from './authConfig';
import AppleButton from './AppleButton';
import { BRAND_NAME, SUPPORT_EMAIL } from './site/brand';
import { normalizeCode } from './codes';

const STEP = { email: 'email', code: 'code', who: 'who', name: 'name', checking: 'checking', switch: 'switch', pay: 'pay', done: 'done', stopped: 'stopped' };
/** The steps that carry "Signed in as … · Not you? Sign out" (a session is in the browser). */
const WHO_STEPS = new Set([STEP.who, STEP.name, STEP.switch, STEP.pay, STEP.stopped]);

// Refusals a second try cannot change: the sheet offers Close only.
const FINAL_CODES = new Set([
  'invite_not_found', 'invite_expired', 'invite_already_accepted', 'cannot_coach_yourself',
  'athlete_only', 'plan_archived', 'plan_not_found', 'coach_not_found', 'plan_unpriced', 'payouts_not_ready', 'trainer_in_use',
  'below_minimum', 'session_over', 'block_closed', 'block_not_open', 'page_not_found',
]);

/** coach_page's per-payment total ({ cents, bookingCents }), or null when it is not one. */
function validPageTotal(t) {
  if (!t || !Number.isInteger(t.cents) || t.cents <= 0) return null;
  const b = Number.isInteger(t.bookingCents) && t.bookingCents > 0 && t.bookingCents < t.cents ? t.bookingCents : 0;
  return { cents: t.cents, bookingCents: b };
}

function cents(amount) {
  const n = Math.max(0, Number(amount) || 0) / 100;
  return `$${n.toFixed(2)}`;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** The clock, read when a check runs (never during render). */
const clockNow = () => Date.now();

/** A refusal this page raises itself, before it sent anything. */
function stop(message, code = null) {
  return Object.assign(new Error(message), { code });
}

/** create-subscription's payouts_not_ready sentence ("Coach has not completed payment setup") is not written for a person. */
function payoutsNotReady(first, tail) {
  return `${first} hasn’t finished setting up payments, so this pass can’t be bought yet. Ask them to finish Payouts in the ${BRAND_NAME} app. ${tail}`;
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
    ? `We couldn’t reach ${BRAND_NAME}, so we can’t tell ${what}. Check again to see where things stand.`
    : err.fromServer
      ? `${err.message} We can’t tell from this answer ${what}. Check again to see where things stand.`
      : `${BRAND_NAME} didn’t answer clearly, so we can’t tell ${what}. Check again to see where things stand.`;
  return stop(message);
}

/**
 * `resumed`: this sheet reopened after this tab's own Sign in with Apple (/join,
 * from what the tab parked before leaving). A return with `returnNote` set did
 * not sign anyone in here, so a session found then is not taken as the person's.
 *
 * From a coach page (/c/<handle>, 2026-10-25) there is no invite code yet: `pageHandle` names the page, and the code
 * comes from page_invite (which renews or makes the coach's standing link, a write) only once the person said the
 * account is theirs and the page's own checks passed, right before the athlete-exit preview. `pageTotal` is
 * coach_page's `{ cents: total_cents, bookingCents: booking_fee_cents }`: the server's per-payment total, shown from
 * the first line (create-subscription's own answer replaces it). `pageSession` goes to create-subscription with
 * `source: 'coach_page'`; `onCardForm` runs once when the card form opens (the page logs checkout_start).
 */
export default function Checkout({
  plan, coach, code = null, onClose, returnNote = null, resumeName = '', resumed = false,
  pageHandle = null, pageSession = null, pageTotal = null, onCardForm = null,
}) {
  /** The invite code athlete-exit joins with: the link's own, or page_invite's answer for a coach page. */
  const codeRef = useRef(code ?? null);
  /** The same code for rendering (the done step's app link); set with codeRef. */
  const [joinCode, setJoinCode] = useState(code ?? null);
  /** The card form was reported open for this client secret (checkout_start, once). */
  const cardFormFor = useRef(null);
  const first = firstName(coach?.name);
  const [step, setStep] = useState(STEP.checking);
  const [checkingNote, setCheckingNote] = useState('One moment…');
  const [email, setEmail] = useState('');
  /** How the who-line names the signed-in account (accountLabel); null while nobody is signed in. */
  const [who, setWho] = useState(null);
  /**
   * The person said this session is theirs: they typed its code here, came back from
   * their own Apple sign-in, or tapped Continue under "Signed in as …". Until then
   * nothing is finished, joined or bought on it.
   */
  const identityOk = useRef(resumed && !returnNote);
  /** The signed-in account used Sign in with Apple: the who-line says so. */
  const [apple, setApple] = useState(false);
  const [name, setName] = useState(resumeName);
  /** Back from Apple without a session (cancelled, refused): said once, on the email step. */
  const returnNoteRef = useRef(returnNote);
  /** The name step was shown and answered (an empty answer keeps the server's fallback). */
  const nameAsked = useRef(false);
  /** The account whose default trainers row this sheet already removed (claim_athlete_role). */
  const claimedFor = useRef(null);
  const [appleBusy, setAppleBusy] = useState(false);
  const appleOk = appleAvailableHere();
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  /** athlete-exit's view: the preview, or the body of a 409 needs_confirmation. */
  const [view, setView] = useState(null);
  /** athlete-exit's answer once the join went through: { switched, passesEnded, clientId, … }. */
  const [joined, setJoined] = useState(null);
  const [clientId, setClientId] = useState(null);
  /** create-subscription's answer: { clientSecret, subscriptionId, payingOpenInvoice?, amountDueCents?, amountCents?, bookingFeeCents? }. */
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
  /** A switch confirm whose answer was lost: what it was asked to do, until a preview shows where things stand. */
  const lostSwitch = useRef(null);
  /** When the sheet opened: the moment its payment count is predicted for (create-subscription's answer replaces it). */
  const [openedAt] = useState(() => Date.now());

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy && !appleBusy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, appleBusy, onClose]);

  /** Park this pass for the way back, then leave for Apple. */
  async function startApple() {
    setError(null);
    const where = pageHandle ? { handle: pageHandle } : { code: codeRef.current };
    if (!parkCheckout({ ...where, planId: plan.id, name })) { setError(APPLE_PARK_FAILED); return false; }
    try { await signInWithApple('checkout'); return true; } catch (e) { clearParkedCheckout(); setError(e.message); return false; }
  }

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
    identityOk.current = true;   // a session this sheet made, with the person's own code
    await begin();
  }

  /** "Continue" under "Signed in as …": the person says the account is theirs. */
  function itsMe() {
    identityOk.current = true;
    begin();
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

  /**
   * "Not you? Sign out": a browser someone else signed in to must never pay onto
   * their account. Signs out here even when /logout can't be reached, forgets
   * everything this sheet learned about that account, and starts over at the email.
   */
  async function notMe() {
    setBusy(true); await signOutLocal(); setBusy(false);
    identityOk.current = false;
    claimedFor.current = null;
    lostSwitch.current = null;
    nameAsked.current = false;
    setName('');
    setEmail(''); setWho(null); setToken(''); setApple(false); setView(null); setJoined(null); setPurchase(null); setStripePromise(null);
    setOutcome(null); setError(null); setNeedsSignIn(false); setClientId(null); setStep(STEP.email);
  }

  /** The session expired: drop it here and ask for a fresh code. Nothing on the server changes. */
  async function signInAgain() {
    setBusy(true);
    await signOutLocal();
    setBusy(false);
    identityOk.current = false;
    setWho(null);
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
    // No price, a price under the minimum charge, a session that started, a dated block before its sale opens or after
    // its last sign-up day (create-subscription's own refusals): judged now, before a switch could end a pass for a
    // purchase that would be refused.
    assertOnSale(plan);
    let cfg;
    try {
      cfg = await appConfig();
    } catch (error) {
      // No answer, or app-config refused: say that, not "not set up".
      const e = await functionError(error);
      throw stop(`${e.message} Nothing was changed.`);
    }
    const pk = cfg?.stripePublishableKey;
    if (!pk || !String(pk).startsWith('pk_')) throw stop(`Payments aren’t set up on this page yet. Buy the pass in the ${BRAND_NAME} app instead. Nothing was changed.`);
    stripeKey.current = String(pk);
    let takesCards;
    try {
      takesCards = await coachTakesCards(plan.trainer_id);
    } catch {
      throw stop('We couldn’t check that this coach can take payments. Nothing was changed. Try again in a moment.');
    }
    if (takesCards === null) throw stop(`This coach is no longer on ${BRAND_NAME}. Nothing was changed.`, 'coach_not_found');
    if (!takesCards) throw stop(payoutsNotReady(first, 'Nothing was changed.'), 'payouts_not_ready');
  }

  /**
   * Open, after the code, after "Continue", and Check again. Signed out:
   * whether this page can sell the pass, then the email step. Signed in: who
   * the account is (from the server), and nothing more until the person said
   * it is theirs (the who step); then a new Apple account becomes an athlete
   * BEFORE anything can stop the sheet (a refusal must not leave it a coach
   * row named after the person); then whether the page can sell the pass;
   * then what joining this coach would end (athlete-exit preview). Nothing
   * here changes anything, except that sign-up and a join that the server
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
      const s = await session();
      if (!s) {
        setWho(null);
        await assertSellable();   // before asking anyone for an email
        setStep(STEP.email);
        if (returnNoteRef.current) { setError(returnNoteRef.current); returnNoteRef.current = null; }
        return;
      }
      // The stored copy names the account on screen at once (so "Not you?" is there even
      // when the server can't be reached); the server's copy decides everything after.
      setEmail(s.user.email ?? '');
      setWho(accountLabel(s.user));
      setApple(usedApple(s.user));
      const user = await freshUser();
      setEmail(user.email ?? '');
      setWho(accountLabel(user));
      setApple(usedApple(user));
      if (!identityOk.current) { setStep(STEP.who); return; }
      // A brand-new Apple account: an athlete first, as the iOS app makes one. Never for an
      // account with a role (claim_athlete_role would delete a real coach row). The default
      // trainers row goes first, before the name step, so closing the sheet there leaves none.
      if (appleSignUpUnfinished(user)) {
        setCheckingNote(SETTING_UP);
        if (claimedFor.current !== user.id) {
          await claimAthleteRole();
          claimedFor.current = user.id;
        }
        const typed = cleanName(name);
        if (!typed && !metadataName(user) && !nameAsked.current) { setStep(STEP.name); return; }
        await finishAthleteSignUp({ name: typed });
      }
      await assertSellable();
      setCheckingNote('Checking your passes…');
      const v = await previewInvite(await inviteCode(), { planId: plan.id });
      const lost = lostSwitch.current;
      lostSwitch.current = null;
      if (lost && v?.currentCoach?.id && v.currentCoach.id === v?.newCoach?.id) {
        // The lost confirm went through: this coach is the athlete's coach now. athlete-exit
        // runs accept_invite only after every pass it was ending has ended at Stripe.
        setJoined((prev) => ({
          ...(prev ?? {}),
          switched: prev?.switched === true || lost.needsSwitch,
          settled: true,
          listedEnded: lost.listed,
        }));
      }
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

  // On open (declared after begin(), which it calls): signed out, whether the
  // page can sell this pass at all, before asking for an email; a session that
  // already exists is named first (the who step), unless it is this tab's own
  // Apple return, which goes straight on.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * The invite code to join with. A coach page asks page_invite for the coach's standing code here, after the
   * person's own sign-in or their Continue and after the page's checks (it renews or makes the coach's link). Its
   * refusals are its own sentences (`page_not_found` is final, `rate_limited` can be tried again).
   */
  async function inviteCode() {
    if (codeRef.current) return codeRef.current;
    if (!pageHandle) throw stop('This link doesn’t point to a coach. Nothing was changed.', 'invite_not_found');
    let answer;
    try {
      answer = await pageInvite(pageHandle);
    } catch (err) {
      if (err?.code === 'unauthorized') throw stop(err.message, 'unauthorized');
      // Every other failure (no connection included: review 2026-10-25 m6) says that nothing ended or was bought; the
      // athlete-exit preview has not run yet.
      const said = `${err?.message || 'Something went wrong.'}`.trim();
      throw stop(/Nothing was changed\./.test(said) ? said : `${said} Nothing was changed.`, null);
    }
    if (answer?.ok === true && normalizeCode(answer.invite_code)) {
      codeRef.current = normalizeCode(answer.invite_code);
      setJoinCode(codeRef.current);
      return codeRef.current;
    }
    if (answer?.ok === false) {
      const sentence = typeof answer.error === 'string' && answer.error.trim() ? answer.error.trim() : 'This coach page can’t take a purchase right now.';
      throw stop(`${sentence} Nothing was changed.`, answer.code === 'not_authenticated' ? 'unauthorized' : answer.code ?? null);
    }
    throw stop(`${BRAND_NAME} didn’t answer clearly. Nothing was changed. Try again in a moment.`);
  }

  /** The page's own sale check on a plan row, now: throws the sentence, ending "Nothing was changed.". */
  function assertOnSale(p) {
    const check = saleCheck(p, clockNow(), { first });
    if (!check.ok) throw stop(`${check.sentence} Nothing was changed.`, check.code);
  }

  /**
   * The person said yes to what the preview listed. The confirm can end another pass, so right before it the plan is
   * read again and checked again (the server checks the same with the planId; this is the second lock).
   */
  async function confirmSwitch() {
    setError(null);
    setBusy(true);
    try {
      let fresh;
      try {
        fresh = await planNow(plan.id);
      } catch {
        throw stop(`We couldn’t check that ${plan.name} is still on sale. Nothing was changed. Try again in a moment.`);
      }
      if (!fresh || fresh.trainer_id !== plan.trainer_id) throw stop(`${plan.name} is no longer on sale. Ask ${first}. Nothing was changed.`, 'plan_archived');
      assertOnSale(fresh);
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
      accepted = await acceptInvite(codeRef.current, { confirm, planId: plan.id });
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
      if (confirm && err?.outcomeUnknown) {
        const listed = Array.isArray(view?.passesEnding) ? view.passesEnding.filter((p) => p && typeof p.line === 'string' && p.line).length : 0;
        lostSwitch.current = { needsSwitch: view?.needsSwitch === true, listed };
        throw unknownSwitch(err);
      }
      throw err;
    }
    // What the server confirmed in this sheet adds up across tries (a second
    // look after a refusal must not hide that a pass already ended).
    setJoined((prev) => ({
      ...accepted,
      switched: prev?.switched === true || accepted?.switched === true,
      passesEnded: (Number(prev?.passesEnded) || 0) + (Number(accepted?.passesEnded) || 0),
      settled: prev?.settled === true,
      listedEnded: Number(prev?.listedEnded) || 0,
    }));
    setView(null);
    await checkout(accepted?.clientId ?? null);
  }

  async function checkout(joinedClientId) {
    const id = joinedClientId ?? (await myClient())?.id ?? null;
    if (!id) throw new Error('Your athlete record isn’t ready yet. Reload and try again.');
    setClientId(id);
    const pk = stripeKey.current;
    if (!pk) throw new Error(`Payments aren’t set up on this page yet. Buy the pass in the ${BRAND_NAME} app instead.`);
    let res;
    try {
      res = await createSubscription(plan.id, id, { fromPage: Boolean(pageHandle), pageSession });
    } catch (err) {
      // The one refusal whose server sentence is not written for a person.
      if (err?.code === 'payouts_not_ready') {
        throw Object.assign(new Error(`${first} hasn’t finished setting up payments, so this pass can’t be bought yet. Ask them to finish Payouts in the ${BRAND_NAME} app. You haven’t been charged.`), { code: err.code });
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
   * sheet says only what it answered. Asked again (three tries, 1.5 s apart)
   * when no decided answer came back (no answer, a 5xx without a code) or the
   * answer was `active: false` without a code (the payment may not have
   * landed yet); a refusal (400, 401, 403, 404, 429, a coded 5xx) and
   * `roster_full` are final for this tap and their sentence is shown.
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
  // The card form is on screen: the coach page's funnel stage checkout_start, once per checkout started.
  useEffect(() => {
    if (step !== STEP.pay || !clientSecret || outcome || cardFormFor.current === clientSecret) return;
    cardFormFor.current = clientSecret;
    try { onCardForm?.(); } catch { /* the funnel never stops a payment */ }
  }, [step, clientSecret, outcome, onCardForm]);
  const elementsOptions = useMemo(() => clientSecret ? ({
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: { colorPrimary: '#C2410C', colorBackground: '#FFFFFF', colorText: '#15171C', borderRadius: '14px', fontFamily: '-apple-system, BlinkMacSystemFont, Helvetica, sans-serif' },
    },
  }) : null, [clientSecret]);

  const owing = purchase?.payingOpenInvoice === true;
  // Model B: create-subscription's own total (the booking fee inside it) replaces plans.price on every line from the
  // card form on; the booking fee is named as part of that total, never as a surcharge line of its own.
  // From a coach page, coach_page's total_cents is the server's per-payment total before create-subscription answers.
  // Once it answered (a client secret exists) its answer is the only total: without `amountCents` it charges
  // plans.price, so the page's total (read when the page loaded; the coach may have turned Model B off since) never
  // labels the Pay button (review 2026-10-25 m4).
  const total = owing ? null : purchase?.clientSecret ? chargedTotal(purchase) : validPageTotal(pageTotal);
  // How many payments this purchase makes: create-subscription's seasonPayments once it answered, else the page's
  // count from when the sheet opened (a dated block's from now; a session 1; an open pass null).
  const payments = paymentsFor(plan, openedAt, owing ? null : purchase);
  const billing = passBilling(plan, total);
  const isSession = passKind(plan) === 'session';
  // Per period, as create-subscription bills it; one payment (a session, a block of one payment) is the amount alone.
  const amount = passPriceParts(plan, total)?.amount ?? null;
  const due = owing && Number(purchase?.amountDueCents) > 0 ? cents(purchase.amountDueCents) : null;
  // Paying what is owed on a pass already held says what is owed, never this page's payment-count prediction (the
  // held pass bills by the count stamped when it was bought; the iOS rule).
  const price = owing ? (due ? `you owe ${due}` : 'what you owe')
    : !amount ? 'no price set' : isSession || payments === 1 ? amount : `${amount} / ${billing.period}`;
  // What is bought: "Starts Dec 1 · 8 weeks · $320 / month · 2 payments", and "($640 in all)" only once
  // create-subscription answered (its total holds a Model B booking fee); an open pass has no such line.
  const what = scheduleLine(plan, openedAt, { first });
  const seasonLine = what ? [what, priceLine(plan, { payments, total, serverTotal: Boolean(purchase?.clientSecret) || validPageTotal(pageTotal) !== null })].filter(Boolean).join(' · ') : null;
  // One payment has nothing left to cancel once it is paid; a session says the 24-hour rule instead.
  const chargeLine = owing
    ? `${due ?? 'Charged'} today, for the payment you owe on the pass you hold.`
    : `${blockChargeLine(plan, { nowMs: openedAt, payments, total })}${isSession ? ` ${sessionCancelNote(plan, first)}` : payments === 1 ? '' : ' Cancel any time from the app.'}`;
  const payLabel = owing && Number(purchase?.amountDueCents) > 0 ? cents(purchase.amountDueCents) : (passPriceParts(plan, total)?.amount ?? '');
  const ending = Array.isArray(view?.passesEnding) ? view.passesEnding.filter((p) => p && typeof p.line === 'string' && p.line) : [];
  const currentName = view?.currentCoach?.name || null;
  const passEnded = Number(joined?.passesEnded) > 0;
  const switched = joined?.switched === true;
  // A confirm whose answer was lost, then a preview that shows this coach as the athlete's own.
  const settled = joined?.settled === true;
  const listedEnded = Number(joined?.listedEnded) || 0;

  // What the server confirmed about the join, kept on screen through payment.
  const joinedNote = (passEnded || switched || settled) ? (
    <p className="fl-done-note" role="status">
      {switched ? `You’ve switched to ${first}.` : `You’ve joined ${first}.`}
      {passEnded ? ` ${Number(joined.passesEnded) === 1 ? 'Your previous pass has ended' : `${joined.passesEnded} previous passes have ended`} and won’t renew.` : ''}
      {!passEnded && settled && listedEnded > 0 ? ` ${listedEnded === 1 ? 'The pass listed before you confirmed has' : 'The passes listed before you confirmed have'} ended and won’t renew. Time already paid isn’t refunded.` : ''}
    </p>
  ) : null;

  const title = step === STEP.done
    ? (outcome?.kind === 'already' ? 'You’re already in' : 'You’re in')
    : step === STEP.switch
      ? (view?.needsSwitch ? `Switch to ${first}?` : `Before you join ${first}`)
      : `${plan.name} · ${price}`;

  return (
    <div className="fl-scrim" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy && !appleBusy) onClose(); }}>
      <div className="fl-sheet" role="dialog" aria-modal="true" aria-labelledby="co-title">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <h2 id="co-title">{title}</h2>
          <button type="button" className="fl-btn sm" onClick={onClose} disabled={busy} aria-label="Close">✕</button>
        </div>
        {who !== null && !needsSignIn && WHO_STEPS.has(step) && (
          <div className="fl-who">
            <span>Signed in{who ? <> as <b>{who}</b></> : ''}{apple ? ' with Apple' : ''}</span>
            <button type="button" onClick={notMe} disabled={busy}>Not you? Sign out</button>
          </div>
        )}
        {seasonLine && step !== STEP.done && step !== STEP.switch && !owing && <p className="fl-note">{seasonLine}</p>}

        {step === STEP.email && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="fl-note">{siteCopy(appleOk).checkoutIntro}</p>
            <p className="fl-note">By continuing you agree to the <a href="/terms">Terms</a> and the <a href="/privacy">Privacy Policy</a>.</p>
            {appleOk && (
              <>
                <AppleButton onPress={startApple} disabled={busy} onBusyChange={setAppleBusy} />
                <p className="fl-or">{OR_EMAIL}</p>
              </>
            )}
            <form onSubmit={sendCode} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="fl-field"><label htmlFor="co-name">Your name</label><input id="co-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} disabled={appleBusy} /></div>
              <div className="fl-field"><label htmlFor="co-email">Email</label><input id="co-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" disabled={appleBusy} /></div>
              <p className="fl-note">{signInHint('checkout', { available: appleOk, enabled: APPLE_WEB_ENABLED, standalone: isStandaloneHere() })}</p>
              {error && <div className="fl-error" role="alert">{error}</div>}
              <button type="submit" className="fl-btn accent lg" disabled={busy || appleBusy || !/\S+@\S+\.\S+/.test(email)}>{busy ? 'Sending…' : 'Email me a code'}</button>
            </form>
          </div>
        )}

        {step === STEP.who && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="fl-copy">{whoStepBody(plan.name)}</p>
            <button type="button" className="fl-btn accent lg" disabled={busy} onClick={itsMe}>Continue</button>
          </div>
        )}

        {step === STEP.name && (
          <form onSubmit={(e) => { e.preventDefault(); nameAsked.current = true; begin(); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="fl-copy">{nameStepTitle(first)}</p>
            <div className="fl-field"><label htmlFor="co-name2">Your name</label>
              <input id="co-name2" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} autoFocus /></div>
            <p className="fl-note">{nameStepHint(first)}</p>
            {error && <div className="fl-error" role="alert">{error}</div>}
            <button type="submit" className="fl-btn accent lg" disabled={busy}>{busy ? 'One moment…' : 'Continue'}</button>
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
              <PayForm payLabel={payLabel} chargeLine={chargeLine} onPaid={paid} />
            </Elements>
          </>
        )}

        {step === STEP.pay && outcome && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} aria-live="polite">
            {joinedNote}
            <div className="fl-error" role="alert">{outcome.message}</div>
            {outcome.kind === 'unconfirmed' && (
              <>
                {apple
                  ? <p className="fl-note">It can take a minute. Open the {BRAND_NAME} app and sign in with Apple; if the pass isn’t there soon, write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
                  : <p className="fl-note">It can take a minute. Open the {BRAND_NAME} app signed in with <b>{who || email}</b>; if the pass isn’t there soon, write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>}
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
            {apple
              ? <p style={{ fontSize: 17 }}>{first} sees you on their roster now. Your first week comes from them; you’ll find it in the {BRAND_NAME} app: sign in there with Apple.</p>
              : <p style={{ fontSize: 17 }}>{first} sees you on their roster now. Your first week comes from them; you’ll find it in the {BRAND_NAME} app, signed in with <b>{who || email}</b>.</p>}
            <a className="fl-btn accent lg" href={joinCode ? `${APP_SCHEME}invite/${joinCode}` : APP_SCHEME}>Open the {BRAND_NAME} app</a>
            <p className="fl-note">{apple
              ? `No app yet? Install ${BRAND_NAME} from the App Store, sign in with Apple, and the pass is already there.`
              : `No app yet? Install ${BRAND_NAME} from the App Store, sign in with the same email code, and the pass is already there.`}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PayForm({ payLabel, chargeLine, onPaid }) {
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
        {chargeLine} Card details go to Stripe, never to {BRAND_NAME}.
      </p>
    </form>
  );
}
