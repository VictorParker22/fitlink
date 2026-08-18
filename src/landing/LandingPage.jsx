import { useEffect, useRef, useState } from 'react';
import './landing.css';

/**
 * The FitLink landing page.
 *
 * ── WHAT WAS REMOVED, AND WHY IT HAD TO BE ──────────────────────────
 * The previous version carried three claims that were not true:
 *
 *  1. A "Trusted by" band listing GOLD'S GYM, ANYTIME FITNESS, EQUINOX,
 *     CRUNCH and PLANET FITNESS. None are customers. Naming real companies
 *     as clients is false advertising and misuse of their marks — on a
 *     public domain, under our own name.
 *  2. Three testimonials from invented people ("Sarah Jenkins", "Mike
 *     Reynolds", "Jessica Alba") praising a product with no users.
 *  3. "Now Available for iOS & Android", above two store buttons whose
 *     onClick was `alert('coming soon')`.
 *
 * None of it is reproduced here. Social proof arrives when there are
 * customers to quote, and store badges arrive when there is a store listing
 * to link. Until then the page sells the product on what it does.
 *
 * ── THE ONE CTA THAT ACTUALLY WORKS ─────────────────────────────────
 * There is no waitlist backend, so a signup form would be a field that eats
 * an address and drops it. The primary action is a mailto that genuinely
 * reaches a human. One honest button beats three decorative ones.
 *
 * ── THE HERO ────────────────────────────────────────────────────────
 * three.js is imported dynamically after mount, so the headline paints
 * first and the scene arrives second. If WebGL is missing, or the reader
 * asked for reduced motion, the CSS underneath is the whole design and
 * nothing looks broken. See CoachNetwork.js.
 */

const SUPPORT = 'hello@fitlink.coach';
const NOTIFY_HREF = `mailto:${SUPPORT}?subject=${encodeURIComponent('Tell me when FitLink launches')}`;

const FAQS = [
  {
    q: 'What does FitLink cost a coach?',
    a: 'Nothing to start. You keep 90% of what your athletes pay you — FitLink takes a flat 10% platform fee, and payments run through Stripe directly to your own account. There is no monthly fee to run your coaching business here.',
  },
  {
    q: 'Is it available yet?',
    a: 'Not yet. FitLink is in active development and heading for its first release on iOS and Android. There is no store listing to link to, so this page does not pretend otherwise — email us and we will tell you the day it is live.',
  },
  {
    q: 'Who owns the athletes I bring?',
    a: 'You do. If you leave FitLink, or leave a gym that uses FitLink, your athletes stay yours. Nothing in the product lets an organisation claim a coach’s clients by administrative act.',
  },
  {
    q: 'Can a gym run several coaches on one account?',
    a: 'Yes. A gym buys seats, sees rosters, revenue and seat usage, and never sees inside a coaching conversation. A coach must accept an invitation — a gym cannot add someone to itself.',
  },
  {
    q: 'What happens to my data if I leave?',
    a: 'You can delete your account from inside the app, and everything goes with it — sessions, messages, photos, measurements. Payment records are kept only for as long as tax law requires. The full detail is on the delete-account page.',
  },
];

