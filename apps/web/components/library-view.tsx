"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";

import {
  fetchJson,
  formatDateTime,
  generateReaderArticle,
  resolveReaderResumeHref,
  type BookRecord,
  type ProgressBookSummary,
  type ProgressSurfaceResponse,
  type StudyProgramGroup,
  type StudySurfaceResponse,
} from "../lib/textplex";
import { languageDisplayLabel, languageShortCode, targetLanguageOptions } from "../lib/language-options";

type LibraryLanguageOption = {
  code: string;
  label: string;
};

const libraryLanguageOptions: LibraryLanguageOption[] = [
  { code: "all", label: "All" },
  ...targetLanguageOptions,
];

type GeneratorCurriculumMode = "auto" | "study_program" | "exam";
type GeneratorWindowBias = "safe" | "balanced" | "stretch";

const generatorSentenceOptions = [5, 10, 15, 30] as const;

const generatorGenreOptions = [
  { value: "everyday", label: "Everyday life" },
  { value: "travel", label: "Travel" },
  { value: "news", label: "News" },
  { value: "dialogue", label: "Dialogue" },
  { value: "workplace", label: "Workplace" },
  { value: "family", label: "Family" },
  { value: "school", label: "School" },
  { value: "mystery", label: "Mystery" },
  { value: "science", label: "Science" },
  { value: "culture", label: "Culture" },
  { value: "food", label: "Food" },
] as const;

const generatorToneOptions = [
  { value: "explanatory", label: "Explanatory" },
  { value: "narrative", label: "Narrative" },
  { value: "journalistic", label: "Journalistic" },
  { value: "conversational", label: "Conversational" },
  { value: "reflective", label: "Reflective" },
] as const;

const generatorCurriculumModeOptions = [
  { value: "auto", label: "Auto" },
  { value: "study_program", label: "Study program" },
  { value: "exam", label: "Exam ladder" },
] as const;

const generatorBiasOptions = [
  { value: "safe", label: "Safe", description: "Keep the article heavy on known words and light on novelty." },
  { value: "balanced", label: "Balanced", description: "Mix known, recent, and upcoming words in the default ratio." },
  { value: "stretch", label: "Stretch", description: "Push a little harder with more upcoming vocabulary." },
] as const;

const examLevelOptionsByLanguage: Record<string, readonly { value: string; label: string }[]> = {
  zh: [
    { value: "HSK 1", label: "HSK 1" },
    { value: "HSK 2", label: "HSK 2" },
    { value: "HSK 3", label: "HSK 3" },
    { value: "HSK 4", label: "HSK 4" },
    { value: "HSK 5", label: "HSK 5" },
    { value: "HSK 6", label: "HSK 6" },
  ],
  ja: [
    { value: "JLPT N5", label: "JLPT N5" },
    { value: "JLPT N4", label: "JLPT N4" },
    { value: "JLPT N3", label: "JLPT N3" },
    { value: "JLPT N2", label: "JLPT N2" },
    { value: "JLPT N1", label: "JLPT N1" },
  ],
  ko: [
    { value: "TOPIK 1", label: "TOPIK 1" },
    { value: "TOPIK 2", label: "TOPIK 2" },
    { value: "TOPIK 3", label: "TOPIK 3" },
    { value: "TOPIK 4", label: "TOPIK 4" },
    { value: "TOPIK 5", label: "TOPIK 5" },
    { value: "TOPIK 6", label: "TOPIK 6" },
  ],
  ru: [
    { value: "TRKI A1", label: "TRKI A1" },
    { value: "TRKI A2", label: "TRKI A2" },
    { value: "TRKI B1", label: "TRKI B1" },
    { value: "TRKI B2", label: "TRKI B2" },
    { value: "TRKI C1", label: "TRKI C1" },
    { value: "TRKI C2", label: "TRKI C2" },
  ],
  ar: [
    { value: "ACTFL Novice Low", label: "ACTFL Novice Low" },
    { value: "ACTFL Novice Mid", label: "ACTFL Novice Mid" },
    { value: "ACTFL Novice High", label: "ACTFL Novice High" },
    { value: "ACTFL Intermediate Low", label: "ACTFL Intermediate Low" },
    { value: "ACTFL Intermediate Mid", label: "ACTFL Intermediate Mid" },
    { value: "ACTFL Intermediate High", label: "ACTFL Intermediate High" },
    { value: "ACTFL Advanced Low", label: "ACTFL Advanced Low" },
    { value: "ACTFL Advanced Mid", label: "ACTFL Advanced Mid" },
    { value: "ACTFL Advanced High", label: "ACTFL Advanced High" },
  ],
};

