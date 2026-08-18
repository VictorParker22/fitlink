import { Link } from 'react-router-dom';
import { useScene } from '../scenes/sceneKit.js';
import { NOTIFY_HREF } from '../components/Shell.jsx';
import LiveEconomy from '../components/LiveEconomy.jsx';
import PhoneDemo from '../components/PhoneDemo.jsx';
import Ticker from '../components/Ticker.jsx';
import { useReveal } from '../components/useReveal.js';

/**
 * Home — rebuilt after studying how athletic brands actually lay out.
 *
 * What Equinox and Whoop do that our first pass did not: enormous type used
 * like a poster, the layout interrupting its own rhythm (tickers, stat
 * walls, a phone breaking the column), and above all THE PRODUCT ON THE
 * PAGE — Whoop floats its ring UI over photography; Equinox shows the
 * clubs. Our first pass showed six identical text cards and no product,
 * which is exactly why it read as template output.
 *
 * The order of sections is an argument, not a list:
 *   poster hero → the product logging a set → the money moving →
 *   the stat wall (terms as a poster) → the three doors → close.
 * Concrete before abstract, product before pitch.
 */

const loadCoachNetwork = () =>
  import('../CoachNetwork.js').then((m) => ({ create: m.createCoachNetwork }));

export default function HomePage() {
  const heroRef = useScene(loadCoachNetwork);
  useReveal();

  return (
    <>
      {/* ── Hero: the poster ─────────────────────────────────── */}
      <section className="fl-hero">
        <div className="fl-hero-scene" ref={heroRef} aria-hidden="true" />
        <div className="fl-hero-veil" aria-hidden="true" />

        <div className="fl-hero-inner">
          <p className="fl-eyebrow">
            <span className="fl-dot" aria-hidden="true" />
            In development · first release on iOS and Android
          </p>

          <h1 className="fl-display">
            Train<span className="fl-display-dim">ers</span> keep<br />
            <span className="fl-accent">90 percent.</span>
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
            Flat 10% fee. Payments land in your own Stripe account. Your athletes stay yours.
          </p>
        </div>
      </section>

      <Ticker words={['Train', 'Log', 'Check in', 'Get paid', 'Repeat']} />

      {/* ── The product, up close ────────────────────────────── */}
      <section className="fl-section fl-split">
        <div className="fl-split-copy" data-reveal>
          <p className="fl-kicker">01 — The session</p>
          <h2 className="fl-h2">Mid-set is no place<br />for a keyboard.</h2>
          <p className="fl-body-wide">
            This is the screen an athlete actually lives on. Weight and reps move on steppers
            built for a hand that just finished squatting; the finished set collapses to one
            line; the rest timer runs — or gets skipped for the whole workout in one tap.
          </p>
          <p className="fl-body-wide">
            And the coach is right there in the session, because the product is the
            relationship, not the logbook.
          </p>
          <Link className="fl-btn-ghost" to="/athletes">The athlete side →</Link>
        </div>
        <div className="fl-split-media" data-reveal="2">
          <PhoneDemo />
        </div>
      </section>

      {/* ── The economy, running ─────────────────────────────── */}
      <section className="fl-section fl-section-alt">
        <div data-reveal>
          <p className="fl-kicker">02 — The money</p>
          <h2 className="fl-h2">Watch what a 10% fee leaves on the table. Yours.</h2>
        </div>
        <LiveEconomy />
      </section>

      <Ticker words={['Seasons', 'Passes', 'Payouts', 'Classes', 'Check-ins']} reverse />

      {/* ── Stat wall: the terms, poster-sized ───────────────── */}
      {/* Every number here is a published product term, not a metric we
          invented. That is what lets them be this big. */}
      <section className="fl-section">
        <p className="fl-kicker" data-reveal>03 — The terms</p>
        <div className="fl-statwall">
          <div className="fl-stat" data-reveal>
            <p className="fl-stat-n">90<span className="fl-stat-unit">%</span></p>
            <p className="fl-stat-l">of athlete revenue stays with the coach</p>
          </div>
          <div className="fl-stat" data-reveal="2">
            <p className="fl-stat-n">$0</p>
            <p className="fl-stat-l">monthly fee — a slow month costs nothing</p>
          </div>
          <div className="fl-stat" data-reveal="3">
            <p className="fl-stat-n">1</p>
            <p className="fl-stat-l">tap to log a set, steppers not keyboards</p>
          </div>
          <div className="fl-stat" data-reveal="4">
            <p className="fl-stat-n">100<span className="fl-stat-unit">%</span></p>
            <p className="fl-stat-l">of your roster leaves with you if you go</p>
          </div>
        </div>
      </section>

      {/* ── Three doors ──────────────────────────────────────── */}
      <section className="fl-section fl-section-alt">
        <div data-reveal>
          <p className="fl-kicker">04 — Find your page</p>
          <h2 className="fl-h2">Three ways into the same product.</h2>
        </div>

        <div className="fl-doors">
          <Link className="fl-door" to="/coaches" data-reveal>
            <p className="fl-door-kicker">For coaches</p>
            <h3 className="fl-door-title">Your whole business, one place</h3>
            <p className="fl-door-body">
              Seasons, check-ins, payments and the roster — with a calculator that shows what
              your book keeps here.
            </p>
            <span className="fl-door-go" aria-hidden="true">→</span>
          </Link>

          <Link className="fl-door" to="/athletes" data-reveal="2">
            <p className="fl-door-kicker">For athletes</p>
            <h3 className="fl-door-title">A coach in your pocket</h3>
            <p className="fl-door-body">
              Log a set in one tap, see the demo before you load the bar, and talk to a human
              who knows your name.
            </p>
            <span className="fl-door-go" aria-hidden="true">→</span>
          </Link>

          <Link className="fl-door" to="/gyms" data-reveal="3">
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

      {/* ── The vision, told the way Apple tells one ─────── */}
      {/* Not a feature list — the reasoning that shaped the product, one
          decision per glass panel, floating over a lit background so the
          blur has something real to refract. Apple sells the thinking and
          lets the spec sheet come last; same play here. */}
      <section className="fl-vision">
        <div className="fl-vision-glow" aria-hidden="true" />
        <div className="fl-vision-inner">
          <p className="fl-kicker" data-reveal>05 — Why it looks like this</p>
          <h2 className="fl-h2" data-reveal>We didn’t start with features.<br />We started with a rule.</h2>

          <div className="fl-vision-cards">
            <article className="fl-glass" data-reveal>
              <p className="fl-glass-n">Rule one</p>
              <h3>The relationship is the product</h3>
              <p>
                Every fitness app tracks sets. Almost none carry the conversation — the cue
                from last week, the check-in in your own words, the reply from someone who
                knows your name. So the thread sits inside the session, not in a separate tab
                you forget to open.
              </p>
            </article>
            <article className="fl-glass" data-reveal="2">
              <p className="fl-glass-n">Rule two</p>
              <h3>The money follows the work</h3>
              <p>
                Platforms that charge coaches monthly get paid whether the coach does or not.
                We flipped the incentive: a flat 10% means FitLink earns only when a coach
                earns, and a slow month costs nothing. Our side of the table is your side.
              </p>
            </article>
            <article className="fl-glass" data-reveal="3">
              <p className="fl-glass-n">Rule three</p>
              <h3>Nothing you built gets held hostage</h3>
              <p>
                Your roster, your programmes, your library — they leave with you if you go.
                That is enforced in the database, not promised in the terms, because a promise
                you cannot verify is just a mood.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ── The split — the two-panel contrast ad, as a section ─ */}
      {/* The wallet-vs-keys construction: current pain on the dark half,
          the offer on the lit half, one action bar under both. */}
      <section className="fl-uber" aria-label="Coaching without FitLink versus with it">
        <div className="fl-uber-panels">
          <div className="fl-uber-dark">
            <p className="fl-uber-line">
              Spreadsheets,<br />screenshots<br />and chasing<br />invoices?
            </p>
            <p className="fl-uber-sub">The admin stack most coaches run today.</p>
          </div>
          <div className="fl-uber-light">
            <p className="fl-uber-line">
              One app that<br />runs the whole<br />book <span aria-hidden="true">→</span>
            </p>
            <p className="fl-uber-sub">Roster, seasons, check-ins and payouts.</p>
          </div>
        </div>
        <a className="fl-uber-bar" href={NOTIFY_HREF}>
          <span>Get launch news</span>
          <span aria-hidden="true">›</span>
        </a>
      </section>

      {/* ── Close ────────────────────────────────────────────── */}
      <section className="fl-close">
        <h2 className="fl-display fl-display-close">This year.</h2>
        <p className="fl-body-wide">
          FitLink launches on iOS and Android. No waitlist form — there is no waitlist system
          behind it yet, and a form that eats addresses is worse than an email that reaches a
          person.
        </p>
        <a className="fl-btn fl-btn-lg" href={NOTIFY_HREF}>Email us</a>
      </section>
    </>
  );
}