export default function LandingPage() {
  const heroRef = useRef(null);
  const sceneRef = useRef(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [year] = useState(() => new Date().getFullYear());

  useEffect(() => {
    document.body.classList.add('fl-body');
    return () => document.body.classList.remove('fl-body');
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Dynamic import: three.js is roughly the weight of this whole page, and
    // the headline must not wait behind it.
    import('./CoachNetwork.js')
      .then(({ createCoachNetwork }) => {
        if (cancelled || !heroRef.current) return;
        return createCoachNetwork(heroRef.current);
      })
      .then((scene) => {
        if (cancelled) { scene?.destroy(); return; }
        sceneRef.current = scene ?? null;
      })
      .catch(() => {
        // The hero is decoration. If it fails, the page is still the page.
      });

    return () => {
      cancelled = true;
      sceneRef.current?.destroy();
      sceneRef.current = null;
    };
  }, []);

  return (
    <div className="fl">
      <a className="fl-skip" href="#main">Skip to content</a>

      <header className="fl-nav">
        <a className="fl-mark" href="/" aria-label="FitLink home">
          <span className="fl-mark-tile" aria-hidden="true">FL</span>
          <span className="fl-mark-word">FitLink</span>
        </a>
        <nav className="fl-nav-links" aria-label="Sections">
          <a href="#coaches">Coaches</a>
          <a href="#athletes">Athletes</a>
          <a href="#gyms">Gyms</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <a className="fl-btn fl-btn-sm" href={NOTIFY_HREF}>Get launch news</a>
      </header>

      <main id="main">
        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="fl-hero">
          {/* The canvas mounts here. Until then — and forever, if WebGL is
              unavailable — the CSS gradient below IS the hero. */}
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
              <a className="fl-btn-ghost fl-btn-lg" href="#coaches">See how it works</a>
            </div>

            {/* Deliberately a statement of terms, not a fabricated metric.
                We have no user count worth printing, so we print what is
                actually true and actually persuasive. */}
            <p className="fl-hero-note">
              You keep 90%. Payments go to your own Stripe account. Your athletes stay yours.
            </p>
          </div>
        </section>

        {/* ── Coaches ────────────────────────────────────────── */}
        <section className="fl-section" id="coaches">
          <p className="fl-kicker">For coaches</p>
          <h2 className="fl-h2">Everything that isn’t coaching, handled.</h2>

          <div className="fl-grid">
            <article className="fl-card">
              <h3>Programming that survives contact</h3>
              <p>
                Build a season once and assign it to everyone on it. Edit a week mid-season and
                FitLink shows you exactly who it changes before it changes them.
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
          </div>
        </section>

        {/* ── Athletes ───────────────────────────────────────── */}
        <section className="fl-section fl-section-alt" id="athletes">
          <p className="fl-kicker">For athletes</p>
          <h2 className="fl-h2">A coach in your pocket, not a spreadsheet.</h2>

          <div className="fl-grid fl-grid-3">
            <article className="fl-card">
              <h3>Log a set in one tap</h3>
              <p>
                Weight and reps move on steppers, not a keyboard. Typing is there if you prefer it —
                it just isn’t the only way in.
              </p>
            </article>
            <article className="fl-card">
              <h3>See the session, not the jargon</h3>
              <p>
                Every exercise carries a demo and a muscle map, so you know what you are doing
                before you load the bar.
              </p>
            </article>
            <article className="fl-card">
              <h3>Food that fits the week</h3>
              <p>
                Meal plans you can swap out when real life happens, with the macros kept honest
                either way.
              </p>
            </article>
          </div>
        </section>

        {/* ── Gyms ───────────────────────────────────────────── */}
        <section className="fl-section" id="gyms">
          <p className="fl-kicker">For gyms</p>
          <h2 className="fl-h2">Seats, rosters and revenue. Nothing private.</h2>
          <p className="fl-body-wide">
            A gym on FitLink buys seats for its coaches and sees what a business needs to see:
            who is on a seat, how many athletes they carry, what came in this month, and when each
            coach last did real work. It does not see inside a coaching thread, a check-in or a
            health record — and the product has no switch that would let it.
          </p>
          <p className="fl-body-wide">
            Coaches accept an invitation themselves. A gym cannot add a coach to itself, and cannot
            take a coach’s athletes when they leave.
          </p>
        </section>

        {/* ── Pricing ────────────────────────────────────────── */}
        <section className="fl-section fl-section-alt" id="pricing">
          <p className="fl-kicker">Pricing</p>
          <h2 className="fl-h2">One number, and it’s on our side of the table.</h2>

          <div className="fl-price-row">
            <article className="fl-price">
              <p className="fl-price-name">Coaching on FitLink</p>
              <p className="fl-price-big">10%</p>
              <p className="fl-price-sub">flat platform fee</p>
              <p className="fl-price-body">
                No monthly fee. No per-athlete charge. You keep 90% of everything your athletes
                pay, and Stripe’s processing fee is the only other deduction — which you would pay
                anywhere.
              </p>
            </article>

            <article className="fl-price fl-price-quiet">
              <p className="fl-price-name">Athlete Elite</p>
              <p className="fl-price-big">$29.99</p>
              <p className="fl-price-sub">per month, or $249 a year</p>
              <p className="fl-price-body">
                Optional, and bought by the athlete rather than the coach. Everything a coached
                athlete needs works without it.
              </p>
            </article>
          </div>

          <p className="fl-fineprint">
            Gym seat pricing is set per organisation. Ask us and we will quote it plainly.
          </p>
        </section>

        {/* ── FAQ ────────────────────────────────────────────── */}
        <section className="fl-section" id="faq">
          <p className="fl-kicker">Questions</p>
          <h2 className="fl-h2">The ones worth answering.</h2>

          <div className="fl-faq">
            {FAQS.map((item, i) => (
              <div className="fl-faq-item" key={item.q}>
                <button
                  className="fl-faq-q"
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span>{item.q}</span>
                  <span className="fl-faq-sign" aria-hidden="true">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <p className="fl-faq-a" id={`faq-${i}`}>{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Close ──────────────────────────────────────────── */}
        <section className="fl-close">
          <h2 className="fl-h2">FitLink launches this year.</h2>
          <p className="fl-body-wide">
            There is no waitlist form here because there is no waitlist system behind it yet.
            Email us instead — it reaches a person.
          </p>
          <a className="fl-btn fl-btn-lg" href={NOTIFY_HREF}>Email us</a>
        </section>
      </main>

      <footer className="fl-footer">
        <div className="fl-footer-mark">
          <span className="fl-mark-tile" aria-hidden="true">FL</span>
          <span>FitLink</span>
        </div>
        <nav className="fl-footer-links" aria-label="Legal and support">
          <a href="/privacy">Privacy</a>
          <a href="/delete-account">Delete your account</a>
          <a href={`mailto:${SUPPORT}`}>{SUPPORT}</a>
        </nav>
        <p className="fl-footer-copy">© {year} FitLink</p>
      </footer>
    </div>
  );
}
