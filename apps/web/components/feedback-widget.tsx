"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";

import { appVersion } from "../lib/build-info";
import { READER_FEEDBACK_REQUEST_EVENT, type ReaderFeedbackRequest } from "../lib/feedback-events";
import { submitFeedback, submitFeedbackWithScreenshots, type FeedbackContext, type FeedbackReason } from "../lib/textplex";

const LAST_LANGUAGE_KEY = "textplex:last-language-code";
const LAST_BOOK_TITLE_KEY = "textplex:last-book-title";
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const MAX_SCREENSHOTS = 3;
const MAX_SCREENSHOTS_TOTAL_BYTES = 15 * 1024 * 1024;
const SCREENSHOT_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);
const SCREENSHOT_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

const QUICK_FEEDBACK_OPTIONS: ReadonlyArray<{ reason: FeedbackReason; label: string }> = [
  { reason: "missing_pronunciation", label: "Missing pronunciation" },
  { reason: "incorrect_pronunciation", label: "Incorrect pronunciation" },
  { reason: "incorrect_meaning", label: "Incorrect meaning" },
  { reason: "incorrect_segmentation", label: "Incorrect word split" },
];

type QuickFeedbackToast = {
  message: string;
  tone: "pending" | "success" | "error";
};

function normalizeParam(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function readOptionalNumber(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : null;
}

function isSupportedScreenshot(file: File): boolean {
  const contentType = file.type.trim().toLowerCase();
  if (SCREENSHOT_TYPES.has(contentType)) {
    return true;
  }
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return (!contentType || contentType === "application/octet-stream") && SCREENSHOT_EXTENSIONS.has(extension);
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  );
}

