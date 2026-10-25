// The coach's money on the web (/coach dashboard's Coach Elite panel, /coach/earnings),
// kept pure so `node --test src/web/coachMoney.test.js` pins it: no window, no React, no
// Supabase (the reads are api.js).
//
// Server (fitlink-app fee engine, migration 20261025100000, launch plan PR 1):
// - `coach_fee_terms()` (the caller's own; authenticated): { tier, fee_bps, org_seat, model_b,
//   model_b_fee_bps, booking_fee_cents, minimum_charge_cents, paying_athletes, cap, over_cap,
//   read_only, elite: { app_store_until, web_status, web_interval, web_current_period_end,
//   web_cancel_at_period_end, web_paid_through }, founding: { member, active, granted_at,
//   first_paid_at, free_until, notice_at, suspended_at } }.
// - `elite-checkout` (POST {interval, source}): 200 { url, sessionId, firstChargeAt?, reused? }, or
//   { error: <sentence>, code } (coach_only, already_elite, already_elite_app_store,
//   founding_active, elite_payment_due, checkout_in_progress, not_configured, rate_limited,
//   stripe_error, db_error). Its return URLs are /coach?elite=started|cancelled.
// - `payments` (the coach reads rows where trainer_id is theirs): gross_cents,
//   platform_fee_cents, booking_fee_cents, dispute_fee_cents, coach_net_cents, fee_bps,
//   tier_at_charge, written by stripe-webhook / confirm-subscription. gross = platform fee +
//   dispute fee + coach net (booking fee is inside the platform fee). Rows from before the
//   engine have none of them (amount is the cents charged).
// - `pass_refunds` (the coach reads their own): one row per Stripe refund, amount_cents.
//
// Copy rules: real data or omitted, the server's sentence for every refusal, never "You're on
// Elite" before coach_fee_terms says so.
import {
  ELITE_FEE_PERCENT, ELITE_PAST_DUE_GRACE_DAYS, FOUNDING_ENDS_AFTER_DAYS_WITHOUT_PAYMENT, FOUNDING_NOTICE_DAYS_BEFORE,
  ELITE_MONTHLY_USD, ELITE_YEARLY_USD, MODEL_B_BOOKING_FEE_USD, usd,
} from './site/pricing.js';

const DAY_MS = 86_400_000;

function ms(iso) {
  if (!iso) return null;
  const t = Date.parse(String(iso));
  return Number.isFinite(t) ? t : null;
}

/**
 * "November 8, 2026" in UTC: the edge functions word their dates in UTC (elite-checkout's
 * untilWords), so the panel and a refusal never name two different days for one date.
 */
