"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { RoutePage } from "./route-page";
import {
  demoBookExtractionResult,
  demoBookRecord,
  demoLibraryBooks,
  demoLearningProfileSummary,
} from "../lib/demo-data";
import type {
  BookAnalysisSurfaceResponse,
  ImportSurfaceResponse,
  ProgressSurfaceResponse,
  ProfileSurfaceResponse,
  SearchSurfaceResponse,
  SettingsSurfaceResponse,
  StudySurfaceResponse,
} from "../lib/textplex";

export function MockActivitySurfaceView() {
  return (
    <RoutePage
      eyebrow="Activity"
      title="Reading activity feed"
      description="A static demo feed for page completions, sentence reads, and token lookups."
      badge="Demo"
      links={[
        { href: "/progress", label: "Progress" },
        { href: "/study", label: "Study" },
      ]}
      metrics={[
        { label: "Feed", value: "3" },
        { label: "State", value: "Demo", detail: "Static preview data" },
      ]}
    >
      <section className="card feature-card">
        <h2>Recent events</h2>
        <div className="surface-list">
          <article className="surface-list-item">
            <p>reading session - Session active for 420s</p>
            <p className="small-copy">Three Body Demo - Jul 9, 2026</p>
          </article>
          <article className="surface-list-item">
            <p>page read - Page 2 read for 45s</p>
            <p className="small-copy">Three Body Demo - Jul 9, 2026</p>
          </article>
          <article className="surface-list-item">
            <p>sentence read - Demo sentence focus</p>
            <p className="small-copy">Three Body Demo - Jul 9, 2026</p>
          </article>
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
  const data = {
    profile: demoLearningProfileSummary,
    books: demoLibraryBooks.map((book, index) => ({
      book_id: book.id,
      title: book.title,
      page_reads: index + 1,
      sentence_reads: index + 2,
      active_seconds: 120 + index * 45,
    })),
    settings: {
      entries: [
        { key: "theme", value: "night" },
        { key: "readerMode", value: "sentence" },
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
  const [data, setData] = useState<SettingsSurfaceResponse>({
    entries: [
      { key: "theme", value: "night" },
      { key: "readerMode", value: "sentence" },
    ],
  });
  const [theme, setTheme] = useState("night");
  const [readerMode, setReaderMode] = useState("sentence");

  function saveSettings() {
    setData({
      entries: [
        { key: "theme", value: theme },
        { key: "readerMode", value: readerMode },
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
        { label: "Theme", value: theme },
        { label: "Reader mode", value: readerMode },
      ]}
    >
      <section className="card feature-card">
        <h2>Preferences</h2>
        <div className="surface-form">
          <label>
            Theme
            <select className="text-input" value={theme} onChange={(event) => setTheme(event.target.value)}>
              <option value="day">Day</option>
              <option value="night">Night</option>
              <option value="sepia">Sepia</option>
              <option value="forest">Forest</option>
            </select>
          </label>
          <label>
            Reader mode
            <select className="text-input" value={readerMode} onChange={(event) => setReaderMode(event.target.value)}>
              <option value="sentence">Sentence</option>
              <option value="page">Page</option>
              <option value="token">Token</option>
            </select>
          </label>
          <button className="button button-primary" type="button" onClick={saveSettings}>
            Save settings
          </button>
        </div>
        <p className="small-copy">Stored settings: {data.entries.length}</p>
      </section>
    </RoutePage>
  );
}

export function MockStudySurfaceView() {
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
        manual_override: null,
        first_seen_at: "2026-07-09T12:15:00Z",
        last_seen_at: "2026-07-09T12:15:00Z",
      },
    ],
  } satisfies StudySurfaceResponse;

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
        { label: "State", value: "Demo", detail: "Static preview data" },
      ]}
    >
      <section className="card feature-card">
        <h2>Queued items</h2>
        <div className="surface-list">
          {data.queued_items.map((item) => (
            <article key={`${item.language_code}-${item.lemma}`} className="surface-list-item">
              <div className="card-topline">
                <strong>{item.lemma}</strong>
                <span className="muted">{item.state}</span>
              </div>
              <p className="small-copy">
                Raw {item.raw_exposures} - Weighted {item.weighted_exposure.toFixed(1)} - Pages {item.unique_pages} - Books {item.unique_books}
              </p>
            </article>
          ))}
        </div>
      </section>
    </RoutePage>
  );
}

