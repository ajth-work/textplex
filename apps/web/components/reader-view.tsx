"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type TouchEvent } from "react";

import { AccountMenu } from "./account-menu";
import {
  fetchJson,
  formatElapsed,
  postJson,
  rememberReaderPosition,
  persistReaderTokenAudioOnTap,
  readStoredReaderTokenAudioOnTap,
  resolveReaderResumePosition,
  resolveResourceUrl,
  syncLearningEvents,
  triggerBookExtraction,
  isDemoMode,
  type BookExtractionResult,
  type BookReaderPageResponse,
  type LearningProfileSummary,
  type GoogleTranslateUsageSummary,
  type LexicalEntryResult,
  type LexiconEntryRecord,
  type LexiconLookupResponse,
  type PageReadRecord,
  type ReadingSessionRecord,
  type SentenceReadCreateRequest,
  type SentenceReadRecord,
  type SentenceResult,
  type StudySurfaceResponse,
  type StudyVocabularyItem,
  type StudyVocabularyItemRecord,
  type WordInteractionCreateRequest,
  type WordInteractionRecord,
  type TokenResult,
} from "../lib/textplex";
import {
  appThemeLabels,
  persistAppTheme,
  readStoredAppTheme,
  type AppTheme,
} from "../lib/theme";
import { LoadingSkeleton, ReaderLoadingSkeleton } from "./loading-skeleton";

type ReaderTokenMode = "word" | "character";
type ReaderMode = "sentence" | "page" | "token";
type ReaderFontMode = "mixed" | "serif" | "sans";
type ReaderThemeMode = AppTheme;
type ReaderTextSizeMode = "small" | "medium" | "large";
type SentenceAudioRate = 0.25 | 0.5 | 0.75 | 1;
type RussianSyllableDisplayMode = "romanization" | "original";

const readerFontStorageKey = "textplex.readerFont";
const readerTextSizeStorageKey = "textplex.readerTextSize";
const readerPronunciationFreshOnlyStorageKey = "textplex.readerPronunciationFreshOnly";
const readerRussianSyllableDisplayModeStorageKey = "textplex.readerRussianSyllableDisplayMode";
const readerModeStorageKey = "textplex.readerMode";
const readerModeLabels: Record<ReaderMode, string> = {
  sentence: "Sentence",
  page: "Page",
  token: "Token",
};
const readerFontLabels: Record<ReaderFontMode, string> = {
  mixed: "Mixed",
  serif: "Serif",
  sans: "Sans",
};
const readerTextSizeLabels: Record<ReaderTextSizeMode, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};
const readerFontOptions: ReaderFontMode[] = ["mixed", "serif", "sans"];
const readerTextSizeOptions: ReaderTextSizeMode[] = ["small", "medium", "large"];
const sentenceAudioRateOptions: SentenceAudioRate[] = [0.25, 0.5, 0.75, 1];
const readerThemeLabels: Record<ReaderThemeMode, string> = appThemeLabels;
const readerTextSizeScales: Record<ReaderTextSizeMode, number> = {
  small: 0.92,
  medium: 1,
  large: 1.1,
};
const pronunciationFreshWindowMs = 30 * 24 * 60 * 60 * 1000;

const readerPageBookmarksStorageKey = "textplex.readerPageBookmarks";
const readerSentenceBookmarksStorageKey = "textplex.readerSentenceBookmarks";
const readerGoogleTranslateFallbackStorageKey = "textplex.readerGoogleTranslateFallback";

function readReaderBookmarkList(storageKey: string): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function setReaderBookmarkInList(storageKey: string, bookmarkId: string, saved: boolean): void {
  const current = readReaderBookmarkList(storageKey);
  const next = saved
    ? Array.from(new Set([...current, bookmarkId]))
    : current.filter((item) => item !== bookmarkId);
  window.localStorage.setItem(storageKey, JSON.stringify(next));
}

function resolveRussianSyllableDisplayMode(value: string | null | undefined): RussianSyllableDisplayMode {
  return value === "original" ? "original" : "romanization";
}

function readStoredRussianSyllableDisplayMode(): RussianSyllableDisplayMode {
  if (typeof window === "undefined") {
    return "romanization";
  }

  return resolveRussianSyllableDisplayMode(window.localStorage.getItem(readerRussianSyllableDisplayModeStorageKey));
}

function persistRussianSyllableDisplayMode(mode: RussianSyllableDisplayMode): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(readerRussianSyllableDisplayModeStorageKey, mode);
}

function resolveReaderFont(value: string | null | undefined): ReaderFontMode {
  return value === "serif" || value === "sans" || value === "mixed" ? value : "mixed";
}

function resolveReaderTextSize(value: string | null | undefined): ReaderTextSizeMode {
  return value === "small" || value === "large" || value === "medium" ? value : "medium";
}

function resolveReaderMode(value: string | null | undefined): ReaderMode {
  return value === "page" || value === "token" || value === "sentence" ? value : "sentence";
}

