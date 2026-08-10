import { getDemoFetchResponse, getDemoPostResponse } from "./demo-data";
import type {
  BookExtractionTriggerRequest,
  BookExtractionTriggerResponse,
  GeneratedArticleTerm,
  GeneratedReaderArticleRequest,
  GeneratedReaderArticlePromptDetails,
  GeneratedReaderArticleResponse,
  LearningSyncResponse,
  VocabularyAssessmentAxisRecord,
  VocabularyAssessmentStateRecord,
  ThemeCheckoutRequest,
  ThemeCheckoutResponse,
  ThemeAdminResponse,
  ThemeAiSuggestRequest,
  ThemeAiSuggestResponse,
  ThemeEntitlementResponse,
  GoogleTranslateUsageSummary,
  AdminUsageSummary,
  ProgressBookSummary,
  ProgressSurfaceResponse,
} from "../../../packages/shared/src";
import { getSupabaseClient } from "./supabase";
export type {
  ActivityEvent,
  ActivitySurfaceResponse,
  ReadingHistoryPoint,
  AnalysisDistributionBucket,
  AnalysisLexicalEntrySummary,
  AnalysisMetrics,
  AnalysisSeriesPoint,
  AuthMeResponse,
  HostedProfileRecord,
  HostedProfileSurfaceResponse,
  HostedProfileUpdateRequest,
  ProfileMigrationRequest,
  ProfileMigrationResponse,
  ThemeBundleCatalogItem,
  ThemeCatalogItem,
  ThemeCatalogResponse,
  HostedSettingEntry,
  BookAnalysisSurfaceResponse,
  BookExtractionResult,
  BookExtractionTriggerRequest,
  BookExtractionTriggerResponse,
  BookPageManifest,
  BookReaderPageResponse,
  BookRecord,
  BoundingBox,
  GeneratedArticleTerm,
  GeneratedReaderArticleRequest,
  GeneratedReaderArticlePromptDetails,
  GeneratedReaderArticleResponse,
  LearningProfileSummary,
  LearningSyncResponse,
  VocabularyAssessmentAxisKey,
  VocabularyAssessmentAxisRecord,
  VocabularyAssessmentResult,
  VocabularyAssessmentReviewRequest,
  VocabularyAssessmentStateRecord,
  ImportRecentBook,
  ImportSurfaceResponse,
  GoogleTranslateUsageSummary,
  AdminUsageSummary,
  LexicalEntryResult,
  LexiconEntryRecord,
  LexiconImportRequest,
  LexiconImportSummary,
  LexiconLookupResponse,
  ProgressBookSummary,
  ProgressSurfaceResponse,
  ProfileSurfaceResponse,
  SearchResult,
  SearchSurfaceResponse,
  SettingEntry,
  SettingsSurfaceResponse,
  SettingsUpdateRequest,
  PageExtractionArtifact,
  PageExtractionResult,
  PageReadCreateRequest,
  PageReadRecord,
  PageRecord,
  ReadingSessionCreateRequest,
  ReadingSessionRecord,
  StudyVocabularyItemCreateRequest,
  StudyVocabularyItemRecord,
  StudyQueueItem,
  StudySurfaceResponse,
  StudyProgramGroup,
  StudyVocabularyGroup,
  StudyVocabularyItem,
  WordInteractionCreateRequest,
  WordInteractionRecord,
  SentenceReadCreateRequest,
  SentenceReadRecord,
  SentenceReadTokenInput,
  SentenceTranslationAlignment,
  SentenceResult,
  TranslationAlignmentSegment,
  TranslationAlignmentToken,
  TokenOccurrenceResult,
  TokenResult,
  ThemeCheckoutRequest,
  ThemeCheckoutResponse,
  ThemeEntitlementResponse,
  ThemeAdminRecord,
  ThemeAdminResponse,
  ThemeAdminUpsertRequest,
  ThemeAiSuggestRequest,
  ThemeAiSuggestResponse,
} from "../../../packages/shared/src";

