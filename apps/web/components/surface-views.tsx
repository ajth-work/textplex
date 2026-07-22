"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { RoutePage } from "./route-page";
import { useAuth } from "./auth-provider";
import {
  fetchJson,
  formatDateTime,
  legacySurfaceUrl,
  postFormData,
  postJson,
  putJson,
  type ActivitySurfaceResponse,
  type BookAnalysisSurfaceResponse,
  type BookRecord,
  type ImportSurfaceResponse,
  type HostedProfileSurfaceResponse,
  type HostedProfileUpdateRequest,
  type ProfileMigrationRequest,
  type ProfileMigrationResponse,
  type ProgressSurfaceResponse,
  type ProfileSurfaceResponse,
  type SearchSurfaceResponse,
  type SettingsSurfaceResponse,
  type SettingsUpdateRequest,
  type StudySurfaceResponse,
  type ThemeCatalogResponse,
} from "../lib/textplex";
import {
  appThemeLabels,
  appThemeOptions,
  INDIVIDUAL_THEME_PRICE,
  persistAppTheme,
  readStoredAppTheme,
  resolveAppTheme,
  resolveAppThemeFromSettings,
  themeBundles,
  type AppTheme,
} from "../lib/theme";
import { LoadingSkeleton } from "./loading-skeleton";
import { GlobalThemePicker } from "./global-theme-picker";
import { HskSeriesChart } from "./hsk-series-chart";

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
  return (
    <RoutePage
      eyebrow="Activity"
      title="Reading activity feed"
      description="A time-ordered feed of page completions, sentence reads, token lookups, and sessions."
      badge={data ? `${data.event_count} events` : "Live"}
      links={[
        { href: "/progress", label: "Progress" },
        { href: "/study", label: "Study" },
      ]}
      metrics={[
        { label: "Feed", value: data ? String(data.event_count) : "Loading" },
        { label: "State", value: error ? "Error" : data ? "Loaded" : "Loading", detail: error ?? "Derived from learner events" },
      ]}
    >
      {error ? <section className="card feature-card">{error}</section> : null}
      {!data && !error ? <LoadingSkeleton label="Loading activity" /> : null}
      {data ? (
        <section className="card feature-card">
          <h2>Recent events</h2>
          <div className="surface-list">
            {data.events.map((event) => (
              <article key={`${event.kind}-${event.occurred_at}-${event.book_id}-${event.page_number ?? "na"}`} className="surface-list-item">
                <div className="card-topline">
                  <strong>{event.kind.replaceAll("_", " ")}</strong>
                  <span className="muted">{formatDateTime(event.occurred_at)}</span>
                </div>
                <p>{event.title ?? event.book_id}</p>
                <p className="small-copy">{event.detail}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </RoutePage>
  );
}

export function AnalysisSurfaceView({ bookId }: { bookId: string }) {
  const [data, setData] = useState<BookAnalysisSurfaceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    return () => {
      active = false;
    };
  }, [bookId]);

  return (
    <RoutePage
      eyebrow="Analysis"
      title={data?.title ?? "Text analysis summary"}
      description="Difficulty, vocabulary density, and extracted frequency data for the selected book."
      badge={data ? `${data.sentence_count} sentences` : bookId}
      links={[
        { href: "/library", label: "Library" },
        { href: data ? `/reader/${bookId}/1` : "/library", label: "Reader" },
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
            <article className="card feature-card">
              <h2>Top lexical entries</h2>
              <div className="surface-list">
                {data.top_lexical_entries.map((entry) => (
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

  const handleImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);
    setSubmitting(true);

    try {
      let book: BookRecord;
      if (mode === "paste") {
        if (!text.trim()) {
          throw new Error("Paste or type text before processing it.");
        }
        book = await postJson<BookRecord>("/texts/import", {
          text: text.trim(),
          language_code: languageCode,
          title: title.trim() || null,
          author: author.trim() || null,
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
      if (fileInputRef.current) fileInputRef.current.value = "";
      const refreshed = await fetchJson<ImportSurfaceResponse>("/import");
      setData(refreshed);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to import this content.");
    } finally {
      setSubmitting(false);
    }
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
                  <input className="text-input" value={languageCode} onChange={(event) => setLanguageCode(event.target.value)} maxLength={12} required />
                </label>
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
                <Link className="button button-secondary" href={`/reader/${activeBook.id}/1`}>Open reader</Link>
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
      <p className="small-copy profile-legacy-link" data-inventory-id="profile.legacy-link">
        <a href={legacySurfaceUrl}>legacy</a>
      </p>
      {hostedError ? (
        <section className="card feature-card" data-inventory-id="profile.hosted-account-card">
          <h2>Hosted account</h2>
          <p className="small-copy">{hostedError}</p>
        </section>
      ) : null}
      {hostedData ? (
        <section className="card feature-card" data-inventory-id="profile.hosted-account-card">
          <h2>Hosted account</h2>
          <p>{hostedData.user.email ?? hostedData.profile.display_name ?? hostedData.user.id}</p>
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
          <GlobalThemePicker
            initialTheme={resolveAppTheme(settingsMap.get("theme"))}
            entries={data.settings.entries}
          />
          <article className="card feature-card">
            <h2>Preferences</h2>
            <div className="surface-list">
              {data.settings.entries.length > 0 ? (
                data.settings.entries.map((entry) => (
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
            <p className="small-copy">
              Theme: {appThemeLabels[resolveAppTheme(settingsMap.get("theme"))]} • Reader mode: {settingsMap.get("readerMode") ?? "sentence"}
            </p>
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

export function ThemeShopSurfaceView() {
  const [data, setData] = useState<SettingsSurfaceResponse | null>(null);
  const [catalog, setCatalog] = useState<ThemeCatalogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(() => readStoredAppTheme() ?? "neutral");

  useEffect(() => {
    let active = true;
    void fetchJson<SettingsSurfaceResponse>("/settings")
      .then((result) => {
        if (active) {
          setData(result);
          setTheme(resolveAppThemeFromSettings(result.entries));
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load the theme shop.");
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

  async function saveTheme() {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const nextEntries = [
        ...(data?.entries ?? []).filter((entry) => entry.key !== "theme"),
        { key: "theme", value: theme },
      ];
      const result = await putJson<SettingsSurfaceResponse>("/settings", {
        entries: nextEntries,
      } satisfies SettingsUpdateRequest);
      setData(result);
      persistAppTheme(theme);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the theme.");
    } finally {
      setSaving(false);
    }
  }

  const selectedOption = appThemeOptions.find((option) => option.value === theme) ?? appThemeOptions[0];
  const serverThemeMap = new Map(catalog?.themes.map((item) => [item.id, item]) ?? []);
  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  return (
    <RoutePage
      eyebrow="Theme shop"
      title="Find a reading atmosphere that fits"
      description="Browse the complete visual collection for TextPlex. Pick a theme to preview it across the app, then save it to your learner profile."
      badge={`${catalog?.themes.length ?? appThemeOptions.length} themes`}
      links={[
        { href: "/profile", label: "Back to Profile" },
        { href: "/settings", label: "Settings" },
      ]}
      metrics={[
        { label: "Collection", value: `${catalog?.themes.length ?? appThemeOptions.length} themes` },
        { label: "Selected", value: appThemeLabels[theme] },
        { label: "Storage", value: catalog ? "Server catalog" : "Local preview" },
      ]}
    >
      {error ? <section className="card feature-card">{error}</section> : null}
      {!data && !error ? <LoadingSkeleton label="Loading theme shop" /> : null}
      {data ? (
        <section className="card feature-card theme-shop-card">
          <div className="card-topline">
            <div>
              <span className="eyebrow">Your current preview</span>
              <h2>{selectedOption.title}</h2>
            </div>
            <span className="pill">Live preview</span>
          </div>
          <p className="global-theme-intro">{selectedOption.description}</p>
          <div className="theme-bundle-grid" aria-label="Theme bundles">
            {themeBundles.map((bundle) => {
              const individualTotal = bundle.themeValues.length * INDIVIDUAL_THEME_PRICE;
              const savings = individualTotal - bundle.bundlePrice;
              return (
                <article key={bundle.id} className="theme-bundle-card" data-inventory-id="theme-shop.bundle-card">
                  <div className="card-topline">
                    <div>
                      <span className="eyebrow">Collection offer</span>
                      <h3>{bundle.title}</h3>
                    </div>
                    <span className="pill">Save {formatPrice(savings)}</span>
                  </div>
                  <p>{bundle.description}</p>
                  <div className="theme-bundle-themes">
                    {bundle.themeValues.map((value) => <span key={value}>{appThemeLabels[value]}</span>)}
                  </div>
                  <div className="theme-bundle-price-row">
                    <strong>{formatPrice(bundle.bundlePrice)}</strong>
                    <span>{formatPrice(individualTotal)} individually</span>
                  </div>
                  <button className="button button-secondary" type="button" onClick={() => selectTheme(bundle.themeValues[0])}>
                    Preview collection
                  </button>
                </article>
              );
            })}
          </div>
          <div className="theme-shop-grid" role="radiogroup" aria-label="All global app themes">
            {appThemeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`global-theme-option theme-shop-option ${theme === option.value ? "is-selected" : ""}`}
                onClick={() => selectTheme(option.value)}
                role="radio"
                aria-checked={theme === option.value}
              >
                <span className="global-theme-swatch" data-theme={option.value} aria-hidden="true" />
                <span className="global-theme-option-copy">
                  <strong>{option.title}</strong>
                  <span>{option.description}</span>
                  <span>
                    {serverThemeMap.get(option.value)
                      ? serverThemeMap.get(option.value)?.is_owned
                        ? "Owned"
                        : catalog?.mode === "hosted"
                          ? "Preview only"
                          : formatPrice((serverThemeMap.get(option.value)?.price_cents ?? 0) / 100)
                      : formatPrice(option.price)}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="global-theme-footer">
            <p className="small-copy">
              Previewing <strong>{selectedOption.title}</strong>. The preview applies immediately on this device.
            </p>
            <button className="button button-primary" type="button" onClick={() => void saveTheme()} disabled={saving}>
              {saving ? "Saving theme..." : saved ? "Theme saved" : "Save to profile"}
            </button>
          </div>
        </section>
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
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(() => readStoredAppTheme() ?? "neutral");
  const [readerMode, setReaderMode] = useState("sentence");

  useEffect(() => {
    let active = true;
    void fetchJson<SettingsSurfaceResponse>("/settings")
      .then((result) => {
        if (!active) {
          return;
        }
        setData(result);
        const nextTheme = resolveAppThemeFromSettings(result.entries);
        const modeEntry = result.entries.find((entry) => entry.key === "readerMode");
        setTheme(nextTheme);
        if (modeEntry) {
          setReaderMode(modeEntry.value);
        }
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

  async function saveSettings() {
    setSaving(true);
    try {
      const payload: SettingsUpdateRequest = {
        entries: [
          { key: "theme", value: theme },
          { key: "readerMode", value: readerMode },
        ],
      };
      const result = await putJson<SettingsSurfaceResponse>("/settings", payload);
      setData(result);
      persistAppTheme(theme);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoutePage
      eyebrow="Settings"
      title="Profile and app preferences"
      description={authenticatedUser ? "Display preferences are stored in the authenticated hosted profile." : authConfigured ? "Sign in to load and save hosted preferences, or continue in local-only mode." : "Display preferences and local reading behavior are stored in the local profile database."}
      badge="Live"
      links={[
        { href: "/library", label: "Library" },
        { href: "/activity", label: "Activity" },
      ]}
      metrics={[
        { label: "Profile", value: authenticatedUser ? "Hosted account" : authConfigured ? "Sign-in available" : "Local first" },
        { label: "Theme", value: data ? appThemeLabels[theme] : "Loading" },
        { label: "Reader mode", value: data ? readerMode : "Loading" },
      ]}
    >
      {error ? <section className="card feature-card">{error}</section> : null}
      {!data && !error ? <LoadingSkeleton label="Loading settings" /> : null}
      <section className="card feature-card">
        <h2>Preferences</h2>
        {data ? <div className="surface-form">
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
          <label>
            Reader mode
            <select className="text-input" value={readerMode} onChange={(event) => setReaderMode(event.target.value)}>
              <option value="sentence">Sentence</option>
              <option value="page">Page</option>
              <option value="token">Token</option>
            </select>
          </label>
          <button className="button button-primary" type="button" onClick={() => void saveSettings()} disabled={saving}>
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div> : null}
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

  useEffect(() => {
    let active = true;
    void fetchJson<StudySurfaceResponse>("/study")
      .then((result) => {
        if (active) {
          setData(result);
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
        { label: "State", value: error ? "Error" : data ? "Loaded" : "Loading", detail: "Derived from vocabulary progress" },
      ]}
    >
      {error ? <section className="card feature-card">{error}</section> : null}
      {!data && !error ? <LoadingSkeleton label="Loading study queue" /> : null}
      {data ? (
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
      ) : null}
    </RoutePage>
  );
}

