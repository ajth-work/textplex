"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";

import { fetchJson, resolveReaderResumeHrefForBook, type BookRecord, type ProgressBookSummary, type ProgressSurfaceResponse } from "../lib/textplex";

type HomeData = {
  books: BookRecord[];
  progress: ProgressSurfaceResponse;
};

type HomeReadingItem = {
  book: BookRecord;
  progress: ProgressBookSummary | null;
};

function progressForBook(progress: ProgressBookSummary | null): number {
  return progress?.progress_percent ?? 0;
}

function contentTypeLabel(book: BookRecord): string {
  return book.total_pages > 1 ? "Book" : "Article";
}

function artClass(languageCode: string): string {
  return `home-book-art home-book-art-${languageCode.slice(0, 2).toLowerCase()}`;
}

function formatProgress(progress: ProgressBookSummary | null): string {
  if (!progress) {
    return "Start reading";
  }
  if (progress.progress_percent >= 100) {
    return "Complete";
  }
  if (progress.progress_unit === "pages") {
    return `${progress.furthest_page} of ${progress.total_pages} pages`;
  }
  return `${progress.sentences_read} of ${progress.total_sentences} sentences`;
}

function readerHref(item: HomeReadingItem): string {
  return resolveReaderResumeHrefForBook(item.book.id, item.progress);
}

function SkeletonHome() {
  return (
    <main className="preview-home" data-inventory-id="home.page">
      <header className="preview-home-header" data-inventory-id="home.header">
        <span className="preview-brand skeleton-block" aria-label="Loading" />
        <span className="preview-icon skeleton-circle" aria-hidden="true" />
      </header>
      <span className="skeleton-line skeleton-line-wide" aria-label="Loading" />
      <div className="preview-search skeleton-block" aria-label="Loading" />
      <section className="preview-section" aria-label="Loading continue reading">
        <div className="preview-section-head"><span className="skeleton-line" /><span className="skeleton-line skeleton-line-short" /></div>
        <div className="preview-continue-card preview-skeleton-card"><span className="skeleton-art" /><span className="skeleton-copy" /></div>
      </section>
      <section className="preview-section" aria-label="Loading recently read content">
        <div className="preview-section-head"><span className="skeleton-line" /><span className="skeleton-line skeleton-line-short" /></div>
        <div className="preview-reading-list">
          {[1, 2, 3].map((item) => <div className="preview-reading-row" key={item}><span className="skeleton-circle" /><span className="skeleton-copy" /><span className="skeleton-circle skeleton-score" /></div>)}
        </div>
      </section>
      <nav className="preview-bottom-nav" aria-label="Primary navigation loading" />
    </main>
  );
}

