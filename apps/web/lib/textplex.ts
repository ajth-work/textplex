import { getDemoFetchResponse, getDemoPostResponse } from "./demo-data";
import type {
  BookExtractionTriggerRequest,
  BookExtractionTriggerResponse,
} from "../../../packages/shared/src";
import { getSupabaseClient } from "./supabase";
export type {
  ActivityEvent,
  ActivitySurfaceResponse,
  AnalysisDistributionBucket,
  AnalysisLexicalEntrySummary,
  AnalysisMetrics,
  AnalysisSeriesPoint,
  AuthMeResponse,
  BookAnalysisSurfaceResponse,
  BookExtractionResult,
  BookExtractionTriggerRequest,
  BookExtractionTriggerResponse,
  BookPageManifest,
  BookReaderPageResponse,
  BookRecord,
  BoundingBox,
  LearningProfileSummary,
  ImportRecentBook,
  ImportSurfaceResponse,
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
  StudyQueueItem,
  StudySurfaceResponse,
  SentenceReadCreateRequest,
  SentenceReadRecord,
  SentenceReadTokenInput,
  SentenceResult,
  TokenOccurrenceResult,
  TokenResult,
} from "../../../packages/shared/src";

export const apiBaseUrl = process.env.NEXT_PUBLIC_TEXTPLEX_API_URL ?? "/api";
export const isDemoMode = process.env.NEXT_PUBLIC_TEXTPLEX_DEMO_MODE === "true";
export const legacySurfaceUrl = process.env.NEXT_PUBLIC_TEXTPLEX_LEGACY_URL ?? "http://127.0.0.1:8200/legacy/index.html";

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
