// The Terms of Service, moved out of public/terms.html on 2026-10-16 (the only
// copy). The app's Elite paywall and the web checkout link to /terms.
//
// FOUNDER: two bracketed placeholders remain, highlighted on the page — the
// legal entity in section 1 and the governing law and venue in section 15.
// Fill them before this page is relied on. The title, date and section list
// live in legalMeta.js.
import { Link } from 'react-router-dom';
import { BRAND_NAME, SITE_HOST, SITE_ORIGIN, SUPPORT_EMAIL } from './brand';


/** A founder placeholder: bracketed, highlighted, never silently blank. */
const Fill = ({ children }) => <mark className="s-fill">{children}</mark>;

export default function TermsBody() {
  return (
    <div className="s-doc">
      <section id="plain" className="s-plain" aria-labelledby="plain-h">
        <h2 id="plain-h">In plain words</h2>
        <p>{BRAND_NAME} is where independent coaches sell training passes and run their athletes’ weeks. <strong>The coach sells the pass; {BRAND_NAME} runs the platform and processes the payment through Stripe.</strong> An open pass renews until you cancel it; a season is billed the number of payments shown before you pay, then stops by itself. Refunds are the coach’s call and are issued through the app. Switching coaches or deleting your account ends your pass that day, and time already paid isn’t refunded, so ask your coach before you switch. The Coach Elite subscription is sold through Apple under Apple’s terms. Training carries risk and nothing on {BRAND_NAME} is medical advice. You must be 16 or older, and each account is either a coach or an athlete, not both.</p>
      </section>

      <section id="s1" aria-labelledby="s1-h">
        <h2 id="s1-h">1. Who we are and what these terms cover</h2>
        <p>{BRAND_NAME} is a coaching platform: the {BRAND_NAME} app for iPhone, the website at <a href={SITE_ORIGIN}>{SITE_HOST}</a> (including a coach’s public page and web checkout) and the services behind them. Together we call them the <strong>Service</strong>. The Service is operated by <Fill>[{BRAND_NAME} legal entity and address — to be completed by {BRAND_NAME}]</Fill> (“<strong>{BRAND_NAME}</strong>”, “we”, “us”).</p>
        <p>These Terms of Service are a contract between you and {BRAND_NAME}. By creating an account, buying a pass, publishing a pass or otherwise using the Service you agree to these terms and to our <Link to="/privacy">Privacy Policy</Link>. If you do not agree, do not use the Service.</p>
        <p>If you use {BRAND_NAME} as a coach, the sections addressed to coaches apply to you as well as the general ones. If you use it as an athlete, the athlete sections apply. Some sections address both.</p>
      </section>

      <section id="s2" aria-labelledby="s2-h">
        <h2 id="s2-h">2. Coaches, athletes and {BRAND_NAME}</h2>
        <ul>
          <li><strong>Coaches</strong> are independent professionals who use {BRAND_NAME} to sell training passes and deliver coaching. Coaches are not employees, agents, partners or representatives of {BRAND_NAME}. Each coach decides what they sell, at what price, and how they coach.</li>
          <li><strong>Athletes</strong> buy a pass from a coach. The coaching relationship, including the programme, the advice and the results, is between the athlete and the coach.</li>
          <li><strong>{BRAND_NAME}</strong> provides the platform: the tools a coach uses to build seasons and workouts, the roster, messaging, check-ins, the public page, the web checkout, and payment processing through Stripe. {BRAND_NAME} is not a party to the coaching relationship. {BRAND_NAME} does not supervise, direct or guarantee a coach’s services, and does not independently verify a coach’s qualifications, certifications or insurance. Ask your coach about these directly.</li>
        </ul>
      </section>

      <section id="s3" aria-labelledby="s3-h">
        <h2 id="s3-h">3. Your account</h2>
        <ul>
          <li><strong>Age.</strong> You must be at least 16 years old to create an account. We ask for your date of birth when you sign up. If we learn that an account holder is under 16 we close the account.</li>
          <li><strong>Two modes, one account.</strong> An account starts as a coach account or an athlete account. A coach can also turn on training from Profile and train with another coach; the account then has a Coaching mode and a Training mode, each with its own Home, messages and notifications. A coach’s athletes never see the coach’s own training, and nobody can coach themselves.</li>
          <li><strong>Signing in.</strong> You sign in with a six-digit code sent to your email, or with Sign in with Apple. There is no password. You are responsible for keeping your email inbox and your device secure. Tell us at once if you believe someone else has used your account.</li>
          <li><strong>Accuracy.</strong> Give us accurate information and keep it current. An account is for one person; do not share it or let someone else use it.</li>
          <li><strong>Joining a roster takes an action by the athlete.</strong> An athlete joins a coach’s roster only by accepting that coach’s invitation, by sending a request that the coach accepts, or by buying that coach’s pass. Coaches may not add people who have not done one of these things.</li>
          <li><strong>Switching coaches ends your current pass.</strong> When you join a new coach, every pass you hold with any other coach ends that day: it stops billing and does not renew, and any unpaid amount on it is forgiven. Time you have already paid for is not refunded. You see which passes end before you confirm, and they stay ended even if you do not finish buying the new coach’s pass. Ask your coach before you switch.</li>
        </ul>
      </section>

      <section id="s4" aria-labelledby="s4-h">
        <h2 id="s4-h">4. Passes and subscriptions (athletes)</h2>
        <ul>
          <li><strong>What a pass is.</strong> A pass is what the coach describes on it: an open pass, billed every month or every year until you cancel it, or a season of a fixed number of weeks. Every pass charges the price shown per month, or per year for a yearly price. A season charges it for the number of payments shown before you pay (for example, two monthly payments for an 8-week season) and then stops billing; that number is fixed when you buy, and a later change to the season by the coach does not change it. The price shown at checkout is the price you pay, plus any tax that applies where you live.</li>
          <li><strong>Buying a pass joins the coach.</strong> When you buy a pass you join that coach’s roster, and the coach can see your training data, logged sets, check-ins and messages for as long as you are on it. If you were training with a different coach, buying a pass from a new one moves you to the new coach; your history stays in the previous coach’s records, and your pass with them ends as described in section 3 (no refund of time already paid).</li>
          <li><strong>Renewal.</strong> An open pass renews automatically at the end of each period, at the price shown, until you cancel it. A season renews only until its last payment: nothing more is charged after it, and the season ends when the period that payment covered ends. You then keep your copy of the season and everything you logged, and you stay on the coach’s roster; to keep training on the coach’s plan, buy another pass.</li>
          <li><strong>Cancelling.</strong> You can cancel a pass from the app at any time. Cancelling stops the next payment; you keep access to the coach’s plan until the end of the period you have already paid for. After that, access to the plan is no longer part of your pass and may be closed, including for a season cancelled before its last payment. Your logged sets, check-ins and messages stay, and you stay on the coach’s roster. A price change never applies to a period you have already paid for.</li>
          <li><strong>Failed payments.</strong> If a renewal payment fails, the pass goes on hold until payment succeeds. Your coach can see that it is on hold.</li>
          <li><strong>A coach may end a pass.</strong> A coach may stop selling a pass or remove you from their roster. If that happens before the end of a period you have paid for, see refunds below.</li>
        </ul>
      </section>

      <section id="s5" aria-labelledby="s5-h">
        <h2 id="s5-h">5. Payments, fees, refunds and disputes</h2>
        <h3>Payments</h3>
        <ul>
          <li>Payments for passes are processed by <strong>Stripe</strong>. Your card details go directly to Stripe and never touch {BRAND_NAME}’s servers. Stripe’s own <a href="https://stripe.com/legal/consumer">terms</a> and <a href="https://stripe.com/privacy">privacy policy</a> apply to the payment itself.</li>
          <li>{BRAND_NAME} keeps a platform fee from each pass payment and pays the rest to the coach. The fee is shown to the coach in the app before they publish a pass; it does not change the price an athlete sees.</li>
        </ul>
        <h3>Refunds</h3>
        <ul>
          <li>Refunds are at the coach’s discretion and are issued through the app, within 90 days of the payment. If you want a refund, ask your coach. The coach refunds the full payment or half of it, and either ends the pass that day or lets it run to the end of the period you paid for. The notice you receive says which.</li>
          <li>{BRAND_NAME} may also refund a payment where the law, Stripe’s rules or the card network’s rules require it, or where a coach’s account has been closed before a paid period was delivered.</li>
          <li><strong>Switching coaches or deleting your account is not a refund.</strong> Either one ends your pass that day; time already paid is not refunded, and any unpaid amount on the pass is forgiven. If you want money back, ask your coach before you switch or delete.</li>
          <li>Nothing in this section limits rights you have as a consumer under the law where you live.</li>
        </ul>
        <h3>Disputes and chargebacks</h3>
        <ul>
          <li>If something is wrong with a payment, contact your coach or us first; most problems are quicker to fix that way than through your bank.</li>
          <li>A chargeback or dispute raised with your bank is handled under Stripe’s and the card networks’ rules. While a dispute is open, the disputed amount is withheld from the coach and may be recovered from the coach’s payouts; if the dispute is resolved in the coach’s favour the amount is paid to them again.</li>
          <li>Raising disputes to avoid paying for coaching you received is a breach of these terms and can lead to your account being closed.</li>
        </ul>
        <h3>For coaches: payouts and taxes</h3>
        <ul>
          <li>To receive money you connect a payout account with Stripe from inside the app and accept Stripe’s <a href="https://stripe.com/legal/connect-account">Connected Account Agreement</a>. Stripe may require identity and bank verification before you can be paid, and Stripe decides payout timing.</li>
          <li>Refunds you issue, and disputed amounts, are deducted from your Stripe balance or future payouts, including the platform fee on that payment.</li>
          <li>You are responsible for any tax on what you earn through {BRAND_NAME} and for any registration your local law requires of you as a seller.</li>
          <li>A pass sold through {BRAND_NAME} is delivered through {BRAND_NAME}. Do not use the Service to collect payment for anything other than the coaching the pass describes.</li>
        </ul>
      </section>

      <section id="s6" aria-labelledby="s6-h">
        <h2 id="s6-h">6. Coach Elite and the App Store</h2>
        <ul>
          <li><strong>Coach Elite</strong> is an optional subscription for coaches, sold as an in-app purchase through Apple. It is billed to your Apple Account at confirmation and renews automatically unless you cancel it at least 24 hours before the end of the current period. Manage or cancel it in your Apple Account’s subscription settings; deleting the app or your {BRAND_NAME} account does not cancel it.</li>
          <li>Refunds for Coach Elite are handled by Apple under Apple’s terms; {BRAND_NAME} cannot issue them.</li>
          <li>While Elite is active {BRAND_NAME} charges you a lower platform fee on pass payments. The lower fee ends when Elite lapses.</li>
          <li>The app itself is licensed to you, not sold, for use on Apple devices you own or control, as Apple’s usage rules allow. This licence is between you and {BRAND_NAME}. <strong>Apple is not a party to these terms</strong>, has no obligation to provide maintenance or support for the app, and is not responsible for addressing any claim relating to the app or your use of it (including product liability, legal compliance and consumer protection claims) or any third-party claim that the app infringes intellectual property rights. Apple and its subsidiaries are third-party beneficiaries of this section and may enforce it. You confirm that you are not in a country subject to a U.S. government embargo and are not on any U.S. government list of prohibited or restricted parties.</li>
        </ul>
      </section>

      <section id="s7" aria-labelledby="s7-h">
        <h2 id="s7-h">7. Acceptable use</h2>
        <p>Use the Service for coaching and training. You agree not to:</p>
        <ul>
          <li>break any law, or harass, threaten, abuse or discriminate against anyone;</li>
          <li>impersonate another person, claim qualifications you do not hold, or misrepresent a pass;</li>
          <li>upload content you have no right to share, including another person’s private information, photos or programmes;</li>
          <li>copy, resell or redistribute a coach’s programmes, workouts or messages outside the roster they were written for;</li>
          <li>access the Service by automated means, scrape it, probe or bypass its security, rate limits or access controls, or interfere with its operation;</li>
          <li>send unsolicited invitations or messages, or use the Service to advertise anything other than your own coaching;</li>
          <li>upload malware, or content that is sexually explicit, violent, or that promotes disordered eating or dangerous practices;</li>
          <li>use the Service to collect payments for anything other than the coaching a pass describes.</li>
        </ul>
        <p>We may remove content and suspend or close accounts that break these rules.</p>
      </section>

      <section id="s8" aria-labelledby="s8-h">
        <h2 id="s8-h">8. Content and ownership</h2>
        <ul>
          <li><strong>Coaches own their programmes.</strong> The seasons, workouts, cues, meal plans, notes and messages a coach writes belong to that coach. You give {BRAND_NAME} a non-exclusive, worldwide, royalty-free licence to host, store, copy, display and transmit them so that we can run the Service: showing them to the athletes on your roster, on your public page, and in backups, for as long as they are on the Service.</li>
          <li><strong>Athletes own their logs.</strong> Your logged sets, sessions, body weight, check-ins, photos and messages belong to you. You give {BRAND_NAME} the same licence so that we can run the Service, including showing them to the coach you train with. A coach you leave keeps their own record of the coaching they delivered to you, in the same way any business keeps its books.</li>
          <li><strong>Using a coach’s programme.</strong> While you hold a pass you have a personal, non-transferable licence to use that coach’s programme for your own training. Do not share it or sell it.</li>
          <li><strong>Public page.</strong> A coach’s name, photo, bio and passes are shown publicly on the link the coach shares. Share the link only if you want those things public.</li>
          <li><strong>{BRAND_NAME}’s materials.</strong> The Service, its software, design, exercise catalogue and demonstration media belong to {BRAND_NAME} or its licensors. You may use them only through the Service, as these terms allow.</li>
          <li><strong>The coach’s assistant.</strong> A coach may turn on an assistant that drafts replies from an athlete’s check-in text, after agreeing to it in the app. The coach reads and approves every message before it is sent; a draft is never sent on its own, and a draft is not medical advice.</li>
          <li><strong>Feedback.</strong> If you send us ideas or suggestions we may use them without any obligation to you.</li>
        </ul>
      </section>

      <section id="s9" aria-labelledby="s9-h">
        <h2 id="s9-h">9. Health and safety</h2>
        <div className="s-note-card warn">
          <span className="tag">Not medical advice</span>
          <p>Nothing on {BRAND_NAME}, whether written by {BRAND_NAME} or by a coach, is medical advice, diagnosis or treatment. Coaches are not your doctor and neither is {BRAND_NAME}.</p>
        </div>
        <ul>
          <li>Talk to a physician before starting or changing a training programme, especially if you have a medical condition, an injury, are pregnant or have been inactive.</li>
          <li>Physical training carries a risk of injury. You choose the loads, the movements and the effort; you train at your own risk and stop if something hurts.</li>
          <li>If you feel chest pain, dizziness, shortness of breath or sudden pain, stop and seek medical care. In an emergency call your local emergency number. The app is not an emergency service and messages are not monitored for emergencies.</li>
          <li>Coaches: stay within what you are qualified to do and refer athletes to a medical professional when something is outside it.</li>
        </ul>
      </section>

      <section id="s10" aria-labelledby="s10-h">
        <h2 id="s10-h">10. Messages and notifications</h2>
        <ul>
          <li>Messages between a coach and an athlete are private to the two of them. {BRAND_NAME}’s systems process them to deliver them, and we may review them where the law requires it or to investigate a report of abuse.</li>
          <li>Push notifications are optional and controlled in your device settings. We send service emails you cannot opt out of while you hold an account: sign-in codes, receipts and notices of important changes.</li>
        </ul>
      </section>

      <section id="s11" aria-labelledby="s11-h">
        <h2 id="s11-h">11. Ending your account</h2>
        <ul>
          <li><strong>You can leave at any time.</strong> Delete your account from Profile in the app, or <Link to="/delete-account">on the web</Link>. Deletion is immediate and permanent; what is deleted and what we must keep for tax and accounting law is described there.</li>
          <li><strong>Athletes.</strong> Deleting your account ends every pass you hold that day, before the account is deleted: it stops billing and does not renew, any unpaid amount on it is forgiven, and time already paid is not refunded. You see which passes end before you confirm, and your coach is told you left. If a pass cannot be ended, the account is not deleted.</li>
          <li>Deleting your {BRAND_NAME} account does <strong>not</strong> cancel a Coach Elite subscription bought through Apple. Cancel it in your Apple Account first.</li>
          <li><strong>Coaches.</strong> If you close your account, your athletes’ accounts are not deleted; their passes with you end. Time your athletes paid for and you have not yet delivered is refunded to them automatically from your Stripe balance when you close the account. If Stripe cannot issue one of those refunds, you remain responsible for it. A pass you hold yourself with another coach ends the same day, without a refund of time already paid.</li>
          <li><strong>We may suspend or close an account</strong> that breaks these terms, is used for fraud or abusive chargebacks, puts other people at risk, or where the law requires it. Where it is practical and lawful we tell you first and give you a chance to put things right.</li>
          <li>Sections that by their nature should survive the end of an account (content licences for data we must keep, payment obligations, disclaimers, limitation of liability, indemnity, governing law) survive it.</li>
        </ul>
      </section>

      <section id="s12" aria-labelledby="s12-h">
        <h2 id="s12-h">12. Disclaimers</h2>
        <p>The Service is provided “as is” and “as available”. To the fullest extent the law allows, {BRAND_NAME} disclaims all warranties, express or implied, including fitness for a particular purpose, merchantability and non-infringement. We do not promise that the Service will be uninterrupted, error-free or secure, that any programme will produce a particular result, or that a coach’s content is accurate, safe or suitable for you. A coach’s content is the coach’s, not ours.</p>
      </section>

      <section id="s13" aria-labelledby="s13-h">
        <h2 id="s13-h">13. Limitation of liability</h2>
        <p>To the fullest extent the law allows, {BRAND_NAME}, its officers, employees and contractors are not liable to you for any indirect, incidental, special, consequential or punitive damages, or for loss of profits, data or goodwill, arising from your use of the Service or from the coaching you give or receive through it, however caused and under any theory of liability, even if we were told such damages were possible.</p>
        <p>To the same extent, {BRAND_NAME}’s total liability to you for all claims arising from the Service in any twelve-month period is limited to the greater of the platform fees {BRAND_NAME} earned from payments you made or received through the Service in that period, or one hundred US dollars (USD 100).</p>
        <p>Nothing in these terms limits liability that cannot be limited by law, including liability for death or personal injury caused by our negligence, for fraud, or your statutory rights as a consumer.</p>
      </section>

      <section id="s14" aria-labelledby="s14-h">
        <h2 id="s14-h">14. Indemnity</h2>
        <p>You will defend and indemnify {BRAND_NAME} against claims, losses and reasonable legal costs arising from your content, your coaching services (if you are a coach), your use of the Service in breach of these terms, or your breach of the law or of someone else’s rights.</p>
      </section>

      <section id="s15" aria-labelledby="s15-h">
        <h2 id="s15-h">15. Governing law and disputes</h2>
        <p>These terms are governed by the laws of <Fill>[State or country — to be completed by {BRAND_NAME}]</Fill>, without regard to its conflict-of-law rules, and any dispute that cannot be resolved informally will be brought in the courts of <Fill>[venue — to be completed by {BRAND_NAME}]</Fill>. If you are a consumer, you keep any protection and any right to bring a claim in your home country that the law there gives you and that cannot be taken away by agreement.</p>
        <p>Before starting any formal proceeding, write to us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> describing the problem and what you want; we will try to resolve it with you within 30 days.</p>
      </section>

      <section id="s16" aria-labelledby="s16-h">
        <h2 id="s16-h">16. Changes to these terms</h2>
        <p>We may update these terms as the Service changes. For a material change we give notice in the app or by email at least 14 days before it takes effect, unless the change is required by law or by a payment or platform partner, in which case it may take effect sooner. The date at the top shows when the current version took effect. Using the Service after a change takes effect means you accept it; if you do not, stop using the Service and delete your account.</p>
      </section>

      <section id="s17" aria-labelledby="s17-h">
        <h2 id="s17-h">17. Contact</h2>
        <div className="s-note-card">
          <p><strong>Support and questions about these terms:</strong> <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
          <p><strong>Questions about your data:</strong> <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> · <Link to="/privacy">Privacy Policy</Link></p>
          <p><strong>Refunds for a pass:</strong> ask your coach in the app. <strong>Refunds for Coach Elite:</strong> Apple, through your Apple Account.</p>
        </div>
      </section>

      <p className="s-doc-foot">© {new Date().getFullYear()} {BRAND_NAME}. All rights reserved. · <Link to="/privacy">Privacy Policy</Link> · <Link to="/delete-account">Delete your account</Link></p>
    </div>
  );
}
