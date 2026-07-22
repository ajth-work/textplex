"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import {
  fetchJson,
  formatElapsed,
  postJson,
  resolveResourceUrl,
  triggerBookExtraction,
  isDemoMode,
  type BookExtractionResult,
  type BookReaderPageResponse,
  type LearningProfileSummary,
  type LexicalEntryResult,
  type LexiconLookupResponse,
  type PageReadRecord,
  type ReadingSessionRecord,
  type SentenceReadCreateRequest,
  type SentenceReadRecord,
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
type ReaderFontMode = "mixed" | "serif" | "sans";
type ReaderThemeMode = AppTheme;
type ReaderTextSizeMode = "small" | "medium" | "large";

const readerFontStorageKey = "textplex.readerFont";
const readerTextSizeStorageKey = "textplex.readerTextSize";
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
const readerThemeLabels: Record<ReaderThemeMode, string> = appThemeLabels;
const readerTextSizeScales: Record<ReaderTextSizeMode, number> = {
  small: 0.92,
  medium: 1,
  large: 1.1,
};

const readerVocabularyStoragePrefix = "textplex.readerVocabulary:";

function resolveReaderFont(value: string | null | undefined): ReaderFontMode {
  return value === "serif" || value === "sans" || value === "mixed" ? value : "mixed";
}

function resolveReaderTextSize(value: string | null | undefined): ReaderTextSizeMode {
  return value === "small" || value === "large" || value === "medium" ? value : "medium";
}

