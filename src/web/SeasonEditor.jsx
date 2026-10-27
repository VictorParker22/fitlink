// /coach/seasons — the season editor (design "Coach · Season editor (web)").
// Weeks as tabs, the selected week as seven day cards, the coach's workouts
// in a rail to drag or add onto a day. A day's workout shows its exercises
// with sets × reps that edit in place (those write to the workout, which
// every season sharing it sees, the same as the app's builder). Nothing on
// the season saves by itself: Publish reviews the changes against who is
// inside the season, then writes the pass and every holder's snapshot in
// one transaction (publish_plan_track), a started week kept as it was. The
// call carries the plan's track_version the editor loaded; a pass published
// elsewhere since answers stale_version, and the coach chooses between the
// latest season and the edits on screen (never a silent overwrite).
//
// The price reads per period, and a season says what athletes pay in all:
// "$180 / month · Athletes pay 2 monthly payments ($360)" (season.js, the
// server's formula: a season stops billing after its last payment). Publishing
// a new week count rewrites plans.duration_weeks, which changes the payments
// for buyers from then on, and can reach an athlete already paying whose
// subscription predates the season stamp (the server then bills by the plan
// as it is now); the review says both before the coach publishes, with the
// count of athletes paying now (client_subscriptions, the coach's own rows).
//
// Not drawn: the assistant's "Suggested Week 4" card (no server support)
// and templates (no rows).
//
// Blocks and single sessions (2026-10-25, fitlink-app migration 20261025120000; rules and words in blocks.js). New
// pass makes a block (a length, default 8 weeks from the server's config; a start date and a last sign-up day,
// both optional) or a single session (a time, optional, and its minutes), priced at least the $25 minimum per
// payment, with a plain plans INSERT (plans_insert: the coach's own trainer_id). The kind is chosen once, at
// creation, and never shown as editable (guard_plan_shape kind_fixed). Pass details edits a block's start date and
// last sign-up day, or a session's time and minutes (plans_update); the server refuses moving a held block's start
// (block_has_holders) and clearing or back-dating a held session's time (session_held), and its sentence is shown.
// A session has no weeks: its page is the details. Cancellation policy edits trainers.cancellation_policy on the
// coach's own row (trainers_update_own, at most 600 characters, public through trainers_public); "Saved" only once
// the row came back.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from './supabase';
import { coachPriceLine, lengthChangeLine, passBilling, payingFor, seasonWeeks, usdFromCents } from './season';
import {
  BLOCK_DEFAULT_WEEKS, POLICY_MAX, SESSION_MINUTES_DEFAULT, SESSION_MINUTES_MAX, SESSION_MINUTES_MIN, SESSION_FREE_CANCEL_HOURS,
  editorKindLine, isoToLocalInput, lengthBreaksSignUpWindow, lengthWriteError, localInputToIso, newPassRow, passKind,
  planWriteError, timeZoneNote,
} from './blocks';
import { createPass, myCancellationPolicy, saveCancellationPolicy, updatePass } from './api';
import { MINIMUM_CHARGE_USD, usd } from './site/pricing';
import {
  blocksFromWeeks, buildProtectedSnapshot, describeChanges, diffTracks, emptyDays, liveHoldersFor,
  nodeKey, seasonToTrack, trackToSeason,
} from './passTrack';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BLOCK_FILLS = ['#15171C', '#3A3D45', '#5B5F68', '#D6D1C7'];

/** The sidebar's short line for a pass: "8 weeks · $180 / month", "$20 / month", "Session · $40". */
function passSideLabel(p) {
  const b = passBilling(p);
  if (passKind(p) === 'session') return `Session · ${b.priced ? usdFromCents(b.priceCents) : 'no price yet'}`;
  const price = b.priced ? `${usdFromCents(b.priceCents)} / ${b.period}` : 'no price yet';
  return b.kind === 'season' ? `${b.weeks} weeks · ${price}` : price;
}

const Grip = () => (
  <svg className="grip" width="12" height="16" viewBox="0 0 12 16" aria-hidden="true"><path d="M3 3h.01M9 3h.01M3 8h.01M9 8h.01M3 13h.01M9 13h.01" style={{ fill: 'none', stroke: '#8A8E97', strokeWidth: 2.6, strokeLinecap: 'round' }} /></svg>
);

