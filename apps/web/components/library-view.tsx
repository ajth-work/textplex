"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";

import {
  fetchJson,
  formatDateTime,
  archiveBook,
  resolveReaderResumeHref,
  type BookRecord,
  type ProgressBookSummary,
  type ProgressSurfaceResponse,
} from "../lib/textplex";
import { languageShortCode, targetLanguageOptions } from "../lib/language-options";
import { useAuth } from "./auth-provider";

type LibraryLanguageOption = {
  code: string;
  label: string;
};

const libraryLanguageOptions: LibraryLanguageOption[] = [
  { code: "all", label: "All" },
  ...targetLanguageOptions,
];

type LibraryReadingFilter = "all" | ProgressBookSummary["reading_state"];
type LibraryProcessingFilter = "all" | "live" | "preparing" | "queued" | "local";

const libraryReadingFilterOptions: Array<{ value: LibraryReadingFilter; label: string }> = [
  { value: "all", label: "All progress" },
  { value: "not_read", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "finished", label: "Finished" },
];

const libraryProcessingFilterOptions: Array<{ value: LibraryProcessingFilter; label: string }> = [
  { value: "all", label: "All book status" },
  { value: "live", label: "Ready to read" },
  { value: "preparing", label: "Preparing" },
  { value: "queued", label: "Queued" },
  { value: "local", label: "Local" },
];

function bookTypeLabel(book: BookRecord): string {
  const suffix = book.source_filename.split(".").pop()?.trim().toLowerCase();
  if (suffix === "pdf" || suffix === "epub" || suffix === "txt") {
    return suffix.toUpperCase();
  }
  if (book.author?.trim() === "Wikipedia" || book.author?.trim() === "TextPlex AI") {
    return "ARTICLE";
  }
  return "TEXT";
}

function readingStateLabel(progress: ProgressBookSummary | null): string {
  if (!progress || progress.reading_state === "not_read") {
    return "Not read";
  }
  if (progress.reading_state === "finished") {
    return "Finished";
  }
  return "Reading";
}

function bookSubtitle(book: BookRecord): string {
  return book.author?.trim() || book.source_filename.replace(/\.[^.]+$/, "") || "Unknown author";
}

function bookAuthorSummary(book: BookRecord, progress: ProgressBookSummary | null): string {
  const isSinglePageArticle = book.source_type === "static" && book.total_pages === 1 && bookTypeLabel(book) === "ARTICLE";
  const count = isSinglePageArticle && progress?.total_sentences ? progress.total_sentences : book.total_pages;
  const unit = isSinglePageArticle && progress?.total_sentences ? "sentence" : "page";
  return `${bookSubtitle(book)} (${count} ${unit}${count === 1 ? "" : "s"})`;
}

function bookMetaSummary(book: BookRecord): string {
  return `Updated ${formatDateTime(book.processed_at ?? book.created_at)}`;
}

function sortBooks(books: BookRecord[]): BookRecord[] {
  return [...books].sort((left, right) => {
    const leftDate = left.processed_at ?? left.created_at;
    const rightDate = right.processed_at ?? right.created_at;
    const dateCompare = rightDate.localeCompare(leftDate);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return left.title.localeCompare(right.title);
  });
}

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}

