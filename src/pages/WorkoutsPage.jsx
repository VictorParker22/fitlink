import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { IconSearch, IconPlus, IconClock, IconDumbbell, IconWorkout } from '../components/Icons';
import { staggerDelay } from '../utils/helpers';
import WorkoutBuilderModal from '../components/WorkoutBuilderModal';
import './WorkoutsPage.css';

const CATEGORIES = ['all', 'strength', 'cardio', 'hiit', 'flexibility', 'circuit'];

export default function WorkoutsPage() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);

  const fetchWorkouts = useCallback(async () => {
    const { data } = await supabase
      .from('workouts')
      .select('*, workout_exercises(id)')
      .order('created_at', { ascending: false });
    if (data) setWorkouts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  const filtered = workouts.filter((w) => {
    const matchSearch = w.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || w.category === filter;
    return matchSearch && matchFilter;
  });

  const handleEdit = (workout) => {
    setEditingWorkout(workout);
    setShowBuilder(true);
  };

  const handleClose = () => {
    setShowBuilder(false);
    setEditingWorkout(null);
    fetchWorkouts();
  };

  const categoryColors = {
    strength: 'var(--accent)',
    cardio: 'var(--green)',
    hiit: '#FF9F0A',
    flexibility: 'var(--purple)',
    circuit: 'var(--blue)',
  };

  return (
    <div className="page-content workouts-page">
      <Header title="Workouts" subtitle={`${workouts.length} templates`} />

      <div className="search-bar mt-lg">
        <IconSearch />
        <input
          className="input"
          placeholder="Search workouts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          id="workout-search"
        />
      </div>

      <div className="tabs mt-base" style={{ overflowX: 'auto' }}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`tab ${filter === c ? 'active' : ''}`}
            onClick={() => setFilter(c)}
          >
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-center mt-3xl">
          <div className="btn-spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state mt-3xl">
          <IconWorkout size={40} color="var(--text-tertiary)" />
          <p className="text-body">No workouts yet</p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowBuilder(true)}>
            Create your first workout
          </button>
        </div>
      ) : (
        <div className="workout-grid mt-lg">
          {filtered.map((w, i) => (
            <button
              key={w.id}
              className="workout-card stagger-item"
              onClick={() => handleEdit(w)}
              style={staggerDelay(i)}
            >
              <div className="wc-top">
                <span
                  className="wc-category"
                  style={{ color: categoryColors[w.category], background: `${categoryColors[w.category]}15` }}
                >
                  {w.category}
                </span>
              </div>
              <h3 className="wc-name">{w.name}</h3>
              {w.description && <p className="wc-desc">{w.description}</p>}
              <div className="wc-meta">
                <span className="wc-stat">
                  <IconDumbbell size={13} /> {w.workout_exercises?.length || 0} exercises
                </span>
                <span className="wc-stat">
                  <IconClock size={13} /> {w.estimated_duration}min
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <button className="fab" onClick={() => setShowBuilder(true)} id="add-workout-fab">
        <IconPlus size={24} color="white" />
      </button>

      {showBuilder && (
        <WorkoutBuilderModal
          workout={editingWorkout}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
