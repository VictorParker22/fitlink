import { useState } from 'react';

/**
 * Calculator — "what would YOUR book earn here".
 *
 * The one number a visiting coach actually wants. Unlike the economy model
 * this needs no disclaimer: the inputs are the coach's own and the output
 * is pure arithmetic on the published fee. Comparison column uses the
 * industry's common shape — a monthly platform subscription — at a
 * representative $99/month, labelled as exactly that rather than naming a
 * competitor we'd then have to keep honest forever.
 */

const FEE = 0.10;
const TYPICAL_SAAS = 99;

export default function Calculator() {
  const [athletes, setAthletes] = useState(15);
  const [price, setPrice] = useState(120);

  const gross = athletes * price;
  const fitlinkKeep = gross * (1 - FEE);
  const saasKeep = Math.max(0, gross - TYPICAL_SAAS);
  // Below this gross, a flat subscription eats more than our 10% would.
  const crossover = Math.round(TYPICAL_SAAS / FEE);

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
          <p className="fl-calc-big-sub">yours, every month on FitLink</p>
        </div>

        <div className="fl-calc-bars" aria-hidden="true">
          <div className="fl-calc-bar-row">
            <span className="fl-calc-bar-name">FitLink · 10% flat</span>
            <div className="fl-calc-bar-track">
              <div className="fl-calc-bar fl-calc-bar-us" style={{ width: '90%' }} />
            </div>
            <span className="fl-calc-bar-num">${Math.round(fitlinkKeep).toLocaleString()}</span>
          </div>
          <div className="fl-calc-bar-row">
            <span className="fl-calc-bar-name">Typical $99/mo platform</span>
            <div className="fl-calc-bar-track">
              <div
                className="fl-calc-bar fl-calc-bar-them"
                style={{ width: `${gross > 0 ? (saasKeep / gross) * 90 : 0}%` }}
              />
            </div>
            <span className="fl-calc-bar-num">${Math.round(saasKeep).toLocaleString()}</span>
          </div>
        </div>

        <p className="fl-calc-note">
          {gross < crossover
            ? `Under $${crossover.toLocaleString()}/month gross, a flat subscription costs you more than our 10% — this is exactly the coach FitLink is priced for.`
            : `At your scale a flat fee wins on paper — and we still think you'll stay for what the 10% buys: payments, seasons, check-ins and the athlete app, with no bill in a slow month.`}
        </p>
      </div>
    </div>
  );
}
