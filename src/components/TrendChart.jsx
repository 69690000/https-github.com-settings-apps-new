import { useId } from 'react';

/**
 * Small area chart. `points` is a list of { label, value }.
 */
export default function TrendChart({ points, format, height = 220, emptyLabel = 'No data yet' }) {
  const gradientId = useId().replace(/:/g, '');
  const width = 720;
  const pad = { top: 16, right: 14, bottom: 28, left: 62 };
  const values = (points || []).map((point) => Number(point.value) || 0);

  if (!points || points.length < 2 || Math.max(...values) <= 0) {
    return (
      <div className="chart-empty" style={{ height }}>
        {emptyLabel}
      </div>
    );
  }

  const max = Math.max(...values);
  const min = 0;
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const x = (index) => pad.left + (index / (points.length - 1)) * innerWidth;
  const y = (value) => pad.top + (1 - (value - min) / (max - min || 1)) * innerHeight;

  const line = values
    .map((value, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(value).toFixed(1)}`)
    .join(' ');
  const area = `${line} L${x(values.length - 1).toFixed(1)},${(height - pad.bottom).toFixed(1)} L${pad.left},${(height - pad.bottom).toFixed(1)} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    value: max * ratio,
    y: pad.top + (1 - ratio) * innerHeight,
  }));

  const labelIndexes = [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend chart">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridLines.map((grid) => (
        <g key={grid.ratio}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={grid.y}
            y2={grid.y}
            stroke="var(--line)"
            strokeDasharray={grid.ratio === 0 ? '0' : '3 6'}
          />
          <text x={pad.left - 10} y={grid.y + 4} textAnchor="end" className="chart-axis">
            {format ? format(grid.value) : grid.value.toFixed(0)}
          </text>
        </g>
      ))}

      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />

      {labelIndexes.map((index) => (
        <text
          key={index}
          x={x(index)}
          y={height - 8}
          textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
          className="chart-axis"
        >
          {points[index].label}
        </text>
      ))}
    </svg>
  );
}