export default function SeasonEditor({ session }) {
  const uid = session.user.id;
  const { planId } = useParams();
  const navigate = useNavigate();
  // subscriptions: the coach's client_subscriptions rows (plan_id, status), or null when that read failed.
  const [data, setData] = useState({ plans: [], workouts: [], enrollments: [], clients: [], subscriptions: [], loaded: false, error: null });
  const [weeks, setWeeks] = useState([]);
  const [finalMilestones, setFinalMilestones] = useState([]);
  const [baseline, setBaseline] = useState([]);
  const [week, setWeek] = useState(0);
  const [over, setOver] = useState(null);
  const [toast, setToast] = useState(null);
  const [review, setReview] = useState(false);
  const [preview, setPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [stale, setStale] = useState(false); // publish answered stale_version
  const [picker, setPicker] = useState(null); // { dayIndex, workoutId } exercise picker
  const [chooser, setChooser] = useState(null); // rail item awaiting a day
  const [creating, setCreating] = useState(false); // the New pass sheet
  const [editingDetails, setEditingDetails] = useState(false); // the Pass details sheet
  const [editingPolicy, setEditingPolicy] = useState(false); // the Cancellation policy sheet
  const [now] = useState(() => Date.now());
  const toastTimer = useRef();

  const plan = useMemo(() => data.plans.find((p) => p.id === planId) ?? data.plans[0] ?? null, [data.plans, planId]);
  const workoutsById = useMemo(() => Object.fromEntries(data.workouts.map((w) => [w.id, w])), [data.workouts]);
  const names = useMemo(() => ({ workoutName: (id) => workoutsById[id]?.name }), [workoutsById]);

  const say = useCallback((text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const load = useCallback(async () => {
    try {
      const [plans, workouts, clients] = await Promise.all([
        supabase.from('plans').select('*').eq('trainer_id', uid).order('created_at'),
        supabase.from('workouts').select('*, workout_exercises(*, exercises(*))').eq('trainer_id', uid).order('name'),
        supabase.from('clients').select('id, name').eq('trainer_id', uid),
      ]);
      if (plans.error) throw plans.error;
      const ids = (plans.data ?? []).map((p) => p.id);
      const enrollments = ids.length > 0
        ? (await supabase.from('client_plan_enrollments').select('*').in('plan_id', ids)).data ?? []
        : [];
      // Who pays for each pass now: the length review says when a new length can reach them.
      const subs = ids.length > 0
        ? await supabase.from('client_subscriptions').select('plan_id, status').eq('trainer_id', uid).in('plan_id', ids)
        : { data: [], error: null };
      const subscriptions = subs.error ? null : subs.data ?? [];
      const next = { plans: plans.data ?? [], workouts: workouts.data ?? [], enrollments, clients: clients.data ?? [], subscriptions, loaded: true, error: null };
      setData(next);
      return next.plans;
    } catch (e) {
      setData((d) => ({ ...d, loaded: true, error: e.message || 'Couldn’t load your seasons.' }));
      return null;
    }
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  // Read the selected pass into weeks once per pass (and after a publish).
  const seededFor = useRef(null);
  useEffect(() => {
    if (!plan || !data.loaded) return;
    if (seededFor.current === plan.id) return;
    seededFor.current = plan.id;
    const track = plan.track ?? [];
    const season = trackToSeason(track, plan.duration_weeks, names);
    let ws = season.weeks;
    // An empty track (a pass just made here, 2026-10-25) starts as its weeks, none of them a rest week
    // (trackToSeason pads an empty track with a rest-marked first week); an open pass starts with four.
    if (track.length === 0) ws = Array.from({ length: seasonWeeks(plan.duration_weeks) ?? 4 }, () => ({ days: emptyDays(), label: '', isRest: false }));
    setWeeks(ws);
    setFinalMilestones(season.finalMilestones);
    setBaseline([...track].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    setWeek(0);
  }, [plan, data.loaded, names]);

  const newTrack = useMemo(() => seasonToTrack(weeks, finalMilestones), [weeks, finalMilestones]);
  const changes = useMemo(() => (plan ? diffTracks(baseline, newTrack, plan.duration_weeks) : []), [baseline, newTrack, plan]);
  const holders = useMemo(() => (plan ? liveHoldersFor(data.enrollments.filter((e) => e.plan_id === plan.id), data.clients, plan.track, plan.duration_weeks) : []), [plan, data.enrollments, data.clients]);
  const blocks = useMemo(() => blocksFromWeeks(weeks), [weeks]);
  const daysPerWeek = useMemo(() => {
    const counts = weeks.filter((w) => !w.isRest).map((w) => w.days.filter((d) => d.some((n) => n.kind === 'workout')).length);
    if (counts.length === 0) return null;
    return Math.round(counts.reduce((a, b) => a + b, 0) / counts.length);
  }, [weeks]);

  // ── season edits (in memory until Publish) ─────────────────────────────
  const updateWeek = (i, fn) => setWeeks((ws) => ws.map((w, j) => (j === i ? fn(w) : w)));
  const addToDay = (dayIndex, node) => updateWeek(week, (w) => ({ ...w, isRest: false, days: w.days.map((d, j) => (j === dayIndex ? [...d, node] : d)) }));
  const removeFromDay = (dayIndex, nodeIndex) => updateWeek(week, (w) => ({ ...w, days: w.days.map((d, j) => (j === dayIndex ? d.filter((_, k) => k !== nodeIndex) : d)) }));
  const addWorkoutToDay = (dayIndex, workoutId) => {
    const w = workoutsById[workoutId];
    if (!w) return;
    addToDay(dayIndex, { kind: 'workout', id: workoutId, name: w.name });
    say(`${w.name} on ${DAYS[dayIndex]}`);
  };
  const addWeek = () => setWeeks((ws) => [...ws, { days: emptyDays(), label: '', isRest: false }]);
  const removeLastWeek = () => setWeeks((ws) => (ws.length > 1 ? ws.slice(0, -1) : ws));

  // ── workout edits (write now; the workout is shared) ──────────────────
  async function addExercise(workoutId, exercise) {
    const w = workoutsById[workoutId];
    const order = (w?.workout_exercises ?? []).length;
    const { error } = await supabase.from('workout_exercises').insert({ workout_id: workoutId, exercise_id: exercise.id, sets: 3, reps: '8', rest_seconds: 90, order_index: order });
    if (error) { say('Couldn’t add it. Try again.'); return; }
    say(`${exercise.name} added to ${w?.name ?? 'the workout'}`);
    setPicker(null);
    await load();
  }
  async function removeExercise(rowId, workoutName) {
    const { error } = await supabase.from('workout_exercises').delete().eq('id', rowId);
    if (error) { say('Couldn’t remove it.'); return; }
    say(`Removed from ${workoutName}`);
    await load();
  }
  async function patchExercise(rowId, patch) {
    const { error } = await supabase.from('workout_exercises').update(patch).eq('id', rowId);
    if (error) say('Couldn’t save that.');
    else await load();
  }

  // ── publish ─────────────────────────────────────────────────────────────
  async function publish() {
    if (!plan) return;
    setPublishing(true);
    try {
      const removedKeys = new Set(changes.filter((c) => c.kind === 'removed').map((c) => nodeKey(c.node)));
      const snapshots = holders.map((h) => ({
        id: h.enrollment.id,
        track_snapshot: buildProtectedSnapshot(h.snapshot, newTrack, h.enrollment.track_position, removedKeys, plan.duration_weeks),
      }));
      // The version the editor loaded: the server refuses the publish when the
      // pass moved on since (stale_version), so nobody's edits are overwritten blind.
      const args = { p_plan_id: plan.id, p_track: newTrack, p_snapshots: snapshots, p_expected_version: plan.track_version ?? null };
      let { data: moved, error } = await supabase.rpc('publish_plan_track', args);
      if (error?.code === 'PGRST202') {
        // The server still has the three-argument publish_plan_track (deployed
        // ahead of the track_version migration): publish without the check.
        ({ data: moved, error } = await supabase.rpc('publish_plan_track', { p_plan_id: plan.id, p_track: newTrack, p_snapshots: snapshots }));
      }
      if (error) throw error;
      // Version history is best effort, written only for a publish that landed:
      // the pass and the snapshots are what matter.
      try {
        const { data: v } = await supabase.from('plan_versions').select('version').eq('plan_id', plan.id).order('version', { ascending: false }).limit(1);
        await supabase.from('plan_versions').insert({ plan_id: plan.id, version: ((v?.[0]?.version) ?? 0) + 1, track: baseline, summary: describeChanges(changes, labelOf) || 'Layout' });
      } catch { /* optional table */ }
      // The length sets how many payments a buyer makes from now on, so a write
      // that did not land is said, never assumed.
      let lengthKept = null;
      let lengthWhy = null;
      if (plan.duration_weeks && plan.duration_weeks !== weeks.length) {
        const { error: lenErr } = await supabase.from('plans').update({ duration_weeks: weeks.length }).eq('id', plan.id);
        if (lenErr) {
          lengthKept = plan.duration_weeks;
          // plans_enrollment_closes_window: the last sign-up day would fall after the new end (said specifically).
          lengthWhy = String(lenErr.message ?? '').includes('plans_enrollment_closes_window') ? lengthWriteError(lenErr) : null;
        }
      }
      setBaseline(newTrack);
      setReview(false);
      const n = typeof moved === 'number' ? moved : snapshots.length;
      const done = n > 0 ? `Published · ${n} athlete${n === 1 ? '' : 's'} updated` : 'Published';
      say(lengthKept !== null
        ? `${done}. The season length didn’t save: ${lengthWhy ? `${lengthWhy} ` : ''}It is still ${lengthKept} weeks, and buyers pay for that.`
        : done);
      seededFor.current = null;
      await load();
    } catch (e) {
      const text = String(e?.message ?? '');
      if (text.includes('stale_version')) {
        // The coach's edits stay in `weeks`; the stale sheet offers Reload or Keep editing.
        setReview(false);
        setStale(true);
        return;
      }
      say(text.includes('permission') ? 'Not allowed: this pass isn’t yours.' : 'Couldn’t publish. Check your connection and try again.');
    } finally {
      setPublishing(false);
    }
  }

  // After stale_version. Reload: the latest season replaces what is on
  // screen (the coach chose to drop the edits). Keep editing: the edits stay,
  // and the baseline becomes the latest track, so the next review lists every
  // difference, including what a publish would undo. Both re-read track_version.
  async function reloadLatest() {
    setStale(false);
    seededFor.current = null;
    await load();
    say('Showing the latest season');
  }
  async function keepEditing() {
    setStale(false);
    const plans = await load();
    const latest = plans?.find((p) => p.id === plan.id);
    if (latest) setBaseline([...(latest.track ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  }

  const labelOf = (n) => (n.type === 'workout' ? (workoutsById[n.id]?.name ?? 'a workout') : (n.label ?? n.type));

  if (!data.loaded) return <div className="fl-empty"><p className="fl-note">Loading your seasons…</p></div>;
  if (data.error) return <div className="fl-empty"><h1 className="fl-title">Couldn’t load</h1><p className="fl-sub">{data.error}</p></div>;
  const afterCreate = async (made) => {
    setCreating(false);
    seededFor.current = null;
    await load();
    navigate(`/coach/seasons/${made.id}`);
    say(`${made.name} is made. ${passKind(made) === 'session' ? 'Athletes can book it from your page.' : 'Build its weeks, then publish.'}`);
  };

  if (!plan) {
    return (
      <div className="fl-empty">
        <h1 className="fl-title">No pass yet</h1>
        <p className="fl-sub">Make a block (a set number of weeks, with a start date if you like) or a single session. A block’s weeks are built here.</p>
        <div className="fl-actions"><button type="button" className="fl-btn accent lg" onClick={() => setCreating(true)}>New pass</button></div>
        {creating && <NewPassSheet uid={uid} onClose={() => setCreating(false)} onMade={afterCreate} />}
      </div>
    );
  }

  const isSession = passKind(plan) === 'session';

  const cur = weeks[week] ?? { days: emptyDays(), label: '', isRest: false };
  const lengthLine = lengthChangeLine(plan, weeks.length, payingFor(data.subscriptions, plan.id));
  // A shorter dated block whose last sign-up day would fall after its new end: the server refuses the length.
  const lengthBlocked = plan.duration_weeks && plan.duration_weeks !== weeks.length ? lengthBreaksSignUpWindow(plan, weeks.length) : null;
  const holdersHere = plan.duration_weeks ? data.enrollments.filter((e) => e.plan_id === plan.id && e.status === 'active').length : holders.length;

  return (
    <div className="fl-editor">
      <aside className="fl-side" aria-label="Seasons">
        <section>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 12px 8px' }}>
            <button type="button" className="fl-btn accent sm" onClick={() => setCreating(true)}>New pass</button>
            <button type="button" className="fl-btn ghost sm" onClick={() => setEditingPolicy(true)}>Cancellation policy</button>
          </div>
          <h2>Your passes</h2>
          {data.plans.map((p) => {
            const n = data.enrollments.filter((e) => e.plan_id === p.id && e.status === 'active').length;
            return (
              <button key={p.id} type="button" className="fl-side-row" aria-current={p.id === plan.id ? 'page' : undefined} onClick={() => { if (changes.length > 0 && !window.confirm('Leave without publishing? Your changes to this season are lost.')) return; navigate(`/coach/seasons/${p.id}`); }}>
                {p.name} <small>{n > 0 ? `${n} on it` : passSideLabel(p)}{p.archived_at ? ' · archived' : ''}</small>
              </button>
            );
          })}
        </section>
        <section>
          <h2>Inside the season</h2>
          {holders.length === 0 ? <p className="hint fl-note" style={{ padding: '0 12px' }}>Nobody yet. Publishing changes nothing for anyone.</p> : (
            <ul style={{ margin: 0, padding: '0 12px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {holders.map((h) => <li key={h.enrollment.id} className="fl-note">{h.client?.name ?? 'An athlete'} · week {h.week}</li>)}
            </ul>
          )}
        </section>
      </aside>

      <main className="fl-main">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 4px' }}>
          <h1 className="fl-title">{plan.name}</h1>
          <span className="fl-meta">
            {[`${weeks.length} week${weeks.length === 1 ? '' : 's'}`, daysPerWeek ? `${daysPerWeek} day${daysPerWeek === 1 ? '' : 's'} a week` : null, `${holdersHere} athlete${holdersHere === 1 ? '' : 's'} on it`].filter(Boolean).join(' · ')}
          </span>
          <span className="fl-meta">{isSession
            ? (passBilling(plan).priced ? `${usdFromCents(passBilling(plan).priceCents)} · one payment` : 'No price yet. Set one in the FitLink app; nobody can buy this pass until then.')
            : (coachPriceLine(plan) ?? 'No price yet. Set one in the FitLink app; nobody can buy this pass until then.')}</span>
          <div className="fl-pass-details" aria-label="Pass details">
            <span className="fl-meta">{editorKindLine(plan, now)}</span>
            {(isSession || passBilling(plan).kind === 'season') && (
              <div><button type="button" className="fl-btn ghost sm" onClick={() => setEditingDetails(true)}>{isSession ? 'Edit time' : 'Edit dates'}</button></div>
            )}
            {isSession && <p className="fl-note">Athletes cancel for a full refund up to {SESSION_FREE_CANCEL_HOURS} hours before; inside that, your cancellation policy applies (it’s on your page).</p>}
          </div>
        </div>

        {!isSession && (<>

        {blocks.length > 0 && (
          <div className="fl-blocks" aria-label="Season blocks" style={{ gridTemplateColumns: blocks.map((b) => `${b.to - b.from + 1}fr`).join(' ') }}>
            {blocks.map((b, i) => (
              <span key={i} className="fl-block" style={{ background: BLOCK_FILLS[Math.min(i, BLOCK_FILLS.length - 1)], color: i === BLOCK_FILLS.length - 1 || (b.label === 'Deload' && i > 0) ? '#15171C' : '#fff' }}>
                {b.label || 'Untitled'} · {b.from === b.to ? `W${b.from}` : `W${b.from}–${b.to}`}
              </span>
            ))}
          </div>
        )}

        <div role="tablist" aria-label="Weeks" className="fl-weeks fl-glass">
          {weeks.map((_, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === week} onClick={() => setWeek(i)}>W{i + 1}</button>
          ))}
          <button type="button" onClick={addWeek} aria-label="Add a week" title="Add a week">+</button>
        </div>

        <div className="fl-week-head">
          <label htmlFor="wk-label" className="fl-day-name">Week {week + 1}</label>
          <input id="wk-label" placeholder="Block name, e.g. Build" value={cur.label} maxLength={40} onChange={(e) => updateWeek(week, (w) => ({ ...w, label: e.target.value }))} />
          <button type="button" className="fl-chip" aria-pressed={!!cur.isRest} onClick={() => updateWeek(week, (w) => ({ ...w, isRest: !w.isRest }))}>Rest week</button>
          {weeks.length > 1 && week === weeks.length - 1 && <button type="button" className="fl-btn quiet sm" onClick={removeLastWeek}>Remove this week</button>}
        </div>

        <div className="fl-days">
          {cur.days.map((nodes, dayIndex) => {
            const workoutNodes = nodes.filter((n) => n.kind === 'workout');
            const title = workoutNodes.map((n) => workoutsById[n.id]?.name ?? 'Workout').join(' + ') || (cur.isRest ? 'Rest week' : 'Rest');
            return (
              <section
                key={dayIndex}
                className={`fl-day${over === dayIndex ? ' over' : ''}${cur.isRest ? ' rest' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setOver(dayIndex); }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData('text/fitlink-workout'); if (id) addWorkoutToDay(dayIndex, id); }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="fl-day-name">{DAYS[dayIndex]}</span>
                  <h3>{title}</h3>
                </div>
                {nodes.map((n, k) => {
                  if (n.kind === 'workout') {
                    const w = workoutsById[n.id];
                    const rows = [...(w?.workout_exercises ?? [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
                    return (
                      <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {workoutNodes.length > 1 && <span className="fl-day-name">{w?.name ?? 'Workout'}</span>}
                        <ul className="fl-ex-list">
                          {rows.map((r) => (
                            <li key={r.id} className="fl-ex">
                              <Grip />
                              <span className="body">
                                <b>{r.exercises?.name ?? 'Exercise'}</b>
                                <small>
                                  <input aria-label="Sets" type="number" min={1} max={12} defaultValue={r.sets ?? 3} onBlur={(e) => { const v = Number(e.target.value); if (v >= 1 && v !== r.sets) patchExercise(r.id, { sets: v }); }} />
                                  {' × '}
                                  <input aria-label="Reps" defaultValue={r.reps ?? ''} maxLength={12} style={{ width: 64 }} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== r.reps) patchExercise(r.id, { reps: v }); }} />
                                  {r.notes ? ` · ${r.notes}` : ''}
                                </small>
                              </span>
                              <button type="button" className="x" aria-label={`Remove ${r.exercises?.name ?? 'exercise'} from ${w?.name ?? 'the workout'}`} onClick={() => removeExercise(r.id, w?.name ?? 'the workout')}>✕</button>
                            </li>
                          ))}
                        </ul>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button type="button" className="fl-btn ghost sm" onClick={() => setPicker({ dayIndex, workoutId: n.id })}>+ Add exercise</button>
                          <button type="button" className="fl-btn quiet sm" onClick={() => removeFromDay(dayIndex, k)}>Take off this day</button>
                        </div>
                      </div>
                    );
                  }
                  const label = n.kind === 'checkin' ? 'Check-in' : n.kind === 'live' ? 'Live session' : n.kind === 'diet' ? (n.name ?? 'Meal plan') : (n.label ?? 'Milestone');
                  return (
                    <div key={k} className="fl-ex">
                      <span className="body"><b>{label}</b></span>
                      <button type="button" className="x" aria-label={`Remove ${label}`} onClick={() => removeFromDay(dayIndex, k)}>✕</button>
                    </div>
                  );
                })}
                {!cur.isRest && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto' }}>
                    {workoutNodes.length === 0 && data.workouts.length > 0 && (
                      <select aria-label={`Add a workout to ${DAYS[dayIndex]}`} className="fl-chip" value="" onChange={(e) => { if (e.target.value) addWorkoutToDay(dayIndex, e.target.value); }}>
                        <option value="">+ Add workout</option>
                        {data.workouts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    )}
                    {!nodes.some((n) => n.kind === 'checkin') && dayIndex === 6 && (
                      <button type="button" className="fl-chip" onClick={() => addToDay(dayIndex, { kind: 'checkin' })}>+ Check-in</button>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
        {data.workouts.length === 0 && (
          <p className="fl-note">No workouts yet. Build one in the FitLink app (Seasons → New workout); it appears here to drag onto days.</p>
        )}
        </>)}
      </main>

      {!isSession && (
      <aside className="fl-rail" aria-label="Your workouts">
        <Rail workouts={data.workouts} onPick={(w) => setChooser(w)} />
        <span className="hint">Drag onto any day, or tap Add and pick the day. Exercises you write once stay here for every season.</span>
      </aside>
      )}

      {!isSession && (
      <div className="fl-float fl-glass">
        <button type="button" className="fl-btn" style={{ background: 'rgba(21,23,28,0.06)' }} onClick={() => setPreview(true)}>Preview as athlete</button>
        <button type="button" className="fl-btn accent" disabled={changes.length === 0 && baseline.length > 0} onClick={() => setReview(true)}>
          {changes.length > 0 ? `Publish ${changes.length} change${changes.length === 1 ? '' : 's'}` : (baseline.length === 0 ? 'Publish season' : 'Published')}
        </button>
      </div>
      )}

      {creating && <NewPassSheet uid={uid} onClose={() => setCreating(false)} onMade={afterCreate} />}
      {editingDetails && (
        <DetailsSheet plan={plan} onClose={() => setEditingDetails(false)}
          onSaved={async () => { setEditingDetails(false); await load(); say('Saved'); }} />
      )}
      {editingPolicy && <PolicySheet uid={uid} onClose={() => setEditingPolicy(false)} onSaved={() => { setEditingPolicy(false); say('Cancellation policy saved'); }} />}

      {chooser && (
        <Sheet title={`${chooser.name} on which day?`} onClose={() => setChooser(null)}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {DAYS.map((d, i) => <button key={d} type="button" className="fl-chip" onClick={() => { addWorkoutToDay(i, chooser.id); setChooser(null); }}>{d}</button>)}
          </div>
          <p className="fl-note">Week {week + 1}. Switch the week tab first to put it elsewhere.</p>
        </Sheet>
      )}

      {picker && (
        <ExercisePicker uid={uid} workout={workoutsById[picker.workoutId]} onClose={() => setPicker(null)} onPick={(ex) => addExercise(picker.workoutId, ex)} />
      )}

      {review && (
        <Sheet title={changes.length > 0 ? `${changes.length} change${changes.length === 1 ? '' : 's'} to publish` : 'Publish this season'} onClose={() => !publishing && setReview(false)}>
          <ul className="fl-review" style={{ margin: 0, padding: 0 }}>
            {changes.length === 0 && <li>The season as it stands goes to the pass. Nobody inside is moved.</li>}
            {changes.map((c, i) => {
              const inWeek = holders.filter((h) => h.week === c.week);
              const note = inWeek.length === 0
                ? `nobody has reached week ${c.week}`
                : c.kind === 'removed'
                  ? `${inWeek.map((h) => h.client?.name ?? 'an athlete').join(', ')} ${inWeek.length === 1 ? 'is' : 'are'} in week ${c.week} and keep${inWeek.length === 1 ? 's' : ''} it as it was`
                  : `${inWeek.map((h) => h.client?.name ?? 'an athlete').join(', ')} ${inWeek.length === 1 ? 'is' : 'are'} in week ${c.week} and get${inWeek.length === 1 ? 's' : ''} it`;
              return <li key={i}><span>{c.kind === 'added' ? 'Added' : 'Removed'} {labelOf(c.node)} · week {c.week}</span><small>{note}</small></li>;
            })}
          </ul>
          {lengthLine && !lengthBlocked && <p className="fl-copy">{lengthLine}</p>}
          {lengthBlocked && <div className="fl-error" role="alert">{lengthBlocked} Publishing now keeps the block at {plan.duration_weeks} weeks.</div>}
          <p className="fl-note">The pass and every athlete's copy update together. A week an athlete has started keeps what it had.</p>
          <button type="button" className="fl-btn accent lg" disabled={publishing} onClick={publish}>{publishing ? 'Publishing…' : 'Publish changes'}</button>
        </Sheet>
      )}

      {stale && (
        <Sheet title="Season changed" onClose={keepEditing}>
          <p style={{ fontSize: 16 }}>This season changed on another device. Reload to see the latest before publishing.</p>
          <p className="fl-note">Reload replaces what is on screen with the latest season; the edits you made here are dropped. Keep editing keeps them, and the next review compares them against the latest version so you can see what publishing would change.</p>
          <button type="button" className="fl-btn accent lg" onClick={reloadLatest}>Reload</button>
          <button type="button" className="fl-btn quiet" onClick={keepEditing}>Keep editing</button>
        </Sheet>
      )}

      {preview && (
        <Sheet title={`Week ${week + 1} as an athlete sees it`} onClose={() => setPreview(false)}>
          <div className="fl-preview">
            {cur.days.map((nodes, i) => {
              const w = nodes.filter((n) => n.kind === 'workout').map((n) => workoutsById[n.id]).filter(Boolean);
              const other = nodes.filter((n) => n.kind !== 'workout');
              const title = w.map((x) => x.name).join(' + ') || (other.some((n) => n.kind === 'checkin') ? 'Weekly check-in' : 'Rest');
              const count = w.reduce((a, x) => a + (x.workout_exercises?.length ?? 0), 0);
              return (
                <div key={i} className="fl-preview-row" style={other.some((n) => n.kind === 'checkin') && w.length === 0 ? { background: '#FBE9DF' } : undefined}>
                  <span className="d"><span>{DAYS_SHORT[i]}</span><span>{i + 1}</span></span>
                  <span className="t"><b>{cur.isRest ? 'Rest' : title}</b><small>{cur.isRest ? 'Rest week' : (count > 0 ? `${count} exercise${count === 1 ? '' : 's'}` : (w.length === 0 && other.length === 0 ? 'Walk if you feel like it' : ''))}</small></span>
                </div>
              );
            })}
          </div>
        </Sheet>
      )}

      {toast && <div className="fl-toast" role="status">{toast}</div>}
    </div>
  );
}

function Rail({ workouts, onPick }) {
  const [q, setQ] = useState('');
  const list = workouts.filter((w) => !q || w.name.toLowerCase().includes(q.toLowerCase()) || (w.workout_exercises ?? []).some((e) => (e.exercises?.name ?? '').toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <h2>Your workouts</h2>
      <label htmlFor="rail-q" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search workouts</label>
      <input id="rail-q" type="search" placeholder="Search workouts" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul>
        {list.map((w) => (
          <li key={w.id} draggable onDragStart={(e) => { e.dataTransfer.setData('text/fitlink-workout', w.id); e.dataTransfer.effectAllowed = 'copy'; }}>
            <Grip />
            <span className="body">
              <b>{w.name}</b>
              <small>{(w.workout_exercises ?? []).slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)).map((e) => e.exercises?.name).filter(Boolean).slice(0, 3).join(' · ') || 'No exercises yet'}</small>
            </span>
            <button type="button" onClick={() => onPick(w)} aria-label={`Add ${w.name} to a day`}>Add</button>
          </li>
        ))}
        {list.length === 0 && <li className="fl-note" style={{ cursor: 'default' }}>{q ? `Nothing matches “${q}”.` : 'No workouts yet.'}</li>}
      </ul>
    </>
  );
}

const CATEGORY_CHIPS = ['legs', 'back', 'chest', 'shoulders', 'arms', 'core', 'cardio'];

function ExercisePicker({ uid, workout, onClose, onPick }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(null);
  const [rows, setRows] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('exercises').select('id, name, category, muscle_group, equipment, image_url, trainer_id, is_custom')
        .or(`is_custom.eq.false,trainer_id.eq.${uid}`).order('name').limit(2000);
      setRows(data ?? []);
    })();
  }, [uid]);

  const inWorkout = new Set((workout?.workout_exercises ?? []).map((e) => e.exercise_id));
  const list = (rows ?? []).filter((e) => (!cat || e.category === cat) && (!q || e.name.toLowerCase().includes(q.toLowerCase()) || (e.muscle_group ?? '').toLowerCase().includes(q.toLowerCase())));
  const own = list.filter((e) => e.trainer_id === uid);
  const shared = list.filter((e) => e.trainer_id !== uid).slice(0, 80);

  const row = (e) => (
    <li key={e.id} style={{ cursor: 'default' }}>
      {e.image_url ? <img src={e.image_url} alt="" width={40} height={40} style={{ borderRadius: 10, objectFit: 'cover', background: '#F2F0EB' }} loading="lazy" /> : <span style={{ width: 40, height: 40, borderRadius: 10, background: '#EEEAE3', display: 'inline-block' }} aria-hidden="true" />}
      <span className="body"><b>{e.name}</b><small>{[e.equipment, e.muscle_group].filter(Boolean).join(' · ')}</small></span>
      {inWorkout.has(e.id) ? <small style={{ color: '#8A8E97' }}>In it</small> : <button type="button" onClick={() => onPick(e)}>Add</button>}
    </li>
  );

  return (
    <Sheet title={`Add to ${workout?.name ?? 'the workout'}`} onClose={onClose} wide>
      <div className="fl-rail" style={{ padding: 0, background: 'transparent' }}>
        <label htmlFor="ex-q" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search exercises</label>
        <input id="ex-q" type="search" placeholder="Search exercises" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATEGORY_CHIPS.map((c) => <button key={c} type="button" className="fl-chip" aria-pressed={cat === c} onClick={() => setCat(cat === c ? null : c)}>{c[0].toUpperCase() + c.slice(1)}</button>)}
        </div>
        {rows === null ? <p className="fl-note">Loading the catalogue…</p> : (
          <ul style={{ maxHeight: '50dvh' }}>
            {own.length > 0 && <li className="fl-day-name" style={{ cursor: 'default', borderTop: 0 }}>Your library</li>}
            {own.map(row)}
            {shared.length > 0 && <li className="fl-day-name" style={{ cursor: 'default' }}>All exercises</li>}
            {shared.map(row)}
            {own.length === 0 && shared.length === 0 && <li className="fl-note" style={{ cursor: 'default' }}>Nothing matches.</li>}
          </ul>
        )}
        <p className="fl-note">Adding here changes <b>{workout?.name}</b> everywhere it is used, the same as the app's builder.</p>
      </div>
    </Sheet>
  );
}

/**
 * New pass: a block or a single session. The kind is picked here, once; nothing about it is editable afterwards.
 * newPassRow decides what is sent (only the columns the kind allows); the server's refusal is shown in its words.
 */
function NewPassSheet({ uid, onClose, onMade }) {
  const [form, setForm] = useState({ kind: 'block', name: '', price: '', weeks: String(BLOCK_DEFAULT_WEEKS), startsOn: '', enrollmentCloses: '', sessionAt: '', minutes: String(SESSION_MINUTES_DEFAULT) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const block = form.kind === 'block';

  async function submit(e) {
    e.preventDefault();
    setError(null);
    const made = newPassRow({ ...form, weeks: Number(form.weeks), minutes: Number(form.minutes) }, uid);
    if (made.error) { setError(made.error); return; }
    setBusy(true);
    const res = await createPass(made.row);
    setBusy(false);
    if (res.error) { setError(planWriteError(res.error)); return; }
    onMade(res.plan);
  }

  return (
    <Sheet title="New pass" onClose={() => !busy && onClose()}>
      <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <fieldset className="fl-kind" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="fl-note" style={{ marginBottom: 8 }}>What are you selling? This can’t be changed once the pass exists.</legend>
          <button type="button" className="fl-chip" aria-pressed={block} onClick={() => setForm((f) => ({ ...f, kind: 'block' }))}>Block of weeks</button>
          <button type="button" className="fl-chip" aria-pressed={!block} onClick={() => setForm((f) => ({ ...f, kind: 'session' }))}>Single session</button>
        </fieldset>
        <div className="fl-field"><label htmlFor="np-name">Name</label><input id="np-name" value={form.name} onChange={set('name')} maxLength={120} required /></div>
        <div className="fl-field">
          <label htmlFor="np-price">{block ? 'Price per month (USD)' : 'Price (USD)'}</label>
          <input id="np-price" type="number" inputMode="decimal" min={MINIMUM_CHARGE_USD} step="0.01" value={form.price} onChange={set('price')} required />
          <span className="fl-note">At least {usd(MINIMUM_CHARGE_USD)} per payment.{block ? ' A block is paid monthly until its weeks are paid for, then billing stops.' : ' One payment.'}</span>
        </div>
        {block ? (
          <>
            <div className="fl-form-row">
              <div className="fl-field"><label htmlFor="np-weeks">Length (weeks)</label><input id="np-weeks" type="number" min={1} max={520} step={1} value={form.weeks} onChange={set('weeks')} required /></div>
              <div className="fl-field"><label htmlFor="np-start">Start date (optional)</label><input id="np-start" type="date" value={form.startsOn} onChange={set('startsOn')} /></div>
            </div>
            <div className="fl-field">
              <label htmlFor="np-closes">Last sign-up day (optional)</label>
              <input id="np-closes" type="date" value={form.enrollmentCloses} onChange={set('enrollmentCloses')} disabled={!form.startsOn} />
              <span className="fl-note">{form.startsOn
                ? 'Leave it empty to close sign-ups the day before the start. A later day lets athletes join in progress; week 1 is still the start date.'
                : 'Without a start date, each athlete starts the day they join.'}</span>
            </div>
          </>
        ) : (
          <div className="fl-form-row">
            <div className="fl-field"><label htmlFor="np-at">Date and time (optional)</label><input id="np-at" type="datetime-local" value={form.sessionAt} onChange={set('sessionAt')} aria-describedby="np-at-zone" /><span id="np-at-zone" className="fl-note">{timeZoneNote()}</span></div>
            <div className="fl-field"><label htmlFor="np-min">Minutes</label><input id="np-min" type="number" min={SESSION_MINUTES_MIN} max={SESSION_MINUTES_MAX} step={1} value={form.minutes} onChange={set('minutes')} required /></div>
          </div>
        )}
        {!block && <p className="fl-note">The time is public on your page. Leave it empty to arrange it with each athlete; your cancellation policy then applies.</p>}
        {error && <div className="fl-error" role="alert">{error}</div>}
        <button type="submit" className="fl-btn accent lg" disabled={busy}>{busy ? 'Making it…' : block ? 'Make the block' : 'Make the session'}</button>
      </form>
    </Sheet>
  );
}

/**
 * A pass's details: a block's start date and last sign-up day, a session's time and minutes. The kind is not here.
 * The server refuses moving a held block's start (block_has_holders) and clearing or back-dating a held session's
 * time (session_held); that sentence is shown as it came.
 */
function DetailsSheet({ plan, onClose, onSaved }) {
  const session = passKind(plan) === 'session';
  const [startsOn, setStartsOn] = useState(plan.starts_on ?? '');
  const [closes, setCloses] = useState(plan.enrollment_closes ?? '');
  const [at, setAt] = useState(isoToLocalInput(plan.session_at));
  const [minutes, setMinutes] = useState(String(plan.session_minutes ?? SESSION_MINUTES_DEFAULT));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function save(e) {
    e.preventDefault();
    setError(null);
    let patch;
    if (session) {
      const iso = at ? localInputToIso(at) : null;
      if (at && !iso) { setError('Pick a date and time, or leave it empty to arrange it with each athlete.'); return; }
      const m = Number(minutes);
      if (!Number.isInteger(m) || m < SESSION_MINUTES_MIN || m > SESSION_MINUTES_MAX) { setError(`A session lasts ${SESSION_MINUTES_MIN} to ${SESSION_MINUTES_MAX} minutes.`); return; }
      patch = { session_at: iso, session_minutes: m };
    } else {
      // Validated with the same rule a new block uses (a last sign-up day needs a start and falls inside the block).
      const check = newPassRow({ kind: 'block', name: plan.name, price: Math.max(Number(plan.price) || 0, MINIMUM_CHARGE_USD), weeks: plan.duration_weeks, startsOn, enrollmentCloses: closes }, plan.trainer_id);
      if (check.error) { setError(check.error); return; }
      patch = { starts_on: check.row.starts_on, enrollment_closes: check.row.enrollment_closes };
    }
    setBusy(true);
    const res = await updatePass(plan.id, patch);
    setBusy(false);
    if (res.error) { setError(planWriteError(res.error)); return; }
    onSaved(res.plan);
  }

  return (
    <Sheet title={session ? `${plan.name}: time` : `${plan.name}: dates`} onClose={() => !busy && onClose()}>
      <form onSubmit={save} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {session ? (
          <div className="fl-form-row">
            <div className="fl-field"><label htmlFor="pd-at">Date and time</label><input id="pd-at" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} aria-describedby="pd-at-zone" /><span id="pd-at-zone" className="fl-note">{timeZoneNote()}</span></div>
            <div className="fl-field"><label htmlFor="pd-min">Minutes</label><input id="pd-min" type="number" min={SESSION_MINUTES_MIN} max={SESSION_MINUTES_MAX} step={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} /></div>
          </div>
        ) : (
          <>
            <div className="fl-form-row">
              <div className="fl-field"><label htmlFor="pd-start">Start date</label><input id="pd-start" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} /></div>
              <div className="fl-field"><label htmlFor="pd-closes">Last sign-up day</label><input id="pd-closes" type="date" value={closes} onChange={(e) => setCloses(e.target.value)} disabled={!startsOn} /></div>
            </div>
            <p className="fl-note">Empty start date: each athlete starts the day they join. Empty last sign-up day: sign-ups close the day before the start. Once athletes hold the block, its start date stays.</p>
          </>
        )}
        {session && <p className="fl-note">Once booked, the time can’t be cleared or moved into the past. Any change lets the athlete cancel for a full refund until it starts.</p>}
        {error && <div className="fl-error" role="alert">{error}</div>}
        <button type="submit" className="fl-btn accent lg" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </form>
    </Sheet>
  );
}

/** The coach's own cancellation policy (trainers.cancellation_policy, at most 600 characters, public on their page). */
function PolicySheet({ uid, onClose, onSaved }) {
  const [state, setState] = useState({ loading: true, available: true, error: null });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    myCancellationPolicy(uid)
      .then((r) => { if (!alive) return; setText(r.policy); setState({ loading: false, available: r.available, error: null }); })
      .catch(() => { if (alive) setState({ loading: false, available: true, error: 'Couldn’t load your policy.' }); });
    return () => { alive = false; };
  }, [uid, attempt]);

  async function save(e) {
    e.preventDefault();
    setError(null);
    if (text.trim().length > POLICY_MAX) { setError(`Keep the policy to ${POLICY_MAX} characters.`); return; }
    setBusy(true);
    const err = await saveCancellationPolicy(uid, text);
    setBusy(false);
    if (err) { setError(planWriteError(err)); return; }
    onSaved();
  }

  return (
    <Sheet title="Your cancellation policy" onClose={() => !busy && onClose()}>
      <p className="fl-note">Athletes cancel a session for a full refund up to {SESSION_FREE_CANCEL_HOURS} hours before it. Inside that, and for a session with no time set, your own policy applies. It’s shown on your page under your sessions, as plain text.</p>
      {state.loading ? <p className="fl-note" aria-live="polite">Loading…</p>
        : state.error ? (
          <>
            <div className="fl-error" role="alert">{state.error}</div>
            <button type="button" className="fl-btn accent" onClick={() => { setState({ loading: true, available: true, error: null }); setAttempt((n) => n + 1); }}>Try again</button>
          </>
        ) : !state.available ? <p className="fl-copy">Cancellation policies aren’t available on the server yet.</p>
          : (
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="fl-field">
                <label htmlFor="pol-text">Your policy</label>
                <textarea id="pol-text" value={text} maxLength={POLICY_MAX} onChange={(e) => setText(e.target.value)} placeholder="For example: inside 24 hours, I move the session once at no cost; a no-show is not refunded." />
                <span className="fl-note">{text.length} / {POLICY_MAX}</span>
              </div>
              {error && <div className="fl-error" role="alert">{error}</div>}
              <button type="submit" className="fl-btn accent lg" disabled={busy}>{busy ? 'Saving…' : 'Save policy'}</button>
            </form>
          )}
    </Sheet>
  );
}

function Sheet({ title, children, onClose, wide }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fl-scrim" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`fl-sheet${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <h2>{title}</h2>
          <button type="button" className="fl-btn sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
