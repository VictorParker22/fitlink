// /athletes (Web-Athletes): for the person who got a coach's link. Four
// steps, the "no link yet" callout, the athlete questions. Every answer is
// what the shipped app does today (iPhone only, card checkout by Stripe, no
// Apple Health only by choice, the coach reads and sends every message).
// How to sign in comes from siteCopy() (appleAuth.js): with Apple too when
// this build offers it on the website.
import { Link } from 'react-router-dom';
import Faq from './Faq';
import { usePageMeta } from './meta';
import { pageMetaFor } from './pageMeta';
import { siteCopy } from '../appleAuth';
import { APPLE_WEB_ENABLED } from '../authConfig';
import { BRAND_NAME, SUPPORT_EMAIL } from './brand';
import { APP_STORE_LIVE } from './flags';
import AppStoreLink from './AppStoreLink';

const copy = siteCopy(APPLE_WEB_ENABLED);

function PlanScreen() {
  return (
    <div className="s-screen" aria-hidden="true">
      <span className="notch" />
      <span className="greet">This week</span>
      <span className="sub">Week 3 of 8</span>
      <div className="mini-card">
        <div className="mini-row"><span className="mini-avatar">M</span><span>Lower body</span><span className="mini-pill">Done · 52 min</span></div>
        <div className="mini-row"><span className="mini-avatar">W</span><span>Upper body</span><span className="mini-pill accent">Today</span></div>
        <div className="mini-row"><span className="mini-avatar">F</span><span>Full body</span><span className="mini-pill">Fri</span></div>
        <div className="mini-row"><span className="mini-avatar">S</span><span>Check-in</span><span className="mini-pill">Sun</span></div>
      </div>
      <div className="mini-card ink">
        <span className="sub">Next</span>
        <b>Upper body · 5 exercises</b>
        <span className="mini-btn">Open today’s session</span>
      </div>
      <div className="mini-tabs"><span>Today</span><span className="on">Plan</span><span>Coach</span><span>Progress</span></div>
    </div>
  );
}

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
  const meta = pageMetaFor('/athletes');
  usePageMeta(meta.title, meta.description);
  return (
    <>
      <section className="s-wrap s-hero" aria-labelledby="a-h" style={{ paddingBottom: 72 }}>
        <div className="s-hero-copy" style={{ gap: 20 }}>
          <span className="s-kicker">For athletes</span>
          <h1 id="a-h" className="s-h1 md">Got a link from your coach? You’re in the right place.</h1>
          <p className="s-lede" style={{ maxWidth: '38ch' }}>{BRAND_NAME} is where your coach’s plan, your sessions and your messages live. Here’s how it works.</p>
        </div>
        <div className="s-center-art" role="img" aria-label="Athlete Plan screen on iPhone">
          <div className="s-phone" aria-hidden="true"><PlanScreen /></div>
        </div>
      </section>

      <section className="s-wrap s-section" aria-labelledby="as-h" style={{ paddingBottom: 72 }}>
        <div className="s-stack" style={{ gap: 28 }}>
          <h2 id="as-h" className="s-h2 sm">Four steps, no surprises</h2>
          <ol className="s-steps">
            <li className="s-step"><span className="s-num">1</span><b>Open your coach’s link</b><span>It shows their passes and prices, and for a season how many payments it takes.</span></li>
            <li className="s-step"><span className="s-num">2</span><b>Pay on the web</b><span>{copy.athletesStep2}</span></li>
            <li className="s-step"><span className="s-num">3</span><b>Open the app</b><span>{copy.athletesStep3}</span></li>
            <li className="s-step"><span className="s-num">4</span><b>Train and check in</b><span>Log your sets, say how it felt, and your coach adjusts.</span></li>
          </ol>
          <div className="s-callout">
            <span className="s-stack" style={{ gap: 4 }}><b>No link yet?</b><span>Ask your coach for theirs. {BRAND_NAME} doesn’t list or match coaches.</span></span>
            <Link to="/">Are you a coach?</Link>
          </div>
        </div>
      </section>

      <section className="s-wrap narrow s-section" aria-labelledby="afaq-h">
        <div className="s-stack" style={{ gap: 20 }}>
          <h2 id="afaq-h" className="s-h2 sm">Athlete questions</h2>
          <Faq items={FAQ} labelledBy="afaq-h" />
          {APP_STORE_LIVE && <p className="s-small">Ready to train? <AppStoreLink>{`Get ${BRAND_NAME} for iPhone`}</AppStoreLink>.</p>}
        </div>
      </section>
    </>
  );
}