export function dateWords(iso) {
  const t = ms(iso);
  if (t === null) return null;
  return new Date(t).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export const ELITE_BUTTONS = Object.freeze([
  { interval: 'month', label: `Subscribe monthly · ${usd(ELITE_MONTHLY_USD)}` },
  { interval: 'year', label: `Yearly · ${usd(ELITE_YEARLY_USD)}` },
]);

/** A Founding coach in the free year sets Elite up for after it: the same prices, nothing charged until then. */
export const FOUNDING_ELITE_BUTTONS = Object.freeze([
  { interval: 'month', label: `Monthly · ${usd(ELITE_MONTHLY_USD)}` },
  { interval: 'year', label: `Yearly · ${usd(ELITE_YEARLY_USD)}` },
]);

/**
 * elite-checkout's founding_active sentence (fitlink-app `elite-checkout/handler.ts`), word for word: before the
 * first paid athlete the free year has no end date, so there is nothing to set Elite up after yet.
 */
export const FOUNDING_BEFORE_FIRST_PAYMENT = 'Your Founding spot already includes Elite. Your free year starts with your first paid athlete; you can set up Elite for after it then.';

/** Stripe Checkout needs a trial end at least 48 hours ahead (server `_shared/pricing.ts` MIN_TRIAL_LEAD_MS). */
const MIN_TRIAL_LEAD_MS = 48 * 3_600_000;

/** The booking fee create-subscription adds today: every pass sold is a block payment (`bookingKindFor`). */
export const MODEL_B_BOOKING_FEE_TODAY_USD = MODEL_B_BOOKING_FEE_USD.block_payment;

const TIER_LABEL = Object.freeze({ free: 'Free plan', elite: 'Coach Elite', founding: 'Founding' });

/** Codes after which the terms are read again (the refusal says the state changed). */
export const REREAD_CODES = new Set(['already_elite', 'already_elite_app_store', 'founding_active', 'elite_payment_due']);

/**
 * The panel, from coach_fee_terms. Every line is a fact the server wrote, worded here; a fact
 * that is absent is left out. `canBuy` decides whether the two buttons show; the server still
 * refuses on its own (elite-checkout), and its sentence is shown when it does.
 */
export function eliteView(terms, nowMs = Date.now()) {
  const t = terms && typeof terms === 'object' ? terms : {};
  const tier = t.tier === 'elite' || t.tier === 'founding' ? t.tier : 'free';
  const e = t.elite && typeof t.elite === 'object' ? t.elite : {};
  const f = t.founding && typeof t.founding === 'object' ? t.founding : {};
  const paying = Number.isFinite(Number(t.paying_athletes)) ? Number(t.paying_athletes) : null;
  const cap = t.cap === null || t.cap === undefined || !Number.isFinite(Number(t.cap)) ? null : Number(t.cap);
  const feeBps = Number.isFinite(Number(t.fee_bps)) ? Number(t.fee_bps) : null;

  const lines = [];
  let warning = null;
  let manage = null;
  let blocks = false;

  // ── Fee and athletes ──
  const orgSeat = t.org_seat === true;
  const modelB = t.model_b === true;
  const modelBBps = Number.isFinite(Number(t.model_b_fee_bps)) ? Number(t.model_b_fee_bps) : null;
  let feeLine = null;
  if (modelB && modelBBps !== null) {
    // Model B: the coach's own rate is model_b_fee_bps whatever the tier, and the athlete's booking fee is inside
    // the total the athlete is shown before paying (create-subscription's amountCents), never added on top.
    feeLine = `${modelBBps / 100}% of each pass you sell. Your athletes’ total also holds a ${usd(MODEL_B_BOOKING_FEE_TODAY_USD)} booking fee on each payment, shown in the total before they pay; it goes to the platform, not to you.`;
  } else if (feeBps !== null) {
    feeLine = orgSeat && feeBps === 0
      ? 'No fee on the passes you sell: your gym’s seat covers it.'
      : `${feeBps / 100}% of each pass you sell${orgSeat ? ' (your gym’s seat)' : ''}`;
  }
  let athletesLine = null;
  if (paying !== null) {
    athletesLine = cap !== null
      ? `${paying} of ${cap} paying athletes on the free plan`
      : `${paying} paying athlete${paying === 1 ? '' : 's'} · no cap${orgSeat && tier === 'free' ? ' (your gym’s seat)' : ''}`;
  }
  const readOnly = t.read_only === true;
  if (readOnly) {
    const count = paying !== null && cap !== null ? `You have ${paying} paying athletes, more than the free plan’s ${cap}.` : 'You have more paying athletes than the free plan holds.';
    warning = `${count} Their payments go through, but you can’t change their plans until you start Elite.`;
  }

  // ── Elite through the App Store ──
  const appUntil = ms(e.app_store_until);
  if (appUntil !== null && appUntil > nowMs) {
    lines.push(`Coach Elite through the App Store until ${dateWords(e.app_store_until)}.`);
    manage = 'Managed in the App Store.';
    blocks = true;
  }

  // ── Elite on the web (Stripe) ──
  const status = typeof e.web_status === 'string' ? e.web_status : null;
  const interval = e.web_interval === 'year' ? 'yearly' : e.web_interval === 'month' ? 'monthly' : null;
  const periodEnd = dateWords(e.web_current_period_end);
  const paidThrough = ms(e.web_paid_through);
  const paidWords = dateWords(e.web_paid_through);
  if (status === 'active') {
    if (e.web_cancel_at_period_end === true) {
      lines.push(`Coach Elite on the web is cancelled${periodEnd ? `; it runs until ${periodEnd}` : ''}.`);
    } else {
      lines.push(`Coach Elite on the web${interval ? `, ${interval}` : ''}.${periodEnd ? ` Renews ${periodEnd}.` : ''}`);
    }
    manage = manage ?? 'Manage it from the link in your Stripe receipt.';
    blocks = true;
  } else if (status === 'trialing') {
    lines.push(`Coach Elite on the web is set up for after your free year${periodEnd ? `. The first charge is on ${periodEnd}` : ''}.`);
    manage = manage ?? 'Manage it from the link in your Stripe receipt.';
    blocks = true;
  } else if (status === 'past_due' || status === 'unpaid') {
    const graceEnd = paidThrough !== null ? paidThrough + ELITE_PAST_DUE_GRACE_DAYS * DAY_MS : null;
    if (status === 'past_due' && graceEnd !== null && graceEnd > nowMs) {
      lines.push(`Stripe couldn’t take your last Elite payment and is trying again. Elite stays on until ${dateWords(new Date(graceEnd).toISOString())} while it does.`);
    } else {
      lines.push('Your Coach Elite payment is overdue. Elite comes back with the payment.');
    }
    manage = 'Update your card from the link in the email Stripe sent you.';
    blocks = true;
  } else if (status && paidThrough !== null) {
    // canceled, incomplete_expired: what was paid for still runs, then it ends.
    if (paidThrough > nowMs) {
      lines.push(`Your cancelled Coach Elite runs until ${paidWords}.`);
      blocks = true;
    } else {
      lines.push(`Your Coach Elite on the web ended on ${paidWords}.`);
    }
  } else if (status === 'incomplete') {
    lines.push('Stripe is still waiting on your first Elite payment.');
  }

  // ── Founding ──
  const freeUntilMs = ms(f.free_until);
  const foundingActive = f.active === true && !f.suspended_at;
  // In the free year (an athlete has paid, so the year has an end): Elite can be set up for after it (elite-checkout
  // makes a subscription whose trial ends when the year does). Before the first payment the server refuses
  // (founding_active) and the panel says the server's reason instead of showing buttons.
  const inFreeYear = foundingActive && Boolean(f.first_paid_at) && freeUntilMs !== null && freeUntilMs > nowMs;
  let noticeWindow = false;
  if (f.member === true) {
    if (f.suspended_at) {
      lines.push(`Founding pricing ended on ${dateWords(f.suspended_at)}: none of your athletes paid through the platform for ${FOUNDING_ENDS_AFTER_DAYS_WITHOUT_PAYMENT} days. Your Founding badge stays.`);
    } else if (f.active === true && !f.first_paid_at) {
      lines.push(`Founding coach${f.granted_at ? ` since ${dateWords(f.granted_at)}` : ''}. ${FOUNDING_BEFORE_FIRST_PAYMENT}`);
    } else if (inFreeYear) {
      lines.push(`Founding coach: Elite is free until ${dateWords(f.free_until)}.`);
      // founding_daily's notice (day 335 of 365): it was sent, or the window it opens has begun.
      noticeWindow = Boolean(f.notice_at) || nowMs >= freeUntilMs - FOUNDING_NOTICE_DAYS_BEFORE * DAY_MS;
      if (noticeWindow && !blocks) {
        lines.push(`Your free year ends on ${dateWords(f.free_until)}. To keep Elite and your ${ELITE_FEE_PERCENT}% fee, set up Elite before then; nothing is charged until that day.`);
      }
    } else if (freeUntilMs !== null && freeUntilMs <= nowMs) {
      lines.push(`Your Founding free year ended on ${dateWords(f.free_until)}. Your Founding badge stays.`);
    }
  }

  // ── What the buy buttons say, when they show ──
  let canBuy = false;
  let buy = null;
  if (!blocks && inFreeYear) {
    canBuy = true;
    const until = dateWords(f.free_until);
    buy = freeUntilMs - nowMs >= MIN_TRIAL_LEAD_MS
      ? { intro: `Set up Elite for after your free year · Nothing is charged until ${until}.`, buttons: FOUNDING_ELITE_BUTTONS, defersUntil: f.free_until }
      // Inside the last 48 hours Stripe can't hold the first charge until then (eliteTrialEndSec is null): billing
      // starts when the coach subscribes.
      : { intro: `Your free year ends on ${until}, so Elite started now is charged from today.`, buttons: ELITE_BUTTONS, defersUntil: null };
  } else if (!blocks && !foundingActive && tier === 'free') {
    canBuy = true;
    let intro;
    if (modelB) intro = 'Elite removes the athlete cap and drafts your replies; your booking-fee rate stays as it is. You pay on Stripe’s page.';
    else if (orgSeat) intro = 'Your gym’s seat already covers your fee and the athlete cap. Elite adds the assistant that drafts your replies. You pay on Stripe’s page.';
    else intro = 'Elite lowers your fee, removes the athlete cap and drafts your replies. You pay on Stripe’s page.';
    buy = { intro, buttons: ELITE_BUTTONS, defersUntil: null };
  }

  return {
    tier,
    tierLabel: TIER_LABEL[tier],
    feeLine,
    athletesLine,
    readOnly,
    warning,
    lines,
    manage,
    canBuy,
    buy,
    foundingActive,
    noticeWindow,
  };
}

/**
 * Whether elite-checkout's answer keeps the panel's promise. A Founding coach was told nothing is charged until the
 * free year ends; the answer carries that date as `firstChargeAt` only when Stripe will hold the first charge (the
 * trial). Without it, or with another day, Stripe would charge at once, so the page asks again before leaving.
 */
export function checkoutKeepsPromise(buy, answer) {
  if (!buy?.defersUntil) return true;
  const promised = dateWords(buy.defersUntil);
  return promised !== null && dateWords(answer?.firstChargeAt) === promised;
}

/** Whether coach_fee_terms shows the web subscription a checkout just started (the webhook has written it). */
export function webEliteConfirmed(terms) {
  const s = terms?.elite?.web_status;
  return s === 'active' || s === 'trialing';
}

/** Only Stripe's own hosted checkout page, over https: never a URL the answer made up. */
export function isStripeCheckoutUrl(url) {
  if (typeof url !== 'string' || url.length > 2048) return false;
  let u;
  try { u = new URL(url); } catch { return false; }
  return u.protocol === 'https:' && u.hostname === 'checkout.stripe.com' && !u.username && !u.password && !u.port;
}

/**
 * The `elite` return parameter elite-checkout's success/cancel URLs carry, and the search
 * string without it (removed whatever its value, so a reload says nothing twice).
 */
export function readEliteReturn(search) {
  const s = String(search ?? '');
  const q = new URLSearchParams(s.startsWith('?') ? s.slice(1) : s);
  if (!q.has('elite')) return { state: null, search: s };
  const v = q.get('elite');
  q.delete('elite');
  const rest = q.toString();
  return { state: v === 'started' || v === 'cancelled' ? v : null, search: rest ? `?${rest}` : '' };
}

export const RETURN_CANCELLED = 'Checkout was cancelled. Nothing was charged.';
export const RETURN_CONFIRMING = 'Stripe is confirming your subscription. This can take a minute.';
export const RETURN_CONFIRMED = 'Stripe confirmed your Coach Elite subscription.';

// ── Earnings ──────────────────────────────────────────────────────────────────

/** The payments that took money: paid, or paid and later refunded (the refund is its own row). */
const COUNTED = new Set(['succeeded', 'refunded']);

const int = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Math.round(Number(v)));

