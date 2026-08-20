"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  fetchJson,
  archiveBook,
  formatDateTime,
  fetchGeneratedArticlePromptDetails,
  isDemoMode,
  resolveReaderResumeHref,
  triggerBookExtraction,
  type BookExtractionResult,
  type BookAnalysisSurfaceResponse,
  type BookPageManifest,
  type BookRecord,
  type ProgressSurfaceResponse,
  type GeneratedReaderArticlePromptDetails,
} from "../lib/textplex";
import { GeneratedArticlePromptCard } from "./generated-article-prompt-card";
import { LoadingSkeleton } from "./loading-skeleton";
import { HskSeriesChart } from "./hsk-series-chart";
import { ImportProgressCard } from "./import-progress-card";
import { useImportProgress } from "./import-progress-provider";
import { isImportInProgress } from "../lib/import-progress";
import { languageDisplayLabel, languageShortCode } from "../lib/language-options";
import { PhotoPageAppendCard } from "./photo-page-append-card";

function languageLabel(languageCode: string): string {
  return languageDisplayLabel(languageCode);
}

function titleCaseTopic(topic: string): string {
  const trimmedTopic = topic.trim();
  return trimmedTopic ? `${trimmedTopic.charAt(0).toUpperCase()}${trimmedTopic.slice(1)}` : "Practice article";
}

function isPdfBook(book: BookRecord): boolean {
  return book.source_filename.toLowerCase().endsWith(".pdf");
}

function contentTypeLabel(book: BookRecord, generationDetails: GeneratedReaderArticlePromptDetails | null): string {
  if (generationDetails) {
    return `${generationDetails.language_label} practice article`;
  }
  return isPdfBook(book) ? "Book" : `${languageLabel(book.language_code)} article`;
}

function detailTitle(book: BookRecord, generationDetails: GeneratedReaderArticlePromptDetails | null): string {
  return generationDetails ? titleCaseTopic(generationDetails.topic) : book.title;
}

function detailSummary(book: BookRecord, generationDetails: GeneratedReaderArticlePromptDetails | null): string {
  if (generationDetails) {
    const level = generationDetails.curriculum_label ?? "your current reading level";
    const genre = generationDetails.genre.replaceAll("_", " ");
    return `A concise ${genre} practice article about ${generationDetails.topic}. It is calibrated for ${level} with a controlled vocabulary window for focused reading practice.`;
  }
  if (!isPdfBook(book)) {
    return `A ${languageLabel(book.language_code)} reading article prepared for your local library and reader study tools.`;
  }
  return `A local reading copy${book.author ? ` by ${book.author}` : ""}, with its source pages, prepared images, and extracted reader data kept together for reading practice.`;
}

