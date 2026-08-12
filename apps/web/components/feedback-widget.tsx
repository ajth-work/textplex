"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useSearchParams } from "next/navigation";

import { appVersion } from "../lib/build-info";
import { READER_FEEDBACK_REQUEST_EVENT, type ReaderFeedbackRequest } from "../lib/feedback-events";
import { submitFeedback, submitFeedbackWithScreenshots, type FeedbackContext } from "../lib/textplex";

const LAST_LANGUAGE_KEY = "textplex:last-language-code";
const LAST_BOOK_TITLE_KEY = "textplex:last-book-title";
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const MAX_SCREENSHOTS = 3;
const MAX_SCREENSHOTS_TOTAL_BYTES = 15 * 1024 * 1024;
const SCREENSHOT_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

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

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  );
}

export function FeedbackWidget() {
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
    if (!open) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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
    const submissionContext: FeedbackContext = readerFeedbackRequest
      ? {
          ...context,
          feedback_target: readerFeedbackRequest.target,
          feedback_target_text: readerFeedbackRequest.targetText,
          feedback_target_order: readerFeedbackRequest.targetOrder ?? null,
        }
      : context;
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
    } catch {
      setStatus("error");
      setErrorMessage("The report could not be sent. Please try again.");
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
    if (files.some((file) => !SCREENSHOT_TYPES.has(file.type))) {
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

  return (
    <>
      <footer className="app-feedback-footer" aria-label="TextPlex feedback" data-inventory-id="shell.feedback-footer">
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
            setOpen(true);
          }}
          data-inventory-id="shell.feedback-button"
        >
          <span aria-hidden="true">✦</span>
          <span>Send feedback</span>
        </button>
      </footer>

      {open ? (
        <div className="app-feedback-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
          <section className="app-feedback-dialog card" role="dialog" aria-modal="true" aria-labelledby="feedback-dialog-title" data-inventory-id="shell.feedback-dialog">
            <div className="app-feedback-dialog-header">
              <div>
                <span className="eyebrow">Help improve TextPlex</span>
                <h2 id="feedback-dialog-title">What happened?</h2>
              </div>
              <button type="button" className="button button-secondary app-feedback-close-button" onClick={close} disabled={status === "submitting"} aria-label="Close feedback dialog" title="Close feedback dialog">
                <CloseIcon />
              </button>
            </div>
            {status === "success" ? (
              <div className="app-feedback-success" role="status">
                <strong>Thanks — your report was received.</strong>
                <p className="small-copy">We kept your original note and captured this page’s context for review.</p>
                <button type="button" className="button button-primary" onClick={close}>Done</button>
              </div>
            ) : (
              <form className="app-feedback-form" onSubmit={handleSubmit}>
                <label htmlFor="feedback-message">Describe the issue, idea, or confusing moment</label>
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
                  placeholder="For example: The next-page button stopped responding after I opened the translation panel."
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
                  ) : <span className="small-copy">Optional · up to 3 PNG, JPEG, WebP, or GIF files, 5 MB each</span>}
                </div>
                <p className="small-copy">We’ll attach the current page, build version, time, and device context. Please don’t include passwords or private book files.</p>
                {errorMessage ? <p className="app-feedback-error" role="alert">{errorMessage}</p> : null}
                <div className="app-feedback-dialog-actions">
                  <button type="button" className="button button-secondary" onClick={close} disabled={status === "submitting"}>Cancel</button>
                  <button type="submit" className="button button-primary" disabled={status === "submitting"}>{status === "submitting" ? "Sending…" : "Submit feedback"}</button>
                </div>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
