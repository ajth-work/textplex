"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { RoutePage } from "./route-page";
import {
  fetchJson,
  formatDateTime,
  postJson,
  type LexiconLookupResponse,
  type StudySurfaceResponse,
  type VocabularyAssessmentAxisKey,
  type VocabularyAssessmentStateRecord,
} from "../lib/textplex";

type PracticeMode = "program" | "review";

type StudyPracticeViewProps = {
  initialMode?: PracticeMode;
  initialLanguageCode?: string | null;
  initialProgramCode?: string | null;
  initialLevelCode?: string | null;
  initialAssessmentAxisKey?: string | null;
};

type PracticeDetailRow = {
  label: string;
  value: string;
};

type AnswerResult = "idle" | "correct" | "incorrect";

const INTRODUCTION_CHUNK_SIZE = 5;
const INTRODUCTION_AXIS_ORDER: VocabularyAssessmentAxisKey[] = [
  "form_to_meaning",
  "form_to_reading",
  "meaning_to_form",
  "reading_to_form",
];

type IntroductionProgress = {
  chunkIndex: number;
  selectedIndex: number;
  shuffleSeed: number;
};

const introductionProgressStoragePrefix = "textplex.study-introduction:";

type PracticeCard = {
  key: string;
  kind: PracticeMode;
  languageCode: string;
  languageLabel: string;
  term: string;
  pronunciation: string | null;
  meaning: string | null;
  sourceLabel: string;
  title: string;
  subtitle: string;
  progressLabel: string;
  detailRows: PracticeDetailRow[];
  lookupLanguageCode: string;
  lookupTerm: string;
  assessmentAxisKey: VocabularyAssessmentAxisKey;
};

function normalizeAssessmentAxisKey(value: string | null | undefined): VocabularyAssessmentAxisKey {
  switch (value?.trim().toLowerCase()) {
    case "form_to_reading":
      return "form_to_reading";
    case "meaning_to_form":
      return "meaning_to_form";
    case "reading_to_form":
      return "reading_to_form";
    default:
      return "form_to_meaning";
  }
}

function normalizeLanguageCode(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return null;
  }
  return normalized.split("-", 1)[0] ?? null;
}

function languageLabel(languageCode: string): string {
  switch (languageCode.toLowerCase()) {
    case "ru":
      return "Russian";
    case "zh":
      return "Chinese";
    case "ja":
      return "Japanese";
    case "ko":
      return "Korean";
    case "he":
      return "Hebrew";
    case "ar":
      return "Arabic";
    default:
      return languageCode.toUpperCase();
  }
}

function normalizePracticeAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function introductionProgressStorageKey(mode: PracticeMode, languageCode: string | null, programCode: string | null, levelCode: string | null): string {
  return [introductionProgressStoragePrefix, mode, languageCode ?? "all", programCode ?? "default", levelCode ?? "default"].join(":");
}

function createIntroductionShuffleSeed(): number {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] || 1;
  }
  return Math.floor(Math.random() * 2 ** 32) || 1;
}

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const shuffled = [...items];
  let state = seed >>> 0 || 1;
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function readIntroductionProgress(storageKey: string): IntroductionProgress | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "null") as Partial<IntroductionProgress> | null;
    const chunkIndex = parsed?.chunkIndex;
    const selectedIndex = parsed?.selectedIndex;
    const shuffleSeed = parsed?.shuffleSeed;
    if (
      !parsed ||
      typeof chunkIndex !== "number" ||
      !Number.isInteger(chunkIndex) ||
      chunkIndex < 0 ||
      typeof selectedIndex !== "number" ||
      !Number.isInteger(selectedIndex) ||
      selectedIndex < 0 ||
      typeof shuffleSeed !== "number" ||
      !Number.isInteger(shuffleSeed)
    ) {
      return null;
    }
    return {
      chunkIndex,
      selectedIndex,
      shuffleSeed,
    };
  } catch {
    return null;
  }
}

function writeIntroductionProgress(storageKey: string, progress: IntroductionProgress): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    // Local storage is a convenience resume aid; assessment state remains server-backed.
  }
}

function assessmentAxisLabel(axisKey: VocabularyAssessmentAxisKey): string {
  switch (axisKey) {
    case "form_to_reading":
      return "Form to reading";
    case "meaning_to_form":
      return "Meaning to form";
    case "reading_to_form":
      return "Reading to form";
    default:
      return "Form to meaning";
  }
}

