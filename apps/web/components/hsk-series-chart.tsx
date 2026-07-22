import type { AnalysisSeriesPoint } from "../lib/textplex";

type HskSeriesChartProps = {
  inventoryId: string;
  title: string;
  description: string;
  points: AnalysisSeriesPoint[];
  emptyMessage: string;
};

const hskColors = ["#006b2e", "#159447", "#a4ad0a", "#e58a00", "#d94d28", "#8f1239"];

export function HskSeriesChart({ inventoryId, title, description, points, emptyMessage }: HskSeriesChartProps) {
  const width = Math.max(560, points.length * 48);
  const height = 250;
  const left = 42;
  const right = 18;
  const top = 18;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxLevel = 9;
  const safePoints = points.filter((point) => Number.isFinite(point.value));
  const coordinates = safePoints.map((point, index) => ({
    ...point,
    x: safePoints.length === 1 ? left + plotWidth / 2 : left + (index / (safePoints.length - 1)) * plotWidth,
    y: top + ((maxLevel - Math.min(maxLevel, Math.max(1, point.value))) / (maxLevel - 1)) * plotHeight,
  }));

  return (
    <article className="card hsk-series-card" data-inventory-id={inventoryId}>
      <div className="hsk-series-header">
        <div>
          <span className="eyebrow">HSK progression</span>
          <h2>{title}</h2>
        </div>
        <span className="muted">{safePoints.length} points</span>
      </div>
      <p className="small-copy">{description}</p>
      {safePoints.length === 0 ? (
        <p className="hsk-series-empty" role="status">{emptyMessage}</p>
      ) : (
        <div className="hsk-series-scroll">
          <svg
            className="hsk-series-svg"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`${title} chart`}
          >
            {[1, 3, 5, 7, 9].map((level) => {
              const y = top + ((maxLevel - level) / (maxLevel - 1)) * plotHeight;
              return (
                <g key={level}>
                  <line className="hsk-series-gridline" x1={left} x2={width - right} y1={y} y2={y} />
                  <text className="hsk-series-axis" x={left - 9} y={y + 4} textAnchor="end">{level}</text>
                </g>
              );
            })}
            <polyline className="hsk-series-line" fill="none" points={coordinates.map((point) => `${point.x},${point.y}`).join(" ")} />
            {coordinates.map((point) => {
              const colorIndex = Math.max(1, Math.min(6, Math.round(point.value))) - 1;
              return (
                <g key={`${point.label}-${point.index}`}>
                  <circle className="hsk-series-point" cx={point.x} cy={point.y} r="5" fill={hskColors[colorIndex]}>
                    <title>{`${point.label}: HSK ${point.value.toFixed(1)}`}</title>
                  </circle>
                  <text className="hsk-series-label" x={point.x} y={height - 16} textAnchor="middle">{point.label}</text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
      <div className="hsk-series-legend" aria-label="HSK level colors">
        {hskColors.map((color, index) => (
          <span key={color}>
            <i style={{ backgroundColor: color }} aria-hidden="true" />
            HSK {index + 1}
          </span>
        ))}
      </div>
    </article>
  );
}
