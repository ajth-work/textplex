"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  fetchJson,
  formatDateTime,
  isDemoMode,
  triggerBookExtraction,
  type BookExtractionResult,
  type BookPageManifest,
  type BookReaderPageResponse,
  type BookRecord,
} from "../lib/textplex";

export function BookDetailView({ bookId }: { bookId: string }) {
  const [book, setBook] = useState<BookRecord | null>(null);
  const [manifest, setManifest] = useState<BookPageManifest | null>(null);
  const [summary, setSummary] = useState<BookExtractionResult | null>(null);
  const [firstPageExtractionSource, setFirstPageExtractionSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFirstPageExtractionSource(null);

    async function loadBook() {
      try {
        const [bookResult, manifestResult] = await Promise.all([
          fetchJson<BookRecord>(`/books/${bookId}`),
          fetchJson<BookPageManifest>(`/books/${bookId}/pages`),
        ]);
        if (!active) {
          return;
        }
        setBook(bookResult);
        setManifest(manifestResult);
        try {
          const pageResult = await fetchJson<BookReaderPageResponse>(`/books/${bookId}/pages/${manifestResult.pages[0]?.page_number ?? 1}`);
          if (active) {
            setFirstPageExtractionSource(pageResult.extraction?.text_source ?? null);
          }
        } catch {
          if (active) {
            setFirstPageExtractionSource(null);
          }
        }
        try {
          const summaryResult = await fetchJson<BookExtractionResult>(`/books/${bookId}/extractions`);
          if (active) {
            setSummary(summaryResult);
          }
        } catch {
          if (active) {
            setSummary(null);
          }
        }
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to load book.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadBook();

    return () => {
      active = false;
    };
  }, [bookId, refreshNonce]);

  async function handleExtractNow() {
    if (!manifest || extracting) {
      return;
    }

    setExtracting(true);
    setExtractError(null);
    try {
      await triggerBookExtraction(bookId, {
        page_start: 1,
        page_count: manifest.page_count,
        force: true,
      });
      setRefreshNonce((value) => value + 1);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Unable to start extraction.");
    } finally {
      setExtracting(false);
    }
  }

  const firstPageNumber = manifest?.pages[0]?.page_number ?? 1;
  const needsExtraction = (book?.extracted_page_count ?? 0) <= 0;
  const extractionSourceLabel = firstPageExtractionSource ? firstPageExtractionSource.toUpperCase() : "UNAVAILABLE";

  return (
    <section className="app-shell">
      <header className="page-hero">
        <div>
          <span className="eyebrow">Book detail</span>
          <h1>{book?.title ?? "Loading book..."}</h1>
          <p className="lede">
            This screen keeps the source scan, the prepared page set, and the extracted reader data in one place before you enter the page view.
          </p>
          {isDemoMode ? <p className="small-copy">Demo mode is active. This is the packaged GitHub Pages reader sample.</p> : null}
        </div>
        <div className="hero-meta card">
          <strong>{book?.total_pages ?? 0}</strong>
          <span>Total pages in the source PDF</span>
        </div>
      </header>

      {loading ? <div className="card">Loading book details...</div> : null}
      {error ? <div className="card error-card">{error}</div> : null}
      {extractError ? <div className="card error-card">{extractError}</div> : null}

      {book && manifest ? (
        <div className="detail-layout">
          <article className="card detail-main">
            <div className="card-topline">
              <span className="pill">{book.language_code.toUpperCase()}</span>
              <span className="muted">{book.status.replaceAll("_", " ")}</span>
            </div>
            <h2>{book.title}</h2>
            <p className="muted">{book.author ?? "Unknown author"}</p>
            <dl className="metric-grid">
              <div>
                <dt>Prepared pages</dt>
                <dd>{book.page_image_count}</dd>
              </div>
              <div>
                <dt>Extracted pages</dt>
                <dd>{book.extracted_page_count}</dd>
              </div>
              <div>
                <dt>Page manifest</dt>
                <dd>{manifest.page_count}</dd>
              </div>
            </dl>
            <p className="small-copy">Imported {formatDateTime(book.created_at)}</p>
            <p className="small-copy">
              Extraction source: <strong>{extractionSourceLabel}</strong>
            </p>
            <div className="button-row">
              <Link className="button button-primary" href={`/reader/${book.id}/${firstPageNumber}`}>
                Open reader
              </Link>
              <button className="button button-secondary" type="button" onClick={() => void handleExtractNow()} disabled={extracting || loading || isDemoMode}>
                {extracting ? "Refreshing..." : isDemoMode ? "Demo sample" : needsExtraction ? "Extract pages" : "Refresh extraction"}
              </button>
              <Link className="button button-secondary" href="/library">
                Back to library
              </Link>
            </div>
            {isDemoMode ? (
              <p className="small-copy">The sample book is already packaged for preview mode, so extraction is not needed here.</p>
            ) : needsExtraction ? (
              <p className="small-copy">Extraction has not run yet, so the reader will be empty until the pages are processed.</p>
            ) : null}
            {!needsExtraction && !isDemoMode ? (
              <p className="small-copy">You can refresh extraction any time if you want to re-run OCR on the source pages.</p>
            ) : null}
          </article>

          <aside className="card detail-aside">
            <h3>Extraction snapshot</h3>
            {summary ? (
              <>
                <p className="small-copy">
                  Pages {summary.page_start} to {summary.page_end} with {summary.lexical_entries.length} unique lexical entries.
                </p>
                <p className="small-copy">
                  Source: <strong>{extractionSourceLabel}</strong>
                </p>
                <ul className="frequency-list">
                  {summary.lexical_entries.slice(0, 6).map((entry) => (
                    <li key={entry.lemma}>
                      <strong>{entry.display_form}</strong>
                      <span>{entry.frequency_in_book}x</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="small-copy">No extraction summary is available yet for this book.</p>
            )}
          </aside>
        </div>
      ) : null}

      {manifest ? (
        <section className="card page-strip">
          <div className="card-topline">
            <h3>Prepared pages</h3>
            <span className="muted">{manifest.page_count} ready for reading</span>
          </div>
          <div className="page-grid">
            {manifest.pages.map((page) => (
              <Link key={page.page_number} className="page-tile" href={`/reader/${manifest.book_id}/${page.page_number}`}>
                <span>Page {page.page_number}</span>
                <strong>{page.image_filename}</strong>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
