"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useAuth } from "./auth-provider";

const homePath = "/home";
const startFreeHref = `/auth?mode=sign-up&returnTo=${encodeURIComponent(homePath)}`;
const signInHref = `/auth?returnTo=${encodeURIComponent(homePath)}`;

const featureCards = [
  {
    title: "Import books into a workspace",
    body: "Open a book as an active reading surface instead of a static file.",
    tone: "amber",
  },
  {
    title: "Read with context",
    body: "Tap words, see definitions, and keep the surrounding sentence close.",
    tone: "sage",
  },
  {
    title: "Track exposure and progress",
    body: "See what you have read, what is still new, and how far each book has carried you.",
    tone: "sky",
  },
  {
    title: "Keep vocabulary and history together",
    body: "Save terms, revisit pages, and keep the reading record tied to the same account.",
    tone: "rose",
  },
];

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    cadence: "per month",
    description: "Core reader, import flow, library, and baseline progress with the default look.",
    features: ["Reader and library access", "Import and analysis", "Default theme included"],
    featured: false,
    tone: "amber",
  },
  {
    name: "Reader",
    price: "$4.99",
    cadence: "per month",
    description: "Support the app while keeping the core experience light.",
      features: ["Everything in Free", "Saved progress history", "Theme settings access"],
    featured: true,
    tone: "sage",
  },
  {
    name: "Studio",
    price: "$9.99",
    cadence: "per month",
    description: "The highest support tier for frequent readers.",
    features: ["Everything in Reader", "Early access to new surfaces", "Best for heavier study"],
    featured: false,
    tone: "sky",
  },
];

function getPricingTierActionLabel(tierName: string, authenticated: boolean, featured: boolean): string {
  if (authenticated) {
    return tierName === "Free" ? "Included in account" : "Open Home";
  }

  return featured ? "Choose Reader" : tierName === "Free" ? "Start free" : "Choose Studio";
}

const themePacks = [
  {
    name: "Classic Consoles",
    note: "Retro contrast with sharp UI edges.",
    tone: "amber",
  },
  {
    name: "Warm Paper",
    note: "Warm, low-glare tones for longer reads.",
    tone: "sage",
  },
  {
    name: "Night Studio",
    note: "Dark, focused reading with softer contrast.",
    tone: "sky",
  },
];

const landingHeroPreviews = [
  {
    id: "reader",
    title: "Reading",
    description: "TextPlex defines and tracks unfamiliar terms with a simple tap, keeping you focused on the story.",
    wallpaperPath: "/themes/fruit-mango-v1.jpg",
    tone: "sage",
  },
  {
    id: "study",
    title: "Studying",
    description: "TextPlex analyzes reading sessions, turns them into memory regimens, and supports you with a curriculum.",
    wallpaperPath: "/themes/season-summer-meadow-v1.jpg",
    tone: "sky",
  },
] as const;

const supportPanels = [
  {
    id: "subscription",
    label: "Subscription",
    eyebrow: "Membership",
    title: "Choose a plan that supports your reading",
    description: "A subscription keeps the core reading workspace, saved progress, and account tools ready whenever you open TextPlex.",
    tone: "amber",
  },
  {
    id: "theme-shop",
    label: "Theme shop",
    eyebrow: "Styling",
    title: "Keep reading free. Pay only for styling.",
    description: "Use TextPlex without a subscription, then buy a visual pack only if you want to personalize the workspace.",
    tone: "sage",
  },
] as const;

type CarouselProps<T> = {
  ariaLabel: string;
  items: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  trackClassName: string;
};

