"use client";

import Link from "next/link";
import { usePathname, useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { resolveReaderResumeHref } from "../lib/textplex";
import { useAuth } from "./auth-provider";
import { ThemeToggleButton } from "./theme-toggle-button";
import {
  ActivityIcon,
  AnalysisIcon,
  AuthIcon,
  HomeIcon,
  ImportIcon,
  LibraryIcon,
  MoreIcon,
  ProfileIcon,
  ProgressIcon,
  ReadIcon,
  RoadmapIcon,
  SearchIcon,
  SettingsIcon,
  StudyIcon,
} from "./shell-icons";

const LAST_BOOK_KEY = "textplex:last-book-id";
const LAST_PAGE_KEY = "textplex:last-page-number";
const LAST_SEARCH_KEY = "textplex:last-search-query";
const HOME_PATH = "/home";

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

function isPathActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClassName(pathname: string, href: string, activeHref = href): string {
  const active = isPathActive(pathname, activeHref);
  return `button ${active ? "button-primary" : "button-secondary"} nav-link`;
}

function NavLinkContent({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <>
      <span className="nav-link-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="nav-link-label">{label}</span>
    </>
  );
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18 9 12l6-6" />
    </svg>
  );
}

function BrushIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16.5 4.5 20 8" />
      <path d="M18.8 2.2c1.2 1.2 1.6 3 .9 4.5l-2.2 4.7-4.1-4.1 4.7-2.2c1.5-.7 3.3-.3 4.5.9Z" />
      <path d="m12.5 11.5-7 7c-.9.9-1.1 2.1-.6 2.8.7.8 2 .6 2.8-.2l7-7" />
      <path d="M7 18.5c.5-.5 1.2-.6 1.8-.3.8.4 1.7.2 2.3-.4" />
    </svg>
  );
}

