"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";

import { RoutePage } from "./route-page";
import { AdminSubnav } from "./admin-subnav";
import {
  fetchJson,
  postJson,
  putJson,
  type ThemeAdminRecord,
  type ThemeAdminResponse,
  type ThemeAdminUpsertRequest,
  type ThemeAiSuggestResponse,
} from "../lib/textplex";

const COLOR_TOKEN_KEYS = [
  "bg", "bg-soft", "panel", "panel-strong", "ink", "ink-soft", "line",
  "accent", "accent-strong", "accent-soft", "focus", "positive", "warning",
  "danger", "text", "card-text", "muted", "card-muted", "border", "reader-text",
  "reader-selected",
];

const SURFACE_TOKEN_KEYS = [
  "app-page-bg", "app-glow-a", "app-glow-b", "app-glow-c", "app-grid-line",
  "hero-meta-bg", "surface-soft", "surface-strong", "surface-border", "shadow",
  "button-secondary-bg", "button-secondary-border", "button-secondary-color",
  "input-bg", "input-color", "app-pattern-image", "app-pattern-wash",
];

const DEFAULT_TOKENS: Record<string, string> = {
  bg: "#eef0f2",
  "bg-soft": "#ffffff",
  panel: "rgba(255, 255, 255, 0.98)",
  "panel-strong": "#f8f9fa",
  ink: "#111318",
  "ink-soft": "#5b616b",
  line: "rgba(17, 19, 24, 0.14)",
  accent: "#6f7680",
  "accent-strong": "#4b515a",
  "accent-soft": "rgba(111, 118, 128, 0.14)",
  "app-page-bg": "linear-gradient(180deg, #ffffff 0%, #e7eaed 100%)",
  "hero-meta-bg": "#ffffff",
  "surface-soft": "rgba(17, 19, 24, 0.05)",
  "surface-strong": "rgba(255, 255, 255, 0.84)",
  "surface-border": "rgba(17, 19, 24, 0.1)",
  "button-secondary-bg": "rgba(255, 255, 255, 0.78)",
  "button-secondary-border": "rgba(17, 19, 24, 0.16)",
  "button-secondary-color": "#111318",
  "input-bg": "rgba(255, 255, 255, 0.84)",
  "input-color": "#111318",
  text: "#111318",
  "card-text": "#111318",
  muted: "#5b616b",
  "card-muted": "#5b616b",
  border: "rgba(17, 19, 24, 0.14)",
  focus: "#6f7680",
  positive: "#3f8b62",
  warning: "#b17c2d",
  danger: "#a74848",
  "reader-text": "#111318",
  "reader-selected": "rgba(111, 118, 128, 0.16)",
};

type ThemeDraft = ThemeAdminUpsertRequest;

function emptyDraft(): ThemeDraft {
  return {
    id: "new-theme",
    title: "New Theme",
    description: "A new reading atmosphere.",
    price_cents: 0,
    is_free: true,
    preview_available: true,
    sort_order: 999,
    color_scheme: "light",
    tokens: { ...DEFAULT_TOKENS },
    pattern_image: null,
  };
}