const pinyinSyllablePattern = /^(?:(?:zh|ch|sh)|[bpmfdtnlgkhjqxrzcsyw])?(?:a|ai|an|ang|ao|e|ei|en|eng|er|o|ong|ou|i|ia|ian|iang|iao|ie|in|ing|iong|iu|u|ua|uai|uan|uang|ue|ui|un|uo|v|ve|van|vn)$/;
const pinyinSeparatorPattern = /[\s'’\-.0-9]/u;

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

function resolveEntry(summary: BookExtractionResult | null, token: TokenResult | null): LexicalEntryResult | null {
  if (!summary || !token) {
    return null;
  }
  const key = token.lemma ?? token.surface_form;
  return summary.lexical_entries.find((entry) => entry.lemma === key) ?? null;
}

function resolveReaderTokenMode(value: string | null | undefined): ReaderTokenMode {
  return value === "character" ? "character" : "word";
}

function shouldExpandTokenIntoCharacters(surface: string): boolean {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(surface) && Array.from(surface).length > 1;
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

function buildReaderDisplayTokens(sentence: { tokens?: TokenResult[] } | null | undefined, mode: ReaderTokenMode): TokenResult[] {
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

    const characters = Array.from(surface);
    const readings = splitRomanizationByCharacters(token.romanization ?? token.pronunciation ?? "", characters.length);
    characters.forEach((character, characterIndex) => {
      displayTokens.push({
        ...token,
        order: (token.order ?? displayTokens.length + 1) * 100 + characterIndex + 1,
        surface_form: character,
        lemma: character,
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
  const [pageData, setPageData] = useState<BookReaderPageResponse | null>(null);
  const [summary, setSummary] = useState<BookExtractionResult | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenResult | null>(null);
  const [selectedSentenceOrder, setSelectedSentenceOrder] = useState<number | null>(null);
  const [showPageImage, setShowPageImage] = useState(false);
  const [showReaderOptions, setShowReaderOptions] = useState(false);
  const [readerTokenMode, setReaderTokenMode] = useState<ReaderTokenMode>("word");
  const [readerFont, setReaderFont] = useState<ReaderFontMode>("mixed");
  const [readerTheme, setReaderTheme] = useState<ReaderThemeMode>("neutral");
  const [readerTextSize, setReaderTextSize] = useState<ReaderTextSizeMode>("medium");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [profileSummary, setProfileSummary] = useState<LearningProfileSummary | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [lexiconResult, setLexiconResult] = useState<LexiconLookupResponse | null>(null);
  const [lexiconLoading, setLexiconLoading] = useState(false);
  const [selectedTokenSaved, setSelectedTokenSaved] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [sentenceActiveSeconds, setSentenceActiveSeconds] = useState(0);
  const sessionIdRef = useRef<string | null>(null);
  const activeSecondsRef = useRef(0);
  const sentenceActiveSecondsRef = useRef(0);
  const sentenceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setReaderTokenMode(resolveReaderTokenMode(window.localStorage.getItem("textplex.readerTokenMode")));
    setReaderFont(resolveReaderFont(window.localStorage.getItem(readerFontStorageKey)));
    setReaderTheme(readStoredAppTheme() ?? "neutral");
    setReaderTextSize(resolveReaderTextSize(window.localStorage.getItem(readerTextSizeStorageKey)));
  }, []);

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
    let active = true;

    async function loadLexicon() {
      if (!pageData || !selectedToken) {
        if (active) {
          setLexiconResult(null);
          setLexiconLoading(false);
        }
        return;
      }

      if (active) {
        setLexiconLoading(true);
        setLexiconResult(null);
      }

      try {
        const lookup = await fetchJson<LexiconLookupResponse>(
          `/lexicon/lookup?language_code=${encodeURIComponent(pageData.book.language_code)}&term=${encodeURIComponent(selectedToken.surface_form)}`,
        );
        if (active) {
          setLexiconResult(lookup);
        }
      } catch {
        if (active) {
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
  }, [pageData, selectedToken]);

  useEffect(() => {
    if (!selectedToken) {
      setSelectedTokenSaved(false);
      return;
    }

    const key = `${readerVocabularyStoragePrefix}${bookId}:${selectedToken.lemma ?? selectedToken.surface_form}`;
    setSelectedTokenSaved(window.localStorage.getItem(key) === "saved");
  }, [bookId, selectedToken]);

  useEffect(() => {
    let active = true;

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
  const tokenEntry = resolveEntry(summary, selectedToken);
  const lexiconEntry = lexiconResult?.entries[0] ?? null;
  const imageUrl = pageData ? resolveResourceUrl(pageData.image_url) : "";
  const totalPages = pageData?.book.total_pages ?? summary?.page_end ?? null;
  const pageTranslation = page?.page_translation?.trim() || null;
  const selectedSentence = useMemo(
    () => (page ? page.sentences.find((sentence) => sentence.order === selectedSentenceOrder) ?? null : null),
    [page, selectedSentenceOrder],
  );
  const displayedSentenceTokens = useMemo(
    () => buildReaderDisplayTokens(selectedSentence, readerTokenMode),
    [selectedSentence, readerTokenMode],
  );

  useEffect(() => {
    if (page?.sentences.length && selectedSentenceOrder == null) {
      setSelectedSentenceOrder(page.sentences[0].order);
    }
  }, [page?.sentences, selectedSentenceOrder]);

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
  const tokenPinyin = lexiconEntry?.pinyin ?? selectedToken?.romanization ?? null;
  const tokenHsk = lexiconEntry?.hsk_level ?? selectedToken?.proficiency_level ?? null;
  const tokenHskLabel = formatLevelTag(tokenHsk);
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
  const selectedSentenceTokenLabel = readerTokenMode === "character" ? "chars" : "words";

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
    setReaderTokenMode((mode) => {
      const nextMode = mode === "character" ? "word" : "character";
      window.localStorage.setItem("textplex.readerTokenMode", nextMode);
      return nextMode;
    });
    setSelectedToken(null);
  }

  function handleToggleReaderFont() {
    setReaderFont((mode) => {
      const nextMode: ReaderFontMode = mode === "mixed" ? "serif" : mode === "serif" ? "sans" : "mixed";
      window.localStorage.setItem(readerFontStorageKey, nextMode);
      return nextMode;
    });
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

  function handleToggleSelectedTokenSaved() {
    if (!selectedToken) {
      return;
    }

    const key = `${readerVocabularyStoragePrefix}${bookId}:${selectedToken.lemma ?? selectedToken.surface_form}`;
    setSelectedTokenSaved((saved) => {
      const nextSaved = !saved;
      if (nextSaved) {
        window.localStorage.setItem(key, "saved");
      } else {
        window.localStorage.removeItem(key);
      }
      return nextSaved;
    });
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

  return (
    <section
      className={`reader-shell reader-font-${readerFont}`}
      data-reader-font={readerFont}
      data-reader-theme={readerTheme}
      data-reader-text-size={readerTextSize}
      style={{ "--reader-text-scale": readerTextSizeScales[readerTextSize] } as CSSProperties}
    >
      <header className="reader-topbar card" data-inventory-id="reader.header">
        <div className="reader-topbar-main">
          <div>
            <span className="eyebrow">Reader</span>
            <h1>{pageData?.book.title ?? (loading ? <span className="skeleton-line skeleton-line-title" aria-hidden="true" /> : "Reader unavailable")}</h1>
            <p className="muted">
              {loading ? <span className="skeleton-line skeleton-line-short" aria-hidden="true" /> : `Page ${pageNumber}${totalPages ? ` of ${totalPages}` : ""}`}
            </p>
            {isDemoMode ? <p className="small-copy">Demo mode is active. This reader is running from packaged sample data.</p> : null}
          </div>
          <div className="reader-topbar-actions">
            <div className="timer-chip">
              <span className="muted">Active</span>
              <strong>{formatElapsed(activeSeconds)}</strong>
            </div>
            <div className="timer-chip">
              <span className="muted">Source</span>
                <strong>{loading ? <span className="skeleton-line skeleton-line-short" aria-hidden="true" /> : extractionSourceLabel}</strong>
            </div>
            <button
              type="button"
              className={`button button-secondary button-compact token-mode-toggle ${readerTokenMode === "character" ? "is-active" : ""}`}
              onClick={handleToggleReaderTokenMode}
              disabled={!pageData}
              aria-pressed={readerTokenMode === "character"}
              aria-label={readerTokenMode === "character" ? "Switch to word mode" : "Switch to character mode"}
            >
              {readerTokenMode === "character" ? "Char" : "Word"}
            </button>
            <button
              type="button"
              className="button button-secondary button-compact font-mode-toggle"
              onClick={handleToggleReaderFont}
              disabled={!pageData}
              aria-label={`Cycle reader font. Current: ${readerFontLabels[readerFont]}`}
              title={`Reader font: ${readerFontLabels[readerFont]}`}
            >
              {readerFontLabels[readerFont]}
            </button>
            <button
              type="button"
              className={`button button-secondary button-compact options-toggle ${showReaderOptions ? "is-active" : ""}`}
              onClick={() => setShowReaderOptions((value) => !value)}
              disabled={!pageData}
              aria-expanded={showReaderOptions}
              aria-controls="reader-options-panel"
            >
              Options
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => void handleExtractNow()}
              disabled={extracting || loading || !pageData}
            >
              {extracting ? "Refreshing..." : pageData?.book.extracted_page_count ? "Refresh extraction" : "Extract now"}
            </button>
            {pageData?.book ? (
              <Link className="button button-secondary" href={`/books/${bookId}`}>
                Book detail
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {showReaderOptions ? (
        <>
          <button type="button" className="reader-options-backdrop" aria-label="Close reader options" onClick={() => setShowReaderOptions(false)} />
          <section id="reader-options-panel" className="card reader-options-panel" data-inventory-id="reader.options-dialog" aria-modal="true" role="dialog">
            <div className="card-topline">
              <div>
                <span className="eyebrow">Reader options</span>
                <h2>Fonts and themes</h2>
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
            <div className="reader-card-header">
              <div>
                <span className="eyebrow">Reading focus</span>
                <h2>Reflowed text</h2>
              </div>
              <button
                type="button"
                className="button button-secondary button-compact"
                onClick={() => setShowPageImage((value) => !value)}
              >
                {showPageImage ? "Hide page image" : "Show page image"}
              </button>
            </div>

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
            ) : (
              <div className="page-image-placeholder">
                <strong>Page image hidden</strong>
                <p className="small-copy">The PDF page stays out of the way so the reflowed text can carry the reading session.</p>
              </div>
            )}

            <div className="reading-progress-card">
              <div>
                <span className="eyebrow">Sentence focus</span>
                <h3>
                  S{selectedSentencePosition || 1}/{page.sentences.length}
                </h3>
                <p className="small-copy">
                  Active {formatElapsed(sentenceActiveSeconds)} · {selectedSentenceCharacterCount} chars · {selectedSentenceTokenCount}{" "}
                  {selectedSentenceTokenLabel}
                </p>
                <p className="small-copy">
                  Avg {selectedSentenceSecondsPerCharacter ? `${selectedSentenceSecondsPerCharacter.toFixed(2)} sec/char` : "—"} ·{" "}
                  {selectedSentenceSecondsPerToken ? `${selectedSentenceSecondsPerToken.toFixed(2)} sec/${readerTokenMode === "character" ? "char" : "word"}` : "—"}
                </p>
              </div>
              <div className="button-row button-row-tight">
                <button
                  type="button"
                  className="button button-secondary button-compact"
                  onClick={() => focusSentence((selectedSentenceIndex > 0 ? selectedSentenceIndex : 0) - 1)}
                  disabled={selectedSentenceIndex <= 0}
                >
                  Previous sentence
                </button>
                <button
                  type="button"
                  className="button button-secondary button-compact"
                  onClick={() => focusSentence((selectedSentenceIndex >= 0 ? selectedSentenceIndex : 0) + 1)}
                  disabled={selectedSentenceIndex < 0 || selectedSentenceIndex >= page.sentences.length - 1}
                >
                  Next sentence
                </button>
              </div>
            </div>

            {selectedToken ? (
              <div className="definition-popover" data-inventory-id="reader.token-inspector" role="status" aria-live="polite">
                <div className="definition-popover-topline">
                  <div className="definition-token-heading">
                    <h3>{tokenLabel}</h3>
                    <div className="definition-meta">
                      {tokenPinyin ? <span>{tokenPinyin}</span> : null}
                      {tokenHskLabel !== "—" ? <span className="pill">{tokenHskLabel}</span> : null}
                    </div>
                  </div>
                  <div className="definition-actions">
                    <button
                      type="button"
                      className={`definition-save ${selectedTokenSaved ? "is-saved" : ""}`}
                      onClick={handleToggleSelectedTokenSaved}
                      aria-pressed={selectedTokenSaved}
                      aria-label={selectedTokenSaved ? "Remove from vocabulary" : "Save to vocabulary"}
                      title={selectedTokenSaved ? "Remove from vocabulary" : "Save to vocabulary"}
                    >
                      {selectedTokenSaved ? "★" : "☆"}
                    </button>
                    <button type="button" className="ghost-link" onClick={() => setSelectedToken(null)}>
                      Clear
                    </button>
                  </div>
                </div>
                {lexiconLoading ? (
                  <LoadingSkeleton label="Loading dictionary entry" className="definition-loading" />
                ) : (
                  <p className="definition-copy">{tokenDefinition || "Definition unavailable."}</p>
                )}
              </div>
            ) : (
              <div className="definition-popover definition-empty">
                <span className="eyebrow">Tap a character or word</span>
                <p>When you click text, the lookup panel will stay in view while the page remains readable.</p>
              </div>
            )}

            <div className="reader-page-text" aria-label="Reflowed page text">
              {page.sentences.map((sentence) => (
                <div
                  key={sentence.order}
                  className={`sentence-block ${selectedSentenceOrder === sentence.order ? "is-focused" : ""}`}
                  aria-label={`Sentence ${sentence.order}`}
                  onClick={() => setSelectedSentenceOrder(sentence.order)}
                >
                  {displayedSentenceTokens.map((token) => {
                    const isSelected = selectedToken?.surface_form === token.surface_form && selectedToken?.order === token.order;
                    const tokenClassName = `token-inline ${isSelected ? "is-selected" : ""} ${isCjkToken(token.surface_form) ? "is-cjk" : "is-word"}`;
                      return (
                        <span
                          key={`${sentence.order}-${token.order}-${token.surface_form}`}
                          role="button"
                          tabIndex={0}
                        className={tokenClassName}
                          onClick={() => {
                            setLexiconLoading(true);
                            setLexiconResult(null);
                            setSelectedToken(token);
                            setSelectedSentenceOrder(sentence.order);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setLexiconLoading(true);
                              setLexiconResult(null);
                              setSelectedToken(token);
                              setSelectedSentenceOrder(sentence.order);
                            }
                          }}
                        aria-label={`Inspect ${token.surface_form}`}
                      >
                        {token.surface_form}
                      </span>
                    );
                  })}
                  {sentence.translation ? <p className="sentence-translation">{sentence.translation}</p> : null}
                </div>
              ))}
              {!selectedSentence?.translation && pageTranslation ? (
                <div className="page-translation">
                  <p className="eyebrow">Page translation</p>
                  <p className="sentence-translation">{pageTranslation}</p>
                </div>
              ) : null}
            </div>
            <ReaderHskChart tokens={displayedSentenceTokens} />
          </article>

          <aside className="reader-sidebar">
            <section className="card inspector-card">
              <h2>Book frequency</h2>
              <p className="small-copy">Use this panel to watch book-wide vocabulary density while you read.</p>
              <p className="small-copy">
                Source: <strong>{extractionSourceLabel}</strong>
              </p>
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

            <section className="card inspector-card">
              <h2>Dictionary wiring</h2>
              <p className="small-copy">
                This panel is ready for your dictionary files and HSK lists. Once those are imported, token clicks can resolve to the full lexicon instead of only book frequency.
              </p>
              <p className="small-copy">For now, the reader uses book extraction metadata so the page still behaves like a reading surface instead of a card wall.</p>
            </section>

            <section className="card inspector-card">
              <h2>Reading profile</h2>
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
            </section>

            <section className="card inspector-card">
              <h2>Navigation</h2>
              <div className="button-row">
                {pageNumber > 1 ? (
                  <Link className="button button-secondary" href={`/reader/${bookId}/${pageNumber - 1}`}>
                    Previous
                  </Link>
                ) : null}
                {totalPages !== null && pageNumber < totalPages ? (
                  <Link className="button button-secondary" href={`/reader/${bookId}/${pageNumber + 1}`}>
                    Next
                  </Link>
                ) : null}
              </div>
            </section>
          </aside>
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