export function AppShell() {
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { configured, loading, signOut, user } = useAuth();
  const [storedContext, setStoredContext] = useState<NavigationContext>({ bookId: null, pageNumber: null, searchQuery: null });
  const moreMenuRef = useRef<HTMLDetailsElement | null>(null);

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

  useEffect(() => {
    if (moreMenuRef.current) {
      moreMenuRef.current.open = false;
    }
  }, [pathname]);

  const activeBookId = routeContext.bookId ?? storedContext.bookId;
  const activePageNumber = routeContext.pageNumber ?? storedContext.pageNumber;
  const activeSearchQuery = routeContext.searchQuery ?? storedContext.searchQuery;
  const searchKey = searchParams.toString();

  const readerHref = activeBookId ? resolveReaderResumeHref(activeBookId, null, activePageNumber ?? 1) : "/library";
  const analysisHref = activeBookId ? `/analysis/${activeBookId}` : "/library";
  const searchHref = activeSearchQuery ? `/search?q=${encodeURIComponent(activeSearchQuery)}` : "/search";
  const authReturnTo = pathname === "/auth" ? HOME_PATH : `${pathname}${searchKey ? `?${searchKey}` : ""}`;
  const signInHref = `/auth?returnTo=${encodeURIComponent(authReturnTo)}`;
  const hasMoreActiveRoute = ["/analysis", "/search", "/progress", "/roadmap", "/activity", "/import", "/profile", "/settings"]
    .some((href) => isPathActive(pathname, href));

  function closeMoreMenu() {
    if (moreMenuRef.current) {
      moreMenuRef.current.open = false;
    }
  }

  function handleBack() {
    if (window.history.length > 1 && pathname !== "/") {
      router.back();
      return;
    }
    router.push(HOME_PATH);
  }

  return (
    <div className="app-shell-chrome card" data-inventory-id="shell.chrome">
      <header className="app-shell-bar app-shell-bar-top" data-inventory-id="shell.header">
        <button
          className="button button-secondary theme-toggle-button shell-icon-button app-shell-back-button"
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          title="Go back"
          data-inventory-id="shell.back-button"
        >
          <BackIcon />
          <span className="visually-hidden">Go back</span>
        </button>
        <div className="app-shell-brand">
          <Link className="app-shell-home" href={HOME_PATH}>
            TextPlex
          </Link>
        </div>
        <div className="app-shell-actions" data-inventory-id="shell.actions">
          <Link
            className="button button-secondary theme-toggle-button shell-icon-button app-shell-theme-settings"
            href="/profile/themes"
            aria-label="Open theme settings"
            title="Open theme settings"
            data-inventory-id="shell.theme-settings"
          >
            <BrushIcon />
            <span className="visually-hidden">Open theme settings</span>
          </Link>
          <ThemeToggleButton />
        </div>
      </header>

      <nav className="app-nav app-shell-bar-bottom" aria-label="Primary">
        <Link className="button button-secondary nav-link nav-link-home" href={HOME_PATH}>
          <NavLinkContent icon={<HomeIcon />} label="Home" />
        </Link>
        <Link className={navLinkClassName(pathname, "/library")} href="/library">
          <NavLinkContent icon={<LibraryIcon />} label="Library" />
        </Link>
        <Link className={navLinkClassName(pathname, readerHref, "/reader")} href={readerHref}>
          <NavLinkContent icon={<ReadIcon />} label="Read" />
        </Link>
        <Link className={navLinkClassName(pathname, "/study")} href="/study">
          <NavLinkContent icon={<StudyIcon />} label="Study" />
        </Link>
        <details ref={moreMenuRef} className="app-nav-more" data-inventory-id="shell.secondary-nav">
          <summary className={`button ${hasMoreActiveRoute ? "button-primary" : "button-secondary"} nav-link app-nav-more-trigger`}>
            <NavLinkContent icon={<MoreIcon />} label="More" />
          </summary>
          <div className="app-nav-more-menu card">
            <Link className="app-nav-more-link" href={analysisHref} onClick={closeMoreMenu}>
              <AnalysisIcon size={14} />
              <span>Analysis</span>
            </Link>
            <Link className="app-nav-more-link" href={searchHref} onClick={closeMoreMenu}>
              <SearchIcon size={14} />
              <span>Search</span>
            </Link>
            <Link className="app-nav-more-link" href="/progress" onClick={closeMoreMenu}>
              <ProgressIcon size={14} />
              <span>Progress</span>
            </Link>
            <Link className="app-nav-more-link" href="/import" onClick={closeMoreMenu}>
              <ImportIcon size={14} />
              <span>Import text</span>
            </Link>
            <Link className="app-nav-more-link" href="/activity" onClick={closeMoreMenu}>
              <ActivityIcon size={14} />
              <span>Activity</span>
            </Link>
            <Link className="app-nav-more-link" href="/roadmap" onClick={closeMoreMenu}>
              <RoadmapIcon size={14} />
              <span>Roadmap</span>
            </Link>
            <Link className="app-nav-more-link" href="/profile" onClick={closeMoreMenu}>
              <ProfileIcon size={14} />
              <span>Profile</span>
            </Link>
            <Link className="app-nav-more-link" href="/settings" onClick={closeMoreMenu}>
              <SettingsIcon size={14} />
              <span>Settings</span>
            </Link>
            {configured && !loading ? (
              user ? (
                <button
                  className="app-nav-more-action"
                  type="button"
                  onClick={async () => {
                    closeMoreMenu();
                    await signOut();
                    router.replace(HOME_PATH);
                    router.refresh();
                  }}
                >
                  <AuthIcon size={14} />
                  <span>Sign out</span>
                </button>
              ) : (
                <Link className="app-nav-more-link" href={signInHref} onClick={closeMoreMenu}>
                  <AuthIcon size={14} />
                  <span>Sign in</span>
                </Link>
              )
            ) : null}
          </div>
        </details>
      </nav>
    </div>
  );
}