const generatorBiasLimits: Record<GeneratorWindowBias, { known: number; recent: number; upcoming: number; newLemmaLimit: number }> = {
  safe: { known: 16, recent: 8, upcoming: 6, newLemmaLimit: 4 },
  balanced: { known: 12, recent: 10, upcoming: 12, newLemmaLimit: 8 },
  stretch: { known: 10, recent: 10, upcoming: 16, newLemmaLimit: 12 },
};

function bookFormatLabel(book: BookRecord): string {
  const suffix = book.source_filename.split(".").pop()?.trim();
  return suffix ? suffix.toUpperCase() : "TXT";
}

function bookStatusLabel(book: BookRecord): string {
  if (book.status === "ready" || book.status === "extracted" || book.extraction_status === "complete") {
    return "Live";
  }
  if (book.extraction_status === "processing" || book.status === "processing") {
    return "Preparing";
  }
  if (book.status === "queued" || book.extraction_status === "queued") {
    return "Queued";
  }
  return "Local";
}

function readingStateLabel(progress: ProgressBookSummary | null): string {
  if (!progress || progress.reading_state === "not_read") {
    return "Not read";
  }
  if (progress.reading_state === "finished") {
    return "Finished";
  }
  return "In progress";
}

function bookSubtitle(book: BookRecord): string {
  return book.author?.trim() || book.source_filename.replace(/\.[^.]+$/, "") || "Unknown author";
}

function bookMetaSummary(book: BookRecord): string {
  return `${book.total_pages} pages · ${book.extracted_page_count} extracted · Updated ${formatDateTime(book.processed_at ?? book.created_at)}`;
}

function sortBooks(books: BookRecord[]): BookRecord[] {
  return [...books].sort((left, right) => {
    const leftDate = left.processed_at ?? left.created_at;
    const rightDate = right.processed_at ?? right.created_at;
    const dateCompare = rightDate.localeCompare(leftDate);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return left.title.localeCompare(right.title);
  });
}

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}

