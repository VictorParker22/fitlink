# CLAUDE.md — FitLink Project Memory

> **Last updated**: 2026-10-16
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
- **Numbers come from `src/web/site/pricing.js`, nowhere else.** `STANDARD_FEE_PERCENT` 10,
  `ELITE_FEE_PERCENT` 5 and `FREE_ROSTER_CAP` 5 are what the server enforces
  (`platform_config.platform_fee_bps` 1000, `payment_split_for_trainer()` 500 bps on
  Elite, `enforce_roster_cap`); `ELITE_MONTHLY_USD` 29.99 / `ELITE_YEARLY_USD` 249 are the
  figures in fitlink-app `lib/revenuecat.ts` and App Store Connect is the truth: confirm
  before launch. In a dev build every rendered figure carries a red `[confirm]` marker
  (`NEEDS_CONFIRM = import.meta.env.DEV`); production never shows it. Quotes stay dashed
  placeholders and the footer says `[Legal entity name]` until the founder fills them.
  Illustrations (phone mocks, the money card) are `aria-hidden` and compute their sample
  arithmetic from the same constants.
- **Support answers must be true for the shipped product**: iPhone only, no Android app,
  card checkout by Stripe (no Apple Pay claim), no Apple Health, the assistant is Coach
  Elite and the coach sends every message, refunds through the app within 90 days of the
  payment, a coach who leaves refunds undelivered time automatically, one role per account
  (change `Support.jsx` "Can I also train with a coach?" and Terms §3 together when the
  two-mode account ships). The contact form composes a `mailto:` to `SUPPORT_EMAIL`; there
  is no ticket backend. The search filters the page's own questions.
- **Delete account is a real flow** (`DeleteAccount.jsx`, helpers in `api.js`): email →
  `signInWithOtp({ shouldCreateUser: false })` → code → `myRole()` (a `trainers` row →
  coach, a `clients` row → athlete) → coach: `departurePreview()` =
  `delete-trainer-account {preview: true}` (athletes, refund total; 3/hour, a 429 or a
  Stripe 502 is shown in words and the policy sentence stays) → checkbox → coach
  `deleteCoachAccount()` (the function, then `auth.getUser()` must fail before the page says
  Deleted; 2/day) or athlete `deleteAthleteAccount()` (`delete-account-media` best effort,
  then RPC `delete_client_account`) → local sign-out → Deleted. Never say "deleted"
  before the server answered. A session already in the browser skips the code.
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
  (App Privacy table): no Apple Health / Health Connect, 16+, and Stripe / Apple + RevenueCat /
  Google Gemini (the coach's assistant, after consent) / Supabase / APNs + Expo as the
  processors. Change the table, change `privacyContent.jsx`. Every address on the site is
  `support@fitlink.coach` (the iOS submission pack's mailbox); the getfitlink.com addresses
  are gone.
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
  `/rest/v1/*` and `/functions/v1/*`.
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