export function FeedbackWidget({ embedded = false }: Readonly<{ embedded?: boolean }>) {
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [readerFeedbackRequest, setReaderFeedbackRequest] = useState<ReaderFeedbackRequest | null>(null);
  const [showDetailedForm, setShowDetailedForm] = useState(false);
  const [quickFeedbackToast, setQuickFeedbackToast] = useState<QuickFeedbackToast | null>(null);
  const quickFeedbackToastTimerRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);

  const context = useMemo<FeedbackContext>(() => {
    const routeParams = params as Record<string, string | string[] | undefined>;
    const bookId = normalizeParam(routeParams.bookId);
    const pageNumber = readOptionalNumber(normalizeParam(routeParams.pageNumber));
    const sentenceOrder = readOptionalNumber(searchParams.get("sentence"));
    let languageCode: string | null = null;
    let bookTitle: string | null = null;
    if (typeof window !== "undefined") {
      languageCode = window.localStorage.getItem(LAST_LANGUAGE_KEY);
      bookTitle = window.localStorage.getItem(LAST_BOOK_TITLE_KEY);
    }

    return {
      route: `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
      page_title: typeof document !== "undefined" ? document.title : "TextPlex",
      language_code: languageCode,
      book_id: bookId,
      book_title: bookTitle,
      page_number: pageNumber,
      sentence_order: sentenceOrder,
      app_version: appVersion,
      viewport_width: typeof window !== "undefined" ? window.innerWidth : null,
      viewport_height: typeof window !== "undefined" ? window.innerHeight : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    };
  }, [params, pathname, searchParams]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => () => {
    if (quickFeedbackToastTimerRef.current !== null) {
      window.clearTimeout(quickFeedbackToastTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open]);

  useEffect(() => {
    const onReaderFeedbackRequest = (event: Event) => {
      const request = (event as CustomEvent<ReaderFeedbackRequest>).detail;
      if (!request?.target || !request.targetText || !request.message) {
        return;
      }

      setReaderFeedbackRequest(request);
      setStatus("idle");
      setErrorMessage("");
      setMessage(request.message);
      setShowDetailedForm(!request.quickFeedback);
      setScreenshots([]);
      if (screenshotInputRef.current) {
        screenshotInputRef.current.value = "";
      }
      setOpen(true);
    };

    window.addEventListener(READER_FEEDBACK_REQUEST_EVENT, onReaderFeedbackRequest);
    return () => window.removeEventListener(READER_FEEDBACK_REQUEST_EVENT, onReaderFeedbackRequest);
  }, []);

  function close() {
    if (status !== "submitting") {
      setOpen(false);
    }
  }

  function showQuickFeedbackToast(message: string, tone: QuickFeedbackToast["tone"], duration = 2600): void {
    if (quickFeedbackToastTimerRef.current !== null) {
      window.clearTimeout(quickFeedbackToastTimerRef.current);
      quickFeedbackToastTimerRef.current = null;
    }
    setQuickFeedbackToast({ message, tone });
    if (duration > 0) {
      quickFeedbackToastTimerRef.current = window.setTimeout(() => {
        setQuickFeedbackToast(null);
        quickFeedbackToastTimerRef.current = null;
      }, duration);
    }
  }

  function buildSubmissionContext(reason?: FeedbackReason): FeedbackContext {
    return readerFeedbackRequest
      ? {
          ...context,
          feedback_target: readerFeedbackRequest.target,
          feedback_target_text: readerFeedbackRequest.targetText,
          feedback_target_order: readerFeedbackRequest.targetOrder ?? null,
          feedback_reason: reason ?? null,
        }
      : context;
  }

  function handleQuickFeedback(reason: FeedbackReason, label: string): void {
    if (!readerFeedbackRequest || readerFeedbackRequest.target !== "word") {
      return;
    }

    const request = readerFeedbackRequest;
    const submissionContext = buildSubmissionContext(reason);
    setErrorMessage("");
    setOpen(false);
    setReaderFeedbackRequest(null);
    setShowDetailedForm(false);
    showQuickFeedbackToast("Sending feedback…", "pending", 0);
    void submitFeedback(`Quick word feedback: ${label}\n\n${request.message}`, submissionContext)
      .then(() => showQuickFeedbackToast("Feedback sent!", "success"))
      .catch(() => showQuickFeedbackToast("Couldn’t send feedback. Try again.", "error"));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 3) {
      setStatus("error");
      setErrorMessage("Please add a little more detail so the report is useful.");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");
    const submissionContext = buildSubmissionContext();
    try {
      if (screenshots.length > 0) {
        await submitFeedbackWithScreenshots(trimmedMessage, submissionContext, screenshots);
      } else {
        await submitFeedback(trimmedMessage, submissionContext);
      }
      setStatus("success");
      setMessage("");
      setScreenshots([]);
      if (screenshotInputRef.current) {
        screenshotInputRef.current.value = "";
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error && error.message ? error.message : "The report could not be sent. Please try again.");
    }
  }

  function handleScreenshotChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      setScreenshots([]);
      return;
    }
    if (files.length > MAX_SCREENSHOTS) {
      setScreenshots([]);
      event.currentTarget.value = "";
      setStatus("error");
      setErrorMessage(`Please choose no more than ${MAX_SCREENSHOTS} screenshots.`);
      return;
    }
    if (files.some((file) => !isSupportedScreenshot(file))) {
      setScreenshots([]);
      event.currentTarget.value = "";
      setStatus("error");
      setErrorMessage("Please choose PNG, JPEG, WebP, or GIF screenshots.");
      return;
    }
    if (files.some((file) => file.size > MAX_SCREENSHOT_BYTES)) {
      setScreenshots([]);
      event.currentTarget.value = "";
      setStatus("error");
      setErrorMessage("Each screenshot must be 5 MB or smaller.");
      return;
    }
    if (files.reduce((total, file) => total + file.size, 0) > MAX_SCREENSHOTS_TOTAL_BYTES) {
      setScreenshots([]);
      event.currentTarget.value = "";
      setStatus("error");
      setErrorMessage("The combined screenshot size must be 15 MB or smaller.");
      return;
    }
    setScreenshots(files);
    setStatus("idle");
    setErrorMessage("");
  }

  const trigger = (
        <button
          type="button"
          className="button button-secondary button-compact app-feedback-button"
          onClick={() => {
            setStatus("idle");
            setErrorMessage("");
            setScreenshots([]);
            if (screenshotInputRef.current) {
              screenshotInputRef.current.value = "";
            }
            setReaderFeedbackRequest(null);
            setShowDetailedForm(true);
            setOpen(true);
          }}
          data-inventory-id="shell.feedback-button"
        >
          <span aria-hidden="true">✦</span>
          <span>Send feedback</span>
        </button>
  );

  const dialog = open && mounted
    ? createPortal(
      <div className="app-feedback-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
        <section className="app-feedback-dialog card" role="dialog" aria-modal="true" aria-labelledby="feedback-dialog-title" data-inventory-id="shell.feedback-dialog">
          <div className="app-feedback-dialog-header">
            <div>
              <span className="eyebrow">Quick feedback</span>
              <h2 id="feedback-dialog-title">What needs fixing?</h2>
            </div>
            <button type="button" className="button button-secondary app-feedback-close-button" onClick={close} disabled={status === "submitting"} aria-label="Close feedback dialog" title="Close feedback dialog" data-inventory-id="shell.feedback-close-button">
              <CloseIcon />
            </button>
          </div>
          {status === "success" ? (
            <div className="app-feedback-success" role="status">
              <strong>Thanks — your report is in.</strong>
              <p className="small-copy">We saved the issue and page context for review.</p>
              <button type="button" className="button button-primary" onClick={close}>Done</button>
            </div>
          ) : readerFeedbackRequest?.quickFeedback && readerFeedbackRequest.target === "word" && !showDetailedForm ? (
            <div className="app-feedback-quick-panel" data-inventory-id="reader.word-quick-feedback">
              <p className="app-feedback-quick-intro">For <strong>{readerFeedbackRequest.targetText}</strong></p>
              <div className="app-feedback-quick-options" role="group" aria-label="Common word feedback">
                {QUICK_FEEDBACK_OPTIONS.map((option) => (
                  <button
                    type="button"
                    className="button button-secondary app-feedback-quick-option"
                    key={option.reason}
                    onClick={() => handleQuickFeedback(option.reason, option.label)}
                    disabled={status === "submitting"}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button type="button" className="button button-quiet app-feedback-quick-note-action" onClick={() => setShowDetailedForm(true)} disabled={status === "submitting"}>
                Add details
              </button>
              {errorMessage ? <p className="app-feedback-error" role="alert">{errorMessage}</p> : null}
            </div>
          ) : (
            <form className="app-feedback-form" onSubmit={handleSubmit}>
              <label htmlFor="feedback-message">What should we fix?</label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                  if (status === "error") {
                    setStatus("idle");
                    setErrorMessage("");
                  }
                }}
                placeholder="Tell us what went wrong and include the steps if useful."
                maxLength={5000}
                rows={7}
                autoFocus
                required
              />
              <div className="app-feedback-screenshot-row" data-inventory-id="shell.feedback-screenshot">
                <label className="button button-secondary app-feedback-screenshot-button" htmlFor="feedback-screenshot">
                  <span aria-hidden="true">▧</span>
                  <span>{screenshots.length > 0 ? "Change screenshots" : "Add screenshots"}</span>
                </label>
                <input
                  id="feedback-screenshot"
                  ref={screenshotInputRef}
                  className="app-feedback-screenshot-input"
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleScreenshotChange}
                  disabled={status === "submitting"}
                />
                {screenshots.length > 0 ? (
                  <div className="app-feedback-screenshot-file-list">
                    {screenshots.map((file, index) => (
                      <span className="app-feedback-screenshot-file" key={`${file.name}-${file.size}-${index}`} title={file.name}>{file.name}</span>
                    ))}
                    <button type="button" className="button button-secondary app-feedback-screenshot-remove" onClick={() => { setScreenshots([]); if (screenshotInputRef.current) screenshotInputRef.current.value = ""; }} disabled={status === "submitting"}>Remove</button>
                  </div>
                ) : <span className="small-copy">Optional · up to 3 images, 5 MB each</span>}
              </div>
              <p className="small-copy">We’ll include this page, build, and device context. Don’t include passwords or private book files.</p>
              {errorMessage ? <p className="app-feedback-error" role="alert">{errorMessage}</p> : null}
              <div className="app-feedback-dialog-actions">
                {readerFeedbackRequest?.quickFeedback ? <button type="button" className="button button-quiet" onClick={() => setShowDetailedForm(false)} disabled={status === "submitting"}>Back to quick feedback</button> : null}
                <button type="button" className="button button-secondary" onClick={close} disabled={status === "submitting"}>Cancel</button>
                <button type="submit" className="button button-primary" disabled={status === "submitting"}>{status === "submitting" ? "Sending…" : "Send report"}</button>
              </div>
            </form>
          )}
        </section>
      </div>,
      document.body,
    )
    : null;

  return (
    <>
      {embedded ? (
        <div className="app-feedback-footer" aria-label="TextPlex feedback" data-inventory-id="shell.feedback-footer">{trigger}</div>
      ) : (
        <footer className="app-feedback-footer" aria-label="TextPlex feedback" data-inventory-id="shell.feedback-footer">{trigger}</footer>
      )}
      {quickFeedbackToast ? <p className={`app-feedback-quick-toast is-${quickFeedbackToast.tone}`} role="status" aria-live="polite">{quickFeedbackToast.message}</p> : null}
      {dialog}
    </>
  );
}
