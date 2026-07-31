"use client";

import { useEffect, useMemo, useState } from "react";

import type { StudyQueueItem } from "../lib/textplex";

const HORIZON_HOURS = [6, 12, 24, 48, 72, 168] as const;
const HOUR_MS = 60 * 60 * 1000;

type DueReviewChartProps = {
  items: StudyQueueItem[];
  inventoryId?: string;
};

function formatClockTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function formatCurrentStamp(timestamp: number): string {
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(timestamp).toUpperCase();
  const date = new Intl.DateTimeFormat(undefined, { month: "numeric", day: "numeric" }).format(timestamp);
  return `${weekday} / ${date} / ${formatClockTime(timestamp)}`;
}

function getBucketCount(horizonHours: number): number {
  if (horizonHours <= 6) {
    return 3;
  }

  if (horizonHours <= 12) {
    return 4;
  }

  if (horizonHours <= 24) {
    return 4;
  }

  if (horizonHours <= 48) {
    return 4;
  }

  if (horizonHours <= 72) {
    return 6;
  }

  return 7;
}

function formatGeneralFrame(offsetHours: number): string {
  if (offsetHours <= 0) {
    return "Now";
  }

  if (offsetHours < 24) {
    return `${Math.max(1, Math.round(offsetHours / 3) * 3)}h`;
  }

  if (offsetHours < 168) {
    return `${Math.max(1, Math.round(offsetHours / 24))}d`;
  }

  return `${Math.max(1, Math.round(offsetHours / 168))}w`;
}

export function DueReviewChart({ items, inventoryId = "study.due-review-chart" }: DueReviewChartProps) {
  const [horizonIndex, setHorizonIndex] = useState(2);
  const [now, setNow] = useState<number | null>(null);
  const horizonHours = HORIZON_HOURS[horizonIndex];

  useEffect(() => {
    setNow(Date.now());
  }, []);

  const buckets = useMemo(() => {
    const bucketCount = getBucketCount(horizonHours);
    const bucketSize = horizonHours / bucketCount;
    const counts = Array.from({ length: bucketCount }, () => 0);

    for (const item of items) {
      const dueTime = item.next_due_at ? Date.parse(item.next_due_at) : Number.NaN;
      if (!Number.isFinite(dueTime)) {
        continue;
      }
      const hoursUntilDue = now == null ? Number.POSITIVE_INFINITY : Math.max(0, (dueTime - now) / HOUR_MS);
      if (hoursUntilDue > horizonHours) {
        continue;
      }
      const bucketIndex = Math.min(bucketCount - 1, Math.floor(hoursUntilDue / bucketSize));
      counts[bucketIndex] += 1;
    }

    return counts.map((count, index) => {
      const bucketEnd = Math.min(horizonHours, (index + 1) * bucketSize);
      return {
        count,
        label: formatGeneralFrame(bucketEnd),
      };
    });
  }, [horizonHours, items, now]);

  const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const currentTimeLabel = now == null ? null : formatCurrentStamp(now);

  return (
    <section className="study-due-review-chart" data-inventory-id={inventoryId}>
      <div className="study-due-review-chart-header">
        <div className="study-due-review-chart-copy">
          <span className="eyebrow">Review forecast</span>
          <h3>Upcoming reviews</h3>
          <p className="small-copy">Current time: {currentTimeLabel ?? "loading"}.</p>
        </div>
        <div className="study-due-review-chart-controls" aria-label="Review forecast time scale">
          <button
            type="button"
            className="button button-secondary button-compact"
            onClick={() => setHorizonIndex((current) => Math.max(0, current - 1))}
            disabled={horizonIndex === 0}
            aria-label="Show a shorter review forecast"
          >
            -
          </button>
          <span className="pill">{horizonHours}h</span>
          <button
            type="button"
            className="button button-secondary button-compact"
            onClick={() => setHorizonIndex((current) => Math.min(HORIZON_HOURS.length - 1, current + 1))}
            disabled={horizonIndex === HORIZON_HOURS.length - 1}
            aria-label="Show a longer review forecast"
          >
            +
          </button>
        </div>
      </div>

      <div
        className="study-due-review-chart-axis"
        aria-hidden="true"
        style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}
      >
        {buckets.map((bucket) => (
          <span className="study-due-review-chart-axis-label" key={bucket.label}>
            {bucket.label}
          </span>
        ))}
      </div>

      <div
        className="study-due-review-chart-bars"
        role="img"
        aria-label="Upcoming review counts for the selected forecast horizon"
        style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}
      >
        {buckets.map((bucket) => (
          <div className="study-due-review-chart-bar-group" key={bucket.label}>
            <div className="study-due-review-chart-bar-track">
              <div
                className="study-due-review-chart-bar"
                style={{ height: bucket.count ? `${Math.max(8, (bucket.count / maxCount) * 100)}%` : "0%" }}
                title={`${bucket.count} review${bucket.count === 1 ? "" : "s"} due by ${bucket.label}`}
              />
            </div>
            <strong>{bucket.count}</strong>
          </div>
        ))}
      </div>
      {!items.some((item) => item.next_due_at) ? <p className="small-copy">No scheduled review times yet.</p> : null}
    </section>
  );
}
