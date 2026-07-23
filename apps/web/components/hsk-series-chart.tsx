import type { AnalysisSeriesPoint } from "../lib/textplex";

type HskSeriesChartProps = {
  inventoryId: string;
  title: string;
  description: string;
  points: AnalysisSeriesPoint[];
  emptyMessage: string;
};

const hskColors = ["#006b2e", "#159447", "#a4ad0a", "#e58a00", "#d94d28", "#8f1239"];

function buildSmoothPath(coordinates: Array<{ x: number; y: number }>) {
  if (coordinates.length === 0) {
    return "";
  }

  if (coordinates.length === 1) {
    const [point] = coordinates;
    return `M ${point.x} ${point.y}`;
  }

  let path = `M ${coordinates[0].x} ${coordinates[0].y}`;
  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const previous = coordinates[index - 1] ?? coordinates[index];
    const current = coordinates[index];
    const next = coordinates[index + 1];
    const following = coordinates[index + 2] ?? next;
    const firstControlX = current.x + (next.x - previous.x) / 6;
    const firstControlY = current.y + (next.y - previous.y) / 6;
    const secondControlX = next.x - (following.x - current.x) / 6;
    const secondControlY = next.y - (following.y - current.y) / 6;
    path += ` C ${firstControlX} ${firstControlY} ${secondControlX} ${secondControlY} ${next.x} ${next.y}`;
  }

  return path;
}

export function HskSeriesChart({ inventoryId, title, description, points, emptyMessage }: HskSeriesChartProps) {
  const width = 1000;
  const height = 260;
  const left = 42;
  const right = 18;
  const top = 18;
  const bottom = 52;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxLevel = 9;
  const safePoints = points.filter((point) => Number.isFinite(point.value));
  const coordinates = safePoints.map((point, index) => ({
    ...point,
    x: safePoints.length === 1 ? left + plotWidth / 2 : left + (index / (safePoints.length - 1)) * plotWidth,
    y: top + ((maxLevel - Math.min(maxLevel, Math.max(1, point.value))) / (maxLevel - 1)) * plotHeight,
  }));
  const linePath = buildSmoothPath(coordinates);
  const xTickIndexes = Array.from(
    new Set(
      safePoints.length <= 1
        ? [0]
        : [0, Math.floor((safePoints.length - 1) / 4), Math.floor((safePoints.length - 1) / 2), Math.floor(((safePoints.length - 1) * 3) / 4), safePoints.length - 1],
    ),
  );
  const xTicks = xTickIndexes.map((tickIndex) => {
    const point = coordinates[tickIndex];
    return {
      label: `${tickIndex + 1}`,
      x: point?.x ?? left,
    };
  });
  const plotBottom = height - bottom;

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
        <div className="hsk-series-frame">
          <svg
            className="hsk-series-svg"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`${title} chart`}
            preserveAspectRatio="none"
          >
            <line className="hsk-series-baseline" x1={left} x2={width - right} y1={plotBottom} y2={plotBottom} />
            {[1, 3, 5, 7, 9].map((level) => {
              const y = top + ((maxLevel - level) / (maxLevel - 1)) * plotHeight;
              return (
                <g key={level}>
                  <line className="hsk-series-gridline" x1={left} x2={width - right} y1={y} y2={y} />
                  <text className="hsk-series-axis" x={left - 10} y={y + 4} textAnchor="end">{level}</text>
                </g>
              );
            })}
            <path className="hsk-series-line" fill="none" d={linePath} />
            {coordinates.map((point) => {
              const colorIndex = Math.max(1, Math.min(6, Math.round(point.value))) - 1;
              return (
                <circle
                  key={`${point.label}-${point.index}`}
                  className="hsk-series-point"
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill={hskColors[colorIndex]}
                >
                  <title>{`${point.label}: HSK ${point.value.toFixed(1)}`}</title>
                </circle>
              );
            })}
            {xTicks.map((tick) => (
              <text
                key={tick.label}
                className="hsk-series-axis hsk-series-x-axis"
                x={tick.x}
                y={height - 16}
                textAnchor="middle"
              >
                {tick.label}
              </text>
            ))}
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
