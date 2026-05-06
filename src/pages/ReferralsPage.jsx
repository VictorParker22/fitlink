import { useState } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import InviteModal from '../components/InviteModal';
import { IconPlus, IconTrendUp, IconTarget, IconDollar, IconTrophy, IconAward } from '../components/Icons';
import { formatDate, getReferralTier, getNextTierProgress, staggerDelay, formatCurrency } from '../utils/helpers';
import './ReferralsPage.css';

export default function ReferralsPage() {
  const { referrals, totalReferrals, activeReferrals, pendingReferrals, referralEarnings, conversionRate, leaderboard } = useApp();
  const [showInvite, setShowInvite] = useState(false);
  const [filter, setFilter] = useState('all');

  const tier = getReferralTier(totalReferrals);
  const tierProgress = getNextTierProgress(totalReferrals);

  const filteredReferrals = referrals.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const statusConfig = {
    active: { color: 'var(--green)', label: 'Active' },
    signed_up: { color: 'var(--teal)', label: 'Signed Up' },
    pending: { color: '#FF9F0A', label: 'Pending' },
    expired: { color: 'var(--text-tertiary)', label: 'Expired' },
  };

  return (
    <div className="page-content referrals-page">
      <Header
        title="Referrals"
        subtitle={`${totalReferrals} total referrals`}
        rightAction={
          <button className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)} id="invite-btn-top">
            <IconPlus size={14} /> Invite
          </button>
        }
      />

      {/* Tier Banner */}
      <div className="tier-banner mt-lg">
        <div className="tier-icon">{tier.icon}</div>
        <div className="flex-1">
          <div className="flex-row flex-between">
            <h3 className="heading-3">{tier.name} Tier</h3>
            {tierProgress.percent < 100 && (
              <span className="text-small">{tierProgress.current}/{tierProgress.target} to {tierProgress.nextTier}</span>
            )}
          </div>
          <div className="progress-bar mt-sm">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(tierProgress.percent, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="ref-stats-grid mt-lg">
        <div className="ref-stat-card">
          <div className="ref-stat-icon" style={{ background: 'var(--blue-soft)' }}>
            <IconTrendUp size={16} color="var(--blue)" />
          </div>
          <span className="ref-stat-value">{totalReferrals}</span>
          <span className="ref-stat-label">Total</span>
        </div>
        <div className="ref-stat-card">
          <div className="ref-stat-icon" style={{ background: 'var(--green-soft)' }}>
            <IconTarget size={16} color="var(--green)" />
          </div>
          <span className="ref-stat-value">{conversionRate}%</span>
          <span className="ref-stat-label">Conversion</span>
        </div>
        <div className="ref-stat-card">
          <div className="ref-stat-icon" style={{ background: 'var(--accent-soft)' }}>
            <IconDollar size={16} color="var(--accent)" />
          </div>
          <span className="ref-stat-value">{formatCurrency(referralEarnings)}</span>
          <span className="ref-stat-label">Earned</span>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="section-header mt-xl">
        <h2 className="flex-row gap-sm"><IconTrophy size={16} color="#FF9F0A" /> Leaderboard</h2>
      </div>
      <div className="card leaderboard-card">
        {leaderboard.map((entry, i) => (
          <div className={`lb-row ${entry.isYou ? 'lb-you' : ''}`} key={i}>
            <span className="lb-rank">#{entry.rank}</span>
            <Avatar name={entry.name} size="sm" />
            <span className="lb-name flex-1">{entry.name} {entry.isYou && <span className="badge badge-lime" style={{ marginLeft: 4 }}>You</span>}</span>
            <span className="lb-count">{entry.referrals} refs</span>
          </div>
        ))}
      </div>

      {/* Filter & Referral List */}
      <div className="section-header mt-xl">
        <h2>Referral History</h2>
      </div>

      <div className="tabs mb-base">
        {['all', 'active', 'signed_up', 'pending', 'expired'].map((f) => (
          <button
            key={f}
            className={`tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
            id={`ref-filter-${f}`}
          >
            {f === 'signed_up' ? 'Signed Up' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="ref-list">
        {filteredReferrals.map((ref, i) => {
          const sc = statusConfig[ref.status];
          return (
            <div className="card ref-item stagger-item" key={ref.id} style={staggerDelay(i, 40)}>
              <div className="flex-row gap-md">
                <Avatar name={ref.referredName} size="sm" />
                <div className="flex-1">
                  <span className="ref-name">{ref.referredName}</span>
                  <span className="text-small">{formatDate(ref.date)}</span>
                </div>
                <div className="flex-col gap-xs" style={{ alignItems: 'flex-end' }}>
                  <span className="badge" style={{ background: `${sc.color}20`, color: sc.color }}>
                    {sc.label}
                  </span>
                  {ref.reward > 0 && (
                    <span className="text-small" style={{ color: 'var(--green)' }}>+${ref.reward}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  );
}
