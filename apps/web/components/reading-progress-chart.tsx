import type { ReadingHistoryPoint } from "../lib/textplex";

type ReadingProgressMetric = "pages" | "sentences";

type ReadingProgressChartProps = {
  inventoryId: string;
  title: string;
  description: string;
  points: ReadingHistoryPoint[];
  metric: ReadingProgressMetric;
  emptyMessage: string;
};

function metricValue(point: ReadingHistoryPoint, metric: ReadingProgressMetric): number {
  return metric === "pages" ? point.cumulative_pages : point.cumulative_sentences;
}

function metricLabel(metric: ReadingProgressMetric): string {
  return metric === "pages" ? "pages" : "sentences";
}

export function ReadingProgressChart({ inventoryId, title, description, points, metric, emptyMessage }: ReadingProgressChartProps) {
  const width = 1000;
  const height = 280;
  const left = 52;
  const right = 18;
  const top = 18;
  const bottom = 54;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const hasData = points.some((point) => metricValue(point, metric) > 0);
  const maxValue = Math.max(1, ...points.map((point) => metricValue(point, metric)));
  const coordinates = points.map((point, index) => ({
    point,
    x: points.length === 1 ? left + plotWidth / 2 : left + (index / Math.max(points.length - 1, 1)) * plotWidth,
    y: top + (1 - metricValue(point, metric) / maxValue) * plotHeight,
  }));
  const xTickIndexes = Array.from(
    new Set(
      points.length <= 1
        ? [0]
        : [0, Math.floor((points.length - 1) / 2), points.length - 1],
    ),
  );
  const yTicks = Array.from(new Set([maxValue, Math.round(maxValue / 2), 0]));
  const plotBottom = height - bottom;

  return (
    <article className="card reading-progress-card" data-inventory-id={inventoryId}>
      <div className="reading-progress-header">
        <div>
          <span className="eyebrow">Reading trajectory</span>
          <h2>{title}</h2>
        </div>
        <span className="muted">{points.length} days</span>
      </div>
      <p className="small-copy">{description}</p>
      {!hasData ? (
        <p className="reading-progress-empty" role="status">{emptyMessage}</p>
      ) : (
        <div className="reading-progress-frame">
          <svg
            className="reading-progress-svg"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`${title} chart`}
            preserveAspectRatio="none"
          >
            {yTicks.map((value) => {
              const y = top + (1 - value / maxValue) * plotHeight;
              return (
                <g key={value}>
                  <line className="reading-progress-gridline" x1={left} x2={width - right} y1={y} y2={y} />
                  <text className="reading-progress-axis" x={left - 10} y={y + 4} textAnchor="end">{value}</text>
                </g>
              );
            })}
            <polyline
              className="reading-progress-line"
              points={coordinates.map(({ x, y }) => `${x},${y}`).join(" ")}
            />
            {coordinates.map(({ point, x, y }) => {
              const value = metricValue(point, metric);
              return (
                <circle key={`${point.day}-${metric}`} className="reading-progress-point" cx={x} cy={y} r="4.5">
                  <title>{`${point.day}: Day ${point.day_index}, ${value} ${metricLabel(metric)}`}</title>
                </circle>
              );
            })}
            {xTickIndexes.map((index) => {
              const point = coordinates[index];
              const day = points[index];
              return point && day ? (
                <text key={day.day} className="reading-progress-axis reading-progress-x-axis" x={point.x} y={height - 16} textAnchor="middle">
                  Day {day.day_index}
                </text>
              ) : null;
            })}
          </svg>
        </div>
      )}
      <div className="reading-progress-legend">
        <span><i aria-hidden="true" /> Cumulative {metricLabel(metric)}</span>
        <span>X-axis: reading days since start</span>
      </div>
    </article>
  );
}
