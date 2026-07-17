import { RoutePage } from "../../components/route-page";

type PlanStep = {
  title: string;
  description: string;
};

type LanguageTrack = {
  code: string;
  language: string;
  status: string;
  progress: number;
  pack: string;
  benchmark: string;
  next: string;
};

const implementationPlan: PlanStep[] = [
  {
    title: "Lock the pack format",
    description: "Keep every language pack in a canonical lexicon.sqlite3 or lexicon.csv layout under resources/lexicon/<language>.",
  },
  {
    title: "Build the Japanese starter pack",
    description: "Seed Japanese first so the importer, lookup path, and preview surfaces have one non-Chinese reference implementation.",
  },
  {
    title: "Repeat the same shape for the next languages",
    description: "Use the same ingest and lookup rules for Korean, Russian, Hebrew, and Arabic instead of creating one-off pipelines.",
  },
  {
    title: "Anchor each pack to a learning benchmark",
    description: "Track against JLPT, TOPIK, TORFL, and domestic literacy goals so the vocab lists map to real learner expectations.",
  },
  {
    title: "Keep the tracker visible in the app",
    description: "Publish the status in the preview UI so the roadmap stays visible while the databases are still being assembled.",
  },
];

const languageTracker: LanguageTrack[] = [
  {
    code: "zh",
    language: "Chinese",
    status: "Foundation",
    progress: 100,
    pack: "Existing canonical Chinese pack",
    benchmark: "HSK and Chinese reading fixtures",
    next: "Keep the current pack stable while the new language packs come online.",
  },
  {
    code: "ja",
    language: "Japanese",
    status: "Active build",
    progress: 35,
    pack: "resources/lexicon/japanese",
    benchmark: "JLPT, school literacy goals, and public-domain readers",
    next: "Seed kanji, kana, readings, and high-frequency vocabulary.",
  },
  {
    code: "ko",
    language: "Korean",
    status: "Queued",
    progress: 10,
    pack: "resources/lexicon/korean",
    benchmark: "TOPIK and domestic school literacy goals",
    next: "Define the corpus, the starter pack, and the first import smoke tests.",
  },
  {
    code: "ru",
    language: "Russian",
    status: "Queued",
    progress: 10,
    pack: "resources/lexicon/russian",
    benchmark: "TORFL and domestic school literacy goals",
    next: "Decide the first public-domain sources and Cyrillic vocabulary coverage.",
  },
  {
    code: "he",
    language: "Hebrew",
    status: "Queued",
    progress: 10,
    pack: "resources/lexicon/hebrew",
    benchmark: "Domestic literacy goals and learner-community vocabulary",
    next: "Set the source pack shape for right-to-left text and modern reading support.",
  },
  {
    code: "ar",
    language: "Arabic",
    status: "Queued",
    progress: 10,
    pack: "resources/lexicon/arabic",
    benchmark: "Domestic literacy goals and learner-community vocabulary",
    next: "Define segmentation, diacritics handling, and the first source pack.",
  },
];

export default function RoadmapPage() {
  return (
    <RoutePage
      eyebrow="Roadmap"
      title="Vocabulary database implementation tracker"
      description="A visible plan for building non-Romanized language vocab packs one language at a time, starting with Japanese."
      badge="Preview"
      links={[
        { href: "/", label: "Home" },
        { href: "/library", label: "Library" },
        { href: "/progress", label: "Progress" },
      ]}
      metrics={[
        { label: "Languages", value: String(languageTracker.length) },
        { label: "Active build", value: "Japanese" },
        { label: "Queued", value: "4" },
      ]}
    >
      <section className="feature-grid">
        <article className="card feature-card">
          <h2>Implementation plan</h2>
          <div className="surface-list">
            {implementationPlan.map((step, index) => (
              <article key={step.title} className="surface-list-item">
                <div className="card-topline">
                  <strong>
                    {index + 1}. {step.title}
                  </strong>
                  <span className="muted">Step {index + 1}</span>
                </div>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="card feature-card">
          <h2>Current focus</h2>
          <p>
            Japanese is the first live target because it forces the importer to handle a new script, a new source-pack
            path, and exam-aligned vocabulary at the same time.
          </p>
          <p className="small-copy">
            The next pass after Japanese should reuse the same pack contract for Korean, Russian, Hebrew, and Arabic
            instead of creating separate code paths.
          </p>
        </article>
      </section>

      <section className="card feature-card">
        <div className="card-topline">
          <h2>Per-language tracker</h2>
          <span className="pill">Live planning</span>
        </div>
        <div className="roadmap-grid">
          {languageTracker.map((track) => (
            <article key={track.code} className="card roadmap-card">
              <div className="roadmap-card-topline">
                <div>
                  <span className="eyebrow">{track.code.toUpperCase()}</span>
                  <h3>{track.language}</h3>
                </div>
                <span className="pill">{track.status}</span>
              </div>
              <div className="roadmap-meter" aria-hidden="true">
                <span className="roadmap-meter-fill" style={{ width: `${track.progress}%` }} />
              </div>
              <dl className="roadmap-details">
                <div className="roadmap-detail">
                  <dt>Pack</dt>
                  <dd>{track.pack}</dd>
                </div>
                <div className="roadmap-detail">
                  <dt>Benchmark</dt>
                  <dd>{track.benchmark}</dd>
                </div>
              </dl>
              <p className="roadmap-note">{track.next}</p>
            </article>
          ))}
        </div>
      </section>
    </RoutePage>
  );
}
