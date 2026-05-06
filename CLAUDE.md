# CLAUDE.md — FitLink Project Memory

> **Last updated**: 2026-05-06
> **Project**: FitLink — Gym Trainer Referral & Client Management Platform
> **Location**: `c:\projects\fitlink`
> **Dev server**: `npm run dev` → http://localhost:5173 (or next available port)

---

## What is FitLink?

A **mobile-first PWA** for gym trainers to manage clients, send referral invites, track subscriptions, schedule sessions, build workouts, and message clients — all from one premium dark dashboard. Clients get their own portal to view workouts, log exercises, and chat with their trainer.

The project idea came from a conversation with a real gym trainer who wanted a referral/subscription system for their business.

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
