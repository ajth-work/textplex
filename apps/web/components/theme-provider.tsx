"use client";

import { useEffect, type ReactNode } from "react";

import { fetchJson, type SettingsSurfaceResponse } from "../lib/textplex";
import {
  applyAppTheme,
  persistAppTheme,
  readStoredAppTheme,
  resolveAppThemeFromSettings,
  resolveAppTheme,
} from "../lib/theme";

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  useEffect(() => {
    let active = true;

    const initialTheme = readStoredAppTheme();
    applyAppTheme(initialTheme ?? "neutral");

    void fetchJson<SettingsSurfaceResponse>("/settings")
      .then((result) => {
        if (!active) {
          return;
        }
        const nextTheme = resolveAppThemeFromSettings(result.entries) ?? initialTheme ?? "neutral";
        persistAppTheme(nextTheme);
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
