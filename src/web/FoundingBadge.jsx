// The "Founding 15" badge (launch plan 2026-10-25): shown on a coach's public
// page when trainers_public.founding_member is true (the operator granted the
// coach a Founding spot; kept on suspension). Reused by the coach page at
// /c/<handle> when that route lands. Reads nothing itself: the page passes the
// server's answer. The number is the slot count from pricing.js.
import { FOUNDING_SLOTS } from './site/pricing';

export default function FoundingBadge({ size = 'md' }) {
  const label = `Founding ${FOUNDING_SLOTS}`;
  return (
    <span className={`fl-founding-badge${size === 'sm' ? ' sm' : ''}`} title={`One of the first ${FOUNDING_SLOTS} coaches on the platform`}>
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 2.5l2.9 5.9 6.6 1-4.8 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.5 9.4l6.6-1z" style={{ fill: 'currentColor' }} />
      </svg>
      {label}
    </span>
  );
}
