import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { IconX, IconSearch, IconCheck } from './Icons';

const CATEGORIES = ['all', 'chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'full_body'];

export default function ExercisePickerModal({ onSelect, onClose }) {
  const [exercises, setExercises] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('exercises')
        .select('*')
        .order('category')
        .order('name');
      if (data) setExercises(data);
      setLoading(false);
    }
    fetch();
  }, []);

  const filtered = exercises.filter((ex) => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || ex.category === filter;
    return matchSearch && matchFilter;
  });

  const toggleSelect = (ex) => {
    setSelected((prev) =>
      prev.find((s) => s.id === ex.id)
        ? prev.filter((s) => s.id !== ex.id)
        : [...prev, ex]
    );
  };

  const isSelected = (id) => selected.some((s) => s.id === id);

  const equipmentEmoji = {
    barbell: '🏋️', dumbbell: '💪', machine: '⚙️', bodyweight: '🤸',
    cable: '🔗', kettlebell: '🔔', bands: '🪢', other: '🔧',
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 1001 }}>
      <div className="modal-sheet" style={{ maxHeight: '85dvh' }}>
        <div className="modal-handle" />

        <div className="flex-row flex-between mb-base">
          <h2 className="heading-2">Add Exercises</h2>
          <button className="btn-icon btn-secondary" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>

        <div className="search-bar mb-base">
          <IconSearch />
          <input
            className="input"
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="tabs mb-base" style={{ overflowX: 'auto', flexShrink: 0 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`tab ${filter === c ? 'active' : ''}`}
              onClick={() => setFilter(c)}
              style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
            >
              {c === 'full_body' ? 'Full Body' : c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>

        <div className="ep-list" style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div className="flex-center" style={{ padding: 'var(--space-xl)' }}>
              <div className="btn-spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-small text-center" style={{ padding: 'var(--space-xl)', color: 'var(--text-tertiary)' }}>
              No exercises found
            </p>
          ) : (
            filtered.map((ex) => (
              <button
                key={ex.id}
                className={`ep-item ${isSelected(ex.id) ? 'ep-selected' : ''}`}
                onClick={() => toggleSelect(ex)}
              >
                <span className="ep-emoji">{equipmentEmoji[ex.equipment] || '💪'}</span>
                <div className="ep-info">
                  <span className="ep-name">{ex.name}</span>
                  <span className="ep-meta">{ex.muscle_group} · {ex.equipment}</span>
                </div>
                {isSelected(ex.id) && (
                  <div className="ep-check">
                    <IconCheck size={14} color="white" />
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {selected.length > 0 && (
          <button
            className="btn btn-primary btn-full btn-lg mt-base"
            onClick={() => onSelect(selected)}
          >
            Add {selected.length} exercise{selected.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      <style>{`
        .ep-list {
          display: flex;
          flex-direction: column;
        }
        .ep-item {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: 10px var(--space-sm);
          border-bottom: 1px solid rgba(255,255,255,0.04);
          text-align: left;
          transition: background var(--transition-fast);
        }
        .ep-item:active { background: var(--bg-hover); }
        .ep-selected { background: rgba(255, 95, 59, 0.06); }
        .ep-emoji { font-size: 20px; width: 28px; text-align: center; }
        .ep-info { flex: 1; min-width: 0; }
        .ep-name {
          display: block;
          font-weight: 600;
          font-size: var(--fs-sm);
          color: var(--text-primary);
        }
        .ep-meta {
          font-size: var(--fs-xs);
          color: var(--text-tertiary);
          text-transform: capitalize;
        }
        .ep-check {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