type PracticePrompt = {
  label: string;
  prompt: string | null;
  promptLanguage: string;
  answer: string | null;
  answerLanguage: string;
  placeholder: string;
};

function buildPracticePrompt(
  card: PracticeCard,
  meaning: string | null,
  pronunciation: string | null,
): PracticePrompt {
  switch (card.assessmentAxisKey) {
    case "form_to_reading":
      return {
        label: "Type the pronunciation or reading",
        prompt: card.term,
        promptLanguage: card.languageCode,
        answer: pronunciation,
        answerLanguage: card.languageCode,
        placeholder: "Pronunciation or reading",
      };
    case "meaning_to_form":
      return {
        label: "Type the target-language form",
        prompt: meaning,
        promptLanguage: "en",
        answer: card.term,
        answerLanguage: card.languageCode,
        placeholder: "Target-language form",
      };
    case "reading_to_form":
      return {
        label: "Type the target-language form",
        prompt: pronunciation,
        promptLanguage: "en",
        answer: card.term,
        answerLanguage: card.languageCode,
        placeholder: "Target-language form",
      };
    default:
      return {
        label: "Type the English meaning",
        prompt: card.term,
        promptLanguage: card.languageCode,
        answer: meaning,
        answerLanguage: "en",
        placeholder: "English meaning",
      };
  }
}

function buildProgramCards(
  data: StudySurfaceResponse,
  languageCode: string | null,
  programCode: string | null,
  levelCode: string | null,
  chunkIndex: number,
  shuffleSeed: number,
): PracticeCard[] {
  const matchingPrograms = data.study_programs.filter((program) => !languageCode || program.language_code === languageCode);
  const selectedProgram = (programCode ? matchingPrograms.find((program) => program.program_code === programCode) : null) ?? matchingPrograms[0] ?? null;
  if (!selectedProgram) {
    return [];
  }

  const selectedLevels = levelCode
    ? selectedProgram.levels.filter((level) => level.level_code === levelCode)
    : selectedProgram.levels.slice(0, 1);
  const levels = selectedLevels.length ? selectedLevels : selectedProgram.levels.slice(0, 1);

  return levels.flatMap((level) =>
    shuffleWithSeed(level.items, shuffleSeed)
      .slice(chunkIndex * INTRODUCTION_CHUNK_SIZE, (chunkIndex + 1) * INTRODUCTION_CHUNK_SIZE)
      .flatMap((item, itemIndex) => INTRODUCTION_AXIS_ORDER.map((assessmentAxisKey, axisIndex) => ({
      key: `${selectedProgram.program_code}:${level.level_code}:${item.lemma}:${itemIndex}:${axisIndex}`,
      kind: "program" as const,
      languageCode: item.language_code,
      languageLabel: item.language_label,
      term: item.display_form,
      pronunciation: item.pronunciation ?? null,
      meaning: item.definition_short ?? null,
      sourceLabel: `${selectedProgram.program_source_label} - ${level.level_label}`,
      title: selectedProgram.program_label,
      subtitle: level.introduction_note,
      progressLabel: assessmentAxisLabel(assessmentAxisKey),
      detailRows: [
        { label: "Level", value: level.level_label },
        { label: "Review axis", value: assessmentAxisLabel(assessmentAxisKey) },
        { label: "Frequency", value: item.frequency_rank != null ? `#${item.frequency_rank}` : "-" },
        { label: "Saved", value: String(item.saved_count) },
        { label: "Confidence", value: item.confidence_score != null ? item.confidence_score.toFixed(2) : "-" },
      ],
      lookupLanguageCode: item.language_code,
      lookupTerm: item.lemma,
      assessmentAxisKey,
    }))),
  );
}

