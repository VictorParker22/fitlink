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
5. Then this site. Vercel runs `api/coach-meta.js` (the link-preview tags for `/c/:handle`)
   with `includeFiles: dist/index.html`; it reads `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_PUBLISHABLE_KEY` at run time when set (else the same defaults as the
   browser). After the deploy: `curl -s https://fitlink.coach/c/<a real handle> | grep og:`
   shows the coach's tags, `curl -sI https://fitlink.coach/c/nobody-xyz` answers 404
   `text/html`, `/.well-known/apple-app-site-association` is still `application/json`, and
   a link pasted into iMessage shows the coach-og card.

Before step 2: `/c/*` says coach pages aren't available yet, and `/coach`'s "Your page"
panel says the same.

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
