"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { fetchJson, type BookRecord } from "../lib/textplex";
import { isImportInProgress } from "../lib/import-progress";

const ACTIVE_IMPORT_BOOK_KEY = "textplex:active-import-book-id";
const ACTIVE_IMPORT_CHANGE_EVENT = "textplex:active-import-change";

type ImportProgressContextValue = {
  activeImport: BookRecord | null;
  trackImport: (book: BookRecord) => void;
};

const ImportProgressContext = createContext<ImportProgressContextValue | null>(null);

function readActiveImportId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_IMPORT_BOOK_KEY);
}

export function ImportProgressProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [activeImport, setActiveImport] = useState<BookRecord | null>(null);

  const trackImport = useCallback((book: BookRecord) => {
    window.localStorage.setItem(ACTIVE_IMPORT_BOOK_KEY, book.id);
    setActiveImport(book);
    window.dispatchEvent(new Event(ACTIVE_IMPORT_CHANGE_EVENT));
  }, []);

  const refresh = useCallback(async (bookId: string) => {
    try {
      const book = await fetchJson<BookRecord>(`/books/${bookId}`);
      setActiveImport(book);
    } catch {
      // Keep the last known progress visible during transient API failures.
    }
  }, []);

  useEffect(() => {
    const syncFromStorage = () => {
      const bookId = readActiveImportId();
      if (bookId) void refresh(bookId);
    };

    syncFromStorage();
    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(ACTIVE_IMPORT_CHANGE_EVENT, syncFromStorage);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(ACTIVE_IMPORT_CHANGE_EVENT, syncFromStorage);
    };
  }, [refresh]);

  useEffect(() => {
    if (!activeImport || !isImportInProgress(activeImport)) return;

    const timer = window.setInterval(() => void refresh(activeImport.id), 1500);
    return () => window.clearInterval(timer);
  }, [activeImport, refresh]);

  const value = useMemo(() => ({ activeImport, trackImport }), [activeImport, trackImport]);
  return <ImportProgressContext.Provider value={value}>{children}</ImportProgressContext.Provider>;
}

export function useImportProgress(): ImportProgressContextValue {
  const context = useContext(ImportProgressContext);
  if (!context) {
    throw new Error("useImportProgress must be used within ImportProgressProvider");
  }
  return context;
}
