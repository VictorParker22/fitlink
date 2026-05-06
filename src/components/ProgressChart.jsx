/**
 * Flexible SVG chart component
 * Supports:
 *  - Line chart (default): data = number[], dates = string[]
 *  - Volume chart: data = { date: string, value: number }[], mode = 'bar'
 */
export default function ProgressChart({
  data,
  dates,
  label = 'Weight (lbs)',
  color = '#5B8DEF',
  mode = 'line',
  emptyMessage = 'Not enough data to show chart',
}) {
  // Normalize data to { date, value }[] format
  let points = [];
  if (Array.isArray(data) && data.length > 0) {
    if (typeof data[0] === 'object' && data[0].date !== undefined) {
      points = data;
    } else {
      points = data.map((val, i) => ({
        date: dates?.[i] || `${i + 1}`,
        value: Number(val),
      }));
    }
  }

  if (points.length < 2) {
    return (
      <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
        <p className="text-small">{emptyMessage}</p>
      </div>
    );
  }

  const width = 340;
  const height = 160;
  const padding = { top: 20, right: 20, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = points.map((p) => p.value);
  const minVal = mode === 'bar' ? 0 : Math.min(...values) - 5;
  const maxVal = Math.max(...values) * (mode === 'bar' ? 1.15 : 1) + (mode === 'bar' ? 0 : 5);
  const range = maxVal - minVal || 1;

  const coords = points.map((p, i) => ({
    x: padding.left + (i / (points.length - 1 || 1)) * chartW,
    y: padding.top + chartH - ((p.value - minVal) / range) * chartH,
    ...p,
  }));

  // Y-axis ticks
  const yTicks = 4;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const val = minVal + (range * i) / yTicks;
    return val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val);
  });

  // X-axis labels (show ~5 evenly spaced)
  const dateLabels = points.map((p) => {
    const d = new Date(p.date);
    if (isNaN(d.getTime())) return p.date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const xLabelIndices = [];
  if (points.length <= 5) {
    points.forEach((_, i) => xLabelIndices.push(i));
  } else {
    const step = (points.length - 1) / 4;
    for (let i = 0; i < 5; i++) xLabelIndices.push(Math.round(step * i));
  }

  if (mode === 'bar') {
    const barWidth = Math.max(6, Math.min(20, chartW / points.length - 3));

    return (
      <div className="progress-chart">
        <p className="text-small mb-sm">{label}</p>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
          {/* Grid lines */}
          {yLabels.map((val, i) => {
            const y = padding.top + chartH - ((typeof val === 'string' ? parseFloat(val) * 1000 : val) - minVal) / range * chartH;
            return (
              <g key={i}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <text x={padding.left - 8} y={y + 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">{val}</text>
              </g>
            );
          })}

          {/* Bars */}
          {coords.map((c, i) => {
            const barH = ((c.value - minVal) / range) * chartH;
            const isLast = i === coords.length - 1;
            return (
              <g key={i}>
                <rect
                  x={c.x - barWidth / 2}
                  y={padding.top + chartH - barH}
                  width={barWidth}
                  height={barH}
                  rx={3}
                  fill={isLast ? color : `${color}44`}
                />
                {isLast && (
                  <text x={c.x} y={padding.top + chartH - barH - 6} fill={color} fontSize="10" fontWeight="700" textAnchor="middle">
                    {c.value >= 1000 ? `${(c.value / 1000).toFixed(1)}k` : c.value}
                  </text>
                )}
              </g>
            );
          })}

          {/* X-axis labels */}
          {xLabelIndices.map((i) => (
            <text key={i} x={coords[i].x} y={height - 5} fill="var(--text-muted)" fontSize="9" textAnchor="middle">
              {dateLabels[i]}
            </text>
          ))}
        </svg>
      </div>
    );
  }

  // Line chart mode
  const pathD = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${padding.top + chartH} L ${coords[0].x} ${padding.top + chartH} Z`;
  const gradientId = `areaGrad-${label.replace(/\s/g, '')}`;

  return (
    <div className="progress-chart">
      <p className="text-small mb-sm">{label}</p>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
        {/* Grid lines */}
        {yLabels.map((val, i) => {
          const numVal = typeof val === 'string' ? parseFloat(val) * 1000 : val;
          const y = padding.top + chartH - ((numVal - minVal) / range) * chartH;
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x={padding.left - 8} y={y + 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">{val}</text>
            </g>
          );
        })}

        {/* Area fill */}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {coords.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="var(--bg-primary)" stroke={color} strokeWidth="2" />
            {(i === 0 || i === coords.length - 1) && (
              <text x={p.x} y={p.y - 10} fill={color} fontSize="10" fontWeight="600" textAnchor="middle">
                {p.value >= 1000 ? `${(p.value / 1000).toFixed(1)}k` : p.value}
              </text>
            )}
          </g>
        ))}

        {/* X-axis labels */}
        {xLabelIndices.map((i) => (
          <text key={i} x={coords[i].x} y={height - 5} fill="var(--text-muted)" fontSize="9" textAnchor="middle">
            {dateLabels[i]}
          </text>
        ))}
      </svg>
    </div>
  );
}