export function HomeSurface() {
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetchJson<BookRecord[]>("/books"),
      fetchJson<ProgressSurfaceResponse>("/progress"),
    ])
      .then(([books, progress]) => {
        if (active) {
          setData({ books: books.filter((book) => book.status !== "archived"), progress });
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Unable to load the home surface.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (!data && !error) {
    return <SkeletonHome />;
  }

  if (error) {
    return (
      <main className="preview-home" data-inventory-id="home.page">
        <header className="preview-home-header" data-inventory-id="home.header">
          <Link className="preview-brand" href="/portal">TextPlex</Link>
        </header>
        <section className="preview-error-card" data-inventory-id="home.error-state">
          <span className="preview-eyebrow">Home</span>
          <h1>Home is unavailable.</h1>
          <p>{error}</p>
          <button className="preview-action" type="button" onClick={() => window.location.reload()}>Retry</button>
        </section>
      </main>
    );
  }

  const books = data?.books ?? [];
  const bookById = new Map(books.map((book) => [book.id, book]));
  const progressByBookId = new Map((data?.progress.books ?? []).map((progress) => [progress.book_id, progress]));
  const recentlyReadItems: HomeReadingItem[] = (data?.progress.books ?? []).flatMap((progress) => {
      const book = bookById.get(progress.book_id);
      return book ? [{ book, progress }] : [];
    });
  const recentlyReadIds = new Set(recentlyReadItems.map((item) => item.book.id));
  const fallbackItems = [...books]
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .filter((book) => !recentlyReadIds.has(book.id))
    .map((book) => ({ book, progress: progressByBookId.get(book.id) ?? null }));
  const readingItems = [...recentlyReadItems, ...fallbackItems];
  const continueItem = readingItems[0] ?? null;
  const continuationItems = readingItems.slice(1, 5);
  const goalCount = Math.min(data?.progress.profile.page_reads ?? 0, 6);
  const goalPercent = Math.min(100, Math.round((goalCount / 6) * 100));

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    window.location.href = value ? `/search?q=${encodeURIComponent(value)}` : "/search";
  }

  return (
    <main className="preview-home" data-inventory-id="home.page">
      <header className="preview-home-header" data-inventory-id="home.header">
        <Link className="preview-brand" href="/portal">TextPlex</Link>
        <button className="preview-icon" aria-label="Notifications" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 17H9m9-4V11a6 6 0 10-12 0v2l-2 3h16l-2-3Z" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>
        </button>
      </header>

      <p className="preview-tagline">Read scanned books as structured language data.</p>

      <form className="preview-search" onSubmit={submitSearch} data-inventory-id="home.search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search texts, authors, topics..." aria-label="Search texts, authors, topics" type="search" />
        <button className="preview-filter" aria-label="Open search" type="submit">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /><circle cx="9" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="12" cy="18" r="2" /></svg>
        </button>
      </form>

      <section className="preview-section" data-inventory-id="home.continue-reading">
        <div className="preview-section-head">
          <h2>Continue Reading</h2>
          <Link href="/library">See All</Link>
        </div>
        {continueItem ? (
          <Link className="preview-continue-card" href={readerHref(continueItem)} data-inventory-id="home.continue-reading-card">
            <div className={artClass(continueItem.book.language_code)} aria-hidden="true" />
            <div className="preview-continue-body">
              <svg className="preview-bookmark" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V21l-5.5-3.5L7 21V4.5Z" /></svg>
              <div>
                <h3>{continueItem.book.title}</h3>
                <p className="preview-author">{continueItem.book.author || "Unknown author"}</p>
                <p className="preview-book-meta">{continueItem.book.source_filename || "Imported text"}</p>
                <p className="preview-book-meta">{continueItem.book.language_code.toUpperCase()} &middot; {contentTypeLabel(continueItem.book)}</p>
              </div>
              <div>
                <div className="preview-progress-meta">{progressForBook(continueItem.progress)}% &middot; {formatProgress(continueItem.progress)}</div>
                <div className="preview-progress-bar"><span style={{ width: `${progressForBook(continueItem.progress)}%` }} /></div>
              </div>
            </div>
          </Link>
        ) : (
          <Link className="preview-empty-card" href="/import" data-inventory-id="home.empty-state">Add your first text to start reading.</Link>
        )}
      </section>

      <section className="preview-section" data-inventory-id="home.continue-reading-list">
        <div className="preview-section-head">
          <h2>Recently Read</h2>
          <Link href="/library">See All</Link>
        </div>
        {continuationItems.length ? (
          <div className="preview-reading-list">
            {continuationItems.map((item) => {
              const progress = progressForBook(item.progress);
              return (
                <Link className="preview-reading-row" href={readerHref(item)} key={item.book.id} data-inventory-id="home.continue-reading-row">
                  <div className={`${artClass(item.book.language_code)} preview-thumb`} aria-hidden="true" />
                  <div className="preview-reading-main">
                    <h3>{item.book.title}</h3>
                    <p>{item.book.author || "Unknown author"}</p>
                    <span>{contentTypeLabel(item.book)} &middot; {formatProgress(item.progress)}</span>
                  </div>
                  <div className="preview-score" style={{ "--score": `${progress}%` } as CSSProperties} aria-label={`${progress}% reading progress`}>
                    <strong>{progress}%</strong>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="preview-empty-card">No other reading history yet.</p>
        )}
      </section>

      <section className="preview-section" data-inventory-id="home.goals">
        <div className="preview-section-head"><h2>Goals</h2><Link href="/progress">See All</Link></div>
        <div className="preview-goals">
          <article className="preview-goal-card" data-inventory-id="home.weekly-goal">
            <div><h3>Weekly Reading Goal</h3><p><strong>{goalCount}</strong> / 6 pages</p></div>
            <div className="preview-goal-ring" style={{ "--goal": `${goalPercent}%` } as CSSProperties}><span>{goalPercent}%</span></div>
          </article>
          <article className="preview-goal-card preview-streak" data-inventory-id="home.exposure-goal">
            <h3>Reading exposure</h3><p><strong>{data?.progress.profile.sentence_reads ?? 0}</strong></p><span>sentences read</span>
          </article>
        </div>
      </section>

      <nav className="preview-bottom-nav" aria-label="Primary navigation" data-inventory-id="shell.primary-nav">
        <Link className="preview-nav-item is-active" href="/portal"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11.2 9-7.2 9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.8Z" /></svg><span>Portal</span></Link>
        <Link className="preview-nav-item" href="/library"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg><span>Library</span></Link>
        <Link className="preview-nav-add" href="/import" aria-label="Add content"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></Link>
        <Link className="preview-nav-item" href="/progress"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 13a6 6 0 0 0 12 0c0-2.5-1.5-4.4-3.5-5.8L12 3l-2.5 4.2C7.5 8.6 6 10.5 6 13Z" /><path d="M12 10v6" /></svg><span>Insights</span></Link>
        <Link className="preview-nav-item" href="/profile"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2" /><path d="M5 20a7 7 0 0 1 14 0" /></svg><span>Profile</span></Link>
      </nav>
    </main>
  );
}
