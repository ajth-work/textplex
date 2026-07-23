"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";

import { fetchJson, formatDateTime, type BookRecord } from "../lib/textplex";

function bookFormatLabel(book: BookRecord): string {
  const suffix = book.source_filename.split(".").pop()?.trim();
  return suffix ? suffix.toUpperCase() : "TXT";
}

function bookStatusLabel(book: BookRecord): string {
  if (book.status === "ready" || book.status === "extracted" || book.extraction_status === "complete") {
    return "Live";
  }
  if (book.extraction_status === "processing" || book.status === "processing") {
    return "Preparing";
  }
  if (book.status === "queued" || book.extraction_status === "queued") {
    return "Queued";
  }
  return "Local";
}

function bookSubtitle(book: BookRecord): string {
  return book.author?.trim() || book.source_filename.replace(/\.[^.]+$/, "") || "Unknown author";
}

function bookMetaSummary(book: BookRecord): string {
  return `${book.total_pages} pages · ${book.extracted_page_count} extracted · Updated ${formatDateTime(book.processed_at ?? book.created_at)}`;
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

function LibraryCard({ book, onOpenInfo, onOpenReader }: {
  book: BookRecord;
  onOpenInfo: (bookId: string) => void;
  onOpenReader: (bookId: string) => void;
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
        <p className="library-kicker">
          {book.language_code.toUpperCase()} · {bookFormatLabel(book)}
        </p>
        <h3>{book.title}</h3>
        <p className="library-author">{bookSubtitle(book)}</p>
        <p className="library-summary">{bookMetaSummary(book)}</p>
        <div className="library-actions">
          <span className="library-tag library-status">{bookStatusLabel(book)}</span>
          <div className="library-action-buttons">
            <button
              className="button button-secondary library-action-button library-action-button-info"
              type="button"
              aria-label={`Open book info for ${book.title}`}
              title="Info"
              data-inventory-id="library.book-info-button"
              onClick={stopAndOpen(onOpenInfo)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <button
              className="button button-primary library-action-button library-action-button-read"
              type="button"
              aria-label={`Read ${book.title}`}
              title="Read"
              data-inventory-id="library.book-open-button"
              onClick={stopAndOpen(onOpenReader)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h9A2.5 2.5 0 0 1 20 4.5V19a1 1 0 0 1-1.5.86L16 18.3l-2.5 1.56a1 1 0 0 1-1 0L10 18.3l-2.5 1.56A1 1 0 0 1 6 19V4.5Z" />
                <path d="M8 6.5h7.5" />
                <path d="M8 10h7.5" />
              </svg>
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
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;

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
  }, []);

  const visibleBooks = useMemo(() => {
    const normalizedQuery = normalizeQuery(query);
    return books.filter((book) => matchesBook(book, normalizedQuery));
  }, [books, query]);

  function openInfo(bookId: string) {
    router.push(`/books/${bookId}`);
  }

  function openReader(bookId: string) {
    router.push(`/reader/${bookId}/1`);
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

  return (
    <section className="library-page">
      <header className="library-topbar" data-inventory-id="library.page-header">
        <Link className="library-back-link" href="/" aria-label="Back to home">
          <span aria-hidden="true">←</span>
        </Link>
        <h1 className="library-brand">TextPlex</h1>
        <span aria-hidden="true" />
      </header>

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

        {!error && !loading && visibleBooks.length > 0 ? (
          <div className="library-shelf" aria-live="polite" data-inventory-id="library.shelf">
            {visibleBooks.map((book) => (
              <LibraryCard key={book.id} book={book} onOpenInfo={openInfo} onOpenReader={openReader} />
            ))}
          </div>
        ) : null}

        {!error && !loading && visibleBooks.length === 0 ? (
          <section className="library-empty-card" data-inventory-id="library.empty-state">
            <h2>{hasBooks ? "No visible library items match this search." : "No books imported yet."}</h2>
            <p>
              {hasBooks
                ? "Try a different title, author, or source filename."
                : "Use the import flow to register a scan, then TextPlex will expose it here for reading."}
            </p>
            <div className="button-row">
              {hasBooks ? (
                <button className="button button-secondary" type="button" onClick={() => setQuery("")}>
                  Clear search
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
