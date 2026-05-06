import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { IconX, IconPlus, IconTrash, IconGrip } from './Icons';
import ExercisePickerModal from './ExercisePickerModal';

const CATEGORIES = ['strength', 'cardio', 'hiit', 'flexibility', 'circuit'];

export default function WorkoutBuilderModal({ workout = null, onClose }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const [form, setForm] = useState({
    name: workout?.name || '',
    description: workout?.description || '',
    category: workout?.category || 'strength',
    estimated_duration: workout?.estimated_duration || 45,
  });

  const [exercises, setExercises] = useState([]);

  // Load existing exercises if editing
  useEffect(() => {
    if (workout) {
      supabase
        .from('workout_exercises')
        .select('*, exercises(name, category, equipment)')
        .eq('workout_id', workout.id)
        .order('order_index')
        .then(({ data }) => {
          if (data) setExercises(data);
        });
    }
  }, [workout]);

  const addExercises = (selected) => {
    const newExercises = selected.map((ex, i) => ({
      exercise_id: ex.id,
      exercises: { name: ex.name, category: ex.category, equipment: ex.equipment },
      sets: 3,
      reps: '10',
      rest_seconds: 60,
      notes: '',
      order_index: exercises.length + i,
    }));
    setExercises((prev) => [...prev, ...newExercises]);
    setShowPicker(false);
  };

  const removeExercise = (idx) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateExercise = (idx, field, value) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === idx ? { ...ex, [field]: value } : ex))
    );
  };

  const moveExercise = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= exercises.length) return;
    const updated = [...exercises];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setExercises(updated);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Workout name is required');
    if (exercises.length === 0) return setError('Add at least one exercise');
    setError('');
    setLoading(true);

    try {
      let workoutId;

      if (workout) {
        // Update
        const { error: err } = await supabase
          .from('workouts')
          .update({ ...form, name: form.name.trim() })
          .eq('id', workout.id);
        if (err) throw err;
        workoutId = workout.id;

        // Delete old exercises
        await supabase.from('workout_exercises').delete().eq('workout_id', workout.id);
      } else {
        // Create
        const { data, error: err } = await supabase
          .from('workouts')
          .insert({ ...form, name: form.name.trim(), trainer_id: user.id })
          .select()
          .single();
        if (err) throw err;
        workoutId = data.id;
      }

      // Insert exercises
      const exerciseRows = exercises.map((ex, i) => ({
        workout_id: workoutId,
        exercise_id: ex.exercise_id,
        order_index: i,
        sets: Number(ex.sets) || 3,
        reps: ex.reps || '10',
        rest_seconds: Number(ex.rest_seconds) || 60,
        notes: ex.notes || '',
      }));

      if (exerciseRows.length > 0) {
        const { error: exErr } = await supabase.from('workout_exercises').insert(exerciseRows);
        if (exErr) throw exErr;
      }

      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save workout');
    } finally {
      setLoading(false);
    }
  };

  const equipmentEmoji = {
    barbell: '🏋️', dumbbell: '💪', machine: '⚙️', bodyweight: '🤸',
    cable: '🔗', kettlebell: '🔔', bands: '🪢', other: '🔧',
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" style={{ maxHeight: '92dvh' }}>
        <div className="modal-handle" />

        <div className="flex-row flex-between mb-lg">
          <h2 className="heading-2">{workout ? 'Edit Workout' : 'New Workout'}</h2>
          <button className="btn-icon btn-secondary" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>

        {error && <div className="auth-message auth-error mb-base">{error}</div>}

        <div className="flex-col gap-base" style={{ overflowY: 'auto', flex: 1 }}>
          {/* Workout Info */}
          <div className="input-group">
            <label className="input-label">Name *</label>
            <input
              className="input"
              placeholder="Push Day A"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Description</label>
            <input
              className="input"
              placeholder="Focus on chest and triceps"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="flex-row gap-base">
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Category</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="input-group" style={{ width: 100 }}>
              <label className="input-label">Duration</label>
              <select
                className="input"
                value={form.estimated_duration}
                onChange={(e) => setForm({ ...form, estimated_duration: Number(e.target.value) })}
              >
                {[15, 30, 45, 60, 75, 90].map((d) => (
                  <option key={d} value={d}>{d}min</option>
                ))}
              </select>
            </div>
          </div>

          {/* Exercise List */}
          <div className="flex-row flex-between mt-base">
            <label className="input-label" style={{ margin: 0 }}>Exercises ({exercises.length})</label>
            <button className="btn btn-outline btn-sm" onClick={() => setShowPicker(true)}>
              <IconPlus size={14} /> Add
            </button>
          </div>

          {exercises.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
              <p className="text-small">Tap "Add" to pick exercises</p>
            </div>
          ) : (
            <div className="flex-col gap-sm">
              {exercises.map((ex, i) => (
                <div key={i} className="wb-exercise-row">
                  <div className="wb-ex-grip">
                    <button className="wb-move" onClick={() => moveExercise(i, -1)} disabled={i === 0}>↑</button>
                    <span className="wb-ex-num">{i + 1}</span>
                    <button className="wb-move" onClick={() => moveExercise(i, 1)} disabled={i === exercises.length - 1}>↓</button>
                  </div>
                  <div className="wb-ex-info">
                    <div className="flex-row flex-between">
                      <span className="wb-ex-name">
                        {equipmentEmoji[ex.exercises?.equipment] || '💪'} {ex.exercises?.name}
                      </span>
                      <button className="btn-icon" onClick={() => removeExercise(i)} style={{ padding: 4 }}>
                        <IconTrash size={14} color="var(--red)" />
                      </button>
                    </div>
                    <div className="wb-ex-fields">
                      <div className="wb-field">
                        <label>Sets</label>
                        <input
                          type="number"
                          value={ex.sets}
                          onChange={(e) => updateExercise(i, 'sets', e.target.value)}
                          min={1}
                          max={20}
                        />
                      </div>
                      <div className="wb-field">
                        <label>Reps</label>
                        <input
                          value={ex.reps}
                          onChange={(e) => updateExercise(i, 'reps', e.target.value)}
                          placeholder="8-12"
                        />
                      </div>
                      <div className="wb-field">
                        <label>Rest</label>
                        <input
                          type="number"
                          value={ex.rest_seconds}
                          onChange={(e) => updateExercise(i, 'rest_seconds', e.target.value)}
                          min={0}
                          step={15}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          className="btn btn-primary btn-full btn-lg mt-lg"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? <span className="btn-spinner" /> : workout ? 'Update Workout' : 'Create Workout'}
        </button>

        {showPicker && (
          <ExercisePickerModal
            onSelect={addExercises}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>

      <style>{`
        .wb-exercise-row {
          display: flex;
          gap: var(--space-sm);
          background: var(--bg-input);
          border-radius: var(--radius-md);
          padding: var(--space-sm) var(--space-base) var(--space-sm) var(--space-sm);
        }
        .wb-ex-grip {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          min-width: 28px;
        }
        .wb-move {
          font-size: 12px;
          color: var(--text-tertiary);
          padding: 2px;
          line-height: 1;
        }
        .wb-move:disabled { opacity: 0.2; }
        .wb-ex-num {
          font-size: var(--fs-xs);
          color: var(--text-tertiary);
          font-weight: 700;
        }
        .wb-ex-info { flex: 1; min-width: 0; }
        .wb-ex-name {
          font-weight: 600;
          font-size: var(--fs-sm);
          color: var(--text-primary);
        }
        .wb-ex-fields {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: var(--space-sm);
          margin-top: var(--space-sm);
        }
        .wb-field label {
          font-size: 10px;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          display: block;
          margin-bottom: 3px;
        }
        .wb-field input {
          width: 100%;
          background: var(--bg-card);
          border: var(--border);
          border-radius: var(--radius-sm);
          padding: 6px 8px;
          font-size: var(--fs-sm);
          color: var(--text-primary);
          text-align: center;
        }
      `}</style>
    </div>
  );
}
