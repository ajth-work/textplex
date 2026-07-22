"use client";

import Link from "next/link";
import { usePathname, useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { isDemoMode } from "../lib/textplex";
import { useAuth } from "./auth-provider";

const LAST_BOOK_KEY = "textplex:last-book-id";
const LAST_PAGE_KEY = "textplex:last-page-number";
const LAST_SEARCH_KEY = "textplex:last-search-query";

type NavigationContext = {
  bookId: string | null;
  pageNumber: number | null;
  searchQuery: string | null;
};

function readStoredContext(): NavigationContext {
  if (typeof window === "undefined") {
    return { bookId: null, pageNumber: null, searchQuery: null };
  }

  const storedBookId = window.localStorage.getItem(LAST_BOOK_KEY);
  const storedPage = window.localStorage.getItem(LAST_PAGE_KEY);
  const storedSearchQuery = window.localStorage.getItem(LAST_SEARCH_KEY);

  return {
    bookId: storedBookId && storedBookId.trim() ? storedBookId : null,
    pageNumber: storedPage ? Number(storedPage) || null : null,
    searchQuery: storedSearchQuery && storedSearchQuery.trim() ? storedSearchQuery : null,
  };
}

function normalizeParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function parseRouteContext(pathname: string, params: Record<string, string | string[] | undefined>, searchParams: URLSearchParams): NavigationContext {
  const bookId = normalizeParam(params.bookId);
  const pageNumberValue = normalizeParam(params.pageNumber);
  const pageNumber = pageNumberValue ? Number(pageNumberValue) || null : null;
  const searchQuery = pathname === "/search" ? searchParams.get("q")?.trim() || null : null;

  return {
    bookId,
    pageNumber,
    searchQuery,
  };
}

function navLinkClassName(pathname: string, href: string): string {
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  return `button ${active ? "button-primary" : "button-secondary"} nav-link`;
}

export function AppShell() {
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [storedContext, setStoredContext] = useState<NavigationContext>(() => readStoredContext());
  const { configured, loading: authLoading, user, signOut } = useAuth();

  const routeContext = useMemo(
    () => parseRouteContext(pathname, params as Record<string, string | string[] | undefined>, searchParams),
    [pathname, params, searchParams],
  );

  useEffect(() => {
    setStoredContext(readStoredContext());
  }, []);

  useEffect(() => {
    if (routeContext.bookId) {
      window.localStorage.setItem(LAST_BOOK_KEY, routeContext.bookId);
    }
    if (routeContext.pageNumber) {
      window.localStorage.setItem(LAST_PAGE_KEY, String(routeContext.pageNumber));
    }
    if (pathname === "/search") {
      const query = routeContext.searchQuery ?? "";
      if (query) {
        window.localStorage.setItem(LAST_SEARCH_KEY, query);
      }
    }
  }, [pathname, routeContext]);

  const activeBookId = routeContext.bookId ?? storedContext.bookId;
  const activePageNumber = routeContext.pageNumber ?? storedContext.pageNumber;
  const activeSearchQuery = routeContext.searchQuery ?? storedContext.searchQuery;

  const readerHref = activeBookId ? `/reader/${activeBookId}/${activePageNumber ?? 1}` : "/library";
  const analysisHref = activeBookId ? `/analysis/${activeBookId}` : "/library";
  const bookHref = activeBookId ? `/books/${activeBookId}` : "/library";
  const searchHref = activeSearchQuery ? `/search?q=${encodeURIComponent(activeSearchQuery)}` : "/search";
  const profileHref = "/profile";

  function handleBack() {
    if (window.history.length > 1 && pathname !== "/") {
      router.back();
      return;
    }
    router.push("/library");
  }

  return (
    <>
      <header className="app-shell-bar card">
        <div className="app-shell-brand">
          <Link className="app-shell-home" href="/">
            TextPlex
          </Link>
          <span className="pill">{isDemoMode ? "Demo" : "Live"}</span>
        </div>
        <div className="app-shell-context">
          <span className="eyebrow">Context</span>
          <strong>{activeBookId ? activeBookId : "No book selected"}</strong>
          {activeBookId && activePageNumber ? <span className="muted">P{activePageNumber}</span> : null}
        </div>
        <div className="app-shell-actions">
          <button className="button button-secondary shell-button" type="button" onClick={handleBack}>
            Back
          </button>
          <Link className="button button-secondary shell-button" href={bookHref}>
            Book
          </Link>
          <Link className="button button-secondary shell-button" href={readerHref}>
            Reader
          </Link>
          <Link className="button button-secondary shell-button" href={analysisHref}>
            Analysis
          </Link>
          {!isDemoMode && !authLoading && user ? (
            <button className="button button-secondary shell-button" type="button" onClick={() => void signOut()}>
              Sign out
            </button>
          ) : !isDemoMode && configured ? (
            <Link className="button button-secondary shell-button" href="/auth">
              Sign in
            </Link>
          ) : null}
        </div>
      </header>

      <nav className="app-nav card" aria-label="Primary">
        <Link className={navLinkClassName(pathname, "/")} href="/">
          Home
        </Link>
        <Link className={navLinkClassName(pathname, "/library")} href="/library">
          Library
        </Link>
        <Link className={navLinkClassName(pathname, readerHref)} href={readerHref}>
          Reader
        </Link>
        <Link className={navLinkClassName(pathname, analysisHref)} href={analysisHref}>
          Analysis
        </Link>
        <Link className={navLinkClassName(pathname, "/search")} href={searchHref}>
          Search
        </Link>
        <Link className={navLinkClassName(pathname, "/study")} href="/study">
          Study
        </Link>
        <Link className={navLinkClassName(pathname, "/progress")} href="/progress">
          Progress
        </Link>
        <Link className={navLinkClassName(pathname, "/roadmap")} href="/roadmap">
          Roadmap
        </Link>
        <Link className={navLinkClassName(pathname, profileHref)} href={profileHref}>
          Profile
        </Link>
        <Link className={navLinkClassName(pathname, "/activity")} href="/activity">
          Activity
        </Link>
        <Link className={navLinkClassName(pathname, "/import")} href="/import">
          Import
        </Link>
        <Link className={navLinkClassName(pathname, "/settings")} href="/settings">
          Settings
        </Link>
      </nav>
    </>
  );
}
