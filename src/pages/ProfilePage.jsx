import { useState } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import { IconEdit, IconMail, IconPhone, IconLogout, IconSettings, IconAward, IconChevronRight, IconDumbbell } from '../components/Icons';
import { formatDate } from '../utils/helpers';
import './ProfilePage.css';

export default function ProfilePage() {
  const { trainer, updateTrainer, logout, clients, totalReferrals } = useApp();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  if (!trainer) return null;

  const certifications = trainer.certifications || [];
  const specializations = trainer.specializations || [];

  const activeCount = clients.filter((c) => c.status === 'active').length;

  const handleStartEdit = () => {
    setEditForm({
      name: trainer.name || '',
      bio: trainer.bio || '',
      phone: trainer.phone || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTrainer(editForm);
      setEditing(false);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const menuItems = [
    { icon: <IconAward size={18} color="var(--accent)" />, label: 'Certifications', count: certifications.length },
    { icon: <IconDumbbell size={18} color="var(--blue)" />, label: 'Specializations', count: specializations.length },
    { icon: <IconSettings size={18} color="var(--text-secondary)" />, label: 'Settings' },
    { icon: <IconLogout size={18} color="var(--red)" />, label: 'Sign Out', action: logout, danger: true },
  ];

  return (
    <div className="page-content profile-page">
      <Header
        title="Profile"
        rightAction={
          editing ? (
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} id="save-profile-btn">
              {saving ? <span className="btn-spinner" style={{ width: 14, height: 14 }} /> : 'Save'}
            </button>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={handleStartEdit} id="edit-profile-btn">
              <IconEdit size={16} /> Edit
            </button>
          )
        }
      />

      {/* Profile Card */}
      <div className="profile-card">
        <div className="profile-bg-gradient" />
        <div className="profile-info">
          <Avatar name={trainer.name} size="xl" />
          {editing ? (
            <input
              className="input mt-base"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              style={{ textAlign: 'center', fontSize: 'var(--fs-xl)', fontWeight: 700 }}
            />
          ) : (
            <h2 className="heading-2 mt-base">{trainer.name}</h2>
          )}
          <p className="text-small">Joined {formatDate(trainer.created_at)}</p>

          {/* Contact Row */}
          <div className="flex-row gap-md mt-base">
            <a href={`mailto:${trainer.email}`} className="btn btn-secondary btn-sm">
              <IconMail size={14} /> {trainer.email}
            </a>
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="card mt-lg">
        <h3 className="heading-3 mb-sm">About</h3>
        {editing ? (
          <textarea
            className="input"
            value={editForm.bio}
            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
            rows={3}
            style={{ resize: 'vertical' }}
          />
        ) : (
          <p className="text-body">{trainer.bio || 'No bio yet. Tap Edit to add one.'}</p>
        )}
      </div>

      {/* Stats */}
      <div className="profile-stats mt-lg">
        <div className="ps-item">
          <span className="ps-value">{clients.length}</span>
          <span className="ps-label">Total Clients</span>
        </div>
        <div className="ps-item">
          <span className="ps-value" style={{ color: 'var(--green)' }}>{activeCount}</span>
          <span className="ps-label">Active</span>
        </div>
        <div className="ps-item">
          <span className="ps-value" style={{ color: 'var(--accent)' }}>{totalReferrals}</span>
          <span className="ps-label">Referrals</span>
        </div>
        <div className="ps-item">
          <span className="ps-value" style={{ color: 'var(--blue)' }}>—</span>
          <span className="ps-label">Revenue/mo</span>
        </div>
      </div>

      {/* Specializations */}
      {specializations.length > 0 && (
        <div className="card mt-lg">
          <h3 className="heading-3 mb-base">Specializations</h3>
          <div className="flex-row flex-wrap gap-sm">
            {specializations.map((s, i) => (
              <span key={i} className="tag tag-active">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <div className="card mt-base">
          <h3 className="heading-3 mb-base">Certifications</h3>
          <div className="flex-col gap-sm">
            {certifications.map((c, i) => (
              <div key={i} className="cert-item">
                <IconAward size={16} color="var(--accent)" />
                <span className="text-body">{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="profile-menu mt-xl">
        {menuItems.map((item, i) => (
          <button
            key={i}
            className={`menu-item ${item.danger ? 'menu-danger' : ''}`}
            onClick={item.action}
            id={`menu-${item.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <div className="menu-icon">{item.icon}</div>
            <span className="menu-label flex-1">{item.label}</span>
            {item.count > 0 && <span className="menu-count">{item.count}</span>}
            <IconChevronRight size={16} color="var(--text-tertiary)" />
          </button>
        ))}
      </div>

      <p className="text-small text-center mt-xl" style={{ opacity: 0.4 }}>FitLink v1.0.0</p>
    </div>
  );
}
