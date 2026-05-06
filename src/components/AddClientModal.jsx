import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { IconX, IconMessage } from './Icons';
import ContactPicker from './ContactPicker';

export default function AddClientModal({ onClose }) {
  const { addClient, plans, trainer } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(null); // holds the created client
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    plan_id: '',
    notes: '',
    status: 'active',
  });

  const update = (field, val) => setForm((prev) => ({ ...prev, [field]: val }));

  // Auto-fill from contact picker
  const handleContactImport = (contact) => {
    setForm((prev) => ({
      ...prev,
      name: contact.name || prev.name,
      phone: contact.phone || prev.phone,
      email: contact.email || prev.email,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Name is required');
    setError('');
    setLoading(true);

    try {
      const newClient = await addClient({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        plan_id: form.plan_id || null,
        notes: form.notes.trim(),
        status: form.status,
        progress: { weight: [], dates: [], workoutsThisMonth: 0, streak: 0 },
      });
      setShowSuccess(newClient);
    } catch (err) {
      setError(err.message || 'Failed to add client');
    } finally {
      setLoading(false);
    }
  };

  // Send SMS invite to the newly created client
  const handleSendSms = () => {
    const clientName = showSuccess.name.split(' ')[0];
    const trainerName = trainer?.name?.split(' ')[0] || 'your trainer';
    const joinLink = `https://fitlink.coach/client/signup`;
    const message = encodeURIComponent(
      `Hey ${clientName}! 💪 ${trainerName} just added you to FitLink. Sign up to track your workouts, check your schedule, and message your trainer:\n\n${joinLink}`
    );
    const phone = showSuccess.phone?.replace(/\D/g, '');
    window.open(`sms:${phone ? `+1${phone.slice(-10)}` : ''}?body=${message}`, '_self');
  };

  // Success state — show "Send invite?" prompt
  if (showSuccess) {
    return (
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} id="add-client-modal">
        <div className="modal-sheet">
          <div className="modal-handle" />
          <div className="add-client-success">
            <div className="success-icon">✅</div>
            <h2 className="heading-2">Client Added!</h2>
            <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
              <strong>{showSuccess.name}</strong> has been added to your roster.
            </p>

            {showSuccess.phone && (
              <button className="btn btn-primary btn-full btn-lg mt-xl" onClick={handleSendSms} id="send-sms-invite">
                <IconMessage size={18} />
                Send Invite SMS to {showSuccess.name.split(' ')[0]}
              </button>
            )}

            <button className="btn btn-secondary btn-full mt-base" onClick={onClose} id="close-success">
              {showSuccess.phone ? 'Skip for Now' : 'Done'}
            </button>

            {!showSuccess.phone && (
              <p className="text-small mt-base" style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>
                💡 Tip: Add a phone number to send SMS invites
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

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

        {/* Contact Import */}
        <div className="contact-import-section mb-lg">
          <ContactPicker
            onSelect={handleContactImport}
            buttonLabel="Import from Contacts"
          />
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
            <label className="input-label">Phone</label>
            <input
              className="input"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              id="client-phone"
            />
            <p className="input-hint">Required for SMS invites</p>
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
