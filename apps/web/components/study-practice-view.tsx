"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { languageDisplayLabel } from "../lib/language-options";
import { composeJapaneseRomaji, composeJapaneseRomajiInput } from "../lib/japanese-romaji";
import { StudyPronunciationGuide } from "./study-pronunciation-guide";

type PracticeMode = "program" | "review" | "glossed" | "both";
type PracticeCardSource = "program" | "review" | "glossed";

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

type AnswerResult = "idle" | "correct" | "incorrect" | "wrong_axis" | "retry";
type PracticeCardPhase = "intro" | "assessment";

type PracticeCardAttemptState = {
  answerDraft: string;
  answerResult: AnswerResult;
  revealed: boolean;
  assessmentError: string | null;
};

const INTRODUCTION_CHUNK_SIZE = 5;
const CORRECT_AUTO_ADVANCE_DELAY_MS = 1800;
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
  kind: PracticeCardSource;
  phase: PracticeCardPhase;
  languageCode: string;
  languageLabel: string;
  term: string;
  pronunciation: string | null;
  romanization: string | null;
  meaning: string | null;
  sourceLabel: string;
  title: string;
  subtitle: string;
  progressLabel: string;
  detailRows: PracticeDetailRow[];
  lookupLanguageCode: string;
  lookupTerm: string;
  assessmentAxisKey: VocabularyAssessmentAxisKey | null;
};

type PracticeProgramSelection = {
  selectedProgram: StudySurfaceResponse["study_programs"][number] | null;
  selectedLevel: StudySurfaceResponse["study_programs"][number]["levels"][number] | null;
  chunkItems: StudySurfaceResponse["study_programs"][number]["levels"][number]["items"];
};

type PracticeGlossedSelection = {
  selectedGroup: StudySurfaceResponse["study_groups"][number] | null;
  chunkItems: StudySurfaceResponse["study_groups"][number]["items"];
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
  return languageDisplayLabel(languageCode);
}

function practiceModeLabel(mode: PracticeMode): string {
  switch (mode) {
    case "review":
      return "Review";
    case "glossed":
      return "Glossed";
    case "both":
      return "Combined study";
    default:
      return "Program";
  }
}

