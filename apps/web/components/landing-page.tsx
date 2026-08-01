"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { AccountMenu } from "./account-menu";
import { useAuth } from "./auth-provider";
import { InventoryInspectorToggle } from "./inventory-inspector";

const portalPath = "/portal";
const startFreeHref = `/auth?mode=sign-up&returnTo=${encodeURIComponent(portalPath)}`;
const signInHref = `/auth?returnTo=${encodeURIComponent(portalPath)}`;

const featureCards = [
  {
    title: "Import books into a workspace",
    body: "Turn a book or article into a reading surface instead of a static file.",
    tone: "amber",
  },
  {
    title: "Read with context",
    body: "Tap words, see definitions, and keep the sentence around them.",
    tone: "sage",
  },
  {
    title: "Track exposure and progress",
    body: "See what you have read, what has been analyzed, and how far each book has gone.",
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
    features: ["Everything in Free", "Saved progress history", "Theme shop access"],
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
    return tierName === "Free" ? "Included in account" : "Open portal";
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

export function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const authenticated = Boolean(user);
  useEffect(() => {
    if (authenticated) {
      router.replace(portalPath);
    }
  }, [authenticated, router]);

  const landingHeaderPill = authenticated ? "Signed-in account" : "Public landing page";
  const landingHeroEyebrow = authenticated ? "Account overview" : "Discover the product";
  const landingHeroTitle = authenticated
    ? "Welcome back. Open your reading workspace from here."
    : "TextPlex turns books into a tracked reading workspace.";
  const landingHeroLead = authenticated
    ? "Your portal, profile, and library are one tap away."
    : "Import a book, read with context, and keep vocabulary, exposure, and progress tied to one account.";
  const landingBadgeLabels = authenticated ? ["Signed in", "Profile synced", "Library ready"] : ["Import books", "Read with context", "Track progress"];

  return (
    <main className="landing-shell">
      <header className="landing-header">
        <div className="landing-brand-row">
          <Link className="landing-brand" href={portalPath}>
            TextPlex
          </Link>
          <InventoryInspectorToggle />
        </div>
        <div className="landing-header-actions">
          <span className="pill">{landingHeaderPill}</span>
          <AccountMenu returnTo={portalPath} compact className="landing-account-menu" />
        </div>
      </header>
      <section className="landing-hero card" aria-labelledby="landing-hero-title">
        <div className="landing-hero-copy">
          <span className="eyebrow">{landingHeroEyebrow}</span>
          <h1 id="landing-hero-title">{landingHeroTitle}</h1>
          <p className="lede">{landingHeroLead}</p>
          <div className="button-row">
            {authenticated ? (
              <>
                <Link className="button button-primary" href={portalPath}>
                  Open portal
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
                <Link className="button button-secondary" href={portalPath}>
                  Open portal
                </Link>
              </>
            )}
          </div>
          <div className="landing-badge-row" aria-label="Plan summary">
            {landingBadgeLabels.map((label) => (
              <span className="pill" key={label}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="landing-features-title">
        <div className="landing-section-head">
          <div>
            <span className="eyebrow">{authenticated ? "Account tools" : "Product"}</span>
            <h2 id="landing-features-title">{authenticated ? "What your account can do" : "What TextPlex does"}</h2>
          </div>
          <p className="small-copy">
            {authenticated
              ? "This page now reads like the signed-in entry point."
              : "Import, read, and track progress in one place."}
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

      <section className="landing-section" aria-labelledby="landing-pricing-title">
        <div className="landing-section-head">
          <div>
            <span className="eyebrow">Pricing</span>
            <h2 id="landing-pricing-title">Three subscription tiers</h2>
          </div>
          <p className="small-copy">
            {authenticated
              ? "Your account is already active. The tiers are listed here for reference."
              : "Three monthly tiers. Pick the one that fits."}
          </p>
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
                  href={authenticated ? portalPath : startFreeHref}
                >
                  {getPricingTierActionLabel(tier.name, authenticated, tier.featured)}
                </Link>
              </article>
            )}
          />
        </div>
      </section>

      <section className="landing-section" aria-labelledby="landing-themes-title">
        <div className="landing-section-head">
          <div>
            <span className="eyebrow">{authenticated ? "Appearance" : "Themes"}</span>
            <h2 id="landing-themes-title">{authenticated ? "Optional visual packs" : "One-time visual packs"}</h2>
          </div>
          <p className="small-copy">{authenticated ? "Adjust the look without leaving the account surface." : "Pick a pack once. Keep the look."}</p>
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
      </section>

      <section className="landing-cta card" aria-labelledby="landing-cta-title">
        <div>
          <span className="eyebrow">{authenticated ? "Account" : "Next step"}</span>
          <h2 id="landing-cta-title">{authenticated ? "Your account is ready. Continue in the portal." : "Create an account, then enter the portal."}</h2>
          <p className="lede">
            {authenticated
              ? "Reading, analysis, and profile tools live in the portal."
              : "Discovery stays here. Reading, analysis, and profile tools live in the portal."}
          </p>
        </div>
        <div className="button-row">
          {authenticated ? (
            <>
              <Link className="button button-primary" href={portalPath}>
                Open portal
              </Link>
              <Link className="button button-secondary" href="/settings">
                Settings
              </Link>
            </>
          ) : (
            <>
              <Link className="button button-primary" href={startFreeHref}>
                Create account
              </Link>
              <Link className="button button-secondary" href={portalPath}>
                Explore portal
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
