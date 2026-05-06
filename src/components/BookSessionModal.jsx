import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { IconX } from './Icons';

export default function BookSessionModal({ onClose, preselectedDate = null }) {
  const { addSession, clients } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeClients = useMemo(() => clients.filter((c) => c.status !== 'inactive'), [clients]);

  // Default to preselected date or next hour
  const defaultDate = useMemo(() => {
    if (preselectedDate) {
      const d = new Date(preselectedDate);
      d.setHours(9, 0, 0, 0);
      return d;
    }
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  }, [preselectedDate]);

  const [form, setForm] = useState({
    client_id: '',
    type: '1-on-1',
    date: defaultDate.toISOString().slice(0, 16),
    duration: 60,
    group_name: '',
    notes: '',
  });

  const update = (field, val) => setForm((prev) => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.type !== 'Group' && !form.client_id) return setError('Select a client');
    if (form.type === 'Group' && !form.group_name.trim()) return setError('Enter group name');
    setError('');
    setLoading(true);

    try {
      await addSession({
        client_id: form.type === 'Group' ? null : form.client_id,
        group_name: form.type === 'Group' ? form.group_name.trim() : null,
        type: form.type,
        date: new Date(form.date).toISOString(),
        duration: Number(form.duration),
        status: 'upcoming',
        notes: form.notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to book session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} id="book-session-modal">
      <div className="modal-sheet">
        <div className="modal-handle" />

        <div className="flex-row flex-between mb-lg">
          <h2 className="heading-2">Book Session</h2>
          <button className="btn-icon btn-secondary" onClick={onClose} id="close-book-session">
            <IconX size={18} />
          </button>
        </div>

        {error && <div className="auth-message auth-error mb-base">{error}</div>}

        <form onSubmit={handleSubmit} className="flex-col gap-base">
          {/* Session Type */}
          <div className="input-group">
            <label className="input-label">Type</label>
            <div className="tabs">
              {['1-on-1', 'Group', 'Virtual'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`tab ${form.type === t ? 'active' : ''}`}
                  onClick={() => update('type', t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Client or Group Name */}
          {form.type === 'Group' ? (
            <div className="input-group">
              <label className="input-label">Group Name *</label>
              <input
                className="input"
                placeholder="Evening HIIT"
                value={form.group_name}
                onChange={(e) => update('group_name', e.target.value)}
                required
                id="session-group-name"
              />
            </div>
          ) : (
            <div className="input-group">
              <label className="input-label">Client *</label>
              <select
                className="input"
                value={form.client_id}
                onChange={(e) => update('client_id', e.target.value)}
                required
                id="session-client"
              >
                <option value="">Select client...</option>
                {activeClients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date & Time */}
          <div className="input-group">
            <label className="input-label">Date & Time</label>
            <input
              className="input"
              type="datetime-local"
              value={form.date}
              onChange={(e) => update('date', e.target.value)}
              required
              id="session-date"
            />
          </div>

          {/* Duration */}
          <div className="input-group">
            <label className="input-label">Duration (minutes)</label>
            <div className="tabs">
              {[30, 45, 60, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`tab ${form.duration === d ? 'active' : ''}`}
                  onClick={() => update('duration', d)}
                >
                  {d}min
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="input-group">
            <label className="input-label">Notes</label>
            <input
              className="input"
              placeholder="Upper body focus, bring bands..."
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              id="session-notes"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} id="save-session">
            {loading ? <span className="btn-spinner" /> : 'Book Session'}
          </button>
        </form>
      </div>
    </div>
  );
}
