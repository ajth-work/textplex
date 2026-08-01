"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { StudyQueueItem } from "../lib/textplex";

type StudyDueLanguageGroupsProps = {
  items: StudyQueueItem[];
  inventoryId?: string;
};

const QUARTER_HOUR_MS = 15 * 60 * 1000;

const languageLabels: Record<string, string> = {
  ar: "Arabic",
  fr: "French",
  he: "Hebrew",
  ja: "Japanese",
  ko: "Korean",
  local: "Local",
  ru: "Russian",
  zh: "Chinese",
};

function languageLabel(languageCode: string): string {
  const normalized = languageCode.trim().toLowerCase();
  return languageLabels[normalized] ?? languageCode.toUpperCase();
}

function roundUpToQuarterHour(timestamp: number): number {
  return Math.ceil(timestamp / QUARTER_HOUR_MS) * QUARTER_HOUR_MS;
}

function formatReviewStamp(timestamp: number): string {
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(timestamp).toUpperCase();
  const date = new Intl.DateTimeFormat(undefined, { month: "numeric", day: "numeric" }).format(timestamp);
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(timestamp);
  return `${weekday} / ${date} / ${time}`;
}

type StudyLanguageQueueItem = StudyQueueItem & {
  dueTime: number | null;
};

type StudyLanguageQueueGroup = {
  languageCode: string;
  languageLabel: string;
  dueItems: StudyLanguageQueueItem[];
  futureItems: StudyLanguageQueueItem[];
  nextDueTime: number | null;
};

function buildGroups(items: StudyQueueItem[], now: number | null): StudyLanguageQueueGroup[] {
  const groups = new Map<string, StudyLanguageQueueGroup>();

  for (const item of items) {
    const dueTime = item.next_due_at ? Date.parse(item.next_due_at) : Number.NaN;
    const normalizedDueTime = Number.isFinite(dueTime) ? dueTime : null;
    const languageCode = item.language_code.trim().toLowerCase();
    const group = groups.get(languageCode) ?? {
      languageCode,
      languageLabel: languageLabel(languageCode),
      dueItems: [],
      futureItems: [],
      nextDueTime: null,
    };
    const queuedItem = {
      ...item,
      dueTime: normalizedDueTime,
    };

    if (normalizedDueTime == null) {
      group.dueItems.push(queuedItem);
      groups.set(languageCode, group);
      continue;
    }

    if (now == null) {
      group.futureItems.push(queuedItem);
      group.nextDueTime = group.nextDueTime == null ? roundUpToQuarterHour(normalizedDueTime) : Math.min(group.nextDueTime, roundUpToQuarterHour(normalizedDueTime));
      groups.set(languageCode, group);
      continue;
    }

    {
      const roundedDueTime = roundUpToQuarterHour(normalizedDueTime);
      group.nextDueTime = group.nextDueTime == null ? roundedDueTime : Math.min(group.nextDueTime, roundedDueTime);
      if (normalizedDueTime <= now) {
        group.dueItems.push(queuedItem);
      } else {
        group.futureItems.push(queuedItem);
      }
    }

    groups.set(languageCode, group);
  }

  return Array.from(groups.values())
    .filter((group) => group.dueItems.length > 0 || group.futureItems.length > 0)
    .sort((left, right) => {
      const labelCompare = left.languageLabel.localeCompare(right.languageLabel);
      if (labelCompare !== 0) {
        return labelCompare;
      }
      return left.languageCode.localeCompare(right.languageCode);
    })
    .map((group) => ({
      ...group,
      dueItems: group.dueItems
        .slice()
        .sort((left, right) => (left.dueTime ?? Number.POSITIVE_INFINITY) - (right.dueTime ?? Number.POSITIVE_INFINITY) || left.lemma.localeCompare(right.lemma)),
      futureItems: group.futureItems
        .slice()
        .sort((left, right) => (left.dueTime ?? Number.POSITIVE_INFINITY) - (right.dueTime ?? Number.POSITIVE_INFINITY) || left.lemma.localeCompare(right.lemma)),
    }));
}

export function StudyDueLanguageGroups({ items, inventoryId = "study.queue-language-groups" }: StudyDueLanguageGroupsProps) {
  const [now, setNow] = useState<number | null>(null);
  const [requestedNotifyMap, setRequestedNotifyMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setNow(Date.now());
  }, []);

  const groups = useMemo(() => buildGroups(items, now), [items, now]);

  return (
    <div className="study-language-queue-groups" data-inventory-id={inventoryId}>
      {groups.map((group) => {
        const dueCount = group.dueItems.length;
        const upcomingCount = group.futureItems.length;
        const nextDueLabel = group.nextDueTime != null ? formatReviewStamp(group.nextDueTime) : null;
        const notifyRequested = requestedNotifyMap[group.languageCode] ?? false;

        return (
          <details
            key={group.languageCode}
            className="study-language-queue-group"
            data-inventory-id="study.queue-language-group"
            open={dueCount > 0}
          >
            <summary className="study-language-queue-group-summary" data-inventory-id="study.queue-language-group-toggle">
              <div className="study-language-queue-group-copy">
                <span className="eyebrow">{group.languageLabel}</span>
                <h3>{dueCount > 0 ? "Ready now" : "Nothing due yet"}</h3>
              </div>
              <div className="study-language-queue-group-pills">
                <span className="pill">{dueCount} due</span>
                {dueCount === 0 && nextDueLabel ? <span className="pill">Next {nextDueLabel}</span> : null}
              </div>
            </summary>
            <div className="study-language-queue-group-details" data-inventory-id="study.queue-language-group-details">
              {dueCount > 0 ? (
                <>
                  <div className="study-language-term-pills">
                    {group.dueItems.map((item) => (
                      <span
                        key={`${item.language_code}-${item.lemma}-${item.next_due_at ?? "now"}`}
                        className="pill study-language-term-pill"
                        data-inventory-id="study.queue-language-term-pill"
                        lang={item.language_code}
                      >
                        {item.lemma}
                      </span>
                    ))}
                  </div>
                  <Link
                    className="button button-secondary button-compact study-language-start-now"
                    href={`/study/practice?mode=review&language_code=${encodeURIComponent(group.languageCode)}`}
                    data-inventory-id="study.queue-language-start-now"
                  >
                    Start now
                  </Link>
                  {upcomingCount > 0 && nextDueLabel ? (
                    <p className="small-copy">More {group.languageLabel} items are scheduled for {nextDueLabel}.</p>
                  ) : null}
                </>
              ) : null}

              {dueCount === 0 && nextDueLabel ? (
                <div className="study-language-next-block">
                  <p className="small-copy">No {group.languageLabel} terms are due now. Next review: {nextDueLabel}.</p>
                  <button
                    type="button"
                    className={`button button-secondary button-compact ${notifyRequested ? "is-active" : ""}`}
                    onClick={() => {
                      setRequestedNotifyMap((current) => ({
                        ...current,
                        [group.languageCode]: true,
                      }));
                    }}
                    data-inventory-id="study.queue-language-notify"
                    aria-pressed={notifyRequested}
                  >
                    {notifyRequested ? "Notify requested" : "Notify me"}
                  </button>
                  {notifyRequested ? (
                    <p className="small-copy">Reminder delivery channels are tracked separately for later wiring.</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </details>
        );
      })}
    </div>
  );
}
