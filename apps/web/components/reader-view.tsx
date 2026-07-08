"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  apiBaseUrl,
  fetchJson,
  formatElapsed,
  type BookExtractionResult,
  type BookReaderPageResponse,
  type LexicalEntryResult,
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

  useEffect(() => {
    let active = true;

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
  }, [bookId, pageNumber]);

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

  const page = pageData?.extraction?.page ?? null;
  const tokenEntry = resolveEntry(summary, selectedToken);
  const imageUrl = pageData ? `${apiBaseUrl}${pageData.image_url}` : "";
  const totalPages = pageData?.book.total_pages ?? summary?.page_end ?? pageNumber;
  const selectedSentence = useMemo(
    () => (page ? page.sentences.find((sentence) => sentence.order === selectedSentenceOrder) ?? null : null),
    [page, selectedSentenceOrder],
  );
  const definitionSummary = selectedToken && !selectedToken.definition_short && !tokenEntry ? "Dictionary wiring is pending." : null;
  const tokenLabel = selectedToken?.surface_form ?? "";
  const tokenDefinition =
    selectedToken?.definition_short ??
    (tokenEntry
      ? `Seen ${tokenEntry.frequency_in_book} times in this book.`
      : "Dictionary wiring is pending, but the token stays anchored to the book data.");

  return (
    <section className="reader-shell">
      <header className="reader-topbar card">
        <div>
          <span className="eyebrow">Reader</span>
          <h1>{pageData?.book.title ?? "Loading page..."}</h1>
          <p className="muted">
            Page {pageNumber} of {totalPages}
          </p>
        </div>
        <div className="reader-topbar-actions">
          <div className="timer-chip">
            <span className="muted">Active</span>
            <strong>{formatElapsed(activeSeconds)}</strong>
          </div>
          {pageData?.book ? (
            <Link className="button button-secondary" href={`/books/${bookId}`}>
              Book detail
            </Link>
          ) : null}
        </div>
      </header>

      {loading ? <div className="card">Loading reader page...</div> : null}
      {error ? <div className="card error-card">{error}</div> : null}

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
                    <dt>Sentence</dt>
                    <dd>{selectedSentenceOrder ?? selectedToken.order}</dd>
                  </div>
                  <div>
                    <dt>Book frequency</dt>
                    <dd>{tokenEntry?.frequency_in_book ?? 1}</dd>
                  </div>
                  <div>
                    <dt>Pages</dt>
                    <dd>
                      {tokenEntry?.first_page ?? pageNumber}
                      {tokenEntry?.last_page && tokenEntry.last_page !== tokenEntry.first_page ? `-${tokenEntry.last_page}` : ""}
                    </dd>
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
                This panel is ready for your dictionary files and HSK lists. Once those are wired in, the popup can move from book frequency to real lookup data.
              </p>
              <p className="small-copy">For now, the reader uses book extraction metadata so the page still behaves like a reading surface instead of a card wall.</p>
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
        </div>
      ) : null}
    </section>
  );
}

function isCjkToken(value: string): boolean {
  return /[\u3400-\u4dbf\u4e00-\u9fff]/.test(value);
}
