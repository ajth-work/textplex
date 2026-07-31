"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { RoutePage } from "./route-page";
import {
  demoBookExtractionResult,
  demoBookRecord,
  demoLibraryBooks,
  demoLearningProfileSummary,
} from "../lib/demo-data";
import {
  appThemeLabels,
  appThemeOptions,
  DEFAULT_APP_THEME_GRID_ENABLED,
  DEFAULT_APP_THEME_PATTERN_OPACITY,
  persistAppTheme,
  persistAppThemeGridEnabled,
  persistAppThemePatternOpacity,
  readStoredAppTheme,
  readStoredAppThemeGridEnabled,
  readStoredAppThemePatternOpacity,
  resolveAppTheme,
  type AppTheme,
} from "../lib/theme";
import {
  formatDateTime,
} from "../lib/textplex";
import type {
  BookAnalysisSurfaceResponse,
  ImportSurfaceResponse,
  ProgressSurfaceResponse,
  ProfileSurfaceResponse,
  SearchSurfaceResponse,
  SettingsSurfaceResponse,
  StudySurfaceResponse,
} from "../lib/textplex";
import { GlobalThemePicker } from "./global-theme-picker";
import { ReadingProgressChart } from "./reading-progress-chart";
import { DueReviewChart } from "./due-review-chart";
import { StudyDueLanguageGroups } from "./study-due-language-groups";

const demoReadingHistory = [
  { day_index: 1, day: "2026-07-08", pages_read: 1, cumulative_pages: 1, sentences_read: 2, cumulative_sentences: 2 },
  { day_index: 2, day: "2026-07-09", pages_read: 1, cumulative_pages: 2, sentences_read: 3, cumulative_sentences: 5 },
];

export function MockActivitySurfaceView() {
  return (
    <RoutePage
      eyebrow="Activity"
      title="Reading activity feed"
      description="Books and articles are ordered by the most recent reading activity, with their individual events available on demand."
      badge="Demo"
      links={[
        { href: "/progress", label: "Progress" },
        { href: "/study", label: "Study" },
      ]}
      metrics={[
        { label: "Books", value: "1" },
        { label: "State", value: "Demo", detail: "Static preview data" },
      ]}
    >
      <section className="feature-grid activity-progress-grid" aria-label="Reading progress over time">
        <ReadingProgressChart
          inventoryId="activity.pages-progress-chart"
          title="Pages read over time"
          description="Cumulative pages completed across multi-page books."
          points={demoReadingHistory}
          metric="pages"
          emptyMessage="Page progress appears after a multi-page book is read."
        />
        <ReadingProgressChart
          inventoryId="activity.sentences-progress-chart"
          title="Sentences read over time"
          description="Cumulative sentences completed across books and articles."
          points={demoReadingHistory}
          metric="sentences"
          emptyMessage="Sentence progress appears after a sentence is completed."
        />
      </section>
      <section className="card feature-card" data-inventory-id="activity.recent-events-card">
        <h2>Recently read</h2>
        <p className="small-copy">Open a book or article to see its reading events.</p>
        <div className="activity-book-list" data-inventory-id="activity.recent-books-list">
          <details className="activity-book-group" data-inventory-id="activity.recent-book-group">
            <summary className="activity-book-summary">
              <span className="activity-book-summary-copy">
                <strong>Three Body Demo</strong>
                <span className="small-copy">Last read Jul 9, 2026</span>
              </span>
              <span className="pill">3 events</span>
            </summary>
            <div className="surface-list" data-inventory-id="activity.event-list">
              <article className="surface-list-item" data-inventory-id="activity.event-item">
                <div className="card-topline">
                  <strong>reading session</strong>
                  <span className="muted">Jul 9, 2026</span>
                </div>
                <p>Session active for 420s</p>
              </article>
              <article className="surface-list-item" data-inventory-id="activity.event-item">
                <div className="card-topline">
                  <strong>page read</strong>
                  <span className="muted">Jul 9, 2026</span>
                </div>
                <p>Page 2 read for 45s</p>
              </article>
              <article className="surface-list-item" data-inventory-id="activity.event-item">
                <div className="card-topline">
                  <strong>sentence read</strong>
                  <span className="muted">Jul 9, 2026</span>
                </div>
                <p>Demo sentence focus</p>
              </article>
            </div>
          </details>
        </div>
      </section>
    </RoutePage>
  );
}

