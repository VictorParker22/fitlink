import { useScene } from '../scenes/sceneKit.js';
import { useReveal } from '../components/useReveal.js';
import { NOTIFY_HREF } from '../components/Shell.jsx';

/**
 * Athletes — shortest page, deliberately.
 *
 * Athletes rarely choose the platform; their coach does. This page's job is
 * to make an athlete glad their coach chose FitLink, and to reassure the
 * one who is deciding whether to accept an invite. Hero scene is
 * PulseRings: the breath between sets.
 */

const loadRings = () => import('../scenes/PulseRings.js');

export default function AthletesPage() {
  const heroRef = useScene(loadRings);
  // data-reveal content starts at opacity 0 by CSS contract; this hook
  // is what reveals it. Attributes without the hook = invisible sections
  // (shipped once — the deepening pass added attributes to pages that
  // never called it).
  useReveal();

  return (
    <>
      <section className="fl-hero fl-hero-page">
        <div className="fl-hero-scene" ref={heroRef} aria-hidden="true" />
        <div className="fl-hero-veil fl-hero-veil-bottom" aria-hidden="true" />
        <div className="fl-hero-inner">
          <p className="fl-kicker">For athletes</p>
          <h1 className="fl-display fl-display-page">
            <span className="fl-mask"><span style={{ '--d': '0.05s' }}>Your coach, between</span></span>
            <span className="fl-mask"><span style={{ '--d': '0.15s' }}><span className="fl-accent">the sessions.</span></span></span>
          </h1>
          <p className="fl-lede">
            <span className="fl-mask"><span style={{ '--d': '0.3s' }}>
              The programme, the food, the check-in, the conversation.
              Same pocket as your music.
            </span></span>
          </p>
        </div>
      </section>

      <section className="fl-section fl-railed">
        <div className="fl-rail"><span>In your pocket</span></div>
        <div className="fl-edit-rows" data-reveal>
          <div className="fl-edit-row">
            <span className="fl-edit-row-n" aria-hidden="true">01</span>
            <div>
              <p className="fl-edit-row-title">One tap. Set logged.</p>
              <p className="fl-edit-row-sub">
                Steppers, not keyboards. Typing’s there if you want it.
                You won’t.
              </p>
            </div>
          </div>
          <div className="fl-edit-row">
            <span className="fl-edit-row-n" aria-hidden="true">02</span>
            <div>
              <p className="fl-edit-row-title">See it. Then lift it.</p>
              <p className="fl-edit-row-sub">
                Every exercise ships with a demo and a muscle map.
                Know before you load.
              </p>
            </div>
          </div>
          <div className="fl-edit-row">
            <span className="fl-edit-row-n" aria-hidden="true">03</span>
            <div>
              <p className="fl-edit-row-title">Rest, on your terms.</p>
              <p className="fl-edit-row-sub">
                Structure when you want it. One tap to skip the lot when you don’t.
                It asks once.
              </p>
            </div>
          </div>
          <div className="fl-edit-row">
            <span className="fl-edit-row-n" aria-hidden="true">04</span>
            <div>
              <p className="fl-edit-row-title">Food that bends. Macros that don’t.</p>
              <p className="fl-edit-row-sub">
                Swap any meal when life happens. The numbers stay honest.
              </p>
            </div>
          </div>
          <div className="fl-edit-row">
            <span className="fl-edit-row-n" aria-hidden="true">05</span>
            <div>
              <p className="fl-edit-row-title">Say it your way.</p>
              <p className="fl-edit-row-sub">
                No sliders. You say how the week went.
                A person answers.
              </p>
            </div>
          </div>
          <div className="fl-edit-row">
            <span className="fl-edit-row-n" aria-hidden="true">06</span>
            <div>
              <p className="fl-edit-row-title">Yours means yours.</p>
              <p className="fl-edit-row-sub">
                Delete your account and everything goes. Your coach keeps
                their books — not your life.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="fl-section fl-railed">
        <div className="fl-rail" aria-hidden="true"><span>The feel</span></div>
        <div className="fl-stack-stats" data-reveal>
          <div className="fl-stack-stat">
            <span className="fl-stack-stat-label">To log a set</span>
            <span className="fl-stack-stat-value">1<small> tap</small></span>
          </div>
          <div className="fl-stack-stat">
            <span className="fl-stack-stat-label">Forms per check-in</span>
            <span className="fl-stack-stat-value">0</span>
          </div>
          <div className="fl-stack-stat">
            <span className="fl-stack-stat-label">Humans reading it</span>
            <span className="fl-stack-stat-value">1</span>
          </div>
        </div>
      </section>

      <section className="fl-band">
        <div className="fl-band-inner">
          <div>
            <h2 className="fl-band-title">Got an invite from your coach?</h2>
            <p className="fl-body-wide">
              Then you’re most of the way in. Launching this year —
              your coach sends the link.
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
