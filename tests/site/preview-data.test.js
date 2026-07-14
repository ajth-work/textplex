const assert = require("node:assert/strict");
const { test } = require("node:test");

const { loadPreviewData } = require("./helpers/browser-context");

test("preview data exposes seeded library and reader profiles", () => {
  const { window } = loadPreviewData();
  const api = window.TextPlexPreview;

  assert.ok(api, "preview API should exist on window");
  assert.ok(api.ready, "preview API should expose a hydration promise");

  const books = api.listBooks();
  assert.ok(books.length >= 4, "seeded library should expose multiple records");

  const libraryProfile = api.getLibraryProfile("little-prince");
  assert.equal(libraryProfile.id, "little-prince");
  assert.equal(libraryProfile.title, "The Little Prince");
  assert.equal(libraryProfile.readerHref, "./reader-preview.html?book=little-prince");
  assert.equal(libraryProfile.libraryHref, "./library-detail-preview.html?book=little-prince");

  const readerProfile = api.getReaderProfile("little-prince");
  assert.equal(readerProfile.id, "little-prince");
  assert.equal(readerProfile.totalSentences, 3, "reader view should be padded to three pages");
  assert.ok(readerProfile.sentences[0].tokens.length > 0, "reader sentence should include tokens");
  assert.ok(readerProfile.sentences[2].translation.length > 0, "synthetic fallback page should be generated");

  const chineseProfile = api.getReaderProfile("article-demo-briefing");
  assert.deepEqual(chineseProfile.sentences[1].phonetics, ["wèi", "le", "cè", "shì", "jù", "zi", "chù", "lǐ"]);
  assert.deepEqual(chineseProfile.sentences[1].tokens.map((token) => token.surface), ["为了", "测试", "句子", "处理", "。"]);
});

test("imported records become live book records and resolve by query params", () => {
  const { window } = loadPreviewData();
  const api = window.TextPlexPreview;

  const record = api.createImportedRecord("article", {
    id: "demo-upload",
    title: "Demo Upload",
    author: "Local import",
    languageCode: "fr",
    sentences: [
      {
        tokens: [{ surface: "Bonjour" }, { surface: "monde" }],
        translation: ["Hello world."],
        vocabulary: {
          surface: "Bonjour",
          reading: "bonjour",
          tag: "demo",
          definition: "n. greeting",
        },
      },
    ],
  });

  assert.equal(record.id, "demo-upload");
  assert.ok(api.listBooks().some((book) => book.id === "demo-upload"));
  assert.equal(api.resolveBookId({ search: "?book=demo-upload" }), "demo-upload");

  const importedLibrary = api.getLibraryProfile("demo-upload");
  const importedReader = api.getReaderProfile("demo-upload");

  assert.equal(importedLibrary.title, "Demo Upload");
  assert.equal(importedReader.totalSentences, 3, "imported record should also be expanded to three pages");
  assert.equal(api.getSelectedBookId(), "demo-upload");

  api.selectBook("little-prince");
  assert.equal(api.getSelectedBookId(), "little-prince");
});

