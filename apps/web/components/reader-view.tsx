"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  fetchJson,
  formatElapsed,
  postJson,
  resolveResourceUrl,
  triggerBookExtraction,
  isDemoMode,
  type BookExtractionResult,
  type BookReaderPageResponse,
  type LearningProfileSummary,
  type LexicalEntryResult,
  type LexiconLookupResponse,
  type PageReadRecord,
  type ReadingSessionRecord,
  type TokenResult,
} from "../lib/textplex";

function resolveEntry(summary: BookExtractionResult | null, token: TokenResult | null): LexicalEntryResult | null {
  if (!summary || !token) {
    return null;
  }
  const key = token.lemma ?? token.surface_form;
  return summary.lexical_entries.find((entry) => entry.lemma === key) ?? null;
}

export function ReaderView({ bookId, pageNumber }: { bookId: string; pageNumber: number }) {
  const [pageData, setPageData] = useState<BookReaderPageResponse | null>(null);
  const [summary, setSummary] = useState<BookExtractionResult | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenResult | null>(null);
  const [selectedSentenceOrder, setSelectedSentenceOrder] = useState<number | null>(null);
  const [showPageImage, setShowPageImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [profileSummary, setProfileSummary] = useState<LearningProfileSummary | null>(null);
  const [lexiconResult, setLexiconResult] = useState<LexiconLookupResponse | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const sessionIdRef = useRef<string | null>(null);
  const activeSecondsRef = useRef(0);

  useEffect(() => {
    let active = true;
    setLoading(true);

    async function loadPage() {
      try {
        const pageResult = await fetchJson<BookReaderPageResponse>(`/books/${bookId}/pages/${pageNumber}`);
        if (!active) {
          return;
        }
        setPageData(pageResult);
        setSelectedToken(null);
        setSelectedSentenceOrder(null);
        setShowPageImage(false);
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
        try {
          const profileResult = await fetchJson<LearningProfileSummary>("/learning/profile");
          if (active) {
            setProfileSummary(profileResult);
          }
        } catch {
          if (active) {
            setProfileSummary(null);
          }
        }
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to load page.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      active = false;
    };
  }, [bookId, pageNumber, refreshNonce]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setActiveSeconds((value) => value + 1);
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    activeSecondsRef.current = activeSeconds;
  }, [activeSeconds]);

  useEffect(() => {
    let active = true;

    async function loadLexicon() {
      if (!pageData || !selectedToken) {
        if (active) {
          setLexiconResult(null);
        }
        return;
      }

      try {
        const lookup = await fetchJson<LexiconLookupResponse>(
          `/lexicon/lookup?language_code=${encodeURIComponent(pageData.book.language_code)}&term=${encodeURIComponent(selectedToken.surface_form)}`,
        );
        if (active) {
          setLexiconResult(lookup);
        }
      } catch {
        if (active) {
          setLexiconResult(null);
        }
      }
    }

    void loadLexicon();

    return () => {
      active = false;
    };
  }, [pageData, selectedToken]);

  useEffect(() => {
    let active = true;

    async function ensureSession() {
      const storageKey = `textplex-reading-session:${bookId}`;
      const storedSessionId = window.localStorage.getItem(storageKey);
      if (storedSessionId) {
        sessionIdRef.current = storedSessionId;
        if (active) {
          setSessionReady(true);
        }
        return;
      }

      const session = await postJson<ReadingSessionRecord>("/learning/sessions", {
        book_id: bookId,
      });
      if (!active) {
        return;
      }

      window.localStorage.setItem(storageKey, session.id);
      sessionIdRef.current = session.id;
      setSessionReady(true);
    }

    void ensureSession().catch(() => {
      if (active) {
        setSessionReady(false);
      }
    });

    return () => {
      active = false;
    };
  }, [bookId]);

  useEffect(() => {
    return () => {
      const sessionId = sessionIdRef.current;
      const seconds = activeSecondsRef.current;
      if (!sessionId || seconds <= 0) {
        return;
      }

      void postJson<PageReadRecord>("/learning/page-reads", {
        session_id: sessionId,
        book_id: bookId,
        page_number: pageNumber,
        active_seconds: seconds,
      }).catch(() => {
        // The reader stays usable even if the profile write fails.
      });
    };
  }, [bookId, pageNumber]);

  const page = pageData?.extraction?.page ?? null;
  const tokenEntry = resolveEntry(summary, selectedToken);
  const lexiconEntry = lexiconResult?.entries[0] ?? null;
  const imageUrl = pageData ? resolveResourceUrl(pageData.image_url) : "";
  const totalPages = pageData?.book.total_pages ?? summary?.page_end ?? pageNumber;
  const selectedSentence = useMemo(
    () => (page ? page.sentences.find((sentence) => sentence.order === selectedSentenceOrder) ?? null : null),
    [page, selectedSentenceOrder],
  );
  const definitionSummary = selectedToken && !lexiconEntry && !tokenEntry ? "Dictionary wiring is pending." : null;
  const tokenLabel = lexiconEntry?.surface_form ?? selectedToken?.surface_form ?? "";
  const tokenDefinition =
    lexiconEntry?.definition ??
    selectedToken?.definition_short ??
    (tokenEntry
      ? `Seen ${tokenEntry.frequency_in_book} times in this book.`
      : "Dictionary wiring is pending, but the token stays anchored to the book data.");
  const tokenPinyin = lexiconEntry?.pinyin ?? selectedToken?.romanization ?? null;
  const tokenHsk = lexiconEntry?.hsk_level ?? selectedToken?.proficiency_level ?? null;
  const tokenRadical = lexiconEntry?.radical ?? null;
  const tokenStrokeCount = lexiconEntry?.stroke_count ?? null;
  const needsExtraction = (pageData?.book.extracted_page_count ?? 0) <= 0;
  const extractionSource = pageData?.extraction?.text_source ?? null;
  const extractionSourceLabel = extractionSource ? extractionSource.toUpperCase() : "UNAVAILABLE";

  async function handleExtractNow() {
    if (!pageData || extracting) {
      return;
    }

    setExtracting(true);
    setExtractError(null);
    try {
      await triggerBookExtraction(bookId, {
        page_start: 1,
        page_count: pageData.book.total_pages,
        force: true,
      });
      setRefreshNonce((value) => value + 1);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Unable to start extraction.");
    } finally {
      setExtracting(false);
    }
  }

  return (
    <section className="reader-shell">
      <header className="reader-topbar card">
        <div>
          <span className="eyebrow">Reader</span>
          <h1>{pageData?.book.title ?? "Loading page..."}</h1>
          <p className="muted">
            Page {pageNumber} of {totalPages}
          </p>
          {isDemoMode ? <p className="small-copy">Demo mode is active. This reader is running from packaged sample data.</p> : null}
        </div>
        <div className="reader-topbar-actions">
          <div className="timer-chip">
            <span className="muted">Active</span>
            <strong>{formatElapsed(activeSeconds)}</strong>
          </div>
          <div className="timer-chip">
            <span className="muted">Source</span>
            <strong>{extractionSourceLabel}</strong>
          </div>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => void handleExtractNow()}
            disabled={extracting || loading || !pageData}
          >
            {extracting ? "Refreshing..." : pageData?.book.extracted_page_count ? "Refresh extraction" : "Extract now"}
          </button>
          {pageData?.book ? (
            <Link className="button button-secondary" href={`/books/${bookId}`}>
              Book detail
            </Link>
          ) : null}
        </div>
      </header>

      {loading ? <div className="card">Loading reader page...</div> : null}
      {error ? <div className="card error-card">{error}</div> : null}
      {extractError ? <div className="card error-card">{extractError}</div> : null}

      {pageData && page ? (
        <div className="reader-layout">
          <article className="card reader-page">
            <div className="reader-card-header">
              <div>
                <span className="eyebrow">Reading focus</span>
                <h2>Reflowed text</h2>
              </div>
              <button
                type="button"
                className="button button-secondary button-compact"
                onClick={() => setShowPageImage((value) => !value)}
              >
                {showPageImage ? "Hide page image" : "Show page image"}
              </button>
            </div>

            {showPageImage ? (
              <div className="reader-page-image">
                <img src={imageUrl} alt={`Page ${pageNumber} image`} />
              </div>
            ) : (
              <div className="page-image-placeholder">
                <strong>Page image hidden</strong>
                <p className="small-copy">The PDF page stays out of the way so the reflowed text can carry the reading session.</p>
              </div>
            )}

            {selectedToken ? (
              <div className="definition-popover" role="status" aria-live="polite">
                <div className="definition-popover-topline">
                  <div>
                    <span className="eyebrow">Lookup</span>
                    <h3>{tokenLabel}</h3>
                  </div>
                  <button type="button" className="ghost-link" onClick={() => setSelectedToken(null)}>
                    Clear
                  </button>
                </div>
                <p className="definition-copy">{tokenDefinition}</p>
                <dl className="definition-grid">
                  <div>
                    <dt>Lemma</dt>
                    <dd>{selectedToken.lemma ?? selectedToken.surface_form}</dd>
                  </div>
                  <div>
                    <dt>Pinyin</dt>
                    <dd>{tokenPinyin ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>HSK</dt>
                    <dd>{tokenHsk ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Frequency</dt>
                    <dd>{tokenEntry?.frequency_in_book ?? 1}</dd>
                  </div>
                  <div>
                    <dt>Radical</dt>
                    <dd>{tokenRadical ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Strokes</dt>
                    <dd>{tokenStrokeCount ?? "—"}</dd>
                  </div>
                </dl>
                {selectedSentence ? <p className="small-copy sentence-preview">{selectedSentence.text}</p> : null}
                {definitionSummary ? <p className="small-copy">{definitionSummary}</p> : null}
              </div>
            ) : (
              <div className="definition-popover definition-empty">
                <span className="eyebrow">Tap a character or word</span>
                <p>When you click text, the lookup panel will stay in view while the page remains readable.</p>
              </div>
            )}

            <div className="reader-page-text" aria-label="Reflowed page text">
              {page.sentences.map((sentence) => (
                <p key={sentence.order} className="sentence-block" aria-label={`Sentence ${sentence.order}`}>
                  {sentence.tokens.map((token) => {
                    const isSelected = selectedToken?.surface_form === token.surface_form && selectedToken?.order === token.order;
                    const tokenClassName = `token-inline ${isSelected ? "is-selected" : ""} ${isCjkToken(token.surface_form) ? "is-cjk" : "is-word"}`;
                    return (
                      <span
                        key={`${sentence.order}-${token.order}-${token.surface_form}`}
                        role="button"
                        tabIndex={0}
                        className={tokenClassName}
                        onClick={() => {
                          setSelectedToken(token);
                          setSelectedSentenceOrder(sentence.order);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedToken(token);
                            setSelectedSentenceOrder(sentence.order);
                          }
                        }}
                        aria-label={`Inspect ${token.surface_form}`}
                      >
                        {token.surface_form}
                      </span>
                    );
                  })}
                </p>
              ))}
            </div>
          </article>

          <aside className="reader-sidebar">
            <section className="card inspector-card">
              <h2>Book frequency</h2>
              <p className="small-copy">Use this panel to watch book-wide vocabulary density while you read.</p>
              <p className="small-copy">
                Source: <strong>{extractionSourceLabel}</strong>
              </p>
              {summary ? (
                <ul className="frequency-list">
                  {summary.lexical_entries.slice(0, 10).map((entry) => (
                    <li key={entry.lemma}>
                      <strong>{entry.display_form}</strong>
                      <span>{entry.frequency_in_book}x</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small-copy">Book frequency data is unavailable until extraction finishes.</p>
              )}
            </section>

            <section className="card inspector-card">
              <h2>Dictionary wiring</h2>
              <p className="small-copy">
                This panel is ready for your dictionary files and HSK lists. Once those are imported, token clicks can resolve to the full lexicon instead of only book frequency.
              </p>
              <p className="small-copy">For now, the reader uses book extraction metadata so the page still behaves like a reading surface instead of a card wall.</p>
            </section>

            <section className="card inspector-card">
              <h2>Learner profile</h2>
              <p className="small-copy">Reading sessions and page reads are now written to the local profile database.</p>
              <div className="profile-metrics">
                <div>
                  <span className="eyebrow">Sessions</span>
                  <strong>{profileSummary?.reading_sessions ?? 0}</strong>
                </div>
                <div>
                  <span className="eyebrow">Pages</span>
                  <strong>{profileSummary?.page_reads ?? 0}</strong>
                </div>
                <div>
                  <span className="eyebrow">Books</span>
                  <strong>{profileSummary?.active_books ?? 0}</strong>
                </div>
              </div>
              <p className="small-copy">
                {sessionReady ? "A local reading session is active for this book." : "Opening a book starts a session automatically."}
              </p>
            </section>

            <section className="card inspector-card">
              <h2>Navigation</h2>
              <div className="button-row">
                {pageNumber > 1 ? (
                  <Link className="button button-secondary" href={`/reader/${bookId}/${pageNumber - 1}`}>
                    Previous
                  </Link>
                ) : null}
                {pageNumber < totalPages ? (
                  <Link className="button button-secondary" href={`/reader/${bookId}/${pageNumber + 1}`}>
                    Next
                  </Link>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      ) : pageData ? (
        <div className="card empty-state">
          <h2>Page text is not available yet</h2>
          <p>This page image is ready, but the structured extraction summary has not been generated for it yet.</p>
          {needsExtraction ? (
            <div className="button-row">
              <button type="button" className="button button-primary" onClick={() => void handleExtractNow()} disabled={extracting || loading}>
                {extracting ? "Extracting..." : "Extract now"}
              </button>
              <Link className="button button-secondary" href={`/books/${bookId}`}>
                Back to book detail
              </Link>
            </div>
          ) : null}
          {!needsExtraction ? (
            <div className="button-row">
              <button type="button" className="button button-secondary" onClick={() => void handleExtractNow()} disabled={extracting || loading}>
                {extracting ? "Refreshing..." : "Refresh extraction"}
              </button>
              <Link className="button button-secondary" href={`/books/${bookId}`}>
                Back to book detail
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function isCjkToken(value: string): boolean {
  return /[\u3400-\u4dbf\u4e00-\u9fff]/.test(value);
}
