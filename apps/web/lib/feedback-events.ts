export type ReaderFeedbackTarget = "sentence" | "word";

export type ReaderFeedbackRequest = {
  target: ReaderFeedbackTarget;
  targetText: string;
  message: string;
  targetOrder?: number | null;
};

export const READER_FEEDBACK_REQUEST_EVENT = "textplex:reader-feedback-request";

export function requestReaderFeedback(request: ReaderFeedbackRequest): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<ReaderFeedbackRequest>(READER_FEEDBACK_REQUEST_EVENT, { detail: request }));
}
