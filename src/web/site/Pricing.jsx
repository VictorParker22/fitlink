// /pricing (Web-Pricing). Two cards, a monthly / yearly switch for Elite, the
// calculator ("which plan is cheaper for you?"), the comparison table and the
// pricing questions. Every figure is a constant in pricing.js; in development
// each one carries a "[confirm]" marker.
import { useState } from 'react';
import Faq from './Faq';
import { usePageMeta } from './meta';
import {
  APP_STORE_URL, ELITE_FEE_PERCENT, ELITE_MONTHLY_USD, ELITE_YEARLY_USD, FREE_ROSTER_CAP,
  NEEDS_CONFIRM, STANDARD_FEE_PERCENT, compare, eliteMonthlyCost, usd,
} from './pricing';

const Confirm = () => (NEEDS_CONFIRM ? <sup className="s-confirm" title="Confirm against platform_config / App Store Connect before launch">[confirm]</sup> : null);

const FAQ = [
  { q: 'What is the fee charged on?', a: 'Only on passes athletes buy through FitLink. Sell nothing, pay nothing.' },
  { q: 'Are card processing fees included?', a: `Yes. A pass is charged through FitLink’s Stripe account and the athlete’s payment, minus the FitLink fee, is transferred to yours; Stripe’s card processing fee comes out of FitLink’s share, not yours. When you refund a payment, Stripe may keep its processing fee.` },
  { q: 'Do my athletes pay anything extra?', a: 'No. They pay the price you set, plus any tax that applies where they live.' },
  { q: 'Is there an athlete limit?', a: `The free plan holds ${FREE_ROSTER_CAP} active athletes. Elite has no cap.` },
  { q: 'Can I switch plans?', a: 'Any time. Subscribe to Elite in the app under Profile; cancel it in your Apple Account’s subscriptions and you go back to Free when the period ends. The lower fee applies while Elite is active.' },
  { q: 'How does the lower fee reach my existing passes?', a: 'The fee is set on the server from your Elite status and applied to every pass payment, including renewals of passes your athletes already hold.' },
];

