"use client";

import { useEffect, useState, type ReactNode } from "react";

const BUILD_INFO_FOOTER_KEY = "textplex.buildInfoFooter";
const BUILD_INFO_FOOTER_EVENT = "textplex-build-info-footer-change";

function readStoredBuildInfoFooterVisible(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(BUILD_INFO_FOOTER_KEY) === "on";
}

function persistBuildInfoFooterVisible(enabled: boolean): void {
  const value = enabled ? "on" : "off";
  document.documentElement.dataset.buildInfoFooter = value;
  window.localStorage.setItem(BUILD_INFO_FOOTER_KEY, value);
  window.dispatchEvent(new CustomEvent(BUILD_INFO_FOOTER_EVENT, { detail: { enabled } }));
}

function formatBuildAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatTimeSinceBuild(buildAt: string, now: number): string {
  const buildTime = new Date(buildAt).getTime();
  if (Number.isNaN(buildTime)) return "Not available";

  const elapsedMinutes = Math.max(0, Math.floor((now - buildTime) / 60_000));
  if (elapsedMinutes < 1) return "less than a minute";
  if (elapsedMinutes < 60) return `${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"}`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  const remainingMinutes = elapsedMinutes % 60;
  if (elapsedHours < 24) return `${elapsedHours} hour${elapsedHours === 1 ? "" : "s"}${remainingMinutes > 0 ? ` ${remainingMinutes} min` : ""}`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  const remainingHours = elapsedHours % 24;
  return `${elapsedDays} day${elapsedDays === 1 ? "" : "s"}${remainingHours > 0 ? ` ${remainingHours} hr` : ""}`;
}

function useBuildInfoFooterVisible(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const sync = () => {
      setEnabled(readStoredBuildInfoFooterVisible());
    };
    const handleFooterChange = () => {
      sync();
    };

    sync();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === BUILD_INFO_FOOTER_KEY || event.key === null) {
        sync();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(BUILD_INFO_FOOTER_EVENT, handleFooterChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(BUILD_INFO_FOOTER_EVENT, handleFooterChange);
    };
  }, []);

  return [
    enabled,
    (nextEnabled: boolean) => {
      setEnabled(nextEnabled);
      persistBuildInfoFooterVisible(nextEnabled);
    },
  ];
}

export function BuildFooterToggle() {
  const [enabled, setEnabled] = useBuildInfoFooterVisible();

  return (
    <button
      type="button"
      className={`button button-secondary button-compact build-footer-toggle ${enabled ? "is-active" : ""}`}
      aria-pressed={enabled}
      aria-label={enabled ? "Hide detailed build information" : "Show detailed build information"}
      title={enabled ? "Build details on" : "Build details off"}
      onClick={() => {
        setEnabled(!enabled);
      }}
    >
      <span className="build-footer-toggle-dot" aria-hidden="true" />
      <span>{enabled ? "Details on" : "Details off"}</span>
    </button>
  );
}

export function BuildFooter({ buildAt, children, version }: Readonly<{ buildAt: string; children?: ReactNode; version: string }>) {
  const [enabled] = useBuildInfoFooterVisible();
  const [now, setNow] = useState(0);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <footer className="app-build-footer card" aria-label="App build information" data-inventory-id="shell.build-footer">
      <div className="app-build-footer-copy">
        <span className="eyebrow">Current build</span>
        <p className="small-copy">Build <strong>{version}</strong></p>
        <div className="app-build-footer-meta">
          <span>Built {formatBuildAt(buildAt)}</span>
          <span>Time since build: {now > 0 ? formatTimeSinceBuild(buildAt, now) : "checking"}</span>
          {enabled ? <span>Detailed build diagnostics enabled</span> : null}
        </div>
      </div>
      {children}
    </footer>
  );
}