export function MockAnalysisSurfaceView({ bookId }: { bookId: string }) {
  const summary = demoBookExtractionResult;
  const analysis = {
    book_id: demoBookRecord.id,
    title: demoBookRecord.title,
    author: demoBookRecord.author,
    language_code: demoBookRecord.language_code,
    total_pages: demoBookRecord.total_pages,
    extracted_page_count: demoBookRecord.extracted_page_count,
    sentence_count: summary.pages.reduce((total, page) => total + page.sentences.length, 0),
    lexical_entry_count: summary.lexical_entries.length,
    token_occurrence_count: summary.token_occurrences.length,
    has_extraction: true,
    extraction_progress_percent: 100,
    metrics: {
      metric_status: "ready",
      assessment_system: "HSK",
      text_expected_level: 4.2,
      text_expected_level_label: "HSK 4.2",
      sentence_average_level: 4.2,
      page_average_level: 4.1,
      character_weighted_average_level: 4.0,
      eligible_character_count: 232,
      known_character_count: 198,
      unknown_character_count: 34,
      chinese_word_occurrences: 145,
      unknown_word_occurrences: 18,
      partial_word_occurrences: 21,
      sentence_count_with_level: 8,
      page_count_with_level: summary.pages.length,
      distribution: [
        { label: "HSK 1", character_occurrences: 32, percentage: 16.2 },
        { label: "HSK 2", character_occurrences: 48, percentage: 24.2 },
        { label: "HSK 3", character_occurrences: 63, percentage: 31.8 },
        { label: "HSK 4", character_occurrences: 55, percentage: 27.8 },
      ],
      comprehension_status: "not_available",
      estimated_comprehension_percent: null,
      recommendation: "This expected level is derived from HSK character evidence; comprehension still requires learner data.",
    },
    sentence_hsk_series: [],
    page_hsk_series: [],
    top_lexical_entries: summary.lexical_entries.slice(0, 10),
  } satisfies BookAnalysisSurfaceResponse;

  return (
    <RoutePage
      eyebrow="Analysis"
      title={analysis.title}
      description="Demo analysis for the packaged sample book."
      badge={`${analysis.sentence_count} sentences`}
      links={[
        { href: "/library", label: "Library" },
        { href: `/reader/${bookId}/1`, label: "Reader" },
      ]}
      metrics={[
        { label: "Pages", value: `${analysis.extracted_page_count}/${analysis.total_pages}` },
        { label: "Lexical entries", value: String(analysis.lexical_entry_count) },
        { label: "Tokens", value: String(analysis.token_occurrence_count) },
      ]}
    >
      <section className="feature-grid">
        <article className="card feature-card">
          <h2>Top lexical entries</h2>
          <div className="surface-list">
            {analysis.top_lexical_entries.map((entry) => (
              <div key={entry.lemma} className="surface-list-item">
                <div className="card-topline">
                  <strong>{entry.display_form}</strong>
                  <span className="muted">{entry.frequency_in_book}x</span>
                </div>
                <p className="small-copy">
                  First seen {entry.first_page ?? "?"} - Last seen {entry.last_page ?? "?"}
                </p>
              </div>
            ))}
          </div>
        </article>
        <article className="card feature-card">
          <h2>Summary</h2>
          <p>Book: {analysis.book_id}</p>
          <p>Language: {analysis.language_code}</p>
          <p>Status: Extraction available</p>
        </article>
      </section>
    </RoutePage>
  );
}

