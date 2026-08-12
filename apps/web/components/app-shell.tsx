"use client";

import Link from "next/link";
import { usePathname, useParams, useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from "react";

import { READER_NAV_CONTEXT_CLEARED_EVENT, resolveReaderResumeHref } from "../lib/textplex";
import {
  READER_NAV_HIDE_DELAY_CHANGE_EVENT,
  READER_NAV_HIDE_DELAY_DEFAULT_MS,
  READER_NAV_HIDE_DELAY_STORAGE_KEY,
  readReaderNavHideDelayMs,
} from "../lib/reader-preferences";
import { useAuth } from "./auth-provider";
import { isTextPlexAdmin } from "../lib/auth-roles";
import { ThemeToggleButton } from "./theme-toggle-button";
import { FeedbackNotificationBell, FeedbackNotificationDot } from "./feedback-notification-bell";
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

type NavDropdownItem = {
  href: string;
  label: string;
  icon: ReactNode;
  activeHref?: string;
};

function NavChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function NavDropdown({
  detailsRef,
  pathname,
  href,
  activeHref = href,
  label,
  icon,
  items,
  closeMenus,
}: {
  detailsRef: Ref<HTMLDetailsElement>;
  pathname: string;
  href: string;
  activeHref?: string;
  label: string;
  icon: ReactNode;
  items: NavDropdownItem[];
  closeMenus: (except?: HTMLDetailsElement) => void;
}) {
  const isActive = [activeHref, ...items.map((item) => item.activeHref ?? item.href)].some((route) => isPathActive(pathname, route));

  return (
    <div className={`app-nav-group${isActive ? " is-active" : ""}`}>
      <Link className={navLinkClassName(pathname, href, activeHref)} href={href} onClick={() => closeMenus()} aria-current={isPathActive(pathname, activeHref) ? "page" : undefined}>
        <NavLinkContent icon={icon} label={label} />
      </Link>
      <details ref={detailsRef} className="app-nav-dropdown">
        <summary
          className={`button ${isActive ? "button-primary" : "button-secondary"} app-nav-dropdown-trigger`}
          aria-label={`More ${label} destinations`}
          title={`More ${label} destinations`}
          onClick={(event) => {
            const details = event.currentTarget.parentElement;
            closeMenus(details instanceof HTMLDetailsElement ? details : undefined);
          }}
        >
          <NavChevronIcon />
        </summary>
        <div className="app-nav-dropdown-menu card" data-inventory-id="shell.primary-nav-menu">
          {items.map((item) => {
            const itemActive = isPathActive(pathname, item.activeHref ?? item.href);
            return (
              <Link
                className="app-nav-dropdown-link"
                href={item.href}
                key={item.label}
                onClick={() => closeMenus()}
                aria-current={itemActive ? "page" : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </details>
    </div>
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

function ReaderNavRevealIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function TesterConsoleIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5Z" /><path d="m8 9 2 2 4-4" /></svg>;
}

export function AppShell() {
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { configured, loading, signOut, user } = useAuth();
  const isAdmin = isTextPlexAdmin(user);
  const [storedContext, setStoredContext] = useState<NavigationContext>({ bookId: null, pageNumber: null, searchQuery: null });
  const [readerNavHideDelayMs, setReaderNavHideDelayMs] = useState(READER_NAV_HIDE_DELAY_DEFAULT_MS);
  const [readerNavCollapsed, setReaderNavCollapsed] = useState(false);
  const libraryMenuRef = useRef<HTMLDetailsElement | null>(null);
  const readMenuRef = useRef<HTMLDetailsElement | null>(null);
  const studyMenuRef = useRef<HTMLDetailsElement | null>(null);
  const moreMenuRef = useRef<HTMLDetailsElement | null>(null);
  const readerNavHideTimerRef = useRef<number | null>(null);
  const readerNavHideDelayRef = useRef(READER_NAV_HIDE_DELAY_DEFAULT_MS);

  const routeContext = useMemo(
    () => parseRouteContext(pathname, params as Record<string, string | string[] | undefined>, searchParams),
    [pathname, params, searchParams],
  );
  const isReaderRoute = isPathActive(pathname, "/reader");

  const clearReaderNavHideTimer = useCallback(() => {
    if (readerNavHideTimerRef.current !== null) {
      window.clearTimeout(readerNavHideTimerRef.current);
      readerNavHideTimerRef.current = null;
    }
  }, []);

  const scheduleReaderNavCollapse = useCallback(() => {
    clearReaderNavHideTimer();
    if (!isReaderRoute) {
      return;
    }

    readerNavHideTimerRef.current = window.setTimeout(() => {
      setReaderNavCollapsed(true);
      readerNavHideTimerRef.current = null;
    }, readerNavHideDelayRef.current);
  }, [clearReaderNavHideTimer, isReaderRoute]);

  useEffect(() => {
    setStoredContext(readStoredContext());
  }, []);

  useEffect(() => {
    readerNavHideDelayRef.current = readerNavHideDelayMs;
  }, [readerNavHideDelayMs]);

  useEffect(() => {
    const syncReaderNavHideDelay = () => {
      setReaderNavHideDelayMs(readReaderNavHideDelayMs());
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === READER_NAV_HIDE_DELAY_STORAGE_KEY) {
        syncReaderNavHideDelay();
      }
    };

    syncReaderNavHideDelay();
    window.addEventListener(READER_NAV_HIDE_DELAY_CHANGE_EVENT, syncReaderNavHideDelay);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(READER_NAV_HIDE_DELAY_CHANGE_EVENT, syncReaderNavHideDelay);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!isReaderRoute || readerNavCollapsed) {
      return;
    }

    scheduleReaderNavCollapse();
  }, [isReaderRoute, readerNavCollapsed, readerNavHideDelayMs, scheduleReaderNavCollapse]);

  useEffect(() => {
    const handleReaderContextCleared = () => {
      setStoredContext(readStoredContext());
    };

    window.addEventListener(READER_NAV_CONTEXT_CLEARED_EVENT, handleReaderContextCleared);
    return () => window.removeEventListener(READER_NAV_CONTEXT_CLEARED_EVENT, handleReaderContextCleared);
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

  const closeNavMenus = useCallback((except?: HTMLDetailsElement) => {
    [libraryMenuRef, readMenuRef, studyMenuRef, moreMenuRef].forEach((menuRef) => {
      if (menuRef.current && menuRef.current !== except) {
        menuRef.current.open = false;
      }
    });
  }, []);

  useEffect(() => {
    closeNavMenus();
  }, [closeNavMenus, pathname]);

  useEffect(() => {
    clearReaderNavHideTimer();
    setReaderNavCollapsed(false);
    if (isReaderRoute) {
      scheduleReaderNavCollapse();
    }

    return clearReaderNavHideTimer;
  }, [clearReaderNavHideTimer, isReaderRoute, pathname, scheduleReaderNavCollapse]);

  const activeBookId = routeContext.bookId ?? storedContext.bookId;
  const activePageNumber = routeContext.pageNumber ?? storedContext.pageNumber;
  const activeSearchQuery = routeContext.searchQuery ?? storedContext.searchQuery;
  const searchKey = searchParams.toString();

  const readerHref = activeBookId ? resolveReaderResumeHref(activeBookId, null, activePageNumber ?? 1) : "/library";
  const analysisHref = activeBookId ? `/analysis/${activeBookId}` : "/library";
  const searchHref = activeSearchQuery ? `/search?q=${encodeURIComponent(activeSearchQuery)}` : "/search";
  const authReturnTo = pathname === "/auth" ? HOME_PATH : `${pathname}${searchKey ? `?${searchKey}` : ""}`;
  const signInHref = `/auth?returnTo=${encodeURIComponent(authReturnTo)}`;
  const brandHref = user ? HOME_PATH : "/";
  const moreRoutes = ["/activity", "/profile", "/settings"];
  if (user) {
    moreRoutes.push("/tester");
  }
  if (isAdmin) {
    moreRoutes.push("/admin", "/roadmap");
  }
  const hasMoreActiveRoute = moreRoutes
    .some((href) => isPathActive(pathname, href));

  const revealReaderNav = useCallback(() => {
    setReaderNavCollapsed(false);
    scheduleReaderNavCollapse();
  }, [scheduleReaderNavCollapse]);

  function handleBack() {
    if (window.history.length > 1 && pathname !== "/") {
      router.back();
      return;
    }
    router.push(HOME_PATH);
  }

  return (
    <div
      id="textplex-app-shell"
      className={`app-shell-chrome card${isReaderRoute ? ` reader-nav-shell${readerNavCollapsed ? " is-reader-nav-collapsed" : ""}` : ""}`}
      data-inventory-id="shell.chrome"
    >
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
        <div className="app-shell-brand" data-inventory-id="shell.brand">
          <Link className="app-shell-home" href={brandHref} aria-label={user ? "Go to Home" : "Go to TextPlex start"}>
            TextPlex
          </Link>
        </div>
        <div className="app-shell-actions" data-inventory-id="shell.actions">
          <FeedbackNotificationBell placement="top" />
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

      <nav
        className="app-nav app-shell-bar-bottom"
        aria-label="Primary"
        data-inventory-id={isReaderRoute ? "shell.reader-nav" : "shell.primary-nav"}
        onPointerEnter={isReaderRoute ? revealReaderNav : undefined}
        onFocusCapture={isReaderRoute ? revealReaderNav : undefined}
      >
        <Link className="button button-secondary nav-link nav-link-home" href={HOME_PATH}>
          <NavLinkContent icon={<HomeIcon />} label="Home" />
        </Link>
        <NavDropdown
          detailsRef={libraryMenuRef}
          pathname={pathname}
          href="/library"
          label="Library"
          icon={<LibraryIcon />}
          closeMenus={closeNavMenus}
          items={[
            { href: "/import", label: "Import text", icon: <ImportIcon size={14} /> },
            { href: searchHref, activeHref: "/search", label: "Search library", icon: <SearchIcon size={14} /> },
          ]}
        />
        <NavDropdown
          detailsRef={readMenuRef}
          pathname={pathname}
          href={readerHref}
          activeHref="/reader"
          label="Read"
          icon={<ReadIcon />}
          closeMenus={closeNavMenus}
          items={[{ href: analysisHref, activeHref: "/analysis", label: "Analysis", icon: <AnalysisIcon size={14} /> }]}
        />
        <NavDropdown
          detailsRef={studyMenuRef}
          pathname={pathname}
          href="/study"
          label="Study"
          icon={<StudyIcon />}
          closeMenus={closeNavMenus}
          items={[
            { href: "/study/practice", activeHref: "/study/practice", label: "Practice", icon: <StudyIcon size={14} /> },
            { href: "/progress", label: "Progress", icon: <ProgressIcon size={14} /> },
          ]}
        />
        <details ref={moreMenuRef} className="app-nav-more" data-inventory-id="shell.secondary-nav">
          <summary
            className={`button ${hasMoreActiveRoute ? "button-primary" : "button-secondary"} nav-link app-nav-more-trigger`}
            onClick={(event) => {
              const details = event.currentTarget.parentElement;
              closeNavMenus(details instanceof HTMLDetailsElement ? details : undefined);
            }}
          >
            <NavLinkContent icon={<MoreIcon />} label="More" />
          </summary>
          <div className="app-nav-more-menu card">
            <Link className="app-nav-more-link" href="/activity" onClick={() => closeNavMenus()}>
              <ActivityIcon size={14} />
              <span>Activity</span>
            </Link>
            {isAdmin ? (
              <Link className="app-nav-more-link" href="/admin" onClick={() => closeNavMenus()}>
                <ActivityIcon size={14} />
                <span>Admin console</span>
              </Link>
            ) : null}
            {user ? (
              <Link className="app-nav-more-link app-nav-more-tester-link" href="/tester" onClick={() => closeNavMenus()}>
                <span className="app-nav-tester-icon"><TesterConsoleIcon /><FeedbackNotificationDot /></span>
                <span>Tester console</span>
              </Link>
            ) : null}
            {isAdmin ? (
              <Link className="app-nav-more-link" href="/roadmap" onClick={() => closeNavMenus()}>
                <RoadmapIcon size={14} />
                <span>Roadmap</span>
              </Link>
            ) : null}
            <Link className="app-nav-more-link" href="/profile" onClick={() => closeNavMenus()}>
              <ProfileIcon size={14} />
              <span>Profile</span>
            </Link>
            <Link className="app-nav-more-link" href="/settings" onClick={() => closeNavMenus()}>
              <SettingsIcon size={14} />
              <span>Settings</span>
            </Link>
            {configured && !loading ? (
              user ? (
                <button
                  className="app-nav-more-action"
                  type="button"
                  onClick={async () => {
                    closeNavMenus();
                    await signOut();
                    router.replace(HOME_PATH);
                    router.refresh();
                  }}
                >
                  <AuthIcon size={14} />
                  <span>Sign out</span>
                </button>
              ) : (
                <Link className="app-nav-more-link" href={signInHref} onClick={() => closeNavMenus()}>
                  <AuthIcon size={14} />
                  <span>Sign in</span>
                </Link>
              )
            ) : null}
          </div>
        </details>
      </nav>
      {isReaderRoute ? (
        <button
          className="reader-nav-reveal"
          type="button"
          onClick={revealReaderNav}
          aria-label="Show app shell"
          aria-controls="textplex-app-shell"
          aria-expanded={!readerNavCollapsed}
          title="Show app shell"
          data-inventory-id="shell.reader-nav-reveal"
        >
          <ReaderNavRevealIcon />
          <span className="visually-hidden">Show app shell</span>
        </button>
      ) : null}
    </div>
  );
}
