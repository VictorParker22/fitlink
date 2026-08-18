import { useScene } from '../scenes/sceneKit.js';
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

  return (
    <>
      <section className="fl-hero fl-hero-page">
        <div className="fl-hero-scene" ref={heroRef} aria-hidden="true" />
        <div className="fl-hero-veil fl-hero-veil-bottom" aria-hidden="true" />
        <div className="fl-hero-inner">
          <p className="fl-kicker">For athletes</p>
          <h1 className="fl-display fl-display-page">
            Your coach, between<br />
            <span className="fl-accent">the sessions.</span>
          </h1>
          <p className="fl-lede">
            The programme, the food, the check-in, the conversation.
            Same pocket as your music.
          </p>
        </div>
      </section>

      <section className="fl-section">
        <div className="fl-grid fl-grid-3">
          <article className="fl-card">
            <h3>One tap. Set logged.</h3>
            <p>
              Steppers, not keyboards. Typing’s there if you want it.
              You won’t.
            </p>
          </article>
          <article className="fl-card">
            <h3>See it. Then lift it.</h3>
            <p>
              Every exercise ships with a demo and a muscle map.
              Know before you load.
            </p>
          </article>
          <article className="fl-card">
            <h3>Rest, on your terms.</h3>
            <p>
              Structure when you want it. One tap to skip the lot when you don’t.
              It asks once.
            </p>
          </article>
          <article className="fl-card">
            <h3>Food that bends. Macros that don’t.</h3>
            <p>
              Swap any meal when life happens. The numbers stay honest.
            </p>
          </article>
          <article className="fl-card">
            <h3>Say it your way.</h3>
            <p>
              No sliders. You say how the week went.
              A person answers.
            </p>
          </article>
          <article className="fl-card">
            <h3>Yours means yours.</h3>
            <p>
              Delete your account and everything goes. Your coach keeps
              their books — not your life.
            </p>
          </article>
        </div>
      </section>

      <section className="fl-close">
        <h2 className="fl-h2">Got an invite from your coach?</h2>
        <p className="fl-body-wide">
          Then you’re most of the way in. Launching this year —
          your coach sends the link.
        </p>
        <a className="fl-btn fl-btn-lg" href={NOTIFY_HREF}>Tell me when it launches</a>
      </section>
    </>
  );
}
