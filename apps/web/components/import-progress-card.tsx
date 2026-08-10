"use client";

import Link from "next/link";

import { resolveReaderResumeHref, type BookRecord } from "../lib/textplex";
import { isImportComplete, isImportFailed } from "../lib/import-progress";

type ImportProgressCardProps = {
  book: BookRecord;
  inventoryId: string;
  message?: string | null;
  showReaderLink?: boolean;
};

export function ImportProgressCard({ book, inventoryId, message, showReaderLink = true }: ImportProgressCardProps) {
  const totalPages = book.extraction_total_pages ?? 0;
  const processedPages = book.extraction_pages_processed ?? 0;
  const complete = isImportComplete(book);
  const failed = isImportFailed(book);
  const percent = totalPages > 0 ? Math.min(100, Math.round((processedPages / totalPages) * 100)) : complete ? 100 : 0;

  return (
    <section className="card feature-card import-progress-card" data-inventory-id={inventoryId} aria-live="polite">
      <div className="card-topline">
        <div>
          <span className="eyebrow">Import progress</span>
          <h3>{book.title}</h3>
        </div>
        <span className="pill">{complete ? "Complete" : failed ? "Failed" : book.status.replaceAll("_", " ")}</span>
      </div>
      <p>{message ?? (complete ? "Import complete. The reader is ready." : failed ? "TextPlex could not finish processing this book." : "TextPlex is processing this book in the background.")}</p>
      <div className="import-progress-heading">
        <strong>{percent}%</strong>
        <span>{totalPages > 0 ? `${processedPages} of ${totalPages} pages processed` : "Waiting for extraction progress"}</span>
      </div>
      <div className="import-progress-track" role="progressbar" aria-label={`${book.title} import progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <span style={{ width: `${percent}%` }} />
      </div>
      {showReaderLink && complete ? <Link className="button button-secondary" href={resolveReaderResumeHref(book.id, null)}>Open reader</Link> : null}
    </section>
  );
}
