export interface BookRecord {
  id: string;
  owner_id: string | null;
  title: string;
  author: string | null;
  language_code: string;
  ocr_provider?: "local" | "openai";
  source_filename: string;
  source_path: string;
  source_sha256: string;
  total_pages: number;
  status: string;
  page_split_status: string;
  page_image_count: number;
  pages_path: string | null;
  extraction_status: string;
  extraction_total_pages: number;
  extraction_pages_processed: number;
  extraction_current_page: number | null;
  extraction_started_at: string | null;
  extraction_updated_at: string | null;
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
  translation?: string | null;
  tokens: TokenResult[];
  grammar_patterns: string[];
}

export interface AuthMeResponse {
  id: string;
  email: string | null;
  role: string;
  display_name: string | null;
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
  page_translation?: string | null;
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

export interface LearningSyncResponse {
  status: "synced" | "pending";
  uploaded_event_count: number;
  hydrated_event_count: number;
  remote_event_count: number;
  pending_event_count: number;
  last_synced_at: string | null;
  retry_after_seconds: number;
  conflict_count: number;
  last_error: string | null;
}

export interface ThemeCheckoutRequest {
  product_type: "theme" | "bundle";
  product_id: string;
  idempotency_key: string;
}

export interface ThemeCheckoutResponse {
  session_id: string;
  status: "created" | "paid" | "refunded";
  payment_status: "pending" | "succeeded" | "refunded";
  product_type: "theme" | "bundle";
  product_id: string;
  theme_ids: string[];
  amount_cents: number;
  currency: string;
}

export interface ThemeEntitlementResponse {
  theme_ids: string[];
  source: "local" | "hosted";
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
  selected_track_code: string;
  learning_tracks: LearningTrackSummary[];
}

export interface LearningTrackJourneyStep {
  label: string;
  detail: string;
  progress: number;
  status: "complete" | "current" | "next";
}

export interface LearningTrackSummary {
  code: string;
  label: string;
  language_code: string;
  level: string;
  subtitle: string;
  note: string;
  progress: number;
  books: number;
  page_reads: number;
  sentence_reads: number;
  word_exposures: number;
  character_exposures: number;
  unique_words_seen: number;
  unique_characters_seen: number;
  average_seconds_per_sentence: number | null;
  average_seconds_per_word: number | null;
  average_seconds_per_character: number | null;
  next_step: string;
  journey: LearningTrackJourneyStep[];
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
  ocr_provider?: "local" | "openai";
}

export interface AnalysisLexicalEntrySummary {
  lemma: string;
  display_form: string;
  frequency_in_book: number;
  first_page: number | null;
  last_page: number | null;
}

export interface AnalysisDistributionBucket {
  label: string;
  character_occurrences: number;
  percentage: number;
}

export interface AnalysisSeriesPoint {
  index: number;
  label: string;
  value: number;
  page_number: number | null;
  sentence_order: number | null;
}

export interface AnalysisMetrics {
  metric_status: "pending" | "ready" | "no_evidence" | "unsupported";
  assessment_system: string | null;
  text_expected_level: number | null;
  text_expected_level_label: string | null;
  sentence_average_level: number | null;
  page_average_level: number | null;
  character_weighted_average_level: number | null;
  eligible_character_count: number;
  known_character_count: number;
  unknown_character_count: number;
  chinese_word_occurrences: number;
  unknown_word_occurrences: number;
  partial_word_occurrences: number;
  sentence_count_with_level: number;
  page_count_with_level: number;
  distribution: AnalysisDistributionBucket[];
  comprehension_status: "not_available";
  estimated_comprehension_percent: null;
  recommendation: string;
}

export interface BookAnalysisSurfaceResponse {
  book_id: string;
  title: string;
  author: string | null;
  language_code: string;
  total_pages: number;
  extracted_page_count: number;
  sentence_count: number;
  lexical_entry_count: number;
  token_occurrence_count: number;
  has_extraction: boolean;
  extraction_progress_percent: number;
  metrics: AnalysisMetrics;
  sentence_hsk_series: AnalysisSeriesPoint[];
  page_hsk_series: AnalysisSeriesPoint[];
  top_lexical_entries: AnalysisLexicalEntrySummary[];
}

export interface SearchResult {
  kind: "book" | "sentence" | "lexical_entry";
  book_id: string | null;
  book_title: string | null;
  page_number: number | null;
  sentence_order: number | null;
  lemma: string | null;
  surface_form: string | null;
  snippet: string;
  score: number;
}

export interface SearchSurfaceResponse {
  query: string;
  result_count: number;
  results: SearchResult[];
}

export interface StudyQueueItem {
  language_code: string;
  lemma: string;
  raw_exposures: number;
  weighted_exposure: number;
  unique_pages: number;
  unique_books: number;
  help_requests: number;
  state: string;
  confidence_score: number;
  manual_override: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
}

export interface StudySurfaceResponse {
  queue_size: number;
  queued_items: StudyQueueItem[];
}

export interface ProgressBookSummary {
  book_id: string;
  title: string;
  page_reads: number;
  sentence_reads: number;
  active_seconds: number;
}

export interface ProgressSurfaceResponse {
  profile: LearningProfileSummary;
  books: ProgressBookSummary[];
}

export interface ProfileSurfaceResponse {
  profile: LearningProfileSummary;
  books: ProgressBookSummary[];
  settings: SettingsSurfaceResponse;
}

export interface HostedProfileRecord {
  id: string;
  display_name: string | null;
  target_language: string;
  learning_track: string;
  proficiency_level: string | null;
  created_at: string;
  updated_at: string;
}

export interface HostedSettingEntry extends SettingEntry {
  updated_at: string;
}

export interface HostedProfileSurfaceResponse {
  user: AuthMeResponse;
  profile: HostedProfileRecord;
  settings: HostedSettingEntry[];
}

export interface HostedProfileUpdateRequest {
  display_name?: string | null;
  target_language?: string;
  learning_track?: string;
  proficiency_level?: string | null;
}

export interface ProfileMigrationRequest {
  conflict_policy: "merge_non_destructive";
}

export interface ProfileMigrationResponse {
  status: "ready" | "empty" | "already_migrated" | "completed";
  conflict_policy: "merge_non_destructive";
  source_fingerprint: string;
  source_counts: Record<string, number>;
  target_counts: Record<string, number>;
  imported_rows: Record<string, number>;
  message: string;
}

export interface ThemeCatalogItem {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  is_free: boolean;
  is_owned: boolean;
  preview_available: boolean;
}

export interface ThemeBundleCatalogItem {
  id: string;
  title: string;
  description: string;
  theme_ids: string[];
  price_cents: number;
  is_owned: boolean;
}

export interface ThemeCatalogResponse {
  mode: "local" | "hosted";
  themes: ThemeCatalogItem[];
  bundles: ThemeBundleCatalogItem[];
}

export interface ActivityEvent {
  kind: "page_read" | "sentence_read" | "definition_lookup" | "reading_session";
  occurred_at: string;
  book_id: string;
  page_number: number | null;
  sentence_order: number | null;
  title: string | null;
  detail: string;
}

export interface ActivitySurfaceResponse {
  event_count: number;
  events: ActivityEvent[];
}

export interface ImportRecentBook {
  book_id: string;
  title: string;
  status: string;
  language_code: string;
  created_at: string;
  processed_at: string | null;
}

export interface ImportSurfaceResponse {
  default_language: string;
  supported_inputs: string[];
  can_upload_pdf: boolean;
  can_paste_text: boolean;
  recent_books: ImportRecentBook[];
}

export interface SettingEntry {
  key: string;
  value: string;
}

export interface SettingsSurfaceResponse {
  entries: SettingEntry[];
}

export interface SettingsUpdateRequest {
  entries: SettingEntry[];
}
