# CLAUDE.md — FitLink Project Memory

> **Last updated**: 2026-10-25
> **Project**: FitLink — Gym Trainer Referral & Client Management Platform
> **Location**: `c:\projects\fitlink`
> **Dev server**: `npm run dev` → http://localhost:5173 (or next available port)

---

## What is FitLink?

A **mobile-first PWA** for gym trainers to manage clients, send referral invites, track subscriptions, schedule sessions, build workouts, and message clients — all from one premium dark dashboard. Clients get their own portal to view workouts, log exercises, and chat with their trainer.

The project idea came from a conversation with a real gym trainer who wanted a referral/subscription system for their business.

---

## Coach-led web pages (2026-10-16) — `src/web/`, `public/`, `vercel.json`

The site is React routes in `src/main.jsx`: the marketing and policy pages under one shell
(`src/web/site/`), a coach's public page with web checkout (`/i/:code`, `/live/:code` →
`src/web/CoachPublicPage.jsx` + `Checkout.jsx`), the coach's season editor (`/coach/*` →
`CoachWeb.jsx` + `SeasonEditor.jsx`, pure track maths in `passTrack.js`) and a 404 for
everything else. `src/web/api.js` wraps the edge functions and RPCs; a page only ever sends
ids (invite code, plan id, client id), never a price or a payee: the server computes money
from `plans`.

- **The site (2026-10-16 evening, designs Web-Home … Web-404).** `src/web/site/SiteShell.jsx`
  is the layout route (glass header with the F mark + Home / Pricing / For athletes / Help,
  Sign in → `/coach`, Get the app → the App Store; footer with Help · Privacy · Terms ·
  Delete account · support@fitlink.coach; scroll-to-top; a `body` class so overscroll is
  cream). Pages: `Home.jsx` (`/`), `Pricing.jsx`, `Athletes.jsx`, `Support.jsx`,
  `Legal.jsx` (`/privacy`, `/terms`; text in `privacyContent.jsx` / `termsContent.jsx`,
  titles and section lists in `legalMeta.js`), `DeleteAccount.jsx`, `NotFound.jsx`.
  `site.css` is scoped under `.fl-site`; the root also carries `.fl`, so tokens, `.fl-btn`,
  `.fl-field`, `.fl-error` and the glass pill come from `web.css`. The Web-Home-Mobile
  artboard is the same page at 390 px: one column, the header pill becomes a box with the
  nav on its own row (`@media (max-width: 720px)`); keep every new section
  `minmax(min(Npx, 100%), 1fr)` so it collapses without horizontal scroll.
