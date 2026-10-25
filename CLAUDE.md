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
  is the layout route (glass header with the brand mark + Home / Pricing / For athletes / Help,
  Sign in → `/coach`, "Claim a Founding spot" (or "Join as a coach" once Founding is full or closed) → `/founding` (W3); footer with Help · Privacy · Terms ·
  Delete account · `SUPPORT_EMAIL`; scroll-to-top; a `body` class so overscroll is
  cream). Pages: `Home.jsx` (`/`), `Pricing.jsx`, `Athletes.jsx`, `Support.jsx`,
  `Legal.jsx` (`/privacy`, `/terms`; text in `privacyContent.jsx` / `termsContent.jsx`,
  titles and section lists in `legalMeta.js`), `DeleteAccount.jsx`, `NotFound.jsx`.
  `site.css` is scoped under `.fl-site`; the root also carries `.fl`, so tokens, `.fl-btn`,
  `.fl-field`, `.fl-error` and the glass pill come from `web.css`. The Web-Home-Mobile
  artboard is the same page at 390 px: one column, the header pill becomes a box with the
  nav on its own row (`@media (max-width: 720px)`); keep every new section
  `minmax(min(Npx, 100%), 1fr)` so it collapses without horizontal scroll.
- **The brand is one file (launch plan W1, 2026-10-25; branch `launch/w1-brand-config`).** `src/web/site/brand.js`
  holds the name (`BRAND_NAME`), the mark letter (`BRAND_MARK`), the founder's first name, the host and origin
  (`SITE_HOST`, `SITE_ORIGIN`), the mailbox (`SUPPORT_EMAIL`), the App Store id and URL, the app's URL scheme
  (`APP_SCHEME`, re-exported by `supabase.js`), the manifest description and theme colour, and the share image
  (`OG_IMAGE_*`, `public/og-image.png`). Every page, the legal text (`termsContent.jsx`, `privacyContent.jsx`,
  `legalMeta.js`), the sign-in sentences (`appleAuth.js`), the coach page and its link previews import it.
  `index.html` carries tokens (`__BRAND_NAME__`, `__THEME_COLOR__`) and a `<!--site-head-->` marker that
  `vite.config.js` (`brandHtml`, `transformIndexHtml` order pre) fills from `brand.js` + `site/pageMeta.js`
  (`siteHeadTags`: title, description, og/twitter with the share image, NO canonical in the SPA shell, which answers
  every route); a token left behind fails the build. The PWA manifest's name, short name, description and colours
  come from `brand.js` too. `coachMeta.injectHead` drops the shell's og/twitter/canonical tags before adding a
  coach's, so an unfurler never reads the site's og:title first. `node --test src/web/brand.test.js` fails on any
  name, host, mailbox or App Store address spelled outside `brand.js` (comments excepted; `pricingConfig.json` is the
  server's byte copy and stays as it is). Storage keys (`fitlink-web`, `fitlink-web-*`) are NOT brand: renaming them
  would sign everyone out and drop parked checkouts. **The rename:** change `brand.js`, run `node scripts/og-image.mjs`
  (Playwright, local; not part of the build) to redraw the share image, then the owner's steps outside this repo (the
  AASA app id and domain, the Apple Services ID return URLs, Supabase redirect URLs, the mailbox, Vercel's domain).
- **The hero (launch plan W2, 2026-10-25; branch `launch/w2-hero`).** The home page's h1 is `HERO_LINE` ("Monday,
  handled.", `site/pageMeta.js`), and so is the home title (`HOME_TITLE` = "<name> — Monday, handled.", the share
  title of the shell) and the start of `HOME_DESCRIPTION`. The features section that used to carry the line is now
  "A to-do list that empties." (the line is said once).
- **Calls to action (launch plan W3, 2026-10-25; branch `launch/w3-founding-ctas`).** Every "get the app" call to
  action is `site/FoundingCta.jsx` → `/founding`: the header, the home hero and closing band, the Free plan on
  /pricing, the 404. It reads "Claim a Founding spot" (`FOUNDING_CTA`) while Founding is open, loading or its read
  failed (the page it opens says the truth), and "Join as a coach" (`JOIN_CTA`) once `founding.js foundingView` says
  full or closed (review 2026-10-25 M2): the counter's `open`, or the config's close day passed in its zone
  (`todayIn(FOUNDING_CLOSES_TZ)`), whichever says closed first. Every copy on a page shares ONE `founding_slots()` read
  (`site/useFoundingSlots.js`: a module store under `useSyncExternalStore`, started by the first component that mounts;
  the prerendered markup and the render that hydrates are the loading state with no date). The closing band's line is
  `PLAN_LINES.founding`, or `PLAN_LINES.free` once Founding is over. The App Store
  is linked ONLY in a build with `VITE_APP_STORE_LIVE=on` (`APP_STORE_LIVE`), through `site/AppStoreLink.jsx`: a plain
  text link, because Apple's marketing rules allow only the official badge artwork, unaltered, and it is not in the
  repo (the old hand-drawn "Download on the App Store" look-alike is gone; never draw one). Off, nothing names the App
  Store as where to get the app, and nothing tells anyone to get an app they can't get (review 2026-10-25,
  `site/appCopy.js`, `node --test src/web/site/appCopy.test.js`): the /athletes "Ready to train?" line is not rendered,
  its step 3 is "The app comes from your coach" ("The <name> iPhone app isn't public yet; your coach sends you the link
  when it's available."), the home FAQ and checkout's done step say the same instead of "get the app" / "Install …
  from the App Store". With the flag on: "Open the app", "then get the app to train", "Install … from the App Store".
  Owner: add Apple's badge SVG (Apple's marketing tools) to `public/` and draw it in `AppStoreLink`, then set the flag
  on Vercel when the app is public.
