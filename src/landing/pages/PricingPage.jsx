import { useState } from 'react';
import { NOTIFY_HREF, SUPPORT } from '../components/Shell.jsx';

/**
 * Pricing — the numbers, and the questions people actually ask about them.
 *
 * No scene on this page, on purpose: pricing is where a visitor wants the
 * site to hold still. The FAQ moved here from the old single page because
 * every question in it is ultimately a money-or-ownership question.
 */

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

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <>
      <section className="fl-section fl-section-first">
        <p className="fl-kicker">Pricing</p>
        <h1 className="fl-display fl-display-page">
          <span className="fl-mask"><span style={{ '--d': '0.05s' }}>Ten percent.</span></span>
          <span className="fl-mask"><span style={{ '--d': '0.15s' }}><span className="fl-accent">That’s the whole story.</span></span></span>
        </h1>

        <div className="fl-price-row">
          <article className="fl-price">
            <p className="fl-price-name">Coaching on FitLink</p>
            <p className="fl-price-big">10%</p>
            <p className="fl-price-sub">flat platform fee</p>
            <p className="fl-price-body">
              No monthly fee. No per-athlete charge. You keep 90% of everything.
              A slow month costs nothing — we earn when you earn, and only then.
            </p>
          </article>

          <article className="fl-price fl-price-quiet">
            <p className="fl-price-name">Athlete Elite</p>
            <p className="fl-price-big">$29.99</p>
            <p className="fl-price-sub">per month, or $249 a year</p>
            <p className="fl-price-body">
              Optional, and the athlete’s call — never the coach’s bill.
              Everything a coached athlete needs works without it.
            </p>
          </article>

          <article className="fl-price fl-price-quiet">
            <p className="fl-price-name">Gym seats</p>
            <p className="fl-price-big">Per seat</p>
            <p className="fl-price-sub">priced per organisation</p>
            <p className="fl-price-body">
              First seat free. The second coach is what starts billing. Ask at{' '}
              <a className="fl-inline-link" href={`mailto:${SUPPORT}`}>{SUPPORT}</a> and we will
              quote it plainly.
            </p>
          </article>
        </div>
      </section>

      <section className="fl-section fl-section-alt fl-railed">
        <div className="fl-rail"><span>Questions</span></div>
        <p className="fl-kicker">Questions</p>
        <h2 className="fl-h2">Asked. Answered.</h2>

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
              {openFaq === i && <p className="fl-faq-a" id={`faq-${i}`}>{item.a}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="fl-band">
        <div className="fl-band-inner">
          <div>
            <h2 className="fl-band-title">Still weighing it?</h2>
            <p className="fl-body-wide">
              The calculator on the coaches page runs your exact numbers.
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
