// The season track, both ways, ported from the React Native client
// (fitlink-app lib/passWeeks.ts, lib/passSeason.ts, lib/passPublish.ts)
// so the web editor and the apps read and write one shape. Pure.
//
// A pass's `track` is a flat ordered list of nodes {type, id?, label?,
// order, day?}. Every week opens with a "Week N: …" milestone; content
// nodes carry their weekday (0 = Monday) so the grid reads back exactly as
// it was painted. Older tracks without markers are sliced evenly.

const WEEK_LABEL_RE = /^Week (\d+):\s*(.*)$/;
export const REST_WEEK_LABEL = 'Rest week';

export const isWeekMarker = (n) => n.type === 'milestone' && !!n.label && WEEK_LABEL_RE.test(n.label);
export const nodeKey = (n) => `${n.type}:${n.id ?? ''}:${n.label ?? ''}`;
export const emptyDays = () => Array.from({ length: 7 }, () => []);

export function weekStartIndices(track, durationWeeks) {
  const starts = [];
  track.forEach((n, i) => { if (isWeekMarker(n)) starts.push(i); });
  if (starts.length >= 2) {
    if (starts[0] !== 0) starts.unshift(0);
    return starts;
  }
  const weeks = durationWeeks && durationWeeks > 0 ? durationWeeks : 1;
  if (track.length === 0) return [0];
  const per = track.length / weeks;
  return Array.from({ length: weeks }, (_, w) => Math.floor(w * per));
}

export function weekOfPosition(position, track, durationWeeks) {
  const starts = weekStartIndices(track, durationWeeks);
  let week = 1;
  for (let w = 0; w < starts.length; w++) {
    if (position >= starts[w]) week = w + 1;
    else break;
  }
  return week;
}

export function totalWeeks(track, durationWeeks) {
  return Math.max(weekStartIndices(track, durationWeeks).length, durationWeeks || 0, 1);
}

export function diffTracks(before, after, durationWeeks) {
  const count = (list) => {
    const m = new Map();
    list.forEach((node, i) => {
      if (isWeekMarker(node)) return;
      const k = nodeKey(node);
      const e = m.get(k);
      if (e) e.n += 1; else m.set(k, { node, n: 1, firstIndex: i });
    });
    return m;
  };
  const b = count(before);
  const a = count(after);
  const out = [];
  a.forEach((entry, k) => {
    const prev = b.get(k)?.n ?? 0;
    for (let i = 0; i < entry.n - prev; i++) out.push({ kind: 'added', node: entry.node, week: weekOfPosition(entry.firstIndex, after, durationWeeks) });
  });
  b.forEach((entry, k) => {
    const next = a.get(k)?.n ?? 0;
    for (let i = 0; i < entry.n - next; i++) out.push({ kind: 'removed', node: entry.node, week: weekOfPosition(entry.firstIndex, before, durationWeeks) });
  });
  return out;
}

export function seasonToTrack(weeks, finalMilestones = []) {
  const nodes = [];
  weeks.forEach((wk, i) => {
    const label = (wk.label ?? '').trim();
    if (wk.isRest && !label) nodes.push({ type: 'milestone', label: `Week ${i + 1}: ${REST_WEEK_LABEL}` });
    else nodes.push({ type: 'milestone', label: `Week ${i + 1}: ${label}`.trimEnd() });
    if (wk.isRest) return;
    wk.days.forEach((day, dayIndex) => {
      day.forEach((d) => {
        if (d.kind === 'workout' && d.id) nodes.push({ type: 'workout', id: d.id, day: dayIndex });
        else if (d.kind === 'diet' && d.id) nodes.push({ type: 'diet', id: d.id, day: dayIndex });
        else if (d.kind === 'checkin') nodes.push({ type: 'milestone', label: 'Check-in', day: dayIndex });
        else if (d.kind === 'live') nodes.push({ type: 'milestone', label: 'Live session', day: dayIndex });
        else if (d.kind === 'milestone') nodes.push({ type: 'milestone', label: (d.label ?? '').trim() || 'Milestone', day: dayIndex });
      });
    });
  });
  finalMilestones.forEach((m) => nodes.push({ type: 'milestone', label: m }));
  return nodes.map((n, i) => ({ ...n, order: i }));
}

export function spreadDays(n) {
  const patterns = { 0: [], 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };
  if (n <= 7) return patterns[n];
  return Array.from({ length: n }, (_, i) => i % 7);
}

