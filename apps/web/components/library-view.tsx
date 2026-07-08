"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchJson, formatDateTime, type BookRecord } from "../lib/textplex";

function BookCard({ book }: { book: BookRecord }) {
  return (
    <article className="card book-card">
      <div className="card-topline">
        <span className="pill">{book.language_code.toUpperCase()}</span>
        <span className="muted">{book.status.replaceAll("_", " ")}</span>
      </div>
      <h3>{book.title}</h3>
      <p className="muted">{book.author ?? "Unknown author"}</p>
      <dl className="metric-grid">
        <div>
          <dt>Pages</dt>
          <dd>{book.total_pages}</dd>
        </div>
        <div>
          <dt>Prepared</dt>
          <dd>{book.page_image_count}</dd>
        </div>
        <div>
          <dt>Extracted</dt>
          <dd>{book.extracted_page_count}</dd>
        </div>
      </dl>
      <p className="small-copy">Updated {formatDateTime(book.processed_at ?? book.created_at)}</p>
      <Link className="button button-primary" href={`/books/${book.id}`}>
        Open book
      </Link>
    </article>
  );
}

export function LibraryView() {
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadBooks() {
      try {
        const result = await fetchJson<BookRecord[]>("/books");
        if (!active) {
          return;
        }
        setBooks(result);
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to load books.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadBooks();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="app-shell">
      <header className="page-hero">
        <div>
          <span className="eyebrow">Library</span>
          <h1>Books ready to read</h1>
          <p className="lede">
            TextPlex keeps the source scan, page images, and extraction results aligned so you can move from book import to reading without losing context.
          </p>
        </div>
        <div className="hero-meta card">
          <strong>{books.length}</strong>
          <span>Imported books in the local registry</span>
        </div>
      </header>

      {loading ? <div className="card">Loading books...</div> : null}
      {error ? <div className="card error-card">{error}</div> : null}

      {!loading && !error && books.length === 0 ? (
        <div className="card empty-state">
          <h2>No books imported yet</h2>
          <p>Use <code>POST /books/import</code> to register a scan, then TextPlex will expose it here for reading.</p>
        </div>
      ) : null}

      <div className="book-grid">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </section>
  );
}
