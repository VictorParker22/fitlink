import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { IconX } from './Icons';

export default function AddClientModal({ onClose }) {
  const { addClient, plans } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    plan_id: '',
    notes: '',
    status: 'active',
  });

  const update = (field, val) => setForm((prev) => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Name is required');
    setError('');
    setLoading(true);

    try {
      await addClient({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        plan_id: form.plan_id || null,
        notes: form.notes.trim(),
        status: form.status,
        progress: { weight: [], dates: [], workoutsThisMonth: 0, streak: 0 },
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} id="add-client-modal">
      <div className="modal-sheet">
        <div className="modal-handle" />

        <div className="flex-row flex-between mb-lg">
          <h2 className="heading-2">Add Client</h2>
          <button className="btn-icon btn-secondary" onClick={onClose} id="close-add-client">
            <IconX size={18} />
          </button>
        </div>

        {error && <div className="auth-message auth-error mb-base">{error}</div>}

        <form onSubmit={handleSubmit} className="flex-col gap-base">
          <div className="input-group">
            <label className="input-label">Full Name *</label>
            <input
              className="input"
              placeholder="Jane Smith"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
              id="client-name"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="jane@example.com"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              id="client-email"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Phone</label>
            <input
              className="input"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              id="client-phone"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Plan</label>
            <select
              className="input"
              value={form.plan_id}
              onChange={(e) => update('plan_id', e.target.value)}
              id="client-plan"
            >
              <option value="">No plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — ${p.price}/mo</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Status</label>
            <div className="tabs">
              {['active', 'trial'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`tab ${form.status === s ? 'active' : ''}`}
                  onClick={() => update('status', s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Notes</label>
            <textarea
              className="input"
              placeholder="Training goals, injuries, preferences..."
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
              id="client-notes"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} id="save-client">
            {loading ? <span className="btn-spinner" /> : 'Add Client'}
          </button>
        </form>
      </div>
    </div>
  );
}
