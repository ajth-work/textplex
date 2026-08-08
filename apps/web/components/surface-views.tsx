"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { RoutePage } from "./route-page";
import { useAuth } from "./auth-provider";
import { resolveAccountLabel } from "../lib/auth-display";
import {
  fetchJson,
  formatDateTime,
  fetchGeneratedArticlePromptDetails,
  postFormData,
  postJson,
  putJson,
  persistReaderSpeechVoiceGender,
  readStoredReaderSpeechVoiceGender,
  resolveReaderResumeHref,
  resolveReaderSpeechVoiceGender,
  type ActivityEvent,
  type ActivitySurfaceResponse,
  type BookAnalysisSurfaceResponse,
  type BookRecord,
  type ImportSurfaceResponse,
  type HostedProfileSurfaceResponse,
  type HostedProfileUpdateRequest,
  type GeneratedReaderArticlePromptDetails,
  type ProfileMigrationRequest,
  type ProfileMigrationResponse,
  type ProgressSurfaceResponse,
  type ProfileSurfaceResponse,
  type SearchSurfaceResponse,
  type LexiconLookupResponse,
  type SettingsSurfaceResponse,
  type SettingsUpdateRequest,
  type ReaderSpeechVoiceGender,
  type StudySurfaceResponse,
  type ThemeCatalogResponse,
} from "../lib/textplex";
import { GeneratedArticlePromptCard } from "./generated-article-prompt-card";
import {
  appThemeLabels,
  appThemeOptions,
  DEFAULT_APP_THEME_GRID_ENABLED,
  DEFAULT_APP_THEME_PATTERN_OPACITY,
  DEFAULT_APP_THEME_PATTERN_TILING,
  INDIVIDUAL_THEME_PRICE,
  persistAppTheme,
  persistAppThemeGridEnabled,
  persistAppThemePatternOpacity,
  persistAppThemePatternTiling,
  persistAppThemeFollowSystem,
  readStoredAppTheme,
  readStoredAppThemeGridEnabled,
  readStoredAppThemePatternOpacity,
  readStoredAppThemePatternTiling,
  readStoredAppThemeFollowSystem,
  resolveAppTheme,
  resolveAppThemeFromSettings,
  resolveAppThemeFollowSystemFromSettings,
  resolveAppThemeGridEnabledFromSettings,
  resolveAppThemePatternOpacityFromSettings,
  resolveAppThemePatternTilingFromSettings,
  themeBundles,
  type AppTheme,
} from "../lib/theme";
import {
  getThemeCatalogCategory,
  getThemeCatalogMode,
  getThemeWallpaperPath,
  getThemeWallpaperThumbnailPath,
  matchesThemeCatalogFilters,
  themeCatalogCategories,
  themeCatalogCollectionDescriptions,
  themeCatalogModes,
  type ThemeCatalogCategory,
  type ThemeCatalogMode,
} from "../lib/theme-catalog";
import { LoadingSkeleton } from "./loading-skeleton";
import { InventoryInspectorToggle } from "./inventory-inspector";
import { BuildFooterToggle } from "./build-footer";
import { GlobalThemePicker } from "./global-theme-picker";
import { HskSeriesChart } from "./hsk-series-chart";
import { ReadingProgressChart } from "./reading-progress-chart";
import { DueReviewChart } from "./due-review-chart";
import { StudyDueLanguageGroups } from "./study-due-language-groups";
import { StudyAxisRadarChart } from "./study-axis-radar-chart";

type LexicalEntryDetail = {
  pinyin: string | null;
  definition: string | null;
  hskLevel: string | null;
};

type ImportLanguageOption = {
  code: string;
  label: string;
};

const googleTranslatePricePerMillionCharacters = 10;
const translationConfirmationCharacterThreshold = 40000;

const importLanguageOptions: ImportLanguageOption[] = [
  { code: "zh", label: "Chinese" },
  { code: "ko", label: "Korean" },
  { code: "ja", label: "Japanese" },
  { code: "ru", label: "Russian" },
  { code: "he", label: "Hebrew" },
  { code: "ar", label: "Arabic" },
  { code: "yo", label: "Yoruba" },
];

function formatCurrencyUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type ActivityBookGroup = {
  bookId: string;
  title: string;
  latestActivityAt: string;
  latestReadAt: string | null;
  events: ActivityEvent[];
};

const readingActivityKinds = new Set<ActivityEvent["kind"]>(["page_read", "sentence_read", "reading_session"]);

function activityTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function groupActivityEvents(events: ActivityEvent[]): ActivityBookGroup[] {
  const groups = new Map<string, ActivityBookGroup>();

  for (const event of events) {
    const existing = groups.get(event.book_id);
    if (!existing) {
      groups.set(event.book_id, {
        bookId: event.book_id,
        title: event.title ?? event.book_id,
        latestActivityAt: event.occurred_at,
        latestReadAt: readingActivityKinds.has(event.kind) ? event.occurred_at : null,
        events: [event],
      });
      continue;
    }

    existing.events.push(event);
    if (activityTimestamp(event.occurred_at) > activityTimestamp(existing.latestActivityAt)) {
      existing.latestActivityAt = event.occurred_at;
    }
    if (readingActivityKinds.has(event.kind) && (!existing.latestReadAt || activityTimestamp(event.occurred_at) > activityTimestamp(existing.latestReadAt))) {
      existing.latestReadAt = event.occurred_at;
    }
  }

  return Array.from(groups.values()).sort((left, right) => {
    const leftTimestamp = activityTimestamp(left.latestReadAt ?? left.latestActivityAt);
    const rightTimestamp = activityTimestamp(right.latestReadAt ?? right.latestActivityAt);
    return rightTimestamp - leftTimestamp;
  });
}

export function ActivitySurfaceView() {
  const [data, setData] = useState<ActivitySurfaceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchJson<ActivitySurfaceResponse>("/activity?limit=24")
      .then((result) => {
        if (active) {
          setData(result);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load activity.");
        }
      });
    return () => {
      active = false;
    };
  }, []);
  const activityBookGroups = data ? groupActivityEvents(data.events) : [];
  return (
    <RoutePage
      eyebrow="Activity"
      title="Reading activity feed"
      description="Books and articles are ordered by the most recent reading activity, with their individual events available on demand."
      badge={data ? `${activityBookGroups.length} books` : "Live"}
      links={[
        { href: "/progress", label: "Progress" },
        { href: "/study", label: "Study" },
      ]}
      metrics={[
        { label: "Reading days", value: data ? String(data.reading_history.length) : "Loading" },
        { label: "Events", value: data ? String(data.event_count) : "Loading" },
        { label: "State", value: error ? "Error" : data ? "Loaded" : "Loading", detail: error ?? "Derived from learner events" },
      ]}
    >
      {error ? <section className="card feature-card">{error}</section> : null}
      {!data && !error ? <LoadingSkeleton label="Loading activity" /> : null}
      {data ? (
        <>
          <section className="feature-grid activity-progress-grid" aria-label="Reading progress over time">
            <ReadingProgressChart
              inventoryId="activity.pages-progress-chart"
              title="Pages read over time"
              description="Cumulative pages completed across multi-page books."
              points={data.reading_history}
              metric="pages"
              emptyMessage="Page progress appears after a multi-page book is read."
            />
            <ReadingProgressChart
              inventoryId="activity.sentences-progress-chart"
              title="Sentences read over time"
              description="Cumulative sentences completed across books and articles."
              points={data.reading_history}
              metric="sentences"
              emptyMessage="Sentence progress appears after a sentence is completed."
            />
          </section>
          <section className="card feature-card" data-inventory-id="activity.recent-events-card">
          <h2>Recently read</h2>
          <p className="small-copy">Open a book or article to see its reading events.</p>
          <div className="activity-book-list" data-inventory-id="activity.recent-books-list">
            {activityBookGroups.map((group) => (
              <details key={group.bookId} className="activity-book-group" data-inventory-id="activity.recent-book-group">
                <summary className="activity-book-summary">
                  <span className="activity-book-summary-copy">
                    <strong>{group.title}</strong>
                    <span className="small-copy">Last read {formatDateTime(group.latestReadAt ?? group.latestActivityAt)}</span>
                  </span>
                  <span className="pill">{group.events.length} events</span>
                </summary>
                <div className="surface-list" data-inventory-id="activity.event-list">
                  {group.events.map((event, index) => (
                    <article key={`${event.kind}-${event.occurred_at}-${event.book_id}-${event.page_number ?? "na"}-${index}`} className="surface-list-item" data-inventory-id="activity.event-item">
                      <div className="card-topline">
                        <strong>{event.kind.replaceAll("_", " ")}</strong>
                        <span className="muted">{formatDateTime(event.occurred_at)}</span>
                      </div>
                      <p>{event.detail}</p>
                    </article>
                  ))}
                </div>
              </details>
            ))}
          </div>
          </section>
        </>
      ) : null}
    </RoutePage>
  );
}

