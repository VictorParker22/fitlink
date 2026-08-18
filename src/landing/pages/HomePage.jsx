import { Link } from 'react-router-dom';
import { useScene } from '../scenes/sceneKit.js';
import { NOTIFY_HREF } from '../components/Shell.jsx';
import LiveEconomy from '../components/LiveEconomy.jsx';

/**
 * Home — the front door and the switchboard.
 *
 * Its job changed when the site went multi-page: it no longer has to tell
 * every story, it has to tell ONE (coaching is a relationship; the money
 * proves we mean it) and route each audience to their own page. The three
 * doors are full cards, not nav duplicates — a visitor who ignores the top
 * nav still finds their path by scrolling.
 */

const loadCoachNetwork = () =>
  import('../CoachNetwork.js').then((m) => ({ create: m.createCoachNetwork }));

export default function HomePage() {
  const heroRef = useScene(loadCoachNetwork);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="fl-hero">
        <div className="fl-hero-scene" ref={heroRef} aria-hidden="true" />
        <div className="fl-hero-veil" aria-hidden="true" />

        <div className="fl-hero-inner">
          <p className="fl-eyebrow">
            <span className="fl-dot" aria-hidden="true" />
            In development · first release on iOS and Android
          </p>

          <h1 className="fl-h1">
            Coaching is a relationship.<br />
            <span className="fl-accent">Run it like one.</span>
          </h1>

          <p className="fl-lede">
            FitLink holds the roster, the programming, the check-ins and the money, so the
            only thing left between you and your athletes is the coaching.
          </p>

          <div className="fl-hero-cta">
            <a className="fl-btn fl-btn-lg" href={NOTIFY_HREF}>Tell me when it launches</a>
            <Link className="fl-btn-ghost fl-btn-lg" to="/coaches">I coach</Link>
          </div>

          <p className="fl-hero-note">
            You keep 90%. Payments go to your own Stripe account. Your athletes stay yours.
          </p>
        </div>
      </section>

      {/* ── The economy, running ─────────────────────────────── */}
      <section className="fl-section fl-section-alt">
        <p className="fl-kicker">The money, moving</p>
        <h2 className="fl-h2">Watch what a 10% fee leaves on the table. Yours.</h2>
        <LiveEconomy />
      </section>

      {/* ── Three doors ──────────────────────────────────────── */}
      <section className="fl-section">
        <p className="fl-kicker">Find your page</p>
        <h2 className="fl-h2">Three ways into the same product.</h2>

        <div className="fl-doors">
          <Link className="fl-door" to="/coaches">
            <p className="fl-door-kicker">For coaches</p>
            <h3 className="fl-door-title">Your whole business, one place</h3>
            <p className="fl-door-body">
              Seasons, check-ins, payments and the roster — with a calculator that shows what
              your book keeps here.
            </p>
            <span className="fl-door-go" aria-hidden="true">→</span>
          </Link>

          <Link className="fl-door" to="/athletes">
            <p className="fl-door-kicker">For athletes</p>
            <h3 className="fl-door-title">A coach in your pocket</h3>
            <p className="fl-door-body">
              Log a set in one tap, see the demo before you load the bar, and talk to a human
              who knows your name.
            </p>
            <span className="fl-door-go" aria-hidden="true">→</span>
          </Link>

          <Link className="fl-door" to="/gyms">
            <p className="fl-door-kicker">For gyms</p>
            <h3 className="fl-door-title">Seats, rosters, revenue</h3>
            <p className="fl-door-body">
              Run several coaches under one roof, see what a business needs to see — and
              nothing your coaches' athletes said in private.
            </p>
            <span className="fl-door-go" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* ── Close ────────────────────────────────────────────── */}
      <section className="fl-close">
        <h2 className="fl-h2">FitLink launches this year.</h2>
        <p className="fl-body-wide">
          There is no waitlist form here because there is no waitlist system behind it yet.
          Email us instead — it reaches a person.
        </p>
        <a className="fl-btn fl-btn-lg" href={NOTIFY_HREF}>Email us</a>
      </section>
    </>
  );
}
