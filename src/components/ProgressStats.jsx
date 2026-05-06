import { IconFire, IconTrendUp, IconTrophy, IconCheck } from './Icons';

export default function ProgressStats({ stats }) {
  const items = [
    {
      label: 'Total Volume',
      value: stats.totalVolume >= 1000
        ? `${(stats.totalVolume / 1000).toFixed(1)}k`
        : stats.totalVolume.toLocaleString(),
      unit: 'lbs',
      icon: <IconTrendUp size={16} color="var(--blue)" />,
      color: 'var(--blue)',
    },
    {
      label: 'Streak',
      value: stats.streak,
      unit: 'days',
      icon: <IconFire size={16} color="#FF9F0A" />,
      color: '#FF9F0A',
    },
    {
      label: 'PRs Hit',
      value: stats.prCount,
      unit: '',
      icon: <IconTrophy size={16} color="var(--accent)" />,
      color: 'var(--accent)',
    },
    {
      label: 'Completion',
      value: `${stats.completionRate}`,
      unit: '%',
      icon: <IconCheck size={16} color="var(--green)" />,
      color: 'var(--green)',
    },
  ];

  return (
    <div className="progress-stats-row">
      {items.map((item) => (
        <div className="ps-chip" key={item.label}>
          <div className="ps-chip-icon">{item.icon}</div>
          <span className="ps-chip-value" style={{ color: item.color }}>
            {item.value}
            {item.unit && <span className="ps-chip-unit">{item.unit}</span>}
          </span>
          <span className="ps-chip-label">{item.label}</span>
        </div>
      ))}

      <style>{`
        .progress-stats-row {
          display: flex;
          gap: var(--space-sm);
          overflow-x: auto;
          padding-bottom: var(--space-sm);
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .progress-stats-row::-webkit-scrollbar { display: none; }
        .ps-chip {
          flex: 0 0 auto;
          min-width: 80px;
          background: var(--bg-card);
          border: var(--border);
          border-radius: var(--radius-md);
          padding: var(--space-sm) var(--space-base);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .ps-chip-icon { margin-bottom: 2px; }
        .ps-chip-value {
          font-family: var(--font-heading);
          font-size: var(--fs-lg);
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .ps-chip-unit {
          font-size: var(--fs-xs);
          font-weight: 500;
          opacity: 0.7;
          margin-left: 1px;
        }
        .ps-chip-label {
          font-size: 10px;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
      `}</style>
    </div>
  );
}
