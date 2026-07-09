export const apiBaseUrl = process.env.NEXT_PUBLIC_TEXTPLEX_API_URL ?? "/api";

export interface BookRecord {
  id: string;
  title: string;
  author: string | null;
  language_code: string;
  source_filename: string;
  source_path: string;
  source_sha256: string;
  total_pages: number;
  status: string;
  page_split_status: string;
  page_image_count: number;
  pages_path: string | null;
  extraction_status: string;
  extracted_page_count: number;
  extraction_path: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface PageRecord {
  page_number: number;
  image_filename: string;
  image_path: string;
  status: string;
  created_at: string;
}

export interface BookPageManifest {
  book_id: string;
  source_path: string;
  total_pages: number;
  page_count: number;
  pages: PageRecord[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TokenResult {
  order: number;
  surface_form: string;
  lemma: string | null;
  part_of_speech: string | null;
  pronunciation: string | null;
  romanization: string | null;
  definition_short: string | null;
  proficiency_system: string | null;
  proficiency_level: string | null;
  entity: string | null;
  bbox: BoundingBox | null;
}

export interface TokenOccurrenceResult {
  page_number: number;
  sentence_order: number;
  token_order: number;
  surface_form: string;
  normalized_form: string;
}

export interface LexicalEntryResult {
  lemma: string;
  display_form: string;
  frequency_in_book: number;
  first_page: number | null;
  last_page: number | null;
}

export interface SentenceResult {
  order: number;
  text: string;
  tokens: TokenResult[];
  grammar_patterns: string[];
}

export interface PageExtractionResult {
  book_id: string;
  page_number: number;
  language_code: string;
  source_page_sha256: string | null;
  processor_version: string;
  pipeline_version: string;
  raw_text: string;
  clean_text: string;
  sentences: SentenceResult[];
  token_occurrences: TokenOccurrenceResult[];
  lexical_entries: LexicalEntryResult[];
}

export interface PageExtractionArtifact {
  source_page_sha256: string;
  processor_version: string;
  pipeline_version: string;
  page: PageExtractionResult;
}

export interface BookExtractionResult {
  book_id: string;
  source_path: string;
  page_start: number;
  page_end: number;
  language_code: string;
  pages: PageExtractionResult[];
  lexical_entries: LexicalEntryResult[];
  token_occurrences: TokenOccurrenceResult[];
}

export interface BookReaderPageResponse {
  book: BookRecord;
  page: PageRecord;
  image_url: string;
  extraction: PageExtractionArtifact | null;
}

export interface ReadingSessionCreateRequest {
  book_id: string;
  started_at?: string;
}

export interface ReadingSessionRecord {
  id: string;
  book_id: string;
  started_at: string;
  ended_at: string | null;
  active_seconds: number;
}

export interface PageReadCreateRequest {
  session_id: string;
  book_id: string;
  page_number: number;
  active_seconds: number;
  completed_at?: string;
}

export interface PageReadRecord {
  id: number;
  session_id: string;
  book_id: string;
  page_number: number;
  active_seconds: number;
  estimated_seconds: number;
  completion_ratio: number;
  counted_as_read: boolean;
  completed_at: string;
}

export interface LearningProfileSummary {
  database_path: string;
  reading_sessions: number;
  page_reads: number;
  active_books: number;
  vocabulary_progress_rows: number;
}

export interface LexiconImportRequest {
  source_root: string;
  language_code?: string;
  replace_existing?: boolean;
}

export interface LexiconImportSummary {
  database_path: string;
  source_root: string;
  vocabulary_rows: number;
  character_rows: number;
  imported_rows: number;
}

export interface LexiconEntryRecord {
  id: number;
  language_code: string;
  entry_type: string;
  surface_form: string;
  pinyin: string | null;
  tone: number | null;
  definition: string | null;
  radical: string | null;
  stroke_count: number | null;
  hsk_level: string | null;
  frequency_rank: number | null;
  note: string | null;
  source_name: string | null;
  source_path: string | null;
}

export interface LexiconLookupResponse {
  query: string;
  language_code: string;
  entries: LexiconEntryRecord[];
}

function joinPath(pathname: string): string {
  return `${apiBaseUrl}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export async function fetchJson<T>(pathname: string): Promise<T> {
  const response = await fetch(joinPath(pathname), {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${pathname}`);
  }
  return (await response.json()) as T;
}

export async function postJson<T>(pathname: string, body: unknown): Promise<T> {
  const response = await fetch(joinPath(pathname), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${pathname}`);
  }
  return (await response.json()) as T;
}

export async function postFormData<T>(pathname: string, body: FormData): Promise<T> {
  const response = await fetch(joinPath(pathname), {
    method: "POST",
    body,
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${pathname}`);
  }
  return (await response.json()) as T;
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
