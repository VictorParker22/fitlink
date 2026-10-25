// / — the home page for coaches (Web-Home; Web-Home-Mobile is the same page
// at 390 px). Every number on the page comes from pricing.js; the phone and
// card illustrations are decoration (aria-hidden) and show the product's
// shape, not anyone's data. Quotes stay dashed placeholders until a real coach
// gives one.
import { Link } from 'react-router-dom';
import Faq from './Faq';
import { usePageMeta } from './meta';
import { APP_STORE_URL, ELITE_FEE_PERCENT, ELITE_MONTHLY_USD, FREE_ROSTER_CAP, STANDARD_FEE_PERCENT, usd } from './pricing';
import { siteCopy } from '../appleAuth';
import { APPLE_WEB_ENABLED } from '../authConfig';


const Check = () => (
  <svg className="s-check" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" style={{ fill: 'none', stroke: '#F59A6B', strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
  </svg>
);

/** The money illustration: six passes at $245, the standard fee from pricing.js. */
const SAMPLE_PASSES = 6;
const SAMPLE_PASS_PRICE = 245;
const sampleGross = SAMPLE_PASSES * SAMPLE_PASS_PRICE;
const sampleFee = sampleGross * STANDARD_FEE_PERCENT / 100;
const samplePayout = sampleGross - sampleFee;

function CoachHomeScreen() {
  return (
    <div className="s-screen" aria-hidden="true">
      <span className="notch" />
      <span className="greet">Monday</span>
      <span className="sub">3 things need you</span>
      <div className="mini-card">
        <div className="mini-row"><span className="mini-avatar">MH</span><span>Marcus</span><span className="mini-pill accent">Draft ready</span></div>
        <div className="mini-row"><span className="mini-avatar">TA</span><span>Tess</span><span className="mini-pill warn">Missed 2</span></div>
        <div className="mini-row"><span className="mini-avatar">JK</span><span>Jonah</span><span className="mini-pill">Checked in</span></div>
      </div>
      <div className="mini-card ink">
        <span className="sub">This month</span>
        <span className="mini-big">{usd(samplePayout)}</span>
        <span className="sub">{SAMPLE_PASSES} passes · fee on every line</span>
      </div>
      <div className="mini-tabs"><span className="on">Home</span><span>Athletes</span><span>Seasons</span><span>Money</span></div>
    </div>
  );
}

function AthleteTodayScreen() {
  return (
    <div className="s-screen dark" aria-hidden="true">
      <span className="notch" />
      <span className="greet">Today</span>
      <span className="sub">Week 3 · Lower</span>
      <div className="mini-card ink" style={{ background: '#1B1E24' }}>
        <b>Lower body</b>
        <div className="mini-ex"><span>Back squat</span><small>4 × 5</small></div>
        <div className="mini-ex"><span>Romanian deadlift</span><small>3 × 8</small></div>
        <div className="mini-ex"><span>Split squat</span><small>3 × 10</small></div>
        <span className="mini-btn">Start session</span>
      </div>
      <div className="mini-card ink" style={{ background: '#1B1E24' }}>
        <span className="sub">From your coach</span>
        <span style={{ fontFamily: 'var(--fl-serif)', fontSize: 14, lineHeight: 1.35 }}>“Sit back into the box. Tight, not sharp.”</span>
      </div>
      <div className="mini-tabs"><span className="on">Today</span><span>Plan</span><span>Coach</span><span>Progress</span></div>
    </div>
  );
}