function normalizeLookupKey(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function isFreshStudyItem(item: StudyVocabularyItem | null | undefined): boolean {
  if (!item) {
    return true;
  }
  const timestamp = parseTimestamp(item.last_seen_at ?? item.first_seen_at);
  if (timestamp === null) {
    return true;
  }
  return Date.now() - timestamp <= pronunciationFreshWindowMs;
}

function getSpeechLanguage(languageCode?: string | null): string {
  if (!languageCode) {
    return "en-US";
  }
  if (languageCode.startsWith("zh")) {
    return "zh-CN";
  }
  if (languageCode.startsWith("ja")) {
    return "ja-JP";
  }
  if (languageCode.startsWith("ko")) {
    return "ko-KR";
  }
  if (languageCode.startsWith("ru")) {
    return "ru-RU";
  }
  if (languageCode.startsWith("he")) {
    return "he-IL";
  }
  if (languageCode.startsWith("ar")) {
    return "ar-SA";
  }
  return "en-US";
}

type SpeechTokenRange = { order: number; start: number; end: number };

function buildSpeechTokenRanges(text: string, tokens: TokenResult[]): SpeechTokenRange[] {
  if (!text || !tokens.length) {
    return [];
  }

  let searchStart = 0;
  const ranges: SpeechTokenRange[] = [];
  tokens.forEach((token, index) => {
    const surface = token.surface_form?.trim() ?? "";
    if (!surface) {
      return;
    }

    const start = text.indexOf(surface, searchStart);
    if (start < 0) {
      return;
    }

    searchStart = start + surface.length;
    if (!isSentencePunctuation(surface)) {
      ranges.push({ order: token.order ?? index + 1, start, end: searchStart });
    }
  });

  return ranges;
}

function getSpeechTokenOrderAtCharIndex(ranges: SpeechTokenRange[], charIndex: number): number | null {
  const containingRange = ranges.find((range) => charIndex >= range.start && charIndex < range.end);
  if (containingRange) {
    return containingRange.order;
  }

  return ranges.find((range) => range.start >= charIndex)?.order ?? null;
}

function resolveReaderTitleScale(title: string | null | undefined): number {
  const titleLength = Array.from(title?.trim() ?? "").length;
  if (titleLength <= 20) {
    return 1;
  }
  if (titleLength <= 32) {
    return 0.92;
  }
  if (titleLength <= 48) {
    return 0.84;
  }
  if (titleLength <= 68) {
    return 0.76;
  }
  return 0.68;
}

function formatCurrencyUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type SentenceTranslationResponse = {
  book_id: string;
  page_number: number;
  sentence_order: number;
  sentence_text: string;
  translation: string | null;
  translation_source: string | null;
  resolution_source: string;
};

const pinyinSyllablePattern = /^(?:(?:zh|ch|sh)|[bpmfdtnlgkhjqxrzcsyw])?(?:a|ai|an|ang|ao|e|ei|en|eng|er|o|ong|ou|i|ia|ian|iang|iao|ie|in|ing|iong|iu|u|ua|uai|uan|uang|ue|ui|un|uo|v|ve|van|vn)$/;
const pinyinSeparatorPattern = /[\s'’\-.0-9]/u;
const russianTransliterationSeparatorPattern = /[\s'’\-.0-9]/u;
const russianTransliterationVowelPattern = /[aeiouy]/i;
const russianTransliterationVowelDigraphs = ["ya", "ye", "yo", "yu"];
const russianTransliterationOnsetClusters = new Set([
  "bl",
  "br",
  "ch",
  "dr",
  "fl",
  "fr",
  "gl",
  "gr",
  "kh",
  "kl",
  "kr",
  "ks",
  "kv",
  "ml",
  "mn",
  "pl",
  "pr",
  "ps",
  "sh",
  "shch",
  "sk",
  "sl",
  "sm",
  "sn",
  "sp",
  "st",
  "sv",
  "tr",
  "tv",
  "ts",
  "vl",
  "vr",
  "zh",
]);

const hangulInitialRomanizations = [
  "g",
  "kk",
  "n",
  "d",
  "tt",
  "r",
  "m",
  "b",
  "pp",
  "s",
  "ss",
  "",
  "j",
  "jj",
  "ch",
  "k",
  "t",
  "p",
  "h",
];
const hangulMedialRomanizations = [
  "a",
  "ae",
  "ya",
  "yae",
  "eo",
  "e",
  "yeo",
  "ye",
  "o",
  "wa",
  "wae",
  "oe",
  "yo",
  "u",
  "wo",
  "we",
  "wi",
  "yu",
  "eu",
  "ui",
  "i",
];
const hangulFinalRomanizations = [
  "",
  "k",
  "k",
  "k",
  "n",
  "n",
  "n",
  "t",
  "l",
  "k",
  "m",
  "l",
  "l",
  "l",
  "l",
  "l",
  "m",
  "p",
  "p",
  "t",
  "t",
  "ng",
  "t",
  "t",
  "k",
  "t",
  "p",
  "t",
];

function isHangulSyllable(character: string): boolean {
  const codePoint = character.codePointAt(0);
  return codePoint !== undefined && codePoint >= 0xac00 && codePoint <= 0xd7a3;
}

function romanizeHangulSyllable(character: string): string {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined || codePoint < 0xac00 || codePoint > 0xd7a3) {
    return character;
  }

  const syllableIndex = codePoint - 0xac00;
  const initialIndex = Math.floor(syllableIndex / 588);
  const medialIndex = Math.floor((syllableIndex % 588) / 28);
  const finalIndex = syllableIndex % 28;

  return `${hangulInitialRomanizations[initialIndex] ?? ""}${hangulMedialRomanizations[medialIndex] ?? ""}${
    hangulFinalRomanizations[finalIndex] ?? ""
  }`;
}

function romanizeHangulText(text: string): string {
  if (!/[\p{Script=Hangul}]/u.test(text)) {
    return text.trim();
  }

  const romanizedChunks: string[] = [];
  Array.from(text.trim()).forEach((character) => {
    if (isHangulSyllable(character)) {
      romanizedChunks.push(romanizeHangulSyllable(character));
      return;
    }

    if (/\s/u.test(character)) {
      return;
    }

    romanizedChunks.push(character);
  });

  return romanizedChunks.join(" ").replace(/\s+/g, " ").trim();
}

function normalizeDisplayReading(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return romanizeHangulText(value);
}

type TokenReadingPart = {
  surface: string;
  text: string;
  kind: "stem" | "particle" | "generic";
  gloss: string | null;
};

const koreanParticleSuffixes = [
  "으로",
  "에게서",
  "한테서",
  "이라도",
  "라도",
  "부터",
  "까지",
  "보다",
  "처럼",
  "만큼",
  "조차",
  "마저",
  "밖에",
  "마다",
  "에게",
  "한테",
  "으로",
  "로",
  "와",
  "과",
  "이랑",
  "랑",
  "하고",
  "에서",
  "께",
  "에",
  "는",
  "은",
  "가",
  "이",
  "를",
  "을",
  "도",
  "만",
  "에",
];

const koreanParticleGlosses: Record<string, string> = {
  "에": "at / to / in",
  "에서": "at / from / in",
  "에게": "to",
  "한테": "to",
  "께": "to (honorific)",
  "으로": "toward / by / with",
  "로": "toward / by / with",
  "는": "topic",
  "은": "topic",
  "가": "subject",
  "이": "subject",
  "를": "object",
  "을": "object",
  "도": "also / too",
  "만": "only",
  "와": "and / with",
  "과": "and / with",
  "이랑": "and / with",
  "랑": "and / with",
  "하고": "and / with",
  "보다": "than / compared with",
  "처럼": "like / as",
  "만큼": "as much as / as",
  "부터": "from",
  "까지": "until / to",
  "조차": "even",
  "마저": "even",
  "밖에": "only / nothing but",
  "마다": "each / every",
  "에게서": "from",
  "한테서": "from",
  "이라도": "even if",
  "라도": "even if",
};

function isKoreanText(value: string): boolean {
  return /[\p{Script=Hangul}]/u.test(value);
}

function splitKoreanParticleChain(surface: string): string[] {
  const trimmed = surface.trim();
  if (!trimmed || !isKoreanText(trimmed)) {
    return [];
  }

  const parts: string[] = [];
  let remaining = trimmed;

  while (remaining.length > 1) {
    const suffix = koreanParticleSuffixes.find((candidate) => remaining.length > candidate.length && remaining.endsWith(candidate));
    if (!suffix) {
      break;
    }

    parts.unshift(suffix);
    remaining = remaining.slice(0, -suffix.length);
  }

  if (!parts.length) {
    return [];
  }

  return [remaining, ...parts];
}

function buildTokenReadingParts(
  token: TokenResult,
  languageCode?: string | null,
  pronunciationOverride?: string | null,
  readingOverride?: string | null,
): TokenReadingPart[] {
  const surface = token.surface_form ?? "";
  if (!surface) {
    return [];
  }

  const reading = normalizeDisplayReading(
    readingOverride ?? token.romanization ?? pronunciationOverride ?? token.pronunciation ?? (languageCode?.startsWith("ko") ? surface : ""),
  );

  if (languageCode?.startsWith("ru") || isRussianText(surface)) {
    if (!reading) {
      return [];
    }

    const russianParts = splitRussianTransliterationIntoParts(reading);
    if (russianParts.length > 1) {
      const russianSurfaceParts = splitRussianCyrillicIntoParts(surface, russianParts.length);
      return russianParts.map((part, index) => ({
        surface: russianSurfaceParts[index] ?? surface,
        text: part,
        kind: "generic",
        gloss: null,
      }));
    }

    return [{ surface, text: reading, kind: "generic", gloss: null }];
  }

  if (languageCode?.startsWith("ko") || isKoreanText(surface)) {
    const koreanParts = splitKoreanParticleChain(surface);
    if (koreanParts.length > 1) {
      return koreanParts.map((part, index) => ({
        surface: part,
        text: normalizeDisplayReading(part),
        kind: index === 0 ? "stem" : "particle",
        gloss: index === 0 ? null : koreanParticleGlosses[part] ?? null,
      }));
    }
  }

  if (!reading) {
    return [];
  }

  return [{ surface, text: reading, kind: "generic", gloss: null }];
}

function getKoreanLexiconSourceLabel(
  entry: LexiconEntryRecord | null,
  languageCode?: string | null,
  resolutionSource?: LexiconLookupResponse["resolution_source"] | null,
): string | null {
  const isKorean = languageCode?.startsWith("ko") ?? false;
  const isRussian = languageCode?.startsWith("ru") ?? false;
  if (!entry || (!isKorean && !isRussian)) {
    if (isKorean) {
      return "TOPIK 6000";
    }
    if (isRussian) {
      return "Russian lexicon";
    }
    return null;
  }

  const sourceText = `${entry.note ?? ""} ${entry.source_name ?? ""} ${entry.source_path ?? ""}`.toLowerCase();
  if (sourceText.includes("topik")) {
    return "TOPIK 6000";
  }

  if (sourceText.includes("manual override") || sourceText.includes("lexicon.override.csv")) {
    return "Sample bridge";
  }

  if (sourceText.includes("google translate") || sourceText.includes("translation.googleapis.com")) {
    if (resolutionSource === "google_translate_cache") {
      return "Google Translate (cached)";
    }
    if (resolutionSource === "google_translate_live") {
      return "Google Translate (live)";
    }
    return "Google Translate";
  }

  if (sourceText.includes("russian") || sourceText.includes("ru5000") || sourceText.includes("gramota") || sourceText.includes("rnc")) {
    return "Russian lexicon";
  }

  return isRussian ? "Russian lexicon" : "TOPIK 6000";
}

function getLexiconTraceSource(entry: LexiconEntryRecord | null, resolutionSource?: LexiconLookupResponse["resolution_source"] | null): string {
  if (!entry) {
    return "No lexicon metadata.";
  }

  const resolutionLabel =
    resolutionSource === "google_translate_cache"
      ? "Google Translate (cached)"
      : resolutionSource === "google_translate_live"
        ? "Google Translate (live)"
        : null;
  const parts = [resolutionLabel, entry.source_name?.trim(), entry.source_path?.trim(), entry.note?.trim()].filter(
    (part): part is string => Boolean(part),
  );
  return parts.length ? parts.join(" · ") : "No lexicon metadata.";
}

function formatLexiconMatchConfidence(
  matchConfidence?: LexiconLookupResponse["match_confidence"] | null,
  matchedTerm?: LexiconLookupResponse["matched_term"] | null,
): string | null {
  if (typeof matchConfidence !== "number" || !Number.isFinite(matchConfidence)) {
    return null;
  }

  const percent = Math.max(0, Math.min(100, Math.round(matchConfidence * 100)));
  if (matchedTerm) {
    return `Match confidence: ${percent}% (${matchedTerm})`;
  }
  return `Match confidence: ${percent}%`;
}

function normalizePinyinCharacter(character: string): string {
  switch (character) {
    case "ā":
    case "á":
    case "ǎ":
    case "à":
      return "a";
    case "ē":
    case "é":
    case "ě":
    case "è":
      return "e";
    case "ī":
    case "í":
    case "ǐ":
    case "ì":
      return "i";
    case "ō":
    case "ó":
    case "ǒ":
    case "ò":
      return "o";
    case "ū":
    case "ú":
    case "ǔ":
    case "ù":
      return "u";
    case "ǖ":
    case "ǘ":
    case "ǚ":
    case "ǜ":
    case "ü":
      return "v";
    default:
      return character.toLowerCase();
  }
}

function isValidPinyinChunk(chunk: string): boolean {
  return pinyinSyllablePattern.test(chunk);
}

function splitConcatenatedPinyin(romanization: string, characterCount: number): string[] | null {
  const sourceCharacters = Array.from(romanization.trim()).filter((character) => !pinyinSeparatorPattern.test(character));
  if (!sourceCharacters.length || characterCount <= 0) {
    return null;
  }

  const normalizedCharacters = sourceCharacters.map((character) => normalizePinyinCharacter(character));
  const maxChunkLength = Math.min(7, normalizedCharacters.length);
  const memo = new Map<string, string[] | null>();

  function splitFrom(startIndex: number, remainingCount: number): string[] | null {
    const memoKey = `${startIndex}:${remainingCount}`;
    if (memo.has(memoKey)) {
      return memo.get(memoKey) ?? null;
    }

    const remainingCharacters = normalizedCharacters.length - startIndex;
    if (remainingCount <= 0 || remainingCharacters < remainingCount) {
      memo.set(memoKey, null);
      return null;
    }

    if (remainingCount === 1) {
      const chunk = normalizedCharacters.slice(startIndex).join("");
      if (!chunk || !isValidPinyinChunk(chunk)) {
        memo.set(memoKey, null);
        return null;
      }

      const tail = sourceCharacters.slice(startIndex).join("");
      memo.set(memoKey, [tail]);
      return [tail];
    }

    const maxEndIndex = Math.min(normalizedCharacters.length - (remainingCount - 1), startIndex + maxChunkLength);
    for (let endIndex = startIndex + 1; endIndex <= maxEndIndex; endIndex += 1) {
      const chunk = normalizedCharacters.slice(startIndex, endIndex).join("");
      if (!isValidPinyinChunk(chunk)) {
        continue;
      }

      const tail = splitFrom(endIndex, remainingCount - 1);
      if (tail) {
        const head = sourceCharacters.slice(startIndex, endIndex).join("");
        const result = [head, ...tail];
        memo.set(memoKey, result);
        return result;
      }
    }

    memo.set(memoKey, null);
    return null;
  }

  return splitFrom(0, characterCount);
}

type RussianTransliterationUnit = {
  text: string;
  vowel: boolean;
};

function isRussianText(value: string): boolean {
  return /[\p{Script=Cyrillic}]/u.test(value);
}

function tokenizeRussianTransliteration(text: string): RussianTransliterationUnit[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const units: RussianTransliterationUnit[] = [];
  const lower = trimmed.toLowerCase();

  for (let index = 0; index < lower.length; ) {
    const separator = trimmed[index];
    if (separator && russianTransliterationSeparatorPattern.test(separator)) {
      index += 1;
      continue;
    }

    const remaining = lower.slice(index);
    const vowelDigraph = russianTransliterationVowelDigraphs.find((candidate) => remaining.startsWith(candidate));
    if (vowelDigraph) {
      units.push({
        text: trimmed.slice(index, index + vowelDigraph.length),
        vowel: true,
      });
      index += vowelDigraph.length;
      continue;
    }

    const consonantDigraph = ["shch", "sch", "kh", "zh", "ch", "sh", "ts"].find((candidate) => remaining.startsWith(candidate));
    if (consonantDigraph) {
      units.push({
        text: trimmed.slice(index, index + consonantDigraph.length),
        vowel: false,
      });
      index += consonantDigraph.length;
      continue;
    }

    units.push({
      text: trimmed[index],
      vowel: russianTransliterationVowelPattern.test(lower[index] ?? ""),
    });
    index += 1;
  }

  return units;
}

function splitRussianTransliterationIntoParts(reading: string): string[] {
  const units = tokenizeRussianTransliteration(reading);
  if (!units.length) {
    return [];
  }

  const vowelIndices = units.flatMap((unit, index) => (unit.vowel ? [index] : []));
  if (vowelIndices.length <= 1) {
    return [units.map((unit) => unit.text).join("")];
  }

  const parts: string[] = [];
  let startIndex = 0;

  for (let vowelIndex = 0; vowelIndex < vowelIndices.length - 1; vowelIndex += 1) {
    const currentVowelIndex = vowelIndices[vowelIndex];
    const nextVowelIndex = vowelIndices[vowelIndex + 1];
    const clusterUnits = units.slice(currentVowelIndex + 1, nextVowelIndex);

    let nextStartIndex = currentVowelIndex + 1;
    if (clusterUnits.length > 1) {
      const clusterText = clusterUnits.map((unit) => unit.text).join("").toLowerCase();
      nextStartIndex = russianTransliterationOnsetClusters.has(clusterText) ? currentVowelIndex + 1 : currentVowelIndex + 2;
    }

    const chunk = units.slice(startIndex, nextStartIndex).map((unit) => unit.text).join("");
    if (chunk) {
      parts.push(chunk);
    }
    startIndex = nextStartIndex;
  }

  const finalChunk = units.slice(startIndex).map((unit) => unit.text).join("");
  if (finalChunk) {
    parts.push(finalChunk);
  }

  return parts.length ? parts : [units.map((unit) => unit.text).join("")];
}

type RussianCyrillicUnit = {
  text: string;
  vowel: boolean;
};

const russianCyrillicVowelPattern = /[аеёиоуыэюя]/i;
const russianCyrillicSeparatorPattern = russianTransliterationSeparatorPattern;
const russianCyrillicOnsetClusters = new Set([
  "бл",
  "бр",
  "вл",
  "вн",
  "вр",
  "гл",
  "гр",
  "дв",
  "дл",
  "др",
  "жд",
  "кл",
  "кр",
  "мн",
  "мр",
  "нд",
  "пл",
  "пр",
  "ск",
  "сл",
  "см",
  "сп",
  "сн",
  "ст",
  "тр",
  "фл",
  "фр",
  "хл",
  "хр",
  "чн",
  "чт",
  "шк",
  "шл",
  "шн",
  "шт",
  "щн",
  "зв",
  "зд",
  "зн",
  "зр",
  "цв",
  "цг",
  "цк",
]);

function tokenizeRussianCyrillic(text: string): RussianCyrillicUnit[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const units: RussianCyrillicUnit[] = [];
  const lower = trimmed.toLowerCase();

  for (let index = 0; index < lower.length; ) {
    const separator = trimmed[index];
    if (separator && russianCyrillicSeparatorPattern.test(separator)) {
      index += 1;
      continue;
    }

    units.push({
      text: trimmed[index],
      vowel: russianCyrillicVowelPattern.test(lower[index] ?? ""),
    });
    index += 1;
  }

  return units;
}

function splitRussianCyrillicIntoParts(surface: string, targetCount?: number): string[] {
  const units = tokenizeRussianCyrillic(surface);
  if (!units.length) {
    return [];
  }

  const vowelIndices = units.flatMap((unit, index) => (unit.vowel ? [index] : []));
  if (vowelIndices.length <= 1) {
    return [units.map((unit) => unit.text).join("")];
  }

  const parts: string[] = [];
  let startIndex = 0;

  for (let vowelIndex = 0; vowelIndex < vowelIndices.length - 1; vowelIndex += 1) {
    const currentVowelIndex = vowelIndices[vowelIndex];
    const nextVowelIndex = vowelIndices[vowelIndex + 1];
    const clusterUnits = units.slice(currentVowelIndex + 1, nextVowelIndex);

    let nextStartIndex = currentVowelIndex + 1;
    if (clusterUnits.length > 1) {
      const clusterText = clusterUnits.map((unit) => unit.text).join("").toLowerCase();
      nextStartIndex = russianCyrillicOnsetClusters.has(clusterText) ? currentVowelIndex + 1 : currentVowelIndex + 2;
    }

    const chunk = units.slice(startIndex, nextStartIndex).map((unit) => unit.text).join("");
    if (chunk) {
      parts.push(chunk);
    }
    startIndex = nextStartIndex;
  }

  const finalChunk = units.slice(startIndex).map((unit) => unit.text).join("");
  if (finalChunk) {
    parts.push(finalChunk);
  }

  if (typeof targetCount !== "number" || !Number.isFinite(targetCount) || targetCount <= 0 || parts.length === targetCount) {
    return parts.length ? parts : [units.map((unit) => unit.text).join("")];
  }

  if (parts.length > targetCount) {
    const merged = parts.slice(0, targetCount - 1);
    merged.push(parts.slice(targetCount - 1).join(""));
    return merged.filter((part) => part.length > 0);
  }

  const expanded = [...parts];
  while (expanded.length < targetCount) {
    const longestIndex = expanded.reduce((longest, part, index) => (part.length > expanded[longest].length ? index : longest), 0);
    const longestPart = expanded[longestIndex] ?? "";
    if (longestPart.length <= 1) {
      expanded.push("");
      continue;
    }

    const splitIndex = Math.max(1, Math.floor(longestPart.length / 2));
    const head = longestPart.slice(0, splitIndex);
    const tail = longestPart.slice(splitIndex);
    expanded.splice(longestIndex, 1, head, tail);
  }

  return expanded.slice(0, targetCount).filter((part) => part.length > 0);
}

function resolveEntry(
  summary: BookExtractionResult | null,
  token: TokenResult | null,
  preferredSurfaceForm?: string | null,
): LexicalEntryResult | null {
  if (!summary || !token) {
    return null;
  }
  const key = preferredSurfaceForm ?? token.lemma ?? token.surface_form;
  return summary.lexical_entries.find((entry) => entry.lemma === key) ?? null;
}

function resolveReaderTokenMode(value: string | null | undefined): ReaderTokenMode {
  return value === "character" ? "character" : "word";
}

function shouldExpandTokenIntoCharacters(surface: string): boolean {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(surface) && Array.from(surface).length > 1;
}

function splitRomanizationByCharacters(romanization: string, characterCount: number): string[] {
  const syllables = romanization.trim().split(/\s+/).filter(Boolean);
  if (!characterCount) {
    return [];
  }
  if (!syllables.length) {
    return Array.from({ length: characterCount }, () => "");
  }

  if (syllables.length === characterCount) {
    return syllables;
  }

  if (syllables.length > characterCount) {
    const readings = Array.from({ length: characterCount }, () => "");
    const lastIndex = characterCount - 1;
    for (let index = 0; index < syllables.length; index += 1) {
      if (index < lastIndex) {
        readings[index] = syllables[index];
      } else {
        readings[lastIndex] = readings[lastIndex] ? `${readings[lastIndex]} ${syllables[index]}` : syllables[index];
      }
    }
    return readings;
  }

  if (syllables.length === 1 && characterCount > 1) {
    if (/[\p{Script=Hangul}]/u.test(romanization)) {
      const hangulSyllables = Array.from(romanization).filter((character) => /[\p{Script=Hangul}]/u.test(character));
      if (hangulSyllables.length === characterCount) {
        return hangulSyllables;
      }
    }

    const splitSyllables = splitConcatenatedPinyin(romanization, characterCount);
    if (splitSyllables && splitSyllables.length === characterCount) {
      return splitSyllables;
    }
  }

  const readings = Array.from({ length: characterCount }, () => "");
  for (let index = 0; index < syllables.length; index += 1) {
    readings[index] = syllables[index];
  }
  return readings;
}

function buildReaderDisplayTokens(
  sentence: { tokens?: TokenResult[] } | null | undefined,
  mode: ReaderTokenMode,
  languageCode?: string | null,
  pronunciationOverrides?: Record<number, string>,
): TokenResult[] {
  const tokens = Array.isArray(sentence?.tokens) ? sentence.tokens : [];
  if (mode !== "character") {
    return tokens;
  }

  const displayTokens: TokenResult[] = [];
  tokens.forEach((token) => {
    const surface = token.surface_form ?? "";
    if (!surface || isSentencePunctuation(surface) || !shouldExpandTokenIntoCharacters(surface)) {
      displayTokens.push(token);
      return;
    }

    const pronunciationOverride = token.order != null ? pronunciationOverrides?.[token.order] ?? null : null;

    const characters = Array.from(surface);
    const readings = splitRomanizationByCharacters(
      normalizeDisplayReading(token.romanization ?? pronunciationOverride ?? token.pronunciation ?? (languageCode?.startsWith("ko") ? token.surface_form : "")),
      characters.length,
    );
    characters.forEach((character, characterIndex) => {
      displayTokens.push({
        ...token,
        order: (token.order ?? displayTokens.length + 1) * 100 + characterIndex + 1,
        surface_form: character,
        lemma: character,
        pronunciation: pronunciationOverride ?? token.pronunciation ?? null,
        romanization: readings[characterIndex] ?? null,
      });
    });
  });

  return displayTokens;
}

const hskLevelColors = ["#006b35", "#1f9d45", "#a7ad12", "#e28a09", "#d84b2a", "#9f1836"];

function parseHskLevel(value: string | number | null | undefined): number | null {
  const match = String(value ?? "").match(/(?:HSK\s*)?(\d+(?:\.\d+)?)/i);
  if (!match) {
    return null;
  }

  const level = Number(match[1]);
  return Number.isFinite(level) && level >= 1 && level <= 6 ? level : null;
}

function ReaderHskChart({ tokens }: { tokens: TokenResult[] }) {
  const readableTokens = tokens.filter((token) => !isSentencePunctuation(token.surface_form));
  const points = readableTokens
    .map((token, index) => ({ index, level: parseHskLevel(token.proficiency_level) }))
    .filter((point): point is { index: number; level: number } => point.level !== null);

  if (!readableTokens.length || !points.length) {
    return null;
  }

  const width = Math.max(360, readableTokens.length * 30 + 32);
  const height = 190;
  const plotLeft = 24;
  const plotRight = width - 16;
  const plotTop = 18;
  const plotBottom = 146;
  const xForIndex = (index: number) => plotLeft + (index / Math.max(readableTokens.length - 1, 1)) * (plotRight - plotLeft);
  const yForLevel = (level: number) => plotBottom - ((level - 1) / 5) * (plotBottom - plotTop);
  const chartPoints = points.map((point) => `${xForIndex(point.index)},${yForLevel(point.level)}`).join(" ");

  return (
    <section className="reader-chart-card" data-inventory-id="reader.sentence-hsk-chart" aria-label="Sentence HSK profile">
      <div className="reader-chart-header">
        <div>
          <span className="eyebrow">Sentence profile</span>
          <h3>HSK level by token</h3>
        </div>
        <span className="small-copy">{readableTokens.length} tokens</span>
      </div>
      <div className="reader-chart-scroll" role="img" aria-label="HSK level plotted across the selected sentence">
        <svg className="reader-hsk-chart" viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true">
          {[1, 2, 3, 4, 5, 6].map((level) => {
            const y = yForLevel(level);
            return (
              <g key={level}>
                <line x1={plotLeft} x2={plotRight} y1={y} y2={y} className="reader-chart-gridline" />
                <text x="0" y={y + 4} className="reader-chart-axis-label">{level}</text>
              </g>
            );
          })}
          <polyline points={chartPoints} className="reader-chart-line" />
          {points.map((point) => (
            <circle
              key={`${point.index}-${point.level}`}
              cx={xForIndex(point.index)}
              cy={yForLevel(point.level)}
              r="4.5"
              fill={hskLevelColors[Math.max(0, Math.ceil(point.level) - 1)]}
              className="reader-chart-point"
            />
          ))}
        </svg>
      </div>
      <div className="reader-chart-legend" aria-hidden="true">
        <span>HSK 1</span>
        <span>HSK 3</span>
        <span>HSK 6</span>
      </div>
    </section>
  );
}

export function ReaderView({ bookId, pageNumber }: { bookId: string; pageNumber: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pageData, setPageData] = useState<BookReaderPageResponse | null>(null);
  const [summary, setSummary] = useState<BookExtractionResult | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenResult | null>(null);
  const [tokenPronunciationOverrides, setTokenPronunciationOverrides] = useState<Record<number, string>>({});
  const [selectedSentenceOrder, setSelectedSentenceOrder] = useState<number | null>(null);
  const [resumeSentenceOrder, setResumeSentenceOrder] = useState<number | null>(null);
  const [readerMode, setReaderMode] = useState<ReaderMode>(() => resolveReaderMode(typeof window === "undefined" ? null : window.localStorage.getItem(readerModeStorageKey)));
  const [showPageImage, setShowPageImage] = useState(false);
  const [showReaderOptions, setShowReaderOptions] = useState(false);
  const [readerTokenMode, setReaderTokenMode] = useState<ReaderTokenMode>("word");
  const [readerFont, setReaderFont] = useState<ReaderFontMode>("mixed");
  const [readerTheme, setReaderTheme] = useState<ReaderThemeMode>("jade");
  const [readerTextSize, setReaderTextSize] = useState<ReaderTextSizeMode>("medium");
  const [readerGoogleTranslateFallback, setReaderGoogleTranslateFallback] = useState(false);
  const [readerPronunciationFreshOnly, setReaderPronunciationFreshOnly] = useState(false);
  const [readerTokenAudioOnTap, setReaderTokenAudioOnTap] = useState(false);
  const [readerRussianSyllableDisplayMode, setReaderRussianSyllableDisplayMode] = useState<RussianSyllableDisplayMode>("romanization");
  const [showSentenceTranslation, setShowSentenceTranslation] = useState(false);
  const [showSourceSentence, setShowSourceSentence] = useState(false);
  const [sentenceTranslationLoading, setSentenceTranslationLoading] = useState(false);
  const [sentenceTranslationResolutionSource, setSentenceTranslationResolutionSource] = useState<string | null>(null);
  const [sentenceAudioPlaying, setSentenceAudioPlaying] = useState(false);
  const [sentenceAudioRate, setSentenceAudioRate] = useState<SentenceAudioRate>(1);
  const [sentenceAudioTokenOrder, setSentenceAudioTokenOrder] = useState<number | null>(null);
  const [selectedTokenAudioPlaying, setSelectedTokenAudioPlaying] = useState(false);
  const [selectedTokenSegmentAudioText, setSelectedTokenSegmentAudioText] = useState<string | null>(null);
  const [selectedTokenSegmentAudioPlaying, setSelectedTokenSegmentAudioPlaying] = useState(false);
  const [readerPageBookmarked, setReaderPageBookmarked] = useState(false);
  const [readerSentenceBookmarked, setReaderSentenceBookmarked] = useState(false);
  const [bookmarkToast, setBookmarkToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [profileSummary, setProfileSummary] = useState<LearningProfileSummary | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [lexiconResult, setLexiconResult] = useState<LexiconLookupResponse | null>(null);
  const [lexiconLoading, setLexiconLoading] = useState(false);
  const [definitionLookupTrace, setDefinitionLookupTrace] = useState<string[]>([]);
  const [googleTranslateUsage, setGoogleTranslateUsage] = useState<GoogleTranslateUsageSummary | null>(null);
  const [googleTranslateUsageLoading, setGoogleTranslateUsageLoading] = useState(true);
  const [studySurface, setStudySurface] = useState<StudySurfaceResponse | null>(null);
  const [studySurfaceLoading, setStudySurfaceLoading] = useState(true);
  const [selectedTokenSaved, setSelectedTokenSaved] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [sentenceActiveSeconds, setSentenceActiveSeconds] = useState(0);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "pending" | "error">("idle");
  const sessionIdRef = useRef<string | null>(null);
  const activeSecondsRef = useRef(0);
  const sentenceActiveSecondsRef = useRef(0);
  const sentenceTimerRef = useRef<number | null>(null);
  const bookmarkToastTimerRef = useRef<number | null>(null);
  const sentenceTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setReaderTokenMode(resolveReaderTokenMode(window.localStorage.getItem("textplex.readerTokenMode")));
    setReaderFont(resolveReaderFont(window.localStorage.getItem(readerFontStorageKey)));
    setReaderMode(resolveReaderMode(window.localStorage.getItem(readerModeStorageKey)));
    setReaderTheme(readStoredAppTheme() ?? "jade");
    setReaderTextSize(resolveReaderTextSize(window.localStorage.getItem(readerTextSizeStorageKey)));
    setReaderGoogleTranslateFallback(window.localStorage.getItem(readerGoogleTranslateFallbackStorageKey) === "true");
    setReaderPronunciationFreshOnly(window.localStorage.getItem(readerPronunciationFreshOnlyStorageKey) === "true");
    setReaderTokenAudioOnTap(readStoredReaderTokenAudioOnTap());
    setReaderRussianSyllableDisplayMode(readStoredRussianSyllableDisplayMode());
    const pageBookmarkId = `${bookId}:${pageNumber}`;
    const legacyPageBookmarkKey = `textplex.readerBookmark:${bookId}:${pageNumber}`;
    const legacyPageBookmarkSaved = window.localStorage.getItem(legacyPageBookmarkKey) === "saved";
    if (legacyPageBookmarkSaved) {
      setReaderBookmarkInList(readerPageBookmarksStorageKey, pageBookmarkId, true);
      window.localStorage.removeItem(legacyPageBookmarkKey);
    }
    setReaderPageBookmarked(readReaderBookmarkList(readerPageBookmarksStorageKey).includes(pageBookmarkId) || legacyPageBookmarkSaved);
  }, [bookId, pageNumber]);

  useEffect(() => {
    return () => {
      if (bookmarkToastTimerRef.current !== null) {
        window.clearTimeout(bookmarkToastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedSentenceOrder == null) {
      return;
    }
    rememberReaderPosition(bookId, pageNumber, selectedSentenceOrder);
  }, [bookId, pageNumber, selectedSentenceOrder]);

  useEffect(() => {
    const requestedSentence = Number(new URLSearchParams(window.location.search).get("sentence") ?? "");
    setResumeSentenceOrder(Number.isFinite(requestedSentence) && requestedSentence >= 1 ? Math.floor(requestedSentence) : null);
  }, [bookId, pageNumber]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSummary(null);
    setSummaryLoading(true);
    setProfileSummary(null);
    setProfileLoading(true);

    async function loadPage() {
      try {
        const pageResult = await fetchJson<BookReaderPageResponse>(`/books/${bookId}/pages/${pageNumber}`);
        if (!active) {
          return;
        }
        setPageData(pageResult);
        setSelectedToken(null);
        setTokenPronunciationOverrides({});
        setSelectedSentenceOrder(null);
        setShowPageImage(false);
        try {
          const summaryResult = await fetchJson<BookExtractionResult>(`/books/${bookId}/extractions`);
          if (active) {
            setSummary(summaryResult);
          }
        } catch {
          if (active) {
            setSummary(null);
          }
        } finally {
          if (active) {
            setSummaryLoading(false);
          }
        }
        try {
          const profileResult = await fetchJson<LearningProfileSummary>("/learning/profile");
          if (active) {
            setProfileSummary(profileResult);
          }
        } catch {
          if (active) {
            setProfileSummary(null);
          }
        } finally {
          if (active) {
            setProfileLoading(false);
          }
        }
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to load page.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      active = false;
    };
  }, [bookId, pageNumber, refreshNonce]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setActiveSeconds((value) => value + 1);
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    activeSecondsRef.current = 0;
    setActiveSeconds(0);
  }, [bookId, pageNumber]);

  useEffect(() => {
    activeSecondsRef.current = activeSeconds;
  }, [activeSeconds]);

  useEffect(() => {
    sentenceActiveSecondsRef.current = sentenceActiveSeconds;
  }, [sentenceActiveSeconds]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(readerGoogleTranslateFallbackStorageKey, String(readerGoogleTranslateFallback));
  }, [readerGoogleTranslateFallback]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(readerPronunciationFreshOnlyStorageKey, String(readerPronunciationFreshOnly));
  }, [readerPronunciationFreshOnly]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(readerModeStorageKey, readerMode);
  }, [readerMode]);

  useEffect(() => {
    persistReaderTokenAudioOnTap(readerTokenAudioOnTap);
  }, [readerTokenAudioOnTap]);

  useEffect(() => {
    persistRussianSyllableDisplayMode(readerRussianSyllableDisplayMode);
  }, [readerRussianSyllableDisplayMode]);

  useEffect(() => {
    let active = true;

    async function loadGoogleTranslateUsage() {
      try {
        const usageResult = await fetchJson<GoogleTranslateUsageSummary>("/lexicon/google-translate/usage");
        if (active) {
          setGoogleTranslateUsage(usageResult);
        }
      } catch {
        if (active) {
          setGoogleTranslateUsage(null);
        }
      } finally {
        if (active) {
          setGoogleTranslateUsageLoading(false);
        }
      }
    }

    void loadGoogleTranslateUsage();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const languageCode = pageData?.book.language_code ?? null;

    if (!languageCode) {
      setStudySurface(null);
      setStudySurfaceLoading(true);
      return () => {
        active = false;
      };
    }

    setStudySurfaceLoading(true);

    void fetchJson<StudySurfaceResponse>(`/study?language_code=${encodeURIComponent(languageCode)}&limit=1000`)
      .then((result) => {
        if (active) {
          setStudySurface(result);
        }
      })
      .catch(() => {
        if (active) {
          setStudySurface(null);
        }
      })
      .finally(() => {
        if (active) {
          setStudySurfaceLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [pageData?.book.language_code]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    setSentenceAudioPlaying(false);
    setSentenceAudioTokenOrder(null);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [bookId, pageNumber, selectedSentenceOrder]);

  useEffect(() => {
    let active = true;

    async function loadLexicon() {
      if (!pageData || !selectedToken) {
        if (active) {
          setLexiconResult(null);
          setLexiconLoading(false);
          setDefinitionLookupTrace([]);
        }
        return;
      }

      if (active) {
        setLexiconLoading(true);
        setLexiconResult(null);
        setDefinitionLookupTrace([]);
      }

      try {
        const trace: string[] = [];
        const pushTrace = (message: string) => {
          trace.push(message);
          if (active) {
            setDefinitionLookupTrace([...trace]);
          }
        };
        const lookupTerms = selectedToken
          ? [
              splitKoreanParticleChain(selectedToken.surface_form)[0] ?? "",
              selectedToken.lemma ?? "",
              selectedToken.surface_form,
            ].filter((term, index, terms) => term && terms.indexOf(term) === index)
          : [];
        pushTrace(`Selected token: ${selectedToken.surface_form}`);
        pushTrace(`Language: ${pageData.book.language_code.toUpperCase()}`);
        pushTrace(`Google fallback: ${readerGoogleTranslateFallback ? "enabled" : "disabled"}`);
        pushTrace(`Lookup terms: ${lookupTerms.join(" -> ") || "none"}`);
        let lookup: LexiconLookupResponse | null = null;
        for (const lookupTerm of lookupTerms) {
          pushTrace(`Requesting /lexicon/lookup for "${lookupTerm}"`);
          const response = await fetchJson<LexiconLookupResponse>(
            `/lexicon/lookup?language_code=${encodeURIComponent(pageData.book.language_code)}&term=${encodeURIComponent(lookupTerm)}&allow_google_fallback=${readerGoogleTranslateFallback ? "true" : "false"}`,
          );
          pushTrace(`Response for "${lookupTerm}": ${response.entries.length} entr${response.entries.length === 1 ? "y" : "ies"}`);
          if (response.entries.length) {
            lookup = response;
            const topEntry = response.entries[0];
            const lookupReading = normalizeDisplayReading(topEntry.pronunciation ?? topEntry.pinyin ?? null);
            if (lookupReading && selectedToken && selectedToken.order != null && !selectedToken.pronunciation && !selectedToken.romanization) {
              setTokenPronunciationOverrides((current) =>
                current[selectedToken.order] === lookupReading ? current : { ...current, [selectedToken.order]: lookupReading },
              );
            }
            pushTrace(`Resolved with "${topEntry.surface_form}" (${topEntry.entry_type})`);
            pushTrace(`Source: ${getLexiconTraceSource(topEntry, response.resolution_source)}`);
            const confidenceLabel = formatLexiconMatchConfidence(response.match_confidence, response.matched_term);
            if (confidenceLabel) {
              pushTrace(confidenceLabel);
            }
            break;
          }
          if (!lookup) {
            lookup = response;
          }
        }
        if (lookup && !lookup.entries.length) {
          pushTrace("No dictionary entry matched; falling back to book frequency or token metadata.");
        }
        if (active) {
          setLexiconResult(lookup);
          setDefinitionLookupTrace(trace);
        }
        if (readerGoogleTranslateFallback) {
          try {
            const usageResult = await fetchJson<GoogleTranslateUsageSummary>("/lexicon/google-translate/usage");
            if (active) {
              setGoogleTranslateUsage(usageResult);
            }
          } catch {
            if (active) {
              setGoogleTranslateUsage(null);
            }
          }
        }
      } catch {
        if (active) {
          setDefinitionLookupTrace((current) => [...current, "Lookup failed; falling back to local text and book frequency."]);
          setLexiconResult(null);
        }
      } finally {
        if (active) {
          setLexiconLoading(false);
        }
      }
    }

    void loadLexicon();

    return () => {
      active = false;
    };
  }, [pageData, readerGoogleTranslateFallback, selectedToken]);

  useEffect(() => {
    setSelectedTokenSaved(false);
  }, [selectedToken]);

  useEffect(() => {
    let active = true;
    let retryTimer: number | null = null;
    let attempts = 0;

    async function syncWithRetry() {
      if (active) {
        setSyncStatus("syncing");
      }
      try {
        const result = await syncLearningEvents();
        if (!active) {
          return;
        }
        if (!result) {
          setSyncStatus("idle");
          return;
        }
        if (result.status === "synced") {
          setSyncStatus("synced");
          return;
        }
        setSyncStatus("pending");
        if (attempts < 3) {
          attempts += 1;
          retryTimer = window.setTimeout(syncWithRetry, Math.max(1000, result.retry_after_seconds * 1000));
        }
      } catch {
        if (!active) {
          return;
        }
        setSyncStatus("error");
        if (attempts < 3) {
          attempts += 1;
          retryTimer = window.setTimeout(syncWithRetry, Math.min(30000, 2 ** attempts * 1000));
        }
      }
    }

    void syncWithRetry();

    async function ensureSession() {
      const storageKey = `textplex-reading-session:${bookId}`;
      const storedSessionId = window.localStorage.getItem(storageKey);
      if (storedSessionId) {
        sessionIdRef.current = storedSessionId;
        if (active) {
          setSessionReady(true);
        }
        return;
      }

      const session = await postJson<ReadingSessionRecord>("/learning/sessions", {
        book_id: bookId,
      });
      if (!active) {
        return;
      }

      window.localStorage.setItem(storageKey, session.id);
      sessionIdRef.current = session.id;
      setSessionReady(true);
    }

    void ensureSession().catch(() => {
      if (active) {
        setSessionReady(false);
      }
    });

    return () => {
      active = false;
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [bookId]);

  useEffect(() => {
    return () => {
      const sessionId = sessionIdRef.current;
      const seconds = activeSecondsRef.current;
      if (!sessionId || seconds <= 0) {
        return;
      }

      void postJson<PageReadRecord>("/learning/page-reads", {
        session_id: sessionId,
        book_id: bookId,
        page_number: pageNumber,
        active_seconds: seconds,
      }).catch(() => {
        // The reader stays usable even if the profile write fails.
      });
    };
  }, [bookId, pageNumber]);

  const page = pageData?.extraction?.page ?? null;
  const lexiconEntry = lexiconResult?.entries[0] ?? null;
  const imageUrl = pageData ? resolveResourceUrl(pageData.image_url) : "";
  const totalPages = pageData?.book.total_pages ?? summary?.page_end ?? null;
  const pageTranslation = page?.page_translation?.trim() || null;
  const selectedSentence = useMemo(
    () => (page ? page.sentences.find((sentence) => sentence.order === selectedSentenceOrder) ?? null : null),
    [page, selectedSentenceOrder],
  );
  const activeSentence = selectedSentence ?? page?.sentences[0] ?? null;
  const activeSentenceTranslationSource = activeSentence?.translation_source ?? null;
  const sentenceTranslationLoaded = Boolean(activeSentence?.translation || pageTranslation);
  const readerTokenDisplayModes: ReaderTokenMode[] = pageData?.reader_capabilities?.token_display_modes ?? ["word"];
  const readerSupportsCharacterMode = readerTokenDisplayModes.includes("character");
  const effectiveReaderTokenMode = readerTokenDisplayModes.includes(readerTokenMode)
    ? readerTokenMode
    : pageData?.reader_capabilities?.default_token_display_mode ?? "word";
  const displayedSentenceTokens = useMemo(
    () => buildReaderDisplayTokens(activeSentence, effectiveReaderTokenMode, pageData?.book.language_code ?? null, tokenPronunciationOverrides),
    [activeSentence, effectiveReaderTokenMode, pageData?.book.language_code, tokenPronunciationOverrides],
  );
  const speechTokenRanges = useMemo(
    () => buildSpeechTokenRanges(activeSentence?.text ?? "", displayedSentenceTokens),
    [activeSentence?.text, displayedSentenceTokens],
  );
  const studyVocabularyLookup = useMemo(() => {
    const lookup = new Map<string, StudyVocabularyItem>();
    for (const group of studySurface?.study_groups ?? []) {
      for (const item of group.items) {
        const keys = new Set(
          [item.lemma, item.display_form, item.source_surface_form]
            .map((value) => normalizeLookupKey(value))
            .filter((value) => value.length > 0),
        );
        for (const key of keys) {
          lookup.set(key, item);
        }
      }
    }
    return lookup;
  }, [studySurface]);
  const selectedTokenPronunciationOverride = selectedToken ? tokenPronunciationOverrides[selectedToken.order] ?? null : null;
  const selectedTokenReading = normalizeDisplayReading(
    lexiconEntry?.pronunciation ??
      lexiconEntry?.pinyin ??
      selectedToken?.romanization ??
      selectedToken?.pronunciation ??
      selectedTokenPronunciationOverride,
  );
  const selectedTokenReadingParts = selectedToken
      ? buildTokenReadingParts(
        selectedToken,
        pageData?.book.language_code ?? null,
        selectedTokenPronunciationOverride,
        selectedTokenReading,
      )
    : [];
  const selectedTokenSurfaceParts = selectedToken ? splitKoreanParticleChain(selectedToken.surface_form) : [];
  const selectedTokenReadingDisplayParts = selectedToken
    ? pageData?.book.language_code?.startsWith("ru") && readerRussianSyllableDisplayMode === "original"
      ? selectedTokenReadingParts.map((part) => ({
          ...part,
          text: part.surface,
        }))
      : selectedTokenReadingParts
    : [];
  const selectedTokenPronunciationLine = selectedTokenReadingParts.map((part) => part.text).join(" ");
  const selectedTokenEnglishMeaning = lexiconEntry?.definition?.trim() || selectedToken?.definition_short?.trim() || null;
  const tokenEntry = resolveEntry(
    summary,
    selectedToken,
    pageData?.book.language_code?.startsWith("ko") ? selectedTokenReadingParts[0]?.surface ?? null : null,
  );
  function getStudyVocabularyItem(token: TokenResult): StudyVocabularyItem | null {
    const keys = [token.lemma, token.surface_form]
      .map((value) => normalizeLookupKey(value))
      .filter((value, index, list) => value.length > 0 && list.indexOf(value) === index);
    for (const key of keys) {
      const item = studyVocabularyLookup.get(key);
      if (item) {
        return item;
      }
    }
    return null;
  }

  useEffect(() => {
    if (page?.sentences.length && selectedSentenceOrder == null) {
      const rememberedPosition = resolveReaderResumePosition(bookId, null, pageNumber);
      const requestedSentenceOrder = resumeSentenceOrder ?? (
        rememberedPosition.pageNumber === pageNumber ? rememberedPosition.sentenceOrder : null
      );
      const requestedSentence = requestedSentenceOrder !== null
        ? page.sentences.find((sentence) => sentence.order === requestedSentenceOrder)
        : null;
      setSelectedSentenceOrder(requestedSentence?.order ?? page.sentences[0].order);
    }
  }, [bookId, page?.sentences, pageNumber, resumeSentenceOrder, selectedSentenceOrder]);

  useEffect(() => {
    setShowSentenceTranslation(false);
    setShowSourceSentence(false);
    setSentenceTranslationResolutionSource(null);
    setSentenceTranslationLoading(false);
    setTokenPronunciationOverrides({});
  }, [pageNumber, selectedSentenceOrder]);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSelectedTokenAudioPlaying(false);
    setSelectedTokenSegmentAudioPlaying(false);
    setSelectedTokenSegmentAudioText(null);
  }, [bookId, pageNumber, selectedSentenceOrder]);

  useEffect(() => {
    if (!activeSentence) {
      setReaderSentenceBookmarked(false);
      return;
    }

    const sentenceBookmarkId = `${bookId}:${pageNumber}:${activeSentence.order}`;
    setReaderSentenceBookmarked(readReaderBookmarkList(readerSentenceBookmarksStorageKey).includes(sentenceBookmarkId));
  }, [activeSentence, bookId, pageNumber]);

  useEffect(() => {
    if (!page || selectedSentenceOrder == null || !selectedSentence) {
      sentenceTimerRef.current = null;
      setSentenceActiveSeconds(0);
      return;
    }

    sentenceTimerRef.current = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        sentenceActiveSecondsRef.current += 1;
        setSentenceActiveSeconds(sentenceActiveSecondsRef.current);
      }
    }, 1000);
    sentenceActiveSecondsRef.current = 0;
    setSentenceActiveSeconds(0);

    return () => {
      if (sentenceTimerRef.current !== null) {
        window.clearInterval(sentenceTimerRef.current);
        sentenceTimerRef.current = null;
      }

      const sessionId = sessionIdRef.current;
      if (!sessionId || !page || !selectedSentence || sentenceActiveSecondsRef.current <= 0) {
        return;
      }

      const payload: SentenceReadCreateRequest = {
        session_id: sessionId,
        book_id: bookId,
        page_number: page.page_number,
        sentence_order: selectedSentence.order,
        sentence_text: selectedSentence.text,
        token_count: selectedSentence.tokens.filter((token) => !isSentencePunctuation(token.surface_form)).length,
        character_count: selectedSentence.tokens.reduce((total, token) => total + countReadableCharacters(token.surface_form), 0),
        active_seconds: sentenceActiveSecondsRef.current,
        tokens: selectedSentence.tokens
          .filter((token) => !isSentencePunctuation(token.surface_form))
          .map((token) => ({
            surface_form: token.surface_form,
            lemma: token.lemma ?? token.surface_form,
            token_kind: "word",
          })),
      };

      void postJson<SentenceReadRecord>("/learning/sentence-reads", payload).catch(() => {
        // Sentence tracking is best-effort so the reader stays usable offline.
      });
    };
  }, [bookId, page, pageNumber, selectedSentence, selectedSentenceOrder]);

  const tokenLabel = lexiconEntry?.surface_form ?? selectedToken?.surface_form ?? "";
  const tokenDefinition =
    lexiconEntry?.definition ??
    selectedToken?.definition_short ??
    (tokenEntry
      ? `Seen ${tokenEntry.frequency_in_book} times in this book.`
      : "");
  const tokenPinyin = selectedTokenReadingParts.length
    ? selectedTokenReadingParts.map((part) => part.text).join(" ")
    : selectedTokenReading;
  const tokenHsk = lexiconEntry?.hsk_level ?? selectedToken?.proficiency_level ?? null;
  const tokenHskLabel = formatLevelTag(tokenHsk);
  const tokenSourceLabel = getKoreanLexiconSourceLabel(
    lexiconEntry,
    pageData?.book.language_code ?? null,
    lexiconResult?.resolution_source ?? null,
  );
  const needsExtraction = (pageData?.book.extracted_page_count ?? 0) <= 0;
  const extractionInProgress = ["queued", "processing", "running"].includes(pageData?.book.extraction_status ?? "");
  const extractionSource = pageData?.extraction?.text_source ?? null;
  const extractionSourceLabel = extractionSource ? extractionSource.toUpperCase() : "UNAVAILABLE";
  const selectedSentenceIndex = useMemo(() => {
    if (!page?.sentences.length) {
      return -1;
    }
    if (selectedSentenceOrder == null) {
      return 0;
    }
    return page.sentences.findIndex((sentence) => sentence.order === selectedSentenceOrder);
  }, [page?.sentences, selectedSentenceOrder]);
  const selectedSentencePosition = selectedSentenceIndex >= 0 ? selectedSentenceIndex + 1 : 0;
  const selectedSentenceTokenCount = displayedSentenceTokens.filter((token) => !isSentencePunctuation(token.surface_form)).length;
  const selectedSentenceCharacterCount = displayedSentenceTokens.reduce(
    (total, token) => total + countReadableCharacters(token.surface_form),
    0,
  );
  const selectedSentenceSecondsPerCharacter = selectedSentenceCharacterCount > 0 ? sentenceActiveSeconds / selectedSentenceCharacterCount : null;
  const selectedSentenceSecondsPerToken = selectedSentenceTokenCount > 0 ? sentenceActiveSeconds / selectedSentenceTokenCount : null;
  const pagePillLabel = totalPages ? `P${pageNumber}/${totalPages}` : `P${pageNumber}`;
  const sentencePillLabel = `S${selectedSentencePosition || 1}/${page?.sentences.length ?? 0}`;
  const sessionLabel = sessionReady ? "Session active" : "Session starting";
  const canMoveToPreviousSentence = selectedSentenceIndex > 0;
  const canMoveToNextSentence = selectedSentenceIndex >= 0 && selectedSentenceIndex < (page?.sentences.length ?? 0) - 1;

  async function handleExtractNow() {
    if (!pageData || extracting) {
      return;
    }

    setExtracting(true);
    setExtractError(null);
    try {
      await triggerBookExtraction(bookId, {
        page_start: 1,
        page_count: pageData.book.total_pages,
        force: true,
      });
      setRefreshNonce((value) => value + 1);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Unable to start extraction.");
    } finally {
      setExtracting(false);
    }
  }

  function handleToggleReaderTokenMode() {
    if (!readerSupportsCharacterMode) {
      return;
    }
    setReaderTokenMode((mode) => {
      const nextMode = mode === "character" ? "word" : "character";
      window.localStorage.setItem("textplex.readerTokenMode", nextMode);
      return nextMode;
    });
    setSelectedToken(null);
  }

  function handleSetReaderFont(nextMode: ReaderFontMode) {
    setReaderFont(nextMode);
    window.localStorage.setItem(readerFontStorageKey, nextMode);
  }

  function handleSetReaderTheme(nextTheme: ReaderThemeMode) {
    setReaderTheme(nextTheme);
    persistAppTheme(nextTheme);
  }

  function handleSetReaderTextSize(nextSize: ReaderTextSizeMode) {
    setReaderTextSize(nextSize);
    window.localStorage.setItem(readerTextSizeStorageKey, nextSize);
  }

  function showBookmarkToast(message: string) {
    setBookmarkToast(message);
    if (bookmarkToastTimerRef.current !== null) {
      window.clearTimeout(bookmarkToastTimerRef.current);
    }
    bookmarkToastTimerRef.current = window.setTimeout(() => {
      setBookmarkToast(null);
      bookmarkToastTimerRef.current = null;
    }, 2600);
  }

  function handleTogglePageBookmark() {
    const nextSaved = !readerPageBookmarked;
    setReaderPageBookmarked(nextSaved);
    setReaderBookmarkInList(readerPageBookmarksStorageKey, `${bookId}:${pageNumber}`, nextSaved);
    showBookmarkToast(nextSaved ? "Page bookmark saved to your page list." : "Page bookmark removed from your page list.");
  }

  function handleToggleSentenceBookmark() {
    if (!activeSentence) {
      return;
    }

    const nextSaved = !readerSentenceBookmarked;
    setReaderSentenceBookmarked(nextSaved);
    setReaderBookmarkInList(readerSentenceBookmarksStorageKey, `${bookId}:${pageNumber}:${activeSentence.order}`, nextSaved);
    showBookmarkToast(nextSaved ? "Sentence bookmark saved to your sentence list." : "Sentence bookmark removed from your sentence list.");
  }

  function applySentenceTranslation(sentenceOrder: number, translation: string | null, translationSource: string | null): void {
    setPageData((current) => {
      if (!current?.extraction?.page) {
        return current;
      }

      const nextPage = current.extraction.page;
      const nextSentences = nextPage.sentences.map((sentence) =>
        sentence.order === sentenceOrder
          ? {
              ...sentence,
              translation,
              translation_source: translationSource,
            }
          : sentence,
      );

      return {
        ...current,
        extraction: {
          ...current.extraction,
          page: {
            ...nextPage,
            sentences: nextSentences,
          },
        },
      };
    });
  }

  async function handleToggleSentenceTranslation() {
    if (!activeSentence || !pageData) {
      return;
    }

    if (activeSentence.translation) {
      setShowSentenceTranslation((value) => !value);
      return;
    }

    if (sentenceTranslationLoading) {
      return;
    }

    setSentenceTranslationLoading(true);
    try {
      const response = await postJson<SentenceTranslationResponse>(
        `/books/${bookId}/pages/${pageNumber}/sentences/${activeSentence.order}/translation`,
        {},
      );
      if (response.translation) {
        applySentenceTranslation(response.sentence_order, response.translation, response.translation_source);
      }
      setSentenceTranslationResolutionSource(response.resolution_source);
      setShowSentenceTranslation(true);
    } catch (error) {
      setDefinitionLookupTrace((current) => [
        ...current,
        error instanceof Error ? error.message : "Sentence translation failed; showing the source sentence instead.",
      ]);
      setShowSentenceTranslation(Boolean(pageTranslation));
      setShowSourceSentence(true);
    } finally {
      setSentenceTranslationLoading(false);
    }
  }

  function getSentenceTranslationSourceLabel(): string | null {
    if (sentenceTranslationResolutionSource === "google_translate_live") {
      return "Google Translate (live)";
    }
    if (sentenceTranslationResolutionSource === "google_translate_cache") {
      return "Google Translate (cached)";
    }
    if (activeSentenceTranslationSource === "google_translate_live") {
      return "Google Translate (cached)";
    }
    if (activeSentenceTranslationSource) {
      return "Translation loaded";
    }
    if (pageTranslation) {
      return "Page translation";
    }
    return null;
  }

  async function recordSentenceAudioPlayback(sentence: SentenceResult): Promise<void> {
    if (!pageData) {
      return;
    }

    const payload: WordInteractionCreateRequest = {
      book_id: bookId,
      language_code: pageData.book.language_code,
      target_text: sentence.text,
      page_number: pageNumber,
      interaction_type: "pronunciation_playback",
      occurred_at: new Date().toISOString(),
    };

    try {
      await postJson<WordInteractionRecord>("/learning/word-interactions", payload);
    } catch {
      // Playback tracking is best-effort so the audio button stays usable offline.
    }
  }

  async function recordPronunciationPlayback(targetText: string): Promise<void> {
    if (!pageData) {
      return;
    }

    const payload: WordInteractionCreateRequest = {
      book_id: bookId,
      language_code: pageData.book.language_code,
      target_text: targetText,
      page_number: pageNumber,
      interaction_type: "pronunciation_playback",
      occurred_at: new Date().toISOString(),
    };

    try {
      await postJson<WordInteractionRecord>("/learning/word-interactions", payload);
    } catch {
      // Playback tracking is best-effort so the audio button stays usable offline.
    }
  }

  async function recordWordAudioPlayback(token: TokenResult): Promise<void> {
    await recordPronunciationPlayback(token.surface_form);
  }

  function cancelReaderSpeechPlayback(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSentenceAudioPlaying(false);
    setSentenceAudioTokenOrder(null);
    setSelectedTokenAudioPlaying(false);
    setSelectedTokenSegmentAudioPlaying(false);
    setSelectedTokenSegmentAudioText(null);
  }

  function handlePlaySentenceAudio(): void {
    if (!activeSentence || !pageData || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    if (sentenceAudioPlaying) {
      cancelReaderSpeechPlayback();
      return;
    }

    cancelReaderSpeechPlayback();
    const utterance = new SpeechSynthesisUtterance(activeSentence.text);
    utterance.lang = getSpeechLanguage(pageData.book.language_code);
    utterance.rate = sentenceAudioRate;
    utterance.pitch = 1;
    utterance.onstart = () => {
      setSentenceAudioPlaying(true);
      setSentenceAudioTokenOrder(null);
    };
    utterance.onboundary = (event) => {
      const tokenOrder = getSpeechTokenOrderAtCharIndex(speechTokenRanges, event.charIndex);
      if (tokenOrder !== null) {
        setSentenceAudioTokenOrder(tokenOrder);
      }
    };
    utterance.onend = () => {
      setSentenceAudioPlaying(false);
      setSentenceAudioTokenOrder(null);
    };
    utterance.onerror = () => {
      setSentenceAudioPlaying(false);
      setSentenceAudioTokenOrder(null);
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    void recordSentenceAudioPlayback(activeSentence);
  }

  function playWordAudio(token: TokenResult): void {
    if (!pageData || typeof window === "undefined" || !("speechSynthesis" in window) || isSentencePunctuation(token.surface_form)) {
      return;
    }

    if (selectedTokenAudioPlaying && selectedToken?.order === token.order && selectedToken?.surface_form === token.surface_form) {
      cancelReaderSpeechPlayback();
      return;
    }

    cancelReaderSpeechPlayback();

    const utterance = new SpeechSynthesisUtterance(token.surface_form);
    utterance.lang = getSpeechLanguage(pageData.book.language_code);
    utterance.rate = sentenceAudioRate;
    utterance.pitch = 1;
    utterance.onstart = () => {
      setSelectedTokenAudioPlaying(true);
    };
    utterance.onend = () => {
      setSelectedTokenAudioPlaying(false);
    };
    utterance.onerror = () => {
      setSelectedTokenAudioPlaying(false);
    };
    window.speechSynthesis.speak(utterance);
    void recordWordAudioPlayback(token);
  }

  function playDefinitionSegmentAudio(part: TokenReadingPart): void {
    if (!pageData || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const speechText = part.surface.trim() || part.text.trim();
    if (!speechText) {
      return;
    }

    if (selectedTokenSegmentAudioPlaying && selectedTokenSegmentAudioText === speechText) {
      cancelReaderSpeechPlayback();
      return;
    }

    cancelReaderSpeechPlayback();

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = getSpeechLanguage(pageData.book.language_code);
    utterance.rate = sentenceAudioRate;
    utterance.pitch = 1;
    utterance.onstart = () => {
      setSelectedTokenSegmentAudioPlaying(true);
      setSelectedTokenSegmentAudioText(speechText);
    };
    utterance.onend = () => {
      setSelectedTokenSegmentAudioPlaying(false);
      setSelectedTokenSegmentAudioText(null);
    };
    utterance.onerror = () => {
      setSelectedTokenSegmentAudioPlaying(false);
      setSelectedTokenSegmentAudioText(null);
    };
    window.speechSynthesis.speak(utterance);
    void recordPronunciationPlayback(speechText);
  }

  function handlePlaySelectedTokenAudio(): void {
    if (!selectedToken) {
      return;
    }

    playWordAudio(selectedToken);
  }

  async function saveSelectedTokenToStudyList(token: TokenResult, sentence: SentenceResult | null): Promise<void> {
    if (!pageData || !sentence || isSentencePunctuation(token.surface_form)) {
      return;
    }

    try {
      const response = await postJson<StudyVocabularyItemRecord>("/learning/study-items", {
        book_id: bookId,
        language_code: pageData.book.language_code,
        lemma: token.lemma ?? token.surface_form,
        display_form: token.surface_form,
        page_number: pageNumber,
        sentence_order: sentence.order,
        token_order: token.order,
        source_surface_form: token.surface_form,
        source_sentence_text: sentence.text,
        pronunciation: token.pronunciation ?? tokenPronunciationOverrides[token.order] ?? lexiconEntry?.pronunciation ?? null,
        romanization: token.romanization ?? lexiconEntry?.pinyin ?? null,
        definition_short: selectedTokenEnglishMeaning ?? token.definition_short ?? null,
        proficiency_level: token.proficiency_level ?? null,
      });
      setSelectedTokenSaved(response.click_count > 0);
    } catch {
      // Study saves are best-effort so the reader stays usable offline.
    }
  }

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/library");
  }

  function focusSentence(nextIndex: number) {
    if (!page?.sentences.length) {
      return;
    }
    const clampedIndex = Math.max(0, Math.min(nextIndex, page.sentences.length - 1));
    const nextSentence = page.sentences[clampedIndex];
    if (!nextSentence) {
      return;
    }
    setSelectedSentenceOrder(nextSentence.order);
    setSelectedToken(null);
  }

  function handleSentenceTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0] ?? event.touches[0];
    sentenceTouchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function handleSentenceTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = sentenceTouchStartRef.current;
    sentenceTouchStartRef.current = null;
    const touch = event.changedTouches[0] ?? event.touches[0];
    if (!start || !touch) {
      return;
    }

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    focusSentence(selectedSentenceIndex + (deltaX < 0 ? 1 : -1));
  }

  const readerTitle = pageData?.book.title ?? (loading ? null : "Reader unavailable");
  const readerTitleScale = resolveReaderTitleScale(readerTitle);

  return (
    <section
      className={`reader-shell reader-font-${readerFont}`}
      data-reader-font={readerFont}
      data-reader-theme={readerTheme}
      data-reader-text-size={readerTextSize}
      style={{ "--reader-text-scale": readerTextSizeScales[readerTextSize] } as CSSProperties}
    >
      <header className="reader-topbar" data-inventory-id="reader.header">
        <button
          type="button"
          className="reader-back-button"
          onClick={handleBack}
          aria-label="Back"
          title="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="reader-topbar-copy">
          <h1
            style={{ "--reader-title-scale": readerTitleScale } as CSSProperties}
            title={readerTitle ?? undefined}
          >
            {readerTitle ?? <span className="skeleton-line skeleton-line-title" aria-hidden="true" />}
          </h1>
          <p className="muted">
            {loading ? <span className="skeleton-line skeleton-line-short" aria-hidden="true" /> : pageData?.book.author ?? "Unknown author"}
          </p>
          {isDemoMode ? <p className="small-copy reader-topbar-note">Demo mode is active. This reader is running from packaged sample data.</p> : null}
        </div>
        <div className="reader-topbar-actions">
          <AccountMenu returnTo={pathname} compact className="reader-account-menu" />
        </div>
        <button
          type="button"
          className={`reader-settings-button ${showReaderOptions ? "is-active" : ""}`}
          onClick={() => setShowReaderOptions((value) => !value)}
          disabled={!pageData}
          aria-expanded={showReaderOptions}
          aria-controls="reader-options-panel"
          aria-label="Reader settings"
          title="Reader settings"
          data-inventory-id="reader.settings-button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3.5" />
            <path d="M12 2.75v2.1M12 19.15v2.1M2.75 12h2.1M19.15 12h2.1M5.46 5.46l1.49 1.49M17.05 17.05l1.49 1.49M18.54 5.46l-1.49 1.49M6.95 17.05l-1.49 1.49" />
          </svg>
        </button>
      </header>

      <div className="reader-canvas">
      {showReaderOptions ? (
        <>
          <button type="button" className="reader-options-backdrop" aria-label="Close reader options" onClick={() => setShowReaderOptions(false)} />
          <section id="reader-options-panel" className="card reader-options-panel" data-inventory-id="reader.options-dialog" aria-modal="true" role="dialog">
            <div className="card-topline">
              <div>
                <span className="eyebrow">Reader options</span>
                <h2>Reader settings</h2>
              </div>
              <button type="button" className="ghost-link" onClick={() => setShowReaderOptions(false)}>
                Close
              </button>
            </div>
            <section className="reader-options-section">
              <div className="reader-options-section-head">
                <div>
                  <span className="eyebrow">Font</span>
                  <h3>Style and size</h3>
                </div>
              </div>
              <div className="reader-font-row" role="group" aria-label="Reader font style">
                {readerFontOptions.map((fontMode) => (
                  <button
                    key={fontMode}
                    type="button"
                    className={`reader-font-option ${readerFont === fontMode ? "is-selected" : ""}`}
                    onClick={() => handleSetReaderFont(fontMode)}
                    aria-pressed={readerFont === fontMode}
                  >
                    <span className="reader-font-option-body">
                      <strong>{readerFontLabels[fontMode]}</strong>
                    </span>
                  </button>
                ))}
              </div>
              <label className="reader-size-slider" htmlFor="reader-text-size-slider">
                <span className="reader-size-slider-head">
                  <strong>Text size</strong>
                  <span>{readerTextSizeLabels[readerTextSize]}</span>
                </span>
                <input
                  id="reader-text-size-slider"
                  type="range"
                  min={0}
                  max={readerTextSizeOptions.length - 1}
                  step={1}
                  value={readerTextSizeOptions.indexOf(readerTextSize)}
                  onChange={(event) => {
                    const nextIndex = Number(event.target.value);
                    handleSetReaderTextSize(readerTextSizeOptions[nextIndex] ?? "medium");
                  }}
                  aria-label="Reader text size"
                />
                <span className="reader-size-slider-scale" aria-hidden="true">
                  <span>Small</span>
                  <span>Medium</span>
                  <span>Large</span>
                </span>
              </label>
            </section>
            <section className="reader-options-section" data-inventory-id="reader.mode-control">
              <div className="reader-options-section-head">
                <div>
                  <span className="eyebrow">Reading flow</span>
                  <h3>Reader mode</h3>
                </div>
              </div>
              <select
                className="text-input"
                value={readerMode}
                onChange={(event) => setReaderMode(resolveReaderMode(event.target.value))}
                aria-label="Reader mode"
              >
                {(Object.keys(readerModeLabels) as ReaderMode[]).map((mode) => (
                  <option key={mode} value={mode}>
                    {readerModeLabels[mode]}
                  </option>
                ))}
              </select>
            </section>
            <section className="reader-options-section" data-inventory-id="reader.token-audio-toggle">
              <div className="reader-options-section-head">
                <div>
                  <span className="eyebrow">Token audio</span>
                  <h3>Play token audio on tap</h3>
                </div>
                <button
                  type="button"
                  className={`button button-secondary button-compact ${readerTokenAudioOnTap ? "is-active" : ""}`}
                  onClick={() => setReaderTokenAudioOnTap((value) => !value)}
                  aria-pressed={readerTokenAudioOnTap}
                >
                  {readerTokenAudioOnTap ? "On" : "Off"}
                </button>
              </div>
              <p className="small-copy">When enabled, tapping a token speaks that word aloud while still opening its definition card.</p>
            </section>
            <section className="reader-options-section" data-inventory-id="reader.pronunciation-visibility-section">
              <div className="reader-options-section-head">
                <div>
                  <span className="eyebrow">Pronunciation</span>
                  <h3>Fresh words only</h3>
                </div>
                <button
                  type="button"
                  className={`button button-secondary button-compact ${readerPronunciationFreshOnly ? "is-active" : ""}`}
                  onClick={() => setReaderPronunciationFreshOnly((value) => !value)}
                  aria-pressed={readerPronunciationFreshOnly}
                  aria-label={readerPronunciationFreshOnly ? "Show pronunciation for all words" : "Show pronunciation for fresh words only"}
                  data-inventory-id="reader.pronunciation-visibility-toggle"
                >
                  {readerPronunciationFreshOnly ? "On" : "Off"}
                </button>
              </div>
              <p className="small-copy">
                Keep pronunciation above the token for fresh study items and newly encountered words. Mature study items stay visually quieter while the
                definition card still shows the full lookup reading.
              </p>
            </section>
            <section className="reader-options-section">
              <div className="reader-options-section-head">
                <div>
                  <span className="eyebrow">Themes</span>
                  <h3>Reading themes</h3>
                </div>
                <span className="pill">{readerThemeLabels[readerTheme]}</span>
              </div>
              <div className="reader-theme-grid" role="list" aria-label="Reader theme variations">
                {([
                  { value: "neutral" as ReaderThemeMode, title: readerThemeLabels.neutral },
                  { value: "sepia" as ReaderThemeMode, title: readerThemeLabels.sepia },
                  { value: "ink" as ReaderThemeMode, title: readerThemeLabels.ink },
                  { value: "black" as ReaderThemeMode, title: readerThemeLabels.black },
                  { value: "jade" as ReaderThemeMode, title: readerThemeLabels.jade },
                  { value: "ceramic" as ReaderThemeMode, title: readerThemeLabels.ceramic },
                  { value: "crimson" as ReaderThemeMode, title: readerThemeLabels.crimson },
                  { value: "nes" as ReaderThemeMode, title: readerThemeLabels.nes },
                  { value: "famicom" as ReaderThemeMode, title: readerThemeLabels.famicom },
                  { value: "snes" as ReaderThemeMode, title: readerThemeLabels.snes },
                  { value: "super-famicom" as ReaderThemeMode, title: readerThemeLabels["super-famicom"] },
                ]).map((theme) => (
                  <button
                    key={theme.value}
                    type="button"
                    className={`reader-theme-option ${readerTheme === theme.value ? "is-selected" : ""}`}
                    onClick={() => handleSetReaderTheme(theme.value)}
                    aria-pressed={readerTheme === theme.value}
                  >
                    <span className="reader-theme-option-swatch" data-theme={theme.value} aria-hidden="true" />
                    <span className="reader-theme-option-body">
                      <strong>{theme.title}</strong>
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <section className="reader-options-section" data-inventory-id="reader.lookup-fallback-section">
              <div className="reader-options-section-head">
                <div>
                  <span className="eyebrow">Lookup fallback</span>
                  <h3>Google Cloud Translation</h3>
                </div>
                <button
                  type="button"
                  className={`button button-secondary button-compact ${readerGoogleTranslateFallback ? "is-active" : ""}`}
                  onClick={() => setReaderGoogleTranslateFallback((value) => !value)}
                  aria-pressed={readerGoogleTranslateFallback}
                  aria-label={readerGoogleTranslateFallback ? "Disable Google translation fallback" : "Enable Google translation fallback"}
                >
                  {readerGoogleTranslateFallback ? "On" : "Off"}
                </button>
              </div>
              <p className="small-copy">
                When the local Korean lexicon misses a token, the reader can ask Google Cloud Translation for an English fallback and cache the result locally.
                Korean romanization still comes from the local Hangul reading path.
              </p>
              <p className="small-copy">
                Requires the API to be configured with `GOOGLE_APPLICATION_CREDENTIALS` pointing at a Google service account JSON key file.
              </p>
              <div className="reader-google-translate-usage" aria-live="polite" aria-label="Google translation usage summary">
                <div className="reader-google-translate-usage-head">
                  <div>
                    <span className="eyebrow">Usage so far</span>
                    <h4>Current month</h4>
                  </div>
                  <span className="pill">Basic NMT</span>
                </div>
                <div className="reader-usage-grid">
                  <div className="reader-usage-metric">
                    <span className="eyebrow">Characters</span>
                    <strong>{googleTranslateUsageLoading ? "..." : googleTranslateUsage?.character_count.toLocaleString() ?? "0"}</strong>
                    <span className="small-copy">sent to Google this month</span>
                  </div>
                  <div className="reader-usage-metric">
                    <span className="eyebrow">Free left</span>
                    <strong>{googleTranslateUsageLoading ? "..." : googleTranslateUsage?.free_remaining_characters.toLocaleString() ?? "0"}</strong>
                    <span className="small-copy">before billing starts</span>
                  </div>
                  <div className="reader-usage-metric">
                    <span className="eyebrow">Requests</span>
                    <strong>{googleTranslateUsageLoading ? "..." : googleTranslateUsage?.request_count.toLocaleString() ?? "0"}</strong>
                    <span className="small-copy">fallback lookups that reached Google</span>
                  </div>
                  <div className="reader-usage-metric">
                    <span className="eyebrow">Estimated cost</span>
                    <strong>{googleTranslateUsageLoading ? "..." : formatCurrencyUsd(googleTranslateUsage?.estimated_cost_usd ?? 0)}</strong>
                    <span className="small-copy">
                      {googleTranslateUsageLoading
                        ? "Loading usage summary."
                        : googleTranslateUsage?.billable_characters
                          ? `${googleTranslateUsage.billable_characters.toLocaleString()} billable characters at $${googleTranslateUsage.billing_rate_per_million_usd.toFixed(2)} / million.`
                          : `Free tier covers the current ${googleTranslateUsage?.month_key ?? "month"} usage.`}
                    </span>
                  </div>
                </div>
                <p className="small-copy">
                  Cached dictionary hits do not add to this total. Only lookups that actually reached Google are counted here.
                </p>
              </div>
            </section>
            <section className="reader-options-section reader-tools-panel" data-inventory-id="reader.tools-card">
              <div className="reader-options-section-head">
                <div>
                  <span className="eyebrow">Reader tools</span>
                  <h3>Collapsed utilities</h3>
                </div>
                <span className="small-copy">Book frequency, dictionary wiring, reading profile, page image, and navigation.</span>
              </div>
              <div className="reader-tools-grid">
                <section className="reader-tool-section" data-inventory-id="reader.sentence-hsk-chart">
                  <div className="reader-tool-section-head">
                    <h3>Sentence HSK chart</h3>
                  </div>
                  <ReaderHskChart tokens={displayedSentenceTokens} />
                </section>

                <section className="reader-tool-section">
                  <div className="reader-tool-section-head">
                    <h3>Page image</h3>
                  </div>
                  <p className="small-copy">Keep the scan hidden while you focus on the sentence, or open it when you need the source page.</p>
                  <button
                    type="button"
                    className="button button-secondary button-compact"
                    onClick={() => setShowPageImage((value) => !value)}
                  >
                    {showPageImage ? "Hide page image" : "Show page image"}
                  </button>
                </section>

                <section className="reader-tool-section" data-inventory-id="reader.book-frequency-card">
                  <div className="reader-tool-section-head">
                    <h3>Book frequency</h3>
                    <span className="small-copy">Source: <strong>{extractionSourceLabel}</strong></span>
                  </div>
                  {summaryLoading ? (
                    <LoadingSkeleton label="Loading book frequency" />
                  ) : summary ? (
                    <ul className="frequency-list">
                      {summary.lexical_entries.slice(0, 10).map((entry) => (
                        <li key={entry.lemma}>
                          <strong>{entry.display_form}</strong>
                          <span>{entry.frequency_in_book}x</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="small-copy">Book frequency data is not available for this extraction.</p>
                  )}
                </section>

                <section className="reader-tool-section" data-inventory-id="reader.dictionary-card">
                  <div className="reader-tool-section-head">
                    <h3>Dictionary wiring</h3>
                  </div>
                  <p className="small-copy">
                    This panel is ready for your dictionary files and HSK lists. Once those are imported, token clicks can resolve to the full lexicon instead of only book frequency.
                  </p>
                  <p className="small-copy">For now, the reader uses book extraction metadata so the page still behaves like a reading surface instead of a card wall.</p>
                </section>

                <section className="reader-tool-section" data-inventory-id="reader.reading-profile-card">
                  <div className="reader-tool-section-head">
                    <h3>Reading profile</h3>
                  </div>
                  <p className="small-copy">The local profile records sessions, sentence dwell time, and token exposures without a cloud account.</p>
                  <div className="profile-metrics">
                    <div>
                      <span className="eyebrow">Sentences</span>
                      <strong>{profileLoading ? <span className="skeleton-line skeleton-line-short" aria-hidden="true" /> : profileSummary?.sentence_reads ?? 0}</strong>
                    </div>
                    <div>
                      <span className="eyebrow">Words</span>
                      <strong>{profileLoading ? <span className="skeleton-line skeleton-line-short" aria-hidden="true" /> : profileSummary?.unique_words_seen ?? 0}</strong>
                    </div>
                    <div>
                      <span className="eyebrow">Chars</span>
                      <strong>{profileLoading ? <span className="skeleton-line skeleton-line-short" aria-hidden="true" /> : profileSummary?.unique_characters_seen ?? 0}</strong>
                    </div>
                  </div>
                  <div className="profile-metrics profile-metrics-secondary">
                    <div>
                      <span className="eyebrow">Avg sec/char</span>
                      <strong>{profileSummary?.average_seconds_per_character?.toFixed(2) ?? "—"}</strong>
                    </div>
                    <div>
                      <span className="eyebrow">Avg sec/word</span>
                      <strong>{profileSummary?.average_seconds_per_word?.toFixed(2) ?? "—"}</strong>
                    </div>
                    <div>
                      <span className="eyebrow">Today</span>
                      <strong>{profileSummary?.today_sentence_reads ?? 0}</strong>
                    </div>
                  </div>
                  <p className="small-copy">
                    {sessionReady ? "A local reading session is active for this book." : "Opening a book starts a session automatically."}
                  </p>
                  {syncStatus !== "idle" ? (
                    <p className="small-copy" role="status" aria-live="polite">
                      {syncStatus === "syncing" ? "Syncing learner progress..." : null}
                      {syncStatus === "synced" ? "Learner progress synced." : null}
                      {syncStatus === "pending" ? "Sync pending; local progress is safe and will retry." : null}
                      {syncStatus === "error" ? "Sync unavailable; local progress is safe." : null}
                    </p>
                  ) : null}
                </section>

                <section className="reader-tool-section">
                  <div className="reader-tool-section-head">
                    <h3>Page navigation</h3>
                  </div>
                  <div className="button-row">
                    {pageNumber > 1 ? (
                      <Link className="button button-secondary button-compact" href={`/reader/${bookId}/${pageNumber - 1}`}>
                        Previous page
                      </Link>
                    ) : null}
                    {totalPages !== null && pageNumber < totalPages ? (
                      <Link className="button button-secondary button-compact" href={`/reader/${bookId}/${pageNumber + 1}`}>
                        Next page
                      </Link>
                    ) : null}
                  </div>
                </section>
              </div>
            </section>
          </section>
        </>
      ) : null}

      {loading ? <ReaderLoadingSkeleton /> : null}
      {error ? (
        <div className="card error-card" role="alert">
          <h2>Reader unavailable</h2>
          <p>{error}</p>
          <button type="button" className="button button-secondary" onClick={() => setRefreshNonce((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : null}
      {extractError ? <div className="card error-card">{extractError}</div> : null}

      {pageData && page ? (
        <div className="reader-layout">
          <article className="card reader-page" data-inventory-id="reader.page-card">
            {showPageImage ? (
              <div className="reader-page-image">
                <Image
                  src={imageUrl}
                  alt={`Page ${pageNumber} image`}
                  fill
                  sizes="(max-width: 900px) 100vw, 70vw"
                  unoptimized
                />
              </div>
            ) : null}

            <div
              className="reader-page-text"
              aria-label="Reflowed page text"
              onTouchStart={handleSentenceTouchStart}
              onTouchEnd={handleSentenceTouchEnd}
            >
              <div className="reader-sentence-chrome">
                <div className="reader-sentence-pager" aria-label="Sentence navigation">
                  <button
                    type="button"
                    className="button button-secondary button-compact reader-pager-button"
                    onClick={() => focusSentence(selectedSentenceIndex - 1)}
                    disabled={!canMoveToPreviousSentence}
                    aria-label="Previous sentence"
                    title="Previous sentence"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <span className="page-pill reader-sentence-pill">
                    <span className="reader-bookmark-segment reader-page-bookmark-segment">
                      <button
                        type="button"
                        className={`reader-bookmark-mark ${readerPageBookmarked ? "is-active" : ""}`}
                        onClick={handleTogglePageBookmark}
                        disabled={!pageData}
                        aria-pressed={readerPageBookmarked}
                        aria-label={readerPageBookmarked ? "Remove page bookmark" : "Save page bookmark"}
                        title={readerPageBookmarked ? "Remove page bookmark" : "Save page bookmark"}
                        data-inventory-id="reader.page-bookmark"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={readerPageBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M6 3h12v18l-6-4-6 4V3z" />
                        </svg>
                      </button>
                      <span>{pagePillLabel}</span>
                    </span>
                    <span aria-hidden="true">|</span>
                    <span className="reader-bookmark-segment reader-sentence-bookmark-segment">
                      <span>{sentencePillLabel}</span>
                      <button
                        type="button"
                        className={`reader-bookmark-mark ${readerSentenceBookmarked ? "is-active" : ""}`}
                        onClick={handleToggleSentenceBookmark}
                        disabled={!activeSentence}
                        aria-pressed={readerSentenceBookmarked}
                        aria-label={readerSentenceBookmarked ? "Remove sentence bookmark" : "Save sentence bookmark"}
                        title={readerSentenceBookmarked ? "Remove sentence bookmark" : "Save sentence bookmark"}
                        data-inventory-id="reader.sentence-bookmark"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={readerSentenceBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M6 3h12v18l-6-4-6 4V3z" />
                        </svg>
                      </button>
                    </span>
                  </span>
                  <button
                    type="button"
                    className="button button-secondary button-compact reader-pager-button"
                    onClick={() => focusSentence(selectedSentenceIndex + 1)}
                    disabled={!canMoveToNextSentence}
                    aria-label="Next sentence"
                    title="Next sentence"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>
                <div className="reader-session-stats" aria-label="Current session stats">
                  <span className="session-pill reader-session-pill">
                    <strong>{sessionLabel}</strong>
                    <span>· {formatElapsed(activeSeconds)}</span>
                    <span>· {selectedSentenceCharacterCount} chars</span>
                    <span>· {selectedSentenceTokenCount} words</span>
                  </span>
                </div>
                </div>
                <div className={`reader-sentence-tools ${readerSupportsCharacterMode ? "has-token-mode" : ""}`} aria-label="Sentence display, translation, and source controls">
                  {readerSupportsCharacterMode ? (
                    <button
                      type="button"
                      className={`button button-secondary button-compact reader-sentence-tool-button token-mode-toggle ${effectiveReaderTokenMode === "character" ? "is-active" : ""}`}
                      onClick={handleToggleReaderTokenMode}
                      disabled={!pageData}
                      aria-pressed={effectiveReaderTokenMode === "character"}
                      aria-label={effectiveReaderTokenMode === "character" ? "Switch to word mode" : "Switch to character mode"}
                      title={effectiveReaderTokenMode === "character" ? "Switch to word mode" : "Switch to character mode"}
                      data-inventory-id="reader.token-mode-button"
                    >
                      {effectiveReaderTokenMode === "character" ? "Char" : "Word"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`button button-secondary button-compact reader-sentence-tool-button ${sentenceAudioPlaying ? "is-active" : ""}`}
                    onClick={handlePlaySentenceAudio}
                    disabled={!activeSentence}
                    aria-pressed={sentenceAudioPlaying}
                    aria-label={sentenceAudioPlaying ? "Stop sentence audio" : "Play sentence audio"}
                    title={sentenceAudioPlaying ? "Stop sentence audio" : "Play sentence audio"}
                    data-inventory-id="reader.sentence-audio-button"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M11 5 6 9H3v6h3l5 4z" />
                      <path d="M16 9a4 4 0 0 1 0 6" />
                      <path d="M19 6a8 8 0 0 1 0 12" />
                    </svg>
                    <span>{sentenceAudioPlaying ? "Stop" : "Audio"}</span>
                  </button>
                  <button
                    type="button"
                    className={`button button-secondary button-compact reader-sentence-tool-button ${showSentenceTranslation ? "is-active" : ""}`}
                    onClick={() => void handleToggleSentenceTranslation()}
                    disabled={sentenceTranslationLoading}
                    aria-pressed={showSentenceTranslation}
                    aria-label="Toggle sentence translation"
                    title="Toggle sentence translation"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 6h9" />
                      <path d="M4 11h11" />
                      <path d="M4 16h8" />
                      <path d="M14 4l6 6-6 6" />
                    </svg>
                    <span>{sentenceTranslationLoading ? "Loading…" : "Translation"}</span>
                  </button>
                  <button
                    type="button"
                    className={`button button-secondary button-compact reader-sentence-tool-button ${showSourceSentence ? "is-active" : ""}`}
                    onClick={() => setShowSourceSentence((value) => !value)}
                    aria-pressed={showSourceSentence}
                    aria-label="Toggle source sentence"
                    title="Toggle source sentence"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 3h9l3 3v15H6z" />
                      <path d="M15 3v3h3" />
                    </svg>
                    <span>Source</span>
                  </button>
                </div>
                <div className="reader-audio-speed-control" data-inventory-id="reader.sentence-audio-speed">
                  <span className="reader-audio-speed-label">Audio speed</span>
                  <div className="reader-audio-speed-options" role="group" aria-label="Sentence audio speed">
                    {sentenceAudioRateOptions.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        className={`reader-audio-speed-option ${sentenceAudioRate === rate ? "is-active" : ""}`}
                        onClick={() => setSentenceAudioRate(rate)}
                        aria-pressed={sentenceAudioRate === rate}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sentence-row" aria-label={`Sentence ${selectedSentencePosition || 1}`}>
                {displayedSentenceTokens.map((token) => {
                  const isSelected = selectedToken?.surface_form === token.surface_form && selectedToken?.order === token.order;
                  const isAudioActive = sentenceAudioPlaying && sentenceAudioTokenOrder === token.order;
                  const languageCode = pageData?.book.language_code ?? null;
                  const tokenStudyItem = getStudyVocabularyItem(token);
                  const tokenReadingParts = buildTokenReadingParts(token, languageCode, tokenPronunciationOverrides[token.order] ?? null);
                  const isTokenPronunciationMuted =
                    readerPronunciationFreshOnly && !studySurfaceLoading && !isFreshStudyItem(tokenStudyItem) && tokenReadingParts.length > 0;
                  const tokenSurfaceParts = languageCode?.startsWith("ko") ? splitKoreanParticleChain(token.surface_form) : [];
                  const isPunctuation = isSentencePunctuation(token.surface_form);
                  const tokenClassName = `token-inline ${isSelected ? "is-selected" : ""} ${isAudioActive ? "is-audio-active" : ""} ${isPunctuation ? "is-punct" : ""} ${isCjkToken(token.surface_form) ? "is-cjk" : "is-word"}`;

                  return (
                    <button
                      key={`${selectedSentencePosition || 1}-${token.order}-${token.surface_form}`}
                      type="button"
                      className={tokenClassName}
                      onClick={() => {
                        setLexiconLoading(true);
                        setLexiconResult(null);
                        setSelectedToken(token);
                        setSelectedSentenceOrder(activeSentence?.order ?? selectedSentenceOrder);
                        setSelectedTokenSaved(false);
                        if (readerTokenAudioOnTap && !isSentencePunctuation(token.surface_form)) {
                          playWordAudio(token);
                        }
                        void saveSelectedTokenToStudyList(token, activeSentence);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setLexiconLoading(true);
                          setLexiconResult(null);
                          setSelectedToken(token);
                          setSelectedSentenceOrder(activeSentence?.order ?? selectedSentenceOrder);
                          setSelectedTokenSaved(false);
                          if (readerTokenAudioOnTap && !isSentencePunctuation(token.surface_form)) {
                            playWordAudio(token);
                          }
                          void saveSelectedTokenToStudyList(token, activeSentence);
                        }
                      }}
                      aria-label={`Inspect ${token.surface_form}${isAudioActive ? " (currently speaking)" : ""}`}
                      aria-current={isAudioActive ? "true" : undefined}
                    >
                      <span className={`token-reading ${isTokenPronunciationMuted ? "is-muted" : ""}`}>
                        {isPunctuation ? (
                          "\u00A0"
                        ) : tokenReadingParts.length > 0 ? (
                          <span className="token-reading-segments" aria-label={tokenReadingParts.map((part) => part.text).join(" ")}>
                            {tokenReadingParts.map((part, index) => (
                              <span
                                key={`${selectedSentencePosition || 1}-${token.order}-${index}-${part.text}`}
                                className={`token-reading-part ${part.kind === "particle" ? "is-particle" : ""}`}
                                title={part.gloss ?? undefined}
                              >
                                <span className="token-reading-part-text">{part.text || "\u00A0"}</span>
                              </span>
                            ))}
                          </span>
                        ) : (
                          "\u00A0"
                        )}
                      </span>
                      <span className="token-surface">
                        {tokenSurfaceParts.length > 1 ? (
                          <span className="token-surface-segments" aria-hidden="true">
                            {tokenSurfaceParts.map((part, index) => (
                              <span
                                key={`${selectedSentencePosition || 1}-${token.order}-surface-${index}-${part}`}
                                className={`token-surface-part ${index > 0 ? "is-particle" : ""}`}
                              >
                                <span className="token-surface-part-text">{part || "\u00A0"}</span>
                              </span>
                            ))}
                          </span>
                        ) : (
                          token.surface_form
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
                {showSourceSentence && activeSentence ? (
                  <div className="reader-source-sentence-card" data-inventory-id="reader.source-sentence">
                    <span className="eyebrow">Source sentence</span>
                    <p className="reader-source-sentence-text">{activeSentence.text}</p>
                  </div>
                ) : null}
                {showSentenceTranslation ? (
                  <div className="reader-sentence-translation-card" data-inventory-id="reader.sentence-translation">
                    <div className="reader-sentence-translation-meta">
                      <span className="eyebrow">Translation</span>
                      {getSentenceTranslationSourceLabel() ? <span className="pill reader-sentence-source-pill">{getSentenceTranslationSourceLabel()}</span> : null}
                    </div>
                    {sentenceTranslationLoading && !sentenceTranslationLoaded ? (
                      <p className="sentence-translation">Loading translation…</p>
                    ) : (
                      <p className="sentence-translation">{activeSentence?.translation?.trim() || pageTranslation || "Translation unavailable."}</p>
                    )}
                  </div>
                ) : null}
              </div>

            {selectedToken ? (
              <div className="definition-popover" data-inventory-id="reader.token-inspector" role="status" aria-live="polite">
                <div className="sheet-handle" aria-hidden="true" />
                <div className="definition-popover-topline">
                  <div className="definition-token-heading">
                    <h3 className="definition-headword">
                      {selectedTokenSurfaceParts.length > 1 ? (
                        <span className="definition-headword-reading" aria-label={selectedTokenSurfaceParts.join(" ")}>
                          {selectedTokenSurfaceParts.map((part, index) => (
                            <span
                              key={`${selectedToken?.order ?? 0}-headword-${index}-${part}`}
                              className={`definition-headword-reading-part ${index > 0 ? "is-particle" : ""}`}
                            >
                              <span className="definition-headword-reading-text">{part}</span>
                            </span>
                          ))}
                        </span>
                      ) : (
                        selectedToken?.surface_form ?? tokenLabel
                      )}
                    </h3>
                    <div className="definition-meta">
                      {selectedTokenPronunciationLine ? (
                        <span className="definition-meta-reading-line" aria-label={selectedTokenPronunciationLine}>
                          {selectedTokenReadingParts.map((part, index) => (
                            <span
                              key={`${selectedToken?.order ?? 0}-meta-${index}-${part.text}`}
                              className={`definition-meta-reading ${part.kind === "particle" ? "is-particle" : ""}`}
                            >
                              <span className="definition-meta-reading-text">{part.text}</span>
                            </span>
                          ))}
                        </span>
                      ) : tokenPinyin ? (
                        <span>{tokenPinyin}</span>
                      ) : null}
                      {tokenHskLabel !== "—" ? <span className="pill">{tokenHskLabel}</span> : null}
                      {tokenSourceLabel ? <span className="pill definition-source-pill">{tokenSourceLabel}</span> : null}
                    </div>
                  </div>
                  <div className="definition-actions">
                    <button
                      type="button"
                      className={`definition-audio ${selectedTokenAudioPlaying ? "is-active" : ""}`}
                      data-inventory-id="reader.word-audio-button"
                      onClick={() => void handlePlaySelectedTokenAudio()}
                      disabled={!selectedToken || isSentencePunctuation(selectedToken.surface_form)}
                      aria-pressed={selectedTokenAudioPlaying}
                      aria-label={selectedTokenAudioPlaying ? "Stop word audio" : "Play word audio"}
                      title={selectedTokenAudioPlaying ? "Stop word audio" : "Play word audio"}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={selectedTokenAudioPlaying ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M11 5 6 9H3v6h3l5 4z" />
                        <path d="M16 9a4 4 0 0 1 0 6" />
                        <path d="M19 6a8 8 0 0 1 0 12" />
                      </svg>
                      <span>{selectedTokenAudioPlaying ? "Stop" : "Audio"}</span>
                    </button>
                    <button
                      type="button"
                      className={`definition-save ${selectedTokenSaved ? "is-saved" : ""}`}
                      data-inventory-id="reader.study-save-button"
                      onClick={() => {
                        if (selectedToken) {
                          void saveSelectedTokenToStudyList(selectedToken, activeSentence);
                        }
                      }}
                      aria-pressed={selectedTokenSaved}
                      aria-label={selectedTokenSaved ? "Saved to study list" : "Save to study list"}
                      title={selectedTokenSaved ? "Saved to study list" : "Save to study list"}
                    >
                      {selectedTokenSaved ? "Saved" : "Save"}
                    </button>
                  </div>
                </div>
                {selectedTokenReadingDisplayParts.length > 1 ? (
                  <div
                    className="definition-segments"
                    aria-label={pageData?.book.language_code?.startsWith("ru") ? "Russian reading breakdown" : "Korean particle breakdown"}
                  >
                    {pageData?.book.language_code?.startsWith("ru") ? (
                      <button
                        type="button"
                        className={`definition-segment-toggle ${readerRussianSyllableDisplayMode === "original" ? "is-active" : ""}`}
                        onClick={() =>
                          setReaderRussianSyllableDisplayMode((mode) => (mode === "original" ? "romanization" : "original"))
                        }
                        aria-pressed={readerRussianSyllableDisplayMode === "original"}
                        aria-label={
                          readerRussianSyllableDisplayMode === "original"
                            ? "Show romanized syllables"
                            : "Show original Cyrillic syllables"
                        }
                        title={
                          readerRussianSyllableDisplayMode === "original"
                            ? "Show romanized syllables"
                            : "Show original Cyrillic syllables"
                        }
                      >
                        {readerRussianSyllableDisplayMode === "original" ? "Original" : "Romanization"}
                      </button>
                    ) : null}
                    {selectedTokenReadingDisplayParts.map((part, index) => {
                      const speechText = part.surface.trim() || part.text.trim();
                      return (
                        <button
                          key={`${selectedToken?.order ?? 0}-${index}-${part.text}`}
                          type="button"
                          className={`definition-segment ${part.kind === "particle" ? "is-particle" : ""} ${
                            selectedTokenSegmentAudioPlaying && selectedTokenSegmentAudioText === speechText ? "is-audio-active" : ""
                          }`}
                          onClick={() => playDefinitionSegmentAudio(part)}
                          title={part.gloss ?? undefined}
                          aria-label={`Play syllable audio for ${speechText}`}
                          aria-pressed={selectedTokenSegmentAudioPlaying && selectedTokenSegmentAudioText === speechText}
                        >
                          <span className="definition-segment-reading">{part.text}</span>
                          {part.gloss ? <span className="definition-segment-gloss">{part.gloss}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {lexiconLoading ? (
                  <LoadingSkeleton label="Loading dictionary entry" className="definition-loading" />
                ) : (
                  <p className="definition-copy">{tokenDefinition || "Definition unavailable."}</p>
                )}
                <details className="definition-trace">
                  <summary>
                    <span className="eyebrow">Definition trace</span>
                    <span className="small-copy">{definitionLookupTrace.length ? `${definitionLookupTrace.length} steps` : "No lookup trace yet"}</span>
                  </summary>
                  {definitionLookupTrace.length ? (
                    <ol className="definition-trace-list">
                      {definitionLookupTrace.map((step, index) => (
                        <li key={`${selectedToken?.order ?? 0}-trace-${index}`}>{step}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="small-copy">Select a token to see the lookup path, API response count, and fallback decision.</p>
                  )}
                </details>
              </div>
            ) : (
              <div className="definition-popover definition-empty">
                <div className="sheet-handle" aria-hidden="true" />
                <span className="eyebrow">Tap a character or word</span>
                <p>When you click text, the lookup panel will stay in view while the page remains readable.</p>
              </div>
            )}
          </article>
        </div>
      ) : pageData ? (
        <div className="card empty-state" role={extractionInProgress ? "status" : undefined} aria-live={extractionInProgress ? "polite" : undefined}>
          {extractionInProgress ? (
            <>
              <h2>Preparing page text</h2>
              <LoadingSkeleton label="Loading page extraction" />
              <p>TextPlex is extracting this book in the background. This page will become readable when sentence data is ready.</p>
            </>
          ) : (
            <>
              <h2>Page text is not available yet</h2>
              <p>This page image is ready, but structured extraction has not produced readable sentence data for it.</p>
            </>
          )}
          {needsExtraction && !extractionInProgress ? (
            <div className="button-row">
              <button type="button" className="button button-primary" onClick={() => void handleExtractNow()} disabled={extracting || loading}>
                {extracting ? "Extracting..." : "Extract now"}
              </button>
              <Link className="button button-secondary" href={`/books/${bookId}`}>
                Back to book detail
              </Link>
            </div>
          ) : null}
          {!needsExtraction ? (
            <div className="button-row">
              <button type="button" className="button button-secondary" onClick={() => void handleExtractNow()} disabled={extracting || loading}>
                {extracting ? "Refreshing..." : "Refresh extraction"}
              </button>
              <Link className="button button-secondary" href={`/books/${bookId}`}>
                Back to book detail
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
      {bookmarkToast ? (
        <div className="reader-bookmark-toast" role="status" aria-live="polite" data-inventory-id="reader.bookmark-toast">
          {bookmarkToast}
        </div>
      ) : null}
      </div>
    </section>
  );
}

function isCjkToken(value: string): boolean {
  return /[\u3400-\u4dbf\u4e00-\u9fff]/.test(value);
}

function isSentencePunctuation(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length === 0 || /^[\s.,!?;:，。！？；：、…“”‘’（）()《》〈〉【】\[\]\-—]+$/.test(trimmed);
}

function countReadableCharacters(value: string): number {
  return Array.from(value).filter((character) => !isSentencePunctuation(character)).length;
}

function formatLevelTag(value: string | number | null | undefined): string {
  const text = String(value ?? "").trim();
  if (!text) {
    return "—";
  }

  const normalized = text.replace(/^HSK\s*/i, "").trim();
  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    return `HSK ${normalized}`;
  }

  if (/^HSK\s+\d+(?:\.\d+)?$/i.test(text)) {
    return text.replace(/\s+/g, " ").replace(/^hsk/i, "HSK");
  }

  return text;
}
