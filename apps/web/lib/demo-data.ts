import type {
  ActivitySurfaceResponse,
  BookExtractionResult,
  BookAnalysisSurfaceResponse,
  BookExtractionTriggerResponse,
  BookPageManifest,
  BookRecord,
  BookReaderPageResponse,
  ImportSurfaceResponse,
  GeneratedReaderArticleResponse,
  GeneratedReaderArticlePromptDetails,
  LearningProfileSummary,
  GoogleTranslateUsageSummary,
  LexiconEntryRecord,
  LexiconLookupResponse,
  ProgressSurfaceResponse,
  ProfileSurfaceResponse,
  SearchSurfaceResponse,
  PageExtractionArtifact,
  PageExtractionResult,
  PageReadRecord,
  SettingsSurfaceResponse,
  ReadingSessionRecord,
  StudySurfaceResponse,
  StudyVocabularyItemRecord,
  VocabularyAssessmentStateRecord,
  SentenceReadRecord,
  SentenceResult,
  TokenOccurrenceResult,
  TokenResult,
} from "./textplex";

export const DEMO_BOOK_ID = "demo-three-body";
export const DEMO_PAGE_COUNT = 4;

type DemoStarterLevel = {
  code: string;
  label: string;
  note: string;
  items: readonly (readonly [string, string, string])[];
};

function createDemoStarterProgram(
  languageCode: string,
  languageLabel: string,
  programCode: string,
  levels: readonly DemoStarterLevel[],
): StudySurfaceResponse["study_programs"][number] {
  const programLabel = `${languageLabel} starter program`;
  const programSourceLabel = "TextPlex starter curriculum";

  return {
    language_code: languageCode,
    language_label: languageLabel,
    program_code: programCode,
    program_label: programLabel,
    program_source_label: programSourceLabel,
    level_count: levels.length,
    levels: levels.map((level) => ({
      level_code: level.code,
      level_label: level.label,
      item_count: level.items.length,
      introduction_note: level.note,
      items: level.items.map(([displayForm, pronunciation, definitionShort]) => ({
        language_code: languageCode,
        language_label: languageLabel,
        program_code: programCode,
        program_label: programLabel,
        program_source_label: programSourceLabel,
        level_code: level.code,
        level_label: level.label,
        lemma: displayForm,
        display_form: displayForm,
        pronunciation,
        definition_short: definitionShort,
        proficiency_level: "Starter",
        frequency_rank: null,
        progress_state: "new",
        confidence_score: null,
        saved_count: 0,
        first_seen_at: null,
        last_seen_at: null,
        assessment_axes: [],
      })),
    })),
  };
}

export const demoStarterPrograms = [
  createDemoStarterProgram("he", "Hebrew", "he-starter", [
    { code: "starter-1", label: "Starter 1", note: "Greetings and first-person essentials.", items: [["שלום", "shalom", "hello; peace"], ["תודה", "toda", "thank you"], ["אני", "ani", "I"]] },
    { code: "starter-2", label: "Starter 2", note: "Everyday nouns for simple introductions.", items: [["אתה", "ata", "you"], ["מים", "mayim", "water"], ["ספר", "sefer", "book"]] },
  ]),
  createDemoStarterProgram("ar", "Arabic", "ar-starter", [
    { code: "starter-1", label: "Starter 1", note: "Greetings and first-person essentials.", items: [["مرحبا", "marhaban", "hello"], ["شكرا", "shukran", "thank you"], ["أنا", "ana", "I"]] },
    { code: "starter-2", label: "Starter 2", note: "Everyday nouns for simple introductions.", items: [["أنت", "anta", "you"], ["ماء", "ma'", "water"], ["كتاب", "kitab", "book"]] },
  ]),
  createDemoStarterProgram("ja", "Japanese", "ja-starter", [
    { code: "starter-1", label: "Starter 1", note: "Greetings and first-person essentials.", items: [["こんにちは", "konnichiwa", "hello"], ["ありがとう", "arigatō", "thank you"], ["私", "watashi", "I"]] },
    { code: "starter-2", label: "Starter 2", note: "Everyday nouns for simple introductions.", items: [["あなた", "anata", "you"], ["水", "mizu", "water"], ["本", "hon", "book"]] },
  ]),
  createDemoStarterProgram("zh", "Chinese", "zh-starter", [
    { code: "starter-1", label: "Starter 1", note: "Greetings and first-person essentials.", items: [["你好", "nǐ hǎo", "hello"], ["谢谢", "xièxie", "thank you"], ["我", "wǒ", "I"]] },
    { code: "starter-2", label: "Starter 2", note: "Everyday nouns for simple introductions.", items: [["你", "nǐ", "you"], ["水", "shuǐ", "water"], ["书", "shū", "book"]] },
  ]),
] satisfies StudySurfaceResponse["study_programs"];

type TokenSpec = {
  surface_form: string;
  lemma?: string;
  definition_short?: string | null;
};

type SentenceSpec = {
  text: string;
  tokens: TokenSpec[];
};

type PageSpec = {
  rawText: string;
  sentences: SentenceSpec[];
};

type DemoLexicalEntry = BookExtractionResult["lexical_entries"][number];

