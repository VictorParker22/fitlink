export default function StatCard({ label, value, icon, color = 'var(--accent)', trend = null, delay = 0 }) {
  return (
    <div
      className="card stat-card stagger-item"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="stat-card-header">
        <div className="stat-icon" style={{ background: `${color}15`, color }}>
          {icon}
        </div>
        {trend !== null && (
          <span className="stat-trend" style={{ color: trend >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="stat-number" style={{ color }}>{value}</div>
      <p className="stat-label">{label}</p>

      <style>{`
        .stat-card {
          flex: 1;
          min-width: 0;
        }
        .stat-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .stat-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-trend {
          font-size: var(--fs-xs);
          font-weight: 600;
        }
        .stat-number {
          font-family: var(--font-heading);
          font-weight: 800;
          font-size: var(--fs-xl);
          line-height: 1;
          margin-bottom: 4px;
        }
        .stat-label {
          font-size: var(--fs-xs);
          color: var(--text-muted);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
