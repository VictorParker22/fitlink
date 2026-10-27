// The Privacy Policy, moved out of public/privacy.html on 2026-10-16 (the only
// copy). Kept in step with fitlink-ios docs/SUBMISSION.md (App Privacy table):
// Apple Health only by choice (no Health Connect), 16+, and Stripe / Apple + RevenueCat /
// Google Gemini (the coach's assistant, after consent) / Supabase / APNs + Expo
// as the processors; Sign in with Apple on the website (same identifier and
// email or relay address as the app). Change the table, change this file. The
// title, date and section list live in legalMeta.js.
import { Link } from 'react-router-dom';
import { BRAND_NAME, SITE_HOST, SUPPORT_EMAIL } from './brand';


export default function PrivacyBody() {
  return (
    <div className="s-doc">
      <section id="plain" className="s-plain" aria-labelledby="plain-h">
        <h2 id="plain-h">In plain words</h2>
        <ul>
          <li>{BRAND_NAME} collects only the data needed to connect coaches with athletes and run the coaching between them.</li>
          <li>We never sell your data, and nothing is used for advertising or tracking.</li>
          <li>Your coach sees your training, check-ins and messages. Nothing else unless you send it.</li>
          <li>Stripe handles payments. We never see a card number.</li>
          <li>You can delete your account at any time.</li>
        </ul>
      </section>

      <section id="collect" aria-labelledby="collect-h">
        <h2 id="collect-h">1. Information we collect</h2>
        <p>We collect the following categories of information:</p>
        <ul>
          <li><strong>Account information:</strong> name, email address and, if you add one, a profile photo. A coach may also add a bio and a specialisation, which appear on their public page.</li>
          <li><strong>Training data:</strong> the workouts, seasons and notes your coach writes for you; the sets, sessions and body weight you log; your weekly check-ins.</li>
          <li><strong>Photos and videos:</strong> a profile photo, the meal photos you log, and any photo or video you choose to send in a chat with your coach.</li>
          <li><strong>Payment information:</strong> pass payments are processed by Stripe. We never see or store card numbers; we keep a record of which pass you bought, when, and its status. A coach who connects payouts gives their identity and bank details directly to Stripe. Coach Elite is bought through Apple, or in the United States also on our website through Stripe; we receive the subscription’s status from Apple and RevenueCat or from Stripe, never your card details.</li>
          <li><strong>Communications:</strong> messages exchanged between coaches and athletes within the app.</li>
          <li><strong>Device information:</strong> device type, OS version, and a push notification token, used only to deliver the notifications you have allowed.</li>
          <li><strong>Website:</strong> a coach’s public page on {SITE_HOST} can be read by anyone with its link. You can sign in there with a six-digit code sent to your email or with Sign in with Apple. If you sign in with Apple, Apple gives us the same account identifier and email address (or private relay address) it gives the app, and your name the first time, if you choose to share it. Your sign-in session is kept in your browser’s local storage. When you continue with Apple from a coach’s page, that browser tab also keeps the link’s code, the pass you chose and any name you typed until you come back, for at most 30 minutes. We do not use advertising cookies.</li>
        </ul>
      </section>

      <section id="use" aria-labelledby="use-h">
        <h2 id="use-h">2. How we use your data</h2>
        <ul>
          <li>To provide and maintain the {BRAND_NAME} service</li>
          <li>To connect athletes with their coaches, and show each the other’s training data and messages</li>
          <li>To show your training progress</li>
          <li>To process payments, pay coaches and manage subscriptions</li>
          <li>To send push notifications about workouts, messages and check-ins, when you allow them</li>
          <li>To draft a coach’s reply with an AI assistant, only after the coach has agreed to it in the app (see section 4)</li>
          <li>To keep the service secure and prevent abuse</li>
          <li>To improve our app and user experience</li>
        </ul>
      </section>

      <section id="health" aria-labelledby="health-h">
        <h2 id="health-h">3. Fitness and health data</h2>
        <p>The training data {BRAND_NAME} holds is what you or your coach type into {BRAND_NAME}:</p>
        <ul>
          <li><strong>Apple Health is optional and off by default.</strong> If you turn it on in the app, {BRAND_NAME} can save the workouts you finish to Apple Health, and read your resting heart rate and sleep from it. Each of the three is a separate switch; iOS asks your permission before anything is read or written</li>
          <li>Resting heart rate and sleep are shown to you next to your check-ins. Your coach sees them <strong>only</strong> if you also turn on “Share with your coach”, and stops seeing them the moment you turn it off. {BRAND_NAME} does not use Google Health Connect and reads nothing from any other health app or wearable</li>
          <li>Logged sets, sessions, body weight and check-ins are used solely to run your coaching: they are shown to you and to the coach you train with</li>
          <li>Never sold to third parties</li>
          <li>Never used for advertising or marketing purposes</li>
          <li>Health data is never used to decide prices, fees or what you are offered</li>
        </ul>
      </section>

      <section id="share" aria-labelledby="share-h">
        <h2 id="share-h">4. Data sharing</h2>
        <p>We share your data only in these limited circumstances:</p>
        <ul>
          <li><strong>With your coach:</strong> training data, logged sets, body weight, check-ins, photos you send and messages are shared with the coach you train with. A coach you leave keeps their own record of the coaching they delivered.</li>
          <li><strong>On a coach’s public page:</strong> a coach’s name, photo, bio and passes are public on the link the coach shares.</li>
          <li><strong>Payment processing:</strong> payment and payout data is handled by Stripe. The status of a Coach Elite subscription comes from Apple and RevenueCat.</li>
          <li><strong>Sign in with Apple:</strong> when you choose it, in the app or on the website, Apple confirms who you are and sends us an identifier and your email address or a private relay address that forwards to you.</li>
          <li><strong>The coach’s assistant:</strong> when a coach asks the assistant to draft a reply, the athlete’s check-in text is sent to Google (Gemini) to produce that draft and for nothing else. The coach must agree to the assistant in the app before it is used, and reads and approves every message before it is sent.</li>
          <li><strong>Meal photo suggestions:</strong> when you allow it in the app, the photo of a meal you log is sent to Google (Gemini) to suggest what is on the plate, and for nothing else.</li>
          <li><strong>Infrastructure:</strong> Supabase hosts our database, sign-in and file storage.</li>
          <li><strong>Push notifications:</strong> device tokens are shared with the Apple Push Notification service (APNs) and Expo’s push service for notification delivery.</li>
          <li><strong>Legal requirements:</strong> when required by law or to protect our legal rights.</li>
        </ul>
        <p>We do <strong>not</strong> sell, rent, or trade your personal information to third parties, and we do not use it for advertising or tracking.</p>
      </section>

      <section id="security" aria-labelledby="security-h">
        <h2 id="security-h">5. Data storage and security</h2>
        <ul>
          <li>Data is stored securely on Supabase cloud infrastructure</li>
          <li>All data transmission is encrypted using TLS/SSL</li>
          <li>Sign-in tokens are stored in secure device storage (the iOS keychain)</li>
          <li>Each coach and athlete can read only their own rows and those of the people they train with, enforced in the database</li>
          <li>We implement industry-standard security measures to protect your data</li>
        </ul>
      </section>

      <section id="rights" aria-labelledby="rights-h">
        <h2 id="rights-h">6. Your rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li><strong>Access:</strong> request a copy of your personal data</li>
          <li><strong>Correction:</strong> update or correct inaccurate information from your profile in the app</li>
          <li><strong>Deletion:</strong> delete your account and its data at any time from Profile in the app, or <Link to="/delete-account">on the web</Link></li>
          <li><strong>Portability:</strong> export your data from Profile in the app, or request it in a portable format</li>
          <li><strong>Withdraw consent:</strong> a coach can stop using the assistant at any time; notifications can be turned off in your device settings</li>
        </ul>
      </section>

      <section id="children" aria-labelledby="children-h">
        <h2 id="children-h">7. Children’s privacy</h2>
        <p>{BRAND_NAME} is for people aged 16 and over. We do not knowingly collect data from anyone under 16; if we learn that we have, we delete the account. If you believe a child has provided us with personal information, please contact us.</p>
      </section>

      <section id="changes" aria-labelledby="changes-h">
        <h2 id="changes-h">8. Changes to this policy</h2>
        <p>We may update this privacy policy from time to time. We will notify you of significant changes through the app or via email.</p>
      </section>

      <section id="contact" aria-labelledby="contact-h">
        <h2 id="contact-h">9. Contact us</h2>
        <div className="s-note-card">
          <p>If you have questions about this privacy policy or your data, contact us at:</p>
          <p><strong>Email:</strong> <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
          <p><strong>In the app:</strong> Profile → Support</p>
        </div>
      </section>

      <p className="s-doc-foot">© {new Date().getFullYear()} {BRAND_NAME}. All rights reserved. · <Link to="/terms">Terms of Service</Link> · <Link to="/delete-account">Delete your account</Link></p>
    </div>
  );
}