const pageSpecs: PageSpec[] = [
  {
    rawText:
      "汪森觉得，来找他的这四个人是一个奇怪的组合：两名警察和两名军人。穿警服的年轻人很礼貌，但那位便衣让他很反感。",
    sentences: [
      {
        text: "汪森觉得，来找他的这四个人是一个奇怪的组合：两名警察和两名军人。",
        tokens: [
          { surface_form: "汪森", definition_short: "Demo protagonist." },
          { surface_form: "觉得" },
          { surface_form: "来" },
          { surface_form: "找" },
          { surface_form: "他" },
          { surface_form: "的" },
          { surface_form: "这" },
          { surface_form: "四个" },
          { surface_form: "人" },
          { surface_form: "是" },
          { surface_form: "一个" },
          { surface_form: "奇怪" },
          { surface_form: "的" },
          { surface_form: "组合" },
          { surface_form: "两名" },
          { surface_form: "警察", definition_short: "Police officers." },
          { surface_form: "和" },
          { surface_form: "两名" },
          { surface_form: "军人", definition_short: "Soldiers." },
        ],
      },
      {
        text: "穿警服的年轻人很礼貌，但那位便衣让他很反感。",
        tokens: [
          { surface_form: "穿" },
          { surface_form: "警服" },
          { surface_form: "的" },
          { surface_form: "年轻人" },
          { surface_form: "很" },
          { surface_form: "礼貌" },
          { surface_form: "但" },
          { surface_form: "那位" },
          { surface_form: "便衣" },
          { surface_form: "让" },
          { surface_form: "他" },
          { surface_form: "很" },
          { surface_form: "反感" },
        ],
      },
    ],
  },
  {
    rawText: "那好，这属于个人隐私，我没必要回答你们的问题。汪森说着要转身回屋。",
    sentences: [
      {
        text: "那好，这属于个人隐私，我没必要回答你们的问题。",
        tokens: [
          { surface_form: "那好" },
          { surface_form: "这" },
          { surface_form: "属于" },
          { surface_form: "个人隐私", definition_short: "Private matters." },
          { surface_form: "我" },
          { surface_form: "没" },
          { surface_form: "必要" },
          { surface_form: "回答" },
          { surface_form: "你们" },
          { surface_form: "的" },
          { surface_form: "问题", definition_short: "Question." },
        ],
      },
      {
        text: "汪森说着要转身回屋。",
        tokens: [
          { surface_form: "汪森" },
          { surface_form: "说着" },
          { surface_form: "要" },
          { surface_form: "转身" },
          { surface_form: "回屋" },
        ],
      },
    ],
  },
  {
    rawText:
      "会议是在一个大厅里举行的，汪森一进去就对这里的纷乱吃惊不小。大厅周围堆满了电脑设备和线缆，像临时拼起来的作战中心。",
    sentences: [
      {
        text: "会议是在一个大厅里举行的，汪森一进去就对这里的纷乱吃惊不小。",
        tokens: [
          { surface_form: "会议", definition_short: "Meeting." },
          { surface_form: "是" },
          { surface_form: "在" },
          { surface_form: "一个" },
          { surface_form: "大厅", definition_short: "Hall." },
          { surface_form: "里" },
          { surface_form: "举行" },
          { surface_form: "的" },
          { surface_form: "汪森" },
          { surface_form: "一进" },
          { surface_form: "去" },
          { surface_form: "就" },
          { surface_form: "对" },
          { surface_form: "这里" },
          { surface_form: "的" },
          { surface_form: "纷乱" },
          { surface_form: "吃惊" },
          { surface_form: "不小" },
        ],
      },
      {
        text: "大厅周围堆满了电脑设备和线缆，像临时拼起来的作战中心。",
        tokens: [
          { surface_form: "大厅" },
          { surface_form: "周围" },
          { surface_form: "堆满" },
          { surface_form: "了" },
          { surface_form: "电脑设备" },
          { surface_form: "和" },
          { surface_form: "线缆" },
          { surface_form: "像" },
          { surface_form: "临时" },
          { surface_form: "拼起来" },
          { surface_form: "的" },
          { surface_form: "作战中心", definition_short: "Operations center." },
        ],
      },
    ],
  },
  {
    rawText: "史强把面前的文件从袋中抽出一半又塞了回去，显然没了兴趣。鱼？纳米材料？不，不，与那些都没关系。",
    sentences: [
      {
        text: "史强把面前的文件从袋中抽出一半又塞了回去，显然没了兴趣。",
        tokens: [
          { surface_form: "史强", definition_short: "A recurring character." },
          { surface_form: "把" },
          { surface_form: "面前" },
          { surface_form: "的" },
          { surface_form: "文件", definition_short: "Document." },
          { surface_form: "从" },
          { surface_form: "袋中" },
          { surface_form: "抽出" },
          { surface_form: "一半" },
          { surface_form: "又" },
          { surface_form: "塞了回去" },
          { surface_form: "显然" },
          { surface_form: "没了" },
          { surface_form: "兴趣", definition_short: "Interest." },
        ],
      },
      {
        text: "鱼？纳米材料？不，不，与那些都没关系。",
        tokens: [
          { surface_form: "鱼" },
          { surface_form: "纳米材料", definition_short: "Nanomaterial." },
          { surface_form: "不" },
          { surface_form: "不" },
          { surface_form: "与" },
          { surface_form: "那些" },
          { surface_form: "都" },
          { surface_form: "没关系", definition_short: "Irrelevant." },
        ],
      },
    ],
  },
];

function normalizeLemma(surfaceForm: string, languageCode: string): string {
  return languageCode.toLowerCase().startsWith("zh") ? surfaceForm : surfaceForm.toLowerCase();
}

function makeToken(surfaceForm: string, languageCode: string, definitionShort: string | null = null): TokenResult {
  return {
    order: 0,
    surface_form: surfaceForm,
    lemma: normalizeLemma(surfaceForm, languageCode),
    part_of_speech: null,
    pronunciation: null,
    romanization: null,
    definition_short: definitionShort,
    proficiency_system: null,
    proficiency_level: null,
    entity: null,
    bbox: null,
  };
}

function makeSentence(sentence: SentenceSpec, languageCode: string): SentenceResult {
  const tokensWithPunctuation = insertPunctuationTokens(sentence.text, sentence.tokens);
  return {
    order: 0,
    text: sentence.text,
    tokens: tokensWithPunctuation.map((token, index) => ({
      ...makeToken(token.surface_form, languageCode, token.definition_short ?? null),
      order: index + 1,
    })),
    grammar_patterns: [],
  };
}

function insertPunctuationTokens(text: string, tokens: TokenSpec[]): TokenSpec[] {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return tokens;
  }

  if (tokens.some((token) => isPunctuationSurface(token.surface_form))) {
    return tokens;
  }

  const source = String(text ?? "");
  if (!source) {
    return tokens;
  }

  const merged: TokenSpec[] = [];
  let cursor = 0;

  for (const token of tokens) {
    const surface = String(token.surface_form ?? "");
    const matchIndex = surface ? source.indexOf(surface, cursor) : -1;
    const gapEnd = matchIndex >= 0 ? matchIndex : cursor;

    if (gapEnd > cursor) {
      merged.push(...tokenizePunctuationGap(source.slice(cursor, gapEnd)));
    }

    merged.push(token);

    if (matchIndex >= 0) {
      cursor = matchIndex + surface.length;
    }
  }

  if (cursor < source.length) {
    merged.push(...tokenizePunctuationGap(source.slice(cursor)));
  }

  return merged;
}

function tokenizePunctuationGap(value: string): TokenSpec[] {
  return Array.from(String(value ?? ""))
    .filter((character) => !/\s/.test(character))
    .filter((character) => isPunctuationSurface(character))
    .map((character) => ({ surface_form: character }));
}

function isPunctuationSurface(surface: string): boolean {
  return /^[\s。、！？；：,.!?;:、，。！？；：…—()（）「」『』《》【】]+$/.test(String(surface ?? ""));
}