function toDraft(theme: ThemeAdminRecord): ThemeDraft {
  return {
    id: theme.id,
    title: theme.title,
    description: theme.description,
    price_cents: theme.price_cents,
    is_free: theme.is_free,
    preview_available: theme.preview_available,
    sort_order: theme.sort_order,
    color_scheme: theme.color_scheme ?? "light",
    tokens: { ...DEFAULT_TOKENS, ...theme.tokens },
    pattern_image: theme.pattern_image,
  };
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function hexToHsl(value: string): [number, number, number] | null {
  if (!isHexColor(value)) {
    return null;
  }
  const red = Number.parseInt(value.slice(1, 3), 16) / 255;
  const green = Number.parseInt(value.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(value.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) {
    return [0, 0, lightness];
  }
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;
  if (max === red) {
    hue = (green - blue) / delta + (green < blue ? 6 : 0);
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }
  return [hue / 6, saturation, lightness];
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const hueToRgb = (p: number, q: number, t: number) => {
    let next = t;
    if (next < 0) next += 1;
    if (next > 1) next -= 1;
    if (next < 1 / 6) return p + (q - p) * 6 * next;
    if (next < 1 / 2) return q;
    if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6;
    return p;
  };
  if (saturation === 0) {
    const grey = Math.round(lightness * 255).toString(16).padStart(2, "0");
    return `#${grey}${grey}${grey}`;
  }
  const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const red = Math.round(hueToRgb(p, q, hue + 1 / 3) * 255).toString(16).padStart(2, "0");
  const green = Math.round(hueToRgb(p, q, hue) * 255).toString(16).padStart(2, "0");
  const blue = Math.round(hueToRgb(p, q, hue - 1 / 3) * 255).toString(16).padStart(2, "0");
  return `#${red}${green}${blue}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read that image."));
    reader.readAsDataURL(file);
  });
}

function tokenLabel(key: string): string {
  return key.replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function ColorTokenControl({
  tokenKey,
  value,
  onChange,
}: Readonly<{ tokenKey: string; value: string; onChange: (value: string) => void }>) {
  const hsl = hexToHsl(value);
  return (
    <div className="theme-editor-token-control">
      <div className="theme-editor-token-heading">
        <label htmlFor={`theme-token-${tokenKey}`}>{tokenLabel(tokenKey)}</label>
        <code>{tokenKey}</code>
      </div>
      <div className="theme-editor-color-row">
        {hsl ? (
          <input
            aria-label={`${tokenLabel(tokenKey)} color picker`}
            className="theme-editor-color-picker"
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : null}
        <input
          id={`theme-token-${tokenKey}`}
          className="theme-editor-token-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {hsl ? (
        <label className="theme-editor-range-label">
          Brightness
          <input
            type="range"
            min="5"
            max="95"
            value={Math.round(hsl[2] * 100)}
            onChange={(event) => onChange(hslToHex(hsl[0], hsl[1], Number(event.target.value) / 100))}
          />
        </label>
      ) : null}
    </div>
  );
}

function ThemePreview({ draft, referenceImageUrl }: Readonly<{ draft: ThemeDraft; referenceImageUrl: string | null }>) {
  const tokens = draft.tokens;
  const previewStyle = {
    "--theme-preview-page": tokens["app-page-bg"] || tokens.bg,
    "--theme-preview-panel": tokens.panel || tokens["bg-soft"],
    "--theme-preview-ink": tokens.text || tokens.ink,
    "--theme-preview-muted": tokens.muted || tokens["ink-soft"],
    "--theme-preview-accent": tokens.accent,
    "--theme-preview-border": tokens.border || tokens.line,
    "--theme-preview-pattern": referenceImageUrl ? `url("${referenceImageUrl}")` : tokens["app-pattern-image"] || "none",
  } as CSSProperties;

  return (
    <section className="theme-editor-preview-card" style={previewStyle} data-inventory-id="admin-theme.preview">
      <div className="theme-editor-preview-art" aria-hidden="true" />
      <div className="theme-editor-preview-content">
        <span className="eyebrow">{draft.color_scheme} reading atmosphere</span>
        <h2>{draft.title || "Untitled theme"}</h2>
        <p>{draft.description || "Add a description to see the theme story here."}</p>
        <div className="theme-editor-preview-reader">
          <strong>你好，reader</strong>
          <span>Read with calm contrast and room for context.</span>
          <button type="button">Primary action</button>
        </div>
      </div>
    </section>
  );
}

export function AdminThemeConsole() {
  const [themes, setThemes] = useState<ThemeAdminRecord[]>([]);
  const [draft, setDraft] = useState<ThemeDraft>(() => emptyDraft());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [referenceImageData, setReferenceImageData] = useState<string | null>(null);
  const [conceptPrompt, setConceptPrompt] = useState("");
  const [designNotes, setDesignNotes] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchJson<ThemeAdminResponse>("/admin/themes")
      .then((response) => {
        if (!active) return;
        setThemes(response.themes);
        const first = response.themes[0];
        if (first) {
          setSelectedId(first.id);
          setDraft(toDraft(first));
        }
      })
      .catch(() => active && setError("Theme administration requires an authenticated admin account."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const customTokenKeys = useMemo(
    () => Object.keys(draft.tokens).filter((key) => !COLOR_TOKEN_KEYS.includes(key) && !SURFACE_TOKEN_KEYS.includes(key)),
    [draft.tokens],
  );

  function updateDraft<K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) {
    setDraft((current: ThemeDraft) => ({ ...current, [key]: value }));
  }

  function updateToken(key: string, value: string) {
    setDraft((current: ThemeDraft) => ({ ...current, tokens: { ...current.tokens, [key]: value } }));
  }

  function selectTheme(theme: ThemeAdminRecord) {
    setSelectedId(theme.id);
    setDraft(toDraft(theme));
    setReferenceImageUrl(null);
    setReferenceImageData(null);
    setDesignNotes(null);
    setMessage(null);
  }

  function startNewTheme() {
    setSelectedId(null);
    setDraft(emptyDraft());
    setReferenceImageUrl(null);
    setReferenceImageData(null);
    setDesignNotes(null);
    setMessage(null);
  }

  async function handleReferenceImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 6 * 1024 * 1024) {
      setError("Choose a PNG, JPEG, or WebP image smaller than 6 MB.");
      return;
    }
    try {
      setReferenceImageUrl(URL.createObjectURL(file));
      setReferenceImageData(await readFileAsDataUrl(file));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to read that image.");
    }
  }

  async function requestSuggestion() {
    if (!conceptPrompt.trim()) {
      setError("Describe the theme concept before asking for an AI suggestion.");
      return;
    }
    setSuggesting(true);
    setError(null);
    setMessage(null);
    try {
      const suggestion = await postJson<ThemeAiSuggestResponse>("/admin/themes/ai-suggest", {
        prompt: conceptPrompt,
        image_data_url: referenceImageData,
        current_theme: draft,
      });
      setDraft((current: ThemeDraft) => ({
        ...current,
        title: suggestion.title,
        description: suggestion.description,
        color_scheme: suggestion.color_scheme,
        tokens: { ...current.tokens, ...suggestion.tokens },
      }));
      setDesignNotes(suggestion.design_notes);
      setMessage("AI suggestion applied to the draft. Review it before saving.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "AI theme suggestion failed.");
    } finally {
      setSuggesting(false);
    }
  }

  async function saveTheme() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = selectedId
        ? await putJson<ThemeAdminRecord>(`/admin/themes/${encodeURIComponent(draft.id)}`, draft)
        : await postJson<ThemeAdminRecord>("/admin/themes", draft);
      setThemes((current) => {
        const next = current.filter((theme) => theme.id !== saved.id);
        return [...next, saved].sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id));
      });
      setSelectedId(saved.id);
      setDraft(toDraft(saved));
      setMessage(`Saved ${saved.title}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Theme could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div data-inventory-id="admin-theme.page">
      <AdminSubnav />
      <RoutePage
      eyebrow="Admin"
      title="Theme console"
      description="Shape a reading atmosphere, test it in context, and keep the saved theme data understandable enough to grow into a creator workflow later."
      badge="Admin only"
      className="admin-theme-page"
      metrics={[
        { label: "Catalog themes", value: String(themes.length) },
        { label: "Editing", value: draft.title || "New theme" },
        { label: "Mode", value: draft.color_scheme },
      ]}
      >
      {loading ? <section className="card feature-card" data-inventory-id="admin-theme.loading-state"><p>Loading the hosted theme catalog…</p></section> : null}
      {error ? <section className="card admin-theme-error" role="alert" data-inventory-id="admin-theme.error-state"><strong>Theme console needs attention</strong><p>{error}</p></section> : null}
      {message ? <p className="admin-theme-message" role="status">{message}</p> : null}

      {!loading && !error ? (
        <div className="admin-theme-layout">
          <aside className="card admin-theme-list" data-inventory-id="admin-theme.list">
            <div className="card-topline">
              <div>
                <span className="eyebrow">Catalog</span>
                <h2>Themes</h2>
              </div>
              <button className="button button-primary" type="button" onClick={startNewTheme}>New</button>
            </div>
            <div className="admin-theme-list-items">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`admin-theme-list-item${selectedId === theme.id ? " is-selected" : ""}`}
                  onClick={() => selectTheme(theme)}
                >
                  <span className="admin-theme-list-swatch" style={{ background: theme.tokens["app-page-bg"] || theme.tokens.bg || "#ddd" }} aria-hidden="true" />
                  <span>
                    <strong>{theme.title}</strong>
                    <small>{theme.id}</small>
                  </span>
                  <span className="pill">{theme.is_free ? "Free" : `$${(theme.price_cents / 100).toFixed(2)}`}</span>
                </button>
              ))}
            </div>
          </aside>

          <div className="admin-theme-main">
            <section className="card admin-theme-editor" data-inventory-id="admin-theme.editor">
              <div className="card-topline">
                <div>
                  <span className="eyebrow">Theme definition</span>
                  <h2>{selectedId ? "Edit theme" : "Create theme"}</h2>
                </div>
                <button className="button button-primary" type="button" disabled={saving} onClick={() => void saveTheme()}>
                  {saving ? "Saving…" : "Save theme"}
                </button>
              </div>

              <div className="admin-theme-form-grid">
                <label>Theme ID<input value={draft.id} disabled={Boolean(selectedId)} onChange={(event) => updateDraft("id", event.target.value)} /></label>
                <label>Title<input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} /></label>
                <label className="admin-theme-form-wide">Description<textarea rows={3} value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} /></label>
                <label>Price in cents<input type="number" min="0" value={draft.price_cents} onChange={(event) => updateDraft("price_cents", Number(event.target.value) || 0)} /></label>
                <label>Sort order<input type="number" min="0" value={draft.sort_order} onChange={(event) => updateDraft("sort_order", Number(event.target.value) || 0)} /></label>
                <label>Color scheme<select value={draft.color_scheme} onChange={(event) => updateDraft("color_scheme", event.target.value as ThemeDraft["color_scheme"])}><option value="light">Light / daylight</option><option value="dark">Dark / night</option></select></label>
                <label>Pattern image path<input placeholder="/themes/example-v1.jpg" value={draft.pattern_image ?? ""} onChange={(event) => updateDraft("pattern_image", event.target.value || null)} /></label>
                <label className="admin-theme-check"><input type="checkbox" checked={draft.is_free} onChange={(event) => updateDraft("is_free", event.target.checked)} /> Free theme</label>
                <label className="admin-theme-check"><input type="checkbox" checked={draft.preview_available} onChange={(event) => updateDraft("preview_available", event.target.checked)} /> Preview available</label>
              </div>
            </section>

            <section className="card admin-theme-ai" data-inventory-id="admin-theme.ai-assistant">
              <div className="card-topline">
                <div>
                  <span className="eyebrow">Assisted design</span>
                  <h2>Describe the atmosphere</h2>
                </div>
                <span className="pill">Review before save</span>
              </div>
              <p className="small-copy">Use a concept such as “Hong Kong daytime: harbor light, dense vertical energy, warm signage, and calm reading contrast.” Add a reference image when you want the suggestion to follow a particular visual direction.</p>
              <textarea rows={3} placeholder="Describe the theme you want to explore…" value={conceptPrompt} onChange={(event) => setConceptPrompt(event.target.value)} />
              <div className="admin-theme-ai-actions">
                <label className="button button-secondary theme-editor-upload"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void handleReferenceImage(event)} />{referenceImageUrl ? "Reference image selected" : "Add reference image"}</label>
                <button className="button button-primary" type="button" disabled={suggesting} onClick={() => void requestSuggestion()}>{suggesting ? "Designing…" : "Ask AI for a draft"}</button>
              </div>
              {designNotes ? <p className="theme-editor-design-notes"><strong>Design notes:</strong> {designNotes}</p> : null}
            </section>

            <ThemePreview draft={draft} referenceImageUrl={referenceImageUrl} />

            <section className="card admin-theme-tokens" data-inventory-id="admin-theme.color-controls">
              <div className="card-topline">
                <div>
                  <span className="eyebrow">Visual system</span>
                  <h2>Color and surface controls</h2>
                </div>
                <span className="small-copy">Native color picker + brightness control</span>
              </div>
              <div className="theme-editor-token-grid">
                {[...COLOR_TOKEN_KEYS, ...SURFACE_TOKEN_KEYS].map((key) => (
                  <ColorTokenControl key={key} tokenKey={key} value={draft.tokens[key] ?? ""} onChange={(value) => updateToken(key, value)} />
                ))}
              </div>
              {customTokenKeys.length > 0 ? (
                <div className="theme-editor-custom-tokens">
                  <h3>Additional tokens</h3>
                  {customTokenKeys.map((key) => <label key={key}>{tokenLabel(key)}<input value={draft.tokens[key]} onChange={(event) => updateToken(key, event.target.value)} /></label>)}
                </div>
              ) : null}
            </section>
          </div>
        </div>
      ) : null}
      </RoutePage>
    </div>
  );
}
