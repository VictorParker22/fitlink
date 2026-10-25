# Deploy order: the site after the server

The site (Vercel, `fitlink.coach`) describes and calls server rules. It goes out only after
the server pieces it depends on are live, in this order. Each step is the operator's; nothing
here deploys anything.

## Fee engine + Founding (launch plan PR 1 and PR 2, 2026-10-25)

Branches: fitlink-app `launch/2-founding` (stacked on `launch/1-fee-engine`); this site
`launch/1-fee-engine-web` (stacked on `launch/2-founding`). Server rollouts:
fitlink-app `supabase/manual/ROLLOUT_20261025_fee_engine.md` and
`ROLLOUT_20261025_founding.md`.

1. fitlink-app migration `20261025100000_fee_engine.sql` (`coach_fee_terms()`, the fee
   columns on `payments`, `coach_billing`, the cap as a paywall, `pricing_config()`).
2. fitlink-app migration `20261025110000_founding.sql`.
3. `elite-checkout` and `stripe-billing-webhook` deployed, with their secrets set first:
   `STRIPE_ELITE_MONTHLY_PRICE`, `STRIPE_ELITE_YEARLY_PRICE` (both functions),
   `STRIPE_BILLING_WEBHOOK_SECRET` (the webhook; `--no-verify-jwt`; its own "Your account"
   destination, never the Stripe-Payments one), as the fee engine rollout's step 5 says.
   The other functions that bundle the fee engine's `_shared` files are redeployed as that
   rollout's step 4 lists.
4. Then this site.

Before step 4: `/pricing` describes rules the server does not enforce yet (on live the
cap still refuses), `/coach`'s Elite panel says Elite on the web isn't available, and
`/coach/earnings` falls back to the pre-engine columns.

## Coach page /c/<handle> (launch plan PR 3, 2026-10-25)

Branches: fitlink-app `launch/3-coach-page` (PR #15, stacked on `launch/4-blocks`); this site
`launch/3-coach-page-web` (stacked on `launch/4-blocks-web`). Server rollout:
fitlink-app `supabase/manual/ROLLOUT_20261025_coach_page.md`.

1. Everything above, and the blocks migration `20261025120000` with its functions (the
   coach page migration applies only after it).
2. fitlink-app migration `20261025130000_coach_page.sql` (`trainers.handle`, `set_handle`,
   `coach_page`, `page_invite`, `log_page_event`, `my_page_stats`).
3. The operator inserts the NEW product name and its variants into `reserved_handles`
   (rollout step 2), BEFORE this site ships: the dashboard here is where a coach picks a
   handle, and a reserved row added later never evicts a coach who already holds the name.
4. `coach-og` deployed (`--no-verify-jwt`), then `create-subscription`, `stripe-webhook`,
   `confirm-subscription` (they bundle `_shared/pageEvents.ts`: the `paid` stage).
5. Then this site. Vercel runs `api/coach-meta/[handle].js` (the link-preview tags for
   `/c/:handle`, `includeFiles: dist/index.html`) ONLY for link-preview bots: `vercel.json`
   rewrites `/c/:handle` to `/api/coach-meta/:handle` when the user agent matches
   `src/web/linkPreviewBots.js` (a test keeps the two equal); people get the SPA from the
   CDN. The function reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` at run time
   when set (else the same defaults as the browser). After the deploy:
   - `curl -s -A 'facebookexternalhit/1.1' https://fitlink.coach/c/<a real handle> | grep og:`
     shows the coach's tags (the `has` header match runs only on a deployment, not in
     `vercel dev`, and whether Vercel's matcher is case-sensitive is undocumented, so check
     this one on the deployment);
   - `curl -s https://fitlink.coach/c/<a real handle> | grep og:` (curl's own user agent, a
     "person") prints nothing: the plain SPA;
   - `curl -sI -A 'Twitterbot/1.0' https://fitlink.coach/c/nobody-xyz` answers 404 `text/html`
     whose head carries `<meta name="robots" content="noindex">`;
   - `curl -s https://fitlink.coach/api/coach-meta/<a real handle> | grep og:title` shows the
     coach's title, and `curl -sI` on it has no `etag` / `content-disposition: …index.html` (those
     mark the static file: the catch-all must leave `api/` alone; the first preview deploy did not).
     Vercel strips `s-maxage` from what the client sees (`cache-control: public, max-age=0` on the
     preview, 2026-10-25), so the 30 s / 300 s edge times are not visible in `curl -I`;
   - `/.well-known/apple-app-site-association` is still `application/json`, and a link pasted
     into iMessage shows the coach-og card.

