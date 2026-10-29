// /pricing: the Benchside design's pricing page (benchside-website `_source/page_pricing.py`,
// calculator arithmetic and sentences from `assets/site.js`), ported 2026-10-29. Three plans in
// this order: Free, Coach Elite (featured), Founding; the calculator ("what you keep each
// month") with a card for each; the comparison table with a Founding column; the pricing
// questions; the final call to action.
//
// Every figure comes from pricing.js, which derives it from the server's own config
// (src/web/pricingConfig.json = fitlink-app supabase/config/pricing.json). All-in pricing:
// on the standard plans athletes pay exactly the price the coach sets, and Stripe's card
// processing comes out of the platform's fee, so no figure here is a surcharge or a
// "processing" line. Elite is sold on the web (Stripe, from the coach dashboard, which the
// app opens); a coach who already holds Elite through the App Store keeps it there.
//
// Model B (a per-coach switch, off by default; server `coach_billing.model_b`) puts a
// booking fee INSIDE the athlete's total. Every sentence here is qualified to stay true for
// such a coach ("on the standard plans"; a booking fee is in the total shown before
// paying). The gate (copy plan, review 2026-10-25): Model B must not be switched on for a
// coach until the coach page shows the total before checkout (PR 3).
//
// The free cap is never a refusal on the server (fee engine): a Free coach's 6th paying
// athlete pays and joins, and the coach's roster turns read-only for their athletes'
// plans until Elite (guard_roster_read_only). SIXTH_ATHLETE_RULE says so, once per place.
//
// The calculator's state is one string (what is typed in the money field) plus the billing
// choice; the slider shows the parsed amount clamped to its range and writes the same
// string back, so the two controls never disagree. The numbers are keepsByTier's.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Faq from './Faq';
import { Display, FinalCta, Kicker, LinkArrow } from './Pieces';
import { usePageMeta } from './meta';
import { APP_STORE_URL, BRAND_NAME } from './brand';
import { FOUNDING_CLOSES_LABEL, SIXTH_ATHLETE_RULE } from './planLines';
import {
  DISPUTE_FEE_USD, ELITE_FEE_PERCENT, ELITE_MONTHLY_USD, ELITE_YEARLY_USD, FOUNDING_FEE_PERCENT,
  FOUNDING_SLOTS, FOUNDING_THEN_MONTHLY_USD, FREE_ROSTER_CAP, MINIMUM_CHARGE_USD, MODEL_B_BOOKING_FEE_USD,
  STANDARD_FEE_PERCENT, eliteMonthlyCost, foundingFreeWords, keepsByTier, stripeEstimateWords, usd,
} from './pricing';

const CLOSES = FOUNDING_CLOSES_LABEL;
const SIXTH_RULE = SIXTH_ATHLETE_RULE;

/** The slider's range (the design's: 0..15,000 in steps of 50). The field itself takes any amount. */
const RANGE_MAX = 15000;
const RANGE_STEP = 50;
const DEFAULT_AMOUNT = '3000';

/** The design's parse: everything but digits and dots dropped, nothing → 0. */
function parseAmount(text) {
  return parseFloat(String(text).replace(/[^0-9.]/g, '')) || 0;
}

