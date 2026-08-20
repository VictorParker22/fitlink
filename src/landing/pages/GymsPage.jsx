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
            <span className="fl-mask"><span style={{ '--d': '0.05s' }}>Every coach on one roof.</span></span>
            <span className="fl-mask"><span style={{ '--d': '0.15s' }}><span className="fl-accent">None of them boxed in.</span></span></span>
          </h1>
          <p className="fl-lede">
            <span className="fl-mask"><span style={{ '--d': '0.3s' }}>
              Buy seats. See the business. Stay out of the coaching.
              The boundary is built in — not written down.
            </span></span>
          </p>
        </div>
      </section>

      <section className="fl-section fl-railed">
        <div className="fl-rail"><span>The business view</span></div>
        <p className="fl-kicker">What you see</p>
        <h2 className="fl-h2">The business view. And only that.</h2>
        <div className="fl-edit-rows">
          <div className="fl-edit-row">
            <span className="fl-edit-row-n">01</span>
            <div>
              <p className="fl-edit-row-title">Who’s working. At a glance.</p>
              <p className="fl-edit-row-sub">
                Who’s on a seat, who carries how many athletes, who worked when.
                Stamped by real work, not app-opens.
              </p>
            </div>
          </div>
          <div className="fl-edit-row">
            <span className="fl-edit-row-n">02</span>
            <div>
              <p className="fl-edit-row-title">Real revenue. Real rows.</p>
              <p className="fl-edit-row-sub">
                Summed from real payments, per coach. Unmeasured numbers say so —
                they don’t pose as zeros.
              </p>
            </div>
          </div>
          <div className="fl-edit-row">
            <span className="fl-edit-row-n">03</span>
            <div>
              <p className="fl-edit-row-title">Your cut, in daylight.</p>
              <p className="fl-edit-row-sub">
                Your cut is a split your coaches can read — not a fee buried
                in terms. Every change is logged.
              </p>
            </div>
          </div>
          <div className="fl-edit-row">
            <span className="fl-edit-row-n">04</span>
            <div>
              <p className="fl-edit-row-title">The private half stays private.</p>
              <p className="fl-edit-row-sub">
                No threads, no check-ins, no health data. There is no switch
                that reveals them. Not even for us.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="fl-section fl-railed">
        <div className="fl-rail"><span>The terms</span></div>
        <div className="fl-stack-stats">
          <div className="fl-stack-stat">
            <span className="fl-stack-stat-label">First seat</span>
            <span className="fl-stack-stat-value">$0</span>
          </div>
          <div className="fl-stack-stat">
            <span className="fl-stack-stat-label">Coaching threads a gym can read</span>
            <span className="fl-stack-stat-value">0</span>
          </div>
          <div className="fl-stack-stat">
            <span className="fl-stack-stat-label">Of a leaving coach’s roster kept</span>
            <span className="fl-stack-stat-value">0<small>%</small></span>
          </div>
        </div>
      </section>

      <section className="fl-section fl-section-alt">
        <p className="fl-kicker">The rules of power</p>
        <h2 className="fl-h2">Three things a gym cannot do here.</h2>
        <div className="fl-edit-rows">
          <div className="fl-edit-row">
            <span className="fl-edit-row-n">01</span>
            <div>
              <p className="fl-edit-row-title">A gym cannot add a coach to itself.</p>
              <p className="fl-edit-row-sub">
                It invites; the coach accepts. Membership starts on the coach’s yes,
                never on an admin’s click.
              </p>
            </div>
          </div>
          <div className="fl-edit-row">
            <span className="fl-edit-row-n">02</span>
            <div>
              <p className="fl-edit-row-title">A gym cannot keep a leaving coach’s athletes.</p>
              <p className="fl-edit-row-sub">
                The roster belongs to the coach. When they go, it goes with them —
                structurally, not contractually.
              </p>
            </div>
          </div>
          <div className="fl-edit-row">
            <span className="fl-edit-row-n">03</span>
            <div>
              <p className="fl-edit-row-title">A billing problem cannot evict a working coach.</p>
              <p className="fl-edit-row-sub">
                If seats lapse, the team is frozen at its current size — nobody new joins,
                nobody working is cut off mid-month over an expired card.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="fl-band">
        <div className="fl-band-inner">
          <div>
            <h2 className="fl-band-title">Running coaches under one roof?</h2>
            <p className="fl-body-wide">
              Tell us how many coaches you run. We’ll quote it plainly.
            </p>
          </div>
          <div>
            <a className="fl-btn fl-btn-lg" href={GYM_MAIL}>Talk to us</a>
          </div>
        </div>
      </section>
    </>
  );
}
