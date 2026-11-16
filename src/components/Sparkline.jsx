export default function Sparkline({ values = [], width = 92, height = 26 }) {
  const points = values.filter((value) => Number.isFinite(value) && value > 0);
  if (points.length < 2) return <span className="spark-empty" />;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const path = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((value - min) / (max - min || 1)) * (height - 4) - 2;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
