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
    title: "Finish the Korean starter pack",
    description: "Keep Korean as the active build so the importer, lookup path, pronunciation guides, and preview surfaces share one non-Chinese reference implementation.",
  },
  {
    title: "Bring Russian and Hebrew onto the same pack contract",
    description: "Use the same ingest, lookup, and pronunciation rules for Russian and Hebrew so the next languages do not fork the pipeline.",
  },
  {
    title: "Extend the shared contract to Japanese and Arabic",
    description: "Keep Japanese kana/kanji handling and Arabic right-to-left, diacritic-aware handling inside the same language-pack model.",
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
    code: "ko",
    language: "Korean",
    status: "Active build",
    progress: 60,
    pack: "resources/lexicon/korean",
    benchmark: "TOPIK, school literacy goals, and public-domain readers",
    next: "Finish the starter-pack cleanup, pronunciation guides, and pack validation pass.",
  },
  {
    code: "ru",
    language: "Russian",
    status: "Sourcing",
    progress: 35,
    pack: "resources/lexicon/russian",
    benchmark: "TORFL and domestic school literacy goals",
    next: "Stabilize the starter pack, override forms, and lemma-backed lookup coverage.",
  },
  {
    code: "he",
    language: "Hebrew",
    status: "RTL support",
    progress: 30,
    pack: "resources/lexicon/hebrew",
    benchmark: "YAEL and domestic literacy goals",
    next: "Finish the starter pack shape, transliteration fallback, and bidi-safe reader checks.",
  },
  {
    code: "ja",
    language: "Japanese",
    status: "Queued",
    progress: 20,
    pack: "resources/lexicon/japanese",
    benchmark: "JLPT and domestic school literacy goals",
    next: "Define the corpus, the starter pack, and the first import smoke tests.",
  },
  {
    code: "ar",
    language: "Arabic",
    status: "Queued",
    progress: 15,
    pack: "resources/lexicon/arabic",
    benchmark: "ACTFL-based Arabic proficiency bands",
    next: "Build the MSA starter pack around ACTFL/AAPPL topic buckets, then add segmentation, diacritics handling, and transliteration coverage.",
  },
];

export default function RoadmapPage() {
  return (
    <RoutePage
      eyebrow="Roadmap"
      title="Implementation tracker"
      description=""
      badge="Preview"
      className="roadmap-hero"
      metrics={[
          { label: "Languages", value: String(languageTracker.length) },
          { label: "Active build", value: "Korean" },
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
            Korean remains the active build because it forces the importer to handle Hangul, a new source-pack path,
            pronunciation guidance, and TOPIK-aligned vocabulary at the same time.
          </p>
          <p className="small-copy">
            The next pass should keep Russian and Hebrew on the same sourcing and fallback contract, then carry the
            same pack model forward to Japanese and Arabic instead of creating separate code paths. Arabic should
            stay MSA-first and be staged through ACTFL/AAPPL topic buckets rather than a separate one-off lookup
            model.
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
