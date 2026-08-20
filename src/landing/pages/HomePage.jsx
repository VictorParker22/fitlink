import { Link } from 'react-router-dom';
import { useScene } from '../scenes/sceneKit.js';
import { NOTIFY_HREF } from '../components/Shell.jsx';
import CoachPanel from '../components/CoachPanel.jsx';
import LiveEconomy from '../components/LiveEconomy.jsx';
import PhoneDemo from '../components/PhoneDemo.jsx';
import PRShareCard from '../components/PRShareCard.jsx';
import Ticker from '../components/Ticker.jsx';
import { useReveal } from '../components/useReveal.js';
import WaitlistForm from '../components/WaitlistForm.jsx';

/**
 * Home — the editorial pass, after studying on.energy and Consensys live.
 *
 * What those two sites do that the athletic pass did not: the hero arrives
 * line by line from behind a mask instead of all at once; sections carry a
 * vertical letter rail instead of numbered kickers; the thesis gets its own
 * manifesto band with links woven INTO the prose; the product is told as a
 * stack of narrative rows with stats set as typography; and the page closes
 * on a two-clause band, not a poster. Their layout language, our tokens —
 * the palette, type and honesty fixtures (the economy model's disclosure,
 * no invented user counts, no fake logos) all survive unchanged.
 *
 * The old stat wall is gone on purpose: its numbers now live inside the
 * stack rows, next to the screens they describe, and printing them twice
 * was clutter pretending to be emphasis.
 */

const loadCoachNetwork = () =>
  import('../CoachNetwork.js').then((m) => ({ create: m.createCoachNetwork }));