const FAQ = [
  { q: 'What is the fee charged on?', a: `Only on passes athletes buy through ${BRAND_NAME}. Sell nothing, pay nothing.` },
  { q: 'Are card processing fees included?', a: `Yes. A pass is charged through ${BRAND_NAME}’s Stripe account and the athlete’s payment, minus the ${BRAND_NAME} fee, is transferred to yours. Stripe’s card processing (${stripeEstimateWords()}) comes out of ${BRAND_NAME}’s fee, not out of what you keep. When you refund a payment, Stripe may keep its processing fee.` },
  { q: 'Do my athletes pay anything extra?', a: `On the standard plans, athletes pay exactly the price you set: there is no processing charge or surcharge at checkout. A coach who uses a booking fee (${usd(MODEL_B_BOOKING_FEE_USD.block_payment)} a payment) has it included in the total the athlete is shown before paying, never added after.` },
  { q: 'Is there an athlete limit?', a: `${SIXTH_RULE} Coach Elite and Founding have no cap.` },
  { q: 'Is there a minimum price?', a: `Yes: a pass costs at least ${usd(MINIMUM_CHARGE_USD)} a payment.` },
  { q: 'How do I start or stop Elite?', a: (<p>Subscribe on the web from your <Link to="/coach">coach dashboard</Link>; the app opens your dashboard. You pay on Stripe’s page, monthly ({usd(ELITE_MONTHLY_USD)}) or yearly ({usd(ELITE_YEARLY_USD)}). Manage or cancel it from the link in your Stripe receipt; Elite stays on until the end of the period you paid for. If you already have Elite through the App Store, it stays managed in the App Store.</p>) },
  { q: 'How does the lower fee reach my existing passes?', a: 'The fee is set on the server from your plan and applied to every pass payment, including renewals of passes your athletes already hold.' },
  { q: 'What does a dispute cost?', a: `${usd(DISPUTE_FEE_USD)} for each dispute, won or lost; an inquiry costs nothing. It comes out of what Stripe pays you for that payment or for your next ones.` },
  { q: 'What is Founding?', a: (<p>{FOUNDING_SLOTS} coaches get Coach Elite free for {foundingFreeWords()} and a {FOUNDING_FEE_PERCENT}% fee. The free year starts with the first payment one of your athletes makes after your spot is granted. After it, Elite is {usd(FOUNDING_THEN_MONTHLY_USD)} a month if you keep it, or you move to the free plan. Applications close {CLOSES}. <Link to="/founding">Apply for a Founding spot</Link>.</p>) },
];

/** The design's rows: a cell is "Included" (class yes), "—" (class no, read as "Not included") or words. */
const COMPARE_ROWS = [
  ['Coaching page, passes, checkout', 'Included', 'Included', 'Included'],
  ['Workout builder, seasons, season editor', 'Included', 'Included', 'Included'],
  ['Check-ins, messages, progress', 'Included', 'Included', 'Included'],
  ['Paying athletes', `Up to ${FREE_ROSTER_CAP}*`, 'No cap', 'No cap'],
  ['Assistant drafts your replies', '—', 'Included', 'Included'],
  [`${BRAND_NAME} fee per pass`, `${STANDARD_FEE_PERCENT}%`, `${ELITE_FEE_PERCENT}%`, `${FOUNDING_FEE_PERCENT}%`],
  ['Lowest pass price', `${usd(MINIMUM_CHARGE_USD)} a payment`, `${usd(MINIMUM_CHARGE_USD)} a payment`, `${usd(MINIMUM_CHARGE_USD)} a payment`],
  ['Price', usd(0), `${usd(ELITE_MONTHLY_USD)} a month or ${usd(ELITE_YEARLY_USD)} a year`, 'Free for the first year'],
];

function CompareCell({ value }) {
  if (value === 'Included') return <td className="yes">{value}</td>;
  if (value === '—') {
    return (
      <td className="no"><span aria-hidden="true">—</span><span className="sr">Not included</span></td>
    );
  }
  return <td>{value}</td>;
}