export function AnalysisSurfaceView({ bookId }: { bookId: string }) {
  const [data, setData] = useState<BookAnalysisSurfaceResponse | null>(null);
  const [generationDetails, setGenerationDetails] = useState<GeneratedReaderArticlePromptDetails | null>(null);
  const [generationLoading, setGenerationLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lexicalEntryDetails, setLexicalEntryDetails] = useState<Record<string, LexicalEntryDetail>>({});
  const [lexicalEntryLoading, setLexicalEntryLoading] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchJson<BookAnalysisSurfaceResponse>(`/analysis/${bookId}`)
      .then((result) => {
        if (active) {
          setData(result);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load analysis.");
        }
      });
    void fetchGeneratedArticlePromptDetails(bookId)
      .then((result) => {
        if (active) {
          setGenerationDetails(result);
        }
      })
      .catch(() => {
        if (active) {
          setGenerationDetails(null);
        }
      })
      .finally(() => {
        if (active) {
          setGenerationLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [bookId]);

  useEffect(() => {
    if (!data?.top_lexical_entries.length) {
      setLexicalEntryDetails({});
      setLexicalEntryLoading(false);
      return;
    }

    let active = true;
    setLexicalEntryLoading(true);
    setLexicalEntryDetails({});

    void Promise.allSettled(
      data.top_lexical_entries.map(async (entry) => {
        const response = await fetchJson<LexiconLookupResponse>(
          `/lexicon/lookup?language_code=${encodeURIComponent(data.language_code)}&term=${encodeURIComponent(entry.lemma)}`,
        );
        const match = response.entries.find((candidate) => candidate.surface_form === entry.lemma || candidate.surface_form === entry.display_form) ?? response.entries[0] ?? null;
        return {
          lemma: entry.lemma,
          detail: match
            ? {
                pinyin: match.pinyin ?? null,
                definition: match.definition ?? null,
                hskLevel: match.hsk_level ?? null,
              }
            : null,
        };
      }),
    ).then((results) => {
      if (!active) {
        return;
      }

      const nextDetails: Record<string, LexicalEntryDetail> = {};
      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value.detail) {
          nextDetails[result.value.lemma] = result.value.detail;
        }
      });
      setLexicalEntryDetails(nextDetails);
      setLexicalEntryLoading(false);
    });

    return () => {
      active = false;
    };
  }, [data?.language_code, data?.top_lexical_entries]);

  return (
    <RoutePage
      eyebrow="Analysis"
      title={data?.title ?? "Text analysis summary"}
      description="Difficulty, vocabulary density, and extracted frequency data for the selected book."
      badge={data ? `${data.sentence_count} sentences` : bookId}
      links={[
        { href: "/library", label: "Library" },
        { href: data ? resolveReaderResumeHref(bookId, null) : "/library", label: "Reader" },
      ]}
      metrics={[
        { label: "Extraction", value: data ? `${data.extraction_progress_percent}%` : "Loading" },
        { label: "Expected level", value: data?.metrics.text_expected_level_label ?? "Unavailable" },
        { label: "Lexical entries", value: data ? String(data.lexical_entry_count) : "Loading" },
        { label: "Tokens", value: data ? String(data.token_occurrence_count) : "Loading" },
      ]}
    >
      {error ? <section className="card feature-card">{error}</section> : null}
      {!data && !error ? <LoadingSkeleton label="Loading analysis" /> : null}
          {data ? (
        <>
          <section className="feature-grid">
            <article className="card feature-card" data-inventory-id="analysis.lexical-entries-card">
              <h2>Top lexical entries</h2>
              <p className="small-copy">Compact lexical cards show the form, pronunciation, meaning, HSK band, and page exposure context.</p>
              <div className="analysis-lexical-grid">
                {data.top_lexical_entries.map((entry) => (
                  <article key={entry.lemma} className="analysis-lexical-card">
                    <div className="analysis-lexical-card-topline">
                      <div className="analysis-lexical-headline">
                        <strong>{entry.display_form}</strong>
                        <span className="analysis-lexical-pronunciation">
                          {lexicalEntryDetails[entry.lemma]?.pinyin ? `(${lexicalEntryDetails[entry.lemma]?.pinyin})` : lexicalEntryLoading ? " " : ""}
                        </span>
                      </div>
                      <span className="analysis-lexical-frequency">{entry.frequency_in_book}x</span>
                    </div>
                    <p className="analysis-lexical-definition">
                      {lexicalEntryDetails[entry.lemma]?.definition ?? (lexicalEntryLoading ? "Loading meaning…" : "Meaning unavailable.")}
                    </p>
                    <div className="analysis-lexical-meta-row">
                      {lexicalEntryDetails[entry.lemma]?.hskLevel ? (
                        <span className="pill analysis-lexical-hsk-pill">
                          HSK {lexicalEntryDetails[entry.lemma]?.hskLevel}
                        </span>
                      ) : null}
                      <span className="analysis-lexical-meta-chip">
                        First page <strong>{entry.first_page ?? "—"}</strong>
                      </span>
                      <span className="analysis-lexical-meta-chip">
                        Last page <strong>{entry.last_page && entry.last_page !== entry.first_page ? entry.last_page : "—"}</strong>
                      </span>
                      <span className="analysis-lexical-meta-chip">
                        Pages <strong>{entry.first_page && entry.last_page ? Math.max(1, entry.last_page - entry.first_page + 1) : 1}</strong>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </article>
            <article className="card feature-card" data-inventory-id="analysis.summary-card">
              <h2>Difficulty and coverage</h2>
              <p>Book: {data.book_id}</p>
              <p>Language: {data.language_code}</p>
              <p>Status: {data.has_extraction ? "Extraction available" : "No extraction yet"}</p>
              <p>Sentence average: {data.metrics.text_expected_level_label ?? "Not available"}</p>
              <p>Character-weighted average: {data.metrics.character_weighted_average_level ?? "Not available"}</p>
              <p>
                Character evidence: {data.metrics.known_character_count}/{data.metrics.eligible_character_count} known
                {data.metrics.unknown_character_count ? `; ${data.metrics.unknown_character_count} unknown` : ""}
              </p>
              <p>Comprehension: Not available from book text alone.</p>
              <p className="small-copy">{data.metrics.recommendation}</p>
            </article>
          </section>
          <GeneratedArticlePromptCard
            inventoryId="analysis.generation-prompt-card"
            details={generationDetails}
            loading={generationLoading}
            title="Generated article prompt"
            description="The saved generation request shows the exact learner-window terms and controls that produced this article."
          />
          <section className="feature-grid" aria-label="HSK progression charts">
            <HskSeriesChart
              inventoryId="analysis.sentence-hsk-chart"
              title="HSK average by sentence"
              description="One point for each extracted sentence with known HSK character evidence."
              points={data.sentence_hsk_series}
              emptyMessage={data.has_extraction ? "No sentence-level HSK evidence is available." : "Sentence chart will appear after extraction completes."}
            />
            <HskSeriesChart
              inventoryId="analysis.page-hsk-chart"
              title="HSK average by page"
              description="One point for each extracted page with sentence-level HSK evidence."
              points={data.page_hsk_series}
              emptyMessage={data.has_extraction ? "No page-level HSK evidence is available." : "Page chart will appear after extraction completes."}
            />
          </section>
        </>
      ) : null}
    </RoutePage>
  );
}

export function ImportSurfaceView() {
  const [data, setData] = useState<ImportSurfaceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"paste" | "upload">("paste");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [languageCode, setLanguageCode] = useState("zh");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [activeBook, setActiveBook] = useState<BookRecord | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [translationMode, setTranslationMode] = useState<"on-demand" | "preload">("on-demand");
  const [showTranslationConfirm, setShowTranslationConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void fetchJson<ImportSurfaceResponse>("/import")
      .then((result) => {
        if (active) {
          setData(result);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load import surface.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const activeBookId = activeBook?.id;
    if (!activeBookId || activeBook.extraction_status === "complete" || activeBook.status === "extracted") {
      return;
    }

    let active = true;
    const refresh = async () => {
      try {
        const book = await fetchJson<BookRecord>(`/books/${activeBookId}`);
        if (active) {
          setActiveBook(book);
          if (book.extraction_status === "complete" || book.status === "extracted") {
            setActionMessage("Import complete. The reader is ready.");
          }
        }
      } catch (err) {
        if (active) {
          setActionError(err instanceof Error ? err.message : "Unable to refresh import progress.");
        }
      }
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), 1500);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [activeBook?.id, activeBook?.extraction_status, activeBook?.status]);

  const draftText = text.trim();
  const draftCharacterCount = mode === "paste" ? Array.from(draftText).length : 0;
  const draftWordCount = mode === "paste" ? draftText.split(/\s+/).filter(Boolean).length : 0;
  const draftTranslationCost = (draftCharacterCount / 1_000_000) * googleTranslatePricePerMillionCharacters;
  const translationConfirmationRequired =
    mode === "paste" &&
    translationMode === "preload" &&
    draftCharacterCount >= translationConfirmationCharacterThreshold;

  useEffect(() => {
    if (!translationConfirmationRequired) {
      setShowTranslationConfirm(false);
    }
  }, [translationConfirmationRequired]);

  const runImport = async () => {
    setActionError(null);
    setActionMessage(null);
    setSubmitting(true);

    try {
      let book: BookRecord;
      if (mode === "paste") {
        if (!draftText) {
          throw new Error("Paste or type text before processing it.");
        }
        book = await postJson<BookRecord>("/texts/import", {
          text: draftText,
          language_code: languageCode,
          title: title.trim() || null,
          author: author.trim() || null,
          translation_mode: translationMode === "preload" ? "preload" : "off",
        });
      } else {
        if (!file) {
          throw new Error("Choose a PDF before uploading it.");
        }
        if (!file.name.toLowerCase().endsWith(".pdf")) {
          throw new Error("TextPlex currently accepts PDF uploads only.");
        }
        const formData = new FormData();
        formData.append("file", file);
        formData.append("language_code", languageCode);
        formData.append("translation_mode", translationMode === "preload" ? "preload" : "off");
        if (title.trim()) formData.append("title", title.trim());
        if (author.trim()) formData.append("author", author.trim());
        book = await postFormData<BookRecord>("/books/upload", formData);
      }

      setActiveBook(book);
      setActionMessage(
        book.extraction_status === "complete" || book.status === "extracted"
          ? "Import complete. The reader is ready."
          : "Upload received. TextPlex is extracting the book in the background.",
      );
      setText("");
      setFile(null);
      setShowTranslationConfirm(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      const refreshed = await fetchJson<ImportSurfaceResponse>("/import");
      setData(refreshed);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to import this content.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (translationConfirmationRequired && !showTranslationConfirm) {
      setShowTranslationConfirm(true);
      setActionError(null);
      setActionMessage(
        `This paste is ${draftCharacterCount.toLocaleString()} characters. Preloading translation is estimated at ${formatCurrencyUsd(
          draftTranslationCost,
        )}. Confirm below to continue or switch to on-demand translation.`,
      );
      return;
    }
    await runImport();
  };

  const extractionTotal = activeBook?.extraction_total_pages ?? 0;
  const extractionProcessed = activeBook?.extraction_pages_processed ?? 0;
  const extractionPercent = extractionTotal > 0
    ? Math.min(100, Math.round((extractionProcessed / extractionTotal) * 100))
    : activeBook?.extraction_status === "complete" || activeBook?.status === "extracted" ? 100 : 0;

  return (
    <RoutePage
      eyebrow="Import"
      title="Paste text or upload a book"
      description="Live import metadata and entry points for books, pasted text, and future source types."
      badge={data?.default_language?.toUpperCase() ?? "Live"}
      links={[
        { href: "/library", label: "Library" },
        { href: "/progress", label: "Progress" },
      ]}
      metrics={[
        { label: "Inputs", value: data ? data.supported_inputs.join(", ") : "Loading" },
        { label: "Uploads", value: data ? (data.can_upload_pdf ? "Enabled" : "Disabled") : "Loading" },
        { label: "Paste", value: data ? (data.can_paste_text ? "Enabled" : "Disabled") : "Loading" },
      ]}
    >
      {error ? <section className="card feature-card">{error}</section> : null}
      {!data && !error ? <LoadingSkeleton label="Loading import details" /> : null}
      {data ? (
        <>
          <section className="card feature-card import-form-card">
            <div className="card-topline">
              <h2>Add content</h2>
              <span className="pill">{mode === "paste" ? "Paste" : "PDF"}</span>
            </div>
            <div className="button-row" aria-label="Import method">
              <button className={`button ${mode === "paste" ? "button-primary" : "button-secondary"}`} type="button" onClick={() => setMode("paste")}>
                Paste text
              </button>
              <button className={`button ${mode === "upload" ? "button-primary" : "button-secondary"}`} type="button" onClick={() => setMode("upload")}>
                Upload PDF
              </button>
            </div>
            <form className="surface-form" onSubmit={handleImport}>
                <div className="import-form-grid">
                  <label>
                    Title
                    <input className="text-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Optional title" />
                  </label>
                <label>
                  Author or source
                  <input className="text-input" value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Optional author" />
                </label>
                <label>
                  Language
                  <select className="text-input" value={languageCode} onChange={(event) => setLanguageCode(event.target.value)} required>
                    {importLanguageOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label} ({option.code.toUpperCase()})
                      </option>
                    ))}
                    </select>
                  </label>
                </div>
                <div className="import-translation-grid" aria-label="Translation planning summary">
                  <span className="pill">Characters {mode === "paste" ? draftCharacterCount.toLocaleString() : "—"}</span>
                  <span className="pill">Words {mode === "paste" ? draftWordCount.toLocaleString() : "—"}</span>
                  <span className="pill">GT est. {mode === "paste" ? formatCurrencyUsd(draftTranslationCost) : "After extraction"}</span>
                </div>
                <div className="button-row" aria-label="Translation mode">
                  <button
                    type="button"
                    className={`button ${translationMode === "on-demand" ? "button-primary" : "button-secondary"}`}
                    onClick={() => {
                      setTranslationMode("on-demand");
                      setShowTranslationConfirm(false);
                    }}
                  >
                    Translate on demand
                  </button>
                  <button
                    type="button"
                    className={`button ${translationMode === "preload" ? "button-primary" : "button-secondary"}`}
                    onClick={() => setTranslationMode("preload")}
                  >
                    Translate now
                  </button>
                </div>
                {mode === "paste" ? (
                  <label>
                    Article text
                    <textarea className="text-input import-textarea" value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste an article or passage here..." required />
                  </label>
                ) : (
                  <label>
                    PDF file
                    <input ref={fileInputRef} className="text-input" type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
                  </label>
                )}
                {actionError ? <p className="form-error" role="alert">{actionError}</p> : null}
                {actionMessage ? <p className="form-message" role="status">{actionMessage}</p> : null}
                {translationConfirmationRequired && showTranslationConfirm ? (
                  <section className="card import-confirmation-card">
                    <h3>Confirm translation preload</h3>
                    <p className="small-copy">
                      This paste is above the {translationConfirmationCharacterThreshold.toLocaleString()} character safety threshold. Preloading translation is
                      estimated at {formatCurrencyUsd(draftTranslationCost)} based on {draftCharacterCount.toLocaleString()} characters.
                    </p>
                    <div className="button-row">
                      <button className="button button-primary" type="button" onClick={() => void runImport()} disabled={submitting}>
                        {submitting ? "Working..." : "Confirm and translate now"}
                      </button>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => {
                          setTranslationMode("on-demand");
                          setShowTranslationConfirm(false);
                          setActionMessage("Switched to on-demand translation. The reader will translate sentences when opened.");
                        }}
                      >
                        Switch to on-demand
                      </button>
                    </div>
                  </section>
                ) : null}
                <button className="button button-primary" type="submit" disabled={submitting}>
                  {submitting ? "Processing..." : mode === "paste" ? "Process text" : "Upload and process"}
                </button>
              </form>
            </section>

          {activeBook ? (
            <section className="card feature-card import-progress-card" aria-live="polite">
              <div className="card-topline">
                <h2>{activeBook.title}</h2>
                <span className="pill">{activeBook.status.replaceAll("_", " ")}</span>
              </div>
              <p>{actionMessage ?? "Preparing import status..."}</p>
              <div className="import-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={extractionPercent}>
                <span style={{ width: `${extractionPercent}%` }} />
              </div>
              <p className="small-copy">
                {extractionTotal > 0 ? `${extractionProcessed} of ${extractionTotal} pages processed.` : activeBook.extraction_status === "complete" ? "Text is ready to read." : "Waiting for extraction progress..."}
              </p>
              {activeBook.extraction_status === "complete" || activeBook.status === "extracted" ? (
                <Link className="button button-secondary" href={resolveReaderResumeHref(activeBook.id, null)}>Open reader</Link>
              ) : null}
            </section>
          ) : null}

          <section className="card feature-card">
            <div className="card-topline">
              <h2>Recent books</h2>
              <Link className="text-link" href="/library">Library</Link>
            </div>
            <div className="surface-list">
              {data.recent_books.map((book) => (
                <article key={book.book_id} className="surface-list-item">
                  <div className="card-topline">
                    <Link href={`/books/${book.book_id}`}><strong>{book.title}</strong></Link>
                    <span className="muted">{book.status.replaceAll("_", " ")}</span>
                  </div>
                  <p className="small-copy">
                    {book.language_code.toUpperCase()} - Imported {formatDateTime(book.processed_at ?? book.created_at)}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </RoutePage>
  );
}

export function ProgressSurfaceView() {
  const [data, setData] = useState<ProgressSurfaceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchJson<ProgressSurfaceResponse>("/progress")
      .then((result) => {
        if (active) {
          setData(result);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load progress.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedTrack =
    data?.profile.learning_tracks.find((track) => track.code === data.profile.selected_track_code) ??
    data?.profile.learning_tracks[0] ??
    null;

  return (
    <RoutePage
      eyebrow="Progress"
      title="Reading and vocabulary progress"
      description="Session counts, exposure metrics, and book-level reading summaries from the local profile database."
      badge={data ? `${data.profile.active_books} books` : "Live"}
      links={[
        { href: "/study", label: "Study" },
        { href: "/activity", label: "Activity" },
      ]}
      metrics={[
        { label: "Sessions", value: data ? String(data.profile.reading_sessions) : "Loading" },
        { label: "Sentences", value: data ? String(data.profile.sentence_reads) : "Loading" },
        { label: "Vocabulary rows", value: data ? String(data.profile.vocabulary_progress_rows) : "Loading" },
      ]}
    >
      {error ? <section className="card feature-card">{error}</section> : null}
      {!data && !error ? <LoadingSkeleton label="Loading progress" /> : null}
      {data ? (
        <section className="feature-grid">
          <article className="card feature-card">
            <h2>Profile summary</h2>
            <p>Unique words: {data.profile.unique_words_seen}</p>
            <p>Unique characters: {data.profile.unique_characters_seen}</p>
            <p>Avg sec/word: {data.profile.average_seconds_per_word?.toFixed(2) ?? "—"}</p>
            <p>Avg sec/char: {data.profile.average_seconds_per_character?.toFixed(2) ?? "—"}</p>
          </article>
          {selectedTrack ? (
            <article className="card feature-card">
              <h2>Learning track</h2>
              <p>
                {selectedTrack.label} · {selectedTrack.level}
              </p>
              <p>{selectedTrack.subtitle}</p>
              <p>{selectedTrack.next_step}</p>
            </article>
          ) : null}
          <article className="card feature-card">
            <h2>Books</h2>
            <div className="surface-list">
              {data.books.map((book) => (
                <div key={book.book_id} className="surface-list-item">
                  <div className="card-topline">
                    <strong>{book.title}</strong>
                    <span className="muted">{book.active_seconds}s</span>
                  </div>
                  <p className="small-copy">
                    {book.page_reads} page reads - {book.sentence_reads} sentence reads
                  </p>
                  <p className="small-copy">State: {book.reading_state.replaceAll("_", " ")}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}
    </RoutePage>
  );
}

export function ProfileSurfaceView() {
  const { loading: authLoading, user: authenticatedUser } = useAuth();
  const [data, setData] = useState<ProfileSurfaceResponse | null>(null);
  const [hostedData, setHostedData] = useState<HostedProfileSurfaceResponse | null>(null);
  const [hostedError, setHostedError] = useState<string | null>(null);
  const [hostedDisplayName, setHostedDisplayName] = useState("");
  const [hostedSaving, setHostedSaving] = useState(false);
  const [migration, setMigration] = useState<ProfileMigrationResponse | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [migrationSaving, setMigrationSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchJson<ProfileSurfaceResponse>("/profile")
      .then((result) => {
        if (active) {
          setData(result);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load profile.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (authLoading || !authenticatedUser) {
      setHostedData(null);
      setHostedError(null);
      setMigration(null);
      setMigrationError(null);
      return undefined;
    }

    let active = true;
    void fetchJson<HostedProfileSurfaceResponse>("/profile/hosted")
      .then((result) => {
        if (active) {
          setHostedData(result);
          setHostedDisplayName(result.profile.display_name ?? "");
          setHostedError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setHostedError(err instanceof Error ? err.message : "Unable to load hosted profile.");
        }
      });
    return () => {
      active = false;
    };
  }, [authLoading, authenticatedUser]);

  useEffect(() => {
    if (authLoading || !authenticatedUser) {
      return undefined;
    }

    let active = true;
    void fetchJson<ProfileMigrationResponse>("/profile/migration")
      .then((result) => {
        if (active) {
          setMigration(result);
          setMigrationError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setMigrationError(err instanceof Error ? err.message : "Unable to check local profile migration.");
        }
      });
    return () => {
      active = false;
    };
  }, [authLoading, authenticatedUser]);

  async function migrateLocalProfile() {
    setMigrationSaving(true);
    try {
      const payload: ProfileMigrationRequest = { conflict_policy: "merge_non_destructive" };
      const result = await postJson<ProfileMigrationResponse>("/profile/migration", payload);
      setMigration(result);
      setMigrationError(null);
    } catch (err) {
      setMigrationError(err instanceof Error ? err.message : "Unable to migrate the local profile.");
    } finally {
      setMigrationSaving(false);
    }
  }

  async function saveHostedProfile() {
    setHostedSaving(true);
    try {
      const payload: HostedProfileUpdateRequest = { display_name: hostedDisplayName.trim() || null };
      const result = await putJson<HostedProfileSurfaceResponse>("/profile/hosted", payload);
      setHostedData(result);
      setHostedDisplayName(result.profile.display_name ?? "");
      setHostedError(null);
    } catch (err) {
      setHostedError(err instanceof Error ? err.message : "Unable to save hosted profile.");
    } finally {
      setHostedSaving(false);
    }
  }

  const settingsMap = new Map(data?.settings.entries.map((entry) => [entry.key, entry.value]) ?? []);
  const profilePreferenceEntries = data?.settings.entries.filter((entry) => entry.key !== "readerMode" && entry.key !== "readerTokenAudioOnTap") ?? [];
  const accountLabel = resolveAccountLabel(hostedData?.user ?? authenticatedUser);
  const selectedTrack =
    data?.profile.learning_tracks.find((track) => track.code === data.profile.selected_track_code) ??
    data?.profile.learning_tracks[0] ??
    null;

  return (
    <RoutePage
      eyebrow="Profile"
      title="User profile and reading history"
      description="Learner summary, progress history, and stored preferences from the local profile database."
      badge={data ? `${data.profile.active_books} books` : "Live"}
      links={[
        { href: "/progress", label: "Progress" },
        { href: "/settings", label: "Settings" },
      ]}
      metrics={[
        { label: "Sessions", value: data ? String(data.profile.reading_sessions) : "Loading" },
        { label: "Page reads", value: data ? String(data.profile.page_reads) : "Loading" },
        { label: "Sentence reads", value: data ? String(data.profile.sentence_reads) : "Loading" },
      ]}
    >
      {hostedError ? (
        <section className="card feature-card" data-inventory-id="profile.hosted-account-card">
          <h2>Hosted account</h2>
          <p className="small-copy">{hostedError}</p>
        </section>
      ) : null}
      {hostedData ? (
        <section className="card feature-card" data-inventory-id="profile.hosted-account-card">
          <h2>Hosted account</h2>
          <p>Hello, {accountLabel}</p>
          <p className="small-copy">
            Signed in as {hostedData.user.email ?? hostedData.user.id}. This account owns the hosted profile, imports, and saved settings.
          </p>
          <label>
            Display name
            <input className="text-input" value={hostedDisplayName} onChange={(event) => setHostedDisplayName(event.target.value)} />
          </label>
          <button className="button button-secondary" type="button" onClick={() => void saveHostedProfile()} disabled={hostedSaving}>
            {hostedSaving ? "Saving..." : "Save hosted profile"}
          </button>
          <p className="small-copy">
            {hostedData.profile.target_language} · {hostedData.profile.learning_track} · {hostedData.profile.proficiency_level ?? "Level not set"}
          </p>
          <p className="small-copy">Hosted settings: {hostedData.settings.length}</p>
        </section>
      ) : null}
      {authenticatedUser ? (
        <section className="card feature-card" data-inventory-id="profile.migration-card">
          <h2>Local profile migration</h2>
          <p className="small-copy">Use this to merge the anonymous local profile into this account and turn your seeded test data into user zero.</p>
          {migrationError ? <p className="small-copy">{migrationError}</p> : null}
          {!migration && !migrationError ? <LoadingSkeleton label="Checking local profile migration" /> : null}
          {migration ? (
            <>
              <p>{migration.message}</p>
              <p className="small-copy">
                Anonymous rows: {Object.values(migration.source_counts).reduce((sum, count) => sum + count, 0)} · Account rows: {Object.values(migration.target_counts).reduce((sum, count) => sum + count, 0)}
              </p>
              {migration.status === "ready" ? (
                <button className="button button-primary" type="button" onClick={() => void migrateLocalProfile()} disabled={migrationSaving}>
                  {migrationSaving ? "Migrating..." : "Merge local profile"}
                </button>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}
      {error ? <section className="card feature-card">{error}</section> : null}
      {!data && !error ? <LoadingSkeleton label="Loading profile" /> : null}
      {data ? (
        <section className="feature-grid">
          <article className="card feature-card">
            <h2>Learning summary</h2>
            <p>Unique words: {data.profile.unique_words_seen}</p>
            <p>Unique characters: {data.profile.unique_characters_seen}</p>
            <p>Today&apos;s sentence reads: {data.profile.today_sentence_reads}</p>
            <p>Today&apos;s token exposures: {data.profile.today_token_exposures}</p>
            <p>Avg sec/sentence: {data.profile.average_seconds_per_sentence?.toFixed(2) ?? "—"}</p>
            <p>Avg sec/word: {data.profile.average_seconds_per_word?.toFixed(2) ?? "—"}</p>
            <p>Avg sec/char: {data.profile.average_seconds_per_character?.toFixed(2) ?? "—"}</p>
          </article>
          {selectedTrack ? (
            <article className="card feature-card">
              <h2>Selected track</h2>
              <p>
                {selectedTrack.label} · {selectedTrack.level}
              </p>
              <p>{selectedTrack.subtitle}</p>
              <p>{selectedTrack.next_step}</p>
            </article>
          ) : null}
          <article className="card feature-card">
            <h2>Preferences</h2>
            <div className="surface-list">
              {profilePreferenceEntries.length > 0 ? (
                profilePreferenceEntries.map((entry) => (
                  <div key={entry.key} className="surface-list-item">
                    <div className="card-topline">
                      <strong>{entry.key}</strong>
                      <span className="muted">{entry.value}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="small-copy">No saved settings yet.</p>
              )}
            </div>
            <p className="small-copy">Theme: {appThemeLabels[resolveAppTheme(settingsMap.get("theme"))]}</p>
          </article>
          <article className="card feature-card">
            <h2>Book activity</h2>
            <div className="surface-list">
              {data.books.length > 0 ? (
                data.books.map((book) => (
                  <div key={book.book_id} className="surface-list-item">
                    <div className="card-topline">
                      <strong>{book.title}</strong>
                      <span className="muted">{book.active_seconds}s</span>
                    </div>
                    <p className="small-copy">
                      {book.page_reads} page reads • {book.sentence_reads} sentence reads
                    </p>
                    <p className="small-copy">State: {book.reading_state.replaceAll("_", " ")}</p>
                  </div>
                ))
              ) : (
                <p className="small-copy">No book activity recorded yet.</p>
              )}
            </div>
          </article>
        </section>
      ) : null}
    </RoutePage>
  );
}

export function ThemeSettingsSurfaceView() {
  const [data, setData] = useState<SettingsSurfaceResponse | null>(null);
  const [catalog, setCatalog] = useState<ThemeCatalogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<AppTheme>("neutral");
  const [followSystem, setFollowSystem] = useState(false);
  const [gridEnabled, setGridEnabled] = useState(DEFAULT_APP_THEME_GRID_ENABLED);
  const [patternOpacity, setPatternOpacity] = useState(DEFAULT_APP_THEME_PATTERN_OPACITY);
  const [patternTiling, setPatternTiling] = useState(DEFAULT_APP_THEME_PATTERN_TILING);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ThemeCatalogCategory>("all");
  const [mode, setMode] = useState<ThemeCatalogMode>("all");
  const [bundleIndex, setBundleIndex] = useState(0);
  const [wallpaperMode, setWallpaperMode] = useState<"full" | "crop" | "manual">("full");
  const [wallpaperZoom, setWallpaperZoom] = useState(100);
  const [wallpaperPositionX, setWallpaperPositionX] = useState(50);
  const [wallpaperPositionY, setWallpaperPositionY] = useState(50);
  const [wallpaperFrame, setWallpaperFrame] = useState<"2 / 3" | "9 / 16" | "1 / 1">("2 / 3");
  const [selectedWallpaperLoaded, setSelectedWallpaperLoaded] = useState(false);
  const railRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setTheme(readStoredAppTheme() ?? "neutral");
    setFollowSystem(readStoredAppThemeFollowSystem() ?? false);
    setGridEnabled(readStoredAppThemeGridEnabled() ?? DEFAULT_APP_THEME_GRID_ENABLED);
    setPatternOpacity(readStoredAppThemePatternOpacity() ?? DEFAULT_APP_THEME_PATTERN_OPACITY);
    setPatternTiling(readStoredAppThemePatternTiling() ?? DEFAULT_APP_THEME_PATTERN_TILING);
  }, []);

  useEffect(() => {
    let active = true;
    void fetchJson<SettingsSurfaceResponse>("/settings")
      .then((result) => {
        if (active) {
          setData(result);
          setTheme(resolveAppThemeFromSettings(result.entries));
          setFollowSystem(resolveAppThemeFollowSystemFromSettings(result.entries) ?? readStoredAppThemeFollowSystem() ?? false);
          setGridEnabled(resolveAppThemeGridEnabledFromSettings(result.entries) ?? readStoredAppThemeGridEnabled() ?? DEFAULT_APP_THEME_GRID_ENABLED);
          setPatternOpacity(resolveAppThemePatternOpacityFromSettings(result.entries) ?? readStoredAppThemePatternOpacity() ?? DEFAULT_APP_THEME_PATTERN_OPACITY);
          setPatternTiling(resolveAppThemePatternTilingFromSettings(result.entries) ?? readStoredAppThemePatternTiling() ?? DEFAULT_APP_THEME_PATTERN_TILING);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load the theme settings.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void fetchJson<ThemeCatalogResponse>("/themes/catalog")
      .then((result) => {
        if (active) {
          setCatalog(result);
        }
      })
      .catch(() => {
        // The local-only theme preview remains usable if hosted catalog storage is unavailable.
      });
    return () => {
      active = false;
    };
  }, []);

  function selectTheme(nextTheme: AppTheme) {
    setTheme(nextTheme);
    setSaved(false);
    setError(null);
    persistAppTheme(nextTheme);
  }

  async function saveThemePreferences() {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const nextEntries = [
        ...(data?.entries ?? []).filter((entry) => !["themeFollowSystem", "themeGridEnabled", "themePatternOpacity", "themePatternTiling"].includes(entry.key)),
        { key: "themeFollowSystem", value: followSystem ? "on" : "off" },
        { key: "themeGridEnabled", value: gridEnabled ? "on" : "off" },
        { key: "themePatternOpacity", value: String(patternOpacity) },
        { key: "themePatternTiling", value: patternTiling ? "on" : "off" },
      ];
      const result = await putJson<SettingsSurfaceResponse>("/settings", {
        entries: nextEntries,
      } satisfies SettingsUpdateRequest);
      setData(result);
      persistAppThemeFollowSystem(followSystem);
      persistAppThemeGridEnabled(gridEnabled);
      persistAppThemePatternOpacity(patternOpacity);
      persistAppThemePatternTiling(patternTiling);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the theme settings.");
    } finally {
      setSaving(false);
    }
  }

  const selectedOption = appThemeOptions.find((option) => option.value === theme) ?? appThemeOptions[0];
  const selectedWallpaperPath = getThemeWallpaperPath(theme);
  const selectedWallpaperThumbnailPath = getThemeWallpaperThumbnailPath(theme);
  const selectedWallpaperPreviewPath = selectedWallpaperLoaded ? selectedWallpaperPath : selectedWallpaperThumbnailPath ?? selectedWallpaperPath;
  const selectedWallpaperPreviewStyle = selectedWallpaperPreviewPath ? {
    aspectRatio: wallpaperFrame,
    backgroundImage: `url(${selectedWallpaperPreviewPath})`,
    backgroundPosition: `${wallpaperPositionX}% ${wallpaperPositionY}%`,
    backgroundRepeat: "no-repeat",
    backgroundSize: wallpaperMode === "full" ? "contain" : wallpaperMode === "crop" ? "cover" : `${wallpaperZoom}% auto`,
  } : undefined;
  useLayoutEffect(() => {
    setSelectedWallpaperLoaded(!selectedWallpaperPath);
  }, [selectedWallpaperPath]);
  const catalogThemes = catalog?.themes ?? appThemeOptions.map((option) => ({
    id: option.value,
    title: option.title,
    description: option.description,
    price_cents: Math.round(option.price * 100),
    is_free: ["neutral", "sepia", "ink", "black"].includes(option.value),
    is_owned: ["neutral", "sepia", "ink", "black"].includes(option.value),
    preview_available: true,
  }));
  const serverThemeMap = new Map(catalogThemes.map((item) => [item.id, item]));
  const collectionGroups = themeCatalogCategories
    .filter((item): item is { value: Exclude<ThemeCatalogCategory, "all">; label: string } => item.value !== "all" && (category === "all" || category === item.value))
    .map((collection) => ({
      ...collection,
      description: themeCatalogCollectionDescriptions[collection.value],
      themes: catalogThemes.filter((item) => matchesThemeCatalogFilters(item, query, collection.value, mode)),
    }))
    .filter((collection) => collection.themes.length > 0);
  const fallbackBundles = themeBundles.map((bundle) => ({
    id: bundle.id,
    title: bundle.title,
    description: bundle.description,
    theme_ids: bundle.themeValues,
    price_cents: Math.round(bundle.bundlePrice * 100),
    is_owned: bundle.themeValues.every((value) => serverThemeMap.get(value)?.is_owned),
  }));
  const catalogBundles = catalog?.bundles ?? fallbackBundles;
  const activeBundleIndex = catalogBundles.length ? Math.min(bundleIndex, catalogBundles.length - 1) : 0;
  const activeBundle = catalogBundles[activeBundleIndex];
  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  function moveBundle(direction: number) {
    if (!catalogBundles.length) {
      return;
    }
    setBundleIndex((current) => (current + direction + catalogBundles.length) % catalogBundles.length);
  }

  function scrollRail(collection: string, direction: number) {
    railRefs.current[collection]?.scrollBy({ left: direction * 280, behavior: "smooth" });
  }

  function themeStatus(item: (typeof catalogThemes)[number]) {
    if (item.is_free) {
      return "Included";
    }
    if (item.is_owned) {
      return "Owned";
    }
    if (catalog?.mode === "hosted") {
      return "Preview only";
    }
    return formatPrice(item.price_cents / 100);
  }

  return (
    <RoutePage
      eyebrow="Settings"
      title="Theme settings and owned themes"
      description="Tune the app theme and reading canvas in one place, then browse the owned and available theme catalog below."
      badge={`${catalog?.themes.length ?? appThemeOptions.length} themes`}
      links={[
        { href: "/settings", label: "Back to Settings" },
        { href: "/profile", label: "Profile" },
      ]}
      metrics={[
        { label: "Collection", value: `${catalog?.themes.length ?? appThemeOptions.length} themes` },
        { label: "Selected", value: appThemeLabels[theme] },
        { label: "Storage", value: catalog ? "Server catalog" : "Local preview" },
      ]}
    >
      {error ? <section className="card feature-card">{error}</section> : null}
      {!data && !error ? <LoadingSkeleton label="Loading theme settings" /> : null}
      {data ? (
        <>
          <section className="feature-grid">
            <GlobalThemePicker
              initialTheme={theme}
              entries={data.entries}
              catalogHref="#theme-catalog"
              inventoryId="theme-settings.app-theme-card"
              onThemeChange={setTheme}
              onSaved={setTheme}
            />
            <article className="card feature-card settings-preferences-card" data-inventory-id="theme-settings.behavior-card">
              <h2>Theme behavior</h2>
              <p className="small-copy">
                Follow-device behavior, canvas artwork opacity, wallpaper tiling, and the background grid all live here.
              </p>
              <div className="settings-inspector-row" data-inventory-id="theme-settings.follow-system">
                <label className="theme-grid-toggle">
                  <input
                    type="checkbox"
                    checked={followSystem}
                    onChange={(event) => {
                      const nextFollowSystem = event.target.checked;
                      setFollowSystem(nextFollowSystem);
                      persistAppThemeFollowSystem(nextFollowSystem);
                      setSaved(false);
                    }}
                  />
                  <span>
                    <strong>Follow device theme</strong>
                    <small>When enabled, the app follows the phone or browser light/dark setting.</small>
                  </span>
                </label>
              </div>
              <label className="theme-opacity-slider">
                <span className="theme-opacity-slider-head">
                  <span>Theme artwork opacity</span>
                  <strong>{patternOpacity}%</strong>
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={patternOpacity}
                  onChange={(event) => {
                    const nextOpacity = Number(event.target.value);
                    setPatternOpacity(nextOpacity);
                    persistAppThemePatternOpacity(nextOpacity);
                    setSaved(false);
                  }}
                  aria-label="Theme artwork opacity"
                />
                <span className="small-copy">Controls the canvas artwork only. Cards and reading text stay fully opaque.</span>
              </label>
              <label className="theme-grid-toggle">
                <input
                  type="checkbox"
                  checked={patternTiling}
                  onChange={(event) => {
                    const nextPatternTiling = event.target.checked;
                    setPatternTiling(nextPatternTiling);
                    persistAppThemePatternTiling(nextPatternTiling);
                    setSaved(false);
                  }}
                />
                <span>
                  <strong>Tile wallpaper</strong>
                  <small>Repeat the current wallpaper instead of stretching one image across the canvas.</small>
                </span>
              </label>
              <label className="theme-grid-toggle">
                <input
                  type="checkbox"
                  checked={gridEnabled}
                  onChange={(event) => {
                    const nextGridEnabled = event.target.checked;
                    setGridEnabled(nextGridEnabled);
                    persistAppThemeGridEnabled(nextGridEnabled);
                    setSaved(false);
                  }}
                />
                <span>
                  <strong>Show canvas grid</strong>
                  <small>Toggle the fixed background grid without changing wallpaper, gradients, or cards.</small>
                </span>
              </label>
              <button className="button button-primary" type="button" onClick={() => void saveThemePreferences()} disabled={saving}>
                {saving ? "Saving theme settings..." : saved ? "Theme settings saved" : "Save theme settings"}
              </button>
            </article>
          </section>
          <section className="card feature-card theme-shop-card">
          <div className="card-topline">
            <div>
              <span className="eyebrow">Your current preview</span>
              <h2>{selectedOption.title}</h2>
            </div>
            <span className="pill">Live preview</span>
          </div>
          <p className="global-theme-intro">{selectedOption.description}</p>
          <div className="theme-shop-selected-preview" data-inventory-id="theme-shop.selected-preview">
            <div className={`theme-shop-selected-preview-frame ${selectedWallpaperPath ? "theme-shop-selected-preview-frame--wallpaper" : "theme-shop-selected-preview-frame--fallback"}`} style={selectedWallpaperPreviewStyle}>
              {selectedWallpaperPath ? (
                <>
                  <Image
                    key={selectedWallpaperPath}
                    className="theme-shop-selected-preview-loader"
                    src={selectedWallpaperPath}
                    alt=""
                    aria-hidden="true"
                    fill
                    sizes="100vw"
                    priority
                    decoding="async"
                    draggable={false}
                    onContextMenu={(event: MouseEvent<HTMLImageElement>) => event.preventDefault()}
                    onDragStart={(event: MouseEvent<HTMLImageElement>) => event.preventDefault()}
                    onLoad={() => setSelectedWallpaperLoaded(true)}
                    onError={() => setSelectedWallpaperLoaded(true)}
                  />
                  {!selectedWallpaperLoaded ? (
                    <div className="theme-shop-selected-preview-loading" aria-hidden="true">
                      <span>Loading wallpaper</span>
                    </div>
                  ) : null}
                </>
              ) : (
                <span className="theme-shop-selected-preview-placeholder global-theme-swatch" data-theme={theme} aria-hidden="true" />
              )}
            </div>
            <p className="small-copy theme-shop-selected-preview-copy">
              {selectedWallpaperPath
                ? "Thumbnails load first in the catalog. The full wallpaper swaps in when this preview finishes loading."
                : "This theme uses a color or gradient preview instead of a wallpaper image."}
            </p>
          </div>
          <div className="theme-shop-store-controls" data-inventory-id="theme-shop.store-controls">
            <label className="theme-shop-search" data-inventory-id="theme-shop.search">
              <span>Search themes</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search fruit, cities, consoles..."
                type="search"
              />
            </label>
            <div className="theme-shop-category-nav" role="tablist" aria-label="Theme collections" data-inventory-id="theme-shop.category-nav">
              {themeCatalogCategories.map((item) => (
                <button
                  key={item.value}
                  className={`theme-shop-category-tab ${category === item.value ? "is-active" : ""}`}
                  type="button"
                  role="tab"
                  aria-selected={category === item.value}
                  onClick={() => setCategory(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="theme-shop-mode-nav" role="tablist" aria-label="Theme modes" data-inventory-id="theme-shop.mode-tabs">
              {themeCatalogModes.map((item) => (
                <button
                  key={item.value}
                  className={`theme-shop-filter ${mode === item.value ? "is-active" : ""}`}
                  type="button"
                  role="tab"
                  aria-selected={mode === item.value}
                  onClick={() => setMode(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <details className="theme-shop-preview-controls" open data-inventory-id="theme-shop.preview-tuning">
            <summary>
              <span className="theme-shop-preview-controls-title">
                <span className="eyebrow">Developer preview</span>
                <strong>Wallpaper frame tuning</strong>
                <span>Adjust every illustrated tile before choosing the final presentation.</span>
              </span>
              <span className="pill">Live controls</span>
            </summary>
            <div className="theme-shop-preview-controls-body">
              <div className="theme-shop-preview-control">
                <span className="theme-shop-preview-control-label">Image treatment</span>
                <div className="theme-shop-preview-toggle-group" role="group" aria-label="Wallpaper image treatment">
                  {[
                    ["full", "Full image"],
                    ["crop", "Cover crop"],
                    ["manual", "Manual zoom"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      className={`theme-shop-preview-toggle ${wallpaperMode === value ? "is-active" : ""}`}
                      type="button"
                      aria-pressed={wallpaperMode === value}
                      onClick={() => setWallpaperMode(value as "full" | "crop" | "manual")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="theme-shop-preview-control">
                <span className="theme-shop-preview-control-label">Frame ratio</span>
                <div className="theme-shop-preview-toggle-group" role="group" aria-label="Wallpaper frame ratio">
                  {[
                    ["2 / 3", "Tall"],
                    ["9 / 16", "Wallpaper"],
                    ["1 / 1", "Square"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      className={`theme-shop-preview-toggle ${wallpaperFrame === value ? "is-active" : ""}`}
                      type="button"
                      aria-pressed={wallpaperFrame === value}
                      onClick={() => setWallpaperFrame(value as "2 / 3" | "9 / 16" | "1 / 1")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="theme-shop-preview-slider">
                <span><span>Zoom</span><output>{wallpaperZoom}%</output></span>
                <input type="range" min="50" max="180" step="5" value={wallpaperZoom} onChange={(event) => setWallpaperZoom(Number(event.target.value))} />
              </label>
              <label className="theme-shop-preview-slider">
                <span><span>Horizontal position</span><output>{wallpaperPositionX}%</output></span>
                <input type="range" min="0" max="100" step="1" value={wallpaperPositionX} onChange={(event) => setWallpaperPositionX(Number(event.target.value))} />
              </label>
              <label className="theme-shop-preview-slider">
                <span><span>Vertical position</span><output>{wallpaperPositionY}%</output></span>
                <input type="range" min="0" max="100" step="1" value={wallpaperPositionY} onChange={(event) => setWallpaperPositionY(Number(event.target.value))} />
              </label>
              <button
                className="button button-secondary theme-shop-preview-reset"
                type="button"
                onClick={() => {
                  setWallpaperMode("full");
                  setWallpaperZoom(100);
                  setWallpaperPositionX(50);
                  setWallpaperPositionY(50);
                  setWallpaperFrame("2 / 3");
                }}
              >
                Reset preview controls
              </button>
            </div>
          </details>
          <div className="theme-bundle-carousel" data-inventory-id="theme-shop.collections-carousel" aria-roledescription="carousel" aria-label="All theme collections">
            <div className="theme-bundle-carousel-heading">
              <div>
                <span className="eyebrow">Browse by collection</span>
                <h3>All Collections</h3>
              </div>
              {catalogBundles.length ? <span className="small-copy">Collection {activeBundleIndex + 1} of {catalogBundles.length}</span> : null}
            </div>
            {activeBundle ? (
              <>
                <div className="theme-bundle-carousel-controls" data-inventory-id="theme-shop.collection-arrows">
                  <button className="theme-bundle-arrow" type="button" onClick={() => moveBundle(-1)} aria-label="Previous collection">
                    <span aria-hidden="true">←</span>
                  </button>
                  <button className="theme-bundle-arrow" type="button" onClick={() => moveBundle(1)} aria-label="Next collection">
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
                <div className="theme-bundle-slide" data-inventory-id="theme-shop.collection-slide" role="group" aria-roledescription="slide" aria-label={`${activeBundleIndex + 1} of ${catalogBundles.length}: ${activeBundle.title}`}>
                  <article className="theme-bundle-card" data-inventory-id="theme-shop.bundle-card">
                    <div className="card-topline">
                      <div>
                        <span className="eyebrow">Collection offer</span>
                        <h3>{activeBundle.title}</h3>
                      </div>
                      <span className="pill">Save {formatPrice(activeBundle.theme_ids.length * INDIVIDUAL_THEME_PRICE - activeBundle.price_cents / 100)}</span>
                    </div>
                    <p>{activeBundle.description}</p>
                    <div className="theme-bundle-themes">
                      {activeBundle.theme_ids.map((value) => <span key={value}>{serverThemeMap.get(value)?.title ?? appThemeLabels[value as AppTheme] ?? value}</span>)}
                    </div>
                    <div className="theme-bundle-price-row">
                      <strong>{formatPrice(activeBundle.price_cents / 100)}</strong>
                      <span>{formatPrice(activeBundle.theme_ids.length * INDIVIDUAL_THEME_PRICE)} individually</span>
                    </div>
                    <button className="button button-secondary" type="button" onClick={() => {
                      const firstTheme = activeBundle.theme_ids.find((value) => appThemeOptions.some((option) => option.value === value));
                      if (firstTheme) {
                        selectTheme(firstTheme as AppTheme);
                      }
                      setQuery("");
                      setCategory("all");
                      setMode("all");
                    }}>
                      Preview collection
                    </button>
                  </article>
                </div>
                <div className="theme-bundle-dots" data-inventory-id="theme-shop.collection-dots" role="tablist" aria-label="Choose a theme collection">
                  {catalogBundles.map((bundle, index) => (
                    <button
                      key={bundle.id}
                      className={`theme-bundle-dot ${index === activeBundleIndex ? "is-active" : ""}`}
                      type="button"
                      role="tab"
                      aria-selected={index === activeBundleIndex}
                      aria-label={`Show ${bundle.title}`}
                      onClick={() => setBundleIndex(index)}
                    />
                  ))}
                </div>
              </>
            ) : <p className="small-copy">No collections are available yet.</p>}
          </div>
          <section className="theme-shop-collections" id="theme-catalog" data-inventory-id="theme-shop.catalog-card">
            <div className="theme-shop-catalog-heading">
              <div>
                <span className="eyebrow">Browse themes</span>
                <h3>{category === "all" ? "All Collections" : themeCatalogCategories.find((item) => item.value === category)?.label}</h3>
              </div>
              <span className="small-copy">{collectionGroups.reduce((total, collection) => total + collection.themes.length, 0)} themes</span>
            </div>
            {collectionGroups.length ? collectionGroups.map((collection) => (
              <section key={collection.value} className="theme-shop-rail" data-inventory-id="theme-shop.collection-rail">
                <div className="theme-shop-rail-heading">
                  <div>
                    <h4>{collection.label}</h4>
                    <p>{collection.description}</p>
                  </div>
                  <button className="theme-shop-rail-arrow" type="button" onClick={() => scrollRail(collection.value, 1)} aria-label={`Next ${collection.label} themes`}>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
                <div className="theme-shop-rail-track" ref={(element) => { railRefs.current[collection.value] = element; }} data-inventory-id="theme-shop.catalog-grid" aria-label={`${collection.label} themes`}>
                  {collection.themes.map((item) => {
                  const knownOption = appThemeOptions.find((option) => option.value === item.id);
                  const isSelected = theme === item.id;
                  const itemMode = getThemeCatalogMode(item.id);
                  const itemCategory = getThemeCatalogCategory(item.id, item.is_free);
                  const wallpaperThumbnailPath = getThemeWallpaperThumbnailPath(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`theme-shop-product-card ${isSelected ? "is-selected" : ""}`}
                      onClick={() => knownOption && item.preview_available ? selectTheme(knownOption.value) : undefined}
                      aria-pressed={isSelected}
                      disabled={!knownOption || !item.preview_available}
                    >
                      <span
                        className={`theme-shop-product-swatch global-theme-swatch ${wallpaperThumbnailPath ? "theme-shop-product-swatch--wallpaper" : ""}`}
                        data-theme={item.id}
                        aria-hidden="true"
                      >
                        {wallpaperThumbnailPath ? (
                          <Image
                            className="theme-shop-product-swatch-image"
                            src={wallpaperThumbnailPath}
                            alt=""
                            aria-hidden="true"
                            fill
                            sizes="9.4rem"
                            loading="lazy"
                            decoding="async"
                            draggable={false}
                            onContextMenu={(event: MouseEvent<HTMLImageElement>) => event.preventDefault()}
                            onDragStart={(event: MouseEvent<HTMLImageElement>) => event.preventDefault()}
                          />
                        ) : null}
                      </span>
                      <span className="theme-shop-product-copy">
                        <span className="theme-shop-option-meta"><span>{themeCatalogCategories.find((entry) => entry.value === itemCategory)?.label}</span>{itemMode ? <span>{itemMode === "daylight" ? "Daylight" : "Night"}</span> : null}</span>
                        <strong>{item.title}</strong>
                        <span>{item.description}</span>
                        <span className="theme-shop-product-price">{themeStatus(item)}</span>
                      </span>
                    </button>
                  );
                  })}
                </div>
              </section>
            )) : (
              <div className="theme-shop-empty" data-inventory-id="theme-shop.empty-state">
                <strong>No themes match those filters.</strong>
                <button className="button button-secondary" type="button" onClick={() => { setQuery(""); setCategory("all"); setMode("all"); }}>
                  Clear filters
                </button>
              </div>
            )}
          </section>
          </section>
        </>
      ) : null}
    </RoutePage>
  );
}

export function SearchSurfaceView() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchSurfaceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const initialQuery = searchParams.get("q")?.trim() ?? window.localStorage.getItem("textplex:last-search-query") ?? "";
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    if (query.trim()) {
      window.localStorage.setItem("textplex:last-search-query", query.trim());
    }
  }, [query]);

  async function runSearch(nextQuery: string) {
    const normalized = nextQuery.trim();
    if (!normalized) {
      setData(null);
      setError(null);
      router.replace("/search");
      return;
    }

    try {
      setError(null);
      router.replace(`/search?q=${encodeURIComponent(normalized)}`);
      const result = await fetchJson<SearchSurfaceResponse>(`/search?query=${encodeURIComponent(normalized)}&limit=24`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to search.");
    }
  }

  return (
    <RoutePage
      eyebrow="Search"
      title="Search across books and vocabulary"
      description="Search books, sentences, and extracted lexical entries from the processed library."
      badge={data ? `${data.result_count} results` : "Live"}
      links={[
        { href: "/library", label: "Library" },
        { href: "/progress", label: "Progress" },
      ]}
      metrics={[
        { label: "Scope", value: "Books, tokens, history" },
        { label: "Query", value: query || "Loading" },
        { label: "State", value: error ? "Error" : data ? "Loaded" : "Idle" },
      ]}
    >
      <section className="card feature-card">
        <div className="button-row">
          <input
            className="text-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a title, token, or lemma"
          />
          <button className="button button-primary" type="button" onClick={() => void runSearch(query)}>
            Search
          </button>
        </div>
      </section>
      {error ? <section className="card feature-card">{error}</section> : null}
      {!data && !error && query ? <LoadingSkeleton label="Searching" /> : null}
      {data ? (
        <section className="card feature-card">
          <h2>Results</h2>
          <div className="surface-list">
            {data.results.map((result, index) => (
              <article key={`${result.kind}-${index}-${result.book_id ?? "book"}`} className="surface-list-item">
                <div className="card-topline">
                  <strong>{result.kind.replaceAll("_", " ")}</strong>
                  <span className="muted">{result.score}</span>
                </div>
                <p>{result.snippet}</p>
                <p className="small-copy">
                  {result.book_title ?? result.book_id}
                  {result.page_number ? ` - Page ${result.page_number}` : ""}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </RoutePage>
  );
}

export function SettingsSurfaceView() {
  const { configured: authConfigured, user: authenticatedUser } = useAuth();
  const [data, setData] = useState<SettingsSurfaceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [readerSpeechVoiceGender, setReaderSpeechVoiceGender] = useState<ReaderSpeechVoiceGender>(() => readStoredReaderSpeechVoiceGender());

  useEffect(() => {
    let active = true;
    void fetchJson<SettingsSurfaceResponse>("/settings")
      .then((result) => {
        if (!active) {
          return;
        }
        setData(result);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load settings.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!data) {
      return;
    }

    const nextReaderSpeechVoiceGender = resolveReaderSpeechVoiceGender(
      data.entries.find((entry) => entry.key === "readerSpeechVoiceGender")?.value ?? readStoredReaderSpeechVoiceGender(),
    );
    setReaderSpeechVoiceGender(nextReaderSpeechVoiceGender);
    persistReaderSpeechVoiceGender(nextReaderSpeechVoiceGender);
  }, [data]);

  const theme: AppTheme = data ? resolveAppThemeFromSettings(data.entries) : "neutral";

  async function handleSetReaderSpeechVoiceGender(nextGender: ReaderSpeechVoiceGender): Promise<void> {
    const previousGender = readerSpeechVoiceGender;
    setReaderSpeechVoiceGender(nextGender);
    persistReaderSpeechVoiceGender(nextGender);
    setError(null);
    try {
      const updated = await putJson<SettingsSurfaceResponse>("/settings", {
        entries: [{ key: "readerSpeechVoiceGender", value: nextGender }],
      } satisfies SettingsUpdateRequest);
      setData(updated);
    } catch (err) {
      setReaderSpeechVoiceGender(previousGender);
      persistReaderSpeechVoiceGender(previousGender);
      setError(err instanceof Error ? err.message : "Unable to save the speech voice preference.");
    }
  }

  return (
    <RoutePage
      eyebrow="Settings"
      title="Profile and app preferences"
      description={
        authenticatedUser
          ? "Display preferences are stored in the authenticated hosted profile. Theme settings now live in the dedicated theme settings page."
          : authConfigured
            ? "Sign in to load and save hosted preferences, or continue in local-only mode. Theme settings now live in the dedicated theme settings page."
            : "Display preferences and local reading behavior are stored in the local profile database. Theme settings now live in the dedicated theme settings page."
      }
      badge="Live"
      links={[
        { href: "/library", label: "Library" },
        { href: "/activity", label: "Activity" },
      ]}
      metrics={[
        { label: "Profile", value: authenticatedUser ? "Hosted account" : authConfigured ? "Sign-in available" : "Local first" },
        { label: "Theme", value: data ? appThemeLabels[theme as AppTheme] : "Loading" },
      ]}
    >
      {error ? <section className="card feature-card">{error}</section> : null}
      {!data && !error ? <LoadingSkeleton label="Loading settings" /> : null}
      <section className="card feature-card settings-preferences-card" data-inventory-id="settings.preferences-card">
        <h2>Preferences</h2>
        <p className="small-copy">
          Theme controls now live in the dedicated theme settings page, where the app look and owned visual packs stay together.
          Use the version footer toggle to show the current app version and last reboot/rebuild time at the bottom of every page.
        </p>
        <div className="settings-inspector-row" data-inventory-id="settings.inventory-labels-toggle">
          <div>
            <strong>Inventory labels</strong>
            <p className="small-copy">Show route and component labels while auditing the app shell and reader surfaces.</p>
          </div>
          <InventoryInspectorToggle />
        </div>
        <div className="settings-inspector-row" data-inventory-id="settings.build-footer-toggle">
          <div>
            <strong>Version footer</strong>
            <p className="small-copy">Show the current app version and last reboot/rebuild time at the bottom of every page.</p>
          </div>
          <BuildFooterToggle />
        </div>
        <div className="settings-inspector-row" data-inventory-id="settings.speech-voice-toggle">
          <div>
            <strong>Speech voice</strong>
            <p className="small-copy">Prefer a male or female browser voice for reader and study audio playback.</p>
          </div>
          <div className="voice-gender-toggle-group" role="group" aria-label="Preferred speech voice">
            {(["female", "male"] as const).map((gender) => (
              <button
                key={gender}
                type="button"
                className={`button button-secondary button-compact voice-gender-toggle-option ${readerSpeechVoiceGender === gender ? "is-active" : ""}`}
                onClick={() => void handleSetReaderSpeechVoiceGender(gender)}
                aria-pressed={readerSpeechVoiceGender === gender}
                data-inventory-id={`settings.speech-voice-${gender}`}
              >
                {gender === "female" ? "Female" : "Male"}
              </button>
            ))}
          </div>
        </div>
        <Link className="button button-secondary" href="/profile/themes" data-inventory-id="settings.theme-settings-link">
          Open theme settings
        </Link>
        {data ? <p className="small-copy">Stored settings: {data.entries.length}</p> : null}
      </section>
      <Link className="card feature-card settings-roadmap-card" href="/roadmap" data-inventory-id="settings.roadmap-card">
        <div className="card-topline">
          <div>
            <span className="eyebrow">Planning</span>
            <h2>Vocabulary roadmap</h2>
          </div>
          <span className="pill">Open</span>
        </div>
        <p>Review the language-pack implementation plan, active build, and queued vocabulary tracks.</p>
        <span className="button button-secondary">Open roadmap</span>
      </Link>
    </RoutePage>
  );
}

export function StudySurfaceView() {
  const [data, setData] = useState<StudySurfaceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudyProgramItemKey, setSelectedStudyProgramItemKey] = useState<string | null>(null);
  const [selectedStudyItemKey, setSelectedStudyItemKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchJson<StudySurfaceResponse>("/study")
      .then((result) => {
        if (active) {
          setData(result);
          setSelectedStudyItemKey(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load study queue.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  function getStudyItemKey(
    item: NonNullable<StudySurfaceResponse["study_groups"]>[number]["items"][number],
  ): string {
    return [
      item.language_code,
      item.lemma,
      item.source_book_id,
      item.source_page_number,
      item.source_sentence_order,
      item.source_token_order,
    ].join(":");
  }

  function getStudyProgramItemKey(
    programCode: string,
    levelCode: string,
    item: NonNullable<StudySurfaceResponse["study_programs"]>[number]["levels"][number]["items"][number],
  ): string {
    return [programCode, levelCode, item.language_code, item.lemma].join(":");
  }

  return (
    <RoutePage
      eyebrow="Study"
      title="Review queue and study loop"
      description="Due-item review driven by learner state and exposure history."
      badge={data ? `${data.queue_size} queued` : "Live"}
      links={[
        { href: "/progress", label: "Progress" },
        { href: "/activity", label: "Activity" },
      ]}
      metrics={[
        { label: "Queue", value: data ? String(data.queue_size) : "Loading" },
        { label: "Saved", value: data ? String(data.study_item_count) : "Loading", detail: "Grouped by language" },
      ]}
    >
      {error ? <section className="card feature-card">{error}</section> : null}
      {!data && !error ? <LoadingSkeleton label="Loading study queue" /> : null}
      {data ? (
        <>
          <section className="card feature-card" data-inventory-id="study.programs-card">
            <h2>Program introduction</h2>
            <p className="small-copy">
              Curated level vocabulary from the active language programs. Starter levels provide an authored foundation, with room for later curriculum levels.
            </p>
            {data.study_programs.length ? (
              <div className="study-program-groups">
                {data.study_programs.map((program) => (
                  <details key={program.program_code} className="study-program-group" data-inventory-id="study.program-group">
                    <summary className="study-program-group-summary">
                      <div>
                        <span className="eyebrow">{program.language_label}</span>
                        <h3>{program.program_label}</h3>
                      </div>
                      <span className="pill">{program.program_source_label}</span>
                    </summary>
                    <div className="study-program-levels">
                      {program.levels.map((level, levelIndex) => {
                        const practiceHref = `/study/practice?${new URLSearchParams({
                          mode: "program",
                          language_code: program.language_code,
                          language: program.language_code,
                          program_code: program.program_code,
                          program: program.program_code,
                          level_code: level.level_code,
                          level: level.level_code,
                        }).toString()}`;

                        return (
                          <details
                            key={`${program.program_code}-${level.level_code}`}
                            className="study-program-level"
                            data-inventory-id="study.program-level"
                            open={levelIndex === 0}
                          >
                            <summary className="study-program-level-summary">
                              <div>
                                <span className="eyebrow">{level.level_label}</span>
                                <h4>{level.introduction_note}</h4>
                              </div>
                              <div className="study-program-level-summary-actions">
                                <span className="pill">{level.item_count} terms</span>
                                <Link
                                  className="button button-secondary button-compact"
                                  href={practiceHref}
                                  data-inventory-id="study.program-practice-link-summary"
                                  onClick={(event: MouseEvent<HTMLAnchorElement>) => event.stopPropagation()}
                                >
                                  Practice this level
                                </Link>
                              </div>
                            </summary>
                            <div className="study-program-items">
                              {level.items.map((item) => {
                                const itemKey = getStudyProgramItemKey(program.program_code, level.level_code, item);
                                const expanded = selectedStudyProgramItemKey === itemKey;
                                const pronunciation = item.pronunciation ?? "-";
                                const englishMeaning = item.definition_short ?? "-";

                                return (
                                  <article
                                    key={`${program.program_code}-${level.level_code}-${item.lemma}`}
                                    className="study-program-item"
                                    data-inventory-id="study.program-item"
                                  >
                                    <button
                                      type="button"
                                      className={`study-program-item-toggle ${expanded ? "is-expanded" : ""}`}
                                      onClick={() => {
                                        setSelectedStudyProgramItemKey((current) => (current === itemKey ? null : itemKey));
                                      }}
                                      aria-expanded={expanded}
                                      aria-controls={`study-program-item-details-${itemKey}`}
                                      data-inventory-id="study.program-item-toggle"
                                    >
                                      <div className="study-program-item-row" dir="auto">
                                        <span className="study-program-item-term" lang={item.language_code}>
                                          {item.display_form}
                                        </span>
                                        <span className="study-program-item-pronunciation">({pronunciation})</span>
                                        <span className="study-program-item-meaning">{englishMeaning}</span>
                                      </div>
                                      <div className="study-program-item-meta">
                                        <span className="eyebrow">{item.progress_state}</span>
                                        <span className="muted">
                                          {item.frequency_rank != null ? `#${item.frequency_rank}` : item.proficiency_level ?? "-"}
                                        </span>
                                      </div>
                                    </button>
                                    {expanded ? (
                                      <div
                                        id={`study-program-item-details-${itemKey}`}
                                        className="study-program-item-details"
                                        data-inventory-id="study.program-item-details"
                                      >
                                        <StudyAxisRadarChart
                                          axes={item.assessment_axes}
                                          inventoryId="study.program-item-axis-chart"
                                          title="Axis SRS"
                                          description="Current SRS stage for each assessment axis on this program term."
                                          emptyMessage="This program term has not been assessed yet."
                                        />
                                        <div className="study-metadata-grid">
                                          <div>
                                            <span className="eyebrow">Level</span>
                                            <strong>{level.level_label}</strong>
                                          </div>
                                          <div>
                                            <span className="eyebrow">Program</span>
                                            <strong>{program.program_label}</strong>
                                          </div>
                                          <div>
                                            <span className="eyebrow">Source</span>
                                            <strong>{program.program_source_label}</strong>
                                          </div>
                                          <div>
                                            <span className="eyebrow">Progress</span>
                                            <strong>{item.progress_state}</strong>
                                          </div>
                                          <div>
                                            <span className="eyebrow">Frequency</span>
                                            <strong>{item.frequency_rank != null ? `#${item.frequency_rank}` : "-"}</strong>
                                          </div>
                                          <div>
                                            <span className="eyebrow">Saved count</span>
                                            <strong>{item.saved_count}</strong>
                                          </div>
                                          <div>
                                            <span className="eyebrow">Pronunciation</span>
                                            <strong>{item.pronunciation ?? "—"}</strong>
                                          </div>
                                          <div>
                                            <span className="eyebrow">English meaning</span>
                                            <strong>{englishMeaning}</strong>
                                          </div>
                                          <div>
                                            <span className="eyebrow">Proficiency</span>
                                            <strong>{item.proficiency_level ?? "—"}</strong>
                                          </div>
                                        </div>
                                      </div>
                                    ) : null}
                                  </article>
                                );
                              })}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <p className="small-copy">No curated program vocabulary is available yet for the imported language packs.</p>
            )}
          </section>
          <details className="card feature-card study-queue-card" data-inventory-id="study.queue-card" open>
            <summary className="study-queue-card-summary" data-inventory-id="study.queue-card-toggle">
              <div>
                <h2>Due items</h2>
                <p className="small-copy">Tap a language card for review pills and timing.</p>
              </div>
            </summary>
            <DueReviewChart items={data.queued_items} />
            <StudyDueLanguageGroups items={data.queued_items} studyPrograms={data.study_programs} studyGroups={data.study_groups} />
            <div className="study-queue-actions">
              <Link className="button button-secondary" href="/study/practice?mode=review" data-inventory-id="study.review-practice-link">
                Start review session
              </Link>
            </div>
          </details>
      <details className="card feature-card study-saved-vocabulary-card" data-inventory-id="study.glossed-vocabulary-card" open>
        <summary className="study-saved-vocabulary-card-summary" data-inventory-id="study.glossed-vocabulary-card-summary">
          <div>
            <h2>Glossed vocabulary</h2>
            <p className="small-copy">Language-grouped terms captured during reading sessions when a word needed help, with source metadata and axis stages.</p>
          </div>
        </summary>
        {data.study_groups.length ? (
          <div className="study-language-groups">
            {data.study_groups.map((group) => (
              <details key={group.language_code} className="study-language-group" data-inventory-id="study.glossed-vocabulary-language-group">
                <summary className="study-language-group-summary">
                  <div>
                    <span className="eyebrow">{group.language_label}</span>
                    <h3>{group.item_count} terms</h3>
                  </div>
                  <span className="pill">{group.language_label}</span>
                </summary>
                <div className="surface-list">
                {group.items.map((item) => {
                  const itemKey = getStudyItemKey(item);
                  const expanded = selectedStudyItemKey === itemKey;
                    const pronunciation = item.pronunciation ?? item.romanization ?? "—";
                    const englishMeaning = item.definition_short ?? "—";

                    return (
                      <article key={itemKey} className="surface-list-item study-saved-item" data-inventory-id="study.glossed-vocabulary-item">
                        <button
                          type="button"
                          className={`study-saved-item-toggle ${expanded ? "is-expanded" : ""}`}
                          onClick={() => {
                            setSelectedStudyItemKey((current) => (current === itemKey ? null : itemKey));
                          }}
                          aria-expanded={expanded}
                          aria-controls={`study-item-details-${itemKey}`}
                          data-inventory-id="study.glossed-vocabulary-item-toggle"
                        >
                        <div className="study-saved-item-row" dir="auto">
                          <span className="study-saved-item-term" lang={item.language_code}>
                            {item.display_form}
                          </span>
                          <span className="study-saved-item-pronunciation">({pronunciation})</span>
                          <span className="study-saved-item-meaning">{englishMeaning}</span>
                        </div>
                      </button>
                      {expanded ? (
                          <div
                            id={`study-item-details-${itemKey}`}
                            className="study-saved-item-details"
                            data-inventory-id="study.glossed-vocabulary-item-details"
                          >
                            <StudyAxisRadarChart axes={item.assessment_axes} />
                            <div className="study-metadata-grid">
                              <div>
                                <span className="eyebrow">Display form</span>
                                <strong>{item.display_form}</strong>
                              </div>
                              <div>
                                <span className="eyebrow">Lemma</span>
                                <strong>{item.lemma}</strong>
                              </div>
                              <div>
                                <span className="eyebrow">English meaning</span>
                                <strong>{englishMeaning}</strong>
                              </div>
                              <div>
                                <span className="eyebrow">Language</span>
                                <strong>{item.language_label}</strong>
                              </div>
                              <div>
                                <span className="eyebrow">Book</span>
                                <strong>{item.source_book_title ?? item.source_book_id}</strong>
                              </div>
                              <div>
                                <span className="eyebrow">Book ID</span>
                                <strong>{item.source_book_id}</strong>
                              </div>
                              <div>
                                <span className="eyebrow">Page</span>
                                <strong>{item.source_page_number}</strong>
                              </div>
                              <div>
                                <span className="eyebrow">Sentence</span>
                                <strong>{item.source_sentence_order}</strong>
                              </div>
                              <div>
                                <span className="eyebrow">Token</span>
                                <strong>{item.source_token_order}</strong>
                              </div>
                              <div>
                                <span className="eyebrow">Source form</span>
                                <strong>{item.source_surface_form}</strong>
                              </div>
                              <div>
                                <span className="eyebrow">Pronunciation</span>
                                <strong>{item.pronunciation ?? "—"}</strong>
                              </div>
                              <div>
                                <span className="eyebrow">Romanization</span>
                                <strong>{item.romanization ?? "—"}</strong>
                              </div>
                              <div>
                                <span className="eyebrow">Proficiency</span>
                                <strong>{item.proficiency_level ?? "—"}</strong>
                              </div>
                              <div>
                                <span className="eyebrow">Saved count</span>
                                <strong>{item.click_count}</strong>
                              </div>
                              <div>
                                <span className="eyebrow">First seen</span>
                                <strong>{formatDateTime(item.first_seen_at)}</strong>
                              </div>
                              <div>
                                <span className="eyebrow">Last seen</span>
                                <strong>{formatDateTime(item.last_seen_at)}</strong>
                              </div>
                            </div>
                            <div>
                              <span className="eyebrow">Source sentence</span>
                              <p className="small-copy">{item.source_sentence_text}</p>
                            </div>
                            <div>
                              <span className="eyebrow">Current note</span>
                              <p className="small-copy">
                                Clicked terms can show the source metadata and axis-level SRS state before we trim this view down.
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
            ) : (
              <p className="small-copy">Clicked tokens will appear here with the page and sentence that introduced them.</p>
            )}
      </details>
        </>
      ) : null}
    </RoutePage>
  );
}