function makePageResult(pageNumber: number, languageCode: string): PageExtractionResult {
  const pageSpec = pageSpecs[pageNumber - 1];
  const sentences = pageSpec.sentences.map((sentence, index) => ({
    ...makeSentence(sentence, languageCode),
    order: index + 1,
  }));

  const tokenOccurrences: TokenOccurrenceResult[] = [];
  const lexicalEntries = new Map<string, DemoLexicalEntry>();

  for (const sentence of sentences) {
    for (const token of sentence.tokens) {
      if (isPunctuationSurface(token.surface_form)) {
        continue;
      }
      tokenOccurrences.push({
        page_number: pageNumber,
        sentence_order: sentence.order,
        token_order: token.order,
        surface_form: token.surface_form,
        normalized_form: token.lemma ?? token.surface_form,
      });

      const normalized = token.lemma ?? token.surface_form;
      const existing = lexicalEntries.get(normalized);
      if (!existing) {
        lexicalEntries.set(normalized, {
          lemma: normalized,
          display_form: token.surface_form,
          frequency_in_book: 1,
          first_page: pageNumber,
          last_page: pageNumber,
        });
        continue;
      }

      existing.frequency_in_book += 1;
      existing.last_page = pageNumber;
    }
  }

  return {
    book_id: DEMO_BOOK_ID,
    page_number: pageNumber,
    language_code: languageCode,
    source_page_sha256: `demo-page-${pageNumber}`,
    processor_version: "demo-1",
    pipeline_version: "demo-1",
    raw_text: pageSpec.rawText,
    clean_text: pageSpec.rawText,
    sentences,
    token_occurrences: tokenOccurrences,
        lexical_entries: Array.from(lexicalEntries.values()),
  };
}

function makePageImageDataUrl(pageNumber: number): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 1754" width="1240" height="1754">
      <rect width="1240" height="1754" fill="#f3eadf"/>
      <rect x="72" y="72" width="1096" height="1610" rx="28" fill="#fff8ef" stroke="#d8c4b2" stroke-width="4"/>
      <text x="110" y="180" fill="#2a1f18" font-size="68" font-family="Georgia, serif">${DEMO_BOOK_ID}</text>
      <text x="110" y="260" fill="#7d6656" font-size="30" font-family="Arial, sans-serif">Demo page ${pageNumber}</text>
      <text x="110" y="360" fill="#2a1f18" font-size="42" font-family="Arial, sans-serif">This page image is embedded for GitHub Pages demo mode.</text>
      <text x="110" y="430" fill="#2a1f18" font-size="36" font-family="Arial, sans-serif">Use the reflowed text below as the primary reader surface.</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const demoPages = pageSpecs.map((_, index) => makePageResult(index + 1, "zh"));

function buildSummary(pages: PageExtractionResult[]): BookExtractionResult {
  const lexicalEntries = new Map<string, BookExtractionResult["lexical_entries"][number]>();
  const tokenOccurrences: TokenOccurrenceResult[] = [];

  for (const page of pages) {
    tokenOccurrences.push(...page.token_occurrences);
    for (const entry of page.lexical_entries) {
      const existing = lexicalEntries.get(entry.lemma);
      if (!existing) {
        lexicalEntries.set(entry.lemma, { ...entry });
        continue;
      }
      existing.frequency_in_book += entry.frequency_in_book;
      existing.first_page = Math.min(existing.first_page ?? page.page_number, entry.first_page ?? page.page_number);
      existing.last_page = Math.max(existing.last_page ?? page.page_number, entry.last_page ?? page.page_number);
    }
  }

  return {
    book_id: DEMO_BOOK_ID,
    source_path: "demo://three-body",
    page_start: 1,
    page_end: demoPages.length,
    language_code: "zh",
    pages,
    lexical_entries: Array.from(lexicalEntries.values()).sort((left, right) => right.frequency_in_book - left.frequency_in_book || left.lemma.localeCompare(right.lemma)),
    token_occurrences: tokenOccurrences,
  };
}

export const demoBookRecord: BookRecord = {
  id: DEMO_BOOK_ID,
  owner_id: null,
  title: "三体",
  author: "刘慈欣",
  language_code: "zh",
  source_filename: "three-body-mini-slice.pdf",
  source_path: "demo://three-body-mini-slice.pdf",
  source_sha256: "demo-three-body-sha256",
  total_pages: DEMO_PAGE_COUNT,
  status: "extracted",
  page_split_status: "complete",
  page_image_count: DEMO_PAGE_COUNT,
  pages_path: "/demo",
  extraction_status: "complete",
  extraction_total_pages: DEMO_PAGE_COUNT,
  extraction_pages_processed: DEMO_PAGE_COUNT,
  extraction_current_page: DEMO_PAGE_COUNT,
  extraction_started_at: "2026-07-09T00:00:00Z",
  extraction_updated_at: "2026-07-09T00:00:00Z",
  extracted_page_count: DEMO_PAGE_COUNT,
  extraction_path: "/demo/extractions/book-extraction.json",
  created_at: "2026-07-09T00:00:00Z",
  processed_at: "2026-07-09T00:00:00Z",
};

export const demoGeneratedArticlePromptDetails: GeneratedReaderArticlePromptDetails = {
  book_id: DEMO_BOOK_ID,
  title: "Chinese HSK 4 practice article: daily life in a city",
  language_code: "zh",
  language_label: "Chinese",
  topic: "daily life in a city",
  genre: "everyday",
  tone: "explanatory",
  curriculum_mode: "exam",
  curriculum_level: "HSK 4",
  curriculum_label: "HSK 4",
  requested_sentence_count: 30,
  actual_sentence_count: 30,
  prompt_version: "reader-article-v1",
  model: "gpt-5.4-mini",
  generation_source: "template",
  max_new_lemmas: 8,
  known_lemma_limit: 12,
  recent_lemma_limit: 10,
  upcoming_lemma_limit: 12,
  unknown_lemma_count: 0,
  generated_at: "2026-07-09T12:00:00Z",
  prompt_text:
    "You write learner-calibrated reading passages for TextPlex.\n" +
    "Return only valid JSON. Do not add markdown, headings, or commentary.\n" +
    "Create one coherent article in the target language that is exactly the requested sentence count.\n" +
    "Match the requested genre and tone, and keep vocabulary at or below the requested curriculum ceiling when one is provided.\n" +
    "Use the known terms heavily, reuse the recent terms naturally, and introduce the upcoming terms gently.\n" +
    "Do not exceed the new-lemma budget. Keep the wording concrete and readable.\n" +
    "Return a JSON object with article_text, used_known_terms, used_recent_terms, used_upcoming_terms, unknown_lemma_count, and sentence_count.\n" +
    'Request payload: {"curriculum_level":"HSK 4","curriculum_mode":"exam","genre":"everyday","known_terms":[{"term":"是","mastery_level":"mastered","confidence_score":0.91}],"language_code":"zh","language_label":"Chinese","max_new_lemmas":8,"recent_terms":[{"term":"我们","mastery_level":"review","confidence_score":0.48}],"sentence_count":30,"topic":"daily life in a city","tone":"explanatory","upcoming_terms":[{"term":"月份","mastery_level":"HSK 4","confidence_score":0.2}]}',
  known_terms: [
    { term: "是", pronunciation: "shì", definition_short: "to be", frequency_rank: 1, confidence_score: 0.91, mastery_level: "mastered" },
  ],
  recent_terms: [
    { term: "我们", pronunciation: "wǒmen", definition_short: "we; us", frequency_rank: 3, confidence_score: 0.48, mastery_level: "review" },
  ],
  upcoming_terms: [
    { term: "月份", pronunciation: "yuèfèn", definition_short: "month", frequency_rank: 84, confidence_score: 0.2, mastery_level: "HSK 4" },
  ],
};

