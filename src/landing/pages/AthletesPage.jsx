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
          <h1 className="fl-h1 fl-h1-page">
            Your coach, between<br />
            <span className="fl-accent">the sessions.</span>
          </h1>
          <p className="fl-lede">
            The programme, the food, the check-in and the conversation — in the same pocket
            as your music.
          </p>
        </div>
      </section>

      <section className="fl-section">
        <div className="fl-grid fl-grid-3">
          <article className="fl-card">
            <h3>Log a set in one tap</h3>
            <p>
              Weight and reps move on steppers, not a keyboard. Typing is there if you prefer
              it — it just isn’t the only way in.
            </p>
          </article>
          <article className="fl-card">
            <h3>See it before you lift it</h3>
            <p>
              Every exercise carries a demo and a muscle map, so you know what you are doing
              before you load the bar.
            </p>
          </article>
          <article className="fl-card">
            <h3>Rest timers that adapt</h3>
            <p>
              Per-set timers when you want structure, one tap to skip them for the whole
              workout when you don’t — and it asks once, not every set.
            </p>
          </article>
          <article className="fl-card">
            <h3>Food that fits the week</h3>
            <p>
              Meal plans you can swap when real life happens, with the macros kept honest
              either way.
            </p>
          </article>
          <article className="fl-card">
            <h3>Check-ins in your own words</h3>
            <p>
              Not a form with ten sliders. You say how the week went; your coach reads it and
              answers like a person.
            </p>
          </article>
          <article className="fl-card">
            <h3>Your data is yours</h3>
            <p>
              Delete your account and everything goes — sessions, photos, messages,
              measurements. Your coach keeps their business records, not your life.
            </p>
          </article>
        </div>
      </section>

      <section className="fl-close">
        <h2 className="fl-h2">Got an invite from your coach?</h2>
        <p className="fl-body-wide">
          Then you’re most of the way in already. The app launches this year on iOS and
          Android — your coach will send the link.
        </p>
        <a className="fl-btn fl-btn-lg" href={NOTIFY_HREF}>Tell me when it launches</a>
      </section>
    </>
  );
}
