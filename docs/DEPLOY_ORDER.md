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

## Gates that hold after the deploy

- **Model B must not be switched on for a coach** (`coach_billing.model_b`) **until the
  coach page shows the total before checkout (PR 3).** Today the web shows a Model B
  total (create-subscription's `amountCents`, the booking fee inside it) only from the card
  form on; athlete-exit's switch confirmation, which can end another pass, runs before any
  total exists.
- `src/web/pricingConfig.json` is pinned by sha256 to fitlink-app
  `supabase/config/pricing.json` at a named commit (`src/web/pricing.test.js`); a server
  price change is a new copy, a new pin, and a site deploy after the server's.
