// /athletes (the design's athletes.html): for the person who got a coach's
// link. Hero, the four steps, the gym-floor feature, the athlete questions and
// the final call. Every answer is what the shipped app does today (iPhone only,
// card checkout by Stripe, Apple Health only by choice, the coach reads and
// sends every message). How to sign in comes from siteCopy() (appleAuth.js):
// with Apple too when this build offers it on the website. The brand and the
// mailbox come from brand.js; the shared pieces from Pieces.jsx.
import Faq from './Faq';
import { Display, FinalCta, Kicker, LinkArrow, Phone, Reveal, Steps } from './Pieces';
import { usePageMeta } from './meta';
import { siteCopy } from '../appleAuth';
import { APPLE_WEB_ENABLED } from '../authConfig';
import { APP_STORE_URL, BRAND_NAME, SUPPORT_EMAIL } from './brand';

const copy = siteCopy(APPLE_WEB_ENABLED);

const STEPS = [
  { n: '01', title: 'Open your coach’s link', body: 'It shows their passes and prices, and for a season, how many payments it takes.' },
  { n: '02', title: 'Pay on the web', body: copy.athletesStep2 },
  { n: '03', title: 'Get the app', body: copy.athletesStep3 },
  { n: '04', title: 'Train and check in', body: 'Log your sets, say how it felt, and your coach adjusts.' },
];

const FAQ = [
  { q: 'How do I cancel?', a: 'In the app: Profile, then Manage pass. Cancelling stops the next payment. You keep your coach’s plan until the end of what you’ve paid for; after that it is no longer part of your pass. Your logged sets, check-ins and messages stay. A season stops billing by itself after its last payment, so there is nothing to cancel when it ends.' },
  { q: 'What happens when my season ends?', a: 'A season is billed a set number of payments, shown before you pay, and then nothing more is charged. When the period the last payment covered ends, the season is complete: you keep your copy of it and everything you logged, and you stay with your coach. Open your coach’s link to start another season with them.' },
  { q: 'What does my coach see?', a: `Your plan, the sets you log, your check-ins, your messages and anything you send in the chat. Apple Health is optional and off by default: if you turn it on in the app, ${BRAND_NAME} can save finished workouts to Apple Health and read resting heart rate and sleep, and your coach sees those two numbers only if you also turn on sharing.` },
  { q: 'Is my coach’s reply written by AI?', a: 'Coaches can use an assistant that drafts a reply from your check-in and your log. Your coach reads, edits and sends every message; nothing is sent on its own.' },
  { q: 'Can I get a refund?', a: 'Ask your coach. Refunds are at the coach’s discretion and are issued through the app, back to the card you paid with. If a coach closes their account, time you prepaid and have not had is refunded automatically. If you switch coaches or delete your account, your pass ends that day and time already paid isn’t refunded, so ask your coach before you switch.' },
  { q: 'My payment failed. What now?', a: 'Your pass is on hold until a payment goes through; your coach can see that. Stripe emails you a link to update the card.' },
  { q: 'I have an Android phone.', a: `${BRAND_NAME} is an iPhone app today and there is no Android app. Buying a pass works in any browser, but training needs the iPhone app, so check with your coach before you pay.` },
  { q: 'I paid but can’t see my plan.', a: (<p>{copy.athletesPaidNoPlanLead} Your first week comes from your coach, and Today says so while it is still on its way. Still stuck? <a href={`mailto:${SUPPORT_EMAIL}`}>Write to us</a> and include your receipt.</p>) },
];

export default function Athletes() {
  usePageMeta('For athletes', `Got a link from your coach? Pay on the web, get the iPhone app, and your coach’s plan is waiting. Here’s how ${BRAND_NAME} works for athletes.`);
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="hero-copy">
            <Kicker>For athletes</Kicker>
            {/* The design sizes this headline below the hero's default (it is one line longer). */}
            <h1 className="display" style={{ fontSize: 'clamp(56px, 7.6vw, 112px)' }}>Got a link from your <span className="violet">coach?</span></h1>
            <p className="lede">You’re in the right place. {BRAND_NAME} is where your coach’s plan, your sessions and your messages live.</p>
            <div className="hero-actions">
              <a className="btn btn-primary" href={APP_STORE_URL}>Get {BRAND_NAME} for iPhone</a>
              <LinkArrow href="#questions">Athlete questions</LinkArrow>
            </div>
            <p className="hero-note">No link yet? Ask your coach for theirs. {BRAND_NAME} doesn’t list or match coaches.</p>
          </div>
          <div className="hero-art" role="img" aria-label={`The ${BRAND_NAME} app for athletes`}>
            <Phone name="athlete-workout" alt="Logging a box squat with the rest timer running" className="back" eager />
            <Phone name="athlete-today" alt="The athlete’s Today screen with the next session" className="front" eager />
          </div>
        </div>
      </section>

      <section className="on-deep pad">
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>How it works</Kicker>
            <Display as="h2" size="l">Four steps, no surprises.</Display>
          </Reveal>
          <Steps items={STEPS} />
        </div>
      </section>

      <section className="pad">
        <div className="wrap">
          <div className="feature">
            <Reveal className="feature-copy">
              <span className="tag">In the gym</span>
              <Display as="h2" size="l">Built for the gym floor.</Display>
              <p>Today’s session opens in one tap. Every lift has a form guide, and the rest timer keeps going with your phone locked in a pocket.</p>
              <ul className="facts">
                <li>Works offline: sets are saved and sent when you’re back</li>
                <li>A weekly check-in your coach actually reads</li>
                <li>Apple Health is optional and off by default</li>
              </ul>
            </Reveal>
            <Reveal className="feature-art soft">
              <Phone name="athlete-form-guide" alt="A form guide for the box squat" />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="on-paper pad" id="questions">
        <div className="wrap faq-grid">
          <div className="section-head" style={{ margin: 0 }}>
            <Kicker>Questions</Kicker>
            <Display as="h2" size="l">Athlete questions.</Display>
            <LinkArrow to="/support">More in Help</LinkArrow>
            <LinkArrow to="/">Are you a coach?</LinkArrow>
          </div>
          <div><Faq items={FAQ} /></div>
        </div>
      </section>

      <FinalCta title="Ready to train?" note="iPhone only for now. Buying a pass works in any browser." art="athlete-done" alt="Workout done screen" />
    </>
  );
}
