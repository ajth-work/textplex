"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type PointerEvent } from "react";

import { fetchJson, postFormData, type BookRecord } from "../lib/textplex";

const MAX_APPEND_PAGES = 12;
const LONG_PRESS_MS = 500;

export type PageUploadInputMode = "auto" | "camera" | "file";
type CompactProcessingState = "idle" | "uploading" | "processing" | "ready" | "failed";

type SelectedPhotoPage = {
  id: string;
  file: File;
  previewUrl: string;
};

function createPhotoPageId(file: File): string {
  const randomPart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${file.name}-${file.lastModified}-${randomPart}`;
}

function processingPercent(book: BookRecord | null, knownPageCount: number | undefined): number {
  if (!book) {
    return 0;
  }
  if (book.extraction_status === "complete") {
    return 100;
  }
  const totalPages = Math.max(1, book.extraction_total_pages);
  if (knownPageCount != null && book.total_pages > knownPageCount) {
    const appendedTotal = Math.max(1, book.total_pages - knownPageCount);
    const appendedProcessed = Math.max(0, book.extraction_pages_processed - knownPageCount);
    return Math.min(99, Math.round((appendedProcessed / appendedTotal) * 100));
  }
  return Math.min(99, Math.round((book.extraction_pages_processed / totalPages) * 100));
}

function isCoarsePointerDevice(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 900;
}

export function PhotoPageAppendCard({
  bookId,
  knownPageCount,
  initialBook,
  compact = false,
  inputMode = "auto",
  onAppended,
  onFirstPageReady,
  onProcessingChange,
  onContinue,
}: {
  bookId: string;
  knownPageCount?: number;
  initialBook?: BookRecord | null;
  compact?: boolean;
  inputMode?: PageUploadInputMode;
  onAppended?: (book: BookRecord) => void;
  onFirstPageReady?: (book: BookRecord) => void;
  onProcessingChange?: (state: CompactProcessingState) => void;
  onContinue?: (book: BookRecord) => void;
}) {
  const [pages, setPages] = useState<SelectedPhotoPage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [processingBook, setProcessingBook] = useState<BookRecord | null>(initialBook ?? null);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pagesRef = useRef<SelectedPhotoPage[]>([]);
  const longPressTimerRef = useRef<number | null>(null);
  const suppressNextClickRef = useRef(false);
  const notifiedProcessingBookRef = useRef<string | null>(null);
  const notifiedFirstPageRef = useRef<string | null>(null);
  const batchActiveRef = useRef(false);
  const batchStartPageRef = useRef<number | null>(knownPageCount ?? null);
  const processingStatus = processingBook?.extraction_status;
  const firstPageNumber = knownPageCount != null ? knownPageCount + 1 : null;
  const firstPageReady = Boolean(
    processingBook &&
      processingBook.total_pages > (knownPageCount ?? Number.MAX_SAFE_INTEGER) &&
      (processingBook.extraction_status === "complete" ||
        (firstPageNumber != null &&
          processingBook.extraction_current_page != null &&
          processingBook.extraction_current_page >= firstPageNumber &&
          processingBook.extraction_pages_processed >= firstPageNumber)),
  );
  const progress = processingPercent(processingBook, batchStartPageRef.current ?? knownPageCount);
  const resolvedInputMode = inputMode === "auto" ? (coarsePointer ? "camera" : "file") : inputMode;

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  useEffect(() => {
    setCoarsePointer(isCoarsePointerDevice());
    const handleViewportChange = () => setCoarsePointer(isCoarsePointerDevice());
    window.addEventListener("resize", handleViewportChange);
    return () => window.removeEventListener("resize", handleViewportChange);
  }, []);

  useEffect(() => {
    if (initialBook && !submitting) {
      setProcessingBook(initialBook);
    }
  }, [initialBook, submitting]);

  useEffect(() => () => {
    pagesRef.current.forEach((page) => URL.revokeObjectURL(page.previewUrl));
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!processingStatus || processingStatus === "complete" || processingStatus === "failed") {
      return;
    }

    let active = true;
    let retryTimer: number | null = null;
    async function pollProcessingStatus() {
      try {
        const currentBook = await fetchJson<BookRecord>(`/books/${encodeURIComponent(bookId)}`);
        if (!active) {
          return;
        }
        setProcessingBook(currentBook);
        if (currentBook.extraction_status !== "complete" && currentBook.extraction_status !== "failed") {
          retryTimer = window.setTimeout(() => void pollProcessingStatus(), 900);
        }
      } catch {
        if (active) {
          retryTimer = window.setTimeout(() => void pollProcessingStatus(), 1500);
        }
      }
    }

    retryTimer = window.setTimeout(() => void pollProcessingStatus(), 350);
    return () => {
      active = false;
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [bookId, processingBook?.id, processingStatus]);

  useEffect(() => {
    if (!processingBook) {
      onProcessingChange?.("idle");
      return;
    }
    if (processingBook.extraction_status === "failed") {
      onProcessingChange?.("failed");
    } else if (firstPageReady) {
      onProcessingChange?.("ready");
    } else if (processingBook.extraction_status === "complete") {
      onProcessingChange?.("idle");
    } else {
      onProcessingChange?.("processing");
    }
  }, [firstPageReady, onProcessingChange, processingBook]);

  useEffect(() => {
    if (!processingBook || !firstPageReady) {
      return;
    }
    const notificationKey = `${processingBook.id}:${processingBook.extraction_updated_at ?? processingBook.total_pages}`;
    if (notifiedFirstPageRef.current === notificationKey) {
      return;
    }
    notifiedFirstPageRef.current = notificationKey;
    onFirstPageReady?.(processingBook);
  }, [firstPageReady, onFirstPageReady, processingBook]);

  useEffect(() => {
    if (batchActiveRef.current && processingBook?.extraction_status === "complete" && notifiedProcessingBookRef.current !== processingBook.extraction_updated_at) {
      notifiedProcessingBookRef.current = processingBook.extraction_updated_at;
      onAppended?.(processingBook);
    }
  }, [onAppended, processingBook]);

  function clearPages() {
    pages.forEach((page) => URL.revokeObjectURL(page.previewUrl));
    setPages([]);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function addPages(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) {
      return;
    }
    const availableSlots = MAX_APPEND_PAGES - pages.length;
    if (availableSlots <= 0) {
      setError(`You can add up to ${MAX_APPEND_PAGES} pages at a time.`);
      return;
    }
    const accepted = selected.slice(0, availableSlots);
    setError(selected.length > accepted.length ? `Only ${MAX_APPEND_PAGES} pages can be added at a time.` : null);
    setMessage(null);
    setPages((current) => [
      ...current,
      ...accepted.map((file) => ({
        id: createPhotoPageId(file),
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  }

  function handleCompactInputChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length || submitting) {
      return;
    }
    const accepted = selected.slice(0, MAX_APPEND_PAGES);
    if (selected.length > accepted.length) {
      setError(`Only ${MAX_APPEND_PAGES} pages can be added at a time.`);
    } else {
      setError(null);
    }
    setMessage(null);
    void appendSelectedFiles(accepted);
  }

  function openInput(mode: "camera" | "file") {
    if (mode === "camera") {
      cameraInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handleCompactPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      suppressNextClickRef.current = true;
      openInput("file");
    }, LONG_PRESS_MS);
  }

  function handleCompactPointerUp() {
    clearLongPressTimer();
  }

  function handleCompactClick() {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    if (firstPageReady && processingBook) {
      onContinue?.(processingBook);
      return;
    }
    openInput(resolvedInputMode);
  }

  async function appendSelectedFiles(selectedFiles: File[]) {
    if (!selectedFiles.length || submitting) {
      return;
    }
    batchStartPageRef.current = knownPageCount ?? initialBook?.total_pages ?? null;
    batchActiveRef.current = true;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    onProcessingChange?.("uploading");
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("images", file, file.name));
      const updatedBook = await postFormData<BookRecord>(`/books/${encodeURIComponent(bookId)}/append-images`, formData);
      notifiedProcessingBookRef.current = null;
      notifiedFirstPageRef.current = null;
      setProcessingBook(updatedBook);
      setMessage(`${selectedFiles.length} ${selectedFiles.length === 1 ? "page" : "pages"} saved. TextPlex is processing the new reading pages.`);
      if (!compact) {
        clearPages();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add the next pages.");
      onProcessingChange?.("failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function appendPages(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pages.length || submitting) {
      setError("Add at least one next page photo before uploading.");
      return;
    }
    await appendSelectedFiles(pages.map((page) => page.file));
  }

  if (compact) {
    const compactState: CompactProcessingState = submitting
      ? "uploading"
      : processingBook?.extraction_status === "failed"
        ? "failed"
        : firstPageReady
          ? "ready"
          : processingBook && processingBook.extraction_status !== "complete"
            ? "processing"
            : "idle";
    const ringProgress = compactState === "ready" ? 100 : compactState === "uploading" ? 8 : compactState === "processing" ? progress : 0;
    const circumference = 2 * Math.PI * 18;
    const ringOffset = circumference - (ringProgress / 100) * circumference;
    const compactLabel = compactState === "ready" ? "Continue to next page" : compactState === "failed" ? "Retry next page upload" : resolvedInputMode === "camera" ? "Add next page with camera" : "Add next page photo";

    return (
      <div className="reader-frontier-upload-control" data-inventory-id="reader.page-frontier-upload-button">
        <input ref={cameraInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" capture="environment" onChange={handleCompactInputChange} />
        <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" multiple onChange={handleCompactInputChange} />
        <button
          type="button"
          className={`button button-secondary button-compact reader-pager-button reader-frontier-upload-button reader-tooltip-target ${compactState === "ready" ? "is-ready" : ""}`}
          onClick={handleCompactClick}
          onPointerDown={handleCompactPointerDown}
          onPointerUp={handleCompactPointerUp}
          onPointerCancel={handleCompactPointerUp}
          onPointerLeave={handleCompactPointerUp}
          disabled={compactState === "uploading" || compactState === "processing"}
          aria-label={compactLabel}
          aria-describedby="reader-frontier-upload-status"
          data-tooltip={compactLabel}
          aria-busy={compactState === "uploading" || compactState === "processing"}
        >
          <svg className="reader-frontier-upload-ring" viewBox="0 0 40 40" aria-hidden="true">
            <circle className="reader-frontier-upload-ring-track" cx="20" cy="20" r="18" />
            <circle className="reader-frontier-upload-ring-progress" cx="20" cy="20" r="18" style={{ strokeDasharray: circumference, strokeDashoffset: ringOffset }} />
          </svg>
          {compactState === "ready" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 18l6-6-6-6" />
            </svg>
          ) : compactState === "failed" ? (
            <span aria-hidden="true">!</span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          )}
          {compactState === "processing" || compactState === "uploading" ? <span className="reader-frontier-upload-percent">{ringProgress}%</span> : null}
        </button>
        <span id="reader-frontier-upload-status" className="reader-frontier-upload-status" role="status" aria-live="polite">
          {compactState === "uploading" ? `Uploading page photos… ${ringProgress}%` : compactState === "processing" ? `Preparing next page… ${ringProgress}%` : compactState === "ready" ? "Next page ready" : compactState === "failed" ? "Processing failed. Tap to retry." : "Add the next page"}
        </span>
        {error ? <span className="reader-frontier-upload-error" role="alert">{error}</span> : null}
      </div>
    );
  }

  return (
    <section className="photo-import-panel" data-inventory-id="surface.page-by-page-append-card">
      <div className="card-topline">
        <div>
          <span className="eyebrow">Page-by-page source</span>
          <h3>Add the next pages</h3>
          <p className="small-copy">Keep photographing the book as you read. Pages are appended in the order you add them.</p>
        </div>
        <span className="pill">{pages.length}/{MAX_APPEND_PAGES} queued</span>
      </div>
      <form className="surface-form" onSubmit={appendPages}>
        <input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" multiple onChange={addPages} />
        <div className="button-row">
          <button className="button button-secondary" type="button" onClick={() => inputRef.current?.click()} disabled={pages.length >= MAX_APPEND_PAGES || submitting}>
            Add next page photo
          </button>
          {pages.length ? (
            <button className="button button-secondary" type="button" onClick={clearPages} disabled={submitting}>
              Clear queued pages
            </button>
          ) : null}
        </div>
        {pages.length ? (
          <div className="photo-page-list" aria-label="Queued next pages">
            {pages.map((page, index) => (
              <article className="photo-page-item" key={page.id}>
                <Image src={page.previewUrl} alt={`Queued page ${index + 1} preview`} width={120} height={160} unoptimized />
                <strong>Next page {index + 1}</strong>
                <button className="button button-secondary" type="button" onClick={() => { URL.revokeObjectURL(page.previewUrl); setPages((current) => current.filter((candidate) => candidate.id !== page.id)); }} disabled={submitting}>
                  Remove
                </button>
              </article>
            ))}
          </div>
        ) : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {message ? <p className="form-message" role="status">{message}</p> : null}
        <button className="button button-primary" type="submit" disabled={!pages.length || submitting}>
          {submitting ? "Adding pages..." : "Add pages to this book"}
        </button>
        {processingBook ? (
          <div className="reader-page-processing" role="status" aria-live="polite">
            <div className="reader-page-processing-header">
              <div>
                <span className="eyebrow">Page processing</span>
                <strong>
                  {processingBook.extraction_status === "complete"
                    ? "Next page is ready"
                    : processingBook.extraction_status === "failed"
                      ? "Page processing needs attention"
                      : "Preparing the next page"}
                </strong>
              </div>
              <span className="pill">
                {processingBook.extraction_status === "complete"
                  ? "Complete"
                  : `${processingBook.extraction_pages_processed}/${processingBook.extraction_total_pages || 1}`}
              </span>
            </div>
            <div className="reader-page-processing-track" role="progressbar" aria-label="Next page processing progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={processingBook.extraction_status === "complete" ? 100 : Math.min(100, Math.round((processingBook.extraction_pages_processed / Math.max(1, processingBook.extraction_total_pages)) * 100))}>
              <span style={{ width: `${processingBook.extraction_status === "complete" ? 100 : Math.min(100, Math.round((processingBook.extraction_pages_processed / Math.max(1, processingBook.extraction_total_pages)) * 100))}%` }} />
            </div>
            <ul className="reader-page-processing-steps">
              <li><strong>Photo storage:</strong> saved to the local page store.</li>
              <li><strong>OCR/transcription:</strong> {processingBook.ocr_provider === "openai" ? "OpenAI receives only the new page photo(s)." : "local OCR processes only the new page photo(s)."}</li>
              <li><strong>Reader preparation:</strong> local tokenization, sentence segmentation, and page metrics.</li>
              <li><strong>Book update:</strong> cached pages are reused; the local book summary is refreshed.</li>
            </ul>
            {processingBook.extraction_current_page ? <p className="small-copy">Working on stored page {processingBook.extraction_current_page}.</p> : null}
            {processingBook.extraction_status === "failed" ? <p className="form-error">TextPlex could not finish processing this page. You can retry the upload.</p> : null}
          </div>
        ) : null}
      </form>
    </section>
  );
}
