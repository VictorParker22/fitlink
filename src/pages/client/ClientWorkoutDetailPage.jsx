import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useClient } from './ClientContext';
import Header from '../../components/Header';
import { IconCheck, IconClock, IconDumbbell } from '../../components/Icons';
import './ClientPortal.css';

export default function ClientWorkoutDetailPage() {
  const { id } = useParams(); // client_workout id
  const navigate = useNavigate();
  const { clientData, markWorkoutComplete } = useClient();
  const [clientWorkout, setClientWorkout] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [logs, setLogs] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Get client_workout with workout and exercises
      const { data: cw } = await supabase
        .from('client_workouts')
        .select('*, workouts(*, workout_exercises(*, exercises(*)))')
        .eq('id', id)
        .single();

      if (cw) {
        setClientWorkout(cw);
        const exs = cw.workouts?.workout_exercises || [];
        setExercises(exs.sort((a, b) => a.order_index - b.order_index));

        // Initialize log state: each exercise × each set
        const initialLogs = {};
        exs.forEach((we) => {
          for (let s = 1; s <= (we.sets || 3); s++) {
            const key = `${we.id}-${s}`;
            initialLogs[key] = { weight: '', reps: we.reps || '', completed: false };
          }
        });

        // Load existing logs
        const { data: existingLogs } = await supabase
          .from('workout_logs')
          .select('*')
          .eq('client_workout_id', id);

        if (existingLogs) {
          existingLogs.forEach((log) => {
            const key = `${log.workout_exercise_id}-${log.set_number}`;
            initialLogs[key] = {
              weight: log.weight || '',
              reps: log.reps || '',
              completed: log.completed,
              id: log.id,
            };
          });
        }

        setLogs(initialLogs);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const updateLog = (key, field, value) => {
    setLogs((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    setSaved(false);
  };

  const toggleCompleted = (key) => {
    setLogs((prev) => ({
      ...prev,
      [key]: { ...prev[key], completed: !prev[key].completed },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!clientData || !clientWorkout) return;
    setSaving(true);

    try {
      // Delete existing logs for this workout
      await supabase.from('workout_logs').delete().eq('client_workout_id', id);

      // Insert all logs
      const logRows = [];
      exercises.forEach((we) => {
        for (let s = 1; s <= (we.sets || 3); s++) {
          const key = `${we.id}-${s}`;
          const log = logs[key];
          if (log) {
            logRows.push({
              client_workout_id: id,
              workout_exercise_id: we.id,
              client_id: clientData.id,
              trainer_id: clientWorkout.trainer_id,
              set_number: s,
              weight: Number(log.weight) || 0,
              reps: Number(log.reps) || 0,
              completed: log.completed,
            });
          }
        }
      });

      if (logRows.length > 0) {
        await supabase.from('workout_logs').insert(logRows);
      }

      // Check if all sets completed
      const allCompleted = Object.values(logs).every((l) => l.completed);
      if (allCompleted) {
        await markWorkoutComplete(id);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <Header title="Workout" showBack />
        <div className="flex-center mt-3xl">
          <div className="btn-spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
        </div>
      </div>
    );
  }

  if (!clientWorkout) {
    return (
      <div className="page-content">
        <Header title="Not Found" showBack />
        <div className="empty-state"><p>Workout not found</p></div>
      </div>
    );
  }

  const workout = clientWorkout.workouts;
  const completedSets = Object.values(logs).filter((l) => l.completed).length;
  const totalSets = Object.keys(logs).length;
  const progressPercent = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  return (
    <div className="page-content" style={{ paddingBottom: 120 }}>
      <Header title={workout?.name || 'Workout'} showBack />

      {/* Progress bar */}
      <div className="card mt-lg">
        <div className="flex-row flex-between mb-sm">
          <span className="text-small">{completedSets} / {totalSets} sets completed</span>
          <span className="text-small" style={{ color: 'var(--green)' }}>{Math.round(progressPercent)}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPercent}%`, background: 'var(--green)' }} />
        </div>
      </div>

      {/* Exercise List */}
      {exercises.map((we, exIdx) => {
        const exercise = we.exercises;
        const sets = we.sets || 3;

        return (
          <div className="card mt-base" key={we.id}>
            <div className="flex-row gap-sm mb-base">
              <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 'var(--fs-sm)' }}>
                {exIdx + 1}
              </span>
              <div>
                <h3 style={{ fontWeight: 600, fontSize: 'var(--fs-md)' }}>{exercise?.name}</h3>
                <p className="text-small">{sets} sets × {we.reps} reps · {we.rest_seconds}s rest</p>
              </div>
            </div>

            {/* Set rows */}
            <div className="wl-sets">
              <div className="wl-header">
                <span>Set</span>
                <span>Weight (lbs)</span>
                <span>Reps</span>
                <span>✓</span>
              </div>
              {Array.from({ length: sets }, (_, s) => {
                const key = `${we.id}-${s + 1}`;
                const log = logs[key] || { weight: '', reps: '', completed: false };
                return (
                  <div className={`wl-row ${log.completed ? 'wl-done' : ''}`} key={key}>
                    <span className="wl-set-num">{s + 1}</span>
                    <input
                      className="wl-input"
                      type="number"
                      placeholder="—"
                      value={log.weight}
                      onChange={(e) => updateLog(key, 'weight', e.target.value)}
                    />
                    <input
                      className="wl-input"
                      type="number"
                      placeholder={we.reps}
                      value={log.reps}
                      onChange={(e) => updateLog(key, 'reps', e.target.value)}
                    />
                    <button
                      className={`wl-check ${log.completed ? 'checked' : ''}`}
                      onClick={() => toggleCompleted(key)}
                    >
                      {log.completed && <IconCheck size={14} color="white" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Save FAB */}
      <div className="wl-save-bar">
        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={handleSave}
          disabled={saving}
          style={saved ? { background: 'var(--green)' } : {}}
        >
          {saving ? <span className="btn-spinner" /> : saved ? '✓ Saved!' : 'Save Workout Log'}
        </button>
      </div>

      <style>{`
        .wl-sets { margin-top: var(--space-sm); }
        .wl-header, .wl-row {
          display: grid;
          grid-template-columns: 36px 1fr 1fr 40px;
          gap: var(--space-sm);
          align-items: center;
          padding: 6px 0;
        }
        .wl-header {
          font-size: 10px;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding-bottom: 8px;
          margin-bottom: 4px;
        }
        .wl-set-num {
          font-weight: 700;
          font-size: var(--fs-sm);
          color: var(--text-tertiary);
          text-align: center;
        }
        .wl-input {
          background: var(--bg-input);
          border: var(--border);
          border-radius: var(--radius-sm);
          padding: 8px;
          font-size: var(--fs-sm);
          color: var(--text-primary);
          text-align: center;
          width: 100%;
        }
        .wl-input:focus { border-color: var(--accent); }
        .wl-check {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
        }
        .wl-check.checked {
          background: var(--green);
          border-color: var(--green);
        }
        .wl-row.wl-done { opacity: 0.6; }
        .wl-save-bar {
          position: fixed;
          bottom: calc(var(--bottom-nav-height) + var(--safe-area-bottom));
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 430px;
          padding: var(--space-base) var(--space-lg);
          background: linear-gradient(transparent, var(--bg-primary) 30%);
        }
      `}</style>
    </div>
  );
}