export function MockImportSurfaceView() {
  const data = {
    default_language: "zh",
    supported_inputs: ["pdf", "paste"],
    can_upload_pdf: true,
    can_paste_text: true,
    recent_books: demoLibraryBooks.map((book) => ({
      book_id: book.id,
      title: book.title,
      status: book.status,
      language_code: book.language_code,
      created_at: book.created_at,
      processed_at: book.processed_at,
    })),
  } satisfies ImportSurfaceResponse;

  return (
    <RoutePage
      eyebrow="Import"
      title="Paste text or upload a book"
      description="Demo import metadata for the packaged sample book."
      badge={data.default_language.toUpperCase()}
      links={[
        { href: "/library", label: "Library" },
        { href: "/progress", label: "Progress" },
      ]}
      metrics={[
        { label: "Inputs", value: data.supported_inputs.join(", ") },
        { label: "Uploads", value: data.can_upload_pdf ? "Enabled" : "Disabled" },
        { label: "Paste", value: data.can_paste_text ? "Enabled" : "Disabled" },
      ]}
    >
      <section className="card feature-card">
        <h2>Recent books</h2>
        <div className="surface-list">
          {data.recent_books.map((book) => (
            <article key={book.book_id} className="surface-list-item">
              <div className="card-topline">
                <strong>{book.title}</strong>
                <span className="muted">{book.status.replaceAll("_", " ")}</span>
              </div>
              <p className="small-copy">{book.language_code.toUpperCase()} - Demo import</p>
            </article>
          ))}
        </div>
      </section>
    </RoutePage>
  );
}

export function MockProgressSurfaceView() {
  const data = {
    profile: demoLearningProfileSummary,
    books: [
      {
        book_id: demoBookRecord.id,
        title: demoBookRecord.title,
        page_reads: 1,
        sentence_reads: 2,
        active_seconds: 120,
        total_pages: demoBookRecord.total_pages,
        furthest_page: 1,
        resume_page: 1,
        resume_sentence_order: 1,
        total_sentences: demoBookExtractionResult.pages.reduce((total, page) => total + page.sentences.length, 0),
        sentences_read: 2,
        progress_percent: 33,
        progress_unit: "pages" as const,
        last_read_at: "2026-07-29T12:00:00Z",
      },
    ],
  } satisfies ProgressSurfaceResponse;

  return (
    <RoutePage
      eyebrow="Progress"
      title="Reading and vocabulary progress"
      description="Demo progress metrics from the packaged sample book."
      badge={`${data.profile.active_books} books`}
      links={[
        { href: "/study", label: "Study" },
        { href: "/activity", label: "Activity" },
      ]}
      metrics={[
        { label: "Sessions", value: String(data.profile.reading_sessions) },
        { label: "Sentences", value: String(data.profile.sentence_reads) },
        { label: "Vocabulary rows", value: String(data.profile.vocabulary_progress_rows) },
      ]}
    >
      <section className="feature-grid">
        <article className="card feature-card">
          <h2>Profile summary</h2>
          <p>Unique words: {data.profile.unique_words_seen}</p>
          <p>Unique characters: {data.profile.unique_characters_seen}</p>
          <p>Avg sec/word: {data.profile.average_seconds_per_word?.toFixed(2) ?? "â€”"}</p>
          <p>Avg sec/char: {data.profile.average_seconds_per_character?.toFixed(2) ?? "â€”"}</p>
        </article>
        {data.profile.learning_tracks?.length ? (
          <article className="card feature-card">
            <h2>Learning track</h2>
            <p>
              {(data.profile.learning_tracks.find((track) => track.code === data.profile.selected_track_code) ?? data.profile.learning_tracks[0]).label} · {(data.profile.learning_tracks.find((track) => track.code === data.profile.selected_track_code) ?? data.profile.learning_tracks[0]).level}
            </p>
            <p>{(data.profile.learning_tracks.find((track) => track.code === data.profile.selected_track_code) ?? data.profile.learning_tracks[0]).subtitle}</p>
            <p>{(data.profile.learning_tracks.find((track) => track.code === data.profile.selected_track_code) ?? data.profile.learning_tracks[0]).next_step}</p>
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
              </div>
            ))}
          </div>
        </article>
      </section>
    </RoutePage>
  );
}

