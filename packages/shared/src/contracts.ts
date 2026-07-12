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
  text_source: string;
  text_source_signature: string;
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

export interface SentenceReadTokenInput {
  surface_form: string;
  lemma: string | null;
  token_kind: "word" | "character";
}

export interface SentenceReadCreateRequest {
  session_id: string;
  book_id: string;
  page_number: number;
  sentence_order: number;
  sentence_text: string;
  token_count: number;
  character_count: number;
  active_seconds: number;
  tokens: SentenceReadTokenInput[];
  completed_at?: string;
}

export interface SentenceReadRecord {
  id: number;
  session_id: string;
  book_id: string;
  page_number: number;
  sentence_order: number;
  sentence_text: string;
  token_count: number;
  character_count: number;
  active_seconds: number;
  completed_at: string;
}

export interface LearningProfileSummary {
  database_path: string;
  reading_sessions: number;
  page_reads: number;
  sentence_reads: number;
  token_exposures: number;
  word_exposures: number;
  character_exposures: number;
  active_books: number;
  unique_words_seen: number;
  unique_characters_seen: number;
  vocabulary_progress_rows: number;
  today_sentence_reads: number;
  today_token_exposures: number;
  average_seconds_per_sentence: number | null;
  average_seconds_per_word: number | null;
  average_seconds_per_character: number | null;
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

export interface BookExtractionTriggerResponse {
  status: string;
  extraction_path: string;
}

export interface BookExtractionTriggerRequest {
  page_start: number;
  page_count: number | null;
  force?: boolean;
}
