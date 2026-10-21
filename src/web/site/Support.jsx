// /support (Web-Support): the help centre. The search filters the questions
// on this page; the topic cards jump to a group; the contact form composes an
// email to the support mailbox (there is no ticket backend). Every answer is
// true for the shipped product: coach-led passes, invites, Stripe payouts,
// Elite through Apple, refunds at the coach's discretion through the app, two
// modes on one account (coaching and training), and an athlete who switches
// coach or deletes their account ends the old pass that day with no refund
// (athlete-exit, operator decision 2026-10-17). A season is billed a fixed
// number of payments and then stops by itself; an open pass renews until it
// is cancelled; when billing ends, the coach's plan is no longer part of the
// pass and the history stays (season billing, owner decision 2026-10-17). The
// wording says what the pass includes, not that access is cut: the server
// still serves a season the athlete marked 'completed' after an early end.
// Sign in with Apple on the website when this build offers it
// (VITE_APPLE_WEB_SIGN_IN): the sign-in answers come from siteCopy() in
// appleAuth.js, so a build without it never mentions a button it lacks.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Faq from './Faq';
import { usePageMeta } from './meta';
import { ELITE_FEE_PERCENT, FREE_ROSTER_CAP, NEEDS_CONFIRM, STANDARD_FEE_PERCENT, SUPPORT_EMAIL } from './pricing';
import { siteCopy } from '../appleAuth';
import { APPLE_WEB_ENABLED } from '../authConfig';

const Confirm = () => (NEEDS_CONFIRM ? <sup className="s-confirm" title="Confirm against platform_config before launch">[confirm]</sup> : null);
const copy = siteCopy(APPLE_WEB_ENABLED);

