import { Link } from 'react-router-dom';
import { useScene } from '../scenes/sceneKit.js';
import { NOTIFY_HREF } from '../components/Shell.jsx';
import LiveEconomy from '../components/LiveEconomy.jsx';
import PhoneDemo from '../components/PhoneDemo.jsx';
import Ticker from '../components/Ticker.jsx';
import { useReveal } from '../components/useReveal.js';
import WaitlistForm from '../components/WaitlistForm.jsx';

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
          {/* The identity anchor. The audit's finding: the hero hook told
              you the terms before the page ever said what FitLink IS. This
              line does that job in eight words; "launching this year" keeps
              the honesty without leading with deflation. */}
          <p className="fl-eyebrow">
            <span className="fl-dot" aria-hidden="true" />
            FitLink — the app coaching businesses run on · launching this year
          </p>

          <h1 className="fl-display">
            Train<span className="fl-display-dim">ers</span> keep<br />
            <span className="fl-accent">90 percent.</span>
          </h1>

          <p className="fl-lede">
            The roster. The programming. The check-ins. The money. Handled.
            All that’s left is the coaching.
          </p>

          <WaitlistForm source="home-hero" />

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
            Steppers, not typing. Finished sets fold away. The rest timer runs itself —
            or doesn’t. Your call, one tap.
          </p>
          <p className="fl-body-wide">
            And your coach is right there in the session. Because the product is the
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
        <div data-reveal className="fl-centered">
          <p className="fl-kicker">02 — The money</p>
          <h2 className="fl-h2">We take ten. You keep the&nbsp;rest.</h2>
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
            <p className="fl-stat-l">stays with the coach. Every month, every dollar.</p>
          </div>
          <div className="fl-stat" data-reveal="2">
            <p className="fl-stat-n">$0</p>
            <p className="fl-stat-l">monthly fee. A slow month costs exactly that.</p>
          </div>
          <div className="fl-stat" data-reveal="3">
            <p className="fl-stat-n">1</p>
            <p className="fl-stat-l">tap logs a set. Keyboards stay in the office.</p>
          </div>
          <div className="fl-stat" data-reveal="4">
            <p className="fl-stat-n">100<span className="fl-stat-unit">%</span></p>
            <p className="fl-stat-l">of your roster leaves with you. If you ever do.</p>
          </div>
        </div>
      </section>

      {/* ── Three doors ──────────────────────────────────────── */}
      <section className="fl-section fl-section-alt">
        <div data-reveal className="fl-centered">
          <p className="fl-kicker">04 — Find your page</p>
          <h2 className="fl-h2">Three doors. One product.</h2>
        </div>

        <div className="fl-doors">
          <Link className="fl-door" to="/coaches" data-reveal>
            <p className="fl-door-kicker">For coaches</p>
            <h3 className="fl-door-title">Your whole business, one place</h3>
            <p className="fl-door-body">
              Seasons, check-ins, payments, roster. And a calculator that does
              your math before you commit.
            </p>
            <span className="fl-door-go" aria-hidden="true">→</span>
          </Link>

          <Link className="fl-door" to="/athletes" data-reveal="2">
            <p className="fl-door-kicker">For athletes</p>
            <h3 className="fl-door-title">A coach in your pocket</h3>
            <p className="fl-door-body">
              One tap logs the set. The demo plays before you load the bar.
              And a human knows your name.
            </p>
            <span className="fl-door-go" aria-hidden="true">→</span>
          </Link>

          <Link className="fl-door" to="/gyms" data-reveal="3">
            <p className="fl-door-kicker">For gyms</p>
            <h3 className="fl-door-title">Seats, rosters, revenue</h3>
            <p className="fl-door-body">
              Every coach under one roof. Everything a business needs to see.
              Nothing said in private.
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
                Every app tracks sets. Almost none carry the conversation.
                So the thread lives inside the session — not in a tab you
                forget to open.
              </p>
            </article>
            <article className="fl-glass" data-reveal="2">
              <p className="fl-glass-n">Rule two</p>
              <h3>The money follows the work</h3>
              <p>
                Monthly-fee platforms get paid whether you do or not. We flipped it:
                FitLink earns only when you earn. Same side of the table.
              </p>
            </article>
            <article className="fl-glass" data-reveal="3">
              <p className="fl-glass-n">Rule three</p>
              <h3>Nothing you built gets held hostage</h3>
              <p>
                Your roster, your programmes, your library — they leave with you.
                Enforced in the database, not promised in the terms.
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
          iOS and Android. Coaches on the list get in first.
        </p>
        <div className="fl-close-form"><WaitlistForm source="home-close" /></div>
      </section>
    </>
  );
}
