"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  fetchJson,
  archiveBook,
  formatDateTime,
  fetchGeneratedArticlePromptDetails,
  isDemoMode,
  resolveReaderResumeHref,
  setBookCompletion,
  triggerBookExtraction,
  type BookExtractionResult,
  type BookAnalysisSurfaceResponse,
  type BookPageManifest,
  type BookRecord,
  type ProgressSurfaceResponse,
  type GeneratedReaderArticlePromptDetails,
  type TokenResult,
} from "../lib/textplex";
import { GeneratedArticlePromptCard } from "./generated-article-prompt-card";
import { LoadingSkeleton } from "./loading-skeleton";
import { HskSeriesChart } from "./hsk-series-chart";
import { ImportProgressCard } from "./import-progress-card";
import { useImportProgress } from "./import-progress-provider";
import { isImportInProgress } from "../lib/import-progress";
import { languageDisplayLabel } from "../lib/language-options";
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
    return "Practice article";
  }
  return isPdfBook(book) ? "Book" : "Article";
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
    return "A reading article prepared for your local library and reader study tools.";
  }
  return `A local reading copy${book.author ? ` by ${book.author}` : ""}, with its source pages, prepared images, and extracted reader data kept together for reading practice.`;
}

function findLexicalEntryToken(
  summary: BookExtractionResult,
  entry: BookExtractionResult["lexical_entries"][number],
): TokenResult | null {
  for (const page of summary.pages) {
    for (const sentence of page.sentences) {
      const token = sentence.tokens.find((candidate) => candidate.lemma === entry.lemma || candidate.surface_form === entry.display_form);
      if (token) {
        return token;
      }
    }
  }
  return null;
}