export const apiBaseUrl = process.env.NEXT_PUBLIC_TEXTPLEX_API_URL ?? "/api";
export const isDemoMode = process.env.NEXT_PUBLIC_TEXTPLEX_DEMO_MODE === "true";
export const legacySurfaceUrl = process.env.NEXT_PUBLIC_TEXTPLEX_LEGACY_URL ?? "http://127.0.0.1:8200/legacy/index.html";

export type FeedbackContext = {
  route: string;
  page_title?: string | null;
  language_code?: string | null;
  book_id?: string | null;
  book_title?: string | null;
  page_number?: number | null;
  sentence_order?: number | null;
  app_version: string;
  viewport_width?: number | null;
  viewport_height?: number | null;
  user_agent?: string | null;
};

export type FeedbackRecord = {
  id: string;
  submitted_at: string;
  original_text: string;
  context: FeedbackContext;
  triage: {
    title: string;
    summary: string;
    category: string;
    severity: string;
    affected_area: string;
    reproduction_notes?: string | null;
    suggested_action?: string | null;
    tags: string[];
    plan: {
      problem_statement: string;
      expected_behavior: string;
      actual_behavior: string;
      reproduction_steps: string[];
      implementation_tasks: string[];
      acceptance_criteria: string[];
      suggested_tests: string[];
      risks: string[];
      priority: "low" | "medium" | "high" | "urgent";
      estimated_effort: "small" | "medium" | "large" | "unknown";
    };
  };
  triage_source: "openai" | "fallback";
  status: "needs_review" | "in_progress" | "completed" | "acknowledged" | "dismissed";
  status_history: Array<{
    status: "needs_review" | "in_progress" | "completed" | "acknowledged" | "dismissed";
    changed_at: string;
    changed_by?: string | null;
    note?: string | null;
    event_type: "status_changed" | "github_linked";
    github_issue_url?: string | null;
  }>;
  resolution_note?: string | null;
  github?: {
    repository: string;
    issue_number: number;
    issue_url: string;
    issue_state: "open" | "closed";
    project_item_id?: string | null;
    project_url?: string | null;
    linked_at: string;
    last_synced_at?: string | null;
  } | null;
  user_id?: string | null;
};

export type TesterRecord = {
  tester_id: string;
  nickname?: string | null;
  feedback_count: number;
  last_seen_at?: string | null;
};

export type FeedbackNotification = {
  id: string;
  feedback_id: string;
  title: string;
  status: "needs_review" | "in_progress" | "completed" | "acknowledged" | "dismissed";
  event_type: "status_changed" | "github_linked";
  message: string;
  created_at: string;
  route: string;
  github_issue_url?: string | null;
  read: boolean;
};

export type FeedbackNotificationListResponse = {
  notifications: FeedbackNotification[];
  unread_count: number;
};

const readerLastPositionStoragePrefix = "textplex.reader-last-position:";
const readerTokenAudioOnTapStorageKey = "textplex.readerTokenAudioOnTap";
const readerSpeechVoiceGenderStorageKey = "textplex.readerSpeechVoiceGender";
const readerLastBookStorageKey = "textplex:last-book-id";
const readerLastPageStorageKey = "textplex:last-page-number";

export const READER_NAV_CONTEXT_CLEARED_EVENT = "textplex:reader-context-cleared";

export function clearStoredReaderNavigationContext(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(readerLastBookStorageKey);
  window.localStorage.removeItem(readerLastPageStorageKey);
  window.dispatchEvent(new Event(READER_NAV_CONTEXT_CLEARED_EVENT));
}

export type ReaderSpeechVoiceGender = "female" | "male";

export type ReaderResumePosition = {
  pageNumber: number;
  sentenceOrder: number | null;
};

function readerLastPositionStorageKey(bookId: string): string {
  return `${readerLastPositionStoragePrefix}${bookId}`;
}

