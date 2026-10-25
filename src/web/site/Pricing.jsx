// /pricing (Web-Pricing; launch plan W5 + Track B copy, 2026-10-25). Three plans in this
// order: Free, Elite, Founding; the calculator ("what you keep each month") with a column
// for each; the comparison table with a Founding column; the pricing questions.
//
// Every figure comes from pricing.js, which derives it from the server's own config
// (src/web/pricingConfig.json = fitlink-app supabase/config/pricing.json). All-in pricing:
// on the standard plans athletes pay exactly the price the coach sets, and Stripe's card
// processing comes out of the platform's fee, so no figure here is a surcharge or a
// "processing" line. Where Elite is bought is one sentence for everyone (planLines.js
// ELITE_WHERE, W5; owner decision R3): on the web from the coach dashboard (Stripe, US dollars),
// or in the iPhone app through the App Store, the App Store clause only in a build with
// VITE_APP_STORE_LIVE=on.
//
// Model B (a per-coach switch, off by default; server `coach_billing.model_b`) puts a
// booking fee INSIDE the athlete's total. Every sentence here is qualified to stay true for
// such a coach ("on the standard plans"; a booking fee is in the total shown before
// paying). The gate (copy plan, review 2026-10-25): Model B must not be switched on for a
// coach until the coach page shows the total before checkout (PR 3). Until then the web
// shows the total only from the card form on (create-subscription's amountCents), after
// athlete-exit's switch confirmation has already run.
//
// The free cap is never a refusal on the server (fee engine): a Free coach's 6th paying
// athlete pays and joins, and the coach's roster turns read-only for their athletes'
// plans until Elite (guard_roster_read_only).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Faq from './Faq';
import { usePageMeta } from './meta';
import { BRAND_NAME } from './brand';
import FoundingCta from './FoundingCta';
import { useFoundingView } from './useFoundingSlots';
import { ELITE_WHERE, FOUNDING_CLOSES_LABEL, PLAN_LINES, SIXTH_ATHLETE_RULE } from './planLines';
import {
  DISPUTE_FEE_USD, ELITE_FEE_PERCENT, ELITE_MONTHLY_USD, ELITE_YEARLY_USD, FOUNDING_FEE_PERCENT,
  FOUNDING_SLOTS, FOUNDING_THEN_MONTHLY_USD, FREE_ROSTER_CAP, MINIMUM_CHARGE_USD, STANDARD_FEE_PERCENT, foundingFreeWords,
  MODEL_B_BOOKING_FEE_USD, keepsByTier, stripeEstimateWords, usd,
} from './pricing';

const CLOSES = FOUNDING_CLOSES_LABEL;
const SIXTH_RULE = SIXTH_ATHLETE_RULE;

const FAQ = [
  { q: 'What is the fee charged on?', a: `Only on passes athletes buy through ${BRAND_NAME}. Sell nothing, pay nothing.` },
  { q: 'Are card processing fees included?', a: `Yes. A pass is charged through ${BRAND_NAME}’s Stripe account and the athlete’s payment, minus the ${BRAND_NAME} fee, is transferred to yours. Stripe’s card processing (${stripeEstimateWords()}) comes out of ${BRAND_NAME}’s fee, not out of what you keep. When you refund a payment, Stripe may keep its processing fee.` },
  { q: 'Do my athletes pay anything extra?', a: `On the standard plans, athletes pay exactly the price you set: there is no processing charge or surcharge at checkout. A coach who uses a booking fee (${usd(MODEL_B_BOOKING_FEE_USD.block_payment)} a payment) has it included in the total the athlete is shown before paying, never added after.` },
  { q: 'Is there an athlete limit?', a: `${SIXTH_RULE} Elite and Founding have no cap.` },
  { q: 'Is there a minimum price?', a: `Yes: a pass costs at least ${usd(MINIMUM_CHARGE_USD)} a payment.` },
  { q: 'How do I start or stop Elite?', a: (<><p>{ELITE_WHERE.buy} On the web it is monthly ({usd(ELITE_MONTHLY_USD)}) or yearly ({usd(ELITE_YEARLY_USD)}); your <Link to="/coach">coach dashboard</Link> has the buttons.</p><p>{ELITE_WHERE.manage}</p></>) },
  { q: 'How does the lower fee reach my existing passes?', a: 'The fee is set on the server from your plan and applied to every pass payment, including renewals of passes your athletes already hold.' },
  { q: 'What does a dispute cost?', a: `${usd(DISPUTE_FEE_USD)} for each dispute, won or lost; an inquiry costs nothing. It comes out of what Stripe pays you for that payment or for your next ones.` },
  { q: 'What is Founding?', a: (<p>{FOUNDING_SLOTS} coaches get Elite free for {foundingFreeWords()} and a {FOUNDING_FEE_PERCENT}% fee. The free year starts with the first payment one of your athletes makes after your spot is granted. After it, Elite is {usd(FOUNDING_THEN_MONTHLY_USD)} a month if you keep it, or you move to the free plan. Applications close {CLOSES}. <Link to="/founding">Apply for a Founding spot</Link>.</p>) },
];