function matchesBook(book: BookRecord, query: string): boolean {
  if (!query) {
    return true;
  }
  const haystack = [
    book.title,
    book.author,
    book.source_filename,
    book.language_code,
    book.status,
    book.extraction_status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function matchesLibraryLanguage(book: BookRecord, languageCode: string): boolean {
  return languageCode === "all" || book.language_code === languageCode;
}

function processingFilterValue(book: BookRecord): Exclude<LibraryProcessingFilter, "all"> {
  if (book.status === "ready" || book.status === "extracted" || book.extraction_status === "complete") {
    return "live";
  }
  if (book.extraction_status === "processing" || book.status === "processing") {
    return "preparing";
  }
  if (book.status === "queued" || book.extraction_status === "queued") {
    return "queued";
  }
  return "local";
}

function matchesReadingState(progress: ProgressBookSummary | null, readingFilter: LibraryReadingFilter): boolean {
  return readingFilter === "all" || (progress?.reading_state ?? "not_read") === readingFilter;
}

function matchesProcessingStatus(book: BookRecord, processingFilter: LibraryProcessingFilter): boolean {
  return processingFilter === "all" || processingFilterValue(book) === processingFilter;
}

function LibrarySkeletonCard() {
  return (
    <article className="library-skeleton-card" aria-label="Loading library book" role="status">
      <div className="library-skeleton-art skeleton-block" aria-hidden="true" />
      <div className="library-skeleton-body">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
        <span className="skeleton-block" />
      </div>
    </article>
  );
}

function LibraryCard({ book, progress, onOpenInfo, onOpenReader, onArchive, archiving }: {
  book: BookRecord;
  progress: ProgressBookSummary | null;
  onOpenInfo: (bookId: string) => void;
  onOpenReader: (bookId: string) => void;
  onArchive: (bookId: string) => void;
  archiving: boolean;
}) {
  const artClass = `home-book-art home-book-art-${book.language_code.slice(0, 2).toLowerCase()}`;

  function handleCardClick() {
    onOpenInfo(book.id);
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenInfo(book.id);
    }
  }

  function stopAndOpen(handler: (bookId: string) => void) {
    return (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      handler(book.id);
    };
  }

  return (
    <article
      className={`library-card${book.status === "ready" || book.extraction_status === "complete" ? " is-selected" : ""}`}
      role="link"
      tabIndex={0}
      data-inventory-id="library.book-card"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      <div className={artClass} aria-hidden="true" />
      <div className="library-card-body">
        <div className="library-kicker-row">
          <span className="library-pill library-language-pill">{languageShortCode(book.language_code)}</span>
          <span className="library-pill library-type-pill">{bookTypeLabel(book)}</span>
          <span className="library-pill library-status-pill">{readingStateLabel(progress)}</span>
        </div>
        <h3>{book.title}</h3>
        <p className="library-author">{bookAuthorSummary(book, progress)}</p>
        <p className="library-summary">{bookMetaSummary(book)}</p>
        <div className="library-actions">
          <div className="library-action-buttons">
            <button
              className="button button-secondary library-action-button library-action-button-archive"
              type="button"
              aria-label={`Archive ${book.title}`}
              data-inventory-id="library.book-archive-button"
              onClick={stopAndOpen(onArchive)}
              disabled={archiving}
            >
              {archiving ? "Archiving..." : "Archive"}
            </button>
            <button
              className="button button-secondary library-action-button library-action-button-info"
              type="button"
              aria-label={`View details for ${book.title}`}
              data-inventory-id="library.book-info-button"
              onClick={stopAndOpen(onOpenInfo)}
            >
              Details
            </button>
            <button
              className="button button-primary library-action-button library-action-button-read"
              type="button"
              aria-label={`Open ${book.title}`}
              data-inventory-id="library.book-open-button"
              onClick={stopAndOpen(onOpenReader)}
            >
              Open
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function LibraryLoadingState() {
  return (
    <div className="library-shelf" aria-live="polite">
      <LibrarySkeletonCard />
    </div>
  );
}

export function LibraryView() {
  const router = useRouter();
  const { configured: authConfigured, loading: authLoading, user } = useAuth();
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [progress, setProgress] = useState<ProgressSurfaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [languageCode, setLanguageCode] = useState("all");
  const [readingFilter, setReadingFilter] = useState<LibraryReadingFilter>("all");
  const [processingFilter, setProcessingFilter] = useState<LibraryProcessingFilter>("all");
  const [archivingBookId, setArchivingBookId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || (authConfigured && !user)) {
      return undefined;
    }

    let active = true;

    setLoading(true);
    setError(null);

    void fetchJson<BookRecord[]>("/books")
      .then((result) => {
        if (!active) {
          return;
        }
        setBooks(sortBooks(result));
      })
      .catch((reason: unknown) => {
        if (!active) {
          return;
        }
        setError(reason instanceof Error ? reason.message : "Unable to load books.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [authConfigured, authLoading, user]);

  useEffect(() => {
    if (authLoading || (authConfigured && !user)) {
      return undefined;
    }

    let active = true;

    void fetchJson<ProgressSurfaceResponse>("/progress")
      .then((result) => {
        if (active) {
          setProgress(result);
        }
      })
      .catch(() => {
        if (active) {
          setProgress(null);
        }
      });

    return () => {
      active = false;
    };
  }, [authConfigured, authLoading, user]);

  const progressByBookId = useMemo(() => new Map((progress?.books ?? []).map((item) => [item.book_id, item])), [progress]);
  const visibleBooks = useMemo(() => {
    const normalizedQuery = normalizeQuery(query);
    return books.filter((book) => {
      const bookProgress = progressByBookId.get(book.id) ?? null;
      return matchesBook(book, normalizedQuery)
        && matchesLibraryLanguage(book, languageCode)
        && matchesReadingState(bookProgress, readingFilter)
        && matchesProcessingStatus(book, processingFilter);
    });
  }, [books, languageCode, processingFilter, progressByBookId, query, readingFilter]);

  function openInfo(bookId: string) {
    router.push(`/books/${bookId}`);
  }

  function openReader(bookId: string) {
    router.push(resolveReaderResumeHref(bookId, progress));
  }

  async function archiveLibraryBook(bookId: string) {
    setArchivingBookId(bookId);
    setActionError(null);
    try {
      await archiveBook(bookId);
      setBooks((current) => current.filter((book) => book.id !== bookId));
    } catch (reason: unknown) {
      setActionError(reason instanceof Error ? reason.message : "Unable to archive this reading item.");
    } finally {
      setArchivingBookId(null);
    }
  }

  function retryLoad() {
    setLoading(true);
    setError(null);
    void fetchJson<BookRecord[]>("/books")
      .then((result) => {
        setBooks(sortBooks(result));
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Unable to load books.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  const visibleCount = visibleBooks.length;
  const hasBooks = books.length > 0;
  const hasQuery = Boolean(normalizeQuery(query));
  const hasFilters = languageCode !== "all" || readingFilter !== "all" || processingFilter !== "all";

  return (
    <section className="library-page">
      <header className="library-hero card" data-inventory-id="library.search-hero">
        <div className="library-hero-head">
          <p className="eyebrow">Search</p>
        </div>

        <div className="library-controls">
          <label className="library-search" htmlFor="librarySearch">
            <span aria-hidden="true">⌕</span>
            <input
              id="librarySearch"
              type="search"
              placeholder="Search titles, authors, tags..."
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              data-inventory-id="library.search"
            />
          </label>

          <div
            className={`library-count ${loading ? "skeleton-line" : ""}`.trim()}
            id="libraryCount"
            aria-live="polite"
            aria-label={loading ? "Loading document count" : `${visibleCount} documents`}
            data-inventory-id="library.document-count"
          >
            {loading ? null : `${visibleCount} document${visibleCount === 1 ? "" : "s"}`}
          </div>
        </div>

        <details className="library-filter-menu" data-inventory-id="library.filter-menu">
          <summary className="library-filter-button" data-inventory-id="library.filter-button" aria-label="Open library filters">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            <span>Filter</span>
            {languageCode !== "all" || readingFilter !== "all" || processingFilter !== "all" ? (
              <span className="library-filter-count">{[languageCode !== "all", readingFilter !== "all", processingFilter !== "all"].filter(Boolean).length}</span>
            ) : null}
          </summary>
          <div className="library-filter-panel">
            <div className="library-filter-panel-head">
              <span className="library-filter-panel-title">Filter library</span>
              <button
                className="library-filter-clear"
                type="button"
                onClick={() => {
                  setLanguageCode("all");
                  setReadingFilter("all");
                  setProcessingFilter("all");
                }}
                disabled={languageCode === "all" && readingFilter === "all" && processingFilter === "all"}
              >
                Clear all
              </button>
            </div>
            <label className="library-filter-field" data-inventory-id="library.language-filter">
              <span>Language</span>
              <select value={languageCode} onChange={(event) => setLanguageCode(event.target.value)}>
                {libraryLanguageOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.code === "all" ? "All languages" : option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="library-filter-field">
              <span>Reading progress</span>
              <select value={readingFilter} onChange={(event) => setReadingFilter(event.target.value as LibraryReadingFilter)}>
                {libraryReadingFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="library-filter-field">
              <span>Book status</span>
              <select value={processingFilter} onChange={(event) => setProcessingFilter(event.target.value as LibraryProcessingFilter)}>
                {libraryProcessingFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </details>

        <Link className="button button-primary library-import-button" href="/import" data-inventory-id="library.import-button">
          Import
        </Link>

      </header>

      <section className="library-shell card">
        <div className="library-shell-head">
          <p className="eyebrow">Library</p>
        </div>

        {error ? (
          <section className="library-error-card" role="alert" data-inventory-id="library.error-state">
            <h2>Library is unavailable.</h2>
            <p>{error}</p>
            <button className="button button-primary" type="button" onClick={retryLoad}>
              Retry
            </button>
          </section>
        ) : null}

        {!error && loading ? <LibraryLoadingState /> : null}

        {actionError ? <p className="library-action-error" role="alert">{actionError}</p> : null}

        {!error && !loading && visibleBooks.length > 0 ? (
          <div className="library-shelf" aria-live="polite" data-inventory-id="library.shelf">
            {visibleBooks.map((book) => (
              <LibraryCard key={book.id} book={book} progress={progressByBookId.get(book.id) ?? null} onOpenInfo={openInfo} onOpenReader={openReader} onArchive={archiveLibraryBook} archiving={archivingBookId === book.id} />
            ))}
          </div>
        ) : null}

        {!error && !loading && visibleBooks.length === 0 ? (
          <section className="library-empty-card" data-inventory-id="library.empty-state">
            <h2>{hasBooks ? "No visible library items match your search or filters." : "No books imported yet."}</h2>
            <p>
              {hasBooks
                ? "Try a different title, author, language, reading state, or book status."
                : "Use the import flow to register a scan, then TextPlex will expose it here for reading."}
            </p>
            <div className="button-row">
              {hasBooks && hasQuery ? (
                <button className="button button-secondary" type="button" onClick={() => setQuery("")}>
                  Clear search
                </button>
              ) : null}
              {hasBooks && hasFilters ? (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => {
                    setLanguageCode("all");
                    setReadingFilter("all");
                    setProcessingFilter("all");
                  }}
                >
                  Clear filters
                </button>
              ) : null}
              <Link className="button button-primary" href="/import">
                Import a text
              </Link>
            </div>
          </section>
        ) : null}
      </section>
    </section>
  );
}
