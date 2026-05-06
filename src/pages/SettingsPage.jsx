import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { IconBell, IconClock, IconMail, IconPhone, IconLogout, IconChevronRight, IconCheck } from '../components/Icons';
import './SettingsPage.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SettingsPage() {
  const { trainer, updateTrainer, logout } = useApp();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');

  // Working hours
  const defaultHours = { start: '06:00', end: '20:00', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] };
  const [workingHours, setWorkingHours] = useState(() => {
    const stored = trainer?.working_hours;
    return stored && typeof stored === 'object' ? stored : defaultHours;
  });

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState(() => {
    const stored = trainer?.notification_prefs;
    return stored && typeof stored === 'object' ? stored : {
      session_reminders: true,
      new_messages: true,
      client_signups: true,
      weekly_summary: false,
    };
  });

  const toggleDay = (day) => {
    setWorkingHours((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }));
  };

  const toggleNotif = (key) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (section) => {
    setSaving(true);
    try {
      if (section === 'hours') {
        await updateTrainer({ working_hours: workingHours });
      } else if (section === 'notifs') {
        await updateTrainer({ notification_prefs: notifPrefs });
      }
      setSaved(section);
      setTimeout(() => setSaved(''), 2000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const authMethod = user?.phone ? 'Phone' : 'Email';
  const authValue = user?.phone || user?.email || '';

  return (
    <div className="page-content settings-page">
      <Header title="Settings" showBack />

      {/* Account Info */}
      <div className="card mt-lg">
        <h3 className="heading-3 mb-base">Account</h3>
        <div className="settings-row">
          <div className="settings-row-icon">
            {user?.phone ? <IconPhone size={16} color="var(--blue)" /> : <IconMail size={16} color="var(--blue)" />}
          </div>
          <div className="flex-1">
            <p className="text-small" style={{ color: 'var(--text-tertiary)' }}>Signed in via {authMethod}</p>
            <p style={{ fontWeight: 500 }}>{authValue}</p>
          </div>
        </div>
        {user?.email && user?.phone && (
          <div className="settings-row">
            <div className="settings-row-icon">
              <IconMail size={16} color="var(--purple)" />
            </div>
            <div className="flex-1">
              <p className="text-small" style={{ color: 'var(--text-tertiary)' }}>Linked email</p>
              <p style={{ fontWeight: 500 }}>{user.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* Working Hours */}
      <div className="card mt-lg">
        <div className="flex-row flex-between mb-base">
          <h3 className="heading-3">
            <IconClock size={16} /> Working Hours
          </h3>
          <button
            className={`btn btn-sm ${saved === 'hours' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleSave('hours')}
            disabled={saving}
          >
            {saved === 'hours' ? <><IconCheck size={12} /> Saved</> : 'Save'}
          </button>
        </div>

        <div className="time-row">
          <div className="input-group" style={{ flex: 1 }}>
            <label className="input-label">Start</label>
            <input
              className="input"
              type="time"
              value={workingHours.start}
              onChange={(e) => setWorkingHours((h) => ({ ...h, start: e.target.value }))}
            />
          </div>
          <span className="time-sep">to</span>
          <div className="input-group" style={{ flex: 1 }}>
            <label className="input-label">End</label>
            <input
              className="input"
              type="time"
              value={workingHours.end}
              onChange={(e) => setWorkingHours((h) => ({ ...h, end: e.target.value }))}
            />
          </div>
        </div>

        <div className="days-grid mt-base">
          {DAYS.map((day) => (
            <button
              key={day}
              className={`day-chip ${workingHours.days.includes(day) ? 'active' : ''}`}
              onClick={() => toggleDay(day)}
              type="button"
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="card mt-lg">
        <div className="flex-row flex-between mb-base">
          <h3 className="heading-3">
            <IconBell size={16} /> Notifications
          </h3>
          <button
            className={`btn btn-sm ${saved === 'notifs' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleSave('notifs')}
            disabled={saving}
          >
            {saved === 'notifs' ? <><IconCheck size={12} /> Saved</> : 'Save'}
          </button>
        </div>

        {[
          { key: 'session_reminders', label: 'Session Reminders', desc: '1 hour before scheduled sessions' },
          { key: 'new_messages', label: 'New Messages', desc: 'When a client sends you a message' },
          { key: 'client_signups', label: 'Client Signups', desc: 'When a new client joins via your link' },
          { key: 'weekly_summary', label: 'Weekly Summary', desc: 'Monday morning recap of your week' },
        ].map(({ key, label, desc }) => (
          <div className="settings-toggle-row" key={key}>
            <div className="flex-1">
              <p style={{ fontWeight: 500, fontSize: 'var(--fs-base)' }}>{label}</p>
              <p className="text-small">{desc}</p>
            </div>
            <button
              className={`toggle ${notifPrefs[key] ? 'on' : ''}`}
              onClick={() => toggleNotif(key)}
              type="button"
              aria-label={`Toggle ${label}`}
            >
              <div className="toggle-thumb" />
            </button>
          </div>
        ))}
      </div>

      {/* Danger Zone */}
      <div className="card mt-xl" style={{ borderColor: 'rgba(255, 69, 58, 0.15)' }}>
        <h3 className="heading-3 mb-base" style={{ color: 'var(--red)' }}>Danger Zone</h3>
        <button className="btn btn-secondary btn-full" onClick={logout} style={{ color: 'var(--red)' }}>
          <IconLogout size={16} /> Sign Out
        </button>
      </div>

      <p className="text-small text-center mt-xl" style={{ opacity: 0.4 }}>FitLink v1.1.0</p>
    </div>
  );
}
