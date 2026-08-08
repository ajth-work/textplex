import Link from "next/link";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";

import { HomeSurface } from "../../components/home-surface";
import { AUTH_SESSION_COOKIE_KEY, parseAuthSessionCookie } from "../../lib/auth-session";
import type { BookRecord, ProgressSurfaceResponse } from "../../../../packages/shared/src";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "TextPlex Home",
  description: "Pick up where you left off, then turn reading into progress.",
};

type HomeData = {
  books: BookRecord[];
  progress: ProgressSurfaceResponse;
};

function resolveRequestOrigin(requestHeaders: Headers): string {
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.trim();
  const host = forwardedHost || requestHeaders.get("host")?.trim() || "127.0.0.1:3000";
  const forwardedProto = requestHeaders.get("x-forwarded-proto")?.trim();
  const protocol = forwardedProto && forwardedProto.length > 0 ? forwardedProto : "http";
  return `${protocol}://${host}`;
}

function resolveApiUrl(origin: string, pathname: string): string {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_TEXTPLEX_API_URL ?? "/api").trim().replace(/\/$/, "");
  if (/^https?:\/\//i.test(apiBaseUrl)) {
    return `${apiBaseUrl}${pathname}`;
  }
  return `${origin}${apiBaseUrl}${pathname}`;
}

async function fetchHomeJson<T>(origin: string, pathname: string, accessToken: string | null): Promise<T> {
  const response = await fetch(resolveApiUrl(origin, pathname), {
    cache: "no-store",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${pathname}`);
  }

  return (await response.json()) as T;
}

async function loadHomeData(): Promise<HomeData> {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const origin = resolveRequestOrigin(requestHeaders);
  const storedSession = parseAuthSessionCookie(cookieStore.get(AUTH_SESSION_COOKIE_KEY)?.value);
  const accessToken = storedSession?.accessToken ?? null;

  try {
    const [books, progress] = await Promise.all([
      fetchHomeJson<BookRecord[]>(origin, "/books", accessToken),
      fetchHomeJson<ProgressSurfaceResponse>(origin, "/progress", accessToken),
    ]);

    return {
      books: books.filter((book) => book.status !== "archived"),
      progress,
    };
  } catch (error) {
    if (!accessToken) {
      throw error;
    }

    const [books, progress] = await Promise.all([
      fetchHomeJson<BookRecord[]>(origin, "/books", null),
      fetchHomeJson<ProgressSurfaceResponse>(origin, "/progress", null),
    ]);

    return {
      books: books.filter((book) => book.status !== "archived"),
      progress,
    };
  }
}

function HomeLoadError({ error }: Readonly<{ error: string }>) {
  return (
    <main className="preview-home" data-inventory-id="home.page">
      <header className="preview-home-header" data-inventory-id="home.header">
        <div>
          <span className="preview-eyebrow">Home</span>
          <h1 className="preview-home-title">Your reading desk</h1>
        </div>
      </header>
      <section className="preview-error-card" data-inventory-id="home.error-state">
        <span className="preview-eyebrow">Home</span>
        <h1>Home is unavailable.</h1>
        <p>{error}</p>
        <Link className="preview-action" href="/home">
          Retry
        </Link>
      </section>
    </main>
  );
}

export default async function HomePage() {
  let data: HomeData | null = null;
  let errorMessage: string | null = null;

  try {
    data = await loadHomeData();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load the home surface.";
  }

  if (!data) {
    return <HomeLoadError error={errorMessage ?? "Unable to load the home surface."} />;
  }

  return <HomeSurface books={data.books} progress={data.progress} />;
}