- **The home page's Founding card (launch plan W4, 2026-10-25; branch `launch/w4-founding-card`).** Where the
  bracketed testimonials were, `Home.jsx FoundingCard`: `PLAN_LINES.founding`, the live counter, three lines of the
  offer (numbers from pricing.js) and the site's `FoundingCta` ("Claim a Founding spot", "Join as a coach" once full or
  closed, as everywhere). The counter is the page's one read: `site/useFoundingSlots.js` (`useFoundingView`: the
  shared `founding_slots()`, undefined while loading, null on failure, `retry`, `reload`, `phase`, `mode`, `closesOn`) +
  `site/FoundingCount.jsx` (while loading an empty `role="status"` paragraph with `aria-busy` and its label, nothing
  numeric; "Couldn't load how many spots are taken." with Try again, "9 of 15 taken" with the meter, "All 15 spots are
  taken.", "Founding spots closed on …" with the counter's day, or the config's once that day passed).
- **Pricing and where Elite is bought (launch plan W5, 2026-10-25; branch `launch/w5-pricing`).** "Free to try.", the
  Founding column and the Founding series in the calculator were already there (PR 1 web, `launch/1-fee-engine-web`).
  W5 adds where Elite is bought, ONE source and ONE sentence true everywhere (owner decision R3, 2026-10-25: the iOS
  app offers the App Store purchase on EVERY storefront, and on the US storefront the web option beside it;
  elite-checkout sells to anyone, Stripe, US dollars): `site/planLines.js ELITE_WHERE.buy` = "Subscribe on the web
  from your coach dashboard (Stripe, US dollars), or in the iPhone app through the App Store.", the App Store clause
  ONLY with `VITE_APP_STORE_LIVE=on` (`eliteWhere(storeLive)`; review M1: off, the sentence is the web part alone);
  `manage`: Stripe receipt link vs Apple subscriptions. No region clause anywhere. Used by the Elite card and its
  question on /pricing, the Elite plan on /, and "How do I get Coach Elite?" on /support; pinned for both flags in
  `pricing.test.js` (never "billed through Apple" for everyone, never "web only"). /pricing's Founding plan says
  "Apply for a spot", or "Join as a coach" once Founding is full or closed (R4). Hard gate (`docs/DEPLOY_ORDER.md`):
  Terms §6 and the terms page's description (`legalMeta.js`) say Elite is sold through Apple, and the Privacy Policy
  says the same, so the founder's rename-day Terms (decision L8) go live with or before W5; this branch does not
  edit legal text.
- **The coach-page illustration (launch plan W6, 2026-10-25; branch `launch/w6-coach-page-mock`).** Beside "From link to
  first payout." a second phone shows a coach's page as `/c/<handle>` draws it (`Home.jsx CoachPageScreen`,
  aria-hidden, nothing focusable): `<SITE_HOST>/c/your-name`, "Your name" / "What you coach" (a placeholder, never a
  real or realistic coach), the Founding badge, an undated block of `BLOCK_DEFAULT_WEEKS` at 6 × `MINIMUM_CHARGE_USD`
  a month with the real page's price line ("$150 / month · 2 payments ($300 in all)"), a session at 2 × the minimum
  and the 24-hour cancel line, "Coached on <name>". Every value is `site/coachPageSample.js` (pure; the real page's
  `blocks.js` / `season.js` builders over pricing.js; `node --test src/web/site/coachPageSample.test.js`), and the
  caption under the phone says it is an example. No date in it (the static page and the browser draw the same).
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
  `src/web/pricing.test.js` (pinned today: fitlink-app commit d4b0267 on `launch/4-blocks`, `201ec4c3…72d5`); a copy without a new pin fails.
  The dev `[confirm]` marker (`NEEDS_CONFIRM = import.meta.env.DEV`; production never shows it) stays only on what is
  NOT in the config: `FOUNDING_MIN_PAYING_ATHLETES` and the founder's email promise on /founding. No quotes on the home page until a real coach gives one (W4
  removed the bracketed placeholders); the footer says `[Legal entity name]` until the founder fills it. Illustrations (phone mocks,
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
  `node --test src/web/founding.test.js`).** `/founding` in the site shell, where every coach call to action leads (W3).
  Server: fitlink-app migration `20261025110000` (threat model B38, A56–A58).
  - **After Founding: the coach sign-up (owner decision R4, 2026-10-25).** Once `foundingView` says full or closed
    (the counter's `open`, or the config's close day in `closes_tz`, whichever first; tests open / full / closed /
    full-and-closed / loading / failed), the page is "Join as a coach.": the counter's full or closed line, the plan
    (free: 10%, up to 5 paying athletes; Coach Elite optional, numbers from pricing.js), the SAME sign-in (email code
    with `FOUNDING_SIGN_UP_DATA`, or Apple back to `/founding`) and the SAME write rules (`isOwnSession`, Continue as a
    coach, `finishCoachSignUp`, nothing before the person acts), then "Your coach account is ready." with Open your
    coach dashboard (`/coach`) and, with `VITE_APP_STORE_LIVE`, the App Store link. No application, no spot. An
    application already on file (not withdrawn) keeps its status view. While the counter loads or fails before the
    close day the page stays the application (apply_founding refuses a full or closed house). The server refuses no
    coach sign-up when Founding is closed (read 2026-10-25: only `apply_founding` checks the close; `trainers` INSERT
    is `trainers_insert_own` + `guard_entitlement_columns`, `handle_new_user` reads only the `founding_web` marker).
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
  - **Brand.** The name comes from `src/web/site/brand.js` (see "The brand is one file" below).
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
    another pass) runs before any total exists, and the coach page still shows plans.price per payment. Since the blocks
    review (2026-10-25) neither the invite page nor the sheet before create-subscription's answer prints a "($X in
    all)" total (`blocks.js priceLine` `serverTotal`): nothing they read says whether the coach uses Model B, so a
    total made from plans.price could be short. The coach page PR (3) shows `coach_page`'s `total_cents`. The cap in words (`SIXTH_ATHLETE_RULE`): the 6th paying athlete pays and
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
  - Checks: `node --test src/web/*.test.js src/web/admin/*.test.js src/web/site/*.test.js`, eslint, build, and the headless run (390 and 1280 px; pricing at three
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
- **Blocks and single sessions, the web half (2026-10-25, launch plan Sprint 1 PR 4; server: fitlink-app PR #14 branch
  `launch/4-blocks` d4b0267, migration `20261025120000`, rollout `supabase/manual/ROLLOUT_20261025_blocks.md`, threat
  model B39, A59–A61 — NOT live yet).** Branch `launch/4-blocks-web`, stacked on `launch/1-fee-engine-web`. Words and
  rules in `src/web/blocks.js` (`node --test src/web/blocks.test.js`); the payment count in `season.js`.
  - **What a pass is.** `plans.kind` 'block' | 'session', fixed once it exists (`guard_plan_shape` `kind_fixed`: no page
    offers to change it). A block with `duration_weeks` bills `price` monthly for P payments; with `starts_on` it is
    DATED (week 1 = that day for everyone). A block without a length is the open pass (renews until cancelled). A
    session is ONE payment at `session_at` (NULL = "Time arranged with <first>") for `session_minutes` (5..720).
  - **Numbers from the config** (`pricing.js`): `BLOCK_DEFAULT_WEEKS` 8, `BLOCK_SALE_OPENS_DAYS_BEFORE` 90,
    `SESSION_FREE_CANCEL_HOURS` 24, the $25 `MINIMUM_CHARGE_USD`.
  - **How many payments.** `season.js datedBlockPayments` is the server's (`_shared/season.ts`, the jest table pinned in
    `season.test.js`): a dated block's purchase is billed its billing dates (the purchase, then start-or-purchase + k
    months) that fall before the block ends, at least 1, at most P (L6: a $640 8-week block is "$320 / month · 2
    payments ($640 in all)"; joining in the last weeks is one payment). Before a purchase the page predicts it
    (`blocks.js paymentsFor`); once create-subscription answers, its `seasonPayments` is the number on every line.
  - **Coach page** (`CoachPublicPage.jsx`): a block card says "Starts Dec 1 · 8 weeks" ("Started …" once week 1 began,
    "8 weeks · starts when you join" undated) and "$320 / month · 2 payments" (one payment: "$320 · one payment ·
    nothing renews"; no "($640 in all)" on this page: the Model B gate above); a session card "Session · Thu, Dec 3,
    6:00 PM EST · 60 min · $40". A block's day is a calendar day (UTC noon, the server's rule) and a session's time is
    the viewer's zone, named (`timeZoneName: 'short'`); a date more than ~6 months away carries its year (the iOS
    `dateText` rule). A pass priced above $0 but under `MINIMUM_CHARGE_USD` (made before `guard_plan_minimum`; live has
    $1, $5 and $20 unarchived ones) is listed with "No longer on sale. Ask <first>." and no button (`belowMinimum`;
    create-subscription answers 409 `below_minimum`). The heading is "Pick a pass." (a block may start later). A dated block outside its window is LISTED, not buyable: "On sale from
    <90 days before>" / "Sign-ups closed <last sign-up day>" (an open one says "Sign-ups close …"). A session that has
    started is NOT listed. With a session listed, "Cancelling a session": the platform rule ("Cancel up to 24 hours
    before for a full refund.") and the coach's own policy from `trainers_public.cancellation_policy`, rendered as text
    (a failed read says so with Try again; none written says to ask the coach). Buttons: "Join the block", "Book this
    session", "Buy <name>" (open pass).
  - **Checkout** (`Checkout.jsx`): the line under the title is "Starts Dec 1 · 8 weeks · $320 / month · 2 payments ($640
    in all)" / "Session · … · $40 · one payment · nothing renews"; the charge line "$320 today, then monthly from one
    month after the block starts: 2 payments in all. Billing stops after the block." (after the start: "then
    monthly: …"; one payment: "One payment for the block."; a session: "One payment for this session." + the 24-hour
    rule, or the coach's policy for a session with no time). Model B: the server's total with "(includes a $4 booking
    fee)". `assertSellable` (`blocks.js saleCheck`: unpriced, under the minimum, outside the sale window) refuses BEFORE
    anything can end a pass ("… Nothing was changed."); create-subscription's 409 `session_over` / `block_closed` /
    `block_not_open` (and `below_minimum`) are final and shown in the server's words. No date of a later payment is
    computed on the web. "($640 in all)" appears only once create-subscription answered (its `amountCents` ×
    `seasonPayments` for Model B). Paying what is owed on a held pass (`payingOpenInvoice`) shows "<pass> · you owe
    $X", "$X today, for the payment you owe on the pass you hold." and no predicted payment count (the iOS rule).
  - **The switch can't end a pass for a purchase that would be refused (review 2026-10-25, BLOCKING).** The athlete-exit
    preview AND confirm send `planId` (`api.js previewInvite(code, {planId})`, `acceptInvite(code, {confirm, planId})`;
    fitlink-app `launch/4-blocks` adds it): the server refuses, before ending anything, a plan create-subscription would
    refuse (archived, unpriced, under the minimum, outside its sale window, a session starting within ~5 minutes) with
    create-subscription's code and sentence plus "Nothing was changed."; the sheet shows it as sent (final codes: Close
    only). Belt and braces: `confirmSwitch` reads the plan again (`api.js planNow`) and re-runs `saleCheck` right before
    `join(true)`: gone / archived / another coach's → "<pass> is no longer on sale. Ask <first>. Nothing was
    changed."; a failed read → "We couldn't check that <pass> is still on sale. Nothing was changed." with Check again.
    Deploy this only with (or after) the server's `planId` change; an older athlete-exit ignores the field.
  - **Season editor** (`SeasonEditor.jsx`; RLS read on live 2026-10-25: `plans_insert` / `plans_update` admit
    `trainer_id = auth.uid()`, `trainers_update_own` the coach's own row, the same direct writes the iOS app makes).
    **New pass** inserts a block (name, price per month ≥ $25, length default 8, start date and last sign-up day
    optional; the last sign-up day needs a start and falls on or before the block's last day) or a session (price,
    date/time optional, minutes default 60), sending only the columns its kind allows (`newPassRow`). **Edit dates** /
    **Edit time** patch `starts_on` + `enrollment_closes` or `session_at` + `session_minutes`, never `kind`. A
    datetime-local input is read and shown in the viewer's IANA zone (`blocks.js localInputToIso(v, timeZone)` /
    `isoToLocalInput`, Intl offsets, not the machine's clock rules, so tests pin fixed zones), with "Times are in
    America/New_York (EST)." under it (`timeZoneNote`). The held-session note: "Once booked, the time can't be cleared
    or moved into the past. Any change lets the athlete cancel for a full refund until it starts." A dated block's coach
    line says "Athletes pay up to 2 monthly payments (up to $640); later joiners pay fewer" (`coachPriceLine`, and
    "up to" in `lengthChangeLine`). A new week count whose end falls before the last sign-up day
    (`plans_enrollment_closes_window`) is said in the review and after publishing: "The last sign-up day is after the
    new end. Move it first (Edit dates)." (`lengthBreaksSignUpWindow`, `lengthWriteError`). The
    server's refusals are shown from HINT (`planWriteError`: `block_has_holders`, `session_held`, `below_minimum`,
    `elite_required`, `kind_fixed`), CHECK names in words, 42703/PGRST204 = "not available on the server yet". A
    session has no weeks: its page is the details (no grid, no publish bar). A pass with an empty track opens as its
    weeks, none marked rest. **Cancellation policy** edits `trainers.cancellation_policy` (≤ 600, "saved" only when the
    row came back). The athlete's cancel-session UI is the apps' (no athlete account area on the web).
  - Checks (2026-10-25): `node --test src/web/*.test.js` 96/96 (in UTC, Tokyo, Honolulu); eslint clean; build; headless
    (390 / 1280, `timezoneId` America/New_York) 101/101: block cards future / in progress / closed / not yet on sale /
    one payment, sessions with and without a time, a started session unlisted, the policy (text, none, failed read,
    no section without sessions), checkout with `seasonPayments` 1 / 2 / 3, a session, a Model B session, each 409,
    editor create block / session / session without a time, the $25 minimum on the page and from the server, held
    block and held session refusals, a later time saved, the policy read and save and a refused save. After the review
    fixes (same day): `node --test src/web/*.test.js` 98/98 in UTC, Pacific/Kiritimati, America/Los_Angeles,
    Asia/Tokyo and Pacific/Honolulu; headless 132/132, adding sub-$25 cards, the planId on preview and confirm, a confirm
    refused at a session's start (server stubbed), a preview refused, the re-read before confirm (repriced, archived,
    failed), the zone label and wording, the owed-payment line, no "in all" before the server's answer and the Model B
    total after it, and the dated block's "up to".
  - **Deploy order:** after fitlink-app migration `20261025120000` and its functions (create-subscription first, and
    athlete-exit with `planId`). Before it, plans carry no `kind` (every pass reads as a block), New pass answers "not
    available on the server yet", and the policy column is missing (the page shows no policy). The Help / Terms copy
    still speaks of "seasons" and has no session refund rule: founder wording (Terms §16 notice), listed below.
  - **Terms to update (founder wording, for the rename-day Terms version; do NOT rewrite legal text from a feature
    PR).** Each says only "seasons" and open passes, has no single sessions, no 24-hour rule and no "block":
    - `termsContent.jsx` §4 "Passes and subscriptions": "What a pass is" (open pass or season; add blocks with a start
      date and last sign-up day, and single sessions as one payment), "Renewal" (a session never renews; a dated block
      joined late is fewer payments), "Cancelling" (a session: full refund up to 24 hours before its time, in the app;
      inside that, or with no time set, the coach's own cancellation policy shown on their page).
    - `termsContent.jsx` §5 "Refunds": the coach-discretion and 90-day lines need the platform's 24-hour session rule
      beside them, and the minimum charge ($25 per payment) belongs with "Payments".
    - `Support.jsx` lines 41–42 ("What kinds of pass can I sell?", "What happens when a season's payments are done?"),
      56 and 81 ("How do athletes cancel?" / "How do I cancel?": a session's 24-hour rule), 82 ("What happens when my
      season ends?") and 83 ("Can I get a refund?": a session cancelled 24+ hours ahead is refunded in full) say
      "season" and never "block" or "session".
    - Then bump `TERMS_UPDATED` (`legalMeta.js`) under §16's notice rule.
- **The coach page, /c/<handle>, the web half (2026-10-25, launch plan Sprint 1 PR 3; server: fitlink-app PR #15 branch
  `launch/3-coach-page` e50dc7a, migration `20261025130000`, function `coach-og`, rollout
  `supabase/manual/ROLLOUT_20261025_coach_page.md` (the contract), threat model B40, A62–A66 — NOT live yet: read on live
  2026-10-25, no `trainers.handle`, no `coach_page`, and the fee engine / blocks migrations are not applied either).**
  Branch `launch/3-coach-page-web`, stacked on `launch/4-blocks-web`. Pure rules in `src/web/coachPage.js` +
  `src/web/handles.js` (`node --test src/web/coachPage.test.js`), link previews in `src/web/coachMeta.js` +
  `api/coach-meta/[handle].js` + `src/web/linkPreviewBots.js` (`node --test src/web/coachMeta.test.js`).
  - **The page** (`CoachPage.jsx`, outside the site shell: no marketing nav). One hero (photo: `avatar_url` only when
    `safeImageUrl` passes: https, no credentials, AND on our own origins, this project's public Storage
    (`<SUPABASE_URL>/storage/v1/object/public/…`, the configured URL, where every live `avatar_url` was on 2026-10-25) or
    `SITE_ORIGIN`; anything else is not drawn (initials), so a coach cannot point the page at a host that logs visitors
    (review m5); name; sport = `specialization`, else up to three
    `specializations`; the Founding 15 badge from `founding_member`; "Next block starts Dec 1" from
    `next_block_starts_on`), the passes, "Cancelling a session" when a session is listed (the coach's
    `cancellation_policy` from the same answer, as text), and the footer "Coached on <BRAND_NAME> · Start coaching →"
    (→ `/founding`). No bio, no how-it-works (owner: "one hero, blocks below, nothing else"). Every number is
    `coach_page`'s: the big price is `total_cents` per payment, the line under it "$320 / month · 2 payments ($640 in
    all)" from that total (`blocks.js priceLine` with `serverTotal: true`), Model B's fee as "Includes a $12 booking fee
    on each payment." (a session: "Includes a $4 booking fee."), and `buyable` / `on_sale` decide the button (not on sale →
    "On sale from …"; `takes_cards` false → "<first> isn't taking card payments yet", said once above the cards too). A
    pass whose `total_cents` is not `price_cents + booking_fee_cents` is shown without a total and not sold. `{found:
    false, redirect}` → `navigate(replace)` to `/c/<new>` (query kept); `{found: false}` or a handle that cannot be a page
    (checked before any call) → the 404 page; a refusal (`rate_limited`, the server's HINT) or a failed read → "Couldn't
    load this page" with Try again. A handle typed in capitals is replaced by the page's own (`/c/Dana` → `/c/dana`).
    Brand: every sentence takes the name from `brand.js` (W1, below).
  - **Buying** reuses `Checkout.jsx` (not a fork): `pageHandle` in place of `code`. The invite code comes from
    `page_invite(handle)` (it renews or makes the coach's standing link: a write) only after the person acted (their own
    code typed in the sheet, their own Apple return, or Continue under "Signed in as …") and after the page's sale checks,
    right before the athlete-exit preview; `{ok: false, code, error}` is shown as sent + "Nothing was changed.", and so is a
    call that never reached the server (review m6)
    (`page_not_found` final, `rate_limited` Check again). Then the same flow: athlete-exit preview / confirm with
    `planId`, `create-subscription {planId, clientId, source: 'coach_page', pageSession}` (`api.js createSubscription(…,
    {fromPage, pageSession})`), PaymentElement, confirm-subscription. The sheet uses the page's total (`pageTotal`) from
    its first line, so "($640 in all)" and the title price are the server's before the card form; create-subscription's
    answer replaces it, and once it answered (a client secret) it is the ONLY total: without `amountCents` the Pay
    button is plans.price, never the page's total read earlier (review m4). Apple parks `{v: 2, handle, planId, name}` (`appleAuth.js parkedCheckoutValue`; v1 still parks a
    code) and `/join` moves back to `/c/<handle>`, which reopens the sheet. `/i/:code` is unchanged.
  - **The funnel** (`log_page_event`, `api.js logPageEvent`: never awaited, never throws). The page session is 24 random
    bytes as 32 base64url characters in sessionStorage `fitlink-web-page-session` (one per tab, kept across reloads and
    the Apple return). `page_view` once per page load (per handle, after a redirect only the new one), `pass_tap` on a
    Buy tap with the pass id, `checkout_start` once when the card form opens (`Checkout onCardForm`). The referrer is
    `document.referrer`'s host only (`referrerHost`), utm_source / medium / campaign from the URL, cleaned and cut at 100
    (`utmFrom`); `eventParams` builds only what the server accepts (`paid` is the server's). Nothing is logged while the
    stored session's uid is the coach's own (the coach previewing their page).
  - **Link previews, for bots only (review 2026-10-25 M1).** Unfurlers don't run JavaScript, so `vercel.json` rewrites
    `/c/:handle` to the Node function `api/coach-meta/[handle].js` (`/api/coach-meta/:handle`) ONLY when the
    `user-agent` matches `src/web/linkPreviewBots.js` (`LINK_PREVIEW_UA_PATTERN`: facebookexternalhit, which Apple
    Messages also sends, Facebot, meta-external*, Twitterbot, Slackbot, Discordbot, WhatsApp, TelegramBot,
    LinkedInBot, Pinterestbot, Applebot, Googlebot, bingbot, …; in-app BROWSERS such as Instagram's are people and left
    out). Everyone else falls through to the SPA catch-all: a person never waits on the function, and coach_page's anon
    budget (300/h per ADDRESS; the function calls from Vercel's addresses) is spent only on unfurls. The pattern is
    case-sensitive with no `(?i)`, no lookaround and `.*` at both ends, because Vercel does not document whether a
    `has` value takes inline flags or is anchored; a test keeps vercel.json's value equal to the module and simulates
    the routing (bot → function, browser → index.html, `?spa` first). Untested on a real deployment (the `has` match
    does not run in `vercel dev`): see `docs/DEPLOY_ORDER.md`. The handle is the PATH segment (`requestHandle`), never a
    query parameter a visitor can add (review m3); the dynamic-route form `/api/coach-meta/[handle]?handle=` is read only
    with exactly one `handle`, else the plain page. The function serves the built `dist/index.html` (from its own files,
    `includeFiles`, `functions` key `api/coach-meta/*.js`; else fetched from this deployment's own origin,
    `VERCEL_PROJECT_PRODUCTION_URL` in production / `VERCEL_URL` otherwise, never the request's Host) with `<title>`,
    description, canonical, `og:*` (image = `<SUPABASE_URL>/functions/v1/coach-og?handle=<h>`, 1200 × 630) and
    `twitter:*` from `coach_page` (publishable key, 2.5 s cap), every value cleaned (`cleanText`) and escaped
    (`escapeHtml`), and put into the head with a replacement FUNCTION (a string would read `$&`, `` $` ``, `$'`, `$$` in a
    name as patterns and copy the template's head into the tags: review m1). `coach_page` answers are kept per instance
    60 s by normalised handle (500 handles at most, oldest out; concurrent misses share one call; a failure is not
    kept). A retired handle answers 307 to the new page (the visitor's query kept), no page 404 + noindex with the SPA:
    both `s-maxage=30` with no stale-while-revalidate (a coach who claims or takes down a name is seen within 30 s,
    review m2); a page 300 s (SWR 600); any failure the plain index.html (30 s). The body never depends on the query, but
    Vercel's CDN keys on the full URL, so `fbclid` still splits the edge cache: the in-memory answers cover the cost.
    With no template at all the answer is a 307 to `/c/<h>?spa=1`, which the first rewrite serves as the plain SPA (the
    page drops the marker). The SPA catch-all excludes `api/` as well as the AASA file (the first preview deploy,
    2026-10-25, answered `/api/coach-meta/<h>` with the static index.html: the catch-all had swallowed the function);
    eslint runs on `api/` with Node globals.
  - **Your page on /coach** (`CoachPagePanel.jsx`, under the Elite panel): the current `trainers.handle` (own row; 42703 →
    "Coach pages aren't available on the server yet."), the address `<SITE_HOST>/c/<handle>` (`brand.js SITE_HOST` /
    `SITE_ORIGIN`), Copy link, Open page; the field lower-cases as typed and drops a leading @ (`handleFieldValue`), says
    format problems (`handleHint`, never availability) and previews the new address; `set_handle` answers in words
    (`setHandleOutcome`: refusals as sent, `changed: false` → "That's already your page's name.", a change says the old
    link sends people to the new one for a year); an answer that never came → "isn't clear whether your page's name
    changed" + Check again. "Take my page down" asks a second time, then `set_handle(null)`. Nothing is suggested or saved
    for the coach. Under the field, `PAGE_INVITE_NOTE`: the page uses the coach's standing invite link, and if the
    coach revoked it, `page_invite` makes a new one the first time an athlete starts to join (threat model A64; review
    m7). Last 30 days from `my_page_stats(30)`: Opened your page / Tapped a pass / Reached the card form /
    Paid (distinct browser sessions; paid = subscriptions), with the note that the first three are browser-reported.
  - Checks (2026-10-25): `node --test src/web/*.test.js` 112/112 in UTC, Asia/Tokyo, Pacific/Honolulu,
    America/Los_Angeles, Pacific/Kiritimati; eslint clean (`npx eslint src/web src/main.jsx vite.config.js api`); build;
    the function against the built `dist/index.html` with a stubbed fetch; headless (390 / 1280, America/New_York)
    84/84: found (block, session, not on sale, open pass, Model B, no cards, unsafe photo), redirect, not found, a bad
    handle, rate-limited, Buy signed out (order verify → page_invite → preview → confirm → create-subscription, planId,
    source / pageSession, the total before the card form), Buy with a stored session (nothing before Continue),
    page_invite refusals, events (once, referrer host only, same key on reload, none for the coach), dashboard set /
    taken / invalid / rate-limited / no answer / create / take down / stats / stats refused / before the migration, and
    `/i/CODE` unchanged.
    After review 1 (same day): `node --test src/web/*.test.js` 117/117 in UTC, Pacific/Kiritimati and
    America/Los_Angeles (adding `$` patterns in the head, the answer cache, the path handle, 30 s on 404/307, the photo
    origins, vercel.json's bot rule with a routing simulation: a bot reaches the function, a browser and Instagram's
    in-app browser get index.html); the function with the built template for iMessage / WhatsApp vs Safari / Instagram
    UAs (one coach_page call for two unfurls); headless 92/92 (adding a tracker photo not drawn or requested, a Storage
    photo drawn, the Pay label after a create-subscription without `amountCents`, page_invite with no connection, the
    panel's invite note).
  - **Deploy order (`docs/DEPLOY_ORDER.md`):** after fitlink-app migration `20261025130000` and `coach-og` (and
    create-subscription / stripe-webhook / confirm-subscription with `_shared/pageEvents.ts`), AND after the operator
    inserted the new product name and its variants into `reserved_handles` (rollout step 2): this site is what lets a
    coach pick a handle. Before the migration `/c/*` says coach pages aren't available and the panel says the same.
- **The operator dashboard, /admin (2026-10-25, launch plan Sprint 1 PR 6; server: fitlink-app branch
  `launch/6-funnel-dashboard`, migration `20261025140000`, rollout `supabase/manual/ROLLOUT_20261025_dashboard.md` (the
  contract and every definition), threat model B41, B42, A67 — NOT live yet).** Branch `launch/6-funnel-dashboard-web`, stacked
  on `launch/3-coach-page-web`. Owner spec: "One admin page from the item-3 events: coaches activated (first paid
  athlete), athletes per coach, GMV, page funnel with drop-off per stage. Done when: Victor reads it Sunday night without
  asking engineering."
  - **Files.** `src/web/admin/AdminDashboard.jsx` (route `/admin`, outside the site shell, linked from nowhere; a robots
    `noindex, nofollow` meta while mounted and `vercel.json`'s `X-Robots-Tag` + `Cache-Control: no-store` for `/admin`
    and `/admin/(.*)`, which covers `/admin/`; the service worker still answers later visits from its `index.html`, so the
    meta is what covers those),
    `admin.css` (scoped under `.ad`, CSS bars, the coach table turns into labelled blocks under 720 px),
    `adminModel.js` (every number and sentence; `node --test src/web/admin/adminModel.test.js`), `targets.js` (Victor's
    targets with their column labels "Week 4 (Dec 6)" / "Dec 31", plain text: edit them there only), `api.js` `adminScorecard` / `adminCoaches` /
    `adminPageFunnel`.
  - **Who reads it is the server's.** Sign-in is the email code of an EXISTING account (`shouldCreateUser: false`); no
    Apple button (Apple's return paths are fixed and `/admin` is not one; an Apple-only operator signs in with the code
    sent to the account's email). `freshUser()` decides the session; an unfinished Apple sign-up is left as on `/coach`
    (the one write the page can make, the site-wide rule). The three reads answer `not_admin` (P0001, HINT) unless
    `platform_admins` holds the account: then "This account isn't an operator account." with Sign out and no number. The
    page writes nothing else. Every other failure is the section's own sentence with Check again (`rate_limited` the
    server's HINT, no connection, `not_deployed` before the migration); a 401 goes back to sign-in with the expired
    sentence.
  - **Layout:** the scorecard first (a month picker, 2025-01 .. this month UTC; each number for the month and the month
    before, its one-line definition from the server's `definitions`, Victor's targets as text, and the server's
    `not_in_data` lines: Stripe fees, Elite subscriptions, Venmo), then the page funnel (7 / 30 / 90 days; sessions per
    stage, bars relative to the largest stage, "N% dropped off" and the share of page openers, a negative drop-off said as
    "more than the stage before"; top referrer hosts and UTM sources as counts), then the coaches (name, handle, activated,
    paying athletes 30 d, GMV, payments, plan, the funnel as "2 → 1 → 1 → 1"). Money from cents. A value the server sent
    as null is never 0 or 0%: the row says why ("No coach was activated by then.", "No coach was activated the month
    before."). Both month columns carry their own detail and notes (review 1, L1: the month before showed a bare figure).
  - **Review 1 (2026-10-25).** Revenue is "Platform revenue (fees + web Elite, before Stripe fees)": the server's
    `total_cents` (fees + `elite_payments`), with commission, booking fees and web Elite ("no web Elite invoices" when the
    month had none) beside it; when the month's payments have no recorded fee the server answers null and the page draws
    "—" with "No fee number: the month's N payments ($X) were recorded before fees were tracked." (never $0.00); App Store
    Elite is said to be missing (RevenueCat), web Elite refunds stand beside it, not subtracted. Paying athletes per coach
    reads "N paying athletes over M activated coaches (K with one)". Test accounts the operator listed on the server
    (`dashboard_excluded_trainers`) are left out of every number; the scorecard, funnel and coach summary say how many
    ("1 test account is left out."), and `definitions.test_accounts` heads the "Not in this data" list.
  - Checks (2026-10-25, after review 1): `node --test src/web/*.test.js src/web/admin/*.test.js` 129/129; eslint clean;
    build; headless (390 / 1280) 122/122 with stubbed RPCs (also: a month with no known fee, the month before's notes, a
    listed test coach): signed out (no read before a session, the code for an existing account only),
    operator (order, every metric, definitions, targets, not-in-data, funnel, coach rows, the month and window arguments,
    no writes, no horizontal scroll), non-operator, a failed read and Check again, rate limited, no connection, an expired
    session, empty data, the server before the migration.
  - **Deploy order (`docs/DEPLOY_ORDER.md`):** after fitlink-app migration `20261025140000`, the redeploy of
    `stripe-billing-webhook`, the operator's own `platform_admins` row (live has none) and the test coaches listed.
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
