// founding_slots() as page state, shared by /founding and the home page's Founding card (launch plan W4): the
// server's counter or nothing. `slots` is undefined while loading (nothing numeric is drawn), null when the read
// failed (the page says so, never a guessed number), else founding.js parseSlots()'s answer.
import { useCallback, useEffect, useState } from 'react';
import { foundingSlots } from '../api';

export function useFoundingSlots() {
  const [slots, setSlots] = useState(undefined);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    foundingSlots().then((s) => { if (alive) setSlots(s); }, () => { if (alive) setSlots(null); });
    return () => { alive = false; };
  }, [tick]);
  /** Read again, keeping what is on screen until the answer (after a full or closed refusal). */
  const reload = useCallback(() => setTick((n) => n + 1), []);
  /** Try again after a failed read: back to "loading" (nothing numeric), then the server's answer. */
  const retry = useCallback(() => { setSlots(undefined); setTick((n) => n + 1); }, []);
  return { slots, setSlots, reload, retry };
}

/** Today in the viewer's calendar, YYYY-MM-DD (foundingPhase compares it with the close day). */
export function todayIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