/** `$12.50`, `-$12.50`; the row's own currency (USD when it has none). */
export function money(cents, currency = 'usd') {
  const n = int(cents);
  if (n === null) return '—';
  const code = /^[a-z]{3}$/i.test(String(currency ?? '')) ? String(currency).toUpperCase() : 'USD';
  return (n / 100).toLocaleString('en-US', { style: 'currency', currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function firstNameOf(name) {
  const f = String(name ?? '').trim().split(/\s+/)[0];
  return f || null;
}

/** Local `YYYY-MM` of a timestamp (the coach's own calendar month). */
export function monthKey(iso) {
  const t = ms(iso);
  if (t === null) return 'unknown';
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthWords(key) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(key));
  if (!m) return 'Date unknown';
  return new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function dayWords(iso) {
  const t = ms(iso);
  if (t === null) return '—';
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Rows and per-month totals from what the coach may read. `names` maps clients.id → name for
 * the athletes still on the coach's roster (a former athlete's row is not theirs to read);
 * `passes` maps plans.id → name.
 *
 * A payment with the fee engine's breakdown shows gross, platform fee, booking fee (Model B),
 * dispute fee and net; one without it (before the engine) shows its amount and "—" for the
 * rest, and is left out of the fee and net totals (`noBreakdown` counts them). A refund is its
 * own negative row; it is in the month's "refunded" total, not in "net payout": Stripe takes the
 * refund back from the coach's balance less the share of the platform fee it returns, and that
 * split is on the refund, not in these rows.
 *
 * Which payment a refund belongs to: a `pass_refunds` row names the Stripe charge and a
 * `payments` row the payment intent, and the coach can read nothing that joins the two. So a
 * refund is put on the latest payment of the same athlete and pass made at or before it, and a
 * payment shows `refundState` 'part' while the refunds put on it total less than its gross,
 * 'full' at its gross or more (or when the server marked it refunded and no refund row was found).
 */
export function buildEarnings({ payments = [], refunds = [], names = {}, passes = {} } = {}) {
  const athlete = (clientId) => {
    if (!clientId) return '—';
    return firstNameOf(names[clientId]) ?? 'Former athlete';
  };
  const pass = (planId) => (planId && passes[planId] ? String(passes[planId]) : '—');

  const rows = [];
  for (const p of payments) {
    if (!p || !COUNTED.has(p.status)) continue;
    const gross = int(p.gross_cents) ?? int(p.amount);
    const platformFee = int(p.platform_fee_cents);
    const net = int(p.coach_net_cents);
    const breakdown = platformFee !== null && net !== null;
    const booking = int(p.booking_fee_cents);
    const dispute = int(p.dispute_fee_cents);
    rows.push({
      kind: 'payment',
      id: String(p.id),
      at: p.created_at ?? null,
      athlete: athlete(p.client_id),
      pass: pass(p.plan_id),
      currency: p.currency || 'usd',
      gross,
      platformFee: breakdown ? platformFee : null,
      bookingFee: breakdown && booking ? booking : null,
      disputeFee: breakdown && dispute ? dispute : null,
      net: breakdown ? net : null,
      feePercent: breakdown && int(p.fee_bps) !== null ? int(p.fee_bps) / 100 : null,
      breakdown,
      refunded: p.status === 'refunded',
      refundedCents: 0,
      refundState: null,
      clientId: p.client_id ?? null,
      planId: p.plan_id ?? null,
    });
  }
  // Each refund onto the latest earlier payment of the same athlete and pass.
  const byPair = new Map();
  for (const row of rows) {
    const k = `${row.clientId}|${row.planId}`;
    if (!byPair.has(k)) byPair.set(k, []);
    byPair.get(k).push(row);
  }
  for (const list of byPair.values()) list.sort((a, b) => (ms(a.at) ?? 0) - (ms(b.at) ?? 0));
  for (const r of refunds) {
    const cents = r ? int(r.amount_cents) : null;
    if (!cents) continue;
    const list = byPair.get(`${r.client_id ?? null}|${r.plan_id ?? null}`);
    const at = ms(r.created_at);
    if (!list || at === null) continue;
    let hit = null;
    for (const row of list) if ((ms(row.at) ?? Infinity) <= at) hit = row;
    if (hit) hit.refundedCents += Math.abs(cents);
  }
  for (const row of rows) {
    if (row.refundedCents > 0 && row.gross !== null) row.refundState = row.refundedCents < row.gross ? 'part' : 'full';
    else if (row.refunded) row.refundState = 'full';
  }
  for (const r of refunds) {
    if (!r) continue;
    const cents = int(r.amount_cents);
    if (cents === null) continue;
    rows.push({
      kind: 'refund',
      id: `refund-${r.id}`,
      at: r.created_at ?? null,
      athlete: athlete(r.client_id),
      pass: pass(r.plan_id),
      currency: r.currency || 'usd',
      gross: -Math.abs(cents),
      platformFee: null,
      bookingFee: null,
      disputeFee: null,
      net: null,
      feePercent: null,
      breakdown: false,
      reason: r.reason ?? null,
    });
  }
  rows.sort((a, b) => (ms(b.at) ?? 0) - (ms(a.at) ?? 0));

  const months = [];
  const byKey = new Map();
  for (const row of rows) {
    const key = monthKey(row.at);
    let m = byKey.get(key);
    if (!m) {
      m = { key, label: monthWords(key), rows: [], paid: 0, refunded: 0, platformFee: 0, bookingFee: 0, disputeFee: 0, net: 0, noBreakdown: 0, currency: row.currency };
      byKey.set(key, m);
      months.push(m);
    }
    m.rows.push(row);
    if (row.kind === 'refund') {
      m.refunded += row.gross;
    } else {
      m.paid += row.gross ?? 0;
      if (row.breakdown) {
        m.platformFee += row.platformFee;
        m.bookingFee += row.bookingFee ?? 0;
        m.disputeFee += row.disputeFee ?? 0;
        m.net += row.net;
      } else {
        m.noBreakdown += 1;
      }
    }
  }
  return { rows, months };
}

/** The refund row's label. */
export function refundLabel(reason) {
  if (reason === 'coach_left') return 'Refund when you left';
  if (reason === 'dashboard') return 'Refund from Stripe';
  return 'Refund';
}

/** The tag on a payment with a refund on it. */
export function refundTag(state) {
  if (state === 'part') return 'part refunded';
  if (state === 'full') return 'refunded';
  return null;
}

/** How long after it closed a lost dispute is still named above the ledger. */
export const LOST_DISPUTE_SHOWN_DAYS = 90;
const OPEN_DISPUTE = new Set(['needs_response', 'under_review']);

/**
 * The note above the ledger about disputes, or null. Only disputes, never inquiries (`warning_*`, which cost the
 * coach nothing and take nothing back): the open ones (needs_response, under_review) and the ones lost in the last
 * LOST_DISPUTE_SHOWN_DAYS days. Won and refunded ones gave the money back and are left out. The payments below keep
 * their full net (a dispute names a charge, a payment row a payment intent; nothing the coach reads joins them), so
 * the note says what is held or taken back and that the net below does not show it.
 */
export function disputeNote(disputes, nowMs = Date.now()) {
  if (!Array.isArray(disputes)) return null;
  const open = [];
  const lost = [];
  for (const d of disputes) {
    if (!d || typeof d.status !== 'string' || d.status.startsWith('warning_')) continue;
    if (OPEN_DISPUTE.has(d.status)) open.push(d);
    else if (d.status === 'lost') {
      const closed = ms(d.updated_at) ?? ms(d.created_at);
      if (closed !== null && nowMs - closed <= LOST_DISPUTE_SHOWN_DAYS * DAY_MS) lost.push(d);
    }
  }
  if (open.length === 0 && lost.length === 0) return null;
  const sum = (list) => list.reduce((n, d) => n + Math.max(0, int(d.amount_cents) ?? 0), 0);
  const cur = (list) => list.find((d) => d.currency)?.currency ?? 'usd';
  const parts = [];
  if (open.length) {
    parts.push(`${open.length === 1 ? '1 open dispute holds' : `${open.length} open disputes hold`} ${money(sum(open), cur(open))} back from your balance while the bank decides.`);
  }
  if (lost.length) {
    parts.push(`${lost.length === 1 ? '1 dispute was lost' : `${lost.length} disputes were lost`} in the last ${LOST_DISPUTE_SHOWN_DAYS} days: ${money(sum(lost), cur(lost))} was taken back from your balance.`);
  }
  parts.push(`The disputed payments below still show their full net payout; what a dispute holds back or takes isn’t in these totals.`);
  return parts.join(' ');
}

/** The note when a list hit its row limit: older rows were not read, so the oldest month shown may be partial. */
export function truncatedNote(limit) {
  return `Showing your latest ${limit} payments and refunds. Older ones weren’t loaded, so the oldest month shown may be missing some.`;
}

/** The one line under a month with payments from before the fee breakdown. */
export function noBreakdownLine(n) {
  if (!n) return null;
  return n === 1
    ? '1 payment is from before fees were recorded per payment: its fees and net show “—” and are not in the fee totals.'
    : `${n} payments are from before fees were recorded per payment: their fees and net show “—” and are not in the fee totals.`;
}