function normalizePracticeAnswer(value: string, languageCode?: string | null): string {
  const languageRoot = languageCode?.trim().toLowerCase().split(/[-_]/)[0] ?? "";
  const normalizedValue = value
    .normalize("NFKC")
    .toLowerCase();
  const languageAwareValue = languageRoot === "ja"
    ? normalizedValue.normalize("NFKD").replace(/\u0304/g, "").normalize("NFKC")
    : normalizedValue;

  return languageAwareValue
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const RETRY_SIMILARITY_THRESHOLD = 0.75;

function levenshteinDistance(left: string, right: string): number {
  const leftCharacters = Array.from(left);
  const rightCharacters = Array.from(right);

  if (leftCharacters.length === 0) {
    return rightCharacters.length;
  }
  if (rightCharacters.length === 0) {
    return leftCharacters.length;
  }

  let previousRow = Array.from({ length: rightCharacters.length + 1 }, (_, index) => index);
  for (let leftIndex = 0; leftIndex < leftCharacters.length; leftIndex += 1) {
    const currentRow = [leftIndex + 1];
    for (let rightIndex = 0; rightIndex < rightCharacters.length; rightIndex += 1) {
      const substitutionCost = leftCharacters[leftIndex] === rightCharacters[rightIndex] ? 0 : 1;
      currentRow[rightIndex + 1] = Math.min(
        currentRow[rightIndex] + 1,
        previousRow[rightIndex + 1] + 1,
        previousRow[rightIndex] + substitutionCost,
      );
    }
    previousRow = currentRow;
  }

  return previousRow[rightCharacters.length] ?? 0;
}

function answerSimilarityRatio(submittedAnswer: string, expectedAnswer: string, languageCode?: string | null): number {
  const normalizedSubmittedAnswer = normalizePracticeAnswer(submittedAnswer, languageCode);
  const normalizedExpectedAnswer = normalizePracticeAnswer(expectedAnswer, languageCode);
  if (!normalizedSubmittedAnswer.length || !normalizedExpectedAnswer.length) {
    return 0;
  }
  if (normalizedSubmittedAnswer === normalizedExpectedAnswer) {
    return 1;
  }

  const distance = levenshteinDistance(normalizedSubmittedAnswer, normalizedExpectedAnswer);
  const longestLength = Math.max(Array.from(normalizedSubmittedAnswer).length, Array.from(normalizedExpectedAnswer).length);
  return longestLength <= 0 ? 0 : Math.max(0, 1 - distance / longestLength);
}

function classifyPracticeResult(
  submittedAnswer: string,
  expectedAnswer: string | null,
  promptText: string | null,
  alternateAnswers: Array<string | null>,
  languageCode?: string | null,
  japaneseCompositionEnabled = false,
): AnswerResult {
  const normalizedSubmittedAnswer = normalizePracticeAnswer(submittedAnswer, languageCode);
  const normalizedExpectedAnswer = normalizePracticeAnswer(expectedAnswer ?? "", languageCode);
  const normalizedPromptText = normalizePracticeAnswer(promptText ?? "", languageCode);
  if (normalizedSubmittedAnswer.length > 0 && normalizedExpectedAnswer.length > 0 && normalizedSubmittedAnswer === normalizedExpectedAnswer) {
    return "correct";
  }

  if (japaneseCompositionEnabled) {
    const composedSubmittedAnswer = normalizePracticeAnswer(composeJapaneseRomaji(submittedAnswer), languageCode);
    const composedExpectedAnswer = normalizePracticeAnswer(composeJapaneseRomaji(expectedAnswer ?? ""), languageCode);
    if (composedSubmittedAnswer.length > 0 && composedExpectedAnswer.length > 0 && composedSubmittedAnswer === composedExpectedAnswer) {
      return "correct";
    }
  }

  const wrongAxisMatches = alternateAnswers
    .map((candidate) => normalizePracticeAnswer(candidate ?? "", languageCode))
    .filter((candidate) => candidate.length > 0)
    .filter((candidate) => candidate !== normalizedExpectedAnswer)
    .filter((candidate) => candidate !== normalizedPromptText);

  if (wrongAxisMatches.includes(normalizedSubmittedAnswer)) {
    return "wrong_axis";
  }

  if (answerSimilarityRatio(normalizedSubmittedAnswer, normalizedExpectedAnswer, languageCode) >= RETRY_SIMILARITY_THRESHOLD) {
    return "retry";
  }

  return "incorrect";
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

function selectPracticeProgramLevel(
  data: StudySurfaceResponse,
  languageCode: string | null,
  programCode: string | null,
  levelCode: string | null,
  chunkIndex: number,
): PracticeProgramSelection {
  const selectedProgram =
    (programCode ? data.study_programs.find((program) => program.program_code === programCode) : null) ??
    data.study_programs.find((program) => !languageCode || program.language_code === languageCode) ??
    null;
  if (!selectedProgram) {
    return {
      selectedProgram: null,
      selectedLevel: null,
      chunkItems: [],
    };
  }

  const selectedLevels = levelCode ? selectedProgram.levels.filter((level) => level.level_code === levelCode) : selectedProgram.levels.slice(0, 1);
  const selectedLevel = (selectedLevels.length ? selectedLevels : selectedProgram.levels.slice(0, 1))[0] ?? null;
  if (!selectedLevel) {
    return {
      selectedProgram,
      selectedLevel: null,
      chunkItems: [],
    };
  }

  return {
    selectedProgram,
    selectedLevel,
    chunkItems: selectedLevel.items.slice(
      chunkIndex * INTRODUCTION_CHUNK_SIZE,
      (chunkIndex + 1) * INTRODUCTION_CHUNK_SIZE,
    ),
  };
}

function selectPracticeGlossedGroup(data: StudySurfaceResponse, languageCode: string | null, chunkIndex: number): PracticeGlossedSelection {
  const matchingGroups = data.study_groups.filter((group) => !languageCode || group.language_code === languageCode);
  const selectedGroup = matchingGroups[0] ?? null;
  if (!selectedGroup) {
    return {
      selectedGroup: null,
      chunkItems: [],
    };
  }

  return {
    selectedGroup,
    chunkItems: selectedGroup.items.slice(
      chunkIndex * INTRODUCTION_CHUNK_SIZE,
      (chunkIndex + 1) * INTRODUCTION_CHUNK_SIZE,
    ),
  };
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

function assessmentDirectionLabel(axisKey: VocabularyAssessmentAxisKey): string {
  switch (axisKey) {
    case "form_to_reading":
      return "Word → reading";
    case "meaning_to_form":
      return "Meaning → word";
    case "reading_to_form":
      return "Reading → word";
    default:
      return "Word → meaning";
  }
}

type PracticePrompt = {
  prompt: string | null;
  promptLanguage: string;
  answer: string | null;
  answerLanguage: string;
  placeholder: string;
  inputLanguage: string;
};

function buildPracticePrompt(
  card: PracticeCard,
  meaning: string | null,
  pronunciation: string | null,
): PracticePrompt {
  const sourceTermLabel = `Type the ${card.languageLabel} term`;
  const isJapanese = normalizeLanguageCode(card.languageCode) === "ja";
  switch (card.assessmentAxisKey) {
    case "form_to_reading":
      return {
        prompt: card.term,
        promptLanguage: card.languageCode,
        answer: pronunciation,
        answerLanguage: "en",
        placeholder: isJapanese ? "Type the reading (romaji or hiragana)" : "Type the romanization",
        inputLanguage: isJapanese ? card.languageCode : "en",
      };
    case "meaning_to_form":
      return {
        prompt: meaning,
        promptLanguage: "en",
        answer: card.term,
        answerLanguage: card.languageCode,
        placeholder: sourceTermLabel,
        inputLanguage: card.languageCode,
      };
    case "reading_to_form":
      return {
        prompt: pronunciation,
        promptLanguage: "en",
        answer: card.term,
        answerLanguage: card.languageCode,
        placeholder: sourceTermLabel,
        inputLanguage: card.languageCode,
      };
    default:
      return {
        prompt: card.term,
        promptLanguage: card.languageCode,
        answer: meaning,
        answerLanguage: "en",
        placeholder: "Type the English meaning",
        inputLanguage: "en",
      };
  }
}

function createDefaultPracticeAttemptState(): PracticeCardAttemptState {
  return {
    answerDraft: "",
    answerResult: "idle",
    revealed: false,
    assessmentError: null,
  };
}

function buildProgramCards(
  data: StudySurfaceResponse,
  languageCode: string | null,
  programCode: string | null,
  levelCode: string | null,
  chunkIndex: number,
  shuffleSeed: number,
): PracticeCard[] {
  const selection = selectPracticeProgramLevel(data, languageCode, programCode, levelCode, chunkIndex);
  if (!selection.selectedProgram || !selection.selectedLevel) {
    return [];
  }

  const { selectedProgram, selectedLevel, chunkItems } = selection;
  const introCards = chunkItems.map((item, itemIndex) => ({
    key: `${selectedProgram.program_code}:${selectedLevel.level_code}:${item.lemma}:intro:${itemIndex}`,
    kind: "program" as const,
    phase: "intro" as const,
    languageCode: item.language_code,
    languageLabel: item.language_label,
    term: item.display_form,
    pronunciation: item.pronunciation ?? null,
    romanization: item.pronunciation ?? null,
    meaning: item.definition_short ?? null,
    sourceLabel: `${selectedProgram.program_source_label} - ${selectedLevel.level_label}`,
    title: selectedProgram.program_label,
    subtitle: selectedLevel.introduction_note,
    progressLabel: `Word ${itemIndex + 1}/${chunkItems.length}`,
    detailRows: [
      { label: "Level", value: selectedLevel.level_label },
      { label: "Chunk", value: `${itemIndex + 1}/${chunkItems.length}` },
      { label: "Frequency", value: item.frequency_rank != null ? `#${item.frequency_rank}` : "-" },
      { label: "Saved", value: String(item.saved_count) },
      { label: "Confidence", value: item.confidence_score != null ? item.confidence_score.toFixed(2) : "-" },
    ],
    lookupLanguageCode: item.language_code,
    lookupTerm: item.lemma,
    assessmentAxisKey: null,
  }));

  const assessmentCards = shuffleWithSeed(
    chunkItems.flatMap((item, itemIndex) =>
      INTRODUCTION_AXIS_ORDER.map((assessmentAxisKey, axisIndex) => ({
        key: `${selectedProgram.program_code}:${selectedLevel.level_code}:${item.lemma}:${itemIndex}:${axisIndex}`,
        kind: "program" as const,
        phase: "assessment" as const,
        languageCode: item.language_code,
        languageLabel: item.language_label,
        term: item.display_form,
        pronunciation: item.pronunciation ?? null,
        romanization: item.pronunciation ?? null,
        meaning: item.definition_short ?? null,
        sourceLabel: `${selectedProgram.program_source_label} - ${selectedLevel.level_label}`,
        title: selectedProgram.program_label,
        subtitle: selectedLevel.introduction_note,
        progressLabel: assessmentDirectionLabel(assessmentAxisKey),
        detailRows: [
          { label: "Level", value: selectedLevel.level_label },
          { label: "Practice direction", value: assessmentDirectionLabel(assessmentAxisKey) },
          { label: "Frequency", value: item.frequency_rank != null ? `#${item.frequency_rank}` : "-" },
          { label: "Saved", value: String(item.saved_count) },
          { label: "Confidence", value: item.confidence_score != null ? item.confidence_score.toFixed(2) : "-" },
        ],
        lookupLanguageCode: item.language_code,
        lookupTerm: item.lemma,
        assessmentAxisKey,
      })),
    ),
    shuffleSeed,
  );

  return [...introCards, ...assessmentCards];
}

function buildGlossedCards(
  data: StudySurfaceResponse,
  languageCode: string | null,
  chunkIndex: number,
  shuffleSeed: number,
): PracticeCard[] {
  const selection = selectPracticeGlossedGroup(data, languageCode, chunkIndex);
  if (!selection.selectedGroup) {
    return [];
  }

  const { selectedGroup, chunkItems } = selection;
  const introCards = chunkItems.map((item, itemIndex) => ({
    key: `${selectedGroup.language_code}:${item.lemma}:intro:${itemIndex}`,
    kind: "glossed" as const,
    phase: "intro" as const,
    languageCode: item.language_code,
    languageLabel: item.language_label,
    term: item.display_form,
    pronunciation: item.pronunciation ?? item.romanization ?? null,
    romanization: item.romanization ?? item.pronunciation ?? null,
    meaning: item.definition_short ?? null,
    sourceLabel: "Glossed vocabulary",
    title: "Glossed vocabulary study",
    subtitle: "Words saved from reading get one introduction before stage 0 practice.",
    progressLabel: `Word ${itemIndex + 1}/${chunkItems.length}`,
    detailRows: [
      { label: "Language", value: item.language_label },
      { label: "Chunk", value: `${itemIndex + 1}/${chunkItems.length}` },
      { label: "Book", value: item.source_book_title ?? item.source_book_id },
      { label: "Page", value: String(item.source_page_number) },
      { label: "Sentence", value: String(item.source_sentence_order) },
      { label: "Token", value: String(item.source_token_order) },
    ],
    lookupLanguageCode: item.language_code,
    lookupTerm: item.lemma,
    assessmentAxisKey: null,
  }));

  const assessmentCards = shuffleWithSeed(
    chunkItems.flatMap((item, itemIndex) =>
      INTRODUCTION_AXIS_ORDER.map((assessmentAxisKey, axisIndex) => ({
        key: `${selectedGroup.language_code}:${item.lemma}:${itemIndex}:${axisIndex}`,
        kind: "glossed" as const,
        phase: "assessment" as const,
        languageCode: item.language_code,
        languageLabel: item.language_label,
        term: item.display_form,
        pronunciation: item.pronunciation ?? item.romanization ?? null,
        romanization: item.romanization ?? item.pronunciation ?? null,
        meaning: item.definition_short ?? null,
        sourceLabel: item.source_book_title ?? item.source_book_id,
        title: "Glossed vocabulary study",
        subtitle: "Words saved from reading get one introduction before stage 0 practice.",
        progressLabel: assessmentDirectionLabel(assessmentAxisKey),
        detailRows: [
          { label: "Book", value: item.source_book_title ?? item.source_book_id },
          { label: "Page", value: String(item.source_page_number) },
          { label: "Sentence", value: String(item.source_sentence_order) },
          { label: "Token", value: String(item.source_token_order) },
          { label: "Click count", value: String(item.click_count) },
        ],
        lookupLanguageCode: item.language_code,
        lookupTerm: item.lemma,
        assessmentAxisKey,
      })),
    ),
    shuffleSeed,
  );

  return [...introCards, ...assessmentCards];
}

function buildReviewCards(data: StudySurfaceResponse, languageCode: string | null, assessmentAxisKey: VocabularyAssessmentAxisKey): PracticeCard[] {
  const queuedItems = data.queued_items.filter((item) => !languageCode || item.language_code === languageCode);
  if (queuedItems.length > 0) {
    return queuedItems.map((item, index) => ({
      key: `${item.language_code}:queue:${item.lemma}:${index}`,
      kind: "review" as const,
      phase: "assessment" as const,
      languageCode: item.language_code,
      languageLabel: languageLabel(item.language_code),
      term: item.lemma,
      pronunciation: null,
      romanization: null,
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
        phase: "assessment" as const,
        languageCode: item.language_code,
        languageLabel: item.language_label,
        term: item.display_form,
        pronunciation: item.pronunciation ?? item.romanization ?? null,
        romanization: item.romanization ?? item.pronunciation ?? null,
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
  if (mode === "review") {
    return buildReviewCards(data, languageCode, assessmentAxisKey);
  }

  const programCards =
    mode === "program" || mode === "both"
      ? buildProgramCards(data, languageCode, programCode, levelCode, chunkIndex, shuffleSeed)
      : [];
  const glossedCards =
    mode === "glossed" || mode === "both"
      ? buildGlossedCards(data, languageCode, chunkIndex, shuffleSeed)
      : [];

  return [...programCards, ...glossedCards];
}

export function StudyPracticeView({
  initialMode = "program",
  initialLanguageCode = null,
  initialProgramCode = null,
  initialLevelCode = null,
  initialAssessmentAxisKey = null,
}: StudyPracticeViewProps) {
  const routeSearchParams = useSearchParams();
  const [data, setData] = useState<StudySurfaceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [introductionChunkIndex, setIntroductionChunkIndex] = useState(0);
  const [introductionShuffleSeed, setIntroductionShuffleSeed] = useState<number | null>(null);
  const [introductionProgressHydrated, setIntroductionProgressHydrated] = useState(initialMode !== "program");
  const [attemptsByCardKey, setAttemptsByCardKey] = useState<Record<string, PracticeCardAttemptState>>({});
  const [assessmentPending, setAssessmentPending] = useState(false);
  const [autoAdvanceRemainingMs, setAutoAdvanceRemainingMs] = useState<number | null>(null);
  const [autoAdvanceCancelledCardKey, setAutoAdvanceCancelledCardKey] = useState<string | null>(null);
  const [lookup, setLookup] = useState<LexiconLookupResponse | null>(null);
  const answerInputRef = useRef<HTMLInputElement>(null);
  const pendingAnswerSelectionRef = useRef<{ start: number; end: number } | null>(null);

  const routeModeValue = routeSearchParams.get("mode");
  const routeMode = routeModeValue === "review" || routeModeValue === "glossed" || routeModeValue === "both" ? routeModeValue : null;
  const routeLanguageCode = routeSearchParams.get("language_code") ?? routeSearchParams.get("language");
  const routeProgramCode = routeSearchParams.get("program_code") ?? routeSearchParams.get("program");
  const routeLevelCode = routeSearchParams.get("level_code") ?? routeSearchParams.get("level");
  const routeAssessmentAxisKey = routeSearchParams.get("axis_key");

  const effectiveMode = routeMode ?? initialMode;
  const effectiveLanguageCode = routeLanguageCode ?? initialLanguageCode;
  const effectiveProgramCode = routeProgramCode ?? initialProgramCode;
  const effectiveLevelCode = routeLevelCode ?? initialLevelCode;
  const effectiveAssessmentAxisKey = routeAssessmentAxisKey ?? initialAssessmentAxisKey;

  const normalizedLanguageCode = normalizeLanguageCode(effectiveLanguageCode);
  const assessmentAxisKey = normalizeAssessmentAxisKey(effectiveAssessmentAxisKey);
  const mode = effectiveMode;
  const introductionProgressKey = introductionProgressStorageKey(mode, normalizedLanguageCode, effectiveProgramCode, effectiveLevelCode);

  useEffect(() => {
    let active = true;
    const path = normalizedLanguageCode ? `/study?language_code=${encodeURIComponent(normalizedLanguageCode)}` : "/study";

    void fetchJson<StudySurfaceResponse>(path)
      .then((result) => {
        if (active) {
          setData(result);
          setSelectedIndex(0);
          setIntroductionChunkIndex(0);
          setAttemptsByCardKey({});
          setAutoAdvanceCancelledCardKey(null);
          setAutoAdvanceRemainingMs(null);
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
    () => (data ? buildPracticeCards(data, mode, normalizedLanguageCode, effectiveProgramCode, effectiveLevelCode, introductionChunkIndex, assessmentAxisKey, introductionShuffleSeed ?? 1) : []),
    [data, mode, normalizedLanguageCode, effectiveProgramCode, effectiveLevelCode, introductionChunkIndex, assessmentAxisKey, introductionShuffleSeed],
  );

  const programIntroductionItemCount = useMemo(() => {
    if (!data) {
      return 0;
    }
    const selection = selectPracticeProgramLevel(data, normalizedLanguageCode, effectiveProgramCode, effectiveLevelCode, 0);
    if (!selection.selectedProgram || !selection.selectedLevel) {
      return 0;
    }
    return selection.selectedLevel.items.length ?? 0;
  }, [data, normalizedLanguageCode, effectiveProgramCode, effectiveLevelCode]);

  const glossedIntroductionItemCount = useMemo(() => {
    if (!data) {
      return 0;
    }
    const selection = selectPracticeGlossedGroup(data, normalizedLanguageCode, 0);
    if (!selection.selectedGroup) {
      return 0;
    }
    return selection.selectedGroup.items.length ?? 0;
  }, [data, normalizedLanguageCode]);

  const introductionItemCount = mode === "glossed" ? glossedIntroductionItemCount : programIntroductionItemCount;
  const introductionChunkCount = Math.max(1, Math.ceil(introductionItemCount / INTRODUCTION_CHUNK_SIZE));
  const glossedChunkCount = Math.max(1, Math.ceil(glossedIntroductionItemCount / INTRODUCTION_CHUNK_SIZE));
  const practiceChunkCount = mode === "both" ? Math.max(introductionChunkCount, glossedChunkCount) : mode === "glossed" ? glossedChunkCount : introductionChunkCount;

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
    const cardsInChunk = Math.max(1, itemsInChunk * (INTRODUCTION_AXIS_ORDER.length + 1));
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
    }
  }, [practiceCards.length, selectedIndex]);

  const currentCard = practiceCards[selectedIndex] ?? null;
  const currentAttempt = currentCard ? attemptsByCardKey[currentCard.key] ?? createDefaultPracticeAttemptState() : createDefaultPracticeAttemptState();

  useEffect(() => {
    if (currentCard?.phase === "assessment") {
      answerInputRef.current?.focus();
    }
  }, [currentCard?.key, currentCard?.phase]);

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
  const resolvedSyllableText = currentCard?.romanization ?? currentLookupEntry?.pinyin ?? currentLookupEntry?.pronunciation ?? resolvedPronunciation;
  const currentPrompt = currentCard && currentCard.phase === "assessment" ? buildPracticePrompt(currentCard, resolvedMeaning, resolvedPronunciation) : null;
  const showPronunciationGuide = Boolean(currentCard && currentCard.phase === "intro" && resolvedPronunciation);
  const introAdvanceCard = currentCard?.phase === "intro" ? practiceCards[selectedIndex + 1] ?? null : null;
  const japaneseCompositionEnabled = Boolean(currentPrompt && normalizeLanguageCode(currentPrompt.inputLanguage) === "ja");

  function advanceToNextPracticeCard(): void {
    if (mode !== "review" && selectedIndex === practiceCards.length - 1 && practiceChunkCount > 1) {
      setIntroductionChunkIndex((current) => (current + 1) % practiceChunkCount);
      setSelectedIndex(0);
      return;
    }
    setSelectedIndex((current) => (current + 1) % practiceCards.length);
  }

  useEffect(() => {
    const pendingSelection = pendingAnswerSelectionRef.current;
    if (!pendingSelection || !currentCard || currentCard.phase !== "assessment") {
      return;
    }
    const input = answerInputRef.current;
    if (input) {
      input.setSelectionRange(pendingSelection.start, pendingSelection.end);
    }
    pendingAnswerSelectionRef.current = null;
  }, [currentAttempt.answerDraft, currentCard, currentCard?.key]);

  useEffect(() => {
    setAutoAdvanceRemainingMs(null);
    if (
      !currentCard ||
      currentCard.phase !== "assessment" ||
      currentAttempt.answerResult !== "correct" ||
      autoAdvanceCancelledCardKey === currentCard.key
    ) {
      return;
    }

    const deadline = Date.now() + CORRECT_AUTO_ADVANCE_DELAY_MS;
    setAutoAdvanceRemainingMs(CORRECT_AUTO_ADVANCE_DELAY_MS);
    const intervalId = window.setInterval(() => {
      setAutoAdvanceRemainingMs(Math.max(0, deadline - Date.now()));
    }, 100);
    const timeoutId = window.setTimeout(() => {
      setAutoAdvanceRemainingMs(null);
      if (mode !== "review" && selectedIndex === practiceCards.length - 1 && practiceChunkCount > 1) {
        setIntroductionChunkIndex((current) => (current + 1) % practiceChunkCount);
        setSelectedIndex(0);
        return;
      }
      setSelectedIndex((current) => (current + 1) % practiceCards.length);
    }, CORRECT_AUTO_ADVANCE_DELAY_MS);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [
    autoAdvanceCancelledCardKey,
    currentAttempt.answerResult,
    currentCard,
    currentCard?.key,
    mode,
    practiceCards.length,
    practiceChunkCount,
    selectedIndex,
  ]);

  function cancelAutoAdvance(): void {
    if (!currentCard) {
      return;
    }
    setAutoAdvanceCancelledCardKey(currentCard.key);
    setAutoAdvanceRemainingMs(null);
  }

  function updateCurrentAttempt(updater: (current: PracticeCardAttemptState) => PracticeCardAttemptState): void {
    if (!currentCard) {
      return;
    }

    setAttemptsByCardKey((current) => {
      const previous = current[currentCard.key] ?? createDefaultPracticeAttemptState();
      const next = updater(previous);
      if (
        previous.answerDraft === next.answerDraft &&
        previous.answerResult === next.answerResult &&
        previous.revealed === next.revealed &&
        previous.assessmentError === next.assessmentError
      ) {
        return current;
      }
      return {
        ...current,
        [currentCard.key]: next,
      };
    });
  }

  async function handleNotSure(): Promise<void> {
    if (!currentCard || currentCard.phase !== "assessment" || !currentCard.assessmentAxisKey || currentAttempt.revealed || assessmentPending) {
      return;
    }

    setAssessmentPending(true);
    updateCurrentAttempt((current) => ({ ...current, assessmentError: null }));
    try {
      await postJson<VocabularyAssessmentStateRecord>("/learning/vocabulary-reviews", {
        language_code: currentCard.languageCode,
        lemma: currentCard.lookupTerm,
        axis_key: currentCard.assessmentAxisKey,
        result: "incorrect",
      });
      updateCurrentAttempt((current) => ({
        ...current,
        answerResult: "incorrect",
        revealed: true,
        assessmentError: null,
      }));
    } catch {
      updateCurrentAttempt((current) => ({ ...current, assessmentError: "Could not save this review. Try again." }));
    } finally {
      setAssessmentPending(false);
    }
  }

  async function handleAnswerSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!currentCard || currentCard.phase !== "assessment" || !currentCard.assessmentAxisKey || !currentPrompt || assessmentPending) {
      return;
    }

    const answerResult = classifyPracticeResult(
      currentAttempt.answerDraft,
      currentPrompt.answer,
      currentPrompt.prompt,
      [currentCard.term, resolvedMeaning, resolvedPronunciation],
      currentCard.languageCode,
      japaneseCompositionEnabled,
    );

    setAssessmentPending(true);
    updateCurrentAttempt((current) => ({ ...current, assessmentError: null }));
    try {
      await postJson<VocabularyAssessmentStateRecord>("/learning/vocabulary-reviews", {
        language_code: currentCard.languageCode,
        lemma: currentCard.lookupTerm,
        axis_key: currentCard.assessmentAxisKey,
        result: answerResult,
      });
      updateCurrentAttempt((current) => ({
        ...current,
        answerResult,
        revealed: answerResult === "correct" || answerResult === "incorrect",
        answerDraft: answerResult === "wrong_axis" || answerResult === "retry" ? "" : current.answerDraft,
        assessmentError: null,
      }));
    } catch {
      updateCurrentAttempt((current) => ({ ...current, assessmentError: "Could not save this review. Try again." }));
    } finally {
      setAssessmentPending(false);
    }
  }

  const practiceSourceLabel =
    mode === "review"
      ? "Review queue"
      : mode === "both"
        ? "Combined study"
      : currentCard
        ? currentCard.title
        : "Practice session";
  const practiceModeText = practiceModeLabel(mode);

  return (
    <RoutePage
      eyebrow="Study"
      title="Vocabulary practice session"
      description="Learn curated vocabulary one term at a time, then step through due items in a drill-style review flow."
      badge={data ? `${practiceCards.length} items` : "Live"}
      links={[{ href: "/study", label: "Study" }]}
      metrics={[
        { label: "Mode", value: practiceModeText },
        { label: "Items", value: data ? String(practiceCards.length) : "Loading" },
        { label: "Step", value: practiceCards.length ? `${selectedIndex + 1}/${practiceCards.length}` : "0/0" },
        ...(mode === "program" && programIntroductionItemCount > 0
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
                  <span className="pill">{currentCard.phase === "assessment" ? assessmentDirectionLabel(currentCard.assessmentAxisKey ?? "form_to_meaning") : "Introduction"}</span>
                </div>

                <p className="study-practice-term" lang={currentPrompt?.promptLanguage ?? currentCard.languageCode}>
                  {currentCard.phase === "intro" ? currentCard.term : currentPrompt?.prompt ?? "Prompt unavailable."}
                </p>
                {currentCard.phase === "intro" && currentCard.meaning ? (
                  <div className="study-practice-intro-meaning">
                    <span className="eyebrow">Meaning</span>
                    <p className="study-practice-meaning" lang="en">
                      {currentCard.meaning}
                    </p>
                  </div>
                ) : null}
                {showPronunciationGuide ? (
                  <StudyPronunciationGuide
                    languageCode={currentCard.languageCode}
                    pronunciationText={resolvedPronunciation}
                    syllableText={resolvedSyllableText}
                    audioText={currentCard.term}
                    inventoryId="study.practice-pronunciation-guide"
                  />
                ) : null}
                {currentCard.phase === "intro" ? (
                  <p className="study-practice-intro-copy">
                    Learn this word before we move into the mixed practice directions for this chunk.
                  </p>
                ) : currentAttempt.revealed && currentAttempt.answerResult !== "correct" ? (
                  <p
                    className={`study-practice-meaning ${
                      currentAttempt.answerResult === "incorrect"
                        ? "is-incorrect"
                        : currentAttempt.answerResult === "wrong_axis"
                          ? "is-wrong-axis"
                          : ""
                    }`}
                    lang={currentPrompt?.answerLanguage ?? "en"}
                  >
                    {currentPrompt?.answer ?? "Answer unavailable."}
                  </p>
                ) : null}

                {currentCard.phase === "assessment" && currentAttempt.answerResult !== "idle" ? (
                  <div
                    className={`study-practice-answer-status ${
                      currentAttempt.answerResult === "correct"
                        ? "is-correct"
                        : currentAttempt.answerResult === "retry"
                          ? "is-retry"
                        : currentAttempt.answerResult === "wrong_axis"
                          ? "is-wrong-axis"
                          : "is-incorrect"
                    }`}
                    data-inventory-id="study.practice-answer-feedback"
                    role="status"
                    aria-live="polite"
                  >
                    <strong>
                      {currentAttempt.answerResult === "correct"
                        ? "Correct"
                        : currentAttempt.answerResult === "retry"
                          ? "Try again"
                          : currentAttempt.answerResult === "wrong_axis"
                            ? "That answer matches a different direction"
                            : "Incorrect"}
                    </strong>
                    {currentAttempt.answerResult === "correct" ? (
                      <div className="study-practice-auto-advance" data-inventory-id="study.practice-auto-advance">
                        {autoAdvanceRemainingMs !== null ? (
                          <>
                            <span>
                              Next card in <strong>{Math.max(0.1, autoAdvanceRemainingMs / 1000).toFixed(1)}s</strong>
                            </span>
                            <button
                              type="button"
                              className="button button-secondary study-practice-auto-advance-cancel"
                              onClick={cancelAutoAdvance}
                              data-inventory-id="study.practice-auto-advance-cancel"
                            >
                              Stay on this card
                            </button>
                          </>
                        ) : (
                          <span>Auto-advance paused. Use Next term when you are ready.</span>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {currentCard.phase === "assessment" ? (
                  <form className="study-practice-answer" data-inventory-id="study.practice-answer" onSubmit={handleAnswerSubmit}>
                    <div className="study-practice-answer-row">
                      <input
                        ref={answerInputRef}
                        key={currentCard.key}
                        id={`study-practice-answer-${currentCard.key}`}
                        className="text-input"
                        data-inventory-id="study.practice-answer-input"
                        value={currentAttempt.answerDraft}
                        lang={currentPrompt?.inputLanguage ?? currentCard.languageCode}
                        inputMode="text"
                        autoCapitalize="off"
                        autoCorrect="off"
                        disabled={assessmentPending || currentAttempt.answerResult === "correct"}
                        aria-label={currentPrompt?.placeholder ?? "Your answer"}
                        onChange={(event) => {
                          const composedInput = japaneseCompositionEnabled
                            ? composeJapaneseRomajiInput(
                                event.target.value,
                                event.target.selectionStart ?? event.target.value.length,
                                event.target.selectionEnd ?? event.target.value.length,
                              )
                            : {
                                value: event.target.value,
                                selectionStart: event.target.selectionStart ?? event.target.value.length,
                                selectionEnd: event.target.selectionEnd ?? event.target.value.length,
                              };
                          if (japaneseCompositionEnabled) {
                            pendingAnswerSelectionRef.current = {
                              start: composedInput.selectionStart,
                              end: composedInput.selectionEnd,
                            };
                          }
                          updateCurrentAttempt((current) => ({
                            ...current,
                            answerDraft: composedInput.value,
                            answerResult:
                              current.answerResult === "wrong_axis" || current.answerResult === "retry"
                                ? "idle"
                                : current.answerResult,
                          }));
                        }}
                        placeholder={currentPrompt?.placeholder ?? "Your answer"}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                    {japaneseCompositionEnabled ? (
                      <div className="study-practice-input-composition" data-inventory-id="study.practice-input-composition" aria-live="polite">
                        <div>
                          <span className="eyebrow">Japanese input</span>
                          <span className="small-copy">Romaji composes to hiragana as you type. Direct kana remains supported.</span>
                        </div>
                        <strong lang="ja">{currentAttempt.answerDraft || "—"}</strong>
                      </div>
                    ) : null}
                    <div className="study-practice-controls" data-inventory-id="study.practice-navigation">
                      <button
                        type="button"
                        className="button button-secondary study-practice-arrow"
                        onClick={() => {
                          setSelectedIndex((current) => (current - 1 + practiceCards.length) % practiceCards.length);
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
                        onClick={advanceToNextPracticeCard}
                        disabled={
                          practiceCards.length <= 1 ||
                          (!currentAttempt.revealed &&
                            (currentAttempt.answerResult === "idle" ||
                              currentAttempt.answerResult === "wrong_axis" ||
                              currentAttempt.answerResult === "retry"))
                        }
                        aria-label="Next term"
                        title={
                          !currentAttempt.revealed &&
                          (currentAttempt.answerResult === "idle" ||
                            currentAttempt.answerResult === "wrong_axis" ||
                            currentAttempt.answerResult === "retry")
                            ? "Check your answer before continuing"
                            : mode !== "review" && selectedIndex === practiceCards.length - 1 && practiceChunkCount > 1
                              ? "Next practice chunk"
                              : "Next review"
                        }
                        data-inventory-id="study.practice-next"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="study-practice-controls study-practice-controls--intro" data-inventory-id="study.practice-navigation">
                    <button
                      type="button"
                      className="button button-secondary study-practice-arrow"
                      onClick={() => {
                        setSelectedIndex((current) => (current - 1 + practiceCards.length) % practiceCards.length);
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
                    <button
                      type="button"
                      className="button button-primary study-practice-check"
                      onClick={advanceToNextPracticeCard}
                      aria-label="Next word"
                      title={introAdvanceCard?.phase === "assessment" ? "Start mixed practice" : "Next word"}
                      data-inventory-id="study.practice-next"
                    >
                      {introAdvanceCard?.phase === "assessment" ? "Start practice" : "Next word"}
                    </button>
                    <button
                      type="button"
                      className="button button-secondary study-practice-arrow"
                      onClick={() => {
                        setSelectedIndex((current) => (current + 1) % practiceCards.length);
                      }}
                      disabled={practiceCards.length <= 1}
                      aria-label="Next term"
                      title={introAdvanceCard?.phase === "assessment" ? "Start mixed practice" : "Next term"}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                )}

                {currentCard.phase === "intro" || currentAttempt.revealed ? (
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

              {currentCard.phase === "assessment" ? (
                <>
                  <button
                    type="button"
                    className="button button-secondary study-practice-not-sure"
                    onClick={() => void handleNotSure()}
                    disabled={currentAttempt.revealed || assessmentPending}
                    aria-label="Show the answer when you are not sure"
                    data-inventory-id="study.practice-not-sure"
                  >
                    {assessmentPending ? "Saving..." : "Not sure?"}
                  </button>
                  {currentAttempt.assessmentError ? <p className="small-copy" role="alert">{currentAttempt.assessmentError}</p> : null}
                </>
              ) : null}
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
