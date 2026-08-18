import { useEffect, useRef, useState } from 'react';

/**
 * LiveEconomy — the ticking ledger.
 *
 * ── WHAT THIS IS, STATED PLAINLY ────────────────────────────────────
 * It is a MODEL, and the UI says so on its face. FitLink has not launched;
 * there are no coaches earning on it tonight, and a counter captioned
 * "coaches worldwide are earning right now" would be a fabricated statistic
 * — the exact class of claim this site already deleted once (fake gym
 * logos, fake testimonials). What IS true, and worth animating, is the
 * arithmetic of the platform: at a given scale, with a flat 10% fee, money
 * flows to coaches at a rate you can watch. The reader gets the spectacle
 * AND the honesty: "this is the math, running."
 *
 * The scenario knobs are visible and adjustable for the same reason — a
 * model you can poke is credible; a number you must take on faith is not.
 *
 * ── WHY THE TICKING IS SMOOTH ───────────────────────────────────────
 * The counter derives from elapsed time on every animation frame instead of
 * incrementing on an interval: setInterval drifts, stalls in background
 * tabs, and produces the tell-tale stutter of fake counters. Deriving from
 * the clock means the number is *consistent* — pause, come back, and it has
 * advanced exactly as much as the model says it should have.
 */

const SCENARIOS = [
  { key: 'boutique', label: '500 coaches', coaches: 500 },
  { key: 'city', label: '5,000 coaches', coaches: 5000 },
  { key: 'national', label: '50,000 coaches', coaches: 50000 },
];

// One coach's plausible book: 18 athletes at $120/month. Stated in the UI.
const ATHLETES_PER_COACH = 18;
const PRICE_PER_MONTH = 120;
const SECONDS_PER_MONTH = 30 * 24 * 3600;

export default function LiveEconomy() {
  const [scenario, setScenario] = useState(SCENARIOS[1]);
  const [display, setDisplay] = useState(0);
  const chartRef = useRef(null);
  const stateRef = useRef({ accrued: 0, last: 0, rate: 0 });

  const monthlyGross = scenario.coaches * ATHLETES_PER_COACH * PRICE_PER_MONTH;
  const coachShare = monthlyGross * 0.9;

  // Rate changes take effect from "now" without resetting what has already
  // accrued — switching scenarios mid-run keeps the ledger continuous, the
  // way a real ledger would behave.
  useEffect(() => {
    stateRef.current.rate = (scenario.coaches * ATHLETES_PER_COACH * PRICE_PER_MONTH * 0.9) / SECONDS_PER_MONTH;
  }, [scenario]);

  useEffect(() => {
    let raf = 0;
    const st = stateRef.current;
    st.last = performance.now();

    const tick = (now) => {
      const dt = (now - st.last) / 1000;
      st.last = now;
      st.accrued += st.rate * dt;
      setDisplay(st.accrued);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── The chart: a month of coach earnings, drawing itself ───────────
  // 2D canvas, not three.js — a chart wants crisp 1px lines and text-height
  // precision, which a perspective camera actively fights. Three carries
  // the atmosphere on this page; the chart's job is to be readable.
  useEffect(() => {
    const canvas = chartRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let start = 0;
    const DURATION = 1600; // ms for the line to draw itself
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // A month's cumulative accrual is a straight line; a straight line is a
    // boring chart. Day-of-week texture (weekend session dips) gives it the
    // shape of a real revenue curve while summing to the same total.
    const DAYS = 30;
    const daily = [];
    let total = 0;
    for (let d = 0; d < DAYS; d++) {
      const weekday = d % 7;
      const weight = weekday === 5 || weekday === 6 ? 0.55 : 1.0 + (weekday === 1 ? 0.18 : 0);
      daily.push(weight);
      total += weight;
    }
    const points = [];
    let acc = 0;
    for (let d = 0; d < DAYS; d++) {
      acc += daily[d] / total;
      points.push(acc); // cumulative 0..1
    }

    const draw = (progress) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const pad = 6;
      const iw = w - pad * 2;
      const ih = h - pad * 2;

      // Grid: four horizontal whispers.
      ctx.strokeStyle = 'rgba(155,160,149,0.14)';
      ctx.lineWidth = 1;
      for (let g = 1; g <= 4; g++) {
        const y = pad + (ih * g) / 4;
        ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
      }

      const upto = Math.max(2, Math.floor(points.length * progress));
      const xy = (i) => [
        pad + (i / (DAYS - 1)) * iw,
        pad + ih - points[i] * ih * 0.94,
      ];

      // Area fill under the line.
      ctx.beginPath();
      ctx.moveTo(pad, pad + ih);
      for (let i = 0; i < upto; i++) ctx.lineTo(...xy(i));
      ctx.lineTo(xy(upto - 1)[0], pad + ih);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, pad, 0, pad + ih);
      grad.addColorStop(0, 'rgba(198,242,78,0.22)');
      grad.addColorStop(1, 'rgba(198,242,78,0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // The line itself.
      ctx.beginPath();
      for (let i = 0; i < upto; i++) {
        const [x, y] = xy(i);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#c6f24e';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Head dot.
      const [hx, hy] = xy(upto - 1);
      ctx.beginPath();
      ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#c6f24e';
      ctx.fill();
    };

    if (reduce) { draw(1); return undefined; }

    const step = (now) => {
      if (!start) start = now;
      const p = Math.min(1, (now - start) / DURATION);
      // ease-out cubic: fast reveal, gentle landing
      draw(1 - (1 - p) ** 3);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [scenario]);

  const perSecond = stateRef.current.rate;

  return (
    <div className="fl-econ">
      <div className="fl-econ-head">
        <p className="fl-econ-label">Flowing to coaches since you opened this page</p>
        <p className="fl-econ-counter" aria-live="off">
          ${display.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="fl-econ-rate">
          ≈ ${perSecond.toFixed(2)} every second · ${Math.round(coachShare).toLocaleString()} a month to coaches at this scale
        </p>
      </div>

      <div className="fl-econ-scenarios" role="group" aria-label="Model scale">
        {SCENARIOS.map((s) => (
          <button
            key={s.key}
            className={`fl-chip ${scenario.key === s.key ? 'fl-chip-on' : ''}`}
            onClick={() => setScenario(s)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="fl-econ-chart">
        <canvas ref={chartRef} className="fl-econ-canvas" aria-hidden="true" />
        <p className="fl-econ-chart-label">One modelled month, accruing day by day</p>
      </div>

      {/* The honesty line. Load-bearing — this is what separates a live
          model from a fabricated statistic. Do not remove it to make the
          section "cleaner". */}
      <p className="fl-econ-truth">
        This is a model, not a report — FitLink hasn’t launched yet. It assumes each coach
        carries {ATHLETES_PER_COACH} athletes at ${PRICE_PER_MONTH}/month and keeps 90%.
        The arithmetic is the pitch: the fee never grows past 10%, so the rest of this
        river is the coaches’.
      </p>
    </div>
  );
}
