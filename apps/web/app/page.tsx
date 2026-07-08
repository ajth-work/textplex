import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home-shell">
      <section className="home-hero card">
        <span className="eyebrow">TextPlex</span>
        <h1>Read scanned books as structured language data.</h1>
        <p className="lede">
          TextPlex turns a scanned PDF into page images, extracted text, and a reader surface that keeps vocabulary, navigation, and reading context together.
        </p>
        <div className="button-row">
          <Link className="button button-primary" href="/library">
            Open library
          </Link>
          <Link className="button button-secondary" href="/library">
            Browse book routes
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
      </section>
    </main>
  );
}