export function rememberReaderPosition(bookId: string, pageNumber: number, sentenceOrder: number | null): void {
  if (typeof window === "undefined" || !bookId || !Number.isFinite(pageNumber) || pageNumber < 1) {
    return;
  }

  try {
    window.localStorage.setItem(
      readerLastPositionStorageKey(bookId),
      JSON.stringify({ pageNumber: Math.floor(pageNumber), sentenceOrder: sentenceOrder && sentenceOrder > 0 ? Math.floor(sentenceOrder) : null }),
    );
  } catch {
    // Local storage is a convenience fallback; server progress remains authoritative when available.
  }
}

export function rememberReaderPage(bookId: string, pageNumber: number): void {
  rememberReaderPosition(bookId, pageNumber, null);
}

export function readStoredReaderTokenAudioOnTap(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(readerTokenAudioOnTapStorageKey) !== "false";
}

export function persistReaderTokenAudioOnTap(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(readerTokenAudioOnTapStorageKey, String(enabled));
}

export function resolveReaderSpeechVoiceGender(value: string | null | undefined): ReaderSpeechVoiceGender {
  return value === "male" ? "male" : "female";
}

export function readStoredReaderSpeechVoiceGender(): ReaderSpeechVoiceGender {
  if (typeof window === "undefined") {
    return "female";
  }

  return resolveReaderSpeechVoiceGender(window.localStorage.getItem(readerSpeechVoiceGenderStorageKey));
}

export function persistReaderSpeechVoiceGender(value: ReaderSpeechVoiceGender): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(readerSpeechVoiceGenderStorageKey, value);
}

export function getSpeechLanguage(languageCode?: string | null): string {
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

function voiceNameMatchesPreference(name: string, preference: ReaderSpeechVoiceGender): boolean {
  const lower = name.toLowerCase();
  if (preference === "female") {
    return [
      "female",
      "woman",
      "zira",
      "samantha",
      "susan",
      "karen",
      "tessa",
      "victoria",
      "moira",
      "aura",
      "salli",
      "alice",
    ].some((term) => lower.includes(term));
  }

  return [
    "male",
    "man",
    "david",
    "mark",
    "george",
    "daniel",
    "fred",
    "thomas",
    "ryan",
    "alex",
    "nathan",
    "james",
  ].some((term) => lower.includes(term));
}

function scoreSpeechVoice(voice: SpeechSynthesisVoice, languageCode: string | null | undefined, preference: ReaderSpeechVoiceGender): number {
  let score = voice.default ? 10 : 0;
  const voiceLang = voice.lang?.toLowerCase() ?? "";
  const targetLang = getSpeechLanguage(languageCode).toLowerCase();
  const targetPrefix = targetLang.split("-")[0] ?? targetLang;
  const isExactLanguageMatch = voiceLang === targetLang;
  const isLanguageFamilyMatch = voiceLang.startsWith(targetPrefix);

  if (isExactLanguageMatch) {
    score += 40;
  } else if (isLanguageFamilyMatch) {
    score += 25;
  } else {
    score -= 100;
  }

  if (isExactLanguageMatch || isLanguageFamilyMatch) {
    if (voiceNameMatchesPreference(voice.name, preference)) {
      score += 30;
    }

    if (preference === "female" && /male/i.test(voice.name)) {
      score -= 15;
    }
    if (preference === "male" && /female/i.test(voice.name)) {
      score -= 15;
    }
  }

  return score;
}

export function pickSpeechVoice(languageCode: string | null | undefined, preference: ReaderSpeechVoiceGender): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    return null;
  }

  let bestVoice: SpeechSynthesisVoice | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const voice of voices) {
    const score = scoreSpeechVoice(voice, languageCode, preference);
    if (score > bestScore) {
      bestScore = score;
      bestVoice = voice;
    }
  }

  return bestVoice;
}

export function applyPreferredSpeechVoice(
  utterance: SpeechSynthesisUtterance,
  languageCode: string | null | undefined,
  preference: ReaderSpeechVoiceGender,
): void {
  const voice = pickSpeechVoice(languageCode, preference);
  utterance.lang = voice?.lang || getSpeechLanguage(languageCode);
  if (voice) {
    utterance.voice = voice;
  }
}

