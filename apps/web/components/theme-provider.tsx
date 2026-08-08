"use client";

import { useEffect, type ReactNode } from "react";

import { fetchJson, type SettingsSurfaceResponse } from "../lib/textplex";
import {
  applyAppTheme,
  applyAppThemeGridEnabled,
  applyAppThemePatternOpacity,
  applyAppThemePatternTiling,
  DEFAULT_APP_THEME_GRID_ENABLED,
  DEFAULT_APP_THEME_PATTERN_OPACITY,
  DEFAULT_APP_THEME_PATTERN_TILING,
  persistAppTheme,
  persistAppThemeGridEnabled,
  persistAppThemePatternOpacity,
  persistAppThemePatternTiling,
  persistAppThemeFollowSystem,
  readStoredAppTheme,
  readStoredAppThemeGridEnabled,
  readStoredAppThemeFollowSystem,
  readStoredAppThemePatternOpacity,
  readStoredAppThemePatternTiling,
  resolveAppThemeForScheme,
  resolveAppThemeFromSettings,
  resolveAppThemeFollowSystemFromSettings,
  resolveAppThemeGridEnabledFromSettings,
  resolveAppThemePatternOpacityFromSettings,
  resolveAppThemePatternTilingFromSettings,
  resolveAppTheme,
} from "../lib/theme";

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  useEffect(() => {
    let active = true;
    let cancelDeferredSync: (() => void) | null = null;

    const initialTheme = readStoredAppTheme();
    const initialFollowSystem = readStoredAppThemeFollowSystem() ?? false;
    const initialGridEnabled = readStoredAppThemeGridEnabled();
    const initialPatternOpacity = readStoredAppThemePatternOpacity();
    const initialPatternTiling = readStoredAppThemePatternTiling();

    const prefersDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applyResolvedTheme = (baseTheme: string | null | undefined, followSystem: boolean, broadcast = false) => {
      const resolvedTheme = followSystem ? resolveAppThemeForScheme(resolveAppTheme(baseTheme), prefersDarkQuery.matches) : resolveAppTheme(baseTheme);
      applyAppTheme(resolvedTheme);
      if (broadcast) {
        window.dispatchEvent(new CustomEvent("textplex-theme-change", { detail: { theme: resolvedTheme } }));
      }
    };

    applyResolvedTheme(initialTheme, initialFollowSystem);
    applyAppThemeGridEnabled(initialGridEnabled ?? DEFAULT_APP_THEME_GRID_ENABLED);
    applyAppThemePatternOpacity(initialPatternOpacity ?? DEFAULT_APP_THEME_PATTERN_OPACITY);
    applyAppThemePatternTiling(initialPatternTiling ?? DEFAULT_APP_THEME_PATTERN_TILING);

    const syncThemeSettings = () => {
      void fetchJson<SettingsSurfaceResponse>("/settings")
        .then((result) => {
          if (!active) {
            return;
          }
          const currentTheme = readStoredAppTheme();
          const currentFollowSystem = readStoredAppThemeFollowSystem();
          const currentGridEnabled = readStoredAppThemeGridEnabled();
          const currentPatternOpacity = readStoredAppThemePatternOpacity();
          const currentPatternTiling = readStoredAppThemePatternTiling();
          const nextTheme = resolveAppThemeFromSettings(result.entries) ?? currentTheme ?? initialTheme ?? "neutral";
          const nextFollowSystem = resolveAppThemeFollowSystemFromSettings(result.entries) ?? currentFollowSystem ?? initialFollowSystem;
          const nextGridEnabled = resolveAppThemeGridEnabledFromSettings(result.entries)
            ?? currentGridEnabled
            ?? initialGridEnabled
            ?? DEFAULT_APP_THEME_GRID_ENABLED;
          const nextPatternOpacity = resolveAppThemePatternOpacityFromSettings(result.entries)
            ?? currentPatternOpacity
            ?? initialPatternOpacity
            ?? DEFAULT_APP_THEME_PATTERN_OPACITY;
          const nextPatternTiling = resolveAppThemePatternTilingFromSettings(result.entries)
            ?? currentPatternTiling
            ?? initialPatternTiling
            ?? DEFAULT_APP_THEME_PATTERN_TILING;
          if (nextFollowSystem) {
            persistAppTheme(nextTheme);
            persistAppThemeFollowSystem(true);
          } else {
            persistAppThemeFollowSystem(false);
            persistAppTheme(nextTheme);
          }
          persistAppThemeGridEnabled(nextGridEnabled);
          persistAppThemePatternOpacity(nextPatternOpacity);
          persistAppThemePatternTiling(nextPatternTiling);

          applyResolvedTheme(nextTheme, nextFollowSystem);
        })
        .catch(() => {
          if (initialTheme) {
            applyResolvedTheme(initialTheme, initialFollowSystem);
          }
        });
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (idleWindow.requestIdleCallback) {
      const idleHandle = idleWindow.requestIdleCallback(() => {
        if (active) {
          syncThemeSettings();
        }
      }, { timeout: 2000 });
      cancelDeferredSync = () => {
        idleWindow.cancelIdleCallback?.(idleHandle);
      };
    } else {
      const timeoutId = window.setTimeout(() => {
        if (active) {
          syncThemeSettings();
        }
      }, 1500);
      cancelDeferredSync = () => {
        window.clearTimeout(timeoutId);
      };
    }

    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ theme?: string }>;
      applyResolvedTheme(customEvent.detail?.theme, readStoredAppThemeFollowSystem() ?? initialFollowSystem);
    };

    const handleThemeFollowSystemChange = () => {
      applyResolvedTheme(readStoredAppTheme(), readStoredAppThemeFollowSystem() ?? false, true);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null) {
        return;
      }
      if (event.key === "textplex.theme" || event.key === "textplex.readerTheme") {
        applyResolvedTheme(event.newValue, readStoredAppThemeFollowSystem() ?? initialFollowSystem);
      }
      if (event.key === "textplex.themePatternOpacity") {
        const nextOpacity = Number(event.newValue);
        if (Number.isFinite(nextOpacity)) {
          applyAppThemePatternOpacity(nextOpacity);
        }
      }
      if (event.key === "textplex.themePatternTiling") {
        applyAppThemePatternTiling(event.newValue === "on");
      }
      if (event.key === "textplex.themeGridEnabled") {
        applyAppThemeGridEnabled(event.newValue !== "off" && event.newValue !== "false");
      }
      if (event.key === "textplex.themeFollowSystem") {
        applyResolvedTheme(readStoredAppTheme(), event.newValue !== null && event.newValue !== "off" && event.newValue !== "false", true);
      }
    };

    const handleSystemThemeChange = () => {
      if (readStoredAppThemeFollowSystem() ?? false) {
        applyResolvedTheme(readStoredAppTheme(), true, true);
      }
    };

    window.addEventListener("textplex-theme-change", handleThemeChange as EventListener);
    window.addEventListener("textplex-theme-follow-system-change", handleThemeFollowSystemChange as EventListener);
    window.addEventListener("storage", handleStorage);
    prefersDarkQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      active = false;
      cancelDeferredSync?.();
      window.removeEventListener("textplex-theme-change", handleThemeChange as EventListener);
      window.removeEventListener("textplex-theme-follow-system-change", handleThemeFollowSystemChange as EventListener);
      window.removeEventListener("storage", handleStorage);
      prefersDarkQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  return <>{children}</>;
}