/** The Founding plan's button: "Apply for a spot" while Founding is open, "Join as a coach" once it is not (R4). */
function FoundingCardButton() {
  const { mode } = useFoundingView();
  return <Link className="fl-btn lg" to="/founding">{mode === 'join' ? 'Join as a coach' : 'Apply for a spot'}</Link>;
}

export default function Pricing() {
  usePageMeta('Pricing', `${BRAND_NAME} is free to try and takes ${STANDARD_FEE_PERCENT}% of each pass sold. Coach Elite is ${usd(ELITE_MONTHLY_USD)} a month: a ${ELITE_FEE_PERCENT}% fee, no athlete cap and the assistant.`);
  const [yearly, setYearly] = useState(false);
  const [rev, setRev] = useState(3000);
  const k = keepsByTier(rev, yearly);

  return (
    <>
      <section className="s-wrap s-section top" aria-labelledby="p-h" style={{ paddingBottom: 48 }}>
        <div className="s-stack" style={{ gap: 14, alignItems: 'center', textAlign: 'center' }}>
          <h1 id="p-h" className="s-h1 md">Free to try.</h1>
          <p className="s-lede">No monthly bill to start. {BRAND_NAME} takes a share of the passes you sell, and on the standard plans your athletes pay exactly the price you set.</p>
        </div>
      </section>

      <section className="s-wrap s-section" aria-label="Plans" style={{ paddingBottom: 72 }}>
        <div className="s-plans lg three">
          <article className="s-plan">
            <h2>Free</h2>
            <span className="s-price"><b>$0</b><span>a month</span></span>
            <span className="fee">{PLAN_LINES.free}</span>
            <ul>
              <li>Your coaching page and passes: monthly, yearly or a season</li>
              <li>Checkout on the web and in the app, payouts through Stripe</li>
              <li>Workout builder, seasons and the season editor on the web</li>
              <li>Check-ins, messages, athlete progress</li>
            </ul>
            <p className="s-rule">{SIXTH_RULE}</p>
            <FoundingCta className="fl-btn lg" />
          </article>
          <article className="s-plan ink">
            <h2>Elite</h2>
            <span className="s-price"><b>{usd(ELITE_MONTHLY_USD)}</b><span>a month, or {usd(ELITE_YEARLY_USD)} a year</span></span>
            <span className="fee">{PLAN_LINES.elite}</span>
            <ul>
              <li>Everything in Free</li>
              <li>Half the fee on every pass</li>
              <li>No athlete cap</li>
              <li>Replies drafted in your voice from the athlete’s check-in and their logged sets; you approve every one</li>
            </ul>
            <Link className="fl-btn lg accent" to="/coach">Subscribe on the web</Link>
            <span className="foot">{ELITE_WHERE.buy}</span>
          </article>
          <article className="s-plan">
            <h2>Founding</h2>
            <span className="s-price"><b>$0</b><span>for the first year</span></span>
            <span className="fee">{PLAN_LINES.founding}</span>
            <ul>
              <li>Elite free for {foundingFreeWords()}, from your first athlete payment after your spot is granted</li>
              <li>A {FOUNDING_FEE_PERCENT}% fee while the free year or Elite runs</li>
              <li>The “Founding {FOUNDING_SLOTS}” badge on your coach page</li>
              <li>After the year: Elite at {usd(FOUNDING_THEN_MONTHLY_USD)} a month, or the free plan</li>
            </ul>
            <FoundingCardButton />
          </article>
        </div>
      </section>

      <section className="s-wrap s-section" aria-labelledby="calc-h" style={{ paddingBottom: 72 }}>
        <div className="s-calc three">
          <div className="s-calc-copy">
            <h2 id="calc-h" className="s-h2 xs">What you keep each month</h2>
            <label htmlFor="rev">What athletes pay you each month</label>
            <span className="rev" aria-live="polite">{usd(k.rev)}</span>
            <input id="rev" type="range" min="0" max="20000" step="250" value={rev} onChange={(e) => setRev(Number(e.target.value))} />
            <div className="s-toggle" role="group" aria-label="Elite billing" style={{ alignSelf: 'flex-start' }}>
              <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)}>Elite monthly</button>
              <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)}>Yearly<small>{usd(ELITE_YEARLY_USD)} a year</small></button>
            </div>
          </div>
          <div className="s-calc-cards" aria-live="polite">
            <div className={`s-calc-card${k.freeWins ? ' win' : ''}`} data-tier="free">
              <span className="t">Free</span>
              <small>You keep</small><b>{usd(k.free.keep)}</b>
              <small>{STANDARD_FEE_PERCENT}% fee: {usd(k.free.fee)}</small>
              <small>Up to {FREE_ROSTER_CAP} paying athletes</small>
            </div>
            <div className={`s-calc-card ink${k.freeWins ? '' : ' win'}`} data-tier="elite">
              <span className="t">Elite</span>
              <small>You keep</small><b>{usd(k.elite.keep)}</b>
              <small>{ELITE_FEE_PERCENT}% fee: {usd(k.elite.fee)}</small>
              <small>Elite: {usd(k.elite.subscription)} a month{yearly ? ' (billed yearly)' : ''}</small>
            </div>
            <div className="s-calc-card" data-tier="founding">
              <span className="t">Founding</span>
              <small>You keep</small><b>{usd(k.founding.keep)}</b>
              <small>{FOUNDING_FEE_PERCENT}% fee: {usd(k.founding.fee)}</small>
              <small>First year: no subscription</small>
            </div>
            <span className="s-verdict">
              {k.freeWins
                ? 'Free leaves you more right now.'
                : `Elite leaves you ${usd(k.eliteGain)} more a month than Free.`}
              {k.breakEven !== null && ` Elite pays for itself above ${usd(k.breakEven)} a month.`}
            </span>
            <span className="s-fine s-calc-note">
              On the standard plans, athletes pay exactly the price you set. Stripe’s card processing ({stripeEstimateWords()}) comes out of {BRAND_NAME}’s fee, not out of what you keep. Founding is {FOUNDING_SLOTS} spots; after its first year it is Elite at {usd(FOUNDING_THEN_MONTHLY_USD)} a month or the free plan.
            </span>
          </div>
        </div>
      </section>

      <section className="s-wrap s-section" aria-labelledby="cmp-h" style={{ paddingBottom: 72 }}>
        <div className="s-stack" style={{ gap: 20 }}>
          <h2 id="cmp-h" className="s-h2 xs">Compare plans</h2>
          <div className="s-table-wrap">
            <table className="s-table">
              <thead><tr><th scope="col">Feature</th><th scope="col">Free</th><th scope="col">Elite</th><th scope="col">Founding</th></tr></thead>
              <tbody>
                <tr><th scope="row">Coaching page, passes, checkout</th><td>Included</td><td>Included</td><td>Included</td></tr>
                <tr><th scope="row">Workout builder, seasons, season editor</th><td>Included</td><td>Included</td><td>Included</td></tr>
                <tr><th scope="row">Check-ins, messages, progress</th><td>Included</td><td>Included</td><td>Included</td></tr>
                <tr><th scope="row">Paying athletes</th><td>Up to {FREE_ROSTER_CAP}*</td><td>No cap</td><td>No cap</td></tr>
                <tr><th scope="row">Assistant drafts your replies</th><td>—</td><td>Included</td><td>Included</td></tr>
                <tr><th scope="row">{BRAND_NAME} fee per pass</th><td className="strong">{STANDARD_FEE_PERCENT}%</td><td className="strong">{ELITE_FEE_PERCENT}%</td><td className="strong">{FOUNDING_FEE_PERCENT}%</td></tr>
                <tr><th scope="row">Lowest pass price</th><td>{usd(MINIMUM_CHARGE_USD)} a payment</td><td>{usd(MINIMUM_CHARGE_USD)} a payment</td><td>{usd(MINIMUM_CHARGE_USD)} a payment</td></tr>
                <tr><th scope="row">Price</th><td>$0</td><td>{usd(ELITE_MONTHLY_USD)} a month or {usd(ELITE_YEARLY_USD)} a year</td><td>Free for the first year; {FOUNDING_SLOTS} spots, closes {CLOSES}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="s-fine">* {SIXTH_RULE}</p>
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
