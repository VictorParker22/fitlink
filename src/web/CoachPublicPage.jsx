// /i/:code — a coach's public page (design "Coach · Public page (web)").
// The invite card gives the coach; `plans` gives the passes. Every line
// is a row: no quotes, no stats, no "replies same day" unless the data
// says so. Choose a pass → Checkout (email code, card, done). Someone who
// already trains with the coach is sent into the app with the code.
//
// Back from Sign in with Apple (/join moved here with `state.resume`: the plan
// id, the return's sentence, a typed name), the checkout reopens on that pass
// once the page has loaded, or the page says the pass is no longer for sale.
// The history state is cleared first, so a reload never reopens it. When the
// pass is gone and the account is a sign-up nobody finished (read from the
// server), its default trainers row goes (its name is public in
// trainers_public) and the browser is signed out, as /coach does it.
//
// Prices are per period ("$180 / month"); a season says how many payments
// it is billed in and what that comes to (season.js, the server's formula):
// a season stops billing by itself after its last payment (2026-10-17). A
// signed-in athlete whose season with this coach reads complete, and who
// holds no pass with them, is offered another season first; the card says
// every payment is made only when the server's 'season_complete' notice says
// so (the athlete can mark a season complete themselves). Whether a pass is a
// season is billing's answer (passBilling), never a truthy duration_weeks.
//
// Blocks and single sessions (2026-10-25, fitlink-app migration 20261025120000; words in blocks.js): a block card
// says "Starts Dec 1 · 8 weeks" and "$320 / month · 2 payments" (a dated block's payments counted from today, as the
// server counts them: joining late pays fewer; no "($640 in all)" here, because a Model B coach's athletes also pay a
// booking fee on each payment and this page cannot read whether the coach uses it: the checkout says the total once
// create-subscription answered, and the coach page PR shows `coach_page`'s total_cents), a session card "Session · Thu, Dec 3, 6:00 PM · 60 min ·
// $40" (or "Time arranged with <first>"). A dated block outside its sign-up window is shown with its day ("On sale from
// Sep 2", "Sign-ups closed Nov 30") and no Buy button; a session that has started is not listed (create-subscription
// refuses all three). A pass priced under the minimum charge (made before guard_plan_minimum; live has $1, $5 and $20
// ones) is listed with "No longer on sale. Ask <first>." and no Buy button (409 below_minimum). Under the sessions: the platform rule (cancel up to 24 hours before for a full refund) and the
// coach's own policy, as text, from trainers_public.cancellation_policy.
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  coachCancellationPolicy, inviteInfo, normalizeCode, plansFor, planIsPriced, firstName, finishedSeasonWith, foundingMember, freshUser, leaveUnfinishedAppleSignUp,
  session, takeAuthReturnNote,
} from './api';
import { appleSignUpUnfinished, RESUME_PASS_GONE, RESUME_SIGNED_OUT } from './appleAuth';
import { passBilling, passPriceParts } from './season';
import {
  belowMinimum, buyLabel, coachPolicyIntro, freeCancelLine, listedOnPage, passKind, paymentsFor, priceLine, saleCheck, saleLine,
  saleState, scheduleLine, sessionCardLine,
} from './blocks';
import { APP_SCHEME } from './supabase';
import Checkout from './Checkout';
import FoundingBadge from './FoundingBadge';
import './web.css';
import { BRAND_NAME } from './site/brand';

const Check = ({ dark }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" style={{ fill: 'none', stroke: dark ? '#F3F1EC' : '#15171C', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
  </svg>
);

/** A block with a length, by billing's rule (1..520 whole weeks); a session is one payment; anything else renews until cancelled. */
const isSeason = (plan) => passKind(plan) === 'block' && passBilling(plan).kind === 'season';

/** The big price on a card: "$320 / month", or "$40" + "one payment" for a session or a block of one payment now. */
function cardPrice(plan, payments) {
  const parts = passPriceParts(plan);
  if (!parts) return null;
  if (passKind(plan) === 'session' || payments === 1) return { amount: parts.amount, unit: 'one payment' };
  return { amount: parts.amount, unit: `/ ${passBilling(plan).period}` };
}