function buildReviewCards(data: StudySurfaceResponse, languageCode: string | null, assessmentAxisKey: VocabularyAssessmentAxisKey): PracticeCard[] {
  const queuedItems = data.queued_items.filter((item) => !languageCode || item.language_code === languageCode);
  if (queuedItems.length > 0) {
    return queuedItems.map((item, index) => ({
      key: `${item.language_code}:queue:${item.lemma}:${index}`,
      kind: "review" as const,
      languageCode: item.language_code,
      languageLabel: languageLabel(item.language_code),
      term: item.lemma,
      pronunciation: null,
      meaning: null,
      sourceLabel: "Due item",
      title: "Review queue",
      subtitle: "Step through due vocabulary one term at a time.",
      progressLabel: item.state.toUpperCase(),
      detailRows: [
        { label: "Raw exposures", value: String(item.raw_exposures) },
        { label: "Weighted", value: item.weighted_exposure.toFixed(1) },
        { label: "Pages", value: String(item.unique_pages) },
        { label: "Books", value: String(item.unique_books) },
        { label: "Help", value: String(item.help_requests) },
        { label: "Confidence", value: item.confidence_score.toFixed(2) },
      ],
      lookupLanguageCode: item.language_code,
      lookupTerm: item.lemma,
      assessmentAxisKey,
    }));
  }

  return data.study_groups
    .filter((group) => !languageCode || group.language_code === languageCode)
    .flatMap((group) =>
      group.items.map((item, index) => ({
        key: `${group.language_code}:saved:${item.lemma}:${index}`,
        kind: "review" as const,
        languageCode: item.language_code,
        languageLabel: item.language_label,
        term: item.display_form,
        pronunciation: item.pronunciation ?? item.romanization ?? null,
        meaning: item.definition_short ?? null,
        sourceLabel: item.source_book_title ?? item.source_book_id,
        title: "Saved vocabulary review",
        subtitle: `Source page ${item.source_page_number} - sentence ${item.source_sentence_order}`,
        progressLabel: item.proficiency_level ?? "SAVED",
        detailRows: [
          { label: "Book", value: item.source_book_title ?? item.source_book_id },
          { label: "Page", value: String(item.source_page_number) },
          { label: "Sentence", value: String(item.source_sentence_order) },
          { label: "Token", value: String(item.source_token_order) },
          { label: "First seen", value: formatDateTime(item.first_seen_at) },
          { label: "Last seen", value: formatDateTime(item.last_seen_at) },
        ],
        lookupLanguageCode: item.language_code,
        lookupTerm: item.lemma,
        assessmentAxisKey,
      })),
    );
}

function buildPracticeCards(
  data: StudySurfaceResponse,
  mode: PracticeMode,
  languageCode: string | null,
  programCode: string | null,
  levelCode: string | null,
  chunkIndex: number,
  assessmentAxisKey: VocabularyAssessmentAxisKey,
  shuffleSeed: number,
): PracticeCard[] {
  return mode === "review"
    ? buildReviewCards(data, languageCode, assessmentAxisKey)
    : buildProgramCards(data, languageCode, programCode, levelCode, chunkIndex, shuffleSeed);
}