const GROUPS = [
  {
    id: 'coach-payouts', audience: 'For coaches', title: 'Getting paid and Stripe',
    items: [
      { q: 'How do I get paid?', a: 'Connect payouts in the app (Profile, then Payouts). Stripe opens inside the app, asks for your identity and bank details, and tells FitLink when your account can take charges. Until then nobody can buy your pass. Stripe sends payouts to that bank.' },
      { q: 'What does FitLink take?', a: (<p>{STANDARD_FEE_PERCENT}%<Confirm /> of each pass payment, or {ELITE_FEE_PERCENT}%<Confirm /> while Coach Elite is active. Your athlete pays the price you set; that amount minus the FitLink fee goes to your Stripe balance. Stripe’s card processing fee comes out of FitLink’s share. See <Link to="/pricing">Pricing</Link>.</p>) },
      { q: 'Where do I see what I earned?', a: 'The Money tab lists every pass payment with the fee on it. The payout date and the bank it goes to live in Stripe; the app opens your Stripe account from Payouts.' },
      { q: 'Why does Payouts say “in progress” or “paused”?', a: 'Stripe still needs something from you (a document, a bank detail) or has paused payouts. Open Payouts in the app: it lists what is due and takes you to Stripe to finish it.' },
    ],
  },
  {
    id: 'coach-passes', audience: 'For coaches', title: 'Passes and prices',
    items: [
      { q: 'What kinds of pass can I sell?', a: 'An open pass that renews every month (or every year) until the athlete cancels, or a season of a fixed number of weeks. You set the price per month (or per year) in the app. A season charges that price for as many payments as its weeks take and then stops billing by itself: on a monthly price, a 4-week season is one payment, 8 weeks is two and 12 weeks is three. Athletes see the number of payments and the total before they pay. A price change never applies to a period an athlete has already paid for.' },
      { q: 'What happens when a season’s payments are done?', a: 'Nothing more is charged. The season ends when the period the last payment covered ends. The athlete keeps their copy of the season and everything they logged, stays on your roster, and is invited to start another season with you; edits you publish to the pass no longer reach them. Changing a season’s length changes the payments for athletes who buy it after the change.' },
      { q: 'How do athletes join?', a: 'Share your link: it opens your page with your passes, in any browser. Athletes buy there or in the app, or send you a request you accept. Nobody lands on your roster without doing one of those things.' },
      { q: 'Can I stop selling a pass?', a: 'Yes: Stop selling, from the pass’s menu. Athletes who hold it keep it; new athletes can’t buy it. Sell again brings it back.' },
      { q: 'Is there a limit on athletes?', a: `The free plan holds ${FREE_ROSTER_CAP} active athletes. Coach Elite has no cap.` },
      { q: 'Can I edit a season athletes are already in?', a: 'Yes, in the app or in the season editor on the web. A week an athlete has already started is protected; everything else publishes to everyone on the pass, and you can tell them what changed.' },
    ],
  },
  {
    id: 'coach-refunds', audience: 'For coaches', title: 'Refunds and cancellations',
    items: [
      { q: 'How do I refund an athlete?', a: 'From the athlete’s page in the app: Refund last payment. Choose the full amount or half of it, and whether their pass ends now or keeps running to the end of the period they paid for. You see the amount, the date and the pass before you confirm. The refund goes back to their card through Stripe and comes out of your balance; Stripe may keep its processing fee. Payments older than 90 days can’t be refunded this way.' },
      { q: 'Does a refund end the pass?', a: 'Only if you choose that. You can end the pass with the refund, or refund as a goodwill gesture and let the pass run to the end of the period they paid for. Either way the athlete stays on your roster with their history; removing them from the roster is a separate action.' },
      { q: 'An athlete disputed a charge with their bank.', a: 'Disputes run under Stripe’s and the card networks’ rules. While one is open the amount is held back from your payouts; if it closes in your favour the money is paid to you again.' },
      { q: 'How do athletes cancel?', a: 'From the app: Profile, then Manage pass. Cancelling stops the next payment; they keep training until the period they paid for ends, and you can see the end date. After that the pass’s plan is no longer part of what they paid for. They stay on your roster with their history and can buy a pass again.' },
      { q: 'What happens if I delete my account?', a: (<p>Every pass with you ends. Time your athletes prepaid and have not had is refunded to them automatically from your balance. They keep their accounts, logs and history and can join another coach. If you also train with another coach, that pass ends the same day; time you already paid for isn’t refunded. <Link to="/delete-account">Delete your account</Link> on the web or from Profile in the app.</p>) },
    ],
  },
  {
    id: 'coach-assistant', audience: 'For coaches', title: 'How the assistant works',
    items: [
      { q: 'What does the assistant do?', a: 'It reads an athlete’s check-in and their logged sets and drafts a reply in your voice. You edit, approve and send; nothing reaches an athlete on its own. It needs Coach Elite, and you agree to it in the app before the first draft.' },
      { q: 'Where does the text go?', a: 'The check-in text is sent to Google (Gemini) to produce the draft and for nothing else. The Privacy Policy says so, and athletes are told their coach may use an assistant.' },
      { q: 'How do I get Coach Elite?', a: 'In the app, under Profile. It is billed through your Apple Account and renews until you cancel it in your Apple subscriptions. Refunds for Elite are Apple’s.' },
    ],
  },
  {
    id: 'coach-account', audience: 'For coaches', title: 'Your account',
    items: [
      { q: 'How do I sign in?', a: copy.supportSignInA },
      { q: 'I signed up with Sign in with Apple and hid my email.', a: copy.supportHidEmailA },
      { q: 'Can I also train with a coach?', a: 'Yes. From Profile, a coach can turn on training and open another coach’s link or enter their code. The account then has two modes, Coaching and Training, each with its own Home, messages and notifications; your athletes never see your own training, and you cannot coach yourself.' },
      { q: 'How old do I have to be?', a: 'FitLink is for people aged 16 and over. We ask for your date of birth at sign-up.' },
    ],
  },
  {
    id: 'athlete-paying', audience: 'For athletes', title: 'Paying and cancelling',
    items: [
      { q: 'How do I buy a pass?', a: copy.supportBuyA },
      { q: 'How do I cancel?', a: 'In the app: Profile, then Manage pass. Cancelling stops the next payment. You keep your coach’s plan until the end of what you have paid for; after that it is no longer part of your pass. Your logged sets, check-ins and messages stay. A season stops billing by itself after its last payment, so there is nothing to cancel when it ends.' },
      { q: 'What happens when my season ends?', a: 'A season is billed a set number of payments, shown before you pay, and then nothing more is charged. When the period the last payment covered ends, the season is complete: you keep your copy of it and everything you logged, and you stay with your coach. Open your coach’s link to start another season with them.' },
      { q: 'Can I get a refund?', a: 'Ask your coach. Refunds are the coach’s call and are issued through the app, back to the card you paid with. Switching coaches or deleting your account ends your pass that day, and time already paid isn’t refunded, so ask your coach before you switch.' },
      { q: 'My payment failed.', a: 'Your pass is on hold until a payment goes through; your coach can see that. Stripe emails you a link to update the card.' },
      { q: 'Can I switch coaches?', a: 'Yes: open the new coach’s link and confirm. Before you do, you see which of your passes end. Your pass with your current coach ends that day: it stops billing and won’t renew, and any unpaid amount on it is forgiven. Time already paid isn’t refunded, so ask your coach before you switch. Your history with the previous coach stays in their records.' },
    ],
  },
  {
    id: 'athlete-plan', audience: 'For athletes', title: 'Finding your plan after paying',
    items: [
      { q: 'I paid but can’t see my plan.', a: `${copy.supportPaidNoPlanLead} Your first week is written by your coach; Today says it is on its way while they do. If it has been a while, message your coach in the app.` },
      { q: 'Do I need the app?', a: 'To train, yes. Buying works in any browser; the plan, the timer, check-ins and messages are in the iPhone app.' },
      { q: 'I have an Android phone.', a: 'FitLink is an iPhone app today; there is no Android app. Check with your coach before you pay.' },
    ],
  },
  {
    id: 'athlete-timer', audience: 'For athletes', title: 'The session and the rest timer',
    items: [
      { q: 'Does the rest timer keep going with the phone locked?', a: 'Yes. It runs on the clock, not on the app being open: lock the phone, put it in a pocket, and it still ends on time with a notification at the deadline.' },
      { q: 'I lost signal mid-session.', a: 'Keep logging. The app shows Offline, keeps your sets on the phone, and sends them when you are back.' },
      { q: 'What is a check-in?', a: 'Once a week the app asks how it went: effort, whether anything hurt, which session stood out. Your coach reads it where they reply to you.' },
    ],
  },
  {
    id: 'athlete-privacy', audience: 'For athletes', title: 'Privacy and your account',
    items: [
      { q: 'What does my coach see?', a: 'Your plan, the sets you log, your check-ins, your messages and what you send in the chat. Apple Health is optional and off by default: if you turn it on, FitLink can save finished workouts to Apple Health and read resting heart rate and sleep, and your coach sees those two numbers only if you also turn on sharing.' },
      { q: 'Is my coach’s reply written by AI?', a: 'Coaches can use an assistant that drafts a reply. Your coach reads, edits and sends every message.' },
      { q: 'How do I delete my account?', a: (<p>From Profile in the app, or <Link to="/delete-account">on the web</Link>. You see which passes end before you confirm. Any pass you hold ends that day and stops billing; time already paid isn’t refunded. It is immediate and cannot be undone; payment records are kept where the law requires it.</p>) },
    ],
  },
];

