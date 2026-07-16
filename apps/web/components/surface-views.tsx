"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { RoutePage } from "./route-page";
import {
  fetchJson,
  formatDateTime,
  putJson,
  type ActivitySurfaceResponse,
  type BookAnalysisSurfaceResponse,
  type ImportSurfaceResponse,
  type ProgressSurfaceResponse,
  type ProfileSurfaceResponse,
  type SearchSurfaceResponse,
  type SettingsSurfaceResponse,
  type SettingsUpdateRequest,
  type StudySurfaceResponse,
} from "../lib/textplex";

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
        { label: "Feed", value: data ? String(data.event_count) : "..." },
        { label: "State", value: error ? "Error" : data ? "Loaded" : "Loading", detail: error ?? "Derived from learner events" },
      ]}
    >
      {error ? <section className="card feature-card">{error}</section> : null}
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
        { label: "Pages", value: data ? `${data.extracted_page_count}/${data.total_pages}` : "..." },
        { label: "Lexical entries", value: data ? String(data.lexical_entry_count) : "..." },
        { label: "Tokens", value: data ? String(data.token_occurrence_count) : "..." },
      ]}
    >
      {error ? <section className="card feature-card">{error}</section> : null}
      {data ? (
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
          <article className="card feature-card">
            <h2>Summary</h2>
            <p>Book: {data.book_id}</p>
            <p>Language: {data.language_code}</p>
            <p>Status: {data.has_extraction ? "Extraction available" : "No extraction yet"}</p>
          </article>
        </section>
      ) : null}
    </RoutePage>
  );
}

export function ImportSurfaceView() {
  const [data, setData] = useState<ImportSurfaceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        { label: "Inputs", value: data ? data.supported_inputs.join(", ") : "..." },
        { label: "Uploads", value: data ? (data.can_upload_pdf ? "Enabled" : "Disabled") : "..." },
        { label: "Paste", value: data ? (data.can_paste_text ? "Enabled" : "Disabled") : "..." },
      ]}
    >
      {error ? <section className="card feature-card">{error}</section> : null}
      {data ? (
        <section className="card feature-card">
          <h2>Recent books</h2>
          <div className="surface-list">
            {data.recent_books.map((book) => (
              <article key={book.book_id} className="surface-list-item">
                <div className="card-topline">
                  <strong>{book.title}</strong>
                  <span className="muted">{book.status.replaceAll("_", " ")}</span>
                </div>
                <p className="small-copy">
                  {book.language_code.toUpperCase()} - Imported {formatDateTime(book.processed_at ?? book.created_at)}
                </p>
              </article>
            ))}
          </div>
        </section>
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
        { label: "Sessions", value: data ? String(data.profile.reading_sessions) : "..." },
        { label: "Sentences", value: data ? String(data.profile.sentence_reads) : "..." },
        { label: "Vocabulary rows", value: data ? String(data.profile.vocabulary_progress_rows) : "..." },
      ]}
    >
      {error ? <section className="card feature-card">{error}</section> : null}
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
  const [data, setData] = useState<ProfileSurfaceResponse | null>(null);
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
        { label: "Sessions", value: data ? String(data.profile.reading_sessions) : "..." },
        { label: "Page reads", value: data ? String(data.profile.page_reads) : "..." },
        { label: "Sentence reads", value: data ? String(data.profile.sentence_reads) : "..." },
      ]}
    >
      {error ? <section className="card feature-card">{error}</section> : null}
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
              Theme: {settingsMap.get("theme") ?? "night"} • Reader mode: {settingsMap.get("readerMode") ?? "sentence"}
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
        { label: "Query", value: query || "..." },
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
  const [data, setData] = useState<SettingsSurfaceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState("night");
  const [readerMode, setReaderMode] = useState("sentence");

  useEffect(() => {
    let active = true;
    void fetchJson<SettingsSurfaceResponse>("/settings")
      .then((result) => {
        if (!active) {
          return;
        }
        setData(result);
        const themeEntry = result.entries.find((entry) => entry.key === "theme");
        const modeEntry = result.entries.find((entry) => entry.key === "readerMode");
        if (themeEntry) {
          setTheme(themeEntry.value);
        }
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
      description="Display preferences and local reading behavior are stored in the user profile database."
      badge="Live"
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
      {error ? <section className="card feature-card">{error}</section> : null}
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
          <button className="button button-primary" type="button" onClick={() => void saveSettings()} disabled={saving}>
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>
        {data ? <p className="small-copy">Stored settings: {data.entries.length}</p> : null}
      </section>
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
        { label: "Queue", value: data ? String(data.queue_size) : "..." },
        { label: "State", value: error ? "Error" : data ? "Loaded" : "Loading", detail: "Derived from vocabulary progress" },
      ]}
    >
      {error ? <section className="card feature-card">{error}</section> : null}
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

