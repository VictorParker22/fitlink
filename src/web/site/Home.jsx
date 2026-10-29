// / (the design's index.html): the coach-first home page. Hero, the steps
// band, five feature rows, the athlete band, trust, pricing, the questions and
// the final call. Every brand, host and price word comes from brand.js and
// pricing.js, the sign-in sentence from siteCopy(), and the shared pieces
// (phones, steps, plans, the final CTA) from Pieces.jsx. The receipt's figures
// are arithmetic from one sample price and the fee percents, never typed.
import Faq from './Faq';
import { Display, FinalCta, Kicker, LinkArrow, Phone, PlansShort, Reveal, Steps } from './Pieces';
import { usePageMeta } from './meta';
import { ELITE_FEE_PERCENT, STANDARD_FEE_PERCENT, usd } from './pricing';
import { siteCopy } from '../appleAuth';
import { APPLE_WEB_ENABLED } from '../authConfig';
import { APP_STORE_URL, BRAND_NAME, SITE_HOST } from './brand';

/** The Money feature's receipt: one pass at this price, the fees from pricing.js. */
const SAMPLE_PASS_PRICE = 120;
const sampleFee = (SAMPLE_PASS_PRICE * STANDARD_FEE_PERCENT) / 100;
const sampleKeep = SAMPLE_PASS_PRICE - sampleFee;
const sampleEliteKeep = SAMPLE_PASS_PRICE - (SAMPLE_PASS_PRICE * ELITE_FEE_PERCENT) / 100;

const STEPS = [
  { n: '01', title: 'Set up your page', body: 'Your name, a photo, a line about how you coach, and your first pass.' },
  { n: '02', title: 'Share one link', body: 'Text it, post it, or put the QR code on the gym wall. It opens on any phone.' },
  { n: '03', title: 'Athletes pay on the web', body: 'No download before they buy. Their plan is waiting when they open the app.' },
  { n: '04', title: 'Get paid', body: 'Stripe sends the money to your bank. You see every fee before it lands.' },
];

const FAQ = [
  { q: 'Do my athletes need the app to pay?', a: siteCopy(APPLE_WEB_ENABLED).homeNeedAppA },
  { q: `Does ${BRAND_NAME} work on Android?`, a: `${BRAND_NAME} is an iPhone app today. There is no Android app yet, so an athlete needs an iPhone to train with you. Buying a pass works in any browser.` },
  { q: 'How do payouts work?', a: 'Payments run on Stripe. You connect a bank once, inside the app, and Stripe sends your payouts to it. Athletes can’t buy a pass until Stripe says your account can take charges.' },
  { q: 'Does the AI message my athletes?', a: 'Never on its own. With Coach Elite it drafts a reply from the check-in and the logged sets; you edit, approve and send.' },
  { q: 'Can I bring athletes I already coach?', a: 'Yes. Send them your link. They buy a pass on your page and their plan is ready in the app.' },
];

/** One feature row: copy on one side, the art on the other (`flip` swaps them on wide screens). */
function Feature({ tag, title, body, facts, flip = false, artClass = '', children }) {
  return (
    <div className={flip ? 'feature flip' : 'feature'}>
      <Reveal className="feature-copy">
        <span className="tag">{tag}</span>
        <Display as="h2" size="l">{title}</Display>
        <p>{body}</p>
        <ul className="facts">{facts.map((f) => <li key={f}>{f}</li>)}</ul>
      </Reveal>
      <Reveal className={artClass ? `feature-art ${artClass}` : 'feature-art'}>{children}</Reveal>
    </div>
  );
}

/** The fee receipt beside the Earnings phone: its figures carry cents, as a receipt does (the design's `$120.00`). */
function Receipt() {
  const cents = { cents: true };
  return (
    <div className="receipt" aria-label={`Example: a ${usd(SAMPLE_PASS_PRICE)} pass on the free plan`}>
      <div className="r-row"><span>Athlete pays</span><span>{usd(SAMPLE_PASS_PRICE, cents)}</span></div>
      <div className="r-row"><span>{BRAND_NAME} fee · {STANDARD_FEE_PERCENT}%</span><span>−{usd(sampleFee, cents)}</span></div>
      <div className="r-row r-total"><span>You get</span><span className="num">{usd(sampleKeep, cents)}</span></div>
      <div className="r-elite">On Coach Elite the fee is {ELITE_FEE_PERCENT}%, so you’d get {usd(sampleEliteKeep, cents)}.</div>
    </div>
  );
}