- **Numbers come from `src/web/site/pricing.js`, nowhere else, and pricing.js takes them from the server's
  config (2026-10-25).** `src/web/pricingConfig.json` is a byte-for-byte copy of fitlink-app
  `supabase/config/pricing.json` (the owner's prices, rates and dates; the server's `_shared/pricingData.ts` and
  `public.pricing_config()` are generated from the same file). pricing.js derives every constant from it: fee
  percents from bps (`STANDARD_FEE_PERCENT` 10, `ELITE_FEE_PERCENT` 5, `FOUNDING_FEE_PERCENT` 5, `MODEL_B_FEE_PERCENT`
  2), prices from cents (`ELITE_MONTHLY_USD` 29.99, `ELITE_YEARLY_USD` 249, `MINIMUM_CHARGE_USD` 25,
  `DISPUTE_FEE_USD` 15, `MODEL_B_BOOKING_FEE_USD`), `FREE_ROSTER_CAP` 5, the Founding slots / days / notice / close,
  the payout schedule and Stripe's processing estimate (`stripeEstimateWords()`, display only). When the owner changes
  a number: copy the file again, then `node --test src/web/pricing.test.js` names every value that moved (it pins
  them all, plus the pricing page's three owner-locked lines in `site/planLines.js`). Never type a price into a page.
  **Re-sync:** copy fitlink-app `supabase/config/pricing.json` byte for byte, then put `sha256sum
  src/web/pricingConfig.json` and the fitlink-app commit it came from into `SERVER_CONFIG_SHA256` in
  `src/web/pricing.test.js` (pinned today: commit 323786f, `bb9da028…8a8f`); a copy without a new pin fails.
  The dev `[confirm]` marker (`NEEDS_CONFIRM = import.meta.env.DEV`; production never shows it) stays only on what is
  NOT in the config: `FOUNDING_MIN_PAYING_ATHLETES` and the founder's email promise on /founding. Quotes stay dashed
  placeholders and the footer says `[Legal entity name]` until the founder fills them. Illustrations (phone mocks,
  the money card) are `aria-hidden` and compute their sample arithmetic from the same constants.
- **Support answers must be true for the shipped product**: iPhone only, no Android app,
  card checkout by Stripe (no Apple Pay claim), Apple Health optional and off by default (the
  coach sees resting HR and sleep only when the athlete also turns on sharing; no Health
  Connect), the assistant is Coach Elite and the coach sends every message, refunds through
  the app within 90 days of the payment, a coach who leaves refunds undelivered time
  automatically, and an athlete who
  switches coach or deletes their account ends the old pass that day with no refund of time
  already paid ("ask your coach before you switch"; operator decision 2026-10-17). A season
  is billed a fixed number of payments and stops by itself; an open pass renews until
  cancelled; a cancelled pass keeps access to the plan until the paid time ends, and after
  that the plan "is no longer part of the pass" (never "access closes": see below). A coach
  can also train (two modes); `Support.jsx` says so, but the Terms' "In plain words" still
  says "either a coach or an athlete, not both" and needs the founder's wording. The contact
  form composes a `mailto:` to `SUPPORT_EMAIL`; there is no ticket backend. The search
  filters the page's own questions.
- **Delete account is a real flow** (`DeleteAccount.jsx`, helpers in `api.js`): email code
  (`signInWithOtp({ shouldCreateUser: false })` → code) or Sign in with Apple → `myRole()`
  (a `trainers` row → coach, a `clients` row → athlete, neither → `none`; a read that fails throws and the page
  says it couldn't check, with Check again, never "no profile"). A session already in the
  browser skips the code.
  - Coach: `departurePreview()` = `delete-trainer-account {preview: true}` (athletes, refund
    total, and `ownPassesEnding[].line`: the coach's own passes with other coaches and their
    placeholders', listed verbatim under "Also ending today"; 3/hour; a 429 or a Stripe 502
    is shown in words with Check again) → checkbox → `deleteCoachAccount()` (the function,
    then `auth.getUser()` must fail before the page says Deleted; 2/day). The Delete button
    stays disabled until the preview is on screen: step 0 ends the coach's own passes with
    other coaches, no refund, and the preview is the only place they are listed.
  - Athlete, and a `none` account (athlete-exit deletes an account with neither row too; a
    deleted account's stale session gets its 401 and goes back to the email step)
    (fitlink-app 2026-10-17, athlete-exit is the athletes' one exit; no app calls
    `delete-account-media` or `delete_client_account` any more): `previewAthleteDeletion()` =
    `athlete-exit {action: 'delete_account', preview: true}` → each `passesEnding[].line` and
    `coachNotice` verbatim → checkbox → `deleteAthleteAccount()` = `{action:
    'delete_account', confirm: true}` → Deleted and local sign-out only on `deleted: true`.
    The Delete button stays disabled until a preview body is on screen (preview 10/h + 60/day,
    delete 3/day: a failed preview must not leave a commit that ends unlisted passes); a
    preview refusal shows the server's sentence (guardRate's hourly or daily one included)
    with Check again. Refusals (`needs_confirmation`, `coach_account` → read the role again,
    `live_subscription`, `stripe_error` / `db_error` / `delete_failed`, which say what ended)
    are shown as sent; a refusal with `passesEnded > 0` reloads the preview.
  - Never say "deleted" before the server answered. A commit with no decided answer (status
    0, a gateway timeout, any 5xx that is not `{error, code}`) says the outcome is unknown and
    to reload; a 401 drops the local session and goes back to the email step.
- **Sign-in on the web (2026-10-21).**
  - **PKCE.** `src/web/supabase.js` runs `flowType: 'pkce'`. A session is made only by a flow this
    browser started (the verifier lives in `fitlink-web-code-verifier`) or by a six-digit code typed
    here. Tokens in a URL are refused; under the old implicit flow `/i/CODE#access_token=…` signed a
    visitor into someone else's account, and the card form then paid onto it.
  - **After the client initializes, clean the URL.** The exchange runs once, at import. `/coach`,
    `/delete-account` and `/join` then call `takeAuthReturnNote()`, which strips every auth parameter
    and shows one fixed sentence, never the URL's text. Other pages clean silently; SiteShell skips
    `/delete-account` (its effect runs after the page's and would clean the URL first). Never call
    `exchangeCodeForSession` from a page. A sentence for the sign-in screen is set BEFORE a sign-out:
    signing out clears the session and ends the effect that would have set it.
  - **`/coach` is for coach accounts.** `myRole()` is `coach` (trainers row) → the editor; `athlete` /
    `none` → "isn't a coach account" with Sign out; a failed read → Check again, never the editor. A
    gate result is kept with the uid it checked, so another account never sees it. An account whose
    every identity is Apple and whose metadata has no `role` (`appleSignUpUnfinished`) is a sign-up
    nobody finished. Its default trainers row (made by `handle_new_user`) carries Apple's full name,
    or the email's local part, and `trainers_public` lists it to anyone, so every web path that meets
    one removes it before anything can stop: `/coach` drops the row (`claim_athlete_role`) and signs
    it out; checkout makes it an athlete, `claim_athlete_role` FIRST (before the name step and the
    sellable checks), then `role: 'client'`, the iOS rule; `/join` with nothing parked, and a pass
    gone on the way back from Apple, drop the row and sign out (`leaveUnfinishedAppleSignUp`);
    `/delete-account` lets it delete itself. Never call `claim_athlete_role` for an account with a
    role. Open (fitlink-app, server): `handle_new_user` still inserts that row for a role-less Apple
    or Google sign-up, so one abandoned before any of these paths (an Apple sign-in on
    `/delete-account` that never deletes, an iOS sign-up left at the role screen) keeps it.
  - **Who the account is comes from the server.** `freshUser()` (GET `/auth/v1/user`) decides every
    write that depends on it (`claim_athlete_role`, `role: 'client'`) and the `/coach` and
    `/delete-account` reads; never the stored session, which can be an hour old (review 2026-10-21:
    an Apple sign-up that picked Coach in the app since still read as unfinished, and `/coach` deleted
    the new coach's trainers row). A read that fails writes nothing: `/coach` says it couldn't check
    (Check again), a 401/403 or a missing session goes back to sign-in.
  - **Every sign-out is `signOutLocal()`** (scope `local`; when `/logout` can't be reached, the stored
    session and verifier are removed by hand). Never `supabase.auth.signOut()` bare: it is global (it
    also signs the coach out of the app) and auth-js keeps the session when `/logout` fails, so on a
    shared computer the editor stayed signed in.
  - **Sign in with Apple** shows only when `VITE_APPLE_WEB_SIGN_IN=on` was set at build time, on
    `https://fitlink.coach` or localhost, and not in a Home Screen web app.
    - The owner's console steps are in fitlink-app's threat model (Apple vendor row): Services ID
      `fitlink.app.web` FIRST in Supabase's Apple Client IDs, client secret expiry.
    - Return paths are fixed: `/coach`, `/delete-account`, `/join`, `/founding`. Never `/i/*` or `/live/*` (the
      AASA paths). Never from a query.
    - Checkout parks `{code, planId, name}` in sessionStorage (`fitlink-web-checkout-return`, 30
      minutes). `/join` moves client-side to `/i/CODE`, which reopens the sheet (no who step: the
      session is this tab's own, unless the return came back with a failure note). With nothing
      parked, `/join` never leaves a silent sign-in: an unfinished sign-up is left as above, any
      other account is named ("Signed in as … with Apple.") with Sign out.
  - **The button** is `AppleButton.jsx`: Apple's logo file unmodified (`public/apple/`), black,
    "Continue with Apple", title at 43 % of the height, never smaller than the email button beside it.
  - **Copy.** Never ask an Apple user for a personal email; point them to the Apple button. Every
    sign-in sentence lives in `appleAuth.js` (`node --test src/web/appleAuth.test.js`). The iPhone path
    to the Sign in with Apple list is "Settings, then your name, then Sign in with Apple" (iPhone User
    Guide, iOS 26).
- **Checkout joins through athlete-exit, then buys** (`Checkout.jsx`). A session already in the
  browser that the sheet did not make (not a code typed in it, not this tab's own Apple return
  through `/join` with no failure note) is somebody's: the sheet opens on "Signed in as <email, or
  the phone with its +>[ with Apple] · Not you? Sign out" with Continue, and nothing is finished,
  joined or bought before that tap (review 2026-10-21: with a coach's session left on a shared
  computer, opening another coach's checkout put that coach on the roster before any who-line).
  Signed out, the sheet first checks
  what the page can see would make create-subscription refuse (`planIsPriced`, the server's
  `planAmountCents` rule; `coachTakesCards` = `trainers_public.stripe_charges_enabled`; the
  Stripe key from `app-config`; an `app-config` call that fails says so in its own words,
  only a 2xx without a `pk_` key is "not set up") and stops with "Nothing was changed"
  (`CoachPublicPage` never offers Buy on an unpriced pass, and with no priced pass it shows
  no "Choose a pass" prompt) → email code or Sign in with Apple (a new Apple account is
  finished as an athlete first, BEFORE the same checks run again, so a refusal there never leaves
  it a coach row named after the person) → `previewInvite` = `athlete-exit
  {action: 'accept_invite', code, preview: true}` → when `needsConfirmation`, the
  `passesEnding[].line` list and "this happens as soon as you confirm, before the card form"
  → `acceptInvite(code, {confirm: true})`, which ends those passes at Stripe NOW (no refund,
  open invoices forgiven) and moves the athlete → `create-subscription {planId, clientId}`
  (`alreadyActive` is a success; `payingOpenInvoice` + `amountDueCents` is "pay what you owe")
  → Stripe PaymentElement → `confirm-subscription {clientId, subscriptionId}` (three tries,
  1.5 s apart, on no answer, a 5xx without a code, or `active: false` without a code; a 4xx
  or coded 5xx shows its sentence at once; `{active: false, code: 'roster_full', error}`
  shows `error`) → "You're in" only on `active: true`. "Switched" and "your previous pass has
  ended" come only from the confirm's own `switched` / `passesEnded`. A confirm whose answer is
  lost says nobody can tell whether the pass ended (Check again re-runs the preview; when it
  shows this coach as the athlete's own, the sheet says the switch went through and the
  listed passes ended before the card form); a 401 offers Sign in again. What only the server
  can know can still refuse after a confirmed switch (`live_subscription` on a second pass with
  the new coach, `stripe_error`, `db_error`), and the sheet then keeps saying the old pass
  ended.
- **A season stops billing after its weeks (owner decision 2026-10-17; fitlink-app
  `_shared/season.ts`, migration 20261017130000).** A pass with `duration_weeks` is billed
  `price` every month (`period: 'year'` → every year; any other period bills monthly) for
  P = `seasonPayments(weeks, period)` payments, then stops: month `max(1, ceil(weeks × 7 /
  30.4375))`, year `max(1, ceil(weeks × 7 / 365.25))` (4 w → 1, 8 w → 2, 12 w → 3, 52 w → 12).
  An open pass (no `duration_weeks`) renews until cancelled. `src/web/season.js` is the web's
  copy (integer maths, the server's table pinned in `src/web/season.test.js`: run
  `node --test src/web/season.test.js`; change both repos or neither) and every season
  sentence comes from it: the card reads "$180 / month" + "8-week season · 2 monthly payments
  ($360 in all)", a one-payment season "$90 for the 4-week season" + "One payment · nothing
  renews"; the checkout's line under the card form is "$180 today, then monthly: 2 payments
  in all. Billing stops after the season." / "$90 today. One payment for the season." (open
  passes keep "Charged today, then every month until you cancel."); the season editor shows
  "$180 / month · Athletes pay 2 monthly payments ($360)" and, in the publish review, what a
  new week count does to buyers' payments (publishing writes `plans.duration_weeks`, and a
  write that fails is said). Never "$X once". The price stays per period. Whether a pass is a
  season is `passBilling(plan).kind` (1..520 whole weeks, the server's `seasonWeeks`), never a
  truthy `duration_weeks`: a 600-week pass is an open pass that renews, so its card says "Buy
  <name>", not "Join the season". When billing ends the history stays and a season paid in
  full keeps its own copy ('completed'); Help, For athletes and Terms §4 say the plan "is no
  longer part of the pass" / "may be closed", NOT "access closes" (review 2026-10-17: the
  athlete can mark their own season 'completed' through `guard_enrollment_columns`, live
  stripe-webhook's `endPassAccess` moves only active/paused rows, and `my_track_ids` serves
  'completed' snapshots, so a season skipped to the end and cancelled early is still served;
  fitlink-app's review fix makes an early end cancel a 'completed' row too, not yet deployed,
  and a season with no subscription at all never ends; the softer words are true either way,
  so change them only with the server's proof). A signed-in athlete whose
  season with the coach reads 'completed' and who holds no running pass with them (status
  active / trialing / past_due / unpaid / paused) gets "Start another season with <first>" on
  the coach's page (`api.js finishedSeasonWith`, reads only; a failed read shows nothing).
  "Every payment is made, so nothing more is charged" appears ONLY with a 'season_complete'
  notification for that plan created at or after the season's `started_at` (only stripe-webhook
  inserts that type, after all P payments; `season.js finishedSeason` → `paidInFull`); a season
  that reads 'completed' without one says "You finished your <plan> season. Everything you
  logged stays with you." **Lengths and athletes already paying:** a subscription bought
  before create-subscription stamped `fitlink_season_weeks` / `fitlink_season_payments` is
  billed by the plan's CURRENT `duration_weeks` (server `seasonFor`; live: one, the 8-week
  "Spring" pass, renewing 2026-11-08). The editor reads the coach's running
  `client_subscriptions` per pass (`payingFor`) and, when a new length changes P, the review
  adds "N athlete(s) pay for this pass now. A pass bought before seasons were billed a fixed
  number of payments may be billed by the new length too, so tell them before you publish."
  (unknown count → "Athletes may already pay for this pass."). Terms §4 ("that number is
  fixed when you buy") and Help are true for that subscription only once the server stamps it
  (weeks '8', payments '2'): a fitlink-app rollout step, required before this site's deploy.
  The web has no manage-pass screen and no inbox, so `client_subscriptions.ends_at` and the
  `season_complete` notice are the apps' to show (the web reads the notice only for the
  payment sentence above). **Deploy order:** the site goes out after
  the server's season deploy (migration 20261017130000, then stripe-webhook,
  confirm-subscription, create-subscription). That deploy is DONE (2026-10-17 ~19:44 UTC:
  stripe-webhook v41, confirm-subscription v7, create-subscription v28), so the season copy
  is now true for new purchases; the site still waits on the Terms §16 decision below, and the
  one unstamped live subscription is billed by the plan's current length until it is stamped.
- **Founding (2026-10-25, launch plan Sprint 1 PR 2; `src/web/site/Founding.jsx`, rules in `src/web/founding.js`,
  `node --test src/web/founding.test.js`).** `/founding` in the site shell, linked from nowhere yet (the "Claim a Founding
  spot" CTA is website item W3). Server: fitlink-app migration `20261025110000` (threat model B38, A56–A58).
  - **Applying never takes a spot.** The form calls `apply_founding` (the caller's own application, status `pending`);
    Victor takes a spot for the coach with `grant_founding` after the setup call. Never build a web path that sets
    founding: farmed accounts would take all 15.
  - **The counter** is `founding_slots()` (anon): `{taken, total, closes_on, open}`, taken = granted spots that exist
    (a deleted Founding coach's grant goes with the account, so the slot reopens: owner decision 2026-10-25, and the
    "If one opens…" copy stays). Nothing numeric while it loads; a failed read says "Couldn't load how many spots are
    taken." with Try again (never a guessed number); full → a NEW application becomes "All N spots are taken." and a
    "Tell me when a spot opens" `mailto:` to `SUPPORT_EMAIL`; past the close → closed copy (`foundingPhase`). An
    application already pending or booked keeps its place: "Edit your contact details" (instagram, phone; the other
    fields locked, the server keeps them, `contactOnly`). A withdrawn one is a new one (`isNewApplication`).
  - **The offer's numbers** (15 spots, 12 months, $29.99, 5% vs 10%, 5 paying athletes, 30-day notice, 60 days without
    a payment, Dec 31) are `FOUNDING_*` / `STANDARD_FEE_PERCENT` / `FREE_ROSTER_CAP` in `pricing.js`, derived from the
    config copy `pricingConfig.json` `tiers.founding` (`closes_on` 2026-12-31, `closes_tz` America/Los_Angeles) since
    2026-10-25; only the "5+ paying athletes" eligibility line keeps a dev `[confirm]` marker (not in the config). Say the server's rules as they are (review 2026-10-25): the free year starts with
    the first athlete payment AFTER the grant; the 5% applies while the free year or Elite runs; after the free year
    without Elite the coach is on the free plan (10%, up to 5 paying athletes); with no athlete payment for 60 days
    (counted from the grant or the last athlete payment) Founding pricing ENDS (the server's suspension lasts until the
    operator lifts it; never "pauses"); the badge stays.
  - **Sign-in.** Email code with `shouldCreateUser: true, data: { signup: 'founding_web' }` and NO role
    (`FOUNDING_SIGN_UP_DATA`): the auth user exists from the moment the code is SENT, and the server's
    `handle_new_user` (20261025110000) makes no trainers row for that marker, so nothing reaches the public
    `trainers_public` for an address nobody proved (A58). Or Sign in with Apple, returning to `/founding` (in
    `APPLE_RETURN_PATHS`; SiteShell skips its URL cleaning there, the page takes the return note itself). Then
    `freshUser()` + `myRole()` → `accountStep`: an athlete account (a clients row, or metadata role `client`) is told
    "This page is for coach accounts. This account was made as an athlete account…" and never converted.
  - **Nothing is written for an account before the person acts** (review 2026-10-25: a role-less Apple session left in
    the browser was made a coach on page load). An account that is not a coach account yet (no rows and no role, a
    coach role with its row missing, an Apple sign-up nobody finished) is finished as a COACH (`api.js
    finishCoachSignUp`: its own trainers row if missing, then role `trainer`; the one place the web does that)
    automatically ONLY for this tab's own sign-in (`isOwnSession`): the code was typed in this tab, or this tab started
    Sign in with Apple on `/founding` (sessionStorage `fitlink-web-founding-return`, 30 minutes, read and forgotten on
    arrival) with no failure note and the server's `last_sign_in_at` after that start. Any other session gets "Signed in
    as … · Not you? Sign out", "This isn't a coach account yet" and **Continue as a coach**; nothing is written before
    that tap. A coach account's only write is Apply. Proved headless with the request log (no write before the tap).
    A read that fails says so with Check again.
  - **After applying** (or with an application on file): the status from the row (pending / booked / granted →
    "You're a Founding coach" with the badge / declined / withdrawn), the answers, Edit your answers. "Book your setup
    call" opens `VITE_FOUNDING_CALENDAR_URL` (validated by `bookingUrl`: https, a host, no credentials; read at build
    time, never from the page's URL) in a new tab; unset → "Nothing is emailed automatically: Victor will email you at
    <email> to set up the call." There is no email provider. Refusals are worded from the RPC's keys
    (`applyRefusal`); an answer that never came says the outcome is unknown, with Check again (re-reads the own row).
  - **The badge** is `src/web/FoundingBadge.jsx` ("Founding 15"), shown on the coach page when
    `trainers_public.founding_member` is true (`api.js foundingMember`: any failed read, a missing column before the
    migration included, means no badge). PR 3 moves it to `/c/<handle>` with the component as is.
  - **Brand.** The product is being renamed: new copy takes the name from `src/web/site/brand.js` (`BRAND_NAME`,
    `FOUNDER_FIRST_NAME`), never a new hard-coded "FitLink".
  - Owner: set `VITE_FOUNDING_CALENDAR_URL` on Vercel (production) before the page is linked. Deploy this page only
    AFTER the server migration: before it the page says applications aren't open yet, AND the live `handle_new_user`
    ignores the `founding_web` marker, so an email sign-up here would still publish the address's local part.
- **Fee engine, the web half (2026-10-25, launch plan Sprint 1 PR 1; server: fitlink-app PR #12 branch
  `launch/1-fee-engine`, migration `20261025100000`, threat model B34–B37 — NOT live yet).** Branch
  `launch/1-fee-engine-web`, stacked on `launch/2-founding` (the web Founding branch).
  - **/pricing** (`site/Pricing.jsx`): "Free to try."; three plans in this order with the owner-locked lines
    (`site/planLines.js PLAN_LINES`: "Free to try. Up to 5 athletes, 10% per pass." / "$29.99/mo. 5%, no cap, your
    assistant." / "15 spots. Elite free for a year. Closes Dec 31."); a calculator of what the coach KEEPS per month
    on Free / Elite / Founding (`pricing.js keepsByTier`; Elite minus its subscription, monthly or yearly; Founding's
    first year has no subscription); a Founding column in the table; "Subscribe on the web; the app opens your
    dashboard". All-in pricing: on the standard plans athletes pay exactly the price the coach sets, Stripe's
    processing comes out of the platform's fee, and no page shows a processing line or surcharge. Every such sentence
    is qualified so it stays true for a Model B coach ("On the standard plans, athletes pay exactly the price you
    set"; a booking fee, when a coach uses one, is included in the total shown before paying, `MODEL_B_BOOKING_FEE_USD`).
    No tax line anywhere: no fitlink-app function sets `automatic_tax` or tax rates (grep 2026-10-25).
  - **Gate: Model B must not be switched on for a coach until the coach page shows the total before checkout (PR 3).**
    Today `Checkout.jsx` shows create-subscription's `amountCents` (the booking fee inside it, said as "includes a $12
    booking fee", never a separate surcharge line; `season.js chargedTotal`) in the title, the season line, the Pay
    button and the charge line, but only from the card form on: athlete-exit's switch confirmation (which can end
    another pass) runs before any total exists, and the coach page still shows plans.price. The cap in words (`SIXTH_ATHLETE_RULE`): the 6th paying athlete pays and
    joins; the coach then needs Elite to keep changing plans (the server never refuses at the cap; it makes the roster
    read-only, `guard_roster_read_only`). Home and Help say the same (no "Free until it works", no Elite "in the app
    under Profile, billed through Apple"); App Store Elite is "managed in the App Store" for whoever already has it.
  - **/coach is the dashboard** (`CoachDashboard.jsx`, rules and sentences in `coachMoney.js`, `node --test
    src/web/coachMoney.test.js`); the index no longer redirects to Seasons (a redirect drops the `?elite=` return).
    The Coach Elite panel reads `coach_fee_terms()` (authenticated, the caller's own row only): tier, fee, paying
    athletes vs cap, the read-only warning, web Elite (renews / cancelled / set up after the free year / past due within
    the 7-day grace / overdue), App Store Elite ("Managed in the App Store."), Founding (not started, free until,
    ended, suspended). Dates in UTC, like the server's sentences. Buy buttons ("Subscribe monthly · $29.99" / "Yearly ·
    $249", from the config) only when `eliteView().canBuy` (`buy` carries the line above them and the labels): never
    with Elite from any source, a running/cancelled-but-paid web subscription or a past-due one. **Founding (owner
    decision 2026-10-25):** before the first paid athlete no buttons, and the panel says elite-checkout's own
    `founding_active` sentence (`FOUNDING_BEFORE_FIRST_PAYMENT`); in the free year (`founding.first_paid_at` set, no
    web subscription) "Set up Elite for after your free year · Nothing is charged until <founding.free_until>" with
    "Monthly · $29.99" / "Yearly · $249" (elite-checkout makes a subscription whose trial ends with the year,
    `eliteTrialEndSec`); from the notice window (`notice_at`, or 30 days before the end) also "Your free year ends on
    <date>. To keep Elite and your 5% fee, set up Elite before then; nothing is charged until that day." The page
    leaves for Stripe only when the answer's `firstChargeAt` names the same day (`checkoutKeepsPromise`); otherwise
    (the last 48 hours, where Stripe can't hold the charge) it says Stripe would charge today, with "Continue to
    Stripe anyway". Inside those 48 hours the line already says Elite started now is charged from today. **Model B:**
    the fee line is `model_b_fee_bps` with the $12 booking fee "in the total before they pay", and the pitch never
    says Elite lowers the fee. **Org seat** (`org_seat`, fee 0): "No fee on the passes you sell: your gym's seat
    covers it", and the pitch says the seat covers fee and cap and Elite adds the assistant. A tap POSTs `elite-checkout {interval, source:
    'web'}` (never a price) and `window.location.assign`s the answer only when `isStripeCheckoutUrl` (https,
    `checkout.stripe.com`, no credentials or port). Every refusal is the server's sentence; `already_elite*`,
    `founding_active`, `elite_payment_due` re-read the terms; an answer that never came adds "Nothing is charged until
    you pay on Stripe's page." Return: `?elite=started|cancelled` is read once (`readEliteReturn`) and removed; cancelled
    → "Checkout was cancelled. Nothing was charged."; started → "Stripe is confirming your subscription…" with Check
    again (and automatic re-reads at 3, 6 and 10 s) and NO buy buttons, until `coach_fee_terms` shows the web
    subscription (`web_status` active or trialing): only then "Stripe confirmed your Coach Elite subscription."
    Before the migration the RPC is missing (PGRST202) and the panel says Elite on the web isn't available yet.
  - **/coach/earnings** (`CoachEarnings.jsx`, `api.js earningsData`, `coachMoney.js buildEarnings`): reads as the coach
    only (RLS read 2026-10-25 on live: `payments_select`, `pass_refunds_select`, `payment_disputes_select` all admit
    `trainer_id = auth.uid()`; the branch adds no payments policy). Payments `succeeded` or `refunded`, newest first, 500
    at most; per row date (local), athlete first name (a former athlete's row is not the coach's to read → "Former
    athlete"), pass, paid (`gross_cents`, else `amount`), platform fee with the rate (`fee_bps`; Model B rows say
    "+ booking fee", and the booking fee is listed as inside the athlete's total), dispute fee, net payout. Per month:
    athletes paid, refunded, platform fee, booking fees, dispute fees, net payout. A row without the breakdown (before
    the engine, or the 42703 fallback before the migration) shows "—" and is out of the fee totals with one line saying
    so. A `pass_refunds` row is its own negative row and in "Refunded", NOT in net payout (the coach's share of a refund
    depends on the charge's split; the page says so). A refund is put on the latest earlier payment of the same athlete
    and pass (nothing the coach reads joins a charge to a payment intent): "part refunded" while those refunds total
    less than the payment's gross, else "refunded" (refund-pass marks a payment refunded after a half that ends the
    pass). Disputes (`disputeNote`): inquiries (`warning_*`) and won ones are left out; open ones (needs_response,
    under_review) say what they hold back, ones lost in the last 90 days what was taken back, and the note says the
    payments below still show their full net. When either list hits 500 rows the page says the oldest month may be
    missing some, and that month says so too. A failed payments or refunds read says so with Try again; failed names
    or disputes say so beside the amounts.
  - Checks: `node --test src/web/*.test.js`, eslint, build, and the headless run (390 and 1280 px; pricing at three
    volumes, seven panel states, checkout start, every refusal, the started/cancelled returns with webhook lag, five
    earnings cases) — 164/164 on 2026-10-25. After the review fixes (same day): 223/223, adding Founding before the
    first payment / in the free year (buttons, wording, firstChargeAt kept or not) / in the notice window / in the last
    48 hours / set up, the Model B fee line, the Model B checkout total, the org seat, a part refund, open / lost /
    inquiry disputes and a truncated list; the new checks fail on the pre-fix build (8ca1aed). `node --test
    src/web/*.test.js` 82/82.
  - **Deploy order (`docs/DEPLOY_ORDER.md`):** fitlink-app migrations `20261025100000` then `20261025110000`, then
    `elite-checkout` and `stripe-billing-webhook` deployed with their secrets (`STRIPE_ELITE_MONTHLY_PRICE`,
    `STRIPE_ELITE_YEARLY_PRICE`, `STRIPE_BILLING_WEBHOOK_SECRET`), then this site. Before it, the pricing page describes rules the server does not enforce yet (the cap still
    refuses on live) and /coach's panel says Elite on the web isn't available. The Terms (§6 "Coach Elite and the App
    Store") and the Privacy Policy still say Elite is sold through Apple: founder wording, and Terms §16 notice.
- **Legacy code stays unrouted, not deleted.** `src/App.jsx` is the old dark landing page
  (it never mounted the trainer/client PWA under `src/pages` — nothing imports
  `src/context`), so nothing was reachable there except that page, which `/` replaces.
  `vite.config.js` keeps the PWA plugin (manifest, service worker); `index.html` carries the
  home title and description, and each page sets its own through `usePageMeta` (`meta.js`).
- **Universal links.** `public/.well-known/apple-app-site-association` (JSON, no extension, no
  comments) lists `applinks` for `SCJ422P9KZ.fitlink.app` with components `/i/*` and `/live/*`,
  plus `webcredentials`. `vercel.json` gives it `Content-Type: application/json` and
  `Cache-Control: public, max-age=3600`, and the SPA catch-all rewrite excludes it explicitly;
  `navigateFallbackDenylist` in `vite.config.js` holds `/^\/\.well-known\//` for the same
  reason (the service worker's default `navigateFallback` is `index.html`). The iOS build
  needs the `applinks:fitlink.coach` + `webcredentials:fitlink.coach` associated-domains
  entitlement; Apple's CDN fetches the file
  (`https://app-site-association.cdn-apple.com/a/v1/fitlink.coach`), so a change can take a
  day to reach phones.
- **Legal pages are routes, not files** (since 2026-10-16 evening; `public/terms.html`,
  `privacy.html`, `delete-account.html` and their rewrites are gone). `/terms` is the Terms
  of Service the app's Elite paywall and the web checkout link to; two bracketed founder
  placeholders (legal entity in §1, governing law and venue in §15) are highlighted with
  `<mark class="s-fill">`. `/privacy` is kept in step with fitlink-ios `docs/SUBMISSION.md`
  (App Privacy table): Apple Health only by choice, no Health Connect, 16+, and Stripe /
  Apple + RevenueCat / Google Gemini (the coach's assistant, after consent) / Supabase / APNs + Expo as the
  processors. Change the table, change `privacyContent.jsx`. Every address on the site is
  `support@fitlink.coach` (the iOS submission pack's mailbox); the getfitlink.com addresses
  are gone. **Open, founder decision before the next Vercel deploy:** `TERMS_UPDATED`
  (`legalMeta.js`) is 17 October 2026 and the Terms now say switching coach or deleting an
  account ends the pass with no refund of time already paid (In plain words, §3, §4, §5,
  §11), and that a season is billed a fixed number of payments and then stops, the plan no
  longer being part of a pass that stopped billing (In plain words, §4). §16 promises at
  least 14 days' notice for a material change and says the date at the top is when the
  version took effect: either give notice and show the later effective date, or record why
  §16's exception (required by law or a payment/platform partner) applies.
- **Plans for sale are `archived_at is null`** (`api.js plansFor`). An archived pass stays with
  its holders and in the coach's editor list (tagged "archived"); `create-subscription`
  refuses it on the server as well. The `42703` fallback in `plansFor` exists for a deploy that
  lands ahead of the `plans.archived_at` migration and can go once it is applied.
- **Publish carries the version.** The editor loads `plans.track_version` with the plan and
  passes it as `p_expected_version` to `publish_plan_track`; a `stale_version` error shows
  "This season changed on another device. Reload to see the latest before publishing." with
  Reload (the latest season replaces the screen) or Keep editing (the edits stay and the
  baseline becomes the latest track, so the next review lists everything a publish would
  change). Never publish without the version; never drop the coach's edits silently. The
  `PGRST202` retry with the three-argument RPC covers a deploy ahead of the migration.
- **Lint.** `npm run lint` fails on pre-existing errors in the legacy app (`src/pages`,
  `src/components`, `src/context`, `src/App.jsx`); the web pages are kept clean with
  `npx eslint src/web src/main.jsx vite.config.js`. The react-refresh rule wants a `.jsx`
  file to export only components: constants and hooks go in `.js` modules (`pricing.js`,
  `meta.js`, `legalMeta.js`).
- **Checking a build without the network.** `npm run build && npx vite preview --port 4173`,
  then headless Chromium through the globally installed Playwright (`createRequire` from the
  repo's package.json) renders every route; Google Fonts fail in the container (two console
  errors per page), everything else must be clean and `scrollWidth` must equal the viewport
  at 390 px. The delete flow can be driven with `page.route` stubs for `/auth/v1/*`,
  `/rest/v1/*` and `/functions/v1/*`. Apple flows: build with `VITE_APPLE_WEB_SIGN_IN=on`; stub
  `/auth/v1/authorize` with a 302 to the return path and `/auth/v1/token?grant_type=pkce` with a
  session.
- fitlink.coach is not reachable from the build container. After a deploy check
  `curl -sI https://fitlink.coach/.well-known/apple-app-site-association` (application/json),
  every route answers 200 with `text/html` (`/`, `/pricing`, `/athletes`, `/support`,
  `/privacy`, `/terms`, `/delete-account`, an unknown path → the 404 page), `/privacy` and
  `/terms` render their text, and the delete flow against a throwaway account.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Framework** | React | 19.2.5 |
| **Build** | Vite | 8.0.10 |
| **Routing** | react-router-dom | 7.14.2 |
| **Backend** | Supabase (Auth + Postgres + Realtime) | supabase-js 2.105.3 |
| **Icons** | Lucide React | 1.14.0 |
| **PWA** | vite-plugin-pwa | 1.3.0 |
| **CSS** | Vanilla CSS (no Tailwind) | — |
| **Fonts** | DM Sans + Plus Jakarta Sans (Google Fonts CDN) | — |

### No external UI libraries. No chart libraries. No Tailwind.
- All charts are custom SVG
- All icons go through `src/components/Icons.jsx` (Lucide wrappers with `Icon` prefix)
- Design system is in `src/index.css` with CSS variables

---

## Supabase Configuration

```
URL: https://qcmtaskhyhwzyoegtfpw.supabase.co
Key env var: VITE_SUPABASE_PUBLISHABLE_KEY
```

**Env file**: `.env` (gitignored)
**Client**: `src/lib/supabaseClient.js` — single `createClient()` export

### Database Tables (4 migrations applied)

| Table | Migration | Purpose |
|---|---|---|
| `trainers` | v1 | Trainer profiles (auto-created on signup via trigger). Has `onboarding_complete` flag (v4) |
| `clients` | v1 | Client records linked to trainer. Has `auth_user_id` for client portal (v3) |
| `plans` | v1 | Subscription plans (name, price, features JSONB) |
| `sessions` | v1 | Scheduled sessions (1-on-1, Group, Virtual) |
| `referrals` | v1 | Referral tracking with status/reward |
| `activities` | v1 | Activity feed entries |
| `conversations` | v2 | Messaging conversations (trainer ↔ client) |
| `messages` | v2 | Individual messages (Realtime enabled) |
| `exercises` | v2 | Exercise library (42 pre-seeded across 8 categories) |
| `workouts` | v2 | Workout templates created by trainers |
| `workout_exercises` | v2 | Exercises within a workout (sets, reps, rest) |
| `client_workouts` | v2 | Workouts assigned to clients |
| `workout_logs` | v4 | Client exercise logging (weight, reps, completed per set) |
| `progress_photos` | v5 | Before/after photos with category (front/side/back/other) |

**All tables have RLS** (Row Level Security) so trainers only see their own data, clients only see theirs.

**Migration files** (run in Supabase SQL Editor in order):
1. `supabase_migration.sql` — Core 6 tables + RLS + trainer auto-create trigger
2. `supabase_migration_v2.sql` — Messaging + workout builder + 42 exercise seeds
3. `supabase_migration_v3.sql` — Client portal support (auth_user_id + client RLS)
4. `supabase_migration_v4.sql` — Onboarding flag + workout_logs table
5. `supabase_migration_v5.sql` — Progress photos table + Supabase Storage bucket instructions

---

## Architecture

### File Structure

```
src/
├── App.jsx                    # Root — BrowserRouter → AuthProvider → role-based routing
├── main.jsx                   # Entry point
├── index.css                  # Design system (ALL CSS variables, base styles, utilities)
├── lib/
│   ├── supabaseClient.js      # Supabase client singleton
│   └── notifications.js       # Web Notifications API (permission, local notifs, reminders)
├── context/
│   ├── AuthContext.jsx         # Auth state, signIn/signUp/signOut, userRole detection
│   └── AppContext.jsx          # All trainer data, CRUD operations, computed values
├── components/
│   ├── Icons.jsx               # Lucide React wrappers (IconPlus, IconClients, etc.)
│   ├── Avatar.jsx              # Initials avatar with color hash
│   ├── BottomNav.jsx/css       # 5-tab mobile nav (Home, Clients, Messages, Workouts, Profile)
│   ├── Header.jsx              # Page header with back button
│   ├── StatCard.jsx            # Dashboard stat card
│   ├── ClientCard.jsx          # Client list item
│   ├── ProgressChart.jsx       # Custom SVG line + bar chart (dual mode)
│   ├── ProgressStats.jsx       # Horizontal stat chips (volume, streak, PRs, completion)
│   ├── PhotoUploadModal.jsx    # Photo upload with compression + category selector
│   ├── PhotoGallery.jsx        # Photo grid, full-screen viewer, before/after comparison
│   ├── InviteModal.jsx         # Referral invite (WhatsApp/SMS/Email/QR)
│   ├── AddClientModal.jsx      # Add client form (bottom sheet)
│   ├── BookSessionModal.jsx    # Book session form (bottom sheet)
│   ├── OnboardingWizard.jsx/css # 3-step trainer onboarding
│   ├── WorkoutBuilderModal.jsx # Workout creation/editing
│   └── ExercisePickerModal.jsx # Searchable exercise library picker
├── pages/
│   ├── LoginPage.jsx/css       # Email/password + Google OAuth
│   ├── DashboardPage.jsx/css   # Stats, revenue chart, sessions, activity feed
│   ├── ClientsPage.jsx/css     # Client list with search + status filters
│   ├── ClientDetailPage.jsx/css # Client profile, progress, sessions, plan, notes
│   ├── MessagesPage.jsx/css    # Conversation list
│   ├── ChatPage.jsx/css        # Real-time chat (Supabase Realtime)
│   ├── WorkoutsPage.jsx/css    # Workout template library
│   ├── ReferralsPage.jsx/css   # Referral tracking, tier system, leaderboard
│   ├── SubscriptionsPage.jsx/css # Plan management, MRR
│   ├── SchedulePage.jsx/css    # Week calendar + session timeline
│   ├── ProfilePage.jsx/css     # Trainer profile with inline editing
│   └── client/                 # Client portal (separate app shell)
│       ├── ClientContext.jsx    # Client-specific data provider
│       ├── ClientPortalLayout.jsx # Client app shell with own bottom nav
│       ├── ClientPortal.css     # Client portal styles
│       ├── ClientHomePage.jsx   # Client dashboard (today's workout, stats)
│       ├── ClientWorkoutsPage.jsx # Assigned workouts list
│       ├── ClientWorkoutDetailPage.jsx # Per-exercise set logging
│       ├── ClientMessagesPage.jsx # Chat with trainer
│       ├── ClientProfilePage.jsx # Client profile
│       ├── ClientSignupPage.jsx # Self-service signup with trainer code
│       └── ClientLoginPage.jsx  # Client login
├── data/
│   └── mockData.js             # Legacy mock data (still exists but NOT used — Supabase is live)
└── utils/
    ├── constants.js             # NAV_ITEMS, STATUSES, TIERS, etc.
    └── helpers.js               # formatCurrency, formatDate, formatRelativeTime, getInitials, etc.
```

### Routing Architecture

```
/ (BrowserRouter)
├── AuthProvider (wraps everything)
│
├── [NOT AUTHENTICATED]
│   ├── /client/signup → ClientSignupPage (public)
│   ├── /client/login → ClientLoginPage (public)
│   └── * → LoginPage (trainer login)
│
├── [AUTHENTICATED + role=trainer]
│   └── AppProvider → TrainerRoutes
│       ├── OnboardingWizard (if onboarding_complete === false)
│       ├── / → DashboardPage
│       ├── /clients → ClientsPage
│       ├── /clients/:id → ClientDetailPage
│       ├── /messages → MessagesPage
│       ├── /messages/:conversationId → ChatPage
│       ├── /workouts → WorkoutsPage
│       ├── /referrals → ReferralsPage
│       ├── /subscriptions → SubscriptionsPage
│       ├── /schedule → SchedulePage
│       └── /profile → ProfilePage
│
└── [AUTHENTICATED + role=client]
    └── ClientProvider → ClientRoutes
        ├── /client → ClientHomePage
        ├── /client/workouts → ClientWorkoutsPage
        ├── /client/workouts/:id → ClientWorkoutDetailPage
        ├── /client/messages → ClientMessagesPage
        └── /client/profile → ClientProfilePage
```

### Role Detection
- `user.user_metadata.role` — defaults to `'trainer'` if not set
- Clients sign up via `/client/signup` which sets `role: 'client'` in metadata

---

## Design System

### Colors (Dark Theme)
- **Background**: `--bg-primary: #111114` (warm dark, NOT pure black)
- **Cards**: `--bg-card: #1C1C1E` with `--border: 1px solid rgba(255,255,255,0.06)`
- **Accent**: `--accent: #FF5F3B` (warm coral, NOT neon lime)
- **Green**: `--green: #34C759` (iOS green)
- **Text**: `--text-primary: #FAFAFA`, `--text-secondary: #A1A1A6`, `--text-tertiary: #636366`

### Design Principles
- Inspired by **Everfit, Hevy, Fitbod** — clean, flat surfaces, NO glassmorphism, NO neon glow
- Subtle animations only (4px translateY fades, 200ms transitions)
- iOS-style bottom tab bar (no animated highlight bubble)
- Mobile-first, max-width 430px centered layout

### Icon Pattern
All icons imported from `src/components/Icons.jsx` with `Icon` prefix:
```jsx
import { IconPlus, IconClients, IconDumbbell } from '../components/Icons';
```
Lucide wrappers with `strokeWidth: 1.75`. WhatsApp is the only custom SVG.

---

## Key Patterns & Conventions

### Data Access
- **Trainer data**: `useApp()` hook from `AppContext` — all CRUD operations
- **Client data**: `useClient()` hook from `ClientContext`
- **Auth**: `useAuth()` hook from `AuthContext`
- **Direct Supabase**: Used in ChatPage, MessagesPage, WorkoutsPage for feature-specific queries

### Column Naming
- Database uses **snake_case** (`plan_id`, `joined_date`, `trainer_id`, `client_id`)
- JavaScript objects mirror the DB column names (no camelCase transformation)

### Modal Pattern
Modals use the `.modal-overlay` + `.modal-content` CSS classes from `index.css`:
```jsx
<div className="modal-overlay" onClick={onClose}>
  <div className="modal-content" onClick={e => e.stopPropagation()}>
    ...
  </div>
</div>
```

### Activity Logging
After mutations (addClient, addSession), activities are auto-inserted:
```js
await supabase.from('activities').insert({
  trainer_id: user.id,
  type: 'signup',
  message: `${data.name} was added as a new client`,
});
```

---

## What's Been Built (Complete Features)

1. ✅ **Auth** — Email/password + Google OAuth, role-based routing
2. ✅ **Trainer Dashboard** — Real analytics (retention rate, revenue, session completion)
3. ✅ **Client Management** — Add/view/edit clients, status filters, search
4. ✅ **Referral System** — Tier progress, leaderboard, invite modal (WhatsApp/SMS/Email/QR)
5. ✅ **Subscription Plans** — Plan cards with subscriber counts, MRR display
6. ✅ **Session Scheduling** — Week calendar, timeline, book session modal
7. ✅ **In-App Messaging** — Real-time chat via Supabase Realtime
8. ✅ **Workout Builder** — 42-exercise library, template creator, exercise picker
9. ✅ **Client Portal** — Separate app shell with home, workouts, messages, profile
10. ✅ **Workout Logging** — Per-exercise set tracking (weight/reps/completed)
11. ✅ **Trainer Onboarding** — 3-step wizard (profile → plan → invite)
12. ✅ **PWA** — Service worker, manifest, installable on home screen
13. ✅ **Push Notifications** — Session reminders (1hr before), message alerts
14. ✅ **Design Overhaul** — Everfit/Hevy-inspired, Lucide icons, warm coral palette
15. ✅ **Client Progress Analytics** — Volume charts, PRs, streaks, top exercises from real workout_logs
16. ✅ **Progress Photos** — Upload with compression, gallery grid, before/after comparison mode
17. ✅ **Deployment Config** — vercel.json with SPA rewrites, git initialized

---

## What's NOT Built Yet (Potential Next Steps)

| Priority | Feature | Notes |
|---|---|---|
| 🔴 | **Stripe Payments** | Paused per user request. Would enable in-app subscription billing |
| 🟠 | **Email Notifications** | Welcome emails, session reminders via Supabase Edge Functions + Resend |
| 🟡 | **Trainer Settings Page** | Working hours, notification prefs, plan management CRUD |
| 🟡 | **Workout Plan Templates** | "Push Day", "Pull Day" presets trainers can clone |
| 🟢 | **Code Splitting** | Bundle is 576KB — use React.lazy() to split by route |
| 🟢 | **Error Boundaries** | Graceful error handling |
| 🟢 | **Dark/Light Theme** | Currently dark-only |
| 🟢 | **Deploy to Vercel** | Config ready (vercel.json), needs GitHub push + Vercel connect |

---

## Build & Run

```bash
# Install
npm install

# Dev server (HMR)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

**Build output**: `576KB JS, 34KB CSS, 14 precached PWA entries`

**Git**: Initialized, first commit `b9a28eb`. No remote set yet — push to GitHub then deploy via Vercel.

---

## Common Gotchas

1. **Supabase key format** — The key is `sb_publishable_...` (non-standard format, but works)
2. **mockData.js still exists** — It's NOT used. All data comes from Supabase. Don't delete it (no harm keeping it as reference)
3. **PWA service worker** — Only generated on `npm run build`, not in dev mode
4. **Leaderboard is semi-static** — Uses the current trainer's referral count with offset names. Would need a multi-trainer query for real leaderboard
5. **Revenue chart is synthetic** — Extrapolates from current month using `totalMonthlyRevenue * 0.62/0.69/.../1.0` multipliers
6. **Google OAuth** — Configured in AuthContext but needs Google provider enabled in Supabase Dashboard → Auth → Providers
7. **Client signup flow** — Client enters trainer's referral code → signs up → auto-linked via email match to existing client record
