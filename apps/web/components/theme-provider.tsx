"use client";

import { useEffect, type ReactNode } from "react";

import { fetchJson, type SettingsSurfaceResponse } from "../lib/textplex";
import {
  applyAppTheme,
  applyAppThemeGridEnabled,
  applyAppThemePatternOpacity,
  DEFAULT_APP_THEME_GRID_ENABLED,
  DEFAULT_APP_THEME_PATTERN_OPACITY,
  persistAppTheme,
  persistAppThemeGridEnabled,
  persistAppThemePatternOpacity,
  readStoredAppTheme,
  readStoredAppThemeGridEnabled,
  readStoredAppThemePatternOpacity,
  resolveAppThemeFromSettings,
  resolveAppThemeGridEnabledFromSettings,
  resolveAppThemePatternOpacityFromSettings,
  resolveAppTheme,
} from "../lib/theme";

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  useEffect(() => {
    let active = true;

    const initialTheme = readStoredAppTheme();
    const initialGridEnabled = readStoredAppThemeGridEnabled();
    const initialPatternOpacity = readStoredAppThemePatternOpacity();
    applyAppTheme(initialTheme ?? "neutral");
    applyAppThemeGridEnabled(initialGridEnabled ?? DEFAULT_APP_THEME_GRID_ENABLED);
    applyAppThemePatternOpacity(initialPatternOpacity ?? DEFAULT_APP_THEME_PATTERN_OPACITY);

    void fetchJson<SettingsSurfaceResponse>("/settings")
      .then((result) => {
        if (!active) {
          return;
        }
        const nextTheme = resolveAppThemeFromSettings(result.entries) ?? initialTheme ?? "neutral";
        const nextGridEnabled = resolveAppThemeGridEnabledFromSettings(result.entries)
          ?? initialGridEnabled
          ?? DEFAULT_APP_THEME_GRID_ENABLED;
        const nextPatternOpacity = resolveAppThemePatternOpacityFromSettings(result.entries)
          ?? initialPatternOpacity
          ?? DEFAULT_APP_THEME_PATTERN_OPACITY;
        persistAppTheme(nextTheme);
        persistAppThemeGridEnabled(nextGridEnabled);
        persistAppThemePatternOpacity(nextPatternOpacity);
      })
      .catch(() => {
        if (initialTheme) {
          applyAppTheme(initialTheme);
        }
      });

    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ theme?: string }>;
      const nextTheme = resolveAppTheme(customEvent.detail?.theme);
      applyAppTheme(nextTheme);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null) {
        return;
      }
      if (event.key === "textplex.theme" || event.key === "textplex.readerTheme") {
        applyAppTheme(resolveAppTheme(event.newValue));
      }
      if (event.key === "textplex.themePatternOpacity") {
        const nextOpacity = Number(event.newValue);
        if (Number.isFinite(nextOpacity)) {
          applyAppThemePatternOpacity(nextOpacity);
        }
      }
      if (event.key === "textplex.themeGridEnabled") {
        applyAppThemeGridEnabled(event.newValue !== "off" && event.newValue !== "false");
      }
    };

    window.addEventListener("textplex-theme-change", handleThemeChange as EventListener);
    window.addEventListener("storage", handleStorage);

    return () => {
      active = false;
      window.removeEventListener("textplex-theme-change", handleThemeChange as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return <>{children}</>;
}