export default function Home() {
  usePageMeta(null, null);
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="hero-copy">
            <Kicker>For independent coaches</Kicker>
            <Display as="h1">
              Coach people.<br /><span className="violet">Get paid</span><br />for it<span className="dot v" aria-hidden="true" />
            </Display>
            <p className="lede">{BRAND_NAME} runs the business side of coaching. One link sells your passes, one screen shows who needs you on Monday, and Stripe pays you out to your bank.</p>
            <div className="hero-actions">
              <a className="btn btn-primary" href={APP_STORE_URL}>Get {BRAND_NAME} for iPhone</a>
              <LinkArrow to="/pricing">See pricing</LinkArrow>
            </div>
            <p className="hero-note">Free to start. {BRAND_NAME} only earns when an athlete pays you: {STANDARD_FEE_PERCENT}% of the pass, and Stripe’s card fees come out of our share, not yours.</p>
          </div>
          <div className="hero-art" role="img" aria-label={`The ${BRAND_NAME} app`}>
            <Phone name="coach-page" alt={`A coach’s ${BRAND_NAME} page with two passes and a Book button`} className="back" eager />
            <Phone name="coach-today" alt="The coach’s Today screen: athletes who need a reply, today’s sessions and this week’s earnings" className="front" eager />
            <div className="link-chip" aria-hidden="true">
              <div className="lc-text"><span>Your link</span><span>{SITE_HOST}/c/dana-okafor</span></div>
              <span className="lc-tag">Live</span>
            </div>
          </div>
        </div>
      </section>

      <section className="on-deep pad">
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>How it works</Kicker>
            <Display as="h2" size="l">From link to first payout.</Display>
          </Reveal>
          <Steps items={STEPS} />
        </div>
      </section>

      <section className="pad">
        <div className="wrap">
          <Feature
            tag="Your page"
            title="One link does the selling."
            body="Your page lists your passes, what each one includes and the price. Athletes pay by card in any browser, with no download first, and their plan is waiting when they open the app."
            facts={[
              'Monthly or yearly passes, or a season with a set number of payments',
              'Card checkout by Stripe, on the web or in the app',
              'Nobody joins your roster without buying, asking or accepting your link',
            ]}
          >
            <Phone name="coach-page" alt={`A coach’s ${BRAND_NAME} page with passes and prices`} />
          </Feature>
          <Feature
            tag="Inbox"
            title="Monday, handled."
            body="Check-ins and messages land in one inbox, sorted by who needs you. Today shows who owes a reply, who’s slipping and who just hit a PR. If it isn’t something to do, it isn’t on the screen."
            facts={[
              'Weekly check-ins: effort, anything that hurt, the session that stood out',
              'Photos and videos in one thread per athlete',
              'Drafts waiting for you are marked',
            ]}
            flip
            artClass="soft"
          >
            <Phone name="coach-inbox" alt="The coach’s inbox, with drafts ready to review" />
          </Feature>
          <Feature
            tag="Coach Elite"
            title="Your assistant drafts. You send."
            body="It reads the athlete’s check-in and their logged sets and drafts a reply in your voice. Nothing reaches an athlete until you approve it, and every athlete is told you use one."
            facts={[
              'You edit, approve and send every message',
              'Turn it on or off whenever you like',
              'Included with Coach Elite and Founding',
            ]}
            artClass="deep"
          >
            <Phone name="coach-assistant" alt="A chat with an athlete and a reply drafted by the assistant, waiting for the coach" />
          </Feature>
          <Feature
            tag="Programs"
            title="Build the block in an evening."
            body="Drop exercises onto days, set the sets and loads, add a cue. Publish when it’s right, on your phone or in the season editor on the web."
            facts={[
              'A week an athlete has started stays protected',
              'Tell athletes what changed when you publish',
              'Form guides for the lifts you program',
            ]}
            flip
          >
            <Phone name="coach-program" alt="The program builder showing a Wednesday lower-body day" />
          </Feature>
          <Feature
            tag="Money"
            title="Money that’s boring, on purpose."
            body="Athletes pay the price you set. The fee is on every line before you publish a pass, so a payout never surprises you."
            facts={[
              'Payouts by Stripe, straight to your bank',
              `Card processing comes out of ${BRAND_NAME}’s fee`,
              'Every payment, fee and payout in Earnings',
            ]}
            artClass="soft with-receipt"
          >
            <Phone name="coach-earnings" alt="Earnings: available balance, next payout and fees by month" />
            <Receipt />
          </Feature>
        </div>
      </section>

      <section className="on-deep pad">
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>For your athletes</Kicker>
            <Display as="h2" size="l">An app worth paying for.</Display>
            <p className="lede">Your plan, your cues and a coach who answers, in an app built for the gym floor.</p>
          </Reveal>
          {/* Hand-written "reveal" so the region's role, label and tab stop are certain to land on the element. */}
          <div className="screens-row reveal" role="region" aria-label="Athlete app screens, scroll sideways" tabIndex={0}>
            <figure>
              <Phone name="athlete-today" alt="The athlete’s Today screen with the next session and a check-in" />
              <figcaption><b>Today, one tap away</b>The week, the day and what’s next from you.</figcaption>
            </figure>
            <figure>
              <Phone name="athlete-workout" alt="Logging sets during a box squat with a rest timer running" />
              <figcaption><b>Logging that keeps up</b>A rest timer that keeps time with the phone in a pocket.</figcaption>
            </figure>
            <figure>
              <Phone name="athlete-form-guide" alt="A form guide for the box squat with steps and what to watch for" />
              <figcaption><b>Form guides for the lifts</b>Steps, what to watch for, and your own demo.</figcaption>
            </figure>
            <figure>
              <Phone name="athlete-done" alt="Workout done: time, pounds lifted, sets and a new best" />
              <figcaption><b>Progress they can feel</b>Real numbers after every session, not a dashboard.</figcaption>
            </figure>
          </div>
          <LinkArrow to="/athletes">What athletes see</LinkArrow>
        </div>
      </section>

      <section className="on-paper pad">
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>Trust</Kicker>
            <Display as="h2" size="l">Built so athletes trust you more, not less.</Display>
          </Reveal>
          <Reveal as="ol" className="trust">
            <li><div><h3>You approve every message</h3><p>The assistant drafts. Athletes are told you use one, and every word is still sent by you.</p></div></li>
            <li><div><h3>Payments by Stripe</h3><p>{BRAND_NAME} never stores card or bank numbers. Stripe checks your identity and pays you out.</p></div></li>
            <li><div><h3>Nobody is added without asking</h3><p>An athlete joins your roster by accepting your link, sending you a request or buying your pass. Never by being added.</p></div></li>
            <li><div><h3>Their data is theirs</h3><p>Every athlete can export their training and delete their account any time, and so can you.</p></div></li>
          </Reveal>
        </div>
      </section>

      <section className="pad">
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>Pricing</Kicker>
            <Display as="h2" size="l">Free to start.</Display>
            <p className="lede">No monthly bill until it’s worth it. {BRAND_NAME} takes a share of the passes you sell, and athletes pay exactly the price you set.</p>
          </Reveal>
          <Reveal><PlansShort /></Reveal>
          <p style={{ marginTop: 24 }}><LinkArrow to="/pricing">Full pricing and calculator</LinkArrow></p>
        </div>
      </section>

      <section className="on-paper pad">
        <div className="wrap faq-grid">
          <div className="section-head reveal" style={{ margin: 0 }}>
            <Kicker>Questions</Kicker>
            <Display as="h2" size="l">Questions coaches ask.</Display>
            <LinkArrow to="/support">More in Help</LinkArrow>
          </div>
          <Reveal><Faq items={FAQ} /></Reveal>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
