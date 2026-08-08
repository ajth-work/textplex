"use client";

import { useEffect, useState } from "react";

import { fetchJson, putJson, type SettingEntry, type SettingsSurfaceResponse, type SettingsUpdateRequest } from "../lib/textplex";
import {
  isDarkAppTheme,
  persistAppTheme,
  persistAppThemeFollowSystem,
  readStoredAppTheme,
  readStoredAppThemeFollowSystem,
  resolveAppThemeFromSettings,
  resolveAppThemeFollowSystemFromSettings,
  resolveAppThemeOpposite,
  type AppTheme,
} from "../lib/theme";

function upsertSetting(entries: SettingEntry[], key: string, value: string): SettingEntry[] {
  return [...entries.filter((entry) => entry.key !== key), { key, value }];
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A8.8 8.8 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

export function ThemeToggleButton() {
  const [theme, setTheme] = useState<AppTheme>(() => readStoredAppTheme() ?? "neutral");
  const [followSystem, setFollowSystem] = useState(() => readStoredAppThemeFollowSystem() ?? false);
  const [settingsEntries, setSettingsEntries] = useState<SettingEntry[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    void fetchJson<SettingsSurfaceResponse>("/settings")
      .then((result) => {
        if (!active) {
          return;
        }

        setSettingsEntries(result.entries);
        const storedTheme = readStoredAppTheme();
        const storedFollowSystem = readStoredAppThemeFollowSystem();
        setTheme(storedTheme ?? resolveAppThemeFromSettings(result.entries));
        setFollowSystem(storedFollowSystem ?? resolveAppThemeFollowSystemFromSettings(result.entries) ?? false);
      })
      .catch(() => {
        if (active) {
          setSettingsEntries(null);
        }
      });

    const syncFromStorage = () => {
      setTheme(readStoredAppTheme() ?? "neutral");
      setFollowSystem(readStoredAppThemeFollowSystem() ?? false);
    };

    const handleThemeChange = () => syncFromStorage();
    const handleFollowSystemChange = () => syncFromStorage();

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === "textplex.theme" ||
        event.key === "textplex.readerTheme" ||
        event.key === "textplex.themeFollowSystem"
      ) {
        syncFromStorage();
      }
    };

    window.addEventListener("textplex-theme-change", handleThemeChange);
    window.addEventListener("textplex-theme-follow-system-change", handleFollowSystemChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      active = false;
      window.removeEventListener("textplex-theme-change", handleThemeChange);
      window.removeEventListener("textplex-theme-follow-system-change", handleFollowSystemChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const darkModeActive = isDarkAppTheme(theme);
  const nextTheme = resolveAppThemeOpposite(theme);
  const icon = darkModeActive ? <SunIcon /> : <MoonIcon />;
  const label = darkModeActive ? "Switch to day mode" : "Switch to night mode";

  async function saveToggle(nextThemeValue: AppTheme) {
    const existingEntries = settingsEntries ?? (await fetchJson<SettingsSurfaceResponse>("/settings")).entries;
    const nextEntries = upsertSetting(upsertSetting(existingEntries, "theme", nextThemeValue), "themeFollowSystem", "off");

    await putJson<SettingsSurfaceResponse>("/settings", {
      entries: nextEntries,
    } satisfies SettingsUpdateRequest);
    setSettingsEntries(nextEntries);
  }

  async function handleClick() {
    if (saving) {
      return;
    }

    const nextThemeValue = nextTheme;
    setSaving(true);
    setFollowSystem(false);
    persistAppThemeFollowSystem(false);
    setTheme(nextThemeValue);
    persistAppTheme(nextThemeValue);

    try {
      await saveToggle(nextThemeValue);
    } catch {
      // Keep the immediate local toggle even if hosted settings are unavailable.
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      className="button button-secondary theme-toggle-button"
      onClick={() => void handleClick()}
      disabled={saving}
      aria-label={label}
      title={label}
      data-inventory-id="shell.theme-toggle"
    >
      {icon}
      <span className="visually-hidden">{followSystem ? "Follow device theme enabled" : label}</span>
    </button>
  );
}