export function trackToSeason(track, durationWeeks, names = {}) {
  const sorted = [...(track ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const isDayMilestone = (n) => n.type === 'milestone' && (n.label === 'Check-in' || n.label === 'Live session');
  const isFinal = (n) => n.type === 'milestone' && !isWeekMarker(n) && !isDayMilestone(n);
  let end = sorted.length;
  while (end > 0 && isFinal(sorted[end - 1])) end--;
  const finalMilestones = sorted.slice(end).map((n) => n.label ?? 'Milestone');
  const body = sorted.slice(0, end);
  const starts = weekStartIndices(body, durationWeeks);
  const weeks = [];
  for (let w = 0; w < starts.length; w++) {
    const from = starts[w];
    const to = w + 1 < starts.length ? starts[w + 1] : body.length;
    let slice = body.slice(from, to);
    let label = '';
    let isRest = false;
    let marked = false;
    if (slice[0] && isWeekMarker(slice[0])) {
      marked = true;
      const m = WEEK_LABEL_RE.exec(slice[0].label ?? '');
      const text = (m?.[2] ?? '').trim();
      if (text === REST_WEEK_LABEL) isRest = true; else label = text;
      slice = slice.slice(1);
    }
    const days = emptyDays();
    const toDayNode = (n) => {
      if (n.type === 'workout' && n.id) return { kind: 'workout', id: n.id, name: names.workoutName?.(n.id) };
      if (n.type === 'diet' && n.id) return { kind: 'diet', id: n.id, name: names.dietName?.(n.id) };
      if (n.type === 'milestone' && n.label === 'Check-in') return { kind: 'checkin' };
      if (n.type === 'milestone' && n.label === 'Live session') return { kind: 'live' };
      if (n.type === 'milestone') return { kind: 'milestone', label: n.label };
      if (n.type === 'class' && n.id) return { kind: 'live', id: n.id, name: n.label };
      return null;
    };
    const placed = slice.every((n) => typeof n.day === 'number' && n.day >= 0 && n.day <= 6);
    if (placed) {
      for (const n of slice) { const d = toDayNode(n); if (d) days[n.day].push(d); }
    } else {
      const byKind = { workout: [], diet: [], other: [] };
      for (const n of slice) {
        const d = toDayNode(n);
        if (!d) continue;
        if (d.kind === 'workout') byKind.workout.push(d);
        else if (d.kind === 'diet') byKind.diet.push(d);
        else byKind.other.push(d);
      }
      const wDays = spreadDays(byKind.workout.length);
      byKind.workout.forEach((n, i) => days[wDays[i]].push(n));
      const dDays = byKind.diet.length === byKind.workout.length && byKind.workout.length > 0 ? wDays : spreadDays(byKind.diet.length);
      byKind.diet.forEach((n, i) => days[dDays[i]].push(n));
      const tail = wDays.length > 0 ? Math.max(...wDays) : 6;
      byKind.other.forEach((n) => days[Math.max(tail, 6)].push(n));
    }
    if (slice.length === 0 && !marked && !isRest && !label) isRest = true;
    weeks.push({ days, label, isRest });
  }
  const declared = durationWeeks && durationWeeks > 0 ? durationWeeks : 0;
  while (weeks.length < declared) weeks.push({ days: emptyDays(), label: '', isRest: false });
  return { weeks, finalMilestones };
}

/** Holders still inside the season, each read against the snapshot they bought. */
export function liveHoldersFor(enrollments, clients, planTrack, durationWeeks) {
  return enrollments
    .filter((e) => e.status === 'active' || e.status === 'paused')
    .map((e) => {
      const snapshot = e.track_snapshot && e.track_snapshot.length > 0 ? e.track_snapshot : (planTrack ?? []);
      return { enrollment: e, client: clients.find((c) => c.id === e.client_id), snapshot, week: weekOfPosition(e.track_position, snapshot, durationWeeks) };
    });
}

/** A started week whose content a change removes stays as the athlete had it. */
export function buildProtectedSnapshot(oldSnap, newTrack, position, removedKeys, durationWeeks) {
  const w = weekOfPosition(position, oldSnap, durationWeeks);
  const oldStarts = weekStartIndices(oldSnap, durationWeeks);
  const weekStart = oldStarts[w - 1] ?? 0;
  const oldSlice = oldSnap.slice(weekStart, oldStarts[w] ?? oldSnap.length);
  const bitten = oldSlice.some((n) => removedKeys.has(nodeKey(n)));
  const started = position > weekStart;
  if (!bitten || !started) return newTrack.map((n, i) => ({ ...n, order: i }));
  const newStarts = weekStartIndices(newTrack, durationWeeks);
  const start = Math.min(newStarts[w - 1] ?? newTrack.length, newTrack.length);
  const end = Math.min(newStarts[w] ?? newTrack.length, newTrack.length);
  return [...newTrack.slice(0, start), ...oldSlice, ...newTrack.slice(end)].map((n, i) => ({ ...n, order: i }));
}

export function describeChanges(changes, labelOf) {
  const grouped = (kind) => {
    const counts = new Map();
    changes.filter((c) => c.kind === kind).forEach((c) => { const l = labelOf(c.node); counts.set(l, (counts.get(l) ?? 0) + 1); });
    return [...counts.entries()].map(([l, n]) => (n > 1 ? `${l} (${n} days)` : l));
  };
  const added = grouped('added');
  const removed = grouped('removed');
  const parts = [];
  if (added.length > 0) parts.push(`added ${added.join(', ')}`);
  if (removed.length > 0) parts.push(`removed ${removed.join(', ')}`);
  return parts.join(', ');
}

/** "Build · W1–4" segments from consecutive weeks that share a label. */
export function blocksFromWeeks(weeks) {
  const blocks = [];
  weeks.forEach((w, i) => {
    const label = w.isRest ? 'Deload' : (w.label || '').trim();
    const last = blocks[blocks.length - 1];
    if (last && last.label === label) last.to = i + 1;
    else blocks.push({ label, from: i + 1, to: i + 1 });
  });
  return blocks.some((b) => b.label) ? blocks : [];
}

/** "5 × 5" / "3 × 8-10" / "3 × 45 s" from a workout_exercises row. */
export function rxLine(ex) {
  const sets = ex.sets ?? 0;
  const reps = String(ex.reps ?? '').trim();
  if (!reps) return `${sets} sets`;
  return `${sets} × ${reps}`;
}
