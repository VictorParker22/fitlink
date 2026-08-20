import { useScene } from '../scenes/sceneKit.js';
import { NOTIFY_HREF } from '../components/Shell.jsx';
import Calculator from '../components/Calculator.jsx';
import Ticker from '../components/Ticker.jsx';
import CoachPanel from '../components/CoachPanel.jsx';

/**
 * Coaches — the longest page, because coaches are the buyer.
 *
 * Hero scene is FlowField: one programme, many athletes moving through it
 * on their own clocks — which is literally what a FitLink season is. The
 * calculator sits high, because "what does my book keep" is the question a
 * coach arrives with, and making them scroll for it is a dark pattern in
 * reverse.
 */

const loadFlow = () => import('../scenes/FlowField.js');

export default function CoachesPage() {
  const heroRef = useScene(loadFlow);

  return (
    <>
      <section className="fl-hero fl-hero-page">
        <div className="fl-hero-scene" ref={heroRef} aria-hidden="true" />
        <div className="fl-hero-veil fl-hero-veil-bottom" aria-hidden="true" />
        <div className="fl-hero-inner">
          <p className="fl-kicker">For coaches</p>
          <h1 className="fl-display fl-display-page">
            <span className="fl-mask"><span style={{ '--d': '0.05s' }}>The business runs itself.</span></span>
            <span className="fl-mask"><span style={{ '--d': '0.15s' }}><span className="fl-accent">You run the athletes.</span></span></span>
          </h1>
          <p className="fl-lede">
            <span className="fl-mask"><span style={{ '--d': '0.3s' }}>
              One programme. Every athlete on their own clock. That’s a season —
              and it’s the spine everything else hangs off.
            </span></span>
          </p>
        </div>
      </section>

      <section className="fl-section">
        <p className="fl-kicker">The number you came for</p>
        <h2 className="fl-h2">Your book. Your math.</h2>
        <p className="fl-manifesto-prose">
          Every number below is arithmetic on the published fee — drag it to
          your real book. When a flat-fee platform beats us on paper, the
          calculator says so.
        </p>
        <Calculator />
      </section>

      <section className="fl-section fl-railed">
        <div className="fl-rail" aria-hidden="true"><span>The terms</span></div>
        <div className="fl-stack-stats" data-reveal>
          <div className="fl-stack-stat">
            <span className="fl-stack-stat-label">Of every dollar</span>
            <span className="fl-stack-stat-value">90<small>%</small></span>
          </div>
          <div className="fl-stack-stat">
            <span className="fl-stack-stat-label">In a dead month</span>
            <span className="fl-stack-stat-value">$0</span>
          </div>
          <div className="fl-stack-stat">
            <span className="fl-stack-stat-label">Contracts locking you in</span>
            <span className="fl-stack-stat-value">0</span>
          </div>
        </div>
      </section>

      {/* The buyer's own screen. The athlete demo lives on home; this page
          sells the coach, so it shows the coach's morning. */}
      <section className="fl-section fl-section-alt">
        <p className="fl-kicker">Your side of the glass</p>
        <h2 className="fl-h2">One look. Whole business.</h2>
        <CoachPanel />
      </section>

      <Ticker words={['Seasons', 'Check-ins', 'Payouts', 'Library', 'Classes']} />

      <section className="fl-section fl-section-alt fl-railed">
        <div className="fl-rail"><span>The work</span></div>
        <p className="fl-kicker">The work</p>
        <h2 className="fl-h2">Coaching stays. Admin goes.</h2>
        <div className="fl-edit-rows" data-reveal>
          <div className="fl-edit-row">
            <span className="fl-edit-row-n" aria-hidden="true">01</span>
            <div>
              <p className="fl-edit-row-title">Seasons that survive contact</p>
              <p className="fl-edit-row-sub">
                Build once, assign to everyone. Edit mid-season and FitLink shows
                who it touches before it touches them.
              </p>
            </div>
          </div>
          <div className="fl-edit-row">
            <span className="fl-edit-row-n" aria-hidden="true">02</span>
            <div>
              <p className="fl-edit-row-title">Check-ins that talk back.</p>
              <p className="fl-edit-row-sub">
                Their own words, not a form. The week at a glance.
                Reply where the thread already is.
              </p>
            </div>
          </div>
          <div className="fl-edit-row">
            <span className="fl-edit-row-n" aria-hidden="true">03</span>
            <div>
              <p className="fl-edit-row-title">Money without the admin</p>
              <p className="fl-edit-row-sub">
                Passes, subscriptions, sessions — all on Stripe. Payouts land in
                your account. Never ours, never held.
              </p>
            </div>
          </div>
          <div className="fl-edit-row">
            <span className="fl-edit-row-n" aria-hidden="true">04</span>
            <div>
              <p className="fl-edit-row-title">Your athletes, not the platform’s</p>
              <p className="fl-edit-row-sub">
                Leave a gym — or leave us — and your roster goes with you.
                Built in, not written down.
              </p>
            </div>
          </div>
          <div className="fl-edit-row">
            <span className="fl-edit-row-n" aria-hidden="true">05</span>
            <div>
              <p className="fl-edit-row-title">Build once. Coach forever.</p>
              <p className="fl-edit-row-sub">
                Demos, muscle maps, honest macros. Built once.
                Reused on every athlete you ever take on.
              </p>
            </div>
          </div>
          <div className="fl-edit-row">
            <span className="fl-edit-row-n" aria-hidden="true">06</span>
            <div>
              <p className="fl-edit-row-title">Teach one. Sell it twice.</p>
              <p className="fl-edit-row-sub">
                Broadcast it live or sell the recording. Same rails,
                same flat 10%.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="fl-band">
        <div className="fl-band-inner">
          <div>
            <h2 className="fl-band-title">Bring one athlete. See if it fits.</h2>
            <p className="fl-body-wide">
              Most coaches start with someone they already train.
              We send the invite.
            </p>
          </div>
          <div>
            <a className="fl-btn fl-btn-lg" href={NOTIFY_HREF}>Tell me when it launches</a>
          </div>
        </div>
      </section>
    </>
  );
}