function matchesBook(book: BookRecord, query: string): boolean {
  if (!query) {
    return true;
  }
  const haystack = [
    book.title,
    book.author,
    book.source_filename,
    book.language_code,
    book.status,
    book.extraction_status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function matchesLibraryLanguage(book: BookRecord, languageCode: string): boolean {
  return languageCode === "all" || book.language_code === languageCode;
}

function generatorLanguageLabel(languageCode: string): string {
  return languageDisplayLabel(languageCode);
}

function generatorOptionLabel(options: readonly { value: string; label: string }[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function getGeneratorLevelOptions(
  languageCode: string,
  curriculumMode: GeneratorCurriculumMode,
  studyPrograms: StudyProgramGroup[],
): Array<{ value: string; label: string }> {
  if (curriculumMode === "auto") {
    return [];
  }

  if (curriculumMode === "study_program") {
    const languageProgram = studyPrograms.find((program) => program.language_code === languageCode);
    if (!languageProgram) {
      return [];
    }
    return languageProgram.levels.map((level) => ({
      value: `${languageProgram.program_code}:${level.level_code}`,
      label: level.level_label,
    }));
  }

  return [...(examLevelOptionsByLanguage[languageCode] ?? [])];
}

function defaultExamLevel(languageCode: string): string {
  return examLevelOptionsByLanguage[languageCode]?.[1]?.value ?? examLevelOptionsByLanguage[languageCode]?.[0]?.value ?? "";
}

function summarizeGeneratorSettings(
  languageCode: string,
  sentenceCount: number,
  curriculumMode: GeneratorCurriculumMode,
  curriculumLevel: string,
  useLearnerVocabulary: boolean,
  genre: string,
  tone: string,
  windowBias: GeneratorWindowBias,
): string {
  const curriculumParts = curriculumMode === "auto"
    ? ["Auto"]
    : [generatorOptionLabel(generatorCurriculumModeOptions, curriculumMode), curriculumLevel || "Ceiling off"];
  const parts = [
    `${sentenceCount} sentences`,
    generatorLanguageLabel(languageCode),
    ...curriculumParts,
    generatorOptionLabel(generatorGenreOptions, genre),
    generatorOptionLabel(generatorToneOptions, tone),
    useLearnerVocabulary ? generatorOptionLabel(generatorBiasOptions, windowBias) : "Level-calibrated",
    useLearnerVocabulary ? "Learner vocabulary" : "JLPT / exam level only",
  ];
  return parts.filter(Boolean).join(" · ");
}

function LibrarySkeletonCard() {
  return (
    <article className="library-skeleton-card" aria-label="Loading library book" role="status">
      <div className="library-skeleton-art skeleton-block" aria-hidden="true" />
      <div className="library-skeleton-body">
        <span className="skeleton-block" />
        <span className="skeleton-block" />
        <span className="skeleton-block" />
      </div>
    </article>
  );
}

function LibraryCard({ book, progress, onOpenInfo, onOpenReader }: {
  book: BookRecord;
  progress: ProgressBookSummary | null;
  onOpenInfo: (bookId: string) => void;
  onOpenReader: (bookId: string) => void;
}) {
  const artClass = `home-book-art home-book-art-${book.language_code.slice(0, 2).toLowerCase()}`;

  function handleCardClick() {
    onOpenInfo(book.id);
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenInfo(book.id);
    }
  }

  function stopAndOpen(handler: (bookId: string) => void) {
    return (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      handler(book.id);
    };
  }

  return (
    <article
      className={`library-card${book.status === "ready" || book.extraction_status === "complete" ? " is-selected" : ""}`}
      role="link"
      tabIndex={0}
      data-inventory-id="library.book-card"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      <div className={artClass} aria-hidden="true" />
      <div className="library-card-body">
        <p className="library-kicker">
          {languageShortCode(book.language_code)} · {bookFormatLabel(book)}
        </p>
        <h3>{book.title}</h3>
        <p className="library-author">{bookSubtitle(book)}</p>
        <p className="library-summary">{bookMetaSummary(book)}</p>
        <div className="library-actions">
          <div className="library-tag-row">
            <span className="library-tag library-status">{bookStatusLabel(book)}</span>
            <span className="library-tag library-read-state">{readingStateLabel(progress)}</span>
          </div>
          <div className="library-action-buttons">
            <button
              className="button button-secondary library-action-button library-action-button-info"
              type="button"
              aria-label={`Open book info for ${book.title}`}
              title="Info"
              data-inventory-id="library.book-info-button"
              onClick={stopAndOpen(onOpenInfo)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <button
              className="button button-primary library-action-button library-action-button-read"
              type="button"
              aria-label={`Read ${book.title}`}
              title="Read"
              data-inventory-id="library.book-open-button"
              onClick={stopAndOpen(onOpenReader)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h9A2.5 2.5 0 0 1 20 4.5V19a1 1 0 0 1-1.5.86L16 18.3l-2.5 1.56a1 1 0 0 1-1 0L10 18.3l-2.5 1.56A1 1 0 0 1 6 19V4.5Z" />
                <path d="M8 6.5h7.5" />
                <path d="M8 10h7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function LibraryLoadingState() {
  return (
    <div className="library-shelf" aria-live="polite">
      <LibrarySkeletonCard />
    </div>
  );
}

export function LibraryView() {
  const router = useRouter();
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [progress, setProgress] = useState<ProgressSurfaceResponse | null>(null);
  const [study, setStudy] = useState<StudySurfaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [languageCode, setLanguageCode] = useState("all");
  const [generatingArticle, setGeneratingArticle] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatorLanguageCode, setGeneratorLanguageCode] = useState("zh");
  const [generatorSentenceCount, setGeneratorSentenceCount] = useState<(typeof generatorSentenceOptions)[number]>(10);
  const [generatorCurriculumMode, setGeneratorCurriculumMode] = useState<GeneratorCurriculumMode>("auto");
  const [generatorCurriculumLevel, setGeneratorCurriculumLevel] = useState("");
  const [generatorUseLearnerVocabulary, setGeneratorUseLearnerVocabulary] = useState(true);
  const [generatorGenre, setGeneratorGenre] = useState("everyday");
  const [generatorTone, setGeneratorTone] = useState("explanatory");
  const [generatorWindowBias, setGeneratorWindowBias] = useState<GeneratorWindowBias>("balanced");
  const [generatorTopic, setGeneratorTopic] = useState("");
  const [generatorLanguageTouched, setGeneratorLanguageTouched] = useState(false);

  useEffect(() => {
    let active = true;

    void fetchJson<BookRecord[]>("/books")
      .then((result) => {
        if (!active) {
          return;
        }
        setBooks(sortBooks(result));
      })
      .catch((reason: unknown) => {
        if (!active) {
          return;
        }
        setError(reason instanceof Error ? reason.message : "Unable to load books.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    void fetchJson<StudySurfaceResponse>("/study")
      .then((result) => {
        if (active) {
          setStudy(result);
        }
      })
      .catch(() => {
        if (active) {
          setStudy(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    void fetchJson<ProgressSurfaceResponse>("/progress")
      .then((result) => {
        if (active) {
          setProgress(result);
        }
      })
      .catch(() => {
        if (active) {
          setProgress(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleBooks = useMemo(() => {
    const normalizedQuery = normalizeQuery(query);
    return books.filter((book) => matchesBook(book, normalizedQuery) && matchesLibraryLanguage(book, languageCode));
  }, [books, languageCode, query]);
  const progressByBookId = useMemo(() => new Map((progress?.books ?? []).map((item) => [item.book_id, item])), [progress]);

  function openInfo(bookId: string) {
    router.push(`/books/${bookId}`);
  }

  function openReader(bookId: string) {
    router.push(resolveReaderResumeHref(bookId, progress));
  }

  function resolveGeneratedLanguageCode(): string {
    if (generatorLanguageCode) {
      return generatorLanguageCode;
    }
    if (languageCode !== "all") {
      return languageCode;
    }
    const selectedTrackCode = progress?.profile.selected_track_code;
    const selectedTrack = selectedTrackCode ? progress?.profile.learning_tracks.find((track) => track.code === selectedTrackCode) : null;
    if (selectedTrack?.language_code) {
      return selectedTrack.language_code;
    }
    return books[0]?.language_code ?? "zh";
  }

  const generatorLanguage = resolveGeneratedLanguageCode();
  const generatorCurriculumLevelOptions = useMemo(
    () => getGeneratorLevelOptions(generatorLanguage, generatorCurriculumMode, study?.study_programs ?? []),
    [generatorCurriculumMode, generatorLanguage, study],
  );
  const generatorBiasLimitsForSelection = generatorBiasLimits[generatorWindowBias];
  const generatorSettingsSummary = summarizeGeneratorSettings(
    generatorLanguage,
    generatorSentenceCount,
    generatorCurriculumMode,
    generatorCurriculumLevel,
    generatorUseLearnerVocabulary,
    generatorGenre,
    generatorTone,
    generatorWindowBias,
  );
  const generatorTopicValue = generatorTopic.trim();

  useEffect(() => {
    if (!generatorLanguageTouched) {
      const selectedTrackCode = progress?.profile.selected_track_code;
      const selectedTrack = selectedTrackCode ? progress?.profile.learning_tracks.find((track) => track.code === selectedTrackCode) : null;
      const preferredLanguage = languageCode !== "all" ? languageCode : selectedTrack?.language_code ?? books[0]?.language_code ?? null;
      if (preferredLanguage && preferredLanguage !== generatorLanguageCode) {
        setGeneratorLanguageCode(preferredLanguage);
      }
    }

    if (generatorCurriculumMode === "auto") {
      if (generatorCurriculumLevel) {
        setGeneratorCurriculumLevel("");
      }
      return;
    }

    if (!generatorCurriculumLevel) {
      return;
    }

    const validValues = new Set(generatorCurriculumLevelOptions.map((option) => option.value));
    if (!validValues.has(generatorCurriculumLevel)) {
      setGeneratorCurriculumLevel(!generatorUseLearnerVocabulary && generatorCurriculumMode === "exam" ? defaultExamLevel(generatorLanguage) : "");
    }
  }, [books, generatorCurriculumLevel, generatorCurriculumLevelOptions, generatorCurriculumMode, generatorLanguage, generatorLanguageCode, generatorLanguageTouched, generatorUseLearnerVocabulary, languageCode, progress]);

  async function generatePracticeArticle() {
    const generatedLanguageCode = resolveGeneratedLanguageCode();
    const limits = generatorBiasLimitsForSelection;
    setGeneratingArticle(true);
    setGenerationMessage(null);
    setGenerationError(null);

    try {
      const result = await generateReaderArticle({
        language_code: generatedLanguageCode,
        topic: generatorTopicValue || null,
        genre: generatorGenre,
        tone: generatorTone,
        style: generatorTone,
        curriculum_mode: generatorCurriculumMode,
        curriculum_level: generatorCurriculumLevel || null,
        use_learner_vocabulary: generatorUseLearnerVocabulary,
        sentence_count: generatorSentenceCount,
        known_lemma_limit: limits.known,
        recent_lemma_limit: limits.recent,
        upcoming_lemma_limit: limits.upcoming,
        max_new_lemmas: limits.newLemmaLimit,
      });
      setGenerationMessage(`Generated ${result.title}. Opening it in the reader.`);
      router.push(`/reader/${result.book.id}/1`);
    } catch (reason: unknown) {
      setGenerationError(reason instanceof Error ? reason.message : "Unable to generate a practice article.");
    } finally {
      setGeneratingArticle(false);
    }
  }

  function retryLoad() {
    setLoading(true);
    setError(null);
    void fetchJson<BookRecord[]>("/books")
      .then((result) => {
        setBooks(sortBooks(result));
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Unable to load books.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  const visibleCount = visibleBooks.length;
  const hasBooks = books.length > 0;
  const hasQuery = Boolean(normalizeQuery(query));

  return (
    <section className="library-page">
      <header className="library-hero card" data-inventory-id="library.search-hero">
        <div className="library-hero-head">
          <p className="eyebrow">Search</p>
        </div>

        <div className="library-controls">
          <label className="library-search" htmlFor="librarySearch">
            <span aria-hidden="true">⌕</span>
            <input
              id="librarySearch"
              type="search"
              placeholder="Search titles, authors, tags..."
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              data-inventory-id="library.search"
            />
          </label>

          <div
            className={`library-count ${loading ? "skeleton-line" : ""}`.trim()}
            id="libraryCount"
            aria-live="polite"
            aria-label={loading ? "Loading document count" : `${visibleCount} documents`}
            data-inventory-id="library.document-count"
          >
            {loading ? null : `${visibleCount} document${visibleCount === 1 ? "" : "s"}`}
          </div>
        </div>

        <div className="library-language-filter" data-inventory-id="library.language-filter" aria-label="Filter library by language">
          <span className="library-language-filter-label">Languages</span>
          <div className="library-language-filter-row" role="group" aria-label="Language filter buttons">
            {libraryLanguageOptions.map((option) => (
              <button
                key={option.code}
                type="button"
                className={`library-language-button ${languageCode === option.code ? "is-selected" : ""}`}
                aria-pressed={languageCode === option.code}
                onClick={() => setLanguageCode(option.code)}
              >
                {option.code === "all" ? option.label : `(${languageShortCode(option.code)})`}
              </button>
            ))}
          </div>
        </div>

        <div className="library-practice-action">
          <div className="library-practice-copy">
            <p className="library-practice-kicker">Practice article</p>
            <p className="library-practice-text">Generate a controlled reader article from your current learner window and open it immediately.</p>
          </div>
        </div>
        <details className="library-generator-settings" data-inventory-id="library.generator-settings" open={false}>
          <summary className="library-generator-summary" data-inventory-id="library.generator-summary">
            <span>Generator settings</span>
            <span className="library-generator-summary-meta">{generatorSettingsSummary}</span>
          </summary>
          <div className="library-generator-grid">
            <label className="library-generator-field">
              <span>Target language</span>
              <select
                value={generatorLanguageCode}
                onChange={(event) => {
                  setGeneratorLanguageTouched(true);
                  setGeneratorLanguageCode(event.target.value);
                }}
              >
                {libraryLanguageOptions
                  .filter((option) => option.code !== "all")
                  .map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </label>
            <label className="library-generator-field">
              <span>Length</span>
              <select value={String(generatorSentenceCount)} onChange={(event) => setGeneratorSentenceCount(Number(event.target.value) as (typeof generatorSentenceOptions)[number])}>
                {generatorSentenceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option} sentences
                  </option>
                ))}
              </select>
            </label>
            <label className="library-generator-field">
              <span>Curriculum ceiling</span>
              <select value={generatorCurriculumMode} onChange={(event) => setGeneratorCurriculumMode(event.target.value as GeneratorCurriculumMode)}>
                {generatorCurriculumModeOptions.map((option) => (
                  <option key={option.value} value={option.value} disabled={!generatorUseLearnerVocabulary && option.value === "auto"}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="library-generator-field">
              <span>Vocabulary source</span>
              <select
                value={generatorUseLearnerVocabulary ? "learner" : "level"}
                onChange={(event) => {
                  const useLearnerVocabulary = event.target.value === "learner";
                  setGeneratorUseLearnerVocabulary(useLearnerVocabulary);
                  if (!useLearnerVocabulary && generatorCurriculumMode === "auto") {
                    setGeneratorCurriculumMode("exam");
                    setGeneratorCurriculumLevel(defaultExamLevel(generatorLanguage));
                  }
                }}
              >
                <option value="learner">Learner vocabulary window</option>
                <option value="level">JLPT / exam level only</option>
              </select>
            </label>
            <label className="library-generator-field">
              <span>Level</span>
              <select
                value={generatorCurriculumLevel}
                onChange={(event) => setGeneratorCurriculumLevel(event.target.value)}
                disabled={generatorCurriculumMode === "auto"}
              >
                <option value="">{generatorCurriculumMode === "study_program" ? "Use program levels" : "Auto"}</option>
                {generatorCurriculumLevelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="library-generator-field">
              <span>Genre</span>
              <select value={generatorGenre} onChange={(event) => setGeneratorGenre(event.target.value)}>
                {generatorGenreOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="library-generator-field">
              <span>Tone</span>
              <select value={generatorTone} onChange={(event) => setGeneratorTone(event.target.value)}>
                {generatorToneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="library-generator-field">
              <span>Vocabulary balance</span>
              <select value={generatorWindowBias} onChange={(event) => setGeneratorWindowBias(event.target.value as GeneratorWindowBias)} disabled={!generatorUseLearnerVocabulary}>
                {generatorBiasOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="library-generator-field library-generator-field-topic">
              <span>Topic</span>
              <input
                type="text"
                value={generatorTopic}
                onChange={(event) => setGeneratorTopic(event.target.value)}
                placeholder="travel planning, museum visit, school day..."
              />
            </label>
            <p className="library-generator-note">
              {generatorUseLearnerVocabulary
                ? "The level ceiling is applied where TextPlex has a matching study program or proficiency ladder; the learner window still guides word selection."
                : "The selected JLPT or exam level guides vocabulary and grammar. Learner-profile terms are not injected into the article."}
            </p>
          </div>
        </details>
        <button
          className="button button-primary library-practice-action-button"
          type="button"
          id="practice-article"
          data-inventory-id="library.generate-article-button"
          onClick={() => void generatePracticeArticle()}
          disabled={generatingArticle}
        >
          {generatingArticle ? "Generating..." : "Generate practice article"}
        </button>
        {generationMessage || generationError ? (
          <p className={`library-practice-status ${generationError ? "is-error" : ""}`.trim()} aria-live="polite">
            {generationError || generationMessage}
          </p>
        ) : null}
      </header>

      <section className="library-shell card">
        <div className="library-shell-head">
          <p className="eyebrow">Library</p>
        </div>

        {error ? (
          <section className="library-error-card" role="alert" data-inventory-id="library.error-state">
            <h2>Library is unavailable.</h2>
            <p>{error}</p>
            <button className="button button-primary" type="button" onClick={retryLoad}>
              Retry
            </button>
          </section>
        ) : null}

        {!error && loading ? <LibraryLoadingState /> : null}

        {!error && !loading && visibleBooks.length > 0 ? (
          <div className="library-shelf" aria-live="polite" data-inventory-id="library.shelf">
            {visibleBooks.map((book) => (
              <LibraryCard key={book.id} book={book} progress={progressByBookId.get(book.id) ?? null} onOpenInfo={openInfo} onOpenReader={openReader} />
            ))}
          </div>
        ) : null}

        {!error && !loading && visibleBooks.length === 0 ? (
          <section className="library-empty-card" data-inventory-id="library.empty-state">
            <h2>{hasBooks ? "No visible library items match your search or language filter." : "No books imported yet."}</h2>
            <p>
              {hasBooks
                ? "Try a different title, author, source filename, or language."
                : "Use the import flow to register a scan, then TextPlex will expose it here for reading."}
            </p>
            <div className="button-row">
              {hasBooks && hasQuery ? (
                <button className="button button-secondary" type="button" onClick={() => setQuery("")}>
                  Clear search
                </button>
              ) : null}
              {hasBooks && languageCode !== "all" ? (
                <button className="button button-secondary" type="button" onClick={() => setLanguageCode("all")}>
                  Show all languages
                </button>
              ) : null}
              <Link className="button button-primary" href="/import">
                Import a text
              </Link>
            </div>
          </section>
        ) : null}
      </section>
    </section>
  );
}
