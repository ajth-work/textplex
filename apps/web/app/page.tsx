import Link from "next/link";

import { DEMO_BOOK_ID } from "../lib/demo-data";
import { isDemoMode } from "../lib/textplex";

export default function HomePage() {
  return (
    <main className="home-shell">
      <section className="home-hero card">
        <span className="eyebrow">TextPlex</span>
        <div className="card-topline">
          <span className="pill">{isDemoMode ? "GitHub Pages demo" : "Docker-backed stack"}</span>
          <span className="muted">{isDemoMode ? "Static preview mode" : "Live API + reader mode"}</span>
        </div>
        <h1>Read scanned books as structured language data.</h1>
        <p className="lede">
          TextPlex turns a scanned PDF into page images, extracted text, and a reader surface that keeps vocabulary, navigation, and reading context together.
        </p>
        <p className="small-copy">
          {isDemoMode ? (
            <>
              This export is built for GitHub Pages so you can inspect the reader layout without the backend. See the{" "}
              <Link className="ghost-link" href="/roadmap">
                implementation roadmap
              </Link>{" "}
              for the language pack rollout.
            </>
          ) : (
            <>
              For the full upload and OCR workflow, start the Docker stack; for a static preview, build the GitHub
              Pages demo export. The{" "}
              <Link className="ghost-link" href="/roadmap">
                implementation roadmap
              </Link>{" "}
              tracks the language pack rollout.
            </>
          )}
        </p>
        <div className="button-row">
          <Link className="button button-primary" href="/library">
            Open library
          </Link>
          <Link className="button button-secondary" href={`/analysis/${DEMO_BOOK_ID}`}>
            View analysis
          </Link>
        <Link className="button button-secondary" href="/progress">
          Progress
        </Link>
        <Link className="button button-secondary" href="/study">
          Study
        </Link>
        <Link className="button button-secondary" href="/roadmap">
          Roadmap
        </Link>
      </div>
      </section>

      <section className="feature-grid">
        <article className="card feature-card">
          <h2>Library</h2>
          <p>Inspect imported scans, page preparation status, and extraction progress.</p>
        </article>
        <article className="card feature-card">
          <h2>Book detail</h2>
          <p>Review page manifests, import metadata, and the extracted frequency snapshot for a book.</p>
        </article>
        <article className="card feature-card">
          <h2>Reader</h2>
          <p>Step through a processed page, tap tokens, and keep the reading session state in view.</p>
        </article>
        <article className="card feature-card">
          <h2>Analysis</h2>
          <p>See difficulty, vocabulary distribution, and recommendations for a processed book.</p>
        </article>
        <article className="card feature-card">
          <h2>Study</h2>
          <p>Review due items and keep learner state separate from portable book data.</p>
        </article>
        <article className="card feature-card">
          <h2>Progress</h2>
          <p>Track sentence reads, unique vocabulary, and exposure-driven reading progress.</p>
        </article>
      </section>
    </main>
  );
}