export default function Pricing() {
  usePageMeta('Pricing', `Free to start: ${BRAND_NAME} takes ${STANDARD_FEE_PERCENT}% of the passes you sell. Coach Elite is ${usd(ELITE_MONTHLY_USD)} a month and halves the fee to ${ELITE_FEE_PERCENT}%, with no athlete cap. Stripe card fees come out of our share.`);
  const [amountText, setAmountText] = useState(DEFAULT_AMOUNT);
  const [yearly, setYearly] = useState(false);
  const amount = parseAmount(amountText);
  const k = keepsByTier(amount, yearly);
  const eliteWords = yearly
    ? `Elite ${usd(ELITE_YEARLY_USD)} a year (${usd(eliteMonthlyCost(true))} a month)`
    : `Elite ${usd(ELITE_MONTHLY_USD)} a month`;
  const breakEvenWords = k.breakEven === null ? '' : ` ${usd(k.breakEven)} a month in athlete payments.`;
  let summary;
  if (amount <= 0) summary = 'Type what your athletes pay you in a month.';
  else if (!k.freeWins) summary = `Elite leaves you ${usd(k.eliteGain)} more a month than Free.${breakEvenWords ? ` It pays for itself above${breakEvenWords}` : ''}`;
  else summary = `At this amount Free leaves you more.${breakEvenWords ? ` Elite pays for itself above${breakEvenWords}` : ''}`;

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <Kicker>Pricing</Kicker>
          <Display as="h1" size="xl">Free to start<span className="dot v" aria-hidden="true" /></Display>
          <p className="lede">No monthly bill to start. {BRAND_NAME} takes a share of the passes you sell, and on the standard plans your athletes pay exactly the price you set.</p>
        </div>
      </section>

      <section style={{ paddingBottom: 'clamp(48px,6vw,88px)' }}>
        <div className="wrap">
          <div className="plans">
            <article className="plan">
              <div className="plan-name">Free</div>
              <div className="price"><span className="num">{usd(0)}</span><span>a month</span></div>
              <div className="fee"><b>{STANDARD_FEE_PERCENT}%</b> per pass sold · up to {FREE_ROSTER_CAP} paying athletes</div>
              <ul>
                <li>Your coaching page and passes: monthly, yearly or a season</li>
                <li>Checkout on the web and in the app, payouts through Stripe</li>
                <li>Workout builder, seasons and the season editor on the web</li>
                <li>Check-ins, messages and athlete progress</li>
              </ul>
              <a className="btn btn-ghost" href={APP_STORE_URL}>Start free in the app</a>
              <p className="plan-foot">{SIXTH_RULE}</p>
            </article>
            <article className="plan featured">
              <div className="plan-name">Coach Elite <span className="badge">Half the fee</span></div>
              <div className="price"><span className="num">{usd(ELITE_MONTHLY_USD)}</span><span>a month, or {usd(ELITE_YEARLY_USD)} a year</span></div>
              <div className="fee"><b>{ELITE_FEE_PERCENT}%</b> per pass sold · no athlete cap</div>
              <ul>
                <li>Everything in Free</li>
                <li>Half the fee on every pass, renewals included</li>
                <li>No athlete cap</li>
                <li>Replies drafted in your voice from the check-in and logged sets. You approve every one</li>
              </ul>
              <Link className="btn btn-lime" to="/coach">Subscribe on the web</Link>
              <p className="plan-foot">You subscribe from your coach dashboard on the web and pay on Stripe’s page. Cancel from the link in your receipt.</p>
            </article>
            <article className="plan">
              <div className="plan-name">Founding <span className="badge">{FOUNDING_SLOTS} spots · closes {CLOSES}</span></div>
              <div className="price"><span className="num">{usd(0)}</span><span>for the first year</span></div>
              <div className="fee"><b>{FOUNDING_FEE_PERCENT}%</b> per pass sold · no athlete cap</div>
              <ul>
                <li>Coach Elite free for {foundingFreeWords()}, from your first athlete payment after your spot is granted</li>
                <li>A {FOUNDING_FEE_PERCENT}% fee while the free year or Elite runs</li>
                <li>The “Founding {FOUNDING_SLOTS}” badge on your coach page</li>
                <li>After the year: Elite at {usd(FOUNDING_THEN_MONTHLY_USD)} a month, or the free plan</li>
              </ul>
              <Link className="btn btn-primary" to="/founding">Apply for a spot</Link>
            </article>
          </div>
        </div>
      </section>

      <section className="pad-s">
        <div className="wrap">
          <div className="section-head">
            <Kicker>Calculator</Kicker>
            <Display as="h2" size="l">What you keep each month.</Display>
          </div>
          <div className="calc" id="calc">
            <div className="calc-input">
              <label htmlFor="calc-amount">What your athletes pay you each month</label>
              <div className="money-input">
                <span aria-hidden="true">$</span>
                <input
                  id="calc-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  size={6}
                  value={amountText}
                  onChange={(e) => setAmountText(e.target.value)}
                />
              </div>
              <div className="calc-controls">
                <input
                  id="calc-range"
                  type="range"
                  min="0"
                  max={RANGE_MAX}
                  step={RANGE_STEP}
                  value={Math.min(amount, RANGE_MAX)}
                  onChange={(e) => setAmountText(e.target.value)}
                  aria-label="Monthly athlete payments"
                />
                <div className="seg" role="group" aria-label="Coach Elite billing">
                  <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)}>Elite monthly</button>
                  <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)}>Elite yearly</button>
                </div>
              </div>
            </div>
            <div className="calc-out" aria-live="polite">
              <div className={`keep${k.freeWins ? ' best' : ''}`} data-plan="free">
                <div className="k-name">Free</div>
                <div className="k-label">You keep</div>
                <div className="num">{usd(k.free.keep)}</div>
                <div className="k-sub">{STANDARD_FEE_PERCENT}% fee: {usd(k.free.fee)}</div>
                <div className="k-sub">Up to {FREE_ROSTER_CAP} paying athletes</div>
              </div>
              <div className={`keep${k.freeWins ? '' : ' best'}`} data-plan="elite">
                <div className="k-name">Coach Elite</div>
                <div className="k-label">You keep</div>
                <div className="num">{usd(k.elite.keep)}</div>
                <div className="k-sub">{ELITE_FEE_PERCENT}% fee: {usd(k.elite.fee)} · {eliteWords}</div>
              </div>
              <div className="keep" data-plan="founding">
                <div className="k-name">Founding <i>{FOUNDING_SLOTS} spots</i></div>
                <div className="k-label">You keep</div>
                <div className="num">{usd(k.founding.keep)}</div>
                <div className="k-sub">{FOUNDING_FEE_PERCENT}% fee: {usd(k.founding.fee)} · no subscription in year one</div>
              </div>
            </div>
            <p className="calc-summary">{summary}</p>
          </div>
          <p className="small" style={{ marginTop: 16, maxWidth: '52em' }}>On the standard plans, athletes pay exactly the price you set. Stripe’s card processing ({stripeEstimateWords()}) comes out of {BRAND_NAME}’s fee, not out of what you keep. Taxes on what you earn are yours to handle.</p>
        </div>
      </section>

      <section className="pad-s">
        <div className="wrap">
          <div className="section-head">
            <Kicker>Compare</Kicker>
            <Display as="h2" size="m">Compare plans.</Display>
          </div>
          <div className="table-wrap" role="region" aria-label="Plan comparison" tabIndex={0}>
            <table className="compare">
              <thead>
                <tr>
                  <th scope="col"><span className="sr">Feature</span></th>
                  <th scope="col">Free</th>
                  <th scope="col">Coach Elite</th>
                  <th scope="col">Founding</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map(([feature, ...cells]) => (
                  <tr key={feature}>
                    <th scope="row">{feature}</th>
                    {cells.map((value, i) => <CompareCell key={i} value={value} />)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small" style={{ marginTop: 14, maxWidth: '52em' }}>* {SIXTH_RULE}</p>
        </div>
      </section>

      <section className="on-paper pad">
        <div className="wrap faq-grid">
          <div className="section-head" style={{ margin: 0 }}>
            <Kicker>Questions</Kicker>
            <Display as="h2" size="l">Pricing questions.</Display>
            <LinkArrow to="/support">More in Help</LinkArrow>
          </div>
          <div><Faq items={FAQ} /></div>
        </div>
      </section>

      <FinalCta title="Start free. Pay when it works." />
    </>
  );
}