export function MockProfileSurfaceView() {
  const [currentTheme, setCurrentTheme] = useState<AppTheme>("neutral");
  useEffect(() => {
    setCurrentTheme(readStoredAppTheme() ?? "neutral");
  }, []);
  const accountLabel = "demo.reader";
  const data = {
    profile: demoLearningProfileSummary,
    books: demoLibraryBooks.map((book, index) => ({
      book_id: book.id,
      title: book.title,
      page_reads: index + 1,
      sentence_reads: index + 2,
      active_seconds: 120 + index * 45,
      total_pages: book.total_pages,
      furthest_page: Math.min(book.total_pages, index + 1),
      resume_page: Math.min(book.total_pages, index + 1),
      resume_sentence_order: 1,
      total_sentences: demoBookExtractionResult.pages.reduce((total, page) => total + page.sentences.length, 0),
      sentences_read: index + 2,
      progress_percent: Math.round(((index + 1) / Math.max(book.total_pages, 1)) * 100),
      progress_unit: "pages" as const,
      last_read_at: "2026-07-29T12:00:00Z",
    })),
    settings: {
      entries: [
        { key: "theme", value: currentTheme },
        { key: "ocrProvider", value: "openai" },
      ],
    },
  } satisfies ProfileSurfaceResponse;

  return (
    <RoutePage
      eyebrow="Profile"
      title="User profile and reading history"
      description="Demo learner summary, progress history, and stored preferences for the packaged sample build."
      badge={`${data.profile.active_books} books`}
      links={[
        { href: "/progress", label: "Progress" },
        { href: "/settings", label: "Settings" },
      ]}
      metrics={[
        { label: "Sessions", value: String(data.profile.reading_sessions) },
        { label: "Page reads", value: String(data.profile.page_reads) },
        { label: "Sentence reads", value: String(data.profile.sentence_reads) },
      ]}
    >
      <section className="card feature-card" data-inventory-id="profile.hosted-account-card">
        <h2>Hosted account</h2>
        <p>Hello, {accountLabel}</p>
        <p className="small-copy">Signed in as demo.reader@example.com. This demo account owns the packaged sample profile and settings.</p>
        <p className="small-copy">zh · hsk · HSK 3</p>
        <p className="small-copy">Hosted settings: {data.settings.entries.length}</p>
      </section>
      <section className="card feature-card" data-inventory-id="profile.migration-card">
        <h2>Local profile migration</h2>
        <p className="small-copy">Demo migration preview: local sample data is ready for a non-destructive account merge into the demo user zero account.</p>
        <button className="button button-secondary" type="button" disabled>Demo preview only</button>
      </section>
      <section className="feature-grid">
          <article className="card feature-card">
            <h2>Learning summary</h2>
          <p>Unique words: {data.profile.unique_words_seen}</p>
          <p>Unique characters: {data.profile.unique_characters_seen}</p>
          <p>Today&apos;s sentence reads: {data.profile.today_sentence_reads}</p>
          <p>Today&apos;s token exposures: {data.profile.today_token_exposures}</p>
          <p>Avg sec/sentence: {data.profile.average_seconds_per_sentence?.toFixed(2) ?? "â€”"}</p>
          <p>Avg sec/word: {data.profile.average_seconds_per_word?.toFixed(2) ?? "â€”"}</p>
          <p>Avg sec/char: {data.profile.average_seconds_per_character?.toFixed(2) ?? "â€”"}</p>
        </article>
        {data.profile.learning_tracks?.length ? (
          <article className="card feature-card">
            <h2>Selected track</h2>
            <p>
              {(data.profile.learning_tracks.find((track) => track.code === data.profile.selected_track_code) ?? data.profile.learning_tracks[0]).label} · {(data.profile.learning_tracks.find((track) => track.code === data.profile.selected_track_code) ?? data.profile.learning_tracks[0]).level}
            </p>
            <p>{(data.profile.learning_tracks.find((track) => track.code === data.profile.selected_track_code) ?? data.profile.learning_tracks[0]).subtitle}</p>
            <p>{(data.profile.learning_tracks.find((track) => track.code === data.profile.selected_track_code) ?? data.profile.learning_tracks[0]).next_step}</p>
          </article>
          ) : null}
          <GlobalThemePicker initialTheme={currentTheme} entries={data.settings.entries} />
          <article className="card feature-card">
          <h2>Preferences</h2>
          <div className="surface-list">
            {data.settings.entries.map((entry) => (
              <div key={entry.key} className="surface-list-item">
                <div className="card-topline">
                  <strong>{entry.key}</strong>
                  <span className="muted">{entry.value}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="card feature-card">
          <h2>Book activity</h2>
          <div className="surface-list">
            {data.books.map((book) => (
              <div key={book.book_id} className="surface-list-item">
                <div className="card-topline">
                  <strong>{book.title}</strong>
                  <span className="muted">{book.active_seconds}s</span>
                </div>
                <p className="small-copy">
                  {book.page_reads} page reads â€¢ {book.sentence_reads} sentence reads
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </RoutePage>
  );
}

export function MockSearchSurfaceView() {
  const [query, setQuery] = useState("");
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

  const data = useMemo<SearchSurfaceResponse | null>(() => {
    const normalized = query.trim();
    if (!normalized) {
      return null;
    }
    return {
      query: normalized,
      result_count: 2,
      results: [
        {
          kind: "book",
          book_id: demoBookRecord.id,
          book_title: demoBookRecord.title,
          page_number: null,
          sentence_order: null,
          lemma: null,
          surface_form: null,
          snippet: `${demoBookRecord.title} - ${demoBookRecord.author}`,
          score: 100,
        },
        {
          kind: "lexical_entry",
          book_id: demoBookRecord.id,
          book_title: demoBookRecord.title,
          page_number: 1,
          sentence_order: 1,
          lemma: normalized,
          surface_form: normalized,
          snippet: `Demo search hit for ${normalized}`,
          score: 90,
        },
      ],
    };
  }, [query]);

  function runSearch(nextQuery: string) {
    const normalized = nextQuery.trim();
    if (!normalized) {
      router.replace("/search");
      setQuery("");
      return;
    }
    router.replace(`/search?q=${encodeURIComponent(normalized)}`);
    setQuery(normalized);
  }

  return (
    <RoutePage
      eyebrow="Search"
      title="Search across books and vocabulary"
      description="Demo search over the packaged book data."
      badge={data ? `${data.result_count} results` : "Demo"}
      links={[
        { href: "/library", label: "Library" },
        { href: "/progress", label: "Progress" },
      ]}
      metrics={[
        { label: "Scope", value: "Books, tokens, history" },
        { label: "Query", value: query || "..." },
        { label: "State", value: "Demo" },
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
          <button className="button button-primary" type="button" onClick={() => runSearch(query)}>
            Search
          </button>
        </div>
      </section>
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

export function MockSettingsSurfaceView() {
  const initialTheme: AppTheme = "neutral";
  const [data, setData] = useState<SettingsSurfaceResponse>({
    entries: [
      { key: "theme", value: initialTheme },
      { key: "themeGridEnabled", value: DEFAULT_APP_THEME_GRID_ENABLED ? "on" : "off" },
      { key: "themePatternOpacity", value: String(DEFAULT_APP_THEME_PATTERN_OPACITY) },
    ],
  });
  const [theme, setTheme] = useState<AppTheme>(initialTheme);
  const [gridEnabled, setGridEnabled] = useState(DEFAULT_APP_THEME_GRID_ENABLED);
  const [patternOpacity, setPatternOpacity] = useState(DEFAULT_APP_THEME_PATTERN_OPACITY);

  useEffect(() => {
    const storedTheme = readStoredAppTheme() ?? "neutral";
    const storedGridEnabled = readStoredAppThemeGridEnabled() ?? DEFAULT_APP_THEME_GRID_ENABLED;
    const storedPatternOpacity = readStoredAppThemePatternOpacity() ?? DEFAULT_APP_THEME_PATTERN_OPACITY;
    setTheme(storedTheme);
    setGridEnabled(storedGridEnabled);
    setPatternOpacity(storedPatternOpacity);
    setData({
      entries: [
        { key: "theme", value: storedTheme },
        { key: "themeGridEnabled", value: storedGridEnabled ? "on" : "off" },
        { key: "themePatternOpacity", value: String(storedPatternOpacity) },
      ],
    });
  }, []);

  function saveSettings() {
    persistAppTheme(theme);
    persistAppThemeGridEnabled(gridEnabled);
    persistAppThemePatternOpacity(patternOpacity);
    setData({
      entries: [
        { key: "theme", value: theme },
        { key: "themeGridEnabled", value: gridEnabled ? "on" : "off" },
        { key: "themePatternOpacity", value: String(patternOpacity) },
      ],
    });
  }

  return (
    <RoutePage
      eyebrow="Settings"
      title="Profile and app preferences"
      description="Demo preferences for the packaged sample build."
      badge="Demo"
      links={[
        { href: "/library", label: "Library" },
        { href: "/activity", label: "Activity" },
      ]}
      metrics={[
        { label: "Profile", value: "Local first" },
        { label: "Theme", value: appThemeLabels[theme] },
      ]}
    >
      <section className="card feature-card">
          <h2>Preferences</h2>
          <div className="surface-form">
            <label>
              App theme
              <select className="text-input" value={theme} onChange={(event) => setTheme(resolveAppTheme(event.target.value))}>
                {appThemeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.title}
                  </option>
                ))}
              </select>
            </label>
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
                }}
                aria-label="Theme artwork opacity"
              />
              <span className="small-copy">Controls the canvas artwork only. Cards and reading text stay fully opaque.</span>
            </label>
            <label className="theme-grid-toggle">
              <input
                type="checkbox"
                checked={gridEnabled}
                onChange={(event) => {
                  const nextGridEnabled = event.target.checked;
                  setGridEnabled(nextGridEnabled);
                  persistAppThemeGridEnabled(nextGridEnabled);
                }}
              />
              <span>
                <strong>Show canvas grid</strong>
                <small>Toggle the fixed background grid without changing wallpaper, gradients, or cards.</small>
              </span>
            </label>
            <button className="button button-primary" type="button" onClick={saveSettings}>
              Save settings
            </button>
          </div>
          <p className="small-copy">Stored settings: {data.entries.length}</p>
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

export function MockStudySurfaceView() {
  const [selectedStudyItemKey, setSelectedStudyItemKey] = useState<string | null>(null);
  const data = {
    queue_size: 2,
    queued_items: [
      {
        language_code: "zh",
        lemma: "æˆ‘",
        raw_exposures: 5,
        weighted_exposure: 2.4,
        unique_pages: 2,
        unique_books: 1,
        help_requests: 0,
        state: "learning",
        confidence_score: 0.42,
        next_due_at: "2026-08-01T06:00:00Z",
        manual_override: null,
        first_seen_at: "2026-07-09T12:00:00Z",
        last_seen_at: "2026-07-09T12:10:00Z",
      },
      {
        language_code: "zh",
        lemma: "å®‡å®™",
        raw_exposures: 3,
        weighted_exposure: 1.8,
        unique_pages: 1,
        unique_books: 1,
        help_requests: 0,
        state: "new",
        confidence_score: 0.2,
        next_due_at: "2026-08-01T18:00:00Z",
        manual_override: null,
        first_seen_at: "2026-07-09T12:15:00Z",
        last_seen_at: "2026-07-09T12:15:00Z",
        },
      ],
      study_item_count: 3,
      study_programs: [
        {
          language_code: "ru",
          language_label: "Russian",
          program_code: "ru-core",
          program_label: "Russian starter program",
          program_source_label: "RU5000",
          level_count: 1,
          levels: [
            {
              level_code: "level-1",
              level_label: "Level 1",
              item_count: 3,
              introduction_note: "Intro frequency core from RU5000.",
              items: [
                {
                  language_code: "ru",
                  language_label: "Russian",
                  program_code: "ru-core",
                  program_label: "Russian starter program",
                  program_source_label: "RU5000",
                  level_code: "level-1",
                  level_label: "Level 1",
                  lemma: "и",
                  display_form: "и",
                  pronunciation: "i",
                  definition_short: "and",
                  proficiency_level: "TRKI A1",
                  frequency_rank: 2,
                  progress_state: "new" as const,
                  confidence_score: null,
                  saved_count: 0,
                  first_seen_at: null,
                  last_seen_at: null,
                },
                {
                  language_code: "ru",
                  language_label: "Russian",
                  program_code: "ru-core",
                  program_label: "Russian starter program",
                  program_source_label: "RU5000",
                  level_code: "level-1",
                  level_label: "Level 1",
                  lemma: "в",
                  display_form: "в",
                  pronunciation: "v",
                  definition_short: "in; into",
                  proficiency_level: "TRKI A1",
                  frequency_rank: 4,
                  progress_state: "learning" as const,
                  confidence_score: 0.28,
                  saved_count: 1,
                  first_seen_at: "2026-07-09T12:00:00Z",
                  last_seen_at: "2026-07-09T12:10:00Z",
                },
                {
                  language_code: "ru",
                  language_label: "Russian",
                  program_code: "ru-core",
                  program_label: "Russian starter program",
                  program_source_label: "RU5000",
                  level_code: "level-1",
                  level_label: "Level 1",
                  lemma: "дом",
                  display_form: "дом",
                  pronunciation: "dom",
                  definition_short: "house",
                  proficiency_level: "TRKI A1",
                  frequency_rank: 8,
                  progress_state: "review" as const,
                  confidence_score: 0.63,
                  saved_count: 2,
                  first_seen_at: "2026-07-09T12:00:00Z",
                  last_seen_at: "2026-07-09T12:10:00Z",
                },
              ],
            },
          ],
        },
      ],
      study_groups: [
        {
          language_code: "zh",
          language_label: "Chinese",
          item_count: 2,
          items: [
            {
              language_code: "zh",
              language_label: "Chinese",
              lemma: "我",
              display_form: "我",
              source_book_id: demoBookRecord.id,
              source_book_title: demoBookRecord.title,
              source_page_number: 1,
              source_sentence_order: 1,
              source_token_order: 1,
              source_surface_form: "我",
              source_sentence_text: "我喜欢阅读。",
              pronunciation: null,
              romanization: "wo3",
              definition_short: "I; me",
              proficiency_level: "HSK 1",
              click_count: 2,
              first_seen_at: "2026-07-09T12:00:00Z",
              last_seen_at: "2026-07-09T12:10:00Z",
            },
            {
              language_code: "zh",
              language_label: "Chinese",
              lemma: "宇宙",
              display_form: "宇宙",
              source_book_id: demoBookRecord.id,
              source_book_title: demoBookRecord.title,
              source_page_number: 2,
              source_sentence_order: 1,
              source_token_order: 3,
              source_surface_form: "宇宙",
              source_sentence_text: "宇宙很大。",
              pronunciation: null,
              romanization: "yu3 zhou4",
              definition_short: "universe",
              proficiency_level: "HSK 3",
              click_count: 1,
              first_seen_at: "2026-07-09T12:15:00Z",
              last_seen_at: "2026-07-09T12:15:00Z",
            },
          ],
        },
        {
          language_code: "ja",
          language_label: "Japanese",
          item_count: 1,
          items: [
            {
              language_code: "ja",
              language_label: "Japanese",
              lemma: "たのしい",
              display_form: "たのしい",
              source_book_id: demoBookRecord.id,
              source_book_title: demoBookRecord.title,
              source_page_number: 3,
              source_sentence_order: 2,
              source_token_order: 4,
              source_surface_form: "たのしい",
              source_sentence_text: "たのしい時間です。",
              pronunciation: "たのしい",
              romanization: "tanoshii",
              definition_short: "fun; enjoyable",
              proficiency_level: "JLPT N5",
              click_count: 1,
              first_seen_at: "2026-07-09T12:20:00Z",
              last_seen_at: "2026-07-09T12:20:00Z",
            },
          ],
        },
      ],
  } satisfies StudySurfaceResponse;

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

  return (
    <RoutePage
      eyebrow="Study"
      title="Review queue and study loop"
      description="Demo due-item queue for the packaged sample book."
      badge={`${data.queue_size} queued`}
      links={[
        { href: "/progress", label: "Progress" },
        { href: "/activity", label: "Activity" },
      ]}
      metrics={[
        { label: "Queue", value: String(data.queue_size) },
        { label: "Saved", value: String(data.study_item_count), detail: "Grouped by language" },
      ]}
    >
      <section className="card feature-card" data-inventory-id="study.programs-card">
        <h2>Program introduction</h2>
        <p className="small-copy">
          Curated level vocabulary from the active language programs. Level 1 starts from the highest-value frequency slice.
        </p>
        <div className="study-program-groups">
          {data.study_programs.map((program) => (
            <details key={program.program_code} className="study-program-group" data-inventory-id="study.program-group" open>
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
                    language: program.language_code,
                    program: program.program_code,
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
                          const pronunciation = item.pronunciation ?? "-";
                          const englishMeaning = item.definition_short ?? "-";

                          return (
                            <article
                              key={`${program.program_code}-${level.level_code}-${item.lemma}`}
                              className="study-program-item"
                              data-inventory-id="study.program-item"
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
      </section>
      <details className="card feature-card study-queue-card" data-inventory-id="study.queue-card" open>
        <summary className="study-queue-card-summary" data-inventory-id="study.queue-card-toggle">
          <div>
            <h2>Due items</h2>
            <p className="small-copy">Tap a language card for review pills and timing.</p>
          </div>
        </summary>
        <DueReviewChart items={data.queued_items} />
        <StudyDueLanguageGroups items={data.queued_items} />
        <div className="study-queue-actions">
          <Link className="button button-secondary" href="/study/practice?mode=review" data-inventory-id="study.review-practice-link">
            Start review session
          </Link>
        </div>
      </details>
      <details className="card feature-card study-saved-vocabulary-card" data-inventory-id="study.saved-vocabulary-card" open>
        <summary className="study-saved-vocabulary-card-summary" data-inventory-id="study.saved-vocabulary-card-summary">
          <div>
            <h2>Saved vocabulary</h2>
            <p className="small-copy">Language-grouped terms saved from the reader with source metadata.</p>
          </div>
        </summary>
        <div className="study-language-groups">
          {data.study_groups.map((group) => (
            <details key={group.language_code} className="study-language-group" data-inventory-id="study.language-group">
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
                    <article key={itemKey} className="surface-list-item study-saved-item" data-inventory-id="study.saved-item">
                      <button
                        type="button"
                        className={`study-saved-item-toggle ${expanded ? "is-expanded" : ""}`}
                        onClick={() => {
                          setSelectedStudyItemKey((current) => (current === itemKey ? null : itemKey));
                        }}
                        aria-expanded={expanded}
                        aria-controls={`study-item-details-${itemKey}`}
                        data-inventory-id="study.saved-item-toggle"
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
                          data-inventory-id="study.saved-item-details"
                        >
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
                              Demo metadata dump for the study surface. We can simplify this once we see which fields are actually useful.
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
      </details>
    </RoutePage>
  );
}