export default function CoachPublicPage() {
  const { code: raw } = useParams();
  const code = normalizeCode(raw);
  const [state, setState] = useState({ loading: true, card: null, plans: [], error: null });
  const [buying, setBuying] = useState(null);
  /** The signed-in athlete's completed season with this coach: { planId, planName, paidInFull } or null. */
  const [finished, setFinished] = useState(null);
  /** The coach holds a Founding grant (trainers_public.founding_member): the "Founding 15" badge. False on any failed read. */
  const [founding, setFounding] = useState(false);
  /** Bumped when the checkout closes, so a season bought there takes the offer away. */
  const [recheck, setRecheck] = useState(0);
  /** The moment the page judges sale windows and payment counts by (the server judges again at purchase). */
  const [now] = useState(() => Date.now());
  /** The coach's own cancellation policy: undefined while loading, a string, null (none written), or false (read failed). */
  const [policy, setPolicy] = useState(undefined);
  const [policyTry, setPolicyTry] = useState(0);

  // No sign-in returns here: take any tokens or error text out of the address
  // bar, silently (Stripe's 3DS parameters stay; only auth keys go).
  useEffect(() => { takeAuthReturnNote(); }, []);

  const location = useLocation();
  const navigate = useNavigate();
  const resumeRef = useRef(location.state?.resume ?? null);   // { planId, note, name }
  const [resume, setResume] = useState(null);                 // props for Checkout
  const [resumeMissing, setResumeMissing] = useState(false);
  /** The pass was gone and an unfinished Apple sign-up was signed out: said under RESUME_PASS_GONE. */
  const [resumeSignedOut, setResumeSignedOut] = useState(false);
  useEffect(() => {
    const r = resumeRef.current;
    if (!r || state.loading) return;
    resumeRef.current = null;
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });   // a reload must not reopen it
    const plan = state.card?.kind === 'coach' && !state.card?.expired ? state.plans.find((p) => p.id === r.planId && planIsPriced(p)) : null;
    if (plan) { setResume({ returnNote: r.note ?? null, resumeName: r.name ?? '' }); setBuying(plan); return; }
    setResumeMissing(true);
    (async () => {
      if (!(await session())) return;
      const user = await freshUser().catch(() => null);
      if (!appleSignUpUnfinished(user)) return;
      await leaveUnfinishedAppleSignUp();
      setResumeSignedOut(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.loading]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!code) { setState({ loading: false, card: null, plans: [], error: 'not_found' }); return; }
      try {
        const card = await inviteInfo(code);
        if (cancelled) return;
        if (!card) { setState({ loading: false, card: null, plans: [], error: 'not_found' }); return; }
        let plans = [];
        if (card.kind === 'coach' && card.coach?.id) {
          try { plans = await plansFor(card.coach.id); } catch { plans = []; }
        }
        if (!cancelled) setState({ loading: false, card, plans, error: null });
      } catch (e) {
        if (!cancelled) setState({ loading: false, card: null, plans: [], error: e.message === 'rate_limited' ? 'rate_limited' : 'failed' });
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  useEffect(() => {
    const coach = state.card?.coach;
    document.title = coach?.name ? `${coach.name} — ${BRAND_NAME}` : BRAND_NAME;
  }, [state.card]);

  // The badge: the server's column only; absent (before the migration), unreadable or false → no badge.
  const badgeCoachId = state.card?.kind === 'coach' ? state.card?.coach?.id ?? null : null;
  useEffect(() => {
    if (!badgeCoachId) return undefined;
    let cancelled = false;
    foundingMember(badgeCoachId).then((v) => { if (!cancelled) setFounding(v); });
    return () => { cancelled = true; };
  }, [badgeCoachId]);

  // Only with a session already in this browser (no sign-in is asked for).
  // A read that fails shows nothing: the offer is an invitation, not a fact
  // anyone needs to see. Asked again when the checkout closes.
  const coachId = state.card?.kind === 'coach' ? state.card?.coach?.id ?? null : null;
  useEffect(() => {
    if (!coachId) return undefined;
    let cancelled = false;
    finishedSeasonWith(coachId).then((f) => { if (!cancelled) setFinished(f); }).catch(() => { if (!cancelled) setFinished(null); });
    return () => { cancelled = true; };
  }, [coachId, recheck]);

  // The coach's policy, read only when a session is listed (it is shown under the sessions).
  const hasSession = state.plans.some((p) => passKind(p) === 'session' && listedOnPage(p, now));
  useEffect(() => {
    if (!coachId || !hasSession) return undefined;
    let cancelled = false;
    coachCancellationPolicy(coachId).then((v) => { if (!cancelled) setPolicy(v); }).catch(() => { if (!cancelled) setPolicy(false); });
    return () => { cancelled = true; };
  }, [coachId, hasSession, policyTry]);

  if (state.loading) {
    return <div className="fl"><div className="fl-empty"><p className="fl-note">Loading…</p></div></div>;
  }
  if (state.error || !state.card) {
    const msg = state.error === 'rate_limited'
      ? 'Too many lookups from this connection. Try again in a little while.'
      : state.error === 'failed'
        ? `Couldn’t reach ${BRAND_NAME}. Check your connection and reload.`
        : 'This link doesn’t point to a coach. Check it with whoever sent it.';
    return (
      <div className="fl"><div className="fl-empty">
        <h1 className="fl-title">Nothing here</h1>
        <p className="fl-sub">{msg}</p>
      </div></div>
    );
  }

  const { card, plans } = state;
  const coach = card.coach ?? {};
  const first = firstName(coach.name);
  const appLink = `${APP_SCHEME}invite/${code}`;

  if (card.kind === 'live') {
    return (
      <div className="fl"><div className="fl-empty">
        <h1 className="fl-title">{card.live?.title || 'A live session'}</h1>
        <p className="fl-sub">{coach.name ? `${coach.name} shared a live session.` : 'A coach shared a live session.'} Open it in the {BRAND_NAME} app with this link.</p>
        <div className="fl-actions"><a className="fl-btn accent lg" href={appLink}>Open in {BRAND_NAME}</a></div>
      </div></div>
    );
  }

  if (card.expired) {
    return (
      <div className="fl"><div className="fl-empty">
        <h1 className="fl-title">This link has expired</h1>
        <p className="fl-sub">Ask {first} for a fresh one.</p>
      </div></div>
    );
  }

  const brand = coach.name || BRAND_NAME;
  const kicker = [coach.specialization, ...(Array.isArray(coach.specializations) ? coach.specializations.filter((s) => s !== coach.specialization) : [])]
    .filter(Boolean).slice(0, 2).join(' · ');
  // A session that already started is not listed; a block outside its sign-up window is listed, not buyable.
  const listed = plans.filter((p) => listedOnPage(p, now));
  const buyable = (p) => saleCheck(p, now).ok;
  const forSale = listed.filter(buyable);
  const mostChosen = listed.length > 1 ? forSale.find((p) => !isSeason(p) && passKind(p) !== 'session') ?? forSale[0] ?? null : null;
  const sessions = listed.filter((p) => passKind(p) === 'session');

  return (
    <div className="fl">
      <header className="fl-header">
        <div className="fl-header-bar fl-glass">
          <a className="fl-brand" href="#top">{brand}</a>
          <div className="fl-nav">
            <a href={appLink}>I already train with {first}</a>
            {forSale.length > 0 && <a className="fl-btn accent" href="#passes">Choose a pass</a>}
          </div>
        </div>
      </header>

      <section id="top" aria-label={`About ${coach.name || 'the coach'}`} className="fl-hero">
        <div className="fl-hero-copy">
          {kicker && <span className="fl-kicker">{kicker}</span>}
          {founding && <FoundingBadge />}
          <h1 className="fl-display">{coach.name || 'Your coach'}</h1>
          {coach.bio && <p className="fl-lede">{coach.bio}</p>}
          <div className="fl-actions">
            {forSale.length > 0 && <a className="fl-btn accent lg" href="#passes">Choose a pass</a>}
            <a className="fl-btn lg" style={{ background: '#E7E3DB' }} href="#how">How it works</a>
          </div>
        </div>
        <div className="fl-photo" role="img" aria-label={coach.avatar_url ? `${coach.name}` : 'No photo yet'}>
          {coach.avatar_url && <img src={coach.avatar_url} alt="" />}
        </div>
      </section>

      {finished && (
        <section aria-labelledby="again-h" className="fl-section" style={{ paddingBottom: 0 }}>
          <div className="fl-again">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {finished.paidInFull ? (
                <>
                  <h2 id="again-h">{finished.planName ? `Your ${finished.planName} season is complete.` : 'Your season is complete.'}</h2>
                  <p>Every payment is made, so nothing more is charged. You keep the season and everything you logged.</p>
                </>
              ) : (
                <>
                  <h2 id="again-h">{finished.planName ? `You finished your ${finished.planName} season.` : 'You finished your season.'}</h2>
                  <p>Everything you logged stays with you.</p>
                </>
              )}
            </div>
            {forSale.length > 0
              ? <a className="fl-btn accent lg" href="#passes">Start another season with {first}</a>
              : <p>{first} has no pass for sale right now. Ask them about the next season.</p>}
          </div>
        </section>
      )}

      <section id="passes" aria-labelledby="passes-h" className="fl-section">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 id="passes-h" className="fl-h2">{forSale.length > 0 ? 'Pick a pass.' : listed.length > 0 ? 'No pass for sale yet.' : 'No pass yet.'}</h2>
          <p className="fl-sub">
            {forSale.length > 0
              ? `Pay here — no app needed to buy. Your first week comes from ${first} once you’re in, and the app is waiting when you want it.`
              : listed.length > 0
                ? (listed.some(planIsPriced) ? `Nothing here is on sale today. Each pass says when it is, or ask ${first}.` : `${first} hasn’t set a price on a pass yet. Ask them, or check back soon.`)
                : `${first} hasn’t published a pass. Ask them, or check back soon.`}
          </p>
          {resumeMissing && <div className="fl-error" role="alert">{RESUME_PASS_GONE}{resumeSignedOut ? ` ${RESUME_SIGNED_OUT}` : ''}</div>}
        </div>
        {listed.length > 0 && (
          <div className="fl-grid">
            {listed.map((plan) => {
              const dark = mostChosen && plan.id === mostChosen.id;
              // create-subscription refuses a pass without a price (plan_unpriced): never offer to buy one.
              const priced = planIsPriced(plan);
              const sale = saleState(plan, now);
              const payments = paymentsFor(plan, now);
              const price = cardPrice(plan, payments);
              const lines = [...(Array.isArray(plan.features) ? plan.features : [])].filter((l) => typeof l === 'string' && l);
              if (lines.length === 0 && plan.description) lines.push(plan.description);
              // What the pass is, then how it bills, then when it can be bought (blocks.js).
              const head = passKind(plan) === 'session'
                ? [sessionCardLine(plan, now, { first })]
                : [scheduleLine(plan, now, { first }), isSeason(plan) && priced ? priceLine(plan, { payments }) : null, saleLine(plan, now)];
              lines.unshift(...head.filter(Boolean));
              return (
                <article key={plan.id} className={`fl-pass${dark ? ' ink' : ''}`}>
                  <div className="fl-pass-head">
                    <h3>{plan.name}</h3>
                    {dark && <span className="badge">Most chosen</span>}
                  </div>
                  {priced && price && <div className="fl-price"><b>{price.amount}</b><span>{price.unit}</span></div>}
                  {lines.length > 0 && (
                    <ul>{lines.map((l, i) => <li key={i}><Check dark={dark} />{l}</li>)}</ul>
                  )}
                  {!priced ? (
                    <p className="fl-unpriced">No price set yet, so this pass can’t be bought. Ask {first} about it.</p>
                  ) : belowMinimum(plan) ? (
                    <p className="fl-unpriced">No longer on sale. Ask {first}.</p>
                  ) : !sale.open ? (
                    <p className="fl-unpriced">{sale.code === 'block_not_open'
                      ? `Not on sale yet. Come back then, or ask ${first} about it.`
                      : `Sign-ups have closed. Ask ${first} about the next block.`}</p>
                  ) : (
                    <button type="button" className={`fl-btn lg ${dark ? 'accent' : ''}`} onClick={() => { setResumeMissing(false); setResumeSignedOut(false); setResume(null); setBuying(plan); }}>
                      {buyLabel(plan)}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {sessions.length > 0 && (
        <section id="cancelling" aria-labelledby="cancel-h" className="fl-section" style={{ paddingTop: 0 }}>
          <div className="fl-policy">
            <h2 id="cancel-h" className="fl-h3">Cancelling a session</h2>
            <p>{freeCancelLine()}</p>
            {policy === undefined && <p className="fl-note" aria-live="polite">Loading {first}’s cancellation policy…</p>}
            {policy === false && (
              <p className="fl-note" role="alert">
                Couldn’t load {first}’s cancellation policy. <button type="button" className="fl-link" onClick={() => { setPolicy(undefined); setPolicyTry((n) => n + 1); }}>Try again</button>
              </p>
            )}
            {(policy === null || typeof policy === 'string') && <p>{coachPolicyIntro(first, policy)}</p>}
            {typeof policy === 'string' && <blockquote className="fl-policy-text">{policy}</blockquote>}
          </div>
        </section>
      )}

      <section id="how" aria-labelledby="how-h" className="fl-section">
        <h2 id="how-h" className="fl-h2">How it works</h2>
        <ol className="fl-steps">
          <li className="fl-step"><span className="n">1</span><b>Buy a pass here</b><p>Card checkout, about a minute. Tell {first} your schedule, your lifts and anything that hurts.</p></li>
          <li className="fl-step"><span className="n">2</span><b>Get your first week</b><p>{first} writes it for your week. Open it in the {BRAND_NAME} app whenever you’re ready.</p></li>
          <li className="fl-step"><span className="n">3</span><b>Train, check in, adjust</b><p>Log your sets, say how it felt. The plan changes when you need it to.</p></li>
        </ol>
      </section>

      <section aria-label="Get started" className="fl-cta-wrap">
        <div className="fl-cta">
          <div className="fl-cta-row">
            <h2>Ready when you are.</h2>
            {forSale.length > 0 && <a className="fl-btn accent xl" href="#passes">Choose a pass</a>}
          </div>
          <div className="fl-cta-foot">
            <span>Payments, plans and messages run on {BRAND_NAME}.</span>
            <span>Questions? Message {first} after checkout.</span>
          </div>
        </div>
      </section>

      {buying && (
        <Checkout plan={buying} coach={coach} code={code}
          returnNote={resume?.returnNote ?? null} resumeName={resume?.resumeName ?? ''} resumed={resume !== null}
          onClose={() => { setBuying(null); setResume(null); setRecheck((n) => n + 1); }} />
      )}
    </div>
  );
}
