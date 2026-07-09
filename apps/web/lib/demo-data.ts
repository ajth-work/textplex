import type {
  BookExtractionResult,
  BookExtractionTriggerResponse,
  BookPageManifest,
  BookRecord,
  BookReaderPageResponse,
  LearningProfileSummary,
  LexiconEntryRecord,
  LexiconLookupResponse,
  PageExtractionArtifact,
  PageExtractionResult,
  PageReadRecord,
  ReadingSessionRecord,
  SentenceResult,
  TokenOccurrenceResult,
  TokenResult,
} from "./textplex";

export const DEMO_BOOK_ID = "demo-three-body";
export const DEMO_PAGE_COUNT = 4;

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
  return {
    order: 0,
    text: sentence.text,
    tokens: sentence.tokens.map((token, index) => ({
      ...makeToken(token.surface_form, languageCode, token.definition_short ?? null),
      order: index + 1,
    })),
    grammar_patterns: [],
  };
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

const demoBookRecord: BookRecord = {
  id: DEMO_BOOK_ID,
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
  extracted_page_count: DEMO_PAGE_COUNT,
  extraction_path: "/demo/extractions/book-extraction.json",
  created_at: "2026-07-09T00:00:00Z",
  processed_at: "2026-07-09T00:00:00Z",
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
export const demoLearningProfileSummary: LearningProfileSummary = {
  database_path: "demo/profile.sqlite3",
  reading_sessions: 1,
  page_reads: 0,
  active_books: 1,
  vocabulary_progress_rows: demoSummary.lexical_entries.length,
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

  if (route === "/learning/profile") {
    return demoLearningProfileSummary;
  }

  const lexiconMatch = route === "/lexicon/lookup" ? url.searchParams.get("term") : null;
  if (lexiconMatch) {
    const term = lexiconMatch.trim();
    const entry: LexiconEntryRecord = {
      id: 1,
      language_code: url.searchParams.get("language_code") ?? "zh",
      entry_type: "demo",
      surface_form: term,
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

  return null;
}
