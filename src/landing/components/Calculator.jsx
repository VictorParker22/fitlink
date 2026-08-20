import { useState } from 'react';

/**
 * Calculator — "what would YOUR book earn here".
 *
 * The one number a visiting coach actually wants. Unlike the economy model
 * this needs no disclaimer: the inputs are the coach's own and the output
 * is pure arithmetic on the published fee. The comparison platform is "a
 * typical $99/month subscription" — the industry's common shape, not a
 * named competitor we'd then have to keep honest forever.
 *
 * WHY THE COMPARISON IS COSTS, NOT TAKE-HOME. The first version compared
 * what each platform LEAVES YOU, side by side — and past $990/month gross
 * the flat fee wins that comparison, so at 60 athletes our own calculator
 * visually crowned the competitor (user-reported, correctly). Hiding that
 * would be dishonest; the fix is that fee-vs-fee was the wrong axis all
 * along. What is ALWAYS true is the shape of the risk: their fee exists in
 * a month you earn nothing, ours doesn't. So the bars now show what each
 * platform COSTS in this month and in a dead month, and the note still
 * concedes in words that a big book pays less on paper with a flat fee —
 * a calculator that only ever says "we win" is an ad.
 */

const FEE = 0.10;
const TYPICAL_SAAS = 99;

export default function Calculator() {
  // Defaults are a merchandising decision and an honesty test at once.
  // 15 x $120 opened ABOVE the $990 crossover, so the first thing every
  // visitor saw was the flat-fee competitor winning our own comparison.
  // 8 x $100 is the more typical starting book AND lands on our side —
  // the visitor drags from there and the math stays the math.
  const [athletes, setAthletes] = useState(8);
  const [price, setPrice] = useState(100);

  const gross = athletes * price;
  const fitlinkKeep = gross * (1 - FEE);
  const fitlinkFee = gross * FEE;
  // Below this gross, a flat subscription eats more than our 10% would.
  const crossover = Math.round(TYPICAL_SAAS / FEE);
  // Bars scale against the larger of the two live costs.
  const maxCost = Math.max(fitlinkFee, TYPICAL_SAAS, 1);

  return (
    <div className="fl-calc">
      <div className="fl-calc-inputs">
        <label className="fl-calc-field">
          <span className="fl-calc-label">Athletes</span>
          <span className="fl-calc-value">{athletes}</span>
          <input
            type="range" min="1" max="60" value={athletes}
            onChange={(e) => setAthletes(Number(e.target.value))}
          />
        </label>
        <label className="fl-calc-field">
          <span className="fl-calc-label">Monthly price</span>
          <span className="fl-calc-value">${price}</span>
          <input
            type="range" min="40" max="400" step="10" value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="fl-calc-out">
        <div className="fl-calc-big-wrap">
          <p className="fl-calc-big">${Math.round(fitlinkKeep).toLocaleString()}</p>
          <p className="fl-calc-big-sub">Yours. Every month.</p>
        </div>

        {/* What each platform COSTS — this month, and in a month that
            earns nothing. Shorter bar is better; the dead-month row is
            the one that never flips. */}
        <div className="fl-calc-bars" aria-hidden="true">
          <div className="fl-calc-bar-row">
            <span className="fl-calc-bar-name">This month costs you</span>
            <div className="fl-calc-bar-track">
              <div className="fl-calc-bar fl-calc-bar-us" style={{ width: `${(fitlinkFee / maxCost) * 90}%` }} />
            </div>
            <span className="fl-calc-bar-num">${Math.round(fitlinkFee).toLocaleString()}</span>
          </div>
          <div className="fl-calc-bar-row">
            <span className="fl-calc-bar-name">On a $99/mo platform</span>
            <div className="fl-calc-bar-track">
              <div className="fl-calc-bar fl-calc-bar-them" style={{ width: `${(TYPICAL_SAAS / maxCost) * 90}%` }} />
            </div>
            <span className="fl-calc-bar-num">${TYPICAL_SAAS}</span>
          </div>
          <div className="fl-calc-bar-row">
            <span className="fl-calc-bar-name">A month you earn $0</span>
            <div className="fl-calc-bar-track">
              <div className="fl-calc-bar fl-calc-bar-us" style={{ width: '0%' }} />
            </div>
            <span className="fl-calc-bar-num">$0 vs $99</span>
          </div>
        </div>

        <p className="fl-calc-note">
          {gross < crossover
            ? `Under $${crossover.toLocaleString()} a month, the flat subscription costs more than our 10% — you’re exactly who this is priced for.`
            : `Honest math: at your size a flat fee is cheaper on paper. The difference is the dead month — theirs still bills, ours can’t. We only earn when you do.`}
        </p>
      </div>
    </div>
  );
}
