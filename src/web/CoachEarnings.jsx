// /coach/earnings — every payment the coach received, with its fees, and the monthly totals
// (fee engine, launch plan Sprint 1 PR 1). Reads only what the coach's own RLS lets them
// read (api.js earningsData): payments and pass_refunds rows with their trainer_id, the
// names of athletes still on their roster, pass names, and a count of their disputes.
// The arithmetic and the words are coachMoney.js (`node --test src/web/coachMoney.test.js`).
//
// A payment from before the fee engine has no breakdown: its fees and net show "—" and it is
// left out of the fee totals, with one line saying so. A refund is its own negative row.
// A payment with refunds on it is tagged "part refunded" until they reach its gross. Disputes:
// open ones and ones lost lately are named with their amounts (inquiries never). When a list
// hits EARNINGS_LIMIT the page and the oldest month say that month may be missing some.
// A read that fails says so, with Try again; nothing is estimated.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { earningsData, EARNINGS_LIMIT, signOutLocal } from './api';
import { buildEarnings, dayWords, disputeNote, money, noBreakdownLine, refundLabel, refundTag, truncatedNote } from './coachMoney';
import { usePageMeta } from './site/meta';
import { BRAND_NAME } from './site/brand';
import { DISPUTE_FEE_USD, usd } from './site/pricing';

export default function CoachEarnings({ session }) {
  usePageMeta('Earnings', `What your athletes paid through ${BRAND_NAME}, the fees on each payment and what reached you.`);
  const uid = session.user.id;
  const [res, setRes] = useState({ state: 'loading' });

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    earningsData(uid)
      .then((data) => { if (alive) setRes({ state: 'ok', data }); })
      .catch((err) => { if (alive) setRes({ state: 'error', message: err.message, code: err.code }); });
    return () => { alive = false; };
  }, [uid, attempt]);

  const load = () => { setRes({ state: 'loading' }); setAttempt((n) => n + 1); };

  const built = useMemo(() => (res.state === 'ok' ? buildEarnings(res.data) : null), [res]);

  return (
    <main className="fl-dash">
      <div className="fl-dash-head">
        <Link className="fl-back" to="/coach">← Dashboard</Link>
        <h1>Earnings</h1>
        <p className="fl-sub">What your athletes paid, the fees on each payment and what reached your Stripe balance. Card processing comes out of the platform fee, never out of your share.</p>
      </div>

      {res.state === 'loading' && <p className="fl-note" aria-live="polite">Loading your earnings…</p>}
      {res.state === 'error' && (
        <div className="fl-panel">
          <div className="fl-error" role="alert">{res.message}</div>
          <div className="fl-btnrow">
            {res.code === 'unauthorized'
              ? <button type="button" className="fl-btn accent" onClick={() => signOutLocal().then(() => window.location.assign('/coach'))}>Sign in again</button>
              : <button type="button" className="fl-btn" onClick={load}>Try again</button>}
          </div>
        </div>
      )}
      {built && <Ledger built={built} data={res.data} />}
    </main>
  );
}

function Ledger({ built, data }) {
  const disputes = data.disputes;
  const dNote = disputeNote(disputes);
  const last = built.months.length - 1;
  return (
    <>
      {data.namesFailed && <p className="fl-warn" role="note">Couldn’t load athlete or pass names; the amounts below are complete.</p>}
      {data.truncated && <p className="fl-warn" role="note">{truncatedNote(EARNINGS_LIMIT)}</p>}
      {disputes === null && <p className="fl-warn" role="note">Couldn’t check for disputes on your payments.</p>}
      {dNote && (
        <p className="fl-warn" role="note">
          {dNote} A dispute costs you {usd(DISPUTE_FEE_USD)}, won or lost; an inquiry costs nothing.
        </p>
      )}
      {built.months.length === 0 && (
        <div className="fl-panel"><p className="fl-elite-line">No payments yet. When an athlete pays for a pass, the payment shows here with its fees.</p></div>
      )}
      {built.months.map((m, i) => <Month key={m.key} m={m} partial={data.truncated && i === last} />)}
    </>
  );
}

function Month({ m, partial }) {
  const cur = m.currency;
  const note = noBreakdownLine(m.noBreakdown);
  return (
    <section className="fl-panel fl-month" aria-labelledby={`m-${m.key}`}>
      <h2 id={`m-${m.key}`}>{m.label}</h2>
      <dl className="fl-totals">
        <div><dt>Athletes paid</dt><dd>{money(m.paid, cur)}</dd></div>
        {m.refunded !== 0 && <div><dt>Refunded</dt><dd>{money(m.refunded, cur)}</dd></div>}
        <div><dt>Platform fee</dt><dd>{money(m.platformFee, cur)}</dd></div>
        {m.bookingFee > 0 && <div><dt>of which booking fees</dt><dd>{money(m.bookingFee, cur)}</dd></div>}
        {m.disputeFee > 0 && <div><dt>Dispute fees</dt><dd>{money(m.disputeFee, cur)}</dd></div>}
        <div className="net"><dt>Net payout</dt><dd>{money(m.net, cur)}</dd></div>
      </dl>
      {partial && <p className="fl-note">This month may be missing older payments or refunds: only the latest {EARNINGS_LIMIT} of each were loaded.</p>}
      {note && <p className="fl-note">{note}</p>}
      {m.refunded !== 0 && <p className="fl-note">Refunds aren’t taken out of the net payout above: Stripe takes each refund back from your balance, less the share of the platform fee it returns.</p>}
      <ul className="fl-earn-rows">
        {m.rows.map((r) => <Row key={r.id} r={r} />)}
      </ul>
    </section>
  );
}

function Row({ r }) {
  const cur = r.currency;
  const refund = r.kind === 'refund';
  const feeLabel = r.feePercent === null
    ? 'Platform fee'
    : `Platform fee (${r.feePercent}%${r.bookingFee ? ' + booking fee' : ''})`;
  return (
    <li className={`fl-earn-row${refund ? ' refund' : ''}`}>
      <div className="fl-earn-top">
        <span><b>{r.athlete}</b>{r.pass !== '—' && <> · {r.pass}</>}{refund && <span className="fl-tag">{refundLabel(r.reason)}</span>}{refundTag(r.refundState) && <span className="fl-tag">{refundTag(r.refundState)}</span>}</span>
        <time dateTime={r.at ?? undefined}>{dayWords(r.at)}</time>
      </div>
      <dl>
        <div><dt>{refund ? 'Refunded' : 'Paid'}</dt><dd>{money(r.gross, cur)}</dd></div>
        <div><dt>{feeLabel}</dt><dd>{r.platformFee === null ? '—' : money(-r.platformFee, cur)}</dd></div>
        {r.bookingFee !== null && <div><dt>Booking fee (in the athlete’s total)</dt><dd>{money(r.bookingFee, cur)}</dd></div>}
        {r.disputeFee !== null && <div><dt>Dispute fee</dt><dd>{money(-r.disputeFee, cur)}</dd></div>}
        <div className="net"><dt>Net payout</dt><dd>{r.net === null ? '—' : money(r.net, cur)}</dd></div>
      </dl>
    </li>
  );
}