export default function HomePage() {
  const heroRef = useScene(loadCoachNetwork);
  useReveal();

  return (
    <>
      {/* ── Hero: the poster, unmasking line by line ─────────── */}
      <section className="fl-hero">
        <div className="fl-hero-scene" ref={heroRef} aria-hidden="true" />
        <div className="fl-hero-veil" aria-hidden="true" />

        <div className="fl-hero-inner">
          <p className="fl-eyebrow">
            <span className="fl-dot" aria-hidden="true" />
            FitLink — the app coaching businesses run on · launching this year
          </p>

          <h1 className="fl-display">
            <span className="fl-mask">
              <span style={{ '--d': '0.05s' }}>
                Train<span className="fl-display-dim">ers</span> keep
              </span>
            </span>
            <span className="fl-mask">
              <span style={{ '--d': '0.15s' }} className="fl-accent">90 percent.</span>
            </span>
          </h1>

          <p className="fl-lede">
            <span className="fl-mask">
              <span style={{ '--d': '0.3s' }}>
                The roster. The programming. The check-ins. The money. Handled.
              </span>
            </span>
            <span className="fl-mask">
              <span style={{ '--d': '0.4s' }}>All that’s left is the coaching.</span>
            </span>
          </p>

          <WaitlistForm source="home-hero" />

          <p className="fl-hero-note">
            A flat 10%. Your own Stripe account. Your athletes, always yours.
          </p>

          {/* The on.energy hero chip: one featured door, for the visitor
              who came to check the math before reading a word of pitch. */}
          <Link className="fl-featured" to="/coaches">
            <div>
              <p className="fl-featured-kicker">The number you came for</p>
              <p className="fl-featured-text">
                The calculator that shows what your book keeps here
              </p>
            </div>
            <span className="fl-featured-go" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <Ticker words={['Train', 'Log', 'Check in', 'Get paid', 'Repeat']} />

      {/* ── Manifesto: the thesis, in prose ──────────────────── */}
      <section className="fl-manifesto">
        <div className="fl-manifesto-inner" data-reveal>
          <p className="fl-kicker">The coaching economy</p>
          <p className="fl-manifesto-claim">
            Software ate the gym. The relationship survived.
          </p>
          <p className="fl-manifesto-prose">
            Most coaching platforms charge rent. The monthly fee arrives whether
            your book grew or shrank — a landlord’s income, collected from your
            work either way. Software built on rent gets built for the landlord.
          </p>
          <p className="fl-manifesto-prose">
            FitLink takes{' '}
            <Link className="fl-prose-link" to="/pricing">a flat 10%</Link>{' '}
            and nothing else, so the software’s income is the coach’s income.
            We call that <strong className="fl-manifesto-term">aligned software</strong>:
            the only way we grow is if{' '}
            <Link className="fl-prose-link" to="/coaches">the whole business</Link>{' '}
            — roster, seasons, check-ins, payouts — genuinely runs better here.
            A slow month costs us both.
          </p>
        </div>
      </section>

      {/* ── The stack: the product, told as three rows ───────── */}
      <section className="fl-section fl-railed">
        <div className="fl-rail" aria-hidden="true"><span>The stack</span></div>

        {/* Row 1 — the athlete's set, logged */}
        <div className="fl-stackrow">
          <div data-reveal>
            <h2 className="fl-stack-name">The session</h2>
            <p className="fl-stack-body">
              Steppers, not typing — finished sets fold away and the rest timer
              runs itself, or doesn’t, on one tap. And the coach is right there
              in the session, because the product is the relationship, not the
              logbook.
            </p>
            <Link className="fl-btn-ghost" to="/athletes">The athlete side →</Link>
            <div className="fl-stack-stats" style={{ marginTop: 28 }}>
              <div className="fl-stack-stat">
                <span className="fl-stack-stat-label">To log a set</span>
                <span className="fl-stack-stat-value">1<small> tap</small></span>
              </div>
              <div className="fl-stack-stat">
                <span className="fl-stack-stat-label">Keyboards mid-set</span>
                <span className="fl-stack-stat-value">0</span>
              </div>
            </div>
          </div>
          <div data-reveal="2">
            <PhoneDemo />
          </div>
        </div>

        {/* Row 2 — the coach's book, run */}
        <div className="fl-stackrow">
          <div data-reveal>
            <h2 className="fl-stack-name">The business</h2>
            <p className="fl-stack-body">
              The roster, the seasons, the day’s sessions and the athlete going
              quiet — one screen, on the web too. The money lands in your own
              Stripe account, minus a flat 10% and nothing else.
            </p>
            <Link className="fl-btn-ghost" to="/coaches">The coach side →</Link>
            <div className="fl-stack-stats" style={{ marginTop: 28 }}>
              <div className="fl-stack-stat">
                <span className="fl-stack-stat-label">Stays with the coach</span>
                <span className="fl-stack-stat-value">90<small>%</small></span>
              </div>
              <div className="fl-stack-stat">
                <span className="fl-stack-stat-label">Monthly fee</span>
                <span className="fl-stack-stat-value">$0</span>
              </div>
            </div>
          </div>
          <div data-reveal="2">
            <CoachPanel />
          </div>
        </div>

        {/* Row 3 — the PR, celebrated and carried out the door */}
        <div className="fl-stackrow">
          <div data-reveal>
            <h2 className="fl-stack-name">The moment</h2>
            <p className="fl-stack-body">
              A personal record is detected the instant it’s logged, celebrated
              in the session, and offered as a story-ready card. The athlete’s
              number travels; the coach gets asked “what app is that”.
            </p>
            <Link className="fl-btn-ghost" to="/athletes">Where PRs live →</Link>
            <div className="fl-stack-stats" style={{ marginTop: 28 }}>
              <div className="fl-stack-stat">
                <span className="fl-stack-stat-label">Your roster if you leave</span>
                <span className="fl-stack-stat-value">100<small>%</small></span>
              </div>
              <div className="fl-stack-stat">
                <span className="fl-stack-stat-label">Share formats</span>
                <span className="fl-stack-stat-value">4:5</span>
              </div>
            </div>
          </div>
          <div data-reveal="2">
            <PRShareCard />
          </div>
        </div>
      </section>

      {/* ── The economy, running ─────────────────────────────── */}
      <section className="fl-section fl-section-alt">
        <div data-reveal className="fl-centered">
          <p className="fl-kicker">The money</p>
          <h2 className="fl-h2">We take ten. You keep the&nbsp;rest.</h2>
        </div>
        <LiveEconomy />
      </section>

      <Ticker words={['Seasons', 'Passes', 'Payouts', 'Classes', 'Check-ins']} reverse />

      {/* ── The vision, told the way Apple tells one ─────── */}
      {/* Not a feature list — the reasoning that shaped the product, one
          decision per glass panel, floating over a lit background so the
          blur has something real to refract. Apple sells the thinking and
          lets the spec sheet come last; same play here. */}
      <section className="fl-vision">
        <div className="fl-vision-glow" aria-hidden="true" />
        <div className="fl-vision-inner">
          <p className="fl-kicker" data-reveal>Why it looks like this</p>
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

      {/* ── The rules: the terms as editorial rows ───────────── */}
      {/* Each row is a promise with the page that proves it. Every line
          here is a published product term, not a metric. */}
      <section className="fl-section fl-railed">
        <div className="fl-rail" aria-hidden="true"><span>The rules</span></div>
        <div data-reveal>
          <p className="fl-kicker">The rules</p>
          {/* The rail vanishes under 900px, so without this heading the
              mobile page opened on naked numbered rows — context-free. */}
          <h2 className="fl-h2">Three things that can’t change.</h2>
        </div>
        <div className="fl-edit-rows" data-reveal>
          <Link className="fl-edit-row" to="/coaches">
            <span className="fl-edit-row-n" aria-hidden="true">01</span>
            <div>
              <p className="fl-edit-row-title">Your athletes are yours</p>
              <p className="fl-edit-row-sub">
                Leave and the roster leaves with you — enforced in the database
              </p>
            </div>
            <span className="fl-edit-row-go" aria-hidden="true">→</span>
          </Link>
          <Link className="fl-edit-row" to="/gyms">
            <span className="fl-edit-row-n" aria-hidden="true">02</span>
            <div>
              <p className="fl-edit-row-title">A gym never reads the thread</p>
              <p className="fl-edit-row-sub">
                Business figures only; there is no switch that reveals coaching
              </p>
            </div>
            <span className="fl-edit-row-go" aria-hidden="true">→</span>
          </Link>
          <Link className="fl-edit-row" to="/pricing">
            <span className="fl-edit-row-n" aria-hidden="true">03</span>
            <div>
              <p className="fl-edit-row-title">We earn when you earn</p>
              <p className="fl-edit-row-sub">
                A flat 10% and nothing else — a slow month costs nothing
              </p>
            </div>
            <span className="fl-edit-row-go" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* ── Close: the two-clause band ───────────────────────── */}
      <section className="fl-band">
        <div className="fl-band-inner">
          <h2 className="fl-band-title" data-reveal>
            Coaching is complicated. Starting isn’t.
          </h2>
          <div data-reveal="2">
            <WaitlistForm source="home-band" />
          </div>
        </div>
      </section>
    </>
  );
}
