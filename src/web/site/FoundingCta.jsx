// The coaches' call to action (W3; review 2026-10-25 M2): "Claim a Founding spot" while Founding is open, loading or
// its read failed (the page it opens says the truth), "Join as a coach" once the counter or the config's close day says
// full or closed (owner decision R4: /founding is then the coach sign-up on standard pricing). Every copy on a page
// shares one founding_slots() read (useFoundingSlots).
import { Link } from 'react-router-dom';
import { FOUNDING_CTA, FOUNDING_PATH, JOIN_CTA } from './flags';
import { useFoundingView } from './useFoundingSlots';

export default function FoundingCta({ className }) {
  const { mode } = useFoundingView();
  return <Link className={className} to={FOUNDING_PATH}>{mode === 'join' ? JOIN_CTA : FOUNDING_CTA}</Link>;
}
