"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [selectedSentenceOrder, setSelectedSentenceOrder] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        const pageResult = await fetchJson<BookReaderPageResponse>(`/books/${bookId}/pages/${pageNumber}`);
        if (!active) {
          return;
        }
        setPageData(pageResult);
        setSelectedToken(pageResult.extraction?.page.sentences[0]?.tokens[0] ?? null);
        setSelectedSentenceOrder(pageResult.extraction?.page.sentences[0]?.order ?? null);
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
            <div className="reader-page-image">
              <img src={imageUrl} alt={`Page ${pageNumber} image`} />
            </div>
            <div className="reader-page-text">
              {page.sentences.map((sentence) => (
                <p key={sentence.order} className="sentence-row" aria-label={`Sentence ${sentence.order}`}>
                  {sentence.tokens.map((token) => (
                    <button
                      key={`${sentence.order}-${token.order}-${token.surface_form}`}
                      type="button"
                      className={`token-chip ${selectedToken?.surface_form === token.surface_form && selectedToken?.order === token.order ? "is-selected" : ""}`}
                      onClick={() => {
                        setSelectedToken(token);
                        setSelectedSentenceOrder(sentence.order);
                      }}
                    >
                      {token.surface_form}
                    </button>
                  ))}
                </p>
              ))}
            </div>
          </article>

          <aside className="reader-sidebar">
            <section className="card inspector-card">
              <h2>Definition panel</h2>
              {selectedToken ? (
                <>
                  <div className="token-heading">
                    <strong>{selectedToken.surface_form}</strong>
                    <span>{selectedToken.lemma ?? selectedToken.surface_form}</span>
                  </div>
                  <p className="small-copy">
                    {selectedToken.definition_short ?? "Definition lookup is not wired yet, but the selected token stays anchored to the book data."}
                  </p>
                  <dl className="inspector-grid">
                    <div>
                      <dt>Sentence</dt>
                      <dd>{selectedSentenceOrder ?? selectedToken.order}</dd>
                    </div>
                    <div>
                      <dt>Book frequency</dt>
                      <dd>{tokenEntry?.frequency_in_book ?? 1}</dd>
                    </div>
                    <div>
                      <dt>First page</dt>
                      <dd>{tokenEntry?.first_page ?? pageNumber}</dd>
                    </div>
                    <div>
                      <dt>Last page</dt>
                      <dd>{tokenEntry?.last_page ?? pageNumber}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="small-copy">Tap a token in the page text to inspect it here.</p>
              )}
            </section>

            <section className="card inspector-card">
              <h2>Book frequency</h2>
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