function Carousel<T>({ ariaLabel, items, renderItem, trackClassName }: CarouselProps<T>) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const carousel = carouselRef.current;
    const track = trackRef.current;
    if (!carousel || !track || items.length === 0) {
      return undefined;
    }

    const carouselElement = carousel;
    const trackElement = track;

    let rafId = 0;

    function syncActiveIndex() {
      const children = Array.from(trackElement.children) as HTMLElement[];
      if (!children.length) {
        return;
      }

      const center = carouselElement.scrollLeft + carouselElement.clientWidth / 2;
      let nextIndex = 0;
      let nextDistance = Number.POSITIVE_INFINITY;

      children.forEach((child, index) => {
        const childCenter = child.offsetLeft + child.offsetWidth / 2;
        const distance = Math.abs(childCenter - center);
        if (distance < nextDistance) {
          nextIndex = index;
          nextDistance = distance;
        }
      });

      setActiveIndex(nextIndex);
    }

    function handleScroll() {
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(syncActiveIndex);
    }

    syncActiveIndex();
    carouselElement.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    const resizeObserver = new ResizeObserver(handleScroll);
    resizeObserver.observe(carouselElement);
    resizeObserver.observe(trackElement);

    return () => {
      window.cancelAnimationFrame(rafId);
      carouselElement.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      resizeObserver.disconnect();
    };
  }, [items.length]);

  function jumpToIndex(index: number) {
    const track = trackRef.current;
    const nextCard = track?.children.item(index) as HTMLElement | null;
    nextCard?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }

  return (
    <div className="landing-carousel-shell">
      <div className="landing-carousel" aria-label={ariaLabel} ref={carouselRef}>
        <div className={`landing-carousel-track ${trackClassName}`} ref={trackRef}>
          {items.map((item, index) => renderItem(item, index))}
        </div>
      </div>
      <div className="landing-carousel-pagination" aria-label={`${ariaLabel} pages`}>
        {items.map((_, index) => (
          <button
            key={`${ariaLabel}-page-${index}`}
            type="button"
            className={`landing-carousel-dot${index === activeIndex ? " is-active" : ""}`}
            aria-label={`${ariaLabel}, page ${index + 1} of ${items.length}`}
            aria-pressed={index === activeIndex}
            onClick={() => jumpToIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}

function SupportSwitcher({ authenticated }: { authenticated: boolean }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const panelRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const panels = panelRefs.current.filter(Boolean) as HTMLElement[];
    if (!scroller || panels.length === 0) {
      return undefined;
    }

    const scrollerElement = scroller;

    let rafId = 0;

    function syncActiveIndex() {
      const center = scrollerElement.scrollLeft + scrollerElement.clientWidth / 2;
      let nextIndex = 0;
      let nextDistance = Number.POSITIVE_INFINITY;

      panels.forEach((panel, index) => {
        const panelCenter = panel.offsetLeft + panel.offsetWidth / 2;
        const distance = Math.abs(panelCenter - center);
        if (distance < nextDistance) {
          nextIndex = index;
          nextDistance = distance;
        }
      });

      setActiveIndex(nextIndex);
    }

    function handleScroll() {
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(syncActiveIndex);
    }

    syncActiveIndex();
    scrollerElement.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    const resizeObserver = new ResizeObserver(handleScroll);
    resizeObserver.observe(scrollerElement);
    panels.forEach((panel) => resizeObserver.observe(panel));

    return () => {
      window.cancelAnimationFrame(rafId);
      scrollerElement.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      resizeObserver.disconnect();
    };
  }, [authenticated]);

  function jumpToIndex(index: number) {
    const panel = panelRefs.current[index];
    panel?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }

  return (
    <section className="landing-section landing-support" aria-labelledby="landing-support-title" data-inventory-id="landing.support">
      <div className="landing-section-head landing-support-head">
        <div>
          <span className="eyebrow">{authenticated ? "Support" : "Ways to support"}</span>
          <h2 id="landing-support-title">{authenticated ? "Choose how to keep TextPlex going" : "Choose a subscription or a look"}</h2>
        </div>
        <p className="small-copy">
          {authenticated
            ? "Keep the reading system moving with a plan, or switch to the theme shop if you want a new look."
            : "Start free, then swipe between membership and styling to see how TextPlex stays usable either way."}
        </p>
      </div>
      <div className="landing-support-toggle" role="tablist" aria-label="Ways to support TextPlex" data-inventory-id="landing.support-toggle">
        {supportPanels.map((panel, index) => (
          <button
            key={panel.id}
            type="button"
            role="tab"
            className={`button ${index === activeIndex ? "button-primary" : "button-secondary"} landing-support-toggle-button`}
            aria-selected={index === activeIndex}
            aria-controls={`landing-support-panel-${panel.id}`}
            id={`landing-support-tab-${panel.id}`}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => jumpToIndex(index)}
          >
            {panel.label}
          </button>
        ))}
      </div>
      <div className="landing-support-panels" ref={scrollerRef}>
        <article
          ref={(element) => {
            panelRefs.current[0] = element;
          }}
          className={`landing-support-panel card landing-tone-${supportPanels[0].tone}`}
          id="landing-support-panel-subscription"
          role="tabpanel"
          aria-labelledby="landing-support-tab-subscription"
          data-inventory-id="landing.support-subscription-panel"
        >
          <div className="landing-support-panel-copy">
            <span className="eyebrow">{supportPanels[0].eyebrow}</span>
            <h3>{supportPanels[0].title}</h3>
            <p>{supportPanels[0].description}</p>
          </div>
          <div className="landing-pricing-carousel" aria-label="Pricing tiers carousel">
            <Carousel
              ariaLabel="Pricing tiers carousel"
              items={pricingTiers}
              trackClassName="landing-pricing-track"
              renderItem={(tier) => (
                <article className={`landing-tier card landing-tone-${tier.tone}${tier.featured ? " is-featured" : ""}`} key={tier.name}>
                  <div className="card-topline">
                    <span className="eyebrow">{tier.name}</span>
                    {tier.featured ? <span className="pill">Featured</span> : null}
                  </div>
                  <div className="landing-tier-copy">
                    <h3>{tier.name}</h3>
                    <p>{tier.description}</p>
                  </div>
                  <div className="landing-tier-price">
                    <strong>{tier.price}</strong>
                    <span>{tier.cadence}</span>
                  </div>
                  <ul className="landing-checklist">
                    {tier.features.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <Link
                    className={`button ${tier.featured ? "button-primary" : "button-secondary"}`}
                    href={authenticated ? homePath : startFreeHref}
                  >
                    {getPricingTierActionLabel(tier.name, authenticated, tier.featured)}
                  </Link>
                </article>
              )}
            />
          </div>
        </article>
        <article
          ref={(element) => {
            panelRefs.current[1] = element;
          }}
          className={`landing-support-panel card landing-tone-${supportPanels[1].tone}`}
          id="landing-support-panel-theme-shop"
          role="tabpanel"
          aria-labelledby="landing-support-tab-theme-shop"
          data-inventory-id="landing.support-theme-panel"
        >
          <div className="landing-support-panel-copy">
            <span className="eyebrow">{supportPanels[1].eyebrow}</span>
            <h3>{supportPanels[1].title}</h3>
            <p>{supportPanels[1].description}</p>
          </div>
          <div className="landing-theme-carousel" aria-label="Theme packs carousel">
            <Carousel
              ariaLabel="Theme packs carousel"
              items={themePacks}
              trackClassName="landing-theme-track"
              renderItem={(pack) => (
                <article className={`landing-theme-card card landing-tone-${pack.tone}`} key={pack.name}>
                  <span className="pill">One-time purchase</span>
                  <h3>{pack.name}</h3>
                  <p>{pack.note}</p>
                </article>
              )}
            />
          </div>
        </article>
      </div>
    </section>
  );
}

export function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const authenticated = Boolean(user);
  useEffect(() => {
    if (authenticated) {
      router.replace(homePath);
    }
  }, [authenticated, router]);

  const landingHeroEyebrow = authenticated ? "Account overview" : "What is TextPlex?";
  const landingHeroTitle = authenticated
    ? "Welcome back. Pick up where you left off."
    : "Read languages. Remember words.";
  const landingHeroLead = authenticated
    ? "Your Home, profile, and library are ready when you are."
    : "TextPlex makes reading and studying in your next language interactive, intuitive, and insightful.";
  const landingBadgeLabels = authenticated ? ["Signed in", "Progress synced", "Library ready"] : [];

  return (
    <main className="landing-shell" data-inventory-id="landing.page">
      <section className="landing-hero card" aria-labelledby="landing-hero-title" data-inventory-id="landing.hero">
        <div className="landing-hero-copy">
          <span className="eyebrow">{landingHeroEyebrow}</span>
          <h1 id="landing-hero-title">{landingHeroTitle}</h1>
          <p className="lede">{landingHeroLead}</p>
          <div className={`button-row landing-hero-actions${authenticated ? "" : " landing-hero-actions--public"}`}>
            {authenticated ? (
              <>
                <Link className="button button-primary" href={homePath}>
                  Open Home
                </Link>
                <Link className="button button-secondary" href="/profile">
                  Profile
                </Link>
                <Link className="button button-secondary" href="/settings">
                  Settings
                </Link>
              </>
            ) : (
              <>
                <Link className="button button-primary" href={startFreeHref}>
                  Start free
                </Link>
                <Link className="button button-secondary" href={signInHref}>
                  Sign in
                </Link>
              </>
            )}
          </div>
          {landingBadgeLabels.length ? (
            <div className="landing-badge-row" aria-label="Plan summary">
              {landingBadgeLabels.map((label) => (
                <span className="pill" key={label}>
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="landing-hero-previews" aria-label="Workspace previews" data-inventory-id="landing.hero-previews" role="region">
          {landingHeroPreviews.map((preview) => (
            <article
              className={`landing-hero-preview card landing-tone-${preview.tone}`}
              key={preview.id}
              aria-labelledby={`landing-hero-preview-${preview.id}-title`}
              data-inventory-id={preview.id === "reader" ? "landing.hero-reader-preview" : "landing.hero-study-preview"}
            >
              <div
                className="landing-hero-preview-art"
                style={{ backgroundImage: `url("${preview.wallpaperPath}")` }}
                aria-hidden="true"
              />
              <div className="landing-hero-preview-overlay">
                <div className="landing-hero-preview-copy">
                  <h3 id={`landing-hero-preview-${preview.id}-title`}>{preview.title}</h3>
                  <p>{preview.description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" aria-labelledby="landing-features-title">
        <div className="landing-section-head">
          <div>
            <span className="eyebrow">{authenticated ? "Account tools" : "Why TextPlex"}</span>
            <h2 id="landing-features-title">{authenticated ? "What your account can do" : "How TextPlex helps you learn from books"}</h2>
          </div>
          <p className="small-copy">
            {authenticated
              ? "Your reading history, saved words, and account tools live together."
              : "Turn reading into recall without losing the page."}
          </p>
        </div>
        <div className="landing-feature-carousel" aria-label="Feature cards carousel">
          <Carousel
            ariaLabel="Feature cards carousel"
            items={featureCards}
            trackClassName="landing-feature-track"
            renderItem={(feature) => (
              <article className={`landing-feature-card card landing-tone-${feature.tone}`} key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            )}
          />
        </div>
      </section>

      <SupportSwitcher authenticated={authenticated} />

      <section className="landing-cta card" aria-labelledby="landing-cta-title">
        <div>
          <span className="eyebrow">{authenticated ? "Account" : "Next step"}</span>
          <h2 id="landing-cta-title">{authenticated ? "Your account is ready. Continue in Home." : "Start with one book and see the difference."}</h2>
          <p className="lede">
            {authenticated
              ? "Reading, analysis, and profile tools live in Home."
              : "Discovery stays here. Reading, analysis, and progress live in Home."}
          </p>
        </div>
        <div className="button-row">
          {authenticated ? (
            <>
              <Link className="button button-primary" href={homePath}>
                Open Home
              </Link>
              <Link className="button button-secondary" href="/settings">
                Settings
              </Link>
            </>
          ) : (
            <>
              <Link className="button button-primary" href={startFreeHref}>
                Start free
              </Link>
            </>
          )}
        </div>
      </section>
      <footer className="landing-footer" aria-label="TextPlex copyright" data-inventory-id="landing.footer">
        <span className="landing-footer-copy">
          Use only books and materials you own, license, or are otherwise authorized to use.
        </span>
        <span className="landing-footer-mark">© 2026 TextPlex</span>
      </footer>
    </main>
  );
}