export function BookDetailView({ bookId }: { bookId: string }) {
  const { activeImport, trackImport } = useImportProgress();
  const [book, setBook] = useState<BookRecord | null>(null);
  const [manifest, setManifest] = useState<BookPageManifest | null>(null);
  const [summary, setSummary] = useState<BookExtractionResult | null>(null);
  const [progress, setProgress] = useState<ProgressSurfaceResponse | null>(null);
  const [analysis, setAnalysis] = useState<BookAnalysisSurfaceResponse | null>(null);
  const [generationDetails, setGenerationDetails] = useState<GeneratedReaderArticlePromptDetails | null>(null);
  const [generationLoading, setGenerationLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setAnalysisLoading(true);
    setAnalysis(null);
    setAnalysisError(null);
    setGenerationDetails(null);
    setGenerationLoading(true);
    setSummaryLoading(true);
    setSummary(null);
    setProgress(null);

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
        setLoading(false);
        void fetchJson<ProgressSurfaceResponse>("/progress")
          .then((progressResult) => {
            if (active) {
              setProgress(progressResult);
            }
          })
          .catch(() => {
            if (active) {
              setProgress(null);
            }
          });
        void fetchJson<BookAnalysisSurfaceResponse>(`/analysis/${bookId}`)
          .then((analysisResult) => {
            if (active) {
              setAnalysis(analysisResult);
            }
          })
          .catch(() => {
            if (active) {
              setAnalysis(null);
              setAnalysisError("Unable to load book HSK analysis.");
            }
          })
          .finally(() => {
            if (active) {
              setAnalysisLoading(false);
            }
          });
        void fetchGeneratedArticlePromptDetails(bookId)
          .then((generationResult) => {
            if (active) {
              setGenerationDetails(generationResult);
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
        void fetchJson<BookExtractionResult>(`/books/${bookId}/extractions`)
          .then((summaryResult) => {
            if (active) {
              setSummary(summaryResult);
            }
          })
          .catch(() => {
            if (active) {
              setSummary(null);
            }
          })
          .finally(() => {
            if (active) {
              setSummaryLoading(false);
            }
          });
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to load book.");
        setAnalysisLoading(false);
        setGenerationLoading(false);
        setSummaryLoading(false);
        setLoading(false);
      }
    }

    void loadBook();

    return () => {
      active = false;
    };
  }, [bookId, refreshNonce]);

  useEffect(() => {
    if (!book || isDemoMode || !isImportInProgress(book)) {
      return;
    }
    if (!activeImport || activeImport.id === book.id || !isImportInProgress(activeImport)) {
      trackImport(book);
    }
  }, [activeImport, book, trackImport]);

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

  async function handleArchive() {
    if (archiving || !book || isDemoMode) {
      return;
    }
    setArchiving(true);
    setArchiveError(null);
    try {
      await archiveBook(book.id);
      window.location.href = "/archive";
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : "Unable to archive this reading item.");
      setArchiving(false);
    }
  }

  const firstPageNumber = manifest?.pages[0]?.page_number ?? 1;
  const resumeReaderHref = resolveReaderResumeHref(bookId, progress, firstPageNumber);
  const needsExtraction = (book?.extracted_page_count ?? 0) <= 0;
  const typeLabel = book ? contentTypeLabel(book, generationDetails) : "Reading item";
  const heroTitle = book ? detailTitle(book, generationDetails) : null;
  const heroSummary = book ? detailSummary(book, generationDetails) : null;
  const pageCountLabel = book && !isPdfBook(book) ? "Reader pages" : "Total pages in the source PDF";
  const detailImport = activeImport?.id === bookId ? activeImport : book;

  return (
    <section className="app-shell">
      <header className="page-hero">
        <div className="detail-hero-copy" data-inventory-id="book-detail.page-hero">
          <span className="pill detail-type-pill">{book ? typeLabel : "Reading item"}</span>
          <h1>{heroTitle ?? (loading ? <span className="skeleton-line skeleton-line-title" aria-hidden="true" /> : "Book unavailable")}</h1>
          <p className="lede detail-hero-summary">{heroSummary ?? "Open a local reading item to see its summary and page data."}</p>
          {isDemoMode ? <p className="small-copy">Demo mode is active. This is the packaged GitHub Pages reader sample.</p> : null}
        </div>
        <div className="hero-meta card">
          <strong>{loading ? <span className="skeleton-line skeleton-line-short" aria-hidden="true" /> : book?.total_pages ?? 0}</strong>
          <span>{pageCountLabel}</span>
        </div>
      </header>

      {loading ? <LoadingSkeleton label="Loading book details" /> : null}
      {error ? <div className="card error-card">{error}</div> : null}
      {extractError ? <div className="card error-card">{extractError}</div> : null}
      {archiveError ? <div className="card error-card">{archiveError}</div> : null}

      {book && manifest ? (
        <div className="detail-layout">
          <article className="card detail-main">
            <div className="card-topline">
              <span className="pill">{languageShortCode(book.language_code)}</span>
              <span className="muted">{needsExtraction ? "Preparing to read" : "Ready to read"}</span>
            </div>
            <h2>{book.title}</h2>
            <p className="muted">{book.author ?? "Unknown author"}</p>
            <dl className="metric-grid">
              <div>
                <dt>Language</dt>
                <dd>{languageLabel(book.language_code)}</dd>
              </div>
              <div>
                <dt>Pages</dt>
                <dd>{book.total_pages}</dd>
              </div>
              <div>
                <dt>Added</dt>
                <dd>{formatDateTime(book.created_at)}</dd>
              </div>
            </dl>
            {detailImport && isImportInProgress(detailImport) ? (
              <ImportProgressCard book={detailImport} inventoryId="book-detail.import-progress-card" showReaderLink={false} />
            ) : null}
            <div className="button-row">
              <Link className="button button-primary" href={resumeReaderHref}>
                open
              </Link>
              <Link className="button button-secondary" href={`/reader/${bookId}/${firstPageNumber}`}>
                restart
              </Link>
              <button className="button button-secondary" type="button" onClick={() => void handleExtractNow()} disabled={extracting || loading || isDemoMode}>
                {extracting ? "refreshing..." : "refresh"}
              </button>
              <Link className="button button-secondary" href="/library">
                library
              </Link>
              <button className="button button-secondary" type="button" onClick={() => void handleArchive()} disabled={archiving || isDemoMode}>
                {archiving ? "archiving..." : "archive"}
              </button>
            </div>
            {book.source_type === "page-by-page" && !isDemoMode ? (
              <PhotoPageAppendCard
                bookId={book.id}
                onAppended={(updatedBook) => {
                  setBook(updatedBook);
                  setRefreshNonce((value) => value + 1);
                }}
              />
            ) : null}
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
            <h3>Reading overview</h3>
            {summaryLoading ? (
              <LoadingSkeleton label="Loading extraction snapshot" />
            ) : summary ? (
              <>
                <p className="small-copy">
                  {summary.page_end - summary.page_start + 1} pages are ready, with {summary.lexical_entries.length} words and phrases to explore.
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
            <GeneratedArticlePromptCard
              inventoryId="book-detail.generation-prompt-card"
              details={generationDetails}
              loading={generationLoading}
              title="Generated article prompt"
              description="This card records the exact generation request, prompt payload, and term window used for the article."
            />
          </aside>
        </div>
      ) : null}

      {manifest ? (
        <section className="card page-strip">
          <div className="card-topline">
            <h3>Pages</h3>
            <span className="muted">{manifest.page_count} available to read</span>
          </div>
          <div className="page-grid">
            {manifest.pages.map((page) => (
              <Link key={page.page_number} className="page-tile" href={`/reader/${manifest.book_id}/${page.page_number}`}>
                <span>Page {page.page_number}</span>
                <strong>Open page</strong>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {analysisLoading ? <LoadingSkeleton label="Loading book HSK analysis" /> : null}
      {analysisError ? <div className="card error-card" role="alert">{analysisError}</div> : null}
      {!analysisLoading && analysis ? (
        <HskSeriesChart
          inventoryId="book-detail.page-hsk-chart"
          title="HSK average by page"
          description="Page-level averages show how difficulty changes through the book."
          points={analysis.page_hsk_series}
          emptyMessage={analysis.has_extraction ? "No page-level HSK evidence is available." : "Page chart will appear after extraction completes."}
        />
      ) : null}
    </section>
  );
}