const FAQ = [
  { q: 'Do my athletes need the app to pay?', a: siteCopy(APPLE_WEB_ENABLED).homeNeedAppA },
  { q: 'Does FitLink work on Android?', a: 'FitLink is an iPhone app today. There is no Android app, so an athlete needs an iPhone to train with you.' },
  { q: 'How do payouts work?', a: 'Payments run on Stripe. You connect a bank once, inside the app, and Stripe sends your payouts to it. Athletes can’t buy a pass until Stripe says your account can take charges.' },
  { q: 'Does the AI message my athletes?', a: 'Never on its own. With Coach Elite it drafts a reply from the check-in and the logged sets; you edit, approve and send.' },
  { q: 'Can I bring athletes I already coach?', a: 'Yes. Send them your link. They buy a pass on your page and their plan is ready in the app. Nobody lands on your roster without accepting your link, sending you a request, or buying your pass.' },
];

export default function Home() {
  usePageMeta(null, null);
  return (
    <>
      <section className="s-wrap s-hero" aria-labelledby="hero-h">
        <div className="s-hero-copy">
          <span className="s-kicker">For independent coaches</span>
          <h1 id="hero-h" className="s-h1">Run your coaching business from one app.</h1>
          <p className="s-lede narrow">Your athletes pay, train and check in on FitLink. You open it on Monday and see exactly who needs you. Nothing else.</p>
          <div className="s-actions">
            <a className="fl-btn accent lg" href={APP_STORE_URL}>Get FitLink for iPhone</a>
            <Link className="fl-btn lg" to="/pricing">See pricing</Link>
          </div>
          <span className="s-fine">Free to start. FitLink only earns when your athletes pay you.</span>
        </div>
        <div className="s-hero-art" role="img" aria-label="FitLink coach Home on iPhone, with a drafted reply and this month’s payout">
          <div className="s-phone" aria-hidden="true"><CoachHomeScreen /></div>
          <div className="s-float ink" aria-hidden="true">
            <small>This month · {SAMPLE_PASSES} passes</small>
            <b>{usd(samplePayout)}</b>
          </div>
          <div className="s-float glass" aria-hidden="true">
            <small>Draft for Marcus · not sent</small>
            <q>Good call flagging it. Thursday is box squats now…</q>
            <span className="s-pill solid">Approve &amp; send</span>
          </div>
        </div>
      </section>

      <section className="s-wrap s-features" aria-labelledby="monday-h">
        <div className="s-features-head">
          <h2 id="monday-h" className="s-h2">Monday, handled.</h2>
          <p>Most coaching software gives you a dashboard. FitLink gives you a to-do list that empties.</p>
        </div>

        <div className="s-feature">
          <div className="s-feature-copy">
            <span className="s-kicker sm">Home</span>
            <h3 className="s-h3">One screen. Only actions.</h3>
            <p className="s-body">Who owes a reply, who’s slipping, who checked in. If it isn’t something to do, it isn’t on Home.</p>
          </div>
          <div className="s-panel" aria-hidden="true">
            <div className="s-card">
              <span className="title">3 things need you</span>
              <div className="s-row"><span className="s-avatar">MH</span><span className="name">Marcus H.</span><span className="s-pill accent">Draft ready</span></div>
              <div className="s-row"><span className="s-avatar">TA</span><span className="name">Tess A.</span><span className="s-pill warn">Missed 2</span></div>
              <div className="s-row"><span className="s-avatar">JK</span><span className="name">Jonah K.</span><span className="s-pill">Checked in</span></div>
            </div>
          </div>
        </div>

        <div className="s-feature flip">
          <div className="s-panel" aria-hidden="true">
            <div className="s-draft">
              <small>Draft in your voice · not sent</small>
              <q>Good call flagging it, Marcus. Tight-not-sharp usually means we back off the load, not stop. Thursday is box squats now.</q>
            </div>
            <div className="s-glass-pill"><span>Edit</span><span className="accent">Approve &amp; send</span></div>
          </div>
          <div className="s-feature-copy">
            <span className="s-kicker sm">Assistant · Coach Elite</span>
            <h3 className="s-h3">Your assistant drafts. You send.</h3>
            <p className="s-body">It reads the check-in and the logged sets and drafts a reply in your voice. Nothing reaches an athlete until you approve it, and every athlete is told you use one.</p>
          </div>
        </div>

        <div className="s-feature">
          <div className="s-feature-copy">
            <span className="s-kicker sm">Seasons</span>
            <h3 className="s-h3">Build a season in an evening.</h3>
            <p className="s-body">Weeks down, days across. Drop workouts onto days, mark check-ins and rest, publish when it’s right. On your phone or on the web.</p>
          </div>
          <div className="s-panel" aria-hidden="true">
            <div className="s-grid7">
              <span /><span className="d">M</span><span className="d">T</span><span className="d">W</span><span className="d">T</span><span className="d">F</span><span className="d">S</span><span className="d">S</span>
              <span className="w">W1</span><span className="s-cell" /><span className="s-cell" /><span className="s-cell rest" /><span className="s-cell" /><span className="s-cell" /><span className="s-cell rest" /><span className="s-cell checkin" />
              <span className="w">W2</span><span className="s-cell" /><span className="s-cell" /><span className="s-cell rest" /><span className="s-cell" /><span className="s-cell" /><span className="s-cell rest" /><span className="s-cell checkin" />
              <span className="w">W3</span><span className="s-cell" /><span className="s-cell" /><span className="s-cell rest" /><span className="s-cell picked" /><span className="s-cell" /><span className="s-cell rest" /><span className="s-cell checkin" />
              <span className="w">W4</span><span className="s-cell empty" /><span className="s-cell empty" /><span className="s-cell empty" /><span className="s-cell empty" /><span className="s-cell empty" /><span className="s-cell empty" /><span className="s-cell empty" />
            </div>
          </div>
        </div>

        <div className="s-feature flip">
          <div className="s-panel" aria-hidden="true">
            <div className="s-money">
              <small>This month</small>
              <span className="big">{usd(samplePayout)}</span>
              <span className="line first"><span>{SAMPLE_PASSES} passes sold</span><span>{usd(sampleGross)}</span></span>
              <span className="line"><span>FitLink fee · {STANDARD_FEE_PERCENT}%</span><span>−{usd(sampleFee)}</span></span>
            </div>
          </div>
          <div className="s-feature-copy">
            <span className="s-kicker sm">Money</span>
            <h3 className="s-h3">Money that’s boring, on purpose.</h3>
            <p className="s-body">Athletes pay on your page. Stripe pays you out to your bank. The fee is on every line, so a payout never surprises you.</p>
          </div>
        </div>
      </section>

      <section className="s-dark" aria-labelledby="ath-h">
        <div className="s-wrap">
          <div className="s-dark-copy">
            <h2 id="ath-h" className="s-h2">Give your athletes an app worth paying for.</h2>
            <ul className="s-checks">
              <li><Check />Today’s session, one tap away.</li>
              <li><Check />A rest timer that keeps time with the phone in a pocket, and taps them when rest is over.</li>
              <li><Check />Your notes, in your voice, where they train.</li>
              <li><Check />Progress they can feel: real numbers, not dashboards.</li>
            </ul>
            <Link className="fl-btn link salmon" to="/athletes">What your athletes see</Link>
          </div>
          <div className="s-center-art" role="img" aria-label="FitLink athlete Today screen on iPhone">
            <div className="s-phone black" aria-hidden="true"><AthleteTodayScreen /></div>
          </div>
        </div>
      </section>

      <section className="s-wrap s-section top" aria-labelledby="steps-h">
        <div className="s-stack" style={{ gap: 36 }}>
          <h2 id="steps-h" className="s-h2">From link to first payout.</h2>
          <ol className="s-steps">
            <li className="s-step"><span className="s-num">1</span><b>Set up your page</b><span>Your name, a photo, a line about how you coach, and your first pass.</span></li>
            <li className="s-step"><span className="s-num">2</span><b>Share one link</b><span>Text it, post it, or put it on the gym wall. It opens on any phone.</span></li>
            <li className="s-step"><span className="s-num">3</span><b>Athletes pay on the web</b><span>No download before they buy. Their plan is waiting when they open the app.</span></li>
            <li className="s-step"><span className="s-num">4</span><b>Get paid</b><span>Stripe sends the money to your bank. You see every fee before it lands.</span></li>
          </ol>
        </div>
      </section>

      <section className="s-wrap s-section" aria-labelledby="trust-h">
        <div className="s-stack" style={{ gap: 32 }}>
          <h2 id="trust-h" className="s-h2 sm">Built so your athletes trust you more, not less.</h2>
          <div className="s-trust">
            <div><b>You approve every message</b><span>The assistant drafts. Athletes are told you use one, and every word is still sent by you.</span></div>
            <div><b>Payments by Stripe</b><span>FitLink never stores card or bank numbers.</span></div>
            <div><b>Nobody is added without asking</b><span>An athlete joins your roster by accepting your link, sending you a request or buying your pass. Never by being added.</span></div>
            <div><b>Their data is theirs</b><span>Every athlete can export their training and delete their account any time, and so can you.</span></div>
          </div>
        </div>
      </section>

      <section className="s-wrap s-section" aria-labelledby="proof-h">
        <div className="s-stack" style={{ gap: 20 }}>
          <h2 id="proof-h" className="s-eyebrow">From coaches using FitLink</h2>
          <div className="s-proof">
            <figure><blockquote>[Quote from a beta coach, used with permission]</blockquote><figcaption>[Name · what they coach · athletes on FitLink]</figcaption></figure>
            <figure><blockquote>[Quote from a beta coach, used with permission]</blockquote><figcaption>[Name · what they coach · athletes on FitLink]</figcaption></figure>
          </div>
        </div>
      </section>

      <section className="s-wrap s-section" aria-labelledby="price-h">
        <div className="s-stack" style={{ gap: 28 }}>
          <div className="s-split-head">
            <h2 id="price-h" className="s-h2 sm">Free to try.</h2>
            <Link className="fl-btn link" to="/pricing">Full pricing and calculator</Link>
          </div>
          <div className="s-plans">
            <div className="s-plan">
              <h3>Free</h3>
              <span className="s-price"><b>$0</b><span>a month · {STANDARD_FEE_PERCENT}% per pass sold</span></span>
              <p>Everything you need to sell passes, coach and get paid, for up to {FREE_ROSTER_CAP} paying athletes.</p>
            </div>
            <div className="s-plan ink">
              <h3>Elite</h3>
              <span className="s-price"><b>{usd(ELITE_MONTHLY_USD)}</b><span>a month · {ELITE_FEE_PERCENT}% per pass sold</span></span>
              <p>No athlete cap, the assistant’s drafts, and half the fee on every pass. Subscribe on the web.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="s-wrap s-section" aria-labelledby="faq-h">
        <div className="s-wrap narrow" style={{ padding: 0 }}>
          <div className="s-stack" style={{ gap: 20 }}>
            <h2 id="faq-h" className="s-h2 sm">Questions coaches ask</h2>
            <Faq items={FAQ} labelledBy="faq-h" />
          </div>
        </div>
      </section>

      <section id="download" className="s-download" aria-labelledby="dl-h">
        <div>
          <div className="copy">
            <h2 id="dl-h">Your next athlete is one link away.</h2>
            <a className="s-store" href={APP_STORE_URL}>
              <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.3 1.2 9.7.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8 2.2-1.2 3-2.4c.9-1.4 1.3-2.7 1.3-2.8 0 0-2.6-1-2.6-3.8ZM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.6 2.8-1.4Z" /></svg>
              <span><small>Download on the</small><b>App Store</b></span>
            </a>
          </div>
          <span className="aside">On a computer? Open fitlink.coach on your iPhone and tap Get the app.</span>
        </div>
      </section>
    </>
  );
}
