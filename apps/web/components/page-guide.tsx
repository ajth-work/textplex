"use client";

import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";

type GuideSlide = {
  eyebrow: string;
  title: string;
  body: string;
};

type PageGuideDefinition = {
  id: string;
  label: string;
  slides: GuideSlide[];
};

const PAGE_GUIDES: PageGuideDefinition[] = [
  {
    id: "home",
    label: "Home",
    slides: [
      { eyebrow: "Your reading desk", title: "Pick up where you left off", body: "Home brings your active reading, recent books, and learner progress into one calm starting point." },
      { eyebrow: "What you can do", title: "Choose your next useful action", body: "Resume a book, open your library, or move into study when you want to turn reading exposure into practice." },
      { eyebrow: "On the way", title: "A clearer picture of progress", body: "Future updates will make recommendations and long-term reading patterns more personal without adding noise." },
    ],
  },
  {
    id: "library",
    label: "Library",
    slides: [
      { eyebrow: "Your collection", title: "Keep real reading within reach", body: "Library is the shelf for your books, reading status, language filters, and prepared reading material." },
      { eyebrow: "What you can do", title: "Find a book, then open or inspect it", body: "Search and filter your collection, open a book in the reader, or visit its details to understand processing progress." },
      { eyebrow: "On the way", title: "More ways to build your shelf", body: "Future expansions can include richer collections, sharing, recommendations, and more flexible import sources." },
    ],
  },
  {
    id: "reader",
    label: "Reader",
    slides: [
      { eyebrow: "Read and learn", title: "Stay with the text", body: "The Reader keeps the page central while giving you lightweight help with words, pronunciation, translation, and progress." },
      { eyebrow: "What you can do", title: "Tap when you need support", body: "Select tokens for definitions, listen to sentences, reveal meaning, bookmark useful moments, and keep reading." },
      { eyebrow: "On the way", title: "Assistance that adapts to you", body: "Future updates will deepen reading analytics, learner-aware suggestions, and page-by-page capture while preserving the reading flow." },
    ],
  },
  {
    id: "study",
    label: "Study",
    slides: [
      { eyebrow: "Turn exposure into skill", title: "Practice what your reading reveals", body: "Study gathers the language you have encountered and turns it into focused, explainable practice." },
      { eyebrow: "What you can do", title: "Review due language groups", body: "Open practice, work through due items, and use progress views to see where your reading is becoming more fluent." },
      { eyebrow: "On the way", title: "A more responsive practice loop", body: "Future expansions can tune review timing and activity choice to your reading history, confidence, and goals." },
    ],
  },
  {
    id: "import",
    label: "Import",
    slides: [
      { eyebrow: "Start with useful input", title: "Bring something worth reading", body: "Paste an article, upload a PDF, EPUB, or TXT file, or build a reading item from photographed pages." },
      { eyebrow: "Choose your path", title: "Use the format that fits", body: "Paste text for a quick start, upload a finished book, or add up to 12 page photos in order. You can reorder or remove photos before processing." },
      { eyebrow: "Set the reading context", title: "Tell TextPlex what it is", body: "Choose the language and optionally add a title and author or source. Reader translations stay focused on the current sentence and next three sentences." },
      { eyebrow: "Let the book prepare", title: "Start reading when it is ready", body: "Processing continues in the background. Follow progress here, then open the reader when extraction is complete; your recent books remain available below." },
    ],
  },
];

const PAGE_GUIDE_STORAGE_PREFIX = "textplex.page-guide.completed.";

const DEFAULT_PAGE_GUIDE: PageGuideDefinition = {
  id: "textplex",
  label: "TextPlex",
  slides: [
    { eyebrow: "Your reading system", title: "Use this page at your own pace", body: "TextPlex keeps your reading, language exposure, and progress connected without getting in the way of the text." },
    { eyebrow: "Need a hand?", title: "Help is always close by", body: "Use the controls on the current page to explore its details, then return here whenever you want a quick orientation." },
  ],
};

function resolveGuide(pathname: string): PageGuideDefinition | null {
  if (pathname === "/home") return PAGE_GUIDES[0];
  if (pathname === "/library") return PAGE_GUIDES[1];
  if (pathname.startsWith("/reader/")) return PAGE_GUIDES[2];
  if (pathname === "/study" || pathname.startsWith("/study/")) return PAGE_GUIDES[3];
  if (pathname === "/import") return PAGE_GUIDES[4];
  return DEFAULT_PAGE_GUIDE;
}

export function PageGuide() {
  const pathname = usePathname();
  const guide = useMemo(() => resolveGuide(pathname), [pathname]);
  const [open, setOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setSlideIndex(0);
    setOpen(Boolean(guide && window.localStorage.getItem(`${PAGE_GUIDE_STORAGE_PREFIX}${guide.id}`) !== "true"));
  }, [guide]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowRight") setSlideIndex((current) => Math.min(current + 1, (guide?.slides.length ?? 1) - 1));
      if (event.key === "ArrowLeft") setSlideIndex((current) => Math.max(current - 1, 0));
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [guide, open]);

  if (!guide) return null;

  const slide = guide.slides[slideIndex];
  const finish = () => {
    window.localStorage.setItem(`${PAGE_GUIDE_STORAGE_PREFIX}${guide.id}`, "true");
    setOpen(false);
  };
  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0] ?? event.touches[0];
    touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };
  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    const touch = event.changedTouches[0] ?? event.touches[0];
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    setSlideIndex((current) => Math.max(0, Math.min(current + (deltaX < 0 ? 1 : -1), guide.slides.length - 1)));
  };
  const dialog = open ? (
    <div className="page-guide-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) finish(); }}>
      <section className="page-guide-dialog card" role="dialog" aria-modal="true" aria-labelledby="page-guide-title" data-inventory-id="shell.page-guide-dialog">
        <div className="page-guide-header">
          <span className="eyebrow">{guide.label} guide</span>
          <button className="button button-secondary page-guide-close" type="button" onClick={finish} aria-label="Close page guide" data-inventory-id="shell.page-guide-close">×</button>
        </div>
        <div className="page-guide-content" aria-live="polite" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <span className="page-guide-slide-eyebrow">{slide.eyebrow}</span>
          <h2 id="page-guide-title">{slide.title}</h2>
          <p>{slide.body}</p>
        </div>
        <div className="page-guide-footer">
          <div className="page-guide-dots" aria-label={`Guide slide ${slideIndex + 1} of ${guide.slides.length}`}>
            {guide.slides.map((item, index) => (
              <button key={item.title} type="button" className={`page-guide-dot${index === slideIndex ? " is-active" : ""}`} onClick={() => setSlideIndex(index)} aria-label={`Go to guide slide ${index + 1}`} aria-current={index === slideIndex ? "step" : undefined} />
            ))}
          </div>
          <div className="page-guide-actions">
            {slideIndex > 0 ? <button className="button button-secondary" type="button" onClick={() => setSlideIndex((current) => current - 1)}>Back</button> : null}
            {slideIndex < guide.slides.length - 1 ? <button className="button button-primary" type="button" onClick={() => setSlideIndex((current) => current + 1)}>Next</button> : <button className="button button-primary" type="button" onClick={finish}>Start exploring</button>}
          </div>
        </div>
      </section>
    </div>
  ) : null;

  return (
    <>
      <button className="button button-secondary page-guide-trigger app-build-footer-guide" type="button" onClick={() => { setSlideIndex(0); setOpen(true); }} aria-label={`Open ${guide.label} guide`} title={`Open ${guide.label} guide`} data-inventory-id="shell.page-guide-trigger">?</button>
      {typeof document !== "undefined" && dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
