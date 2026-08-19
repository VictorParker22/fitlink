/**
 * CoachPanel — the coach's own screen, because the coach is the buyer.
 *
 * The conversion audit's sharpest finding: the only product on the site was
 * the ATHLETE'S session screen. Selling a coach by showing their athlete's
 * UI is selling a POS system by showing the customer's receipt. This is the
 * coach's morning — today's sessions, the athlete going quiet, the month's
 * money — recomposed in HTML from the app's real design system, exactly as
 * the PhoneDemo is (same rule applies: it is a screenshot with a pulse, and
 * must change when the app does).
 *
 * Framed as a browser window rather than a phone, deliberately: it doubles
 * as the announcement that the coach side runs on the web too, which no
 * copy on the site said out loud.
 *
 * Every figure here mirrors the app's own demo state, not invented user
 * metrics: this is what YOUR dashboard looks like, not what "coaches are
 * earning".
 */

export default function CoachPanel() {
  return (
    <div className="fl-cp-wrap">
      <div className="fl-cp" role="img" aria-label="The FitLink coach dashboard: today's sessions, an athlete needing a nudge, and the month's revenue">
        {/* Browser chrome — three dots and the app's address. */}
        <div className="fl-cp-bar" aria-hidden="true">
          <span className="fl-cp-dot" /><span className="fl-cp-dot" /><span className="fl-cp-dot" />
          <span className="fl-cp-url">app.fitlink.coach</span>
        </div>

        <div className="fl-cp-body">
          <div className="fl-cp-head">
            <div>
              <p className="fl-cp-day">Tuesday</p>
              <p className="fl-cp-date">2 sessions · 14 athletes</p>
            </div>
            <span className="fl-cp-avatar" aria-hidden="true">V</span>
          </div>

          {/* Today's board */}
          <div className="fl-cp-card">
            <div className="fl-cp-row">
              <span className="fl-cp-time">9:00</span>
              <div className="fl-cp-row-main">
                <p className="fl-cp-row-name">Sarah M.</p>
                <p className="fl-cp-row-sub">Strength · week 4</p>
              </div>
              <span className="fl-cp-join">Join</span>
            </div>
            <div className="fl-cp-row">
              <span className="fl-cp-time">17:30</span>
              <div className="fl-cp-row-main">
                <p className="fl-cp-row-name">Squad block</p>
                <p className="fl-cp-row-sub">Conditioning · 6 booked</p>
              </div>
              <span className="fl-cp-join fl-cp-join-quiet">Prep</span>
            </div>
            {/* The retention moment — the thing spreadsheets never surface. */}
            <div className="fl-cp-row fl-cp-row-warn">
              <span className="fl-cp-warn-dot" aria-hidden="true" />
              <div className="fl-cp-row-main">
                <p className="fl-cp-row-name">Jonas has gone quiet</p>
                <p className="fl-cp-row-sub">12 days · usually trains Tuesdays</p>
              </div>
              <span className="fl-cp-join">Nudge</span>
            </div>
          </div>

          {/* The month, in money */}
          <div className="fl-cp-tiles">
            <div className="fl-cp-tile">
              <p className="fl-cp-tile-label">August, so far</p>
              <p className="fl-cp-tile-big">$3,240</p>
              <p className="fl-cp-tile-sub">after the 10% · paid to your Stripe</p>
            </div>
            <div className="fl-cp-tile">
              <p className="fl-cp-tile-label">Winter season pass</p>
              <p className="fl-cp-tile-big">11<span className="fl-cp-tile-of">/16</span></p>
              <p className="fl-cp-tile-sub">holders · 3 in week 4 today</p>
            </div>
          </div>
        </div>
      </div>

      <p className="fl-phone-caption">
        Your side of it — on the web, too. The roster, the day, and who needs you next.
      </p>
    </div>
  );
}