Before step 2: `/c/*` says coach pages aren't available yet, and `/coach`'s "Your page"
panel says the same.

## Operator dashboard /admin (launch plan PR 6, 2026-10-25)

Branches: fitlink-app `launch/6-funnel-dashboard` (stacked on `launch/3-coach-page`); this site
`launch/6-funnel-dashboard-web` (stacked on `launch/3-coach-page-web`). Server rollout:
fitlink-app `supabase/manual/ROLLOUT_20261025_dashboard.md`.

1. Everything above (the dashboard migration applies only after the coach page's `20261025130000`).
2. fitlink-app migration `20261025140000_admin_dashboard.sql` (`admin_scorecard`, `admin_coaches`,
   `admin_page_funnel`; the server-only tables `dashboard_excluded_trainers` and `elite_payments`;
   `platform_admins` loses its grants to anon and authenticated).
3. Redeploy `stripe-billing-webhook` (`npx supabase functions deploy stripe-billing-webhook
   --no-verify-jwt`): it now writes `elite_payments`, the web Elite half of platform revenue. After
   step 2, before any web Elite invoice is paid (an invoice paid earlier has no row).
4. The Editor proofs (PASS 38) and `get_advisors`.
5. The operator inserts their own account into `platform_admins` (SQL Editor; live has no row):
   `insert into public.platform_admins (user_id, note) values ('<auth uid>', 'owner');`.
6. The operator lists the test coaches and their own coach accounts in `dashboard_excluded_trainers`
   (the rollout's step 6 has the read-only SELECT that finds them; live's two $1 payments are one test
   coach's): otherwise "Coaches activated" opens at 1 and stays there.
7. Then this site. No edge function and no secret. After the deploy: `curl -sI
   https://fitlink.coach/admin` and `curl -sI https://fitlink.coach/admin/` show `x-robots-tag:
   noindex, nofollow`; signed in as the operator the page shows the scorecard (and how many test
   accounts are left out); signed in as any other account it says "This account isn't an operator
   account."

Before step 2: `/admin` says the dashboard isn't on the server yet. Before step 5: every account,
the operator's included, gets "This account isn't an operator account."

## Gates that hold after the deploy

- **Model B must not be switched on for a coach** (`coach_billing.model_b`) **until the
  coach page shows the total before checkout (PR 3).** PR 3's `/c/<handle>` does (the
  server's `total_cents` on every card and in the sheet from its first line); the invite page
  `/i/CODE` still does not, so a Model B coach should share `/c/<handle>`. Today the web shows a Model B
  total (create-subscription's `amountCents`, the booking fee inside it) only from the card
  form on; athlete-exit's switch confirmation, which can end another pass, runs before any
  total exists.
- `src/web/pricingConfig.json` is pinned by sha256 to fitlink-app
  `supabase/config/pricing.json` at a named commit (`src/web/pricing.test.js`); a server
  price change is a new copy, a new pin, and a site deploy after the server's.

## Website launch items W1–W8 (launch plan Track F, 2026-10-25)

Branches, stacked in order on `launch/6-funnel-dashboard-web`: `launch/w1-brand-config` … `launch/w8-nav`. They
change the site only; each says below what it waits for.

- **W1 brand config** (`launch/w1-brand-config`): no server dependency. After the deploy:
  `curl -s https://fitlink.coach/ | grep -E 'og:(image|site_name)'` shows `https://<host>/og-image.png` and the
  name, `curl -sI https://fitlink.coach/og-image.png` answers `200 image/png`, and the coach page check above
  (`facebookexternalhit`) still prints ONE `og:title`, the coach's. The rename (Track A) is `src/web/site/brand.js`
  plus `node scripts/og-image.mjs`; the AASA file, the Apple Services ID return URLs, Supabase's redirect URLs and
  Vercel's domain are the owner's.
- **W2 hero** (`launch/w2-hero`): copy only, no server dependency. After the deploy the home title reads
  "<name> — Monday, handled." in the tab and in `curl -s https://fitlink.coach/ | grep '<title>'`.
