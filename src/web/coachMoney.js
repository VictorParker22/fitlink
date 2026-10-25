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
import { ELITE_PAST_DUE_GRACE_DAYS, FOUNDING_ENDS_AFTER_DAYS_WITHOUT_PAYMENT, ELITE_MONTHLY_USD, ELITE_YEARLY_USD, usd } from './site/pricing.js';

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
  const feeLine = feeBps === null ? null : `${feeBps / 100}% of each pass you sell${t.org_seat ? ' (your gym’s seat)' : ''}`;
  let athletesLine = null;
  if (paying !== null) {
    athletesLine = cap !== null
      ? `${paying} of ${cap} paying athletes on the free plan`
      : `${paying} paying athlete${paying === 1 ? '' : 's'} · no cap`;
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
  if (f.member === true) {
    if (f.suspended_at) {
      lines.push(`Founding pricing ended on ${dateWords(f.suspended_at)}: none of your athletes paid through the platform for ${FOUNDING_ENDS_AFTER_DAYS_WITHOUT_PAYMENT} days. Your Founding badge stays.`);
    } else if (f.active === true && !f.first_paid_at) {
      lines.push(`Founding coach${f.granted_at ? ` since ${dateWords(f.granted_at)}` : ''}. Elite is included; your free year starts with your first athlete payment.`);
    } else if (f.active === true && freeUntilMs !== null) {
      lines.push(`Founding coach: Elite is free until ${dateWords(f.free_until)}.`);
    } else if (freeUntilMs !== null && freeUntilMs <= nowMs) {
      lines.push(`Your Founding free year ended on ${dateWords(f.free_until)}. Your Founding badge stays.`);
    }
  }
  const foundingActive = f.active === true && !f.suspended_at;
  if (foundingActive) blocks = true;

  return {
    tier,
    tierLabel: TIER_LABEL[tier],
    feeLine,
    athletesLine,
    readOnly,
    warning,
    lines,
    manage,
    canBuy: !blocks && tier !== 'elite' && tier !== 'founding',
    foundingActive,
  };
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
    });
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

/** The one line under a month with payments from before the fee breakdown. */
export function noBreakdownLine(n) {
  if (!n) return null;
  return n === 1
    ? '1 payment is from before fees were recorded per payment: its fees and net show “—” and are not in the fee totals.'
    : `${n} payments are from before fees were recorded per payment: their fees and net show “—” and are not in the fee totals.`;
}