export function BookDetailView({ bookId }: { bookId: string }) {
  const router = useRouter();
  const { activeImport, trackImport } = useImportProgress();
  const [book, setBook] = useState<BookRecord | null>(null);
  const [manifest, setManifest] = useState<BookPageManifest | null>(null);
  const [summary, setSummary] = useState<BookExtractionResult | null>(null);
  const [progress, setProgress] = useState<ProgressSurfaceResponse | null>(null);
  const [analysis, setAnalysis] = useState<BookAnalysisSurfaceResponse | null>(null);
  const [generationDetails, setGenerationDetails] = useState<GeneratedReaderArticlePromptDetails | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [completionSaving, setCompletionSaving] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setAnalysisLoading(true);
    setAnalysis(null);
    setAnalysisError(null);
    setGenerationDetails(null);
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

  useEffect(() => {
    if (!showRefreshConfirm) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowRefreshConfirm(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showRefreshConfirm]);

  async function handleArchive() {
    if (archiving || !book || isDemoMode) {
      return;
    }
    setArchiving(true);
    setArchiveError(null);
    try {
      await archiveBook(book.id);
      router.push("/archive");
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : "Unable to archive this reading item.");
      setArchiving(false);
    }
  }

  async function handlePageByPageCompletion() {
    if (!book || book.source_type !== "page-by-page" || isDemoMode || completionSaving) {
      return;
    }
    const currentProgress = progress?.books.find((item) => item.book_id === book.id);
    const finished = currentProgress?.reading_state !== "finished";
    setCompletionSaving(true);
    setCompletionError(null);
    try {
      const updatedProgress = await setBookCompletion(book.id, finished);
      setProgress((current) => current ? {
        ...current,
        books: current.books.map((item) => item.book_id === updatedProgress.book_id ? updatedProgress : item),
      } : current);
    } catch (err) {
      setCompletionError(err instanceof Error ? err.message : "Unable to update the reading state.");
    } finally {
      setCompletionSaving(false);
    }
  }

  const firstPageNumber = manifest?.pages[0]?.page_number ?? 1;
  const resumeReaderHref = resolveReaderResumeHref(bookId, progress, firstPageNumber);
  const needsExtraction = (book?.extracted_page_count ?? 0) <= 0;
  const typeLabel = book ? contentTypeLabel(book, generationDetails) : "Reading item";
  const heroTitle = book ? detailTitle(book, generationDetails) : null;
  const heroSummary = book ? detailSummary(book, generationDetails) : null;
  const detailImport = activeImport?.id === bookId ? activeImport : book;
  const pageByPageProgress = progress?.books.find((item) => item.book_id === bookId) ?? null;
  const pageByPageFinished = pageByPageProgress?.reading_state === "finished";
  const showJapaneseReadingFields = book?.language_code.toLowerCase().startsWith("ja") ?? false;
  const refreshDialog = showRefreshConfirm && manifest && !isDemoMode ? (
    <div className="book-detail-refresh-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowRefreshConfirm(false); }}>
      <section className="book-detail-refresh-dialog card" role="dialog" aria-modal="true" aria-labelledby="book-detail-refresh-title" aria-describedby="book-detail-refresh-description" data-inventory-id="book-detail.extraction-refresh-dialog">
        <div className="book-detail-refresh-dialog-header">
          <div>
            <span className="eyebrow">Refresh extraction</span>
            <h2 id="book-detail-refresh-title">Re-run extraction for this item?</h2>
          </div>
          <button className="button button-secondary book-detail-refresh-close" type="button" onClick={() => setShowRefreshConfirm(false)} aria-label="Close refresh confirmation" title="Close refresh confirmation">×</button>
        </div>
        <div className="book-detail-refresh-dialog-copy">
          <p id="book-detail-refresh-description">TextPlex will re-run OCR or transcription across all {manifest.page_count} source {manifest.page_count === 1 ? "page" : "pages"}. This can replace the current extracted text and change sentence boundaries, word data, and reader layout.</p>
          <p className="book-detail-refresh-warning"><strong>Risk:</strong> if the source pages are unavailable or the new pass is less accurate, the reader may show different or incomplete extracted text. Your source pages are not deleted, but the previous extraction is not preserved by this action.</p>
        </div>
        <div className="book-detail-refresh-dialog-actions">
          <button className="button button-secondary" type="button" onClick={() => setShowRefreshConfirm(false)}>Cancel</button>
          <button className="button button-primary" type="button" onClick={() => { setShowRefreshConfirm(false); void handleExtractNow(); }}>Refresh extraction</button>
        </div>
      </section>
    </div>
  ) : null;

  return (
    <>
      <section className="app-shell">
      <header className="page-hero">
        <div className="detail-hero-copy" data-inventory-id="book-detail.page-hero">
          <span className="pill detail-type-pill">{book ? typeLabel : "Reading item"}</span>
          <h1>{heroTitle ?? (loading ? <span className="skeleton-line skeleton-line-title" aria-hidden="true" /> : "Book unavailable")}</h1>
          <p className="lede detail-hero-summary">{heroSummary ?? "Open a local reading item to see its summary and page data."}</p>
          {isDemoMode ? <p className="small-copy">Demo mode is active. This is the packaged GitHub Pages reader sample.</p> : null}
        </div>
      </header>

      {loading ? <LoadingSkeleton label="Loading book details" /> : null}
      {error ? <div className="card error-card">{error}</div> : null}
      {extractError ? <div className="card error-card">{extractError}</div> : null}
      {archiveError ? <div className="card error-card">{archiveError}</div> : null}

      {book && manifest ? (
        <div className="detail-layout">
          <div className="detail-main-stack">
          <article className="card detail-main">
            <div className="card-topline">
              <span className="muted">{needsExtraction ? "Preparing to read" : "Ready to read"}</span>
            </div>
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
                Open
              </Link>
              <Link className="button button-secondary" href={`/reader/${bookId}/${firstPageNumber}`}>
                Restart
              </Link>
              <button className="button button-secondary" type="button" onClick={() => setShowRefreshConfirm(true)} disabled={extracting || loading || isDemoMode} aria-label="Refresh extraction" title="Refresh extraction">
                {extracting ? "Refreshing..." : "Refresh"}
              </button>
              <Link className="button button-secondary" href="/library">
                Library
              </Link>
              <button className="button button-secondary" type="button" onClick={() => void handleArchive()} disabled={archiving || isDemoMode}>
                {archiving ? "Archiving..." : "Archive"}
              </button>
            </div>
            {book.source_type === "page-by-page" ? (
              <div className="book-detail-completion-control" data-inventory-id="book-detail.completion-control">
                <p className="small-copy">
                  {pageByPageFinished
                    ? "Marked finished at the current page frontier. Adding another page will reopen this book for reading."
                    : "Reached the end of the pages currently uploaded? You can mark this book finished and still add more pages later."}
                </p>
                <button className="button button-secondary" type="button" onClick={() => void handlePageByPageCompletion()} disabled={completionSaving || isDemoMode}>
                  {completionSaving ? "Saving..." : pageByPageFinished ? "Reopen for more pages" : "Mark current pages finished"}
                </button>
                {completionError ? <p className="reader-completion-error" role="alert">{completionError}</p> : null}
              </div>
            ) : null}
            {isDemoMode ? (
              <p className="small-copy">The sample book is already packaged for preview mode, so extraction is not needed here.</p>
            ) : needsExtraction ? (
              <p className="small-copy">Extraction has not run yet, so the reader will be empty until the pages are processed.</p>
            ) : null}
          </article>
          {book.source_type === "page-by-page" && !isDemoMode ? (
            <PhotoPageAppendCard
              bookId={book.id}
              onAppended={(updatedBook) => {
                setBook(updatedBook);
                setRefreshNonce((value) => value + 1);
              }}
            />
          ) : null}
          </div>

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
                    <li key={entry.lemma} className="frequency-entry">
                      {(() => {
                        const token = findLexicalEntryToken(summary, entry);
                        return (
                          <>
                            <div className="frequency-entry-topline">
                              <strong>{entry.display_form}</strong>
                            </div>
                            <dl className="frequency-entry-details">
                              {showJapaneseReadingFields ? (
                                <>
                                  <div>
                                    <dt>Hiragana</dt>
                                    <dd>{token?.furigana ?? token?.pronunciation ?? "—"}</dd>
                                  </div>
                                  <div>
                                    <dt>Romaji</dt>
                                    <dd>{token?.romanization ?? "—"}</dd>
                                  </div>
                                </>
                              ) : (
                                <div>
                                  <dt>Pronunciation</dt>
                                  <dd>{token?.pronunciation ?? token?.romanization ?? "—"}</dd>
                                </div>
                              )}
                              <div>
                                <dt>Meaning</dt>
                                <dd>{token?.definition_short ?? "—"}</dd>
                              </div>
                              <div>
                                <dt>POS · Count</dt>
                                <dd>{token?.part_of_speech ?? "—"} · {entry.frequency_in_book}×</dd>
                              </div>
                            </dl>
                          </>
                        );
                      })()}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="small-copy">No extraction summary is available yet for this book.</p>
            )}
            {generationDetails ? (
              <GeneratedArticlePromptCard
                inventoryId="book-detail.generation-prompt-card"
                details={generationDetails}
                title="Generated article prompt"
                description="This card records the exact generation request, prompt payload, and term window used for the article."
              />
            ) : null}
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
      {typeof document !== "undefined" && refreshDialog ? createPortal(refreshDialog, document.body) : null}
    </>
  );
}
