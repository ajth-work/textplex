import Link from "next/link";
import type { CSSProperties } from "react";

import type { BookRecord, ProgressBookSummary, ProgressSurfaceResponse } from "../../../packages/shared/src";

type HomeSurfaceProps = {
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
  if (progress.reading_state === "not_read") {
    return "Start reading";
  }
  if (progress.reading_state === "finished" || progress.progress_percent >= 100) {
    return "Complete";
  }
  if (progress.progress_unit === "pages") {
    return `${progress.furthest_page} of ${progress.total_pages} pages`;
  }
  return `${progress.sentences_read} of ${progress.total_sentences} sentences`;
}

function readerHref(item: HomeReadingItem): string {
  const sentenceOrder = item.progress?.resume_sentence_order && item.progress.resume_sentence_order > 0
    ? `?sentence=${item.progress.resume_sentence_order}`
    : "";
  return `/reader/${item.book.id}/${Math.max(item.progress?.resume_page ?? item.progress?.furthest_page ?? 1, 1)}${sentenceOrder}`;
}

export function HomeSurface({ books, progress }: Readonly<HomeSurfaceProps>) {
  const bookById = new Map(books.map((book) => [book.id, book]));
  const progressByBookId = new Map(progress.books.map((entry) => [entry.book_id, entry]));
  const recentlyReadItems: HomeReadingItem[] = progress.books.flatMap((entry) => {
    if (entry.reading_state === "not_read") {
      return [];
    }
    const book = bookById.get(entry.book_id);
    return book ? [{ book, progress: entry }] : [];
  });
  const recentlyReadIds = new Set(recentlyReadItems.map((item) => item.book.id));
  const fallbackItems = [...books]
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .filter((book) => !recentlyReadIds.has(book.id))
    .map((book) => ({ book, progress: progressByBookId.get(book.id) ?? null }));
  const readingItems = [...recentlyReadItems, ...fallbackItems];
  const continueItem = readingItems[0] ?? null;
  const continuationItems = readingItems.slice(1, 5);
  const goalCount = Math.min(progress.profile.page_reads ?? 0, 6);
  const goalPercent = Math.min(100, Math.round((goalCount / 6) * 100));

  return (
    <main className="preview-home" data-inventory-id="home.page">
      <header className="preview-home-header" data-inventory-id="home.header">
        <div>
          <span className="preview-eyebrow">Home</span>
          <h1 className="preview-home-title">Your reading desk</h1>
        </div>
      </header>

      <p className="preview-tagline">Pick up where you left off, then turn reading into progress.</p>

      <form className="preview-search" action="/search" method="get" data-inventory-id="home.search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input name="q" placeholder="Search texts, authors, topics..." aria-label="Search texts, authors, topics" type="search" />
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
            <h3>Reading exposure</h3><p><strong>{progress.profile.sentence_reads ?? 0}</strong></p><span>sentences read</span>
          </article>
        </div>
      </section>

    </main>
  );
}