function matches(item, needle) {
  if (!needle) return true;
  const text = `${item.q} ${typeof item.a === 'string' ? item.a : ''}`.toLowerCase();
  return needle.split(/\s+/).filter(Boolean).every((w) => text.includes(w));
}

export default function Support() {
  usePageMeta('Help', 'Answers for coaches and athletes on FitLink: payouts and Stripe, passes, refunds, the assistant, paying and cancelling, finding your plan. Or write to us.');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('Coach');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const needle = query.trim().toLowerCase();

  const visible = useMemo(() => GROUPS
    .map((g) => ({ ...g, items: g.items.filter((it) => matches(it, needle)) }))
    .filter((g) => g.items.length > 0), [needle]);
  const total = visible.reduce((n, g) => n + g.items.length, 0);

  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`FitLink help · ${role}`)}&body=${encodeURIComponent(`${message}\n\n— ${email || 'my email'}`)}`;

  return (
    <div className="s-wrap s-help">
      <section className="s-help-head" aria-labelledby="h-h">
        <h1 id="h-h" className="s-h1 md">How can we help?</h1>
        <div className="s-search">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2 }} /><path d="M15.5 15.5L20 20" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' }} /></svg>
          <label htmlFor="hs" className="s-visually-hidden">Search help</label>
          <input id="hs" type="search" placeholder="Search: payouts, cancel a pass, refunds…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {needle && <p className="s-small" aria-live="polite">{total === 0 ? 'Nothing matches. Write to us below.' : `${total} ${total === 1 ? 'answer' : 'answers'}`}</p>}
      </section>

      {!needle && (
        <section className="s-topics" aria-label="Topics">
          {['For coaches', 'For athletes'].map((aud) => (
            <div className="s-topic" key={aud}>
              <h2>{aud}</h2>
              {GROUPS.filter((g) => g.audience === aud).map((g) => (
                <a key={g.id} href={`#${g.id}`}>{g.title}<span aria-hidden="true">›</span></a>
              ))}
            </div>
          ))}
        </section>
      )}

      {visible.map((g) => (
        <section className="s-qa" key={g.id} id={g.id} aria-labelledby={`${g.id}-h`}>
          <h3>{g.audience}</h3>
          <h2 id={`${g.id}-h`}>{g.title}</h2>
          <Faq items={g.items} labelledBy={`${g.id}-h`} />
        </section>
      ))}

      <section className="s-contact" aria-labelledby="c-h">
        <div className="s-contact-copy">
          <h2 id="c-h" className="s-h2 xs">Still stuck? Write to us.</h2>
          <p className="s-copy">A person reads every message. Send opens your email app with the message addressed to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
          <p className="s-small">Want to leave FitLink? <Link to="/delete-account">Delete your account</Link>.</p>
        </div>
        <form className="s-form" onSubmit={(e) => { e.preventDefault(); window.location.href = mailto; }}>
          <label htmlFor="cf-email">Email</label>
          <input id="cf-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="cf-role">I’m a</label>
          <select id="cf-role" value={role} onChange={(e) => setRole(e.target.value)}><option>Coach</option><option>Athlete</option><option>Someone else</option></select>
          <label htmlFor="cf-msg">What’s going on?</label>
          <textarea id="cf-msg" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required />
          <button type="submit" className="fl-btn accent lg" disabled={!message.trim()}>Send</button>
        </form>
      </section>
    </div>
  );
}