const demoSummary = buildSummary(demoPages);
const demoPageArtifacts = new Map<number, BookReaderPageResponse>();

for (const page of demoPages) {
  const pageNumber = page.page_number;
  const pageArtifact: PageExtractionArtifact = {
    source_page_sha256: page.source_page_sha256 ?? `demo-page-${pageNumber}`,
    text_source: "demo",
    text_source_signature: "demo-static-v1",
    processor_version: page.processor_version,
    pipeline_version: page.pipeline_version,
    page,
  };
  demoPageArtifacts.set(pageNumber, {
    book: demoBookRecord,
    page: {
      page_number: pageNumber,
      image_filename: `page-${String(pageNumber).padStart(4, "0")}.svg`,
      image_path: `/demo/page-${pageNumber}.svg`,
      status: "ready",
      created_at: "2026-07-09T00:00:00Z",
    },
    image_url: makePageImageDataUrl(pageNumber),
    extraction: pageArtifact,
    reader_capabilities: {
      token_display_modes: ["word", "character"],
      default_token_display_mode: "word",
    },
  });
}

export const demoLibraryBooks: BookRecord[] = [demoBookRecord];
export const demoBookManifest: BookPageManifest = {
  book_id: DEMO_BOOK_ID,
  source_path: demoBookRecord.source_path,
  total_pages: DEMO_PAGE_COUNT,
  page_count: DEMO_PAGE_COUNT,
  pages: Array.from({ length: DEMO_PAGE_COUNT }, (_, index) => ({
    page_number: index + 1,
    image_filename: `page-${String(index + 1).padStart(4, "0")}.svg`,
    image_path: `/demo/page-${index + 1}.svg`,
    status: "ready",
    created_at: "2026-07-09T00:00:00Z",
  })),
};
export const demoBookExtractionResult = demoSummary;
export const demoBookReaderPages = demoPageArtifacts;
const demoLearningTracks: LearningProfileSummary["learning_tracks"] = [
  {
    code: "hsk",
    label: "HSK",
    language_code: "zh",
    level: "HSK 3-4",
    subtitle: "Chinese reading for intermediate learners.",
    note: "Focus on sentence-level fluency, vocabulary reinforcement, and page completion.",
    progress: 72,
    books: 1,
    page_reads: 12,
    sentence_reads: 38,
    word_exposures: 518,
    character_exposures: 496,
    unique_words_seen: demoSummary.lexical_entries.length,
    unique_characters_seen: 12,
    average_seconds_per_sentence: 14.8,
    average_seconds_per_word: 3.2,
    average_seconds_per_character: 1.1,
    next_step: "Read the next sentence and review the highlighted HSK 3-4 words.",
    journey: [
      { label: "Pages completed", detail: "One full chapter of the sample book is complete.", progress: 33, status: "complete" },
      { label: "Current pace", detail: "The reader is spending about 14.8 seconds per sentence.", progress: 72, status: "current" },
      { label: "Next review", detail: "Return to the toughest words after the current page.", progress: 86, status: "next" },
    ],
  },
  {
    code: "jlpt",
    label: "JLPT",
    language_code: "ja",
    level: "JLPT N4",
    subtitle: "Japanese reading practice built from the same progress store.",
    note: "Track book sessions, sentence exposure, and paced review cycles.",
    progress: 28,
    books: 0,
    page_reads: 0,
    sentence_reads: 0,
    word_exposures: 0,
    character_exposures: 0,
    unique_words_seen: 0,
    unique_characters_seen: 0,
    average_seconds_per_sentence: null,
    average_seconds_per_word: null,
    average_seconds_per_character: null,
    next_step: "Load a Japanese book to begin a separate reading path.",
    journey: [
      { label: "Setup", detail: "No Japanese books have been added yet.", progress: 10, status: "complete" },
      { label: "Import", detail: "Add a JLPT sample or pasted reading to this path.", progress: 28, status: "current" },
      { label: "Review", detail: "Vocabulary tracking will appear after the first reading session.", progress: 40, status: "next" },
    ],
  },
  {
    code: "topik",
    label: "TOPIK",
    language_code: "ko",
    level: "TOPIK 3",
    subtitle: "Korean reading track for mixed practice imports.",
    note: "Keep exposure counts separate from the Chinese reader path.",
    progress: 18,
    books: 0,
    page_reads: 0,
    sentence_reads: 0,
    word_exposures: 0,
    character_exposures: 0,
    unique_words_seen: 0,
    unique_characters_seen: 0,
    average_seconds_per_sentence: null,
    average_seconds_per_word: null,
    average_seconds_per_character: null,
    next_step: "Add a Korean sample text to activate TOPIK tracking.",
    journey: [
      { label: "Track selected", detail: "TOPIK is available but not active yet.", progress: 8, status: "complete" },
      { label: "Add content", detail: "Import a Korean article or book to start exposure tracking.", progress: 18, status: "current" },
      { label: "Review queue", detail: "Track confidence after the first reading session.", progress: 25, status: "next" },
    ],
  },
  {
    code: "cefr",
    label: "CEFR",
    language_code: "fr",
    level: "B1",
    subtitle: "A general reading path for languages outside the named exam tracks.",
    note: "Useful for mixed-language imports and broader progress summaries.",
    progress: 41,
    books: 1,
    page_reads: 4,
    sentence_reads: 11,
    word_exposures: 88,
    character_exposures: 112,
    unique_words_seen: 36,
    unique_characters_seen: 48,
    average_seconds_per_sentence: 11.4,
    average_seconds_per_word: 2.8,
    average_seconds_per_character: 0.9,
    next_step: "Continue reading the current sample until the next checkpoint.",
    journey: [
      { label: "Starter text", detail: "A CEFR-friendly article is ready for review.", progress: 25, status: "complete" },
      { label: "Fluency stretch", detail: "Continue with a longer mixed-language passage.", progress: 41, status: "current" },
      { label: "Expansion", detail: "Add another text when the current passage is stable.", progress: 60, status: "next" },
    ],
  },
  {
    code: "local",
    label: "Local",
    language_code: "zh",
    level: "Demo",
    subtitle: "Imported content and local-only samples.",
    note: "This path reflects anything added outside a named exam track.",
    progress: 100,
    books: 1,
    page_reads: 4,
    sentence_reads: 12,
    word_exposures: 156,
    character_exposures: 144,
    unique_words_seen: demoSummary.lexical_entries.length,
    unique_characters_seen: 12,
    average_seconds_per_sentence: 12.2,
    average_seconds_per_word: 3.0,
    average_seconds_per_character: 1.0,
    next_step: "Keep reading the imported sample or switch back to the HSK path.",
    journey: [
      { label: "Import complete", detail: "The local sample book is already available.", progress: 100, status: "complete" },
      { label: "Review", detail: "Tokens and page reads are being tracked locally.", progress: 100, status: "current" },
      { label: "Archive", detail: "Move finished demo imports out of the active shelf when ready.", progress: 100, status: "next" },
    ],
  },
];
export const demoLearningProfileSummary: LearningProfileSummary = {
  database_path: "demo/profile.sqlite3",
  reading_sessions: 1,
  page_reads: 0,
  sentence_reads: 0,
  token_exposures: 0,
  word_exposures: 0,
  character_exposures: 0,
  active_books: 1,
  unique_words_seen: demoSummary.lexical_entries.length,
  unique_characters_seen: 12,
  vocabulary_progress_rows: demoSummary.lexical_entries.length,
  glossed_vocabulary_items: demoSummary.lexical_entries.length,
  remembered_word_interactions: 8,
  missed_word_interactions: 3,
  today_sentence_reads: 0,
  today_token_exposures: 0,
  average_seconds_per_session: 64,
  average_seconds_per_sentence: null,
  average_seconds_per_word: null,
  average_seconds_per_character: null,
  selected_track_code: "hsk",
  learning_tracks: demoLearningTracks,
};

