import type { BookRecord } from "./textplex";

export function isImportComplete(book: BookRecord): boolean {
  return book.extraction_status === "complete" || book.status === "extracted";
}

export function isImportInProgress(book: BookRecord): boolean {
  return ["queued", "processing", "running"].includes(book.extraction_status) || ["queued", "processing"].includes(book.status);
}

export function isImportFailed(book: BookRecord): boolean {
  return book.extraction_status === "failed" || book.status === "failed";
}