export default function Pricing() {
  usePageMeta('Pricing', `FitLink is free to start and takes ${STANDARD_FEE_PERCENT}% of each pass sold. Coach Elite lowers the fee to ${ELITE_FEE_PERCENT}%, removes the roster cap and drafts your replies.`);
  const [yearly, setYearly] = useState(false);
  const [rev, setRev] = useState(3000);
  const c = compare(rev, yearly);
  const eliteMonthly = eliteMonthlyCost(yearly);

  return (
    <>
      <section className="s-wrap s-section top" aria-labelledby="p-h" style={{ paddingBottom: 48 }}>
        <div className="s-stack" style={{ gap: 14, alignItems: 'center', textAlign: 'center' }}>
          <h1 id="p-h" className="s-h1 md">Free until it works.</h1>
          <p className="s-lede">No monthly bill to start. FitLink takes a share of the passes you sell, so we only earn when you do.</p>
          <div className="s-toggle" role="group" aria-label="Elite billing">
            <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)}>Monthly</button>
            <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)}>Yearly<small>{usd(ELITE_YEARLY_USD)} a year</small></button>
          </div>
        </div>
      </section>

      <section className="s-wrap s-section" aria-label="Plans" style={{ paddingBottom: 72 }}>
        <div className="s-plans lg">
          <article className="s-plan">
            <h2>Free</h2>
            <span className="s-price"><b>$0</b><span>a month</span></span>
            <span className="fee">{STANDARD_FEE_PERCENT}%<Confirm /> of each pass you sell</span>
            <ul>
              <li>Your coaching page and passes: monthly, yearly or a season</li>
              <li>Checkout on the web and in the app, payouts through Stripe</li>
              <li>Workout builder, seasons and the season editor on the web</li>
              <li>Check-ins, messages, athlete progress</li>
              <li>Up to {FREE_ROSTER_CAP} active athletes</li>
            </ul>
            <a className="fl-btn lg" href={APP_STORE_URL}>Start free in the app</a>
          </article>
          <article className="s-plan ink">
            <h2>Elite</h2>
            <span className="s-price">
              <b>{usd(yearly ? ELITE_YEARLY_USD / 12 : ELITE_MONTHLY_USD)}<Confirm /></b>
              <span>{yearly ? `a month, billed ${usd(ELITE_YEARLY_USD)} a year` : 'a month'}</span>
            </span>
            <span className="fee">{ELITE_FEE_PERCENT}%<Confirm /> of each pass you sell</span>
            <ul>
              <li>Everything in Free</li>
              <li>Half the fee on every pass</li>
              <li>No roster cap</li>
              <li>Replies drafted in your voice from the athlete’s check-in and their logged sets; you approve every one</li>
            </ul>
            <span className="foot">Subscribe in the app, under Profile. Billed through your Apple Account; the price you see there is the one that counts.</span>
          </article>
        </div>
      </section>

      <section className="s-wrap s-section" aria-labelledby="calc-h" style={{ paddingBottom: 72 }}>
        <div className="s-calc">
          <div className="s-calc-copy">
            <h2 id="calc-h" className="s-h2 xs">Which plan is cheaper for you?</h2>
            <label htmlFor="rev">What athletes pay you each month</label>
            <span className="rev" aria-live="polite">{usd(c.rev)}</span>
            <input id="rev" type="range" min="0" max="20000" step="250" value={rev} onChange={(e) => setRev(Number(e.target.value))} />
            <span className="s-fine">
              {c.breakEven === null ? 'Elite never pays for itself at these fees.' : `Elite pays for itself above ${usd(c.breakEven)} a month`}
              {yearly ? ` (yearly billing, ${usd(eliteMonthly)} a month).` : '.'}
            </span>
          </div>
          <div className="s-calc-cards" aria-live="polite">
            <div className={`s-calc-card${c.freeWins ? ' win' : ''}`}>
              <span className="t">Free</span><small>You pay FitLink</small><b>{usd(c.freeCost)}</b><small>You keep {usd(c.freeKeep)}</small>
            </div>
            <div className={`s-calc-card ink${c.freeWins ? '' : ' win'}`}>
              <span className="t">Elite</span><small>You pay FitLink</small><b>{usd(c.eliteCost)}</b><small>You keep {usd(c.eliteKeep)}</small>
            </div>
            <span className="s-verdict">{c.freeWins ? 'Free is cheaper for you right now.' : `Elite saves you ${usd(c.saves)} a month.`}</span>
          </div>
        </div>
      </section>

      <section className="s-wrap s-section" aria-labelledby="cmp-h" style={{ paddingBottom: 72 }}>
        <div className="s-stack" style={{ gap: 20 }}>
          <h2 id="cmp-h" className="s-h2 xs">Compare plans</h2>
          <div className="s-table-wrap">
            <table className="s-table">
              <thead><tr><th scope="col">Feature</th><th scope="col">Free</th><th scope="col">Elite</th></tr></thead>
              <tbody>
                <tr><th scope="row">Coaching page, passes, checkout</th><td>Included</td><td>Included</td></tr>
                <tr><th scope="row">Workout builder, seasons, season editor</th><td>Included</td><td>Included</td></tr>
                <tr><th scope="row">Check-ins, messages, progress</th><td>Included</td><td>Included</td></tr>
                <tr><th scope="row">Active athletes</th><td>Up to {FREE_ROSTER_CAP}</td><td>No cap</td></tr>
                <tr><th scope="row">Assistant drafts your replies</th><td>—</td><td>Included</td></tr>
                <tr><th scope="row">FitLink fee per pass</th><td className="strong">{STANDARD_FEE_PERCENT}%<Confirm /></td><td className="strong">{ELITE_FEE_PERCENT}%<Confirm /></td></tr>
                <tr><th scope="row">Price</th><td>$0</td><td>{yearly ? `${usd(ELITE_YEARLY_USD)} a year` : `${usd(ELITE_MONTHLY_USD)} a month`}<Confirm /></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="s-wrap narrow s-section" aria-labelledby="pfaq-h">
        <div className="s-stack" style={{ gap: 20 }}>
          <h2 id="pfaq-h" className="s-h2 xs">Pricing questions</h2>
          <Faq items={FAQ} labelledBy="pfaq-h" />
        </div>
      </section>
    </>
  );
}
