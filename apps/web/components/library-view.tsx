"use client";

import Link from "next/link";
import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { fetchJson, formatDateTime, postFormData, type BookRecord } from "../lib/textplex";

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
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function refreshBooks() {
    const result = await fetchJson<BookRecord[]>("/books");
    setBooks(result);
  }

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

  async function handleUploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setUploading(true);
    setUploadMessage(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("language_code", "zh");
      formData.append("title", file.name.replace(/\.pdf$/i, ""));
      const uploaded = await postFormData<BookRecord>("/books/upload", formData);
      setUploadMessage(`Imported ${uploaded.title} from ${uploaded.source_filename}.`);
      try {
        await refreshBooks();
      } catch (refreshError) {
        setError(refreshError instanceof Error ? refreshError.message : "Unable to refresh books after upload.");
      }
    } catch (err) {
      setUploadMessage(null);
      setError(err instanceof Error ? err.message : "Unable to upload book.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="app-shell">
      <header className="page-hero">
        <div>
          <span className="eyebrow">Library</span>
          <h1>Books ready to read</h1>
          <p className="lede">
            TextPlex keeps the source scan, page images, and extraction results aligned so you can move from book import to reading without losing context.
          </p>
          <div className="button-row">
            <button className="button button-primary" type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload PDF"}
            </button>
            <input
              ref={fileInputRef}
              aria-label="Upload PDF"
              accept="application/pdf,.pdf"
              className="visually-hidden"
              disabled={uploading}
              onChange={handleUploadFile}
              type="file"
            />
          </div>
          <p className="small-copy">Uploads default to Chinese import mode. Pick a PDF from your machine and TextPlex will register it in the library.</p>
          {uploadMessage ? <p className="small-copy">{uploadMessage}</p> : null}
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
