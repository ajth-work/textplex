"use client";

import { useEffect, useState } from "react";

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

function formatRebootedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
      aria-label={enabled ? "Hide the build footer" : "Show the build footer"}
      title={enabled ? "Build footer on" : "Build footer off"}
      onClick={() => {
        setEnabled(!enabled);
      }}
    >
      <span className="build-footer-toggle-dot" aria-hidden="true" />
      <span>{enabled ? "Footer on" : "Footer off"}</span>
    </button>
  );
}

export function BuildFooter({ rebootedAt, version }: Readonly<{ rebootedAt: string; version: string }>) {
  const [enabled] = useBuildInfoFooterVisible();

  if (!enabled) {
    return null;
  }

  return (
    <footer className="app-build-footer card" aria-label="App build information" data-inventory-id="shell.build-footer">
      <div className="app-build-footer-copy">
        <span className="eyebrow">Latest update</span>
        <p className="small-copy">
          Version <strong>{version}</strong> - last reboot/rebuild {formatRebootedAt(rebootedAt)}
        </p>
      </div>
    </footer>
  );
}