export function getDemoPageNumbers(): number[] {
  return [1, 2, 3, 4];
}

export function getDemoFetchResponse(pathname: string): unknown | null {
  const url = new URL(pathname, "http://demo.local");
  const route = url.pathname;

  if (route === "/books") {
    return demoLibraryBooks;
  }

  if (route === `/books/${DEMO_BOOK_ID}`) {
    return demoBookRecord;
  }

  if (route === `/books/${DEMO_BOOK_ID}/pages`) {
    return demoBookManifest;
  }

  const pageMatch = route.match(/^\/books\/([^/]+)\/pages\/(\d+)$/);
  if (pageMatch && pageMatch[1] === DEMO_BOOK_ID) {
    const pageNumber = Number(pageMatch[2]);
    return demoBookReaderPages.get(pageNumber) ?? null;
  }

  if (route === `/books/${DEMO_BOOK_ID}/extractions`) {
    return demoBookExtractionResult;
  }

  if (route === `/books/${DEMO_BOOK_ID}/generation`) {
    return demoGeneratedArticlePromptDetails;
  }

  if (route === "/learning/profile") {
    return demoLearningProfileSummary;
  }

  if (route === "/lexicon/google-translate/usage") {
    return {
      month_key: "2026-07",
      request_count: 0,
      character_count: 0,
      free_tier_limit: 500000,
      free_remaining_characters: 500000,
      billable_characters: 0,
      billing_rate_per_million_usd: 20,
      estimated_cost_usd: 0,
      updated_at: "2026-07-09T12:00:00Z",
    } satisfies GoogleTranslateUsageSummary;
  }

  if (route === "/analysis/" + DEMO_BOOK_ID) {
    return {
      book_id: DEMO_BOOK_ID,
      title: demoBookRecord.title,
      author: demoBookRecord.author,
      language_code: demoBookRecord.language_code,
      total_pages: demoBookRecord.total_pages,
      extracted_page_count: demoBookRecord.extracted_page_count,
      sentence_count: demoSummary.pages.reduce((total, page) => total + page.sentences.length, 0),
      lexical_entry_count: demoSummary.lexical_entries.length,
      token_occurrence_count: demoSummary.token_occurrences.length,
      has_extraction: true,
      extraction_progress_percent: 100,
      metrics: {
        metric_status: "ready",
        assessment_system: "HSK",
        text_expected_level: 4.2,
        text_expected_level_label: "HSK 4.2",
        sentence_average_level: 4.2,
        page_average_level: 4.1,
        character_weighted_average_level: 4,
        eligible_character_count: 232,
        known_character_count: 198,
        unknown_character_count: 34,
        chinese_word_occurrences: 145,
        unknown_word_occurrences: 18,
        partial_word_occurrences: 21,
        sentence_count_with_level: 8,
        page_count_with_level: demoSummary.pages.length,
        distribution: [
          { label: "HSK 1", character_occurrences: 32, percentage: 16.2 },
          { label: "HSK 2", character_occurrences: 48, percentage: 24.2 },
          { label: "HSK 3", character_occurrences: 63, percentage: 31.8 },
          { label: "HSK 4", character_occurrences: 55, percentage: 27.8 },
        ],
        comprehension_status: "not_available",
        estimated_comprehension_percent: null,
        recommendation: "This expected level is derived from HSK character evidence; comprehension still requires learner data.",
      },
      sentence_hsk_series: [],
      page_hsk_series: [],
      top_lexical_entries: demoSummary.lexical_entries.slice(0, 10),
    } satisfies BookAnalysisSurfaceResponse;
  }

  if (route === "/activity") {
    return {
      event_count: 3,
      events: [
        {
          kind: "reading_session",
          occurred_at: "2026-07-09T12:00:00Z",
          book_id: DEMO_BOOK_ID,
          page_number: null,
          sentence_order: null,
          title: demoBookRecord.title,
          detail: "Session active for 420s",
        },
        {
          kind: "page_read",
          occurred_at: "2026-07-09T12:05:00Z",
          book_id: DEMO_BOOK_ID,
          page_number: 2,
          sentence_order: null,
          title: demoBookRecord.title,
          detail: "Page 2 read for 45s",
        },
        {
          kind: "sentence_read",
          occurred_at: "2026-07-09T12:06:00Z",
          book_id: DEMO_BOOK_ID,
          page_number: 2,
          sentence_order: 1,
          title: demoBookRecord.title,
          detail: "Demo sentence focus",
        },
      ],
      reading_history: [
        { day_index: 1, day: "2026-07-09", pages_read: 1, cumulative_pages: 1, sentences_read: 1, cumulative_sentences: 1 },
      ],
    } satisfies ActivitySurfaceResponse;
  }

  if (route === "/import") {
    return {
      default_language: "zh",
      supported_inputs: ["pdf", "paste"],
      can_upload_pdf: true,
      can_paste_text: true,
      recent_books: [
        {
          book_id: demoBookRecord.id,
          title: demoBookRecord.title,
          status: demoBookRecord.status,
          language_code: demoBookRecord.language_code,
          created_at: demoBookRecord.created_at,
          processed_at: demoBookRecord.processed_at,
        },
      ],
    } satisfies ImportSurfaceResponse;
  }

  if (route === "/progress") {
    return {
      profile: demoLearningProfileSummary,
      books: [
        {
          book_id: demoBookRecord.id,
          title: demoBookRecord.title,
          page_reads: 1,
          reading_sessions: 1,
          sentence_reads: 2,
          active_seconds: 120,
          total_pages: demoBookRecord.total_pages,
          furthest_page: 1,
          resume_page: 1,
        resume_sentence_order: 1,
        total_sentences: demoBookExtractionResult.pages.reduce((total, page) => total + page.sentences.length, 0),
        sentences_read: 2,
        progress_percent: 33,
        progress_unit: "pages" as const,
        reading_state: "in_progress" as const,
        last_read_at: "2026-07-29T12:00:00Z",
      },
    ],
  } satisfies ProgressSurfaceResponse;
  }

  if (route === "/profile") {
    return {
      profile: demoLearningProfileSummary,
      books: demoLibraryBooks.map((book, index) => ({
        book_id: book.id,
        title: book.title,
        page_reads: index + 1,
        reading_sessions: index + 1,
        sentence_reads: index + 2,
        active_seconds: 120 + index * 45,
        total_pages: book.total_pages,
        furthest_page: Math.min(book.total_pages, index + 1),
        resume_page: Math.min(book.total_pages, index + 1),
      resume_sentence_order: 1,
      total_sentences: demoBookExtractionResult.pages.reduce((total, page) => total + page.sentences.length, 0),
      sentences_read: index + 2,
      progress_percent: Math.round(((index + 1) / Math.max(book.total_pages, 1)) * 100),
      progress_unit: "pages" as const,
      reading_state: index === 0 ? ("finished" as const) : ("in_progress" as const),
      last_read_at: "2026-07-29T12:00:00Z",
    })),
      settings: {
        entries: [
          { key: "theme", value: "neutral" },
          { key: "ocrProvider", value: "openai" },
        ],
      },
    } satisfies ProfileSurfaceResponse;
  }

  if (route === "/settings") {
    return {
      entries: [
        { key: "theme", value: "neutral" },
      ],
    } satisfies SettingsSurfaceResponse;
  }

  if (route === "/study") {
    return {
      queue_size: 2,
      queued_items: [
        {
          language_code: "zh",
          lemma: "我",
          raw_exposures: 5,
          weighted_exposure: 2.4,
          unique_pages: 2,
          unique_books: 1,
          help_requests: 0,
          state: "learning",
          confidence_score: 0.42,
          next_due_at: "2026-08-01T06:00:00Z",
          manual_override: null,
          first_seen_at: "2026-07-09T12:00:00Z",
          last_seen_at: "2026-07-09T12:10:00Z",
          origins: ["glossed", "program"],
          assessment_axes: [
            {
              language_code: "zh",
              lemma: "æˆ‘",
              axis_key: "form_to_meaning",
              prompt_type: "source_form",
              response_type: "meaning",
              stage: 3,
              due_at: "2026-08-01T18:00:00Z",
              last_seen_at: "2026-07-09T12:10:00Z",
              last_result: "correct",
              pass_count: 3,
              fail_count: 0,
            },
            {
              language_code: "zh",
              lemma: "æˆ‘",
              axis_key: "form_to_reading",
              prompt_type: "source_form",
              response_type: "reading",
              stage: 2,
              due_at: "2026-08-01T15:00:00Z",
              last_seen_at: "2026-07-09T12:10:00Z",
              last_result: "correct",
              pass_count: 2,
              fail_count: 0,
            },
            {
              language_code: "zh",
              lemma: "æˆ‘",
              axis_key: "meaning_to_form",
              prompt_type: "meaning",
              response_type: "source_form",
              stage: 6,
              due_at: "2026-08-04T12:00:00Z",
              last_seen_at: "2026-07-09T12:10:00Z",
              last_result: "correct",
              pass_count: 5,
              fail_count: 1,
            },
            {
              language_code: "zh",
              lemma: "æˆ‘",
              axis_key: "reading_to_form",
              prompt_type: "reading",
              response_type: "source_form",
              stage: 3,
              due_at: "2026-08-01T18:00:00Z",
              last_seen_at: "2026-07-09T12:10:00Z",
              last_result: "incorrect",
              pass_count: 3,
              fail_count: 1,
            },
          ],
        },
        {
          language_code: "zh",
          lemma: "宇宙",
          raw_exposures: 3,
          weighted_exposure: 1.8,
          unique_pages: 1,
          unique_books: 1,
          help_requests: 0,
          state: "new",
          confidence_score: 0.2,
          next_due_at: "2026-08-01T18:00:00Z",
          manual_override: null,
          first_seen_at: "2026-07-09T12:15:00Z",
          last_seen_at: "2026-07-09T12:15:00Z",
          origins: ["glossed"],
          assessment_axes: [],
        },
      ],
      study_item_count: 3,
      study_programs: [
        {
          language_code: "ru",
          language_label: "Russian",
          program_code: "ru-core",
          program_label: "Russian starter program",
          program_source_label: "RU5000",
          level_count: 1,
          levels: [
            {
              level_code: "level-1",
              level_label: "Level 1",
              item_count: 3,
              introduction_note: "Intro frequency core from RU5000.",
              items: [
                {
                  language_code: "ru",
                  language_label: "Russian",
                  program_code: "ru-core",
                  program_label: "Russian starter program",
                  program_source_label: "RU5000",
                  level_code: "level-1",
                  level_label: "Level 1",
                  lemma: "и",
                  display_form: "и",
                  pronunciation: "i",
                  definition_short: "and",
                  proficiency_level: "TRKI A1",
                  frequency_rank: 2,
                  progress_state: "new",
                  confidence_score: null,
                  saved_count: 0,
                  first_seen_at: null,
                  last_seen_at: null,
                  assessment_axes: [],
                },
                {
                  language_code: "ru",
                  language_label: "Russian",
                  program_code: "ru-core",
                  program_label: "Russian starter program",
                  program_source_label: "RU5000",
                  level_code: "level-1",
                  level_label: "Level 1",
                  lemma: "в",
                  display_form: "в",
                  pronunciation: "v",
                  definition_short: "in; into",
                  proficiency_level: "TRKI A1",
                  frequency_rank: 4,
                  progress_state: "learning",
                  confidence_score: 0.28,
                  saved_count: 1,
                  first_seen_at: "2026-07-09T12:00:00Z",
                  last_seen_at: "2026-07-09T12:10:00Z",
                  assessment_axes: [],
                },
                {
                  language_code: "ru",
                  language_label: "Russian",
                  program_code: "ru-core",
                  program_label: "Russian starter program",
                  program_source_label: "RU5000",
                  level_code: "level-1",
                  level_label: "Level 1",
                  lemma: "дом",
                  display_form: "дом",
                  pronunciation: "dom",
                  definition_short: "house",
                  proficiency_level: "TRKI A1",
                  frequency_rank: 8,
                  progress_state: "review",
                  confidence_score: 0.63,
                  saved_count: 2,
                  first_seen_at: "2026-07-09T12:00:00Z",
                  last_seen_at: "2026-07-09T12:10:00Z",
                  assessment_axes: [],
                },
              ],
            },
          ],
        },
        ...demoStarterPrograms,
      ],
      study_groups: [
        {
          language_code: "zh",
          language_label: "Chinese",
          item_count: 2,
          items: [
            {
              language_code: "zh",
              language_label: "Chinese",
              lemma: "我",
              display_form: "我",
              source_book_id: DEMO_BOOK_ID,
              source_book_title: demoBookRecord.title,
              source_page_number: 1,
              source_sentence_order: 1,
              source_token_order: 1,
              source_surface_form: "我",
              source_sentence_text: "我喜欢阅读。",
              pronunciation: null,
              romanization: "wo3",
              definition_short: "I; me",
              proficiency_level: "HSK 1",
              click_count: 2,
              first_seen_at: "2026-07-09T12:00:00Z",
              last_seen_at: "2026-07-09T12:10:00Z",
              assessment_axes: [
                {
                  language_code: "zh",
                  lemma: "我",
                  axis_key: "form_to_meaning",
                  prompt_type: "source_form",
                  response_type: "meaning",
                  stage: 3,
                  due_at: "2026-08-01T18:00:00Z",
                  last_seen_at: "2026-07-09T12:10:00Z",
                  last_result: "correct",
                  pass_count: 3,
                  fail_count: 0,
                },
                {
                  language_code: "zh",
                  lemma: "我",
                  axis_key: "form_to_reading",
                  prompt_type: "source_form",
                  response_type: "reading",
                  stage: 2,
                  due_at: "2026-08-01T15:00:00Z",
                  last_seen_at: "2026-07-09T12:10:00Z",
                  last_result: "correct",
                  pass_count: 2,
                  fail_count: 0,
                },
                {
                  language_code: "zh",
                  lemma: "我",
                  axis_key: "meaning_to_form",
                  prompt_type: "meaning",
                  response_type: "source_form",
                  stage: 6,
                  due_at: "2026-08-04T12:00:00Z",
                  last_seen_at: "2026-07-09T12:10:00Z",
                  last_result: "correct",
                  pass_count: 5,
                  fail_count: 1,
                },
                {
                  language_code: "zh",
                  lemma: "我",
                  axis_key: "reading_to_form",
                  prompt_type: "reading",
                  response_type: "source_form",
                  stage: 3,
                  due_at: "2026-08-01T18:00:00Z",
                  last_seen_at: "2026-07-09T12:10:00Z",
                  last_result: "incorrect",
                  pass_count: 3,
                  fail_count: 1,
                },
              ],
            },
            {
              language_code: "zh",
              language_label: "Chinese",
              lemma: "宇宙",
              display_form: "宇宙",
              source_book_id: DEMO_BOOK_ID,
              source_book_title: demoBookRecord.title,
              source_page_number: 2,
              source_sentence_order: 1,
              source_token_order: 3,
              source_surface_form: "宇宙",
              source_sentence_text: "宇宙很大。",
              pronunciation: null,
              romanization: "yu3 zhou4",
              definition_short: "universe",
              proficiency_level: "HSK 3",
              click_count: 1,
              first_seen_at: "2026-07-09T12:15:00Z",
              last_seen_at: "2026-07-09T12:15:00Z",
              assessment_axes: [
                {
                  language_code: "zh",
                  lemma: "宇宙",
                  axis_key: "form_to_meaning",
                  prompt_type: "source_form",
                  response_type: "meaning",
                  stage: 2,
                  due_at: "2026-08-01T12:00:00Z",
                  last_seen_at: "2026-07-09T12:15:00Z",
                  last_result: "correct",
                  pass_count: 2,
                  fail_count: 0,
                },
                {
                  language_code: "zh",
                  lemma: "宇宙",
                  axis_key: "form_to_reading",
                  prompt_type: "source_form",
                  response_type: "reading",
                  stage: 4,
                  due_at: "2026-08-02T12:00:00Z",
                  last_seen_at: "2026-07-09T12:15:00Z",
                  last_result: "correct",
                  pass_count: 4,
                  fail_count: 0,
                },
                {
                  language_code: "zh",
                  lemma: "宇宙",
                  axis_key: "meaning_to_form",
                  prompt_type: "meaning",
                  response_type: "source_form",
                  stage: 1,
                  due_at: "2026-08-01T09:00:00Z",
                  last_seen_at: "2026-07-09T12:15:00Z",
                  last_result: "incorrect",
                  pass_count: 1,
                  fail_count: 2,
                },
                {
                  language_code: "zh",
                  lemma: "宇宙",
                  axis_key: "reading_to_form",
                  prompt_type: "reading",
                  response_type: "source_form",
                  stage: 6,
                  due_at: "2026-08-04T12:00:00Z",
                  last_seen_at: "2026-07-09T12:15:00Z",
                  last_result: "correct",
                  pass_count: 6,
                  fail_count: 0,
                },
              ],
            },
          ],
        },
        {
          language_code: "ja",
          language_label: "Japanese",
          item_count: 1,
          items: [
            {
              language_code: "ja",
              language_label: "Japanese",
              lemma: "たのしい",
              display_form: "たのしい",
              source_book_id: DEMO_BOOK_ID,
              source_book_title: demoBookRecord.title,
              source_page_number: 3,
              source_sentence_order: 2,
              source_token_order: 4,
              source_surface_form: "たのしい",
              source_sentence_text: "たのしい時間です。",
              pronunciation: "たのしい",
              romanization: "tanoshii",
              definition_short: "fun; enjoyable",
              proficiency_level: "JLPT N5",
              click_count: 1,
              first_seen_at: "2026-07-09T12:20:00Z",
              last_seen_at: "2026-07-09T12:20:00Z",
              assessment_axes: [
                {
                  language_code: "ja",
                  lemma: "たのしい",
                  axis_key: "form_to_meaning",
                  prompt_type: "source_form",
                  response_type: "meaning",
                  stage: 5,
                  due_at: "2026-08-03T12:00:00Z",
                  last_seen_at: "2026-07-09T12:20:00Z",
                  last_result: "correct",
                  pass_count: 5,
                  fail_count: 0,
                },
                {
                  language_code: "ja",
                  lemma: "たのしい",
                  axis_key: "form_to_reading",
                  prompt_type: "source_form",
                  response_type: "reading",
                  stage: 3,
                  due_at: "2026-08-01T18:00:00Z",
                  last_seen_at: "2026-07-09T12:20:00Z",
                  last_result: "correct",
                  pass_count: 3,
                  fail_count: 0,
                },
                {
                  language_code: "ja",
                  lemma: "たのしい",
                  axis_key: "meaning_to_form",
                  prompt_type: "meaning",
                  response_type: "source_form",
                  stage: 2,
                  due_at: "2026-08-01T15:00:00Z",
                  last_seen_at: "2026-07-09T12:20:00Z",
                  last_result: "wrong_axis",
                  pass_count: 2,
                  fail_count: 0,
                },
                {
                  language_code: "ja",
                  lemma: "たのしい",
                  axis_key: "reading_to_form",
                  prompt_type: "reading",
                  response_type: "source_form",
                  stage: 1,
                  due_at: "2026-08-01T09:00:00Z",
                  last_seen_at: "2026-07-09T12:20:00Z",
                  last_result: "incorrect",
                  pass_count: 1,
                  fail_count: 1,
                },
              ],
            },
          ],
        },
      ],
    } satisfies StudySurfaceResponse;
  }

  if (route === "/search") {
    const query = url.searchParams.get("query") ?? "";
    const normalized = query.trim();
    return {
      query: normalized,
      result_count: normalized ? 2 : 0,
      results: normalized
        ? [
            {
              kind: "book",
              book_id: demoBookRecord.id,
              book_title: demoBookRecord.title,
              page_number: null,
              sentence_order: null,
              lemma: null,
              surface_form: null,
              snippet: `${demoBookRecord.title} - ${demoBookRecord.author}`,
              score: 100,
            },
            {
              kind: "lexical_entry",
              book_id: demoBookRecord.id,
              book_title: demoBookRecord.title,
              page_number: 1,
              sentence_order: 1,
              lemma: normalized,
              surface_form: normalized,
              snippet: `Demo search hit for ${normalized}`,
              score: 90,
            },
          ]
        : [],
    } satisfies SearchSurfaceResponse;
  }

  const lexiconMatch = route === "/lexicon/lookup" ? url.searchParams.get("term") : null;
  if (lexiconMatch) {
    const term = lexiconMatch.trim();
    const entry: LexiconEntryRecord = {
      id: 1,
      language_code: url.searchParams.get("language_code") ?? "zh",
      entry_type: "demo",
      surface_form: term,
      pronunciation: null,
      pinyin: null,
      tone: null,
      definition: `Demo dictionary entry for ${term}.`,
      radical: null,
      stroke_count: null,
      hsk_level: null,
      frequency_rank: null,
      note: "GitHub Pages demo data",
      source_name: "TextPlex demo",
      source_path: "demo://lexicon",
    };
    return {
      query: term,
      language_code: entry.language_code,
      entries: [entry],
      resolution_source: "local",
    } satisfies LexiconLookupResponse;
  }

  return null;
}

