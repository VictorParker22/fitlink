import { useClient } from './ClientContext';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import Avatar from '../../components/Avatar';
import { IconMail, IconLogout, IconDumbbell, IconFire } from '../../components/Icons';
import { formatDate } from '../../utils/helpers';

export default function ClientProfilePage() {
  const { clientData, trainer, workouts } = useClient();
  const { signOut } = useAuth();

  if (!clientData) return null;

  const progress = clientData.progress || { streak: 0, workoutsThisMonth: 0 };
  const completedCount = workouts.filter((w) => w.status === 'completed').length;

  return (
    <div className="page-content">
      <Header title="Profile" />

      <div className="flex-col" style={{ alignItems: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-xl)' }}>
        <Avatar name={clientData.name} size="xl" />
        <h2 className="heading-2">{clientData.name}</h2>
        {clientData.email && <p className="text-small">{clientData.email}</p>}
        <p className="text-small">Member since {formatDate(clientData.joined_date)}</p>
      </div>

      {/* Stats */}
      <div className="flex-row gap-md mt-xl" style={{ justifyContent: 'center' }}>
        <div className="card" style={{ flex: '0 0 auto', padding: '14px 20px', textAlign: 'center' }}>
          <span style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, color: 'var(--blue)' }}>{completedCount}</span>
          <span className="text-small" style={{ display: 'block' }}>Workouts</span>
        </div>
        <div className="card" style={{ flex: '0 0 auto', padding: '14px 20px', textAlign: 'center' }}>
          <span style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, color: '#FF9F0A' }}>🔥 {progress.streak || 0}</span>
          <span className="text-small" style={{ display: 'block' }}>Streak</span>
        </div>
      </div>

      {/* Trainer */}
      {trainer && (
        <div className="card mt-xl">
          <h3 className="heading-3 mb-sm">My Trainer</h3>
          <div className="flex-row gap-md">
            <Avatar name={trainer.name} />
            <div>
              <span style={{ fontWeight: 600, fontSize: 'var(--fs-md)' }}>{trainer.name}</span>
              <p className="text-small">{trainer.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out */}
      <button
        className="btn btn-secondary btn-full mt-2xl"
        onClick={signOut}
        style={{ color: 'var(--red)' }}
        id="client-signout"
      >
        <IconLogout size={16} /> Sign Out
      </button>

      <p className="text-small text-center mt-xl" style={{ opacity: 0.4 }}>FitLink Client v1.0.0</p>
    </div>
  );
}
