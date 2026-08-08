"use client";

import type { VocabularyAssessmentAxisRecord } from "../../../packages/shared/src";

type StudyAxisRadarChartProps = {
  axes: VocabularyAssessmentAxisRecord[];
  inventoryId?: string;
  title?: string;
  description?: string;
  emptyMessage?: string;
};

const AXIS_ORDER: VocabularyAssessmentAxisRecord["axis_key"][] = [
  "form_to_meaning",
  "form_to_reading",
  "meaning_to_form",
  "reading_to_form",
];

const AXIS_LABELS: Record<VocabularyAssessmentAxisRecord["axis_key"], string> = {
  form_to_meaning: "Meaning",
  form_to_reading: "Reading",
  meaning_to_form: "Form",
  reading_to_form: "Romanization",
};

const AXIS_SUBLABELS: Record<VocabularyAssessmentAxisRecord["axis_key"], string> = {
  form_to_meaning: "Source form → meaning",
  form_to_reading: "Source form → reading",
  meaning_to_form: "Meaning → source form",
  reading_to_form: "Reading → source form",
};

function axisLabel(axisKey: VocabularyAssessmentAxisRecord["axis_key"]): string {
  return AXIS_LABELS[axisKey];
}

function axisSubLabel(axisKey: VocabularyAssessmentAxisRecord["axis_key"]): string {
  return AXIS_SUBLABELS[axisKey];
}

function normalizeAxes(axes: VocabularyAssessmentAxisRecord[]): VocabularyAssessmentAxisRecord[] {
  return AXIS_ORDER.map((axisKey) => axes.find((axis) => axis.axis_key === axisKey)).filter(
    (axis): axis is VocabularyAssessmentAxisRecord => axis != null,
  );
}

function emptyAxis(axisKey: VocabularyAssessmentAxisRecord["axis_key"]): VocabularyAssessmentAxisRecord {
  return {
    language_code: "",
    lemma: "",
    axis_key: axisKey,
    prompt_type: "",
    response_type: "",
    stage: 0,
    due_at: null,
    last_seen_at: null,
    last_result: null,
    pass_count: 0,
    fail_count: 0,
  };
}

export function StudyAxisRadarChart({
  axes,
  inventoryId = "study.glossed-vocabulary-item-axis-chart",
  title = "Axis SRS",
  description = "Current SRS stage for each assessment axis on this term.",
  emptyMessage = "Axis progress will appear after the term has been assessed.",
}: StudyAxisRadarChartProps) {
  const orderedAxes = normalizeAxes(axes);
  const maxStage = 12;
  const width = 320;
  const height = 320;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 108;
  const ringStages = [3, 6, 9, 12];
  const chartAxes = AXIS_ORDER.map((axisKey) => orderedAxes.find((axis) => axis.axis_key === axisKey) ?? emptyAxis(axisKey));
  const points = chartAxes.map((axis, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / chartAxes.length;
    const stage = Math.max(0, Math.min(maxStage, axis.stage));
    const value = radius * (stage / maxStage);
    return {
      axis,
      angle,
      stage,
      x: centerX + Math.cos(angle) * value,
      y: centerY + Math.sin(angle) * value,
      labelX: centerX + Math.cos(angle) * (radius + 22),
      labelY: centerY + Math.sin(angle) * (radius + 22),
    };
  });
  const polygonPoints = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section className="study-axis-radar" data-inventory-id={inventoryId}>
      <div className="study-axis-radar-header">
        <div>
          <span className="eyebrow">Assessment axes</span>
          <h4>{title}</h4>
        </div>
        <span className="pill">{orderedAxes.length ? `${orderedAxes.length} axes` : "No axis data"}</span>
      </div>
      <p className="small-copy">{description}</p>
      {axes.length === 0 ? (
        <p className="study-axis-radar-empty" role="status">
          {emptyMessage}
        </p>
      ) : (
        <>
          <div className="study-axis-radar-frame" role="img" aria-label={`${title} radar chart`}>
            <svg viewBox={`0 0 ${width} ${height}`} className="study-axis-radar-svg" aria-hidden="true">
              {ringStages.map((stage) => {
                const ringRadius = radius * (stage / maxStage);
                return <circle key={stage} cx={centerX} cy={centerY} r={ringRadius} className="study-axis-radar-ring" />;
              })}
              {points.map((point) => (
                <line
                  key={`axis-line-${point.axis.axis_key}`}
                  x1={centerX}
                  y1={centerY}
                  x2={centerX + Math.cos(point.angle) * radius}
                  y2={centerY + Math.sin(point.angle) * radius}
                  className="study-axis-radar-spoke"
                />
              ))}
              <polygon points={polygonPoints} className="study-axis-radar-polygon" />
              {points.map((point) => (
                <circle key={`axis-point-${point.axis.axis_key}`} cx={point.x} cy={point.y} r="5.5" className="study-axis-radar-point">
                  <title>{`${axisLabel(point.axis.axis_key)}: stage ${point.stage}`}</title>
                </circle>
              ))}
              {points.map((point) => (
                <g key={`axis-label-${point.axis.axis_key}`}>
                  <text x={point.labelX} y={point.labelY - 4} textAnchor="middle" className="study-axis-radar-label">
                    {axisLabel(point.axis.axis_key)}
                  </text>
                  <text x={point.labelX} y={point.labelY + 12} textAnchor="middle" className="study-axis-radar-stage">
                    {point.stage}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <div className="study-axis-radar-legend" aria-label="Axis stage summary">
            {AXIS_ORDER.map((axisKey) => {
              const axis = orderedAxes.find((entry) => entry.axis_key === axisKey);
              return (
                <div key={axisKey} className="study-axis-radar-legend-item">
                  <span className="eyebrow">{axisLabel(axisKey)}</span>
                  <strong>Stage {axis?.stage ?? 0}</strong>
                  <span className="muted">{axisSubLabel(axisKey)}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
