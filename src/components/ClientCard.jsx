import { useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import { IconChevronRight, IconFire } from './Icons';

export default function ClientCard({ client, plan, delay = 0 }) {
  const navigate = useNavigate();
  
  const statusConfig = {
    active: { color: 'var(--green)', label: 'Active' },
    trial: { color: '#FF9F0A', label: 'Trial' },
    inactive: { color: 'var(--text-tertiary)', label: 'Inactive' },
  };

  const status = statusConfig[client.status] || statusConfig.active;
  const progress = client.progress || { streak: 0 };
  const lastSessionDate = client.last_session || client.joined_date;
  const lastSessionDays = lastSessionDate ? Math.floor((new Date() - new Date(lastSessionDate)) / 86400000) : null;

  return (
    <div
      className="card cc stagger-item"
      style={{ animationDelay: `${delay}ms`, padding: '12px 14px', cursor: 'pointer' }}
      onClick={() => navigate(`/clients/${client.id}`)}
      id={`client-${client.id}`}
    >
      <div className="flex-row gap-md">
        <Avatar name={client.name} />
        <div className="flex-col flex-1" style={{ minWidth: 0, gap: '3px' }}>
          <div className="flex-row flex-between">
            <span style={{ fontWeight: 600, fontSize: 'var(--fs-md)' }} className="truncate">{client.name}</span>
            <IconChevronRight size={14} color="var(--text-tertiary)" />
          </div>
          <div className="flex-row gap-sm">
            <span style={{ fontSize: '10px', fontWeight: 600, color: status.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {status.label}
            </span>
            {plan && <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>· {plan.name}</span>}
            {progress.streak > 0 && (
              <span className="flex-row gap-xs" style={{ fontSize: '10px', color: '#FF9F0A' }}>
                · 🔥 {progress.streak}d
              </span>
            )}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
            Last session: {lastSessionDays === null ? 'None' : lastSessionDays === 0 ? 'Today' : lastSessionDays === 1 ? 'Yesterday' : `${lastSessionDays}d ago`}
          </span>
        </div>
      </div>
    </div>
  );
}
