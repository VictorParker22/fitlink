// founding_slots() as ONE read per page load, shared by every Founding call to action (the header, the home page,
// /pricing, the 404) and /founding itself (review 2026-10-25, M2): the server's counter or nothing. `slots` is
// undefined while loading (nothing numeric is drawn), null when the read failed (the page says so, never a guessed
// number), else founding.js parseSlots()'s answer. The first component that mounts starts the read; the others share
// it. The prerendered markup is the loading state (getServerSnapshot), so hydration never depends on the network or
// on the date.
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { foundingSlots } from '../api';
import { foundingView, todayIn } from '../founding';
import { FOUNDING_CLOSES_ON, FOUNDING_CLOSES_TZ } from './pricing';

let current;
let started = false;
/** Bumped by every read and every set: only the newest answer lands. */
let seq = 0;
const listeners = new Set();

function publish(value) {
  current = value;
  for (const l of listeners) l();
}

function read({ clear }) {
  const mine = ++seq;
  if (clear) publish(undefined);
  foundingSlots().then((s) => { if (mine === seq) publish(s); }, () => { if (mine === seq) publish(null); });
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSlots = () => current;
const getServerSlots = () => undefined;
const noSubscribe = () => () => {};
/** The offer's day (its closes_tz) in the browser; null on the server and in the render that hydrates. */
const getToday = () => todayIn(FOUNDING_CLOSES_TZ);
const getServerToday = () => null;

export function useFoundingSlots() {
  const slots = useSyncExternalStore(subscribe, getSlots, getServerSlots);
  useEffect(() => {
    if (started) return;
    started = true;
    read({ clear: false });
  }, []);
  /** An answer the page already holds (apply_founding returns the counter): it replaces any read in flight. */
  const setSlots = useCallback((s) => { seq += 1; publish(s); }, []);
  /** Read again, keeping what is on screen until the answer (after a full or closed refusal). */
  const reload = useCallback(() => read({ clear: false }), []);
  /** Try again after a failed read: back to "loading" (nothing numeric), then the server's answer. */
  const retry = useCallback(() => read({ clear: true }), []);
  return { slots, setSlots, reload, retry };
}

/**
 * The counter plus founding.js foundingView(): `mode` 'founding' (the application) or 'join' (the coach sign-up on
 * standard pricing, owner decision R4), `phase` for the counter, `closesOn` for the closed sentence.
 */
export function useFoundingView() {
  const state = useFoundingSlots();
  const today = useSyncExternalStore(noSubscribe, getToday, getServerToday);
  return { ...state, today, ...foundingView(state.slots, today, FOUNDING_CLOSES_ON) };
}

/** Today in the offer's zone, YYYY-MM-DD (foundingPhase compares it with the close day). */
export function todayIso(d = new Date()) {
  return todayIn(FOUNDING_CLOSES_TZ, d);
}
