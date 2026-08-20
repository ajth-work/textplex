"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { deleteBook, fetchJson, formatDateTime, isDemoMode, restoreBook, type BookRecord } from "../lib/textplex";
import { languageShortCode, targetLanguageOptions } from "../lib/language-options";

type ArchiveContentType = "all" | "article" | "book";

function archiveContentType(book: BookRecord): Exclude<ArchiveContentType, "all"> {
  const sourceFilename = book.source_filename.toLowerCase();
  return book.source_type === "page-by-page" || sourceFilename.endsWith(".pdf") || sourceFilename.endsWith(".epub") ? "book" : "article";
}

export function ArchiveView() {
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [languageCode, setLanguageCode] = useState("all");
  const [contentType, setContentType] = useState<ArchiveContentType>("all");

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }
    void fetchJson<BookRecord[]>("/books/archived")
      .then(setBooks)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load the archive."))
      .finally(() => setLoading(false));
  }, []);

  async function handleRestore(bookId: string) {
    setRestoringId(bookId);
    setError(null);
    try {
      await restoreBook(bookId);
      setBooks((current) => current.filter((book) => book.id !== bookId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to restore this reading item.");
    } finally {
      setRestoringId(null);
    }
  }

  async function handleDelete(book: BookRecord) {
    if (deletingId || !window.confirm(`Delete “${book.title}” permanently? This cannot be undone.`)) {
      return;
    }
    setDeletingId(book.id);
    setError(null);
    try {
      await deleteBook(book.id);
      setBooks((current) => current.filter((item) => item.id !== book.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete this reading item.");
    } finally {
      setDeletingId(null);
    }
  }

  const filteredBooks = useMemo(() => books.filter((book) => {
    return (languageCode === "all" || book.language_code === languageCode)
      && (contentType === "all" || archiveContentType(book) === contentType);
  }), [books, contentType, languageCode]);

  return (
    <section className="library-page" data-inventory-id="archive.page">
      <header className="library-hero card" data-inventory-id="archive.hero">
        <div className="library-hero-head"><p className="eyebrow">Archive</p></div>
        <div className="library-controls">
          <div>
            <h1>Finished reading</h1>
            <p className="lede">Keep completed items out of your active library while preserving their progress and reader data.</p>
          </div>
          <Link className="button button-secondary" href="/library">Back to library</Link>
        </div>
        <details className="library-filter-menu archive-filter-menu" data-inventory-id="archive.filter-menu">
          <summary className="library-filter-button" data-inventory-id="archive.filter-button">Filter</summary>
          <div className="library-filter-panel">
            <label className="library-filter-field" data-inventory-id="archive.language-filter">
              <span>Language</span>
              <select value={languageCode} onChange={(event) => setLanguageCode(event.target.value)}>
                <option value="all">All languages</option>
                {targetLanguageOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
              </select>
            </label>
            <label className="library-filter-field" data-inventory-id="archive.content-type-filter">
              <span>Content type</span>
              <select value={contentType} onChange={(event) => setContentType(event.target.value as ArchiveContentType)}>
                <option value="all">All content</option>
                <option value="article">Articles</option>
                <option value="book">Books</option>
              </select>
            </label>
          </div>
        </details>
      </header>
      <section className="library-shell card" data-inventory-id="archive.shelf">
        {error ? <p className="error-card" role="alert">{error}</p> : null}
        {loading ? <p className="small-copy">Loading archive...</p> : null}
        {!loading && books.length > 0 && filteredBooks.length === 0 ? <div className="library-empty-card" data-inventory-id="archive.empty-state"><h2>No archived items match these filters.</h2><p>Try another language or content type.</p></div> : null}
        {!loading && books.length === 0 ? <div className="library-empty-card" data-inventory-id="archive.empty-state"><h2>Nothing archived yet.</h2><p>When you finish a static article or book, choose archive to move it here.</p></div> : null}
        {!loading && filteredBooks.length > 0 ? (
          <div className="library-shelf">
            {filteredBooks.map((book) => (
              <article className="library-card" key={book.id} data-inventory-id="archive.book-card">
                <div className={`home-book-art home-book-art-${book.language_code.slice(0, 2).toLowerCase()}`} aria-hidden="true" />
                <div className="library-card-body">
                  <p className="library-kicker">{languageShortCode(book.language_code)} · Archived</p>
                  <h3>{book.title}</h3>
                  <p className="library-author">{book.author ?? "Unknown author"}</p>
                  <p className="library-summary">Archived {formatDateTime(book.archived_at ?? book.created_at)}</p>
                  <div className="library-action-buttons archive-action-buttons">
                    <Link className="button button-secondary archive-action-button" href={`/books/${book.id}`}>Open</Link>
                    <button className="button button-primary archive-action-button" type="button" onClick={() => void handleRestore(book.id)} disabled={restoringId === book.id}>
                      {restoringId === book.id ? "Restoring..." : "Restore"}
                    </button>
                    <button className="button button-secondary archive-action-button archive-delete-button" type="button" onClick={() => void handleDelete(book)} disabled={deletingId === book.id}>
                      {deletingId === book.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}
