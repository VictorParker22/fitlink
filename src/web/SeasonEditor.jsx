// /coach/seasons — the season editor (design "Coach · Season editor (web)").
// Weeks as tabs, the selected week as seven day cards, the coach's workouts
// in a rail to drag or add onto a day. A day's workout shows its exercises
// with sets × reps that edit in place (those write to the workout, which
// every season sharing it sees, the same as the app's builder). Nothing on
// the season saves by itself: Publish reviews the changes against who is
// inside the season, then writes the pass and every holder's snapshot in
// one transaction (publish_plan_track), a started week kept as it was.
//
// Not drawn: the assistant's "Suggested Week 4" card (no server support)
// and templates (no rows).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from './supabase';
import { dollars } from './api';
import {
  blocksFromWeeks, buildProtectedSnapshot, describeChanges, diffTracks, emptyDays, liveHoldersFor,
  nodeKey, seasonToTrack, trackToSeason,
} from './passTrack';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BLOCK_FILLS = ['#15171C', '#3A3D45', '#5B5F68', '#D6D1C7'];

const Grip = () => (
  <svg className="grip" width="12" height="16" viewBox="0 0 12 16" aria-hidden="true"><path d="M3 3h.01M9 3h.01M3 8h.01M9 8h.01M3 13h.01M9 13h.01" style={{ fill: 'none', stroke: '#8A8E97', strokeWidth: 2.6, strokeLinecap: 'round' }} /></svg>
);

export default function SeasonEditor({ session }) {
  const uid = session.user.id;
  const { planId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState({ plans: [], workouts: [], enrollments: [], clients: [], loaded: false, error: null });
  const [weeks, setWeeks] = useState([]);
  const [finalMilestones, setFinalMilestones] = useState([]);
  const [baseline, setBaseline] = useState([]);
  const [week, setWeek] = useState(0);
  const [over, setOver] = useState(null);
  const [toast, setToast] = useState(null);
  const [review, setReview] = useState(false);
  const [preview, setPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [picker, setPicker] = useState(null); // { dayIndex, workoutId } exercise picker
  const [chooser, setChooser] = useState(null); // rail item awaiting a day
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
      setData({ plans: plans.data ?? [], workouts: workouts.data ?? [], enrollments, clients: clients.data ?? [], loaded: true, error: null });
    } catch (e) {
      setData((d) => ({ ...d, loaded: true, error: e.message || 'Couldn’t load your seasons.' }));
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
    if (ws.length === 1 && track.length === 0 && !plan.duration_weeks) ws = Array.from({ length: 4 }, () => ({ days: emptyDays(), label: '', isRest: false }));
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
      // Version history is best effort: the pass and the snapshots are what matter.
      try {
        const { data: v } = await supabase.from('plan_versions').select('version').eq('plan_id', plan.id).order('version', { ascending: false }).limit(1);
        await supabase.from('plan_versions').insert({ plan_id: plan.id, version: ((v?.[0]?.version) ?? 0) + 1, track: baseline, summary: describeChanges(changes, labelOf) || 'Layout' });
      } catch { /* optional table */ }
      const { data: moved, error } = await supabase.rpc('publish_plan_track', { p_plan_id: plan.id, p_track: newTrack, p_snapshots: snapshots });
      if (error) throw error;
      if (plan.duration_weeks && plan.duration_weeks !== weeks.length) {
        await supabase.from('plans').update({ duration_weeks: weeks.length }).eq('id', plan.id);
      }
      setBaseline(newTrack);
      setReview(false);
      const n = typeof moved === 'number' ? moved : snapshots.length;
      say(n > 0 ? `Published · ${n} athlete${n === 1 ? '' : 's'} updated` : 'Published');
      seededFor.current = null;
      await load();
    } catch (e) {
      say(e.message?.includes('permission') ? 'Not allowed: this pass isn’t yours.' : 'Couldn’t publish. Check your connection and try again.');
    } finally {
      setPublishing(false);
    }
  }

  const labelOf = (n) => (n.type === 'workout' ? (workoutsById[n.id]?.name ?? 'a workout') : (n.label ?? n.type));

  if (!data.loaded) return <div className="fl-empty"><p className="fl-note">Loading your seasons…</p></div>;
  if (data.error) return <div className="fl-empty"><h1 className="fl-title">Couldn’t load</h1><p className="fl-sub">{data.error}</p></div>;
  if (!plan) {
    return (
      <div className="fl-empty">
        <h1 className="fl-title">No pass yet</h1>
        <p className="fl-sub">A season lives on a pass. Make your first pass in the FitLink app; it shows up here to build.</p>
      </div>
    );
  }

  const cur = weeks[week] ?? { days: emptyDays(), label: '', isRest: false };
  const holdersHere = plan.duration_weeks ? data.enrollments.filter((e) => e.plan_id === plan.id && e.status === 'active').length : holders.length;

  return (
    <div className="fl-editor">
      <aside className="fl-side" aria-label="Seasons">
        <section>
          <h2>Your seasons</h2>
          {data.plans.map((p) => {
            const n = data.enrollments.filter((e) => e.plan_id === p.id && e.status === 'active').length;
            return (
              <button key={p.id} type="button" className="fl-side-row" aria-current={p.id === plan.id ? 'page' : undefined} onClick={() => { if (changes.length > 0 && !window.confirm('Leave without publishing? Your changes to this season are lost.')) return; navigate(`/coach/seasons/${p.id}`); }}>
                {p.name} <small>{n > 0 ? `${n} on it` : (p.duration_weeks ? `${p.duration_weeks} weeks` : dollars(p.price))}</small>
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
        </div>

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
      </main>

      <aside className="fl-rail" aria-label="Your workouts">
        <Rail workouts={data.workouts} onPick={(w) => setChooser(w)} />
        <span className="hint">Drag onto any day, or tap Add and pick the day. Exercises you write once stay here for every season.</span>
      </aside>

      <div className="fl-float fl-glass">
        <button type="button" className="fl-btn" style={{ background: 'rgba(21,23,28,0.06)' }} onClick={() => setPreview(true)}>Preview as athlete</button>
        <button type="button" className="fl-btn accent" disabled={changes.length === 0 && baseline.length > 0} onClick={() => setReview(true)}>
          {changes.length > 0 ? `Publish ${changes.length} change${changes.length === 1 ? '' : 's'}` : (baseline.length === 0 ? 'Publish season' : 'Published')}
        </button>
      </div>

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
          <p className="fl-note">The pass and every athlete's copy update together. A week an athlete has started keeps what it had.</p>
          <button type="button" className="fl-btn accent lg" disabled={publishing} onClick={publish}>{publishing ? 'Publishing…' : 'Publish changes'}</button>
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
