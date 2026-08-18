/**
 * PhoneDemo — the app itself, rebuilt in HTML, logging a session on a loop.
 *
 * The single biggest reason the page felt abstract: the product never
 * appeared on it. Equinox shows its clubs; Whoop floats its ring UI over
 * photography; we showed six text cards. This is FitLink's actual in-session
 * screen — the horizontal exercise head, the set rows with steppers, the
 * collapsed one-line completed set — recomposed in HTML at phone size.
 *
 * HONEST BY CONSTRUCTION: it is built from the app's real design system
 * (same hex values, same radii, same type), so it is a rendering of the
 * product, not a mock-up of a nicer product than the one we shipped. If the
 * app changes, this must change with it — it is a screenshot with a pulse,
 * and a stale one would become a lie the way any stale screenshot does.
 *
 * The loop: set 2 fills its reps, completes, collapses to its summary line,
 * rest timer counts, set 3 activates. Pure CSS keyframes on one shared
 * timeline (--cycle), so the choreography cannot drift out of sync and it
 * costs no JS. prefers-reduced-motion freezes it mid-scene — a still of the
 * app is still the app.
 */

export default function PhoneDemo() {
  return (
    <div className="fl-phone-wrap" aria-label="The FitLink session screen, logging a set">
      <div className="fl-phone" role="img">
        <div className="fl-phone-notch" aria-hidden="true" />

        <div className="fl-phone-screen">
          {/* Session header */}
          <div className="fl-ph-top">
            <span className="fl-ph-timer">24:31</span>
            <span className="fl-ph-session">Lower body · week 4</span>
          </div>

          {/* Exercise card */}
          <div className="fl-ph-card">
            <div className="fl-ph-exhead">
              <div className="fl-ph-exname">
                <p className="fl-ph-extitle">Back squat</p>
                <p className="fl-ph-exmeta">3 sets · quads, glutes</p>
              </div>
              <div className="fl-ph-muscle" aria-hidden="true">
                <svg viewBox="0 0 24 40" width="22" height="36">
                  <path d="M12 3a3 3 0 110 6 3 3 0 010-6zM8 11h8l1.5 9h-3L15 37h-2.4L12 24l-.6 13H9L9.5 20h-3L8 11z" fill="none" stroke="#c6f24e" strokeWidth="1.1" />
                </svg>
              </div>
            </div>

            {/* Set 1 — done, collapsed to its one-line summary */}
            <div className="fl-ph-set fl-ph-set-done">
              <span className="fl-ph-check" aria-hidden="true">✓</span>
              <span>Set 1 · 185 lbs · 8 reps · 0:52</span>
            </div>

            {/* Set 2 — the live one; reps climb, then it completes */}
            <div className="fl-ph-set fl-ph-set-live">
              <div className="fl-ph-set-row">
                <span className="fl-ph-setn">Set 2</span>
                <div className="fl-ph-stepper" aria-hidden="true">
                  <span className="fl-ph-stepbtn">−</span>
                  <span className="fl-ph-stepval">185</span>
                  <span className="fl-ph-stepbtn">+</span>
                </div>
                <div className="fl-ph-stepper" aria-hidden="true">
                  <span className="fl-ph-stepbtn">−</span>
                  <span className="fl-ph-stepval fl-ph-reps" />
                  <span className="fl-ph-stepbtn fl-ph-repup">+</span>
                </div>
              </div>
              <div className="fl-ph-logbtn" aria-hidden="true">Log set</div>
            </div>

            {/* Set 2's collapsed summary — appears when the live card logs */}
            <div className="fl-ph-set fl-ph-set-done fl-ph-set2-done" aria-hidden="true">
              <span className="fl-ph-check">✓</span>
              <span>Set 2 · 185 lbs · 8 reps · 0:47</span>
            </div>

            {/* Rest timer — runs after the log */}
            <div className="fl-ph-rest" aria-hidden="true">
              <span className="fl-ph-rest-label">Rest</span>
              <div className="fl-ph-rest-track"><div className="fl-ph-rest-fill" /></div>
              <span className="fl-ph-rest-skip">Skip</span>
            </div>

            {/* Set 3 — waiting its turn */}
            <div className="fl-ph-set fl-ph-set-next" aria-hidden="true">
              <span className="fl-ph-setn">Set 3</span>
              <span className="fl-ph-nextlabel">Up next</span>
            </div>
          </div>

          {/* Coach message — the relationship, present even mid-session */}
          <div className="fl-ph-msg">
            <span className="fl-ph-msg-avatar" aria-hidden="true">M</span>
            <p>Depth looked better last week — same cue today.</p>
          </div>
        </div>
      </div>

      <p className="fl-phone-caption">
        The in-session screen. Steppers, not keyboards — typing is the fallback, not the flow.
      </p>
    </div>
  );
}
