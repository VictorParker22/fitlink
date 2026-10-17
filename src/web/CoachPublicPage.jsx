// /i/:code — a coach's public page (design "Coach · Public page (web)").
// The invite card gives the coach; `plans` gives the passes. Every line
// is a row: no quotes, no stats, no "replies same day" unless the data
// says so. Choose a pass → Checkout (email code, card, done). Someone who
// already trains with the coach is sent into the app with the code.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { inviteInfo, normalizeCode, plansFor, planIsPriced, dollars, firstName } from './api';
import { APP_SCHEME } from './supabase';
import Checkout from './Checkout';
import './web.css';

const Check = ({ dark }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" style={{ fill: 'none', stroke: dark ? '#F3F1EC' : '#15171C', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
  </svg>
);

function priceParts(plan) {
  const d = dollars(plan.price);
  if (plan.duration_weeks) return { amount: d, unit: `once · ${plan.duration_weeks} weeks` };
  return { amount: d, unit: `/ ${plan.period === 'year' ? 'year' : 'month'}` };
}

function startsLine(plan) {
  if (!plan.starts_on) return null;
  const d = new Date(`${plan.starts_on}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return `Starts ${d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}`;
}

export default function CoachPublicPage() {
  const { code: raw } = useParams();
  const code = normalizeCode(raw);
  const [state, setState] = useState({ loading: true, card: null, plans: [], error: null });
  const [buying, setBuying] = useState(null);

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
    document.title = coach?.name ? `${coach.name} — FitLink` : 'FitLink';
  }, [state.card]);

  if (state.loading) {
    return <div className="fl"><div className="fl-empty"><p className="fl-note">Loading…</p></div></div>;
  }
  if (state.error || !state.card) {
    const msg = state.error === 'rate_limited'
      ? 'Too many lookups from this connection. Try again in a little while.'
      : state.error === 'failed'
        ? 'Couldn’t reach FitLink. Check your connection and reload.'
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
        <p className="fl-sub">{coach.name ? `${coach.name} shared a live session.` : 'A coach shared a live session.'} Open it in the FitLink app with this link.</p>
        <div className="fl-actions"><a className="fl-btn accent lg" href={appLink}>Open in FitLink</a></div>
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

  const brand = coach.name || 'FitLink';
  const kicker = [coach.specialization, ...(Array.isArray(coach.specializations) ? coach.specializations.filter((s) => s !== coach.specialization) : [])]
    .filter(Boolean).slice(0, 2).join(' · ');
  const forSale = plans.filter(planIsPriced);
  const mostChosen = plans.length > 1 ? forSale.find((p) => !p.duration_weeks) ?? forSale[0] ?? null : null;

  return (
    <div className="fl">
      <header className="fl-header">
        <div className="fl-header-bar fl-glass">
          <a className="fl-brand" href="#top">{brand}</a>
          <div className="fl-nav">
            <a href={appLink}>I already train with {first}</a>
            {plans.length > 0 && <a className="fl-btn accent" href="#passes">Choose a pass</a>}
          </div>
        </div>
      </header>

      <section id="top" aria-label={`About ${coach.name || 'the coach'}`} className="fl-hero">
        <div className="fl-hero-copy">
          {kicker && <span className="fl-kicker">{kicker}</span>}
          <h1 className="fl-display">{coach.name || 'Your coach'}</h1>
          {coach.bio && <p className="fl-lede">{coach.bio}</p>}
          <div className="fl-actions">
            {plans.length > 0 && <a className="fl-btn accent lg" href="#passes">Choose a pass</a>}
            <a className="fl-btn lg" style={{ background: '#E7E3DB' }} href="#how">How it works</a>
          </div>
        </div>
        <div className="fl-photo" role="img" aria-label={coach.avatar_url ? `${coach.name}` : 'No photo yet'}>
          {coach.avatar_url && <img src={coach.avatar_url} alt="" />}
        </div>
      </section>

      <section id="passes" aria-labelledby="passes-h" className="fl-section">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 id="passes-h" className="fl-h2">{plans.length > 0 ? 'Pick a pass. Start this week.' : 'No pass yet.'}</h2>
          <p className="fl-sub">
            {plans.length > 0
              ? `Pay here — no app needed to buy. Your first week comes from ${first} once you’re in, and the app is waiting when you want it.`
              : `${first} hasn’t published a pass. Ask them, or check back soon.`}
          </p>
        </div>
        {plans.length > 0 && (
          <div className="fl-grid">
            {plans.map((plan) => {
              const dark = mostChosen && plan.id === mostChosen.id;
              // create-subscription refuses a pass without a price (plan_unpriced): never offer to buy one.
              const priced = planIsPriced(plan);
              const { amount, unit } = priceParts(plan);
              const lines = [startsLine(plan), ...(Array.isArray(plan.features) ? plan.features : [])].filter(Boolean);
              if (lines.length === 0 && plan.description) lines.push(plan.description);
              return (
                <article key={plan.id} className={`fl-pass${dark ? ' ink' : ''}`}>
                  <div className="fl-pass-head">
                    <h3>{plan.name}</h3>
                    {dark && <span className="badge">Most chosen</span>}
                  </div>
                  {priced && <div className="fl-price"><b>{amount}</b><span>{unit}</span></div>}
                  {lines.length > 0 && (
                    <ul>{lines.map((l, i) => <li key={i}><Check dark={dark} />{l}</li>)}</ul>
                  )}
                  {priced ? (
                    <button type="button" className={`fl-btn lg ${dark ? 'accent' : ''}`} onClick={() => setBuying(plan)}>
                      {plan.duration_weeks ? 'Join the season' : `Buy ${plan.name}`}
                    </button>
                  ) : (
                    <p className="fl-unpriced">No price set yet, so this pass can’t be bought. Ask {first} about it.</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section id="how" aria-labelledby="how-h" className="fl-section">
        <h2 id="how-h" className="fl-h2">How it works</h2>
        <ol className="fl-steps">
          <li className="fl-step"><span className="n">1</span><b>Buy a pass here</b><p>Card checkout, about a minute. Tell {first} your schedule, your lifts and anything that hurts.</p></li>
          <li className="fl-step"><span className="n">2</span><b>Get your first week</b><p>{first} writes it for your week. Open it in the FitLink app whenever you’re ready.</p></li>
          <li className="fl-step"><span className="n">3</span><b>Train, check in, adjust</b><p>Log your sets, say how it felt. The plan changes when you need it to.</p></li>
        </ol>
      </section>

      <section aria-label="Get started" className="fl-cta-wrap">
        <div className="fl-cta">
          <div className="fl-cta-row">
            <h2>Start Monday.</h2>
            {plans.length > 0 && <a className="fl-btn accent xl" href="#passes">Choose a pass</a>}
          </div>
          <div className="fl-cta-foot">
            <span>Payments, plans and messages run on FitLink.</span>
            <span>Questions? Message {first} after checkout.</span>
          </div>
        </div>
      </section>

      {buying && <Checkout plan={buying} coach={coach} code={code} onClose={() => setBuying(null)} />}
    </div>
  );
}
