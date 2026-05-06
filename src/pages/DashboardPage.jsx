import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import InviteModal from '../components/InviteModal';
import { IconClients, IconDollar, IconReferral, IconSchedule, IconBell, IconPlus, IconTrendUp, IconFire, IconStar, IconChevronRight } from '../components/Icons';
import { getGreeting, formatCurrency, formatRelativeTime, staggerDelay } from '../utils/helpers';
import './DashboardPage.css';

export default function DashboardPage() {
  const { trainer, clients, activeClients, todaySessions, upcomingSessions, revenueData, activities, totalReferrals, sessions, getClientById, plans } = useApp();
  const [showInvite, setShowInvite] = useState(false);
  const navigate = useNavigate();

  if (!trainer) return null;

  const maxRevenue = Math.max(...revenueData.map((d) => d.amount), 1);

  // Real analytics
  const totalMonthlyRevenue = plans.reduce((sum, p) => {
    const subCount = clients.filter((c) => c.plan_id === p.id && c.status !== 'inactive').length;
    return sum + Number(p.price) * subCount;
  }, 0);

  // Session completion rate
  const completedSessions = sessions.filter((s) => s.status === 'completed').length;
  const allSessionCount = sessions.length;
  const sessionCompletionRate = allSessionCount > 0 ? Math.round((completedSessions / allSessionCount) * 100) : 0;

  // Client retention: (active + trial) / total
  const retentionRate = clients.length > 0 ? Math.round(((activeClients.length + clients.filter(c => c.status === 'trial').length) / clients.length) * 100) : 0;

  return (
    <div className="page-content dash">
      {/* Header — clean, no avatar overlap */}
      <div className="dash-top">
        <div>
          <p className="dash-greeting">{getGreeting()}</p>
          <h1 className="dash-name">Coach {(trainer.name || '').split(' ')[0]}</h1>
        </div>
        <div className="flex-row gap-sm">
          <button className="btn-icon" style={{ background: 'var(--bg-elevated)', border: 'var(--border)' }} id="notifications-btn">
            <IconBell size={18} color="var(--text-secondary)" />
          </button>
          <Avatar name={trainer.name} />
        </div>
      </div>

      {/* Quick Stats — real data */}
      <div className="stats-scroll mt-xl">
        <div className="stat-chip" style={{ '--chip-color': 'var(--blue)' }}>
          <div className="chip-top">
            <span className="chip-value">{activeClients.length}</span>
            {clients.length > 0 && (
              <span className={`chip-trend ${retentionRate >= 70 ? 'up' : ''}`}>
                {retentionRate}% ret.
              </span>
            )}
          </div>
          <span className="chip-label">Active Clients</span>
        </div>
        <div className="stat-chip" style={{ '--chip-color': 'var(--green)' }}>
          <div className="chip-top">
            <span className="chip-value">{formatCurrency(totalMonthlyRevenue)}</span>
            {totalMonthlyRevenue > 0 && (
              <span className="chip-trend up">/mo</span>
            )}
          </div>
          <span className="chip-label">Monthly Revenue</span>
        </div>
        <div className="stat-chip" style={{ '--chip-color': 'var(--accent)' }}>
          <div className="chip-top">
            <span className="chip-value">{sessionCompletionRate}%</span>
          </div>
          <span className="chip-label">Session Rate</span>
        </div>
        <div className="stat-chip" style={{ '--chip-color': 'var(--purple)' }}>
          <div className="chip-top">
            <span className="chip-value">{todaySessions.length}</span>
          </div>
          <span className="chip-label">Today's Sessions</span>
        </div>
      </div>

      {/* Quick Actions — compact row */}
      <div className="quick-row mt-xl">
        <button className="qr-btn" onClick={() => setShowInvite(true)} id="quick-invite">
          <div className="qr-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><IconPlus size={16} /></div>
          <span>Invite</span>
        </button>
        <button className="qr-btn" onClick={() => navigate('/schedule')} id="quick-session">
          <div className="qr-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><IconSchedule size={16} /></div>
          <span>Schedule</span>
        </button>
        <button className="qr-btn" onClick={() => navigate('/clients')} id="quick-clients">
          <div className="qr-icon" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><IconClients size={16} /></div>
          <span>Clients</span>
        </button>
        <button className="qr-btn" onClick={() => navigate('/referrals')} id="quick-referrals">
          <div className="qr-icon" style={{ background: 'var(--purple-soft)', color: 'var(--purple)' }}><IconTrendUp size={16} /></div>
          <span>Growth</span>
        </button>
      </div>

      {/* Revenue Chart */}
      <div className="section-header mt-2xl">
        <h2>Revenue</h2>
        <span className="see-all" style={{ color: 'var(--green)' }}>{formatCurrency(totalMonthlyRevenue)}/mo</span>
      </div>
      <div className="card rev-card">
        <div className="rev-bars">
          {revenueData.map((d, i) => (
            <div className="rev-col" key={i}>
              <div className="rev-track">
                <div
                  className="rev-fill"
                  style={{
                    height: `${(d.amount / maxRevenue) * 100}%`,
                    animationDelay: `${i * 80}ms`,
                    background: i === revenueData.length - 1 ? 'var(--accent)' : 'var(--bg-hover)',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <span className="rev-month">{d.month}</span>
            </div>
          ))}
        </div>
        <div className="rev-summary">
          <span className="rev-total">{formatCurrency(revenueData[revenueData.length - 1].amount)}</span>
          <span className="text-small">this month</span>
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div className="section-header mt-2xl">
        <h2>Upcoming</h2>
        <button className="see-all" onClick={() => navigate('/schedule')}>View all</button>
      </div>
      <div className="flex-col gap-sm">
        {upcomingSessions.slice(0, 3).map((session, i) => {
          const client = getClientById(session.client_id);
          const d = new Date(session.date);
          return (
            <div className="card sess-card stagger-item" key={session.id} style={staggerDelay(i)}>
              <div className="flex-row gap-md">
                {client ? <Avatar name={client.name} size="sm" /> : <div className="avatar avatar-sm" style={{ background: 'var(--purple)', color: 'white' }}>G</div>}
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="flex-row flex-between">
                    <span className="sess-name truncate">{client ? client.name : session.group_name}</span>
                    <span className="sess-time">{d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex-row gap-sm mt-sm">
                    <span className="badge badge-blue">{session.type}</span>
                    <span className="text-small">{session.duration}min · {d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="section-header mt-2xl">
        <h2>Activity</h2>
      </div>
      <div className="card activity-card">
        {activities.slice(0, 5).map((act, i) => (
          <div className={`act-row ${i < activities.slice(0, 5).length - 1 ? 'act-bordered' : ''}`} key={act.id}>
            <p className="act-text">{act.message}</p>
            <span className="text-small">{formatRelativeTime(act.timestamp)}</span>
          </div>
        ))}
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  );
}
