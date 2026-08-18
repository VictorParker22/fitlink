import { useScene } from '../scenes/sceneKit.js';
import { SUPPORT } from '../components/Shell.jsx';

/**
 * Gyms — the enterprise pitch, which is mostly a trust pitch.
 *
 * Hero scene is EarthPulse: activity arcing between places. A gym owner's
 * real questions are about power — what do I see, what can't I see, what
 * happens when a coach leaves — so the page answers those in plain
 * sentences instead of burying them in a feature grid.
 */

const loadGlobe = () => import('../scenes/EarthPulse.js');

const GYM_MAIL = `mailto:${SUPPORT}?subject=${encodeURIComponent('FitLink for our gym')}`;

export default function GymsPage() {
  const heroRef = useScene(loadGlobe);

  return (
    <>
      <section className="fl-hero fl-hero-page">
        <div className="fl-hero-scene" ref={heroRef} aria-hidden="true" />
        <div className="fl-hero-veil fl-hero-veil-bottom" aria-hidden="true" />
        <div className="fl-hero-inner">
          <p className="fl-kicker">For gyms</p>
          <h1 className="fl-display fl-display-page">
            Every coach on one roof.<br />
            <span className="fl-accent">None of them boxed in.</span>
          </h1>
          <p className="fl-lede">
            Buy seats. See the business. Stay out of the coaching.
            The boundary is built in — not written down.
          </p>
        </div>
      </section>

      <section className="fl-section">
        <p className="fl-kicker">What you see</p>
        <h2 className="fl-h2">The business view. And only that.</h2>
        <div className="fl-grid">
          <article className="fl-card">
            <h3>Seats and the roster</h3>
            <p>
              Who’s on a seat, who carries how many athletes, who worked when.
              Stamped by real work, not app-opens.
            </p>
          </article>
          <article className="fl-card">
            <h3>Revenue this month</h3>
            <p>
              Summed from real payments, per coach. Unmeasured numbers say so —
              they don’t pose as zeros.
            </p>
          </article>
          <article className="fl-card">
            <h3>Your share, in the open</h3>
            <p>
              Your cut is a split your coaches can read — not a fee buried
              in terms. Every change is logged.
            </p>
          </article>
          <article className="fl-card">
            <h3>Never the private half</h3>
            <p>
              No threads, no check-ins, no health data. There is no switch
              that reveals them. Not even for us.
            </p>
          </article>
        </div>
      </section>

      <section className="fl-section fl-section-alt">
        <p className="fl-kicker">The rules of power</p>
        <h2 className="fl-h2">Three things a gym cannot do here.</h2>
        <div className="fl-rules">
          <div className="fl-rule">
            <span className="fl-rule-n">01</span>
            <p>
              <strong>A gym cannot add a coach to itself.</strong> It invites; the coach
              accepts. Membership starts on the coach’s yes, never on an admin’s click.
            </p>
          </div>
          <div className="fl-rule">
            <span className="fl-rule-n">02</span>
            <p>
              <strong>A gym cannot keep a leaving coach’s athletes.</strong> The roster belongs
              to the coach. When they go, it goes with them — structurally, not contractually.
            </p>
          </div>
          <div className="fl-rule">
            <span className="fl-rule-n">03</span>
            <p>
              <strong>A billing problem cannot evict a working coach.</strong> If seats lapse,
              the team is frozen at its current size — nobody new joins, nobody working is cut
              off mid-month over an expired card.
            </p>
          </div>
        </div>
      </section>

      <section className="fl-close">
        <h2 className="fl-h2">Running coaches under one roof?</h2>
        <p className="fl-body-wide">
          Tell us how many coaches you run. We’ll quote it plainly.
        </p>
        <a className="fl-btn fl-btn-lg" href={GYM_MAIL}>Talk to us</a>
      </section>
    </>
  );
}
