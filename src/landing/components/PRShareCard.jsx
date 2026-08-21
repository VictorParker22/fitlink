/**
 * PRShareCard — the app's actual PR share card, recomposed for the site.
 *
 * This is a rendering of the product, not an invented graphic: the app
 * detects a personal record and offers this exact card — dark ground, the
 * FL mark, the number enormous, the lift and date underneath — sized for a
 * 4:5 story crop. If the app's share card changes, THIS must change with
 * it, for the same reason a stale screenshot becomes a lie.
 *
 * The float animation is component-scoped (one keyframe, one class) so it
 * ships with the card; the global prefers-reduced-motion rule in landing.css
 * zeroes all animation durations inside .fl, which freezes it in place.
 */

export default function PRShareCard() {
  return (
    <div className="fl-prcard-wrap">
      <style>{`
        @keyframes fl-prcard-float {
          from { transform: translateY(-6px); }
          to { transform: translateY(6px); }
        }
        .fl-prcard-wrap { display: grid; gap: 16px; justify-items: center; }
        .fl-prcard {
          width: min(300px, 78vw);
          aspect-ratio: 4 / 5;
          background: #101210;
          border: 1px solid var(--border-strong);
          border-radius: 24px;
          padding: 24px;
          display: flex; flex-direction: column;
          box-shadow:
            0 40px 80px -30px rgba(0, 0, 0, 0.8),
            0 0 90px -40px rgba(198, 242, 78, 0.35);
          animation: fl-prcard-float 6s ease-in-out infinite alternate;
        }
        .fl-prcard-head { display: flex; align-items: center; gap: 9px; }
        .fl-prcard-tile {
          display: block;
          width: 24px; height: 24px;
        }
        .fl-prcard-word { font-family: var(--head); font-weight: 600; font-size: 13px; }
        .fl-prcard-pill {
          align-self: flex-start;
          margin: 26px 0 0;
          border: 1px solid var(--accent); border-radius: 999px;
          color: var(--accent);
          font-size: 10px; font-weight: 600; letter-spacing: 1.8px;
          padding: 6px 12px;
        }
        .fl-prcard-num {
          font-family: 'Anton', var(--head);
          font-size: 92px; line-height: 1;
          color: var(--accent);
          margin: 14px 0 0;
          font-variant-numeric: tabular-nums;
        }
        .fl-prcard-unit { font-size: 0.3em; color: var(--text-2); letter-spacing: 1px; margin-left: 6px; }
        .fl-prcard-lift {
          font-family: var(--head); font-weight: 600; font-size: 18px;
          letter-spacing: -0.3px; color: var(--text); margin: 10px 0 0;
        }
        .fl-prcard-date { font-size: 12px; color: var(--text-3); margin: 4px 0 0; }
        .fl-prcard-rule { border: 0; border-top: 1px solid var(--border); width: 100%; margin: auto 0 12px; }
        .fl-prcard-foot { font-size: 11px; color: var(--text-3); letter-spacing: 0.6px; margin: 0; }
      `}</style>

      <div
        className="fl-prcard"
        role="img"
        aria-label="A FitLink personal-record share card: new personal record, 205 pounds, back squat, 20 August 2026"
      >
        <div className="fl-prcard-head" aria-hidden="true">
          <img className="fl-prcard-tile" src="/icon-192.png" alt="" />
          <span className="fl-prcard-word">FitLink</span>
        </div>

        <p className="fl-prcard-pill" aria-hidden="true">NEW PERSONAL RECORD</p>

        <p className="fl-prcard-num" aria-hidden="true">
          205<span className="fl-prcard-unit">lbs</span>
        </p>
        <p className="fl-prcard-lift" aria-hidden="true">Back squat</p>
        <p className="fl-prcard-date" aria-hidden="true">20 August 2026</p>

        <hr className="fl-prcard-rule" aria-hidden="true" />
        <p className="fl-prcard-foot" aria-hidden="true">fitlink.coach</p>
      </div>

      <p className="fl-phone-caption">
        The card the app offers when a PR lands. Story-sized, coach-branded.
      </p>
    </div>
  );
}
