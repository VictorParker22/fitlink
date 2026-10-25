// The live Founding counter (founding_slots()): the server's numbers, or a sentence that says it couldn't load them
// (never a guess). Shared by /founding and the home page's Founding card (launch plan W4). `closesOn` is
// founding.js foundingView's (the counter's day, else the config's: a close day passed while the read failed).
import { closesLabelLong, fullLine, slotsLine } from '../founding';

export default function FoundingCount({ phase, slots, closesOn, onRetry }) {
  if (phase === 'loading') return <p className="s-founding-count" role="status" aria-busy="true" aria-label="Loading how many spots are taken" />;
  if (phase === 'unknown') {
    return (
      <div className="s-founding-count s-founding-count-failed" role="status">
        <span>Couldn’t load how many spots are taken.</span>
        <button type="button" className="fl-btn quiet" onClick={onRetry}>Try again</button>
      </div>
    );
  }
  if (phase === 'full') return <p className="s-founding-count" aria-live="polite"><b>{fullLine(slots.total)}</b></p>;
  if (phase === 'closed') return <p className="s-founding-count" aria-live="polite"><b>Founding spots closed on {closesLabelLong(closesOn ?? slots?.closesOn)}.</b></p>;
  const pct = Math.min(100, Math.round((slots.taken / slots.total) * 100));
  return (
    <div className="s-founding-count" aria-live="polite">
      <b>{slotsLine(slots)}</b>
      <span className="s-founding-meter" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
    </div>
  );
}
