import { useScene } from '../scenes/sceneKit.js';
import { NOTIFY_HREF } from '../components/Shell.jsx';
import Calculator from '../components/Calculator.jsx';
import Ticker from '../components/Ticker.jsx';

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
            One programme, every athlete moving through it on their own clock — that is a
            FitLink season, and it is the spine the rest of the product hangs off.
          </p>
        </div>
      </section>

      <section className="fl-section">
        <p className="fl-kicker">The number you came for</p>
        <h2 className="fl-h2">What does your book keep here?</h2>
        <Calculator />
      </section>

      <Ticker words={['Seasons', 'Check-ins', 'Payouts', 'Library', 'Classes']} />

      <section className="fl-section fl-section-alt">
        <p className="fl-kicker">The work</p>
        <h2 className="fl-h2">Everything that isn’t coaching, handled.</h2>
        <div className="fl-grid">
          <article className="fl-card">
            <h3>Seasons that survive contact</h3>
            <p>
              Build a season once and assign it to everyone on it. Edit a week mid-season and
              FitLink shows you exactly who it changes before it changes them — the blast
              radius, on screen, before you commit.
            </p>
          </article>
          <article className="fl-card">
            <h3>Check-ins that read like conversation</h3>
            <p>
              Athletes answer in their own words, not a form. You see the week at a glance and
              reply where the thread already is.
            </p>
          </article>
          <article className="fl-card">
            <h3>Money without the admin</h3>
            <p>
              Passes, subscriptions and one-off sessions run on Stripe Connect. Payouts land in
              your account — never ours, never held.
            </p>
          </article>
          <article className="fl-card">
            <h3>Your athletes, not the platform’s</h3>
            <p>
              Leave a gym, or leave FitLink, and your roster goes with you. That is a structural
              promise, not a policy we can quietly rewrite.
            </p>
          </article>
          <article className="fl-card">
            <h3>A library that compounds</h3>
            <p>
              Workouts, exercises with demos and muscle maps, meal plans with honest macros —
              built once, reused across every athlete you ever take on.
            </p>
          </article>
          <article className="fl-card">
            <h3>Live and on-demand classes</h3>
            <p>
              Broadcast a session or sell a recorded one. Class revenue rides the same rails as
              everything else: your Stripe account, our flat 10%.
            </p>
          </article>
        </div>
      </section>

      <section className="fl-close">
        <h2 className="fl-h2">Bring one athlete. See if it fits.</h2>
        <p className="fl-body-wide">
          Most coaches start with someone they already train. FitLink sends the invite.
        </p>
        <a className="fl-btn fl-btn-lg" href={NOTIFY_HREF}>Tell me when it launches</a>
      </section>
    </>
  );
}