export function StudyPracticeView({
  initialMode = "program",
  initialLanguageCode = null,
  initialProgramCode = null,
  initialLevelCode = null,
  initialAssessmentAxisKey = null,
}: StudyPracticeViewProps) {
  const [data, setData] = useState<StudySurfaceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [introductionChunkIndex, setIntroductionChunkIndex] = useState(0);
  const [introductionShuffleSeed, setIntroductionShuffleSeed] = useState<number | null>(null);
  const [introductionProgressHydrated, setIntroductionProgressHydrated] = useState(initialMode !== "program");
  const [revealed, setRevealed] = useState(false);
  const [answerDraft, setAnswerDraft] = useState("");
  const [answerResult, setAnswerResult] = useState<AnswerResult>("idle");
  const [assessmentPending, setAssessmentPending] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<LexiconLookupResponse | null>(null);
  const answerInputRef = useRef<HTMLInputElement>(null);

  const normalizedLanguageCode = normalizeLanguageCode(initialLanguageCode);
  const assessmentAxisKey = normalizeAssessmentAxisKey(initialAssessmentAxisKey);
  const mode = initialMode;
  const introductionProgressKey = introductionProgressStorageKey(mode, normalizedLanguageCode, initialProgramCode, initialLevelCode);

  useEffect(() => {
    let active = true;
    const path = normalizedLanguageCode ? `/study?language_code=${encodeURIComponent(normalizedLanguageCode)}` : "/study";

    void fetchJson<StudySurfaceResponse>(path)
      .then((result) => {
        if (active) {
          setData(result);
          setSelectedIndex(0);
          setIntroductionChunkIndex(0);
          setRevealed(false);
          setAnswerDraft("");
          setAnswerResult("idle");
          setAssessmentError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load study session.");
        }
      });

    return () => {
      active = false;
    };
  }, [normalizedLanguageCode]);

  const practiceCards = useMemo(
    () => (data ? buildPracticeCards(data, mode, normalizedLanguageCode, initialProgramCode, initialLevelCode, introductionChunkIndex, assessmentAxisKey, introductionShuffleSeed ?? 1) : []),
    [data, mode, normalizedLanguageCode, initialProgramCode, initialLevelCode, introductionChunkIndex, assessmentAxisKey, introductionShuffleSeed],
  );

  const introductionItemCount = useMemo(() => {
    if (!data || mode !== "program") {
      return 0;
    }
    const matchingPrograms = data.study_programs.filter((program) => !normalizedLanguageCode || program.language_code === normalizedLanguageCode);
    const selectedProgram = (initialProgramCode ? matchingPrograms.find((program) => program.program_code === initialProgramCode) : null) ?? matchingPrograms[0] ?? null;
    if (!selectedProgram) {
      return 0;
    }
    const selectedLevel = (initialLevelCode ? selectedProgram.levels.find((level) => level.level_code === initialLevelCode) : null) ?? selectedProgram.levels[0] ?? null;
    return selectedLevel?.items.length ?? 0;
  }, [data, mode, normalizedLanguageCode, initialProgramCode, initialLevelCode]);

  const introductionChunkCount = Math.max(1, Math.ceil(introductionItemCount / INTRODUCTION_CHUNK_SIZE));

  useEffect(() => {
    if (!data) {
      return;
    }
    if (mode !== "program") {
      setIntroductionProgressHydrated(true);
      return;
    }

    const savedProgress = readIntroductionProgress(introductionProgressKey);
    const nextChunkIndex = savedProgress ? Math.min(savedProgress.chunkIndex, introductionChunkCount - 1) : 0;
    const itemsInChunk = Math.min(
      INTRODUCTION_CHUNK_SIZE,
      Math.max(0, introductionItemCount - nextChunkIndex * INTRODUCTION_CHUNK_SIZE),
    );
    const cardsInChunk = Math.max(1, itemsInChunk * INTRODUCTION_AXIS_ORDER.length);
    setIntroductionShuffleSeed(savedProgress?.shuffleSeed ?? createIntroductionShuffleSeed());
    setIntroductionChunkIndex(nextChunkIndex);
    setSelectedIndex(savedProgress ? Math.min(savedProgress.selectedIndex, cardsInChunk - 1) : 0);
    setIntroductionProgressHydrated(true);
  }, [data, mode, introductionProgressKey, introductionChunkCount, introductionItemCount]);

  useEffect(() => {
    if (mode !== "program" || !data || !introductionProgressHydrated || introductionShuffleSeed == null) {
      return;
    }
    writeIntroductionProgress(introductionProgressKey, {
      chunkIndex: introductionChunkIndex,
      selectedIndex,
      shuffleSeed: introductionShuffleSeed,
    });
  }, [mode, data, introductionProgressHydrated, introductionProgressKey, introductionChunkIndex, selectedIndex, introductionShuffleSeed]);

  useEffect(() => {
    if (selectedIndex >= practiceCards.length) {
      setSelectedIndex(0);
      setRevealed(false);
      setAnswerDraft("");
      setAnswerResult("idle");
    }
  }, [practiceCards.length, selectedIndex]);

  const currentCard = practiceCards[selectedIndex] ?? null;

  useEffect(() => {
    setAnswerDraft("");
    setAnswerResult("idle");
    setRevealed(false);
    setAssessmentError(null);
    answerInputRef.current?.focus();
  }, [currentCard?.key]);

  useEffect(() => {
    let active = true;

    if (!currentCard) {
      setLookup(null);
      return () => {
        active = false;
      };
    }

    if (currentCard.meaning && currentCard.pronunciation) {
      setLookup(null);
      return () => {
        active = false;
      };
    }

    setLookup(null);
    void fetchJson<LexiconLookupResponse>(
      `/lexicon/lookup?language_code=${encodeURIComponent(currentCard.lookupLanguageCode)}&term=${encodeURIComponent(currentCard.lookupTerm)}`,
    )
      .then((result) => {
        if (active) {
          setLookup(result);
        }
      })
      .catch(() => {
        if (active) {
          setLookup(null);
        }
      });

    return () => {
      active = false;
    };
  }, [currentCard]);

  const currentLookupEntry = lookup?.entries[0] ?? null;
  const resolvedMeaning = currentCard?.meaning ?? currentLookupEntry?.definition ?? null;
  const resolvedPronunciation = currentCard?.pronunciation ?? currentLookupEntry?.pronunciation ?? currentLookupEntry?.pinyin ?? null;
  const currentPrompt = currentCard ? buildPracticePrompt(currentCard, resolvedMeaning, resolvedPronunciation) : null;

  function resetAttemptState(): void {
    setRevealed(false);
    setAnswerDraft("");
    setAnswerResult("idle");
    setAssessmentError(null);
  }

  async function handleNotSure(): Promise<void> {
    if (!currentCard || revealed || assessmentPending) {
      return;
    }

    setAssessmentPending(true);
    setAssessmentError(null);
    try {
      await postJson<VocabularyAssessmentStateRecord>("/learning/vocabulary-reviews", {
        language_code: currentCard.languageCode,
        lemma: currentCard.lookupTerm,
        axis_key: currentCard.assessmentAxisKey,
        result: "incorrect",
      });
      setRevealed(true);
    } catch {
      setAssessmentError("Could not save this review. Try again.");
    } finally {
      setAssessmentPending(false);
    }
  }

  async function handleAnswerSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!currentCard || !currentPrompt || assessmentPending) {
      return;
    }

    const submittedAnswer = normalizePracticeAnswer(answerDraft);
    const expectedAnswer = normalizePracticeAnswer(currentPrompt.answer ?? "");
    const isCorrect = submittedAnswer.length > 0 && expectedAnswer.length > 0 && submittedAnswer === expectedAnswer;

    setAssessmentPending(true);
    setAssessmentError(null);
    try {
      await postJson<VocabularyAssessmentStateRecord>("/learning/vocabulary-reviews", {
        language_code: currentCard.languageCode,
        lemma: currentCard.lookupTerm,
        axis_key: currentCard.assessmentAxisKey,
        result: isCorrect ? "correct" : "incorrect",
      });
      setAnswerResult(isCorrect ? "correct" : "incorrect");
      setRevealed(true);
    } catch {
      setAssessmentError("Could not save this review. Try again.");
    } finally {
      setAssessmentPending(false);
    }
  }

  const practiceSourceLabel =
    mode === "review"
      ? "Review queue"
      : currentCard
        ? `${currentCard.title} - ${currentCard.sourceLabel}`
        : "Practice session";

  return (
    <RoutePage
      eyebrow="Study"
      title="Vocabulary practice session"
      description="Learn curated vocabulary one term at a time, then step through due items in a drill-style review flow."
      badge={data ? `${practiceCards.length} items` : "Live"}
      links={[{ href: "/study", label: "Study" }]}
      metrics={[
        { label: "Mode", value: mode === "review" ? "Review" : "Program" },
        { label: "Items", value: data ? String(practiceCards.length) : "Loading" },
        { label: "Step", value: practiceCards.length ? `${selectedIndex + 1}/${practiceCards.length}` : "0/0" },
        ...(mode === "program" && introductionItemCount > 0
          ? [{ label: "Introduction chunk", value: `${introductionChunkIndex + 1}/${introductionChunkCount}` }]
          : []),
      ]}
    >
      {error ? <section className="card feature-card">{error}</section> : null}
      {!data && !error ? <section className="card feature-card">Loading practice session...</section> : null}
      {data && mode === "program" && !introductionProgressHydrated ? <section className="card feature-card">Resuming study introduction...</section> : null}
      {data && (mode !== "program" || introductionProgressHydrated) ? (
        <section className="study-practice-shell">
          {currentCard ? (
            <article className="card feature-card study-practice-card" data-inventory-id="study.practice-card">
              <div className="card-topline">
                <div>
                  <span className="eyebrow">{currentCard.languageLabel}</span>
                  <h2>{practiceSourceLabel}</h2>
                </div>
                <span className="pill">{currentCard.progressLabel}</span>
              </div>

              <div className="study-practice-stage">
                <div className="study-practice-stage-topline">
                  <span className="pill">{currentCard.sourceLabel}</span>
                  <span className="pill">{assessmentAxisLabel(currentCard.assessmentAxisKey)}</span>
                </div>

                <p className="eyebrow">{currentPrompt ? currentPrompt.label : "Review prompt"}</p>
                <p className="study-practice-term" lang={currentPrompt?.promptLanguage ?? currentCard.languageCode}>
                  {currentPrompt?.prompt ?? "Prompt unavailable."}
                </p>
                {currentCard.assessmentAxisKey === "form_to_meaning" && resolvedPronunciation ? (
                  <p className="study-practice-pronunciation">({resolvedPronunciation})</p>
                ) : null}
                {revealed ? (
                  <p className="study-practice-meaning" lang={currentPrompt?.answerLanguage ?? "en"}>
                    {currentPrompt?.answer ?? "Answer unavailable."}
                  </p>
                ) : null}

                {answerResult !== "idle" ? (
                  <div
                    className={`study-practice-answer-status ${answerResult === "correct" ? "is-correct" : "is-incorrect"}`}
                    data-inventory-id="study.practice-answer-feedback"
                    role="status"
                    aria-live="polite"
                  >
                    <strong>{answerResult === "correct" ? "Correct" : "Incorrect"}</strong>
                  </div>
                ) : null}

                <form className="study-practice-answer" data-inventory-id="study.practice-answer" onSubmit={handleAnswerSubmit}>
                  <label className="study-practice-answer-label" htmlFor={`study-practice-answer-${currentCard.key}`}>
                    {currentPrompt?.label ?? "Type your answer"}
                  </label>
                  <div className="study-practice-answer-row">
                    <input
                      ref={answerInputRef}
                      id={`study-practice-answer-${currentCard.key}`}
                      className="text-input"
                      data-inventory-id="study.practice-answer-input"
                      value={answerDraft}
                      onChange={(event) => {
                        setAnswerDraft(event.target.value);
                        if (answerResult !== "idle") {
                          setAnswerResult("idle");
                        }
                      }}
                      placeholder={currentPrompt?.placeholder ?? "Your answer"}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div className="study-practice-controls" data-inventory-id="study.practice-navigation">
                    <button
                      type="button"
                      className="button button-secondary study-practice-arrow"
                      onClick={() => {
                        setSelectedIndex((current) => (current - 1 + practiceCards.length) % practiceCards.length);
                        resetAttemptState();
                      }}
                      disabled={practiceCards.length <= 1}
                      aria-label="Previous term"
                      title="Previous term"
                      data-inventory-id="study.practice-previous"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </button>
                    <button type="submit" className="button button-primary study-practice-check" disabled={assessmentPending} data-inventory-id="study.practice-answer-submit">
                      {assessmentPending ? "Saving..." : "Check answer"}
                    </button>
                    <button
                      type="button"
                      className="button button-secondary study-practice-arrow"
                      onClick={() => {
                        if (mode === "program" && selectedIndex === practiceCards.length - 1 && introductionChunkCount > 1) {
                          setIntroductionChunkIndex((current) => (current + 1) % introductionChunkCount);
                          setSelectedIndex(0);
                          resetAttemptState();
                          return;
                        }
                        setSelectedIndex((current) => (current + 1) % practiceCards.length);
                        resetAttemptState();
                      }}
                      disabled={practiceCards.length <= 1 || (!revealed && answerResult === "idle")}
                      aria-label="Next term"
                      title={!revealed && answerResult === "idle" ? "Check your answer before continuing" : mode === "program" && selectedIndex === practiceCards.length - 1 ? "Next introduction chunk" : "Next review"}
                      data-inventory-id="study.practice-next"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                </form>

                {revealed ? (
                  <div className="study-practice-meta">
                    {currentCard.detailRows.map((row) => (
                      <div key={`${currentCard.key}-${row.label}`}>
                        <span className="eyebrow">{row.label}</span>
                        <strong>{row.value}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                className="button button-secondary study-practice-not-sure"
                onClick={() => void handleNotSure()}
                disabled={revealed || assessmentPending}
                aria-label="Show the answer when you are not sure"
                data-inventory-id="study.practice-not-sure"
              >
                {assessmentPending ? "Saving..." : "Not sure?"}
              </button>
              {assessmentError ? <p className="small-copy" role="alert">{assessmentError}</p> : null}
            </article>
          ) : (
            <section className="card feature-card">
              <h2>No practice items available</h2>
              <p className="small-copy">
                This selection does not have any cards yet. Go back to Study or choose a different language, program, or review source.
              </p>
              <div className="button-row">
                <Link className="button button-secondary" href="/study">
                  Back to study
                </Link>
              </div>
            </section>
          )}
        </section>
      ) : null}
    </RoutePage>
  );
}