function readRememberedReaderPosition(bookId: string): ReaderResumePosition | null {
  if (typeof window === "undefined" || !bookId) {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(readerLastPositionStorageKey(bookId));
    if (!storedValue) {
      return null;
    }

    const parsedValue: unknown = JSON.parse(storedValue);
    if (typeof parsedValue === "number") {
      return Number.isFinite(parsedValue) && parsedValue >= 1 ? { pageNumber: Math.floor(parsedValue), sentenceOrder: null } : null;
    }
    if (!parsedValue || typeof parsedValue !== "object") {
      return null;
    }

    const pageNumber = Number((parsedValue as { pageNumber?: unknown }).pageNumber);
    const sentenceOrderValue = Number((parsedValue as { sentenceOrder?: unknown }).sentenceOrder);
    return Number.isFinite(pageNumber) && pageNumber >= 1
      ? { pageNumber: Math.floor(pageNumber), sentenceOrder: Number.isFinite(sentenceOrderValue) && sentenceOrderValue >= 1 ? Math.floor(sentenceOrderValue) : null }
      : null;
  } catch {
    return null;
  }
}

export function resolveReaderResumePositionForBook(bookId: string, progressBook: ProgressBookSummary | null, fallbackPage = 1): ReaderResumePosition {
  const rememberedPosition = readRememberedReaderPosition(bookId);
  const serverPage = Math.max(progressBook?.resume_page ?? 0, progressBook?.furthest_page ?? 0);
  const hasStartedReading = progressBook?.reading_state === "in_progress" || progressBook?.reading_state === "finished";
  if (hasStartedReading && serverPage > 0) {
    if (rememberedPosition && rememberedPosition.pageNumber >= serverPage) {
      return rememberedPosition;
    }
    return {
      pageNumber: serverPage,
      sentenceOrder: progressBook?.resume_sentence_order && progressBook.resume_sentence_order > 0 ? progressBook.resume_sentence_order : null,
    };
  }

  if (rememberedPosition && progressBook?.reading_state !== "not_read") {
    return rememberedPosition;
  }

  return { pageNumber: Math.max(1, fallbackPage), sentenceOrder: null };
}

export function resolveReaderResumePageForBook(bookId: string, progressBook: ProgressBookSummary | null, fallbackPage = 1): number {
  return resolveReaderResumePositionForBook(bookId, progressBook, fallbackPage).pageNumber;
}

export function resolveReaderResumePosition(bookId: string, progress: ProgressSurfaceResponse | null, fallbackPage = 1): ReaderResumePosition {
  return resolveReaderResumePositionForBook(bookId, progress?.books.find((book) => book.book_id === bookId) ?? null, fallbackPage);
}

export function resolveReaderResumePage(bookId: string, progress: ProgressSurfaceResponse | null, fallbackPage = 1): number {
  return resolveReaderResumePosition(bookId, progress, fallbackPage).pageNumber;
}

export function resolveReaderResumeHrefForBook(bookId: string, progressBook: ProgressBookSummary | null, fallbackPage = 1): string {
  const position = resolveReaderResumePositionForBook(bookId, progressBook, fallbackPage);
  return `/reader/${bookId}/${position.pageNumber}${position.sentenceOrder ? `?sentence=${position.sentenceOrder}` : ""}`;
}

export function resolveReaderResumeHref(bookId: string, progress: ProgressSurfaceResponse | null, fallbackPage = 1): string {
  const position = resolveReaderResumePosition(bookId, progress, fallbackPage);
  return `/reader/${bookId}/${position.pageNumber}${position.sentenceOrder ? `?sentence=${position.sentenceOrder}` : ""}`;
}