test("preview data hydrates live books from the processor API", async () => {
  const fetchCalls = [];
  const fetchImpl = async (url) => {
    const href = String(url);
    fetchCalls.push(href);

    if (href.endsWith("/books")) {
      return responseJson([
        {
          id: "api-book",
          title: "Live Chinese Sample",
          author: "Local import",
          language_code: "zh",
          source_filename: "sample.txt",
          source_path: "C:/tmp/sample.txt",
          total_pages: 3,
          status: "extracted",
          page_split_status: "complete",
          page_image_count: 3,
          extracted_page_count: 3,
          created_at: "2026-07-12T10:00:00.000Z",
          processed_at: "2026-07-12T10:05:00.000Z",
        },
      ]);
    }

    if (href.includes("/analysis/api-book")) {
      return responseJson({
        book_id: "api-book",
        title: "Live Chinese Sample",
        author: "Local import",
        language_code: "zh",
        total_pages: 3,
        extracted_page_count: 3,
        sentence_count: 2,
        lexical_entry_count: 2,
        token_occurrence_count: 6,
        has_extraction: true,
        top_lexical_entries: [
          { lemma: "这是", display_form: "这是", frequency_in_book: 1, first_page: 1, last_page: 1 },
        ],
      });
    }

    if (href.includes("/books/api-book/pages/1")) {
      return responseJson({
        book: { id: "api-book" },
        page: { page_number: 1 },
        image_url: "/books/api-book/pages/1/image",
        extraction: {
          page: {
            page_number: 1,
            sentences: [
              {
                order: 1,
                text: "这是一个测试。",
                tokens: [
                  { surface_form: "这", romanization: "zhè", definition_short: "this" },
                  { surface_form: "是", romanization: "shì" },
                  { surface_form: "一个", romanization: "yí gè" },
                  { surface_form: "测试", romanization: "cè shì" },
                  { surface_form: "。", romanization: "" },
                ],
              },
            ],
          },
        },
      });
    }

    if (href.includes("/books/api-book/pages/2")) {
      return responseJson({
        book: { id: "api-book" },
        page: { page_number: 2 },
        image_url: "/books/api-book/pages/2/image",
        extraction: {
          page: {
            page_number: 2,
            sentences: [
              {
                order: 1,
                text: "第二页用于回归测试。",
                tokens: [
                  { surface_form: "第二页", romanization: "dì èr yè" },
                  { surface_form: "用于", romanization: "yòng yú" },
                  { surface_form: "回归", romanization: "huí guī" },
                  { surface_form: "测试", romanization: "cè shì" },
                  { surface_form: "。", romanization: "" },
                ],
              },
            ],
          },
        },
      });
    }

    if (href.includes("/books/api-book/pages/3")) {
      return responseJson({
        book: { id: "api-book" },
        page: { page_number: 3 },
        image_url: "/books/api-book/pages/3/image",
        extraction: {
          page: {
            page_number: 3,
            sentences: [
              {
                order: 1,
                text: "第三页继续展示动态内容。",
                tokens: [
                  { surface_form: "第三页", romanization: "dì sān yè" },
                  { surface_form: "继续", romanization: "jì xù" },
                  { surface_form: "展示", romanization: "zhǎn shì" },
                  { surface_form: "动态", romanization: "dòng tài" },
                  { surface_form: "内容", romanization: "nèi róng" },
                  { surface_form: "。", romanization: "" },
                ],
              },
            ],
          },
        },
      });
    }

    if (href.includes("/books/api-book/pages")) {
      return responseJson({
        book_id: "api-book",
        source_path: "C:/tmp/sample.txt",
        total_pages: 3,
        page_count: 3,
        pages: [
          { page_number: 1, image_filename: "page-0001.png", image_path: "C:/tmp/page-0001.png", status: "ready", created_at: "2026-07-12T10:00:00.000Z" },
          { page_number: 2, image_filename: "page-0002.png", image_path: "C:/tmp/page-0002.png", status: "ready", created_at: "2026-07-12T10:01:00.000Z" },
          { page_number: 3, image_filename: "page-0003.png", image_path: "C:/tmp/page-0003.png", status: "ready", created_at: "2026-07-12T10:02:00.000Z" },
        ],
      });
    }

    if (href.includes("/lexicon/lookup")) {
      const parsed = new URL(href);
      const term = parsed.searchParams.get("term") ?? "";
      return responseJson({
        query: term,
        language_code: "zh",
        entries: [
          {
            id: 1,
            language_code: "zh",
            entry_type: "vocabulary",
            surface_form: term,
            pinyin: "zhè shì",
            definition: "this is",
            radical: null,
            stroke_count: null,
            hsk_level: "demo",
            frequency_rank: 1,
            note: null,
            source_name: "mock",
            source_path: "mock",
          },
        ],
      });
    }

    throw new Error(`Unexpected fetch: ${href}`);
  };

  const { window } = loadPreviewData({
    fetchImpl,
    localStorageSeed: {
      "textplex.processorBaseUrl": "http://processor.test:8201",
    },
  });
  await window.TextPlexPreview.ready;

  const api = window.TextPlexPreview;
  const record = api.getBook("api-book");
  assert.ok(record, "live book should be hydrated into the preview store");

  const readerProfile = api.getReaderProfile("api-book");
  assert.equal(readerProfile.id, "api-book");
  assert.equal(readerProfile.sentences.length, 3, "live reader preview should expose the fetched pages");
  assert.match(readerProfile.sentences[0].tokens.map((token) => token.surface).join(""), /这是一个测试/);
  assert.equal(readerProfile.sentences[0].vocabulary.reading, "zhè shì");


  const libraryProfile = api.getLibraryProfile("api-book");
  assert.equal(libraryProfile.kindLabel, "TXT");
  assert.match(libraryProfile.summary, /Live API record/);
  assert.equal(api.getSelectedBookId(), "spring-dawn", "hydration should preserve the previous selection");
  assert.ok(fetchCalls.some((url) => url.endsWith("/books")), "book list should be requested");
});

function responseJson(payload) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => payload,
  };
}
