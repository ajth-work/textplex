"use client";

import { useState } from "react";
import Link from "next/link";

import {
  appThemeLabels,
  appThemeOptions,
  persistAppTheme,
  type AppTheme,
} from "../lib/theme";
import { putJson, type SettingEntry, type SettingsSurfaceResponse, type SettingsUpdateRequest } from "../lib/textplex";

type GlobalThemePickerProps = {
  initialTheme: AppTheme;
  entries: SettingEntry[];
};

export function GlobalThemePicker({ initialTheme, entries }: GlobalThemePickerProps) {
  const [theme, setTheme] = useState<AppTheme>(initialTheme);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectTheme(nextTheme: AppTheme) {
    setTheme(nextTheme);
    setSaved(false);
    setError(null);
    persistAppTheme(nextTheme);
  }

  async function saveTheme() {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const nextEntries = [
        ...entries.filter((entry) => entry.key !== "theme"),
        { key: "theme", value: theme },
      ];
      await putJson<SettingsSurfaceResponse>("/settings", {
        entries: nextEntries,
      } satisfies SettingsUpdateRequest);
      persistAppTheme(theme);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the global theme.");
    } finally {
      setSaving(false);
    }
  }

  const selectedOption = appThemeOptions.find((option) => option.value === theme) ?? appThemeOptions[0];

  return (
    <article className="card feature-card global-theme-card">
      <div className="card-topline global-theme-card-topline">
        <div>
          <span className="eyebrow">Appearance</span>
          <h2>Global theme</h2>
        </div>
        <span className="pill">{appThemeLabels[theme]}</span>
      </div>
      <p className="global-theme-intro">
        Choose the visual language for Home, Library, Profile, Insights, Reader, and the rest of TextPlex. Reader typography and reading controls remain separate.
      </p>
      <div className="global-theme-browse">
        <div className="global-theme-grid" role="radiogroup" aria-label="Featured global app themes">
          {appThemeOptions.slice(0, 6).map((option) => (
            <button
              key={option.value}
              type="button"
              className={`global-theme-option ${theme === option.value ? "is-selected" : ""}`}
              onClick={() => selectTheme(option.value)}
              role="radio"
              aria-checked={theme === option.value}
            >
              <span className="global-theme-swatch" data-theme={option.value} aria-hidden="true" />
              <span className="global-theme-option-copy">
                <strong>{option.title}</strong>
                <span>{option.description}</span>
              </span>
            </button>
          ))}
        </div>
        <Link className="global-theme-shop-link" href="/profile/themes">
          <span className="eyebrow">Explore</span>
          <strong>Theme shop</strong>
          <span className="global-theme-shop-arrow" aria-hidden="true">→</span>
          <span className="small-copy">See every visual pack</span>
        </Link>
      </div>
      <div className="global-theme-footer">
        <p className="small-copy">
          Previewing <strong>{selectedOption.title}</strong>. Save it to make this your default across devices using this profile.
        </p>
        <button className="button button-primary" type="button" onClick={() => void saveTheme()} disabled={saving}>
          {saving ? "Saving theme..." : saved ? "Global theme saved" : "Save global theme"}
        </button>
      </div>
      {error ? <p className="small-copy global-theme-error">{error}</p> : null}
    </article>
  );
}