export function resolveResourceUrl(pathname: string): string {
  if (
    pathname.startsWith("data:") ||
    pathname.startsWith("http://") ||
    pathname.startsWith("https://") ||
    pathname.startsWith("/demo/")
  ) {
    return pathname;
  }

  return `${apiBaseUrl}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function joinPath(pathname: string): string {
  return `${apiBaseUrl}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export async function fetchJson<T>(pathname: string): Promise<T> {
  if (isDemoMode) {
    const response = getDemoFetchResponse(pathname);
    if (response !== null) {
      return response as T;
    }
    throw new Error(`Demo mode does not provide data for ${pathname}`);
  }

  const response = await fetch(joinPath(pathname), {
    cache: "no-store",
    headers: await authHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${pathname}`);
  }
  return (await response.json()) as T;
}

export async function postJson<T>(pathname: string, body: unknown): Promise<T> {
  if (isDemoMode) {
    const response = getDemoPostResponse(pathname, body);
    if (response !== null) {
      return response as T;
    }
    throw new Error(`Demo mode does not support ${pathname}`);
  }

  const response = await fetch(joinPath(pathname), {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${pathname}`);
  }
  return (await response.json()) as T;
}

export async function submitFeedback(
  originalText: string,
  context: FeedbackContext,
): Promise<FeedbackRecord> {
  return postJson<FeedbackRecord>("/feedback", { original_text: originalText, context });
}

export async function putJson<T>(pathname: string, body: unknown): Promise<T> {
  if (isDemoMode) {
    if (pathname === "/settings") {
      const request = body as { entries?: Array<{ key: string; value: string }> } | null;
      return { entries: request?.entries ?? [] } as T;
    }
    const response = getDemoPostResponse(pathname, body);
    if (response !== null) {
      return response as T;
    }
    throw new Error(`Demo mode does not support ${pathname}`);
  }

  const response = await fetch(joinPath(pathname), {
    method: "PUT",
    headers: await authHeaders(true),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${pathname}`);
  }
  return (await response.json()) as T;
}

export async function patchJson<T>(pathname: string, body: unknown): Promise<T> {
  if (isDemoMode) {
    throw new Error("Demo mode does not support feedback administration.");
  }

  const response = await fetch(joinPath(pathname), {
    method: "PATCH",
    headers: await authHeaders(true),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${pathname}`);
  }
  return (await response.json()) as T;
}

export async function triggerBookExtraction(
  bookId: string,
  body: BookExtractionTriggerRequest,
): Promise<BookExtractionTriggerResponse> {
  return postJson<BookExtractionTriggerResponse>(`/books/${bookId}/extract`, body);
}

export async function postFormData<T>(pathname: string, body: FormData): Promise<T> {
  if (isDemoMode) {
    throw new Error("Demo mode does not support file uploads.");
  }

  const response = await fetch(joinPath(pathname), {
    method: "POST",
    headers: await authHeaders(),
    body,
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${pathname}`);
  }
  return (await response.json()) as T;
}

export async function syncLearningEvents(): Promise<LearningSyncResponse | null> {
  if (isDemoMode) {
    return null;
  }
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }
  const { data } = await client.auth.getSession();
  if (!data.session) {
    return null;
  }
  return postJson<LearningSyncResponse>("/learning/sync", {});
}

export async function createThemeCheckout(
  request: ThemeCheckoutRequest,
): Promise<ThemeCheckoutResponse> {
  return postJson<ThemeCheckoutResponse>("/themes/checkout", request);
}

export async function generateReaderArticle(
  request: GeneratedReaderArticleRequest,
): Promise<GeneratedReaderArticleResponse> {
  return postJson<GeneratedReaderArticleResponse>("/articles/generate", request);
}

export async function fetchGeneratedArticlePromptDetails(bookId: string): Promise<GeneratedReaderArticlePromptDetails> {
  return fetchJson<GeneratedReaderArticlePromptDetails>(`/books/${bookId}/generation`);
}

export async function fetchThemeEntitlements(): Promise<ThemeEntitlementResponse> {
  return fetchJson<ThemeEntitlementResponse>("/themes/entitlements");
}

async function authHeaders(includeJsonContentType = false): Promise<Headers> {
  const headers = new Headers();
  if (includeJsonContentType) {
    headers.set("Content-Type", "application/json");
  }
  const client = getSupabaseClient();
  if (!client) {
    return headers;
  }
  const { data } = await client.auth.getSession();
  if (data.session?.access_token) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }
  return headers;
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not processed yet";
  }
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatElapsed(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}
