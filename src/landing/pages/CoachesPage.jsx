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
            The business runs itself.<br />
            <span className="fl-accent">You run the athletes.</span>
          </h1>
          <p className="fl-lede">
            One programme. Every athlete on their own clock. That’s a season —
            and it’s the spine everything else hangs off.
          </p>
        </div>
      </section>

      <section className="fl-section">
        <p className="fl-kicker">The number you came for</p>
        <h2 className="fl-h2">Your book. Your math.</h2>
        <Calculator />
      </section>

      {/* The buyer's own screen. The athlete demo lives on home; this page
          sells the coach, so it shows the coach's morning. */}
      <section className="fl-section fl-section-alt">
        <p className="fl-kicker">Your side of the glass</p>
        <h2 className="fl-h2">One look. Whole business.</h2>
        <CoachPanel />
      </section>

      <Ticker words={['Seasons', 'Check-ins', 'Payouts', 'Library', 'Classes']} />

      <section className="fl-section fl-section-alt">
        <p className="fl-kicker">The work</p>
        <h2 className="fl-h2">Coaching stays. Admin goes.</h2>
        <div className="fl-grid">
          <article className="fl-card">
            <h3>Seasons that survive contact</h3>
            <p>
              Build once, assign to everyone. Edit mid-season and FitLink shows
              who it touches before it touches them.
            </p>
          </article>
          <article className="fl-card">
            <h3>Check-ins that talk back.</h3>
            <p>
              Their own words, not a form. The week at a glance.
              Reply where the thread already is.
            </p>
          </article>
          <article className="fl-card">
            <h3>Money without the admin</h3>
            <p>
              Passes, subscriptions, sessions — all on Stripe. Payouts land in
              your account. Never ours, never held.
            </p>
          </article>
          <article className="fl-card">
            <h3>Your athletes, not the platform’s</h3>
            <p>
              Leave a gym — or leave us — and your roster goes with you.
              Built in, not written down.
            </p>
          </article>
          <article className="fl-card">
            <h3>Build once. Coach forever.</h3>
            <p>
              Demos, muscle maps, honest macros. Built once.
              Reused on every athlete you ever take on.
            </p>
          </article>
          <article className="fl-card">
            <h3>Teach one. Sell it twice.</h3>
            <p>
              Broadcast it live or sell the recording. Same rails,
              same flat 10%.
            </p>
          </article>
        </div>
      </section>

      <section className="fl-close">
        <h2 className="fl-h2">Bring one athlete. See if it fits.</h2>
        <p className="fl-body-wide">
          Most coaches start with someone they already train.
          We send the invite.
        </p>
        <a className="fl-btn fl-btn-lg" href={NOTIFY_HREF}>Tell me when it launches</a>
      </section>
    </>
  );
}