export function getDemoPostResponse(pathname: string, body: unknown): unknown | null {
  const url = new URL(pathname, "http://demo.local");
  const route = url.pathname;

  if (route === `/books/${DEMO_BOOK_ID}/extract`) {
    return {
      status: "complete",
      extraction_path: "/demo/extractions/book-extraction.json",
    } satisfies BookExtractionTriggerResponse;
  }

  if (route === "/learning/sessions") {
    const request = body as { book_id?: string } | null;
    return {
      id: `demo-session-${request?.book_id ?? DEMO_BOOK_ID}`,
      book_id: request?.book_id ?? DEMO_BOOK_ID,
      started_at: "2026-07-09T00:00:00Z",
      ended_at: null,
      active_seconds: 0,
    } satisfies ReadingSessionRecord;
  }

  if (route === "/learning/page-reads") {
    const request = body as { session_id?: string; book_id?: string; page_number?: number; active_seconds?: number } | null;
    return {
      id: 1,
      session_id: request?.session_id ?? "demo-session",
      book_id: request?.book_id ?? DEMO_BOOK_ID,
      page_number: request?.page_number ?? 1,
      active_seconds: request?.active_seconds ?? 0,
      estimated_seconds: 30,
      completion_ratio: 1,
      counted_as_read: true,
      completed_at: "2026-07-09T00:00:00Z",
    } satisfies PageReadRecord;
  }

  if (route === "/learning/sentence-reads") {
    const request = body as { session_id?: string; book_id?: string; page_number?: number; sentence_order?: number; sentence_text?: string; token_count?: number; character_count?: number; active_seconds?: number } | null;
    return {
      id: 1,
      session_id: request?.session_id ?? "demo-session",
      book_id: request?.book_id ?? DEMO_BOOK_ID,
      page_number: request?.page_number ?? 1,
      sentence_order: request?.sentence_order ?? 1,
      sentence_text: request?.sentence_text ?? "",
      token_count: request?.token_count ?? 0,
      character_count: request?.character_count ?? 0,
      active_seconds: request?.active_seconds ?? 0,
      completed_at: "2026-07-09T00:00:00Z",
    } satisfies SentenceReadRecord;
  }

  if (route === "/learning/study-items") {
    const request = body as {
      book_id?: string;
      language_code?: string;
      lemma?: string;
      display_form?: string;
      page_number?: number;
      sentence_order?: number;
      token_order?: number;
      source_surface_form?: string;
      source_sentence_text?: string;
      pronunciation?: string | null;
      romanization?: string | null;
      definition_short?: string | null;
      proficiency_level?: string | null;
    } | null;
    return {
      language_code: request?.language_code ?? "zh",
      lemma: request?.lemma ?? "",
      display_form: request?.display_form ?? request?.lemma ?? "",
      source_book_id: request?.book_id ?? DEMO_BOOK_ID,
      source_page_number: request?.page_number ?? 1,
      source_sentence_order: request?.sentence_order ?? 1,
      source_token_order: request?.token_order ?? 1,
      source_surface_form: request?.source_surface_form ?? request?.display_form ?? "",
      source_sentence_text: request?.source_sentence_text ?? "",
      pronunciation: request?.pronunciation ?? null,
      romanization: request?.romanization ?? null,
      definition_short: request?.definition_short ?? null,
      proficiency_level: request?.proficiency_level ?? null,
      click_count: 1,
      first_seen_at: "2026-07-09T12:00:00Z",
      last_seen_at: "2026-07-09T12:00:00Z",
    } satisfies StudyVocabularyItemRecord;
  }

  if (route === "/learning/vocabulary-reviews") {
    const request = body as { language_code?: string; lemma?: string } | null;
    return {
      language_code: request?.language_code ?? "zh",
      lemma: request?.lemma ?? "",
      mastery_level: "learning",
      mastery_score: 0,
      srs_stage: 1,
      next_due_at: null,
      stage_zero_complete: true,
      axes: [],
    } satisfies VocabularyAssessmentStateRecord;
  }

  if (route === "/articles/generate") {
    const request = body as {
      language_code?: string;
      topic?: string | null;
      genre?: string | null;
      tone?: string | null;
      curriculum_mode?: string | null;
      curriculum_level?: string | null;
      sentence_count?: number;
    } | null;
    const languageCode = request?.language_code ?? demoBookRecord.language_code;
    const topic = request?.topic?.trim() || {
      travel: "travel planning",
      news: "a local news update",
      dialogue: "a short conversation",
      workplace: "work tasks",
      family: "family routine",
      school: "school life",
      mystery: "a small mystery",
      science: "a simple science topic",
      culture: "a cultural habit",
      food: "food and cooking",
    }[request?.genre ?? ""] || "daily life";
    const titlePrefix = [languageCode.toUpperCase(), request?.curriculum_level?.trim() || ""].filter(Boolean).join(" ");
    return {
      book: demoBookRecord,
      title: `${titlePrefix ? `${titlePrefix} ` : ""}Practice article: ${topic}`,
      language_code: languageCode,
      topic,
      sentence_count: request?.sentence_count ?? 30,
      article_text: `This is a demo practice article about ${topic}. It uses the existing sample book in demo mode.`,
      known_terms: [],
      recent_terms: [],
      upcoming_terms: [],
      unknown_lemma_count: 0,
      generation_source: "template",
    } satisfies GeneratedReaderArticleResponse;
  }

  return null;
}
