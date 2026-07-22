const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const { createNode, createPagerNode, createSentenceLineNode, loadPreviewData, loadPreviewRouter } = require("./helpers/browser-context");

test("reader definition card includes an HSK metadata pill slot", () => {
  const markup = fs.readFileSync(path.join(__dirname, "..", "..", "site", "reader-preview.html"), "utf8");

  assert.match(markup, /class="vocab-pinyin"[\s\S]*class="tag vocab-level-pill"/);
});

test("router helpers resolve preview routes and render icon-button cards", async () => {
  const { window } = loadPreviewRouter();
  await window.TextPlexPreviewRouter.ready;
  const router = window.TextPlexPreviewRouter;
  const preview = window.TextPlexPreview;

  assert.ok(router, "router helpers should be exported to window");
  assert.equal(router.currentBookId(), "spring-dawn");
  assert.equal(router.currentBookId({ requireExplicit: true }), "");

  preview.setSelectedTrackCode("jlpt");

  const readerUrl = router.resolveTargetUrl(router.routes.reader, "little-prince");
  assert.equal(readerUrl, "http://example.test/reader-preview.html?book=little-prince&track=jlpt");

  const analysisUrl = router.resolveTargetUrl(router.routes.analysis, "little-prince");
  assert.equal(analysisUrl, "http://example.test/analysis-preview.html?book=little-prince&track=jlpt");

  const profileUrl = router.resolveTargetUrl(router.routes.profile);
  assert.equal(profileUrl, "http://example.test/profile-preview.html?book=spring-dawn&track=jlpt");

  const profile = preview.getLibraryProfile("little-prince");
  const gridCard = router.renderLibraryGridCard(profile, "spring-dawn");
  const listRow = router.renderLibraryListRow(profile, "spring-dawn");

  assert.match(gridCard, /data-open-library/);
  assert.match(gridCard, /data-open-reader/);
  assert.match(gridCard, /action-icon-info/);
  assert.match(gridCard, /action-icon-open/);
  assert.match(listRow, /data-open-library/);
  assert.match(listRow, /data-open-reader/);
});

test("HSK chart series preserve token, sentence, and page aggregation", async () => {
  const { window } = loadPreviewRouter();
  await window.TextPlexPreviewRouter.ready;
  const router = window.TextPlexPreviewRouter;
  const sentence = {
    text: "春眠不觉",
    tokens: [
      { surface: "春", proficiency_level: "HSK 1" },
      { surface: "眠", proficiency_level: "HSK 3" },
      { surface: "不", proficiency_level: "HSK 2" },
      { surface: "觉", proficiency_level: "HSK 4" },
    ],
  };
  const pages = [
    { pageNumber: 1, sentences: [sentence] },
    { pageNumber: 2, sentences: [{ text: "晓", tokens: [{ surface: "晓", proficiency_level: "HSK 5" }] }] },
  ];

  assert.equal(router.parseHskChartLevel("HSK 3.5"), 3.5);
  assert.deepEqual(
    Array.from(router.buildTokenHskChartSeries(sentence), (point) => point.value),
    [1, 3, 2, 4],
  );
  assert.deepEqual(
    Array.from(router.buildSentenceHskChartSeries(pages), (point) => point.value),
    [2.5, 5],
  );
  assert.deepEqual(
    Array.from(router.buildPageHskChartSeries(pages), (point) => point.value),
    [2.5, 5],
  );
});

test("library preview renders the live bookshelf data", async () => {
  const shelfNode = createNode("section");
  const countNode = createNode("div");
  const emptyState = createNode("p");
  const searchInput = createNode("input");
  searchInput.value = "spring";
  const gridModeButton = createNode("button");
  const listModeButton = createNode("button");

  gridModeButton.setAttribute("data-library-mode", "grid");
  listModeButton.setAttribute("data-library-mode", "list");
  searchInput.value = "";

  const browser = loadPreviewRouter({
    pathname: "/library-preview.html",
    selectorMap: {
      "#librarySearch": searchInput,
      "[data-library-mode]": [gridModeButton, listModeButton],
      "button, a": [],
    },
    idMap: {
      libraryShelf: shelfNode,
      libraryEmpty: emptyState,
      libraryCount: countNode,
    },
  });

  await browser.window.TextPlexPreviewRouter.ready;

  assert.match(shelfNode.innerHTML, /The Little Prince/);
  assert.match(shelfNode.innerHTML, /data-open-library/);
  assert.match(shelfNode.innerHTML, /data-open-reader/);
  assert.match(countNode.textContent, /^\d+ documents$/);
  assert.equal(emptyState.hidden, true);
  assert.equal(searchInput.value, "");
  assert.equal(browser.window.localStorage.getItem("textplex:library-view-mode"), null);
});

test("library preview offers a restore button when the sample shelf is empty", async () => {
  const shelfNode = createNode("section");
  const countNode = createNode("div");
  const emptyState = createNode("p");
  const searchInput = createNode("input");
  const gridModeButton = createNode("button");
  const listModeButton = createNode("button");
  gridModeButton.setAttribute("data-library-mode", "grid");
  listModeButton.setAttribute("data-library-mode", "list");

  const archivedStore = {
    selectedBookId: "spring-dawn",
    books: [],
    archivedBookIds: ["spring-dawn", "tengwangge", "little-prince", "snow-country", "article-demo-briefing"],
  };

  const browser = loadPreviewRouter({
    pathname: "/library-preview.html",
    localStorageSeed: {
      "textplex.preview.store": JSON.stringify(archivedStore),
    },
    selectorMap: {
      "#librarySearch": searchInput,
      "[data-library-mode]": [gridModeButton, listModeButton],
      "button, a": [],
    },
    idMap: {
      libraryShelf: shelfNode,
      libraryEmpty: emptyState,
      libraryCount: countNode,
    },
  });

  await browser.window.TextPlexPreviewRouter.ready;

  assert.equal(emptyState.hidden, false);
  assert.match(emptyState.innerHTML, /Restore sample library/);
});

test("explicit book lookups still resolve archived records by id", async () => {
  const archivedStore = {
    selectedBookId: "spring-dawn",
    books: [
      {
        id: "little-prince",
        contentType: "novel",
        languageCode: "fr",
        title: "The Little Prince",
        titleCn: "The Little Prince",
        author: "Antoine de Saint-ExupÃ©ry",
        authorCn: "Antoine de Saint-ExupÃ©ry",
        kindLabel: "TXT",
        homePriority: 40,
        analysisPriority: 30,
        lastOpenedAt: "2026-07-11T20:00:00.000Z",
        displayDate: "May 7, 2024",
        home: { progress: 65, minutesLeft: "5 min left", coverClass: "three" },
        analysis: { tag: "B1" },
        library: { summary: "Archived sample book." },
        reader: { progressPrefix: "TXT", sentences: [] },
      },
    ],
    archivedBookIds: ["little-prince"],
  };

  const browser = loadPreviewData({
    localStorageSeed: {
      "textplex.preview.store": JSON.stringify(archivedStore),
    },
  });

  await browser.window.TextPlexPreview.ready;

  const readerProfile = browser.window.TextPlexPreview.getReaderProfile("little-prince");
  const libraryProfile = browser.window.TextPlexPreview.getLibraryProfile("little-prince");

  assert.ok(readerProfile, "archived records should still resolve for explicit reader lookups");
  assert.ok(libraryProfile, "archived records should still resolve for explicit library lookups");
  assert.equal(readerProfile.title, "The Little Prince");
  assert.equal(libraryProfile.title, "The Little Prince");
});

test("library preview opens the clicked book instead of the default selection", async () => {
  function loadLibraryBrowser() {
    const infoButton = createNode("button");
    infoButton.setAttribute("data-book-id", "little-prince");
    infoButton.setAttribute("data-href", "./library-detail-preview.html?book=little-prince");

    const openButton = createNode("button");
    openButton.setAttribute("data-book-id", "little-prince");
    openButton.setAttribute("data-href", "./reader-preview.html?book=little-prince");

    const cardNode = createNode("article");
    cardNode.setAttribute("data-book-id", "little-prince");
    cardNode.setAttribute("data-library-href", "./library-detail-preview.html?book=little-prince");

    const shelfNode = createNode("section");
    const countNode = createNode("div");
    const emptyState = createNode("p");
    const searchInput = createNode("input");
    const gridModeButton = createNode("button");
    const listModeButton = createNode("button");
    gridModeButton.setAttribute("data-library-mode", "grid");
    listModeButton.setAttribute("data-library-mode", "list");

    shelfNode.querySelectorAll = (selector) => {
      if (selector === "[data-open-library]") {
        return [infoButton];
      }
      if (selector === "[data-open-reader]") {
        return [openButton];
      }
      if (selector === "[data-library-card]") {
        return [cardNode];
      }
      return [];
    };

    const browser = loadPreviewRouter({
      pathname: "/library-preview.html",
      selectorMap: {
        "#librarySearch": searchInput,
        "[data-library-mode]": [gridModeButton, listModeButton],
        "button, a": [],
      },
      idMap: {
        libraryShelf: shelfNode,
        libraryEmpty: emptyState,
        libraryCount: countNode,
      },
    });

    return { browser, infoButton, openButton, cardNode };
  }

  const { browser: browserOne, infoButton } = loadLibraryBrowser();
  await browserOne.window.TextPlexPreviewRouter.ready;
  infoButton.click();
  assert.match(browserOne.window.location.href, /library-detail-preview\.html\?book=little-prince$/);

  const { browser: browserTwo, openButton } = loadLibraryBrowser();
  await browserTwo.window.TextPlexPreviewRouter.ready;
  openButton.click();
  assert.match(browserTwo.window.location.href, /reader-preview\.html\?book=little-prince$/);

  const { browser: browserThree, cardNode } = loadLibraryBrowser();
  await browserThree.window.TextPlexPreviewRouter.ready;
  cardNode.click();
  assert.match(browserThree.window.location.href, /library-detail-preview\.html\?book=little-prince$/);
});

test("reader preview wires sentence paging from dynamic book data", async () => {
  const titleNode = createNode("h1");
  const authorNode = createNode("p");
  const pagerNode = createPagerNode();
  const lineOne = createNode("div");
  const lineTwo = createNode("div");
  const translationNode = createNode("div");
  const vocabChar = createNode("h2");
  const vocabDefinition = createNode("p");
  const exampleCn = createNode("p");
  const exampleEn = createNode("p");
  const saveButton = createNode("button");
  const moreButton = createNode("button");
  const tokenModeToggle = createNode("button");
  const readingSpan = createNode("span");
  const audioSpan = createNode("span");
  const tagSpan = createNode("span");
  const vocabPinyin = createNode("div");
  vocabPinyin.querySelectorAll = () => [readingSpan, audioSpan, tagSpan];

  const browser = loadPreviewRouter({
    pathname: "/reader-preview.html",
    search: "?book=little-prince",
    selectorMap: {
      ".poem-title": titleNode,
      ".poet": authorNode,
      ".annotated-line": [lineOne, lineTwo],
      ".translation": translationNode,
      ".vocab-char": vocabChar,
      ".vocab-pinyin": vocabPinyin,
      ".vocab-definition": vocabDefinition,
      ".example-cn": exampleCn,
      ".example-en": exampleEn,
      ".button-primary": saveButton,
      ".button-secondary": moreButton,
      ".topbar .icon-btn": [createNode("button")],
      "button, a": [],
    },
    idMap: {
      readerPager: pagerNode,
      readerTokenModeToggle: tokenModeToggle,
      readerMoreActions: moreButton,
    },
  });
  await browser.window.TextPlexPreviewRouter.ready;

  const router = browser.window.TextPlexPreviewRouter;
  const readerProfile = browser.window.TextPlexPreview.getReaderProfile("little-prince");

  assert.equal(browser.document.title.includes("The Little Prince"), true);
  assert.equal(readerProfile.pageCount, 3);
  assert.match(pagerNode.innerHTML, /P1\/3 \| S1\/1/);
  assert.match(lineOne.innerHTML, /sentence-row/);
  assert.ok(translationNode.innerHTML.includes("The little prince"), "first sentence translation should render");
  assert.equal(readingSpan.hidden, false);
  assert.ok(readingSpan.textContent.length > 0, "vocabulary pinyin should be rendered");

  const nextButton = pagerNode.querySelector('[aria-label="Next sentence"]');
  assert.ok(nextButton, "next pager button should exist");
  nextButton.click();

  assert.match(pagerNode.innerHTML, /P2\/3 \| S1\/1/);
  assert.ok(translationNode.innerHTML.includes("quiet wind"), "second sentence should render after paging forward");
  assert.equal(browser.window.sessionStorage.getItem("textplex:reader-page:little-prince"), "1");
  assert.equal(browser.window.sessionStorage.getItem("textplex:reader-sentence:little-prince"), "0");
  assert.equal(router.clamp(5, 0, 2), 2);
  assert.equal(router.clamp(-1, 0, 2), 0);
});

test("reader preview shows a persisted reading session pill and advances book progress", async () => {
  const titleNode = createNode("h1");
  const authorNode = createNode("p");
  const pagerNode = createPagerNode();
  const sessionPill = createNode("div");
  const lineOne = createSentenceLineNode();
  const lineTwo = createNode("div");
  const translationNode = createNode("div");
  const vocabChar = createNode("h2");
  const vocabDefinition = createNode("p");
  const exampleCn = createNode("p");
  const exampleEn = createNode("p");
  const saveButton = createNode("button");
  const moreButton = createNode("button");
  const tokenModeToggle = createNode("button");
  const readingSpan = createNode("span");
  const audioSpan = createNode("span");
  const tagSpan = createNode("span");
  const vocabPinyin = createNode("div");
  vocabPinyin.querySelectorAll = () => [readingSpan, audioSpan, tagSpan];

  const seededBrowser = loadPreviewData();
  seededBrowser.window.TextPlexPreview.createImportedRecord("article", {
    id: "session-book",
    title: "Session Book",
    author: "Local import",
    languageCode: "zh",
    sentences: [
      { tokens: [{ surface: "ç”²" }, { surface: "é¡µ" }, { surface: "ã€‚" }], translation: ["Page one."] },
      { tokens: [{ surface: "ä¹™" }, { surface: "é¡µ" }, { surface: "ã€‚" }], translation: ["Page two."] },
      { tokens: [{ surface: "ä¸™" }, { surface: "é¡µ" }, { surface: "ã€‚" }], translation: ["Page three."] },
      { tokens: [{ surface: "ä¸" }, { surface: "é¡µ" }, { surface: "ã€‚" }], translation: ["Page four."] },
    ],
  });

  const browser = loadPreviewRouter({
    pathname: "/reader-preview.html",
    search: "?book=session-book",
    localStorageSeed: seededBrowser.window.localStorage.snapshot(),
    selectorMap: {
      ".poem-title": titleNode,
      ".poet": authorNode,
      ".annotated-line": [lineOne, lineTwo],
      ".translation": translationNode,
      ".vocab-char": vocabChar,
      ".vocab-pinyin": vocabPinyin,
      ".vocab-definition": vocabDefinition,
      ".example-cn": exampleCn,
      ".example-en": exampleEn,
      ".button-primary": saveButton,
      ".button-secondary": moreButton,
      ".topbar .icon-btn": [createNode("button")],
      ".session-pill": sessionPill,
      "button, a": [],
    },
    idMap: {
      readerPager: pagerNode,
      readerSessionPill: sessionPill,
      readerTokenModeToggle: tokenModeToggle,
      readerMoreActions: moreButton,
    },
  });

  await browser.window.TextPlexPreviewRouter.ready;

  assert.match(sessionPill.innerHTML, /to/i);
  assert.match(sessionPill.innerHTML, /chars/i);
  assert.equal(sessionPill.hidden, false);
  assert.equal(browser.window.TextPlexPreview.getLibraryProfile("session-book").progress, 25);

  const nextButton = pagerNode.querySelector('[aria-label="Next sentence"]');
  nextButton.click();

  assert.match(pagerNode.innerHTML, /P2\/4 \| S1\/1/);
  assert.equal(browser.window.TextPlexPreview.getLibraryProfile("session-book").progress, 50);
  assert.match(sessionPill.innerHTML, /chars/i);
});

test("analysis preview shows an explicit missing-book state for unknown ids", async () => {
  const appNode = createNode("main");
  const browser = loadPreviewRouter({
    pathname: "/analysis-preview.html",
    search: "?book=missing-book",
    selectorMap: {
      ".app": appNode,
    },
  });

  await browser.window.TextPlexPreviewRouter.ready;

  assert.match(appNode.innerHTML, /Analysis record not found/);
  assert.match(appNode.innerHTML, /Missing book: missing-book/);
  assert.match(browser.document.title, /Analysis record not found/);
});

test("library detail preview shows an explicit missing-book state for unknown ids", async () => {
  const appNode = createNode("main");
  const browser = loadPreviewRouter({
    pathname: "/library-detail-preview.html",
    search: "?book=missing-book",
    selectorMap: {
      ".app": appNode,
    },
  });

  await browser.window.TextPlexPreviewRouter.ready;

  assert.match(appNode.innerHTML, /Library record not found/);
  assert.match(appNode.innerHTML, /Missing book: missing-book/);
  assert.match(browser.document.title, /Library record not found/);
});

test("chinese reader tokens keep pinyin attached to each token", async () => {
  const titleNode = createNode("h1");
  const authorNode = createNode("p");
  const pagerNode = createPagerNode();
  const lineOne = createNode("div");
  const lineTwo = createNode("div");
  const translationNode = createNode("div");
  const vocabChar = createNode("h2");
  const vocabPinyin = createNode("div");
  const moreButton = createNode("button");
  const tokenModeToggle = createNode("button");
  vocabPinyin.querySelectorAll = () => [createNode("span"), createNode("span"), createNode("span")];

  const browser = loadPreviewRouter({
    pathname: "/reader-preview.html",
    search: "?book=article-demo-briefing",
    selectorMap: {
      ".poem-title": titleNode,
      ".poet": authorNode,
      ".annotated-line": [lineOne, lineTwo],
      ".translation": translationNode,
      ".vocab-char": vocabChar,
      ".vocab-pinyin": vocabPinyin,
      ".vocab-definition": createNode("p"),
      ".example-cn": createNode("p"),
      ".example-en": createNode("p"),
      ".button-primary": createNode("button"),
      ".button-secondary": moreButton,
      ".topbar .icon-btn": [createNode("button")],
      "button, a": [],
    },
    idMap: {
      readerPager: pagerNode,
      readerTokenModeToggle: tokenModeToggle,
      readerMoreActions: moreButton,
    },
  });
  await browser.window.TextPlexPreviewRouter.ready;

  assert.match(lineOne.innerHTML, /token-reading/);
  assert.match(lineOne.innerHTML, /token-surface/);
  assert.match(lineOne.innerHTML, /data-token-surface="这是"/);
  assert.match(lineOne.innerHTML, /data-token-surface="演示"/);
  assert.match(lineOne.innerHTML, /[，。！？,.!?]/);
  assert.doesNotMatch(lineOne.innerHTML, /pinyin-row/);
  tokenModeToggle.click();
  assert.match(lineOne.innerHTML, /data-token-surface="\u8FD9"/);
  assert.match(lineOne.innerHTML, /data-token-surface="\u662F"/);
});

test("record routes require an explicit book id instead of selecting the seeded record", async () => {
  const browser = loadPreviewRouter({
    pathname: "/reader-preview.html",
    search: "?book=little-prince",
  });

  await browser.window.TextPlexPreviewRouter.ready;

  assert.equal(browser.window.TextPlexPreviewRouter.currentBookId({ requireExplicit: true }), "little-prince");
});

test("record page shells do not contain seeded Spring Dawn content", () => {
  const repoRoot = path.resolve(__dirname, "../..");
  const pages = [
    "site/reader-preview.html",
    "site/analysis-preview.html",
    "site/library-detail-preview.html",
  ];

  for (const page of pages) {
    const html = fs.readFileSync(path.join(repoRoot, page), "utf8");
    assert.doesNotMatch(html, /Spring Dawn|Spring sleep|Synthetic demo content|春晓|孟浩然/iu, page);
  }
});

test("reader preview moves the highlight when a different token is clicked", async () => {
  const titleNode = createNode("h1");
  const authorNode = createNode("p");
  const pagerNode = createPagerNode();
  const lineOne = createSentenceLineNode();
  const lineTwo = createNode("div");
  const translationNode = createNode("div");
  const vocabChar = createNode("h2");
  const vocabDefinition = createNode("p");
  const exampleCn = createNode("p");
  const exampleEn = createNode("p");
  const saveButton = createNode("button");
  const moreButton = createNode("button");
  const readingSpan = createNode("span");
  const audioSpan = createNode("span");
  const tagSpan = createNode("span");
  const vocabPinyin = createNode("div");
  vocabPinyin.querySelectorAll = () => [readingSpan, audioSpan, tagSpan];
  const fetchCalls = [];
  const fetchImpl = async (url) => {
    const parsedUrl = new URL(String(url));
    fetchCalls.push(parsedUrl.href);

    if (parsedUrl.pathname.endsWith("/books")) {
      return {
        ok: true,
        json: async () => [],
      };
    }

    if (parsedUrl.pathname.endsWith("/lexicon/lookup")) {
      const term = parsedUrl.searchParams.get("term") ?? "";
      return {
        ok: true,
        json: async () => ({
          entries: [
            {
              surface_form: term,
              pinyin: `mock-${term}`,
              definition: `Dictionary lookup for ${term}.`,
              hsk_level: "HSK 2",
              example_cn: `${term} is used in a mock sentence.`,
              example_en: `Mock definition for ${term}.`,
              radical: "ç¤º",
              stroke_count: 7,
            },
          ],
        }),
      };
    }

    throw new Error(`Unexpected fetch: ${parsedUrl.href}`);
  };

  const browser = loadPreviewRouter({
    pathname: "/reader-preview.html",
    search: "?book=article-demo-briefing",
    localStorageSeed: {
      "textplex.processorBaseUrl": "http://example.test",
    },
    fetchImpl,
    selectorMap: {
      ".poem-title": titleNode,
      ".poet": authorNode,
      ".annotated-line": [lineOne, lineTwo],
      ".translation": translationNode,
      ".vocab-char": vocabChar,
      ".vocab-pinyin": vocabPinyin,
      ".vocab-definition": vocabDefinition,
      ".example-cn": exampleCn,
      ".example-en": exampleEn,
      ".button-primary": saveButton,
      ".button-secondary": moreButton,
      ".topbar .icon-btn": [createNode("button")],
      "button, a": [],
    },
    idMap: {
      readerPager: pagerNode,
    },
  });

  await browser.window.TextPlexPreviewRouter.ready;

  const selectedBefore = lineOne.querySelector(".token.is-selected");
  assert.ok(selectedBefore, "a token should be selected by default");

  const targetToken = lineOne.querySelectorAll(".token").find((token) => {
    if (token.getAttribute("data-token-punctuation") === "true") {
      return false;
    }
    return token.getAttribute("data-token-surface") !== selectedBefore.getAttribute("data-token-surface");
  });

  assert.ok(targetToken, "there should be another readable token to click");
  targetToken.click();

  const selectedAfter = lineOne.querySelector(".token.is-selected");
  assert.ok(selectedAfter, "clicking a token should keep a selection visible");
  assert.equal(selectedAfter.getAttribute("data-token-surface"), targetToken.getAttribute("data-token-surface"));
  assert.equal(vocabChar.textContent, targetToken.getAttribute("data-token-surface"));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(vocabDefinition.textContent, new RegExp(`Dictionary lookup for ${targetToken.getAttribute("data-token-surface")}`));
  assert.match(readingSpan.textContent, new RegExp(`mock-${targetToken.getAttribute("data-token-surface")}`));
  assert.equal(tagSpan.textContent, "HSK 2");
  assert.ok(readingSpan.textContent.length > 0, "selected token pinyin should stay visible");
  assert.ok(fetchCalls.some((call) => call.includes("/lexicon/lookup")), "reader preview should request a lexicon lookup");
});

test("reader preview keeps token-level definitions for non-anchor tokens", async () => {
  const seededBrowser = loadPreviewData();
  const api = seededBrowser.window.TextPlexPreview;

  api.createImportedRecord("article", {
    id: "metadata-book",
    title: "Metadata Book",
    author: "Local import",
    languageCode: "zh",
    sentences: [
      {
        tokens: [
          { surface: "alpha", romanization: "a1" },
          { surface: "beta", romanization: "b2", definition_short: "second token definition" },
          { surface: ".", romanization: "" },
        ],
        translation: ["Sentence with two readable tokens."],
        vocabulary: {
          surface: "alpha",
          reading: "a1",
          tag: "demo",
          definition: "first token anchor",
        },
      },
    ],
  });

  const browser = loadPreviewRouter({
    pathname: "/reader-preview.html",
    search: "?book=metadata-book",
    localStorageSeed: seededBrowser.window.localStorage.snapshot(),
    selectorMap: {
      ".poem-title": createNode("h1"),
      ".poet": createNode("p"),
      ".annotated-line": [createSentenceLineNode(), createNode("div")],
      ".translation": createNode("div"),
      ".vocab-char": createNode("h2"),
      ".vocab-pinyin": Object.assign(createNode("div"), {
        querySelectorAll: () => [createNode("span"), createNode("span"), createNode("span")],
      }),
      ".vocab-definition": createNode("p"),
      ".example-cn": createNode("p"),
      ".example-en": createNode("p"),
      ".button-primary": createNode("button"),
      ".button-secondary": createNode("button"),
      ".topbar .icon-btn": [createNode("button")],
      "button, a": [],
    },
    idMap: {
      readerPager: createPagerNode(),
    },
  });

  await browser.window.TextPlexPreviewRouter.ready;

  const lineOne = browser.document.querySelector(".annotated-line");
  const tokenButtons = lineOne.querySelectorAll(".token");
  const secondToken = tokenButtons.find((token) => token.getAttribute("data-token-surface") === "beta");

  assert.ok(secondToken, "the second token should exist");
  secondToken.click();

  assert.equal(browser.document.querySelector(".vocab-definition").textContent, "second token definition");
  assert.equal(browser.document.querySelector(".vocab-char").textContent, "beta");
});

test("reader preview shows a not-found state when the lookup misses", async () => {
  const seededBrowser = loadPreviewData();
  const api = seededBrowser.window.TextPlexPreview;

  api.createImportedRecord("article", {
    id: "missing-lookup-book",
    title: "Missing Lookup Book",
    author: "Local import",
    languageCode: "zh",
    sentences: [
      {
      tokens: [
        { surface: "alpha", romanization: "a1" },
        { surface: "示例", romanization: "shi4 li4" },
        { surface: ".", romanization: "" },
      ],
        translation: ["Sentence with a missing lookup."],
        vocabulary: {
          surface: "alpha",
          reading: "a1",
          tag: "demo",
          definition: "first token anchor",
        },
      },
    ],
  });

  const fetchCalls = [];
  const browser = loadPreviewRouter({
    pathname: "/reader-preview.html",
    search: "?book=missing-lookup-book",
    localStorageSeed: {
      ...seededBrowser.window.localStorage.snapshot(),
      "textplex.processorBaseUrl": "http://processor.test",
    },
    fetchImpl: async (url) => {
      const href = String(url);
      fetchCalls.push(href);
      if (href.includes("/lexicon/lookup")) {
        return {
          ok: true,
          json: async () => ({ query: "missing", language_code: "zh", entries: [] }),
        };
      }
      return {
        ok: true,
        json: async () => null,
      };
    },
    selectorMap: {
      ".poem-title": createNode("h1"),
      ".poet": createNode("p"),
      ".annotated-line": [createSentenceLineNode(), createNode("div")],
      ".translation": createNode("div"),
      ".vocab-char": createNode("h2"),
      ".vocab-pinyin": Object.assign(createNode("div"), {
        querySelectorAll: () => [createNode("span"), createNode("span"), createNode("span")],
      }),
      ".vocab-definition": createNode("p"),
      ".example-cn": createNode("p"),
      ".example-en": createNode("p"),
      ".button-primary": createNode("button"),
      ".button-secondary": createNode("button"),
      ".topbar .icon-btn": [createNode("button")],
      "button, a": [],
    },
    idMap: {
      readerPager: createPagerNode(),
      readerTokenModeToggle: createNode("button"),
      readerFallbackModeToggle: createNode("button"),
      readerDefinitionFallback: createNode("div"),
    },
  });

  await browser.window.TextPlexPreviewRouter.ready;

  const lineOne = browser.document.querySelector(".annotated-line");
  const tokenButtons = lineOne.querySelectorAll(".token");
  const missingToken = tokenButtons.find((token) => token.getAttribute("data-token-surface") === "示例");

  assert.ok(missingToken, "the missing token should exist");
  missingToken.click();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(browser.document.querySelector(".vocab-definition").textContent, "No dictionary entry found in imported lexicon.");
  browser.document.getElementById("readerTokenModeToggle").click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(lineOne.innerHTML, /data-token-surface="示"/);
  assert.match(lineOne.innerHTML, /data-token-surface="例"/);
  assert.ok(fetchCalls.some((call) => call.includes("/lexicon/lookup")), "reader preview should still try the lexicon lookup");
});

test("import preview exposes a visible processor URL control", async () => {
  const processorInput = createNode("input");
  const statusNode = createNode("p");
  const saveButton = createNode("button");
  saveButton.setAttribute("data-processor-action", "save");
  const refreshButton = createNode("button");
  refreshButton.setAttribute("data-processor-action", "refresh");

  const browser = loadPreviewRouter({
    pathname: "/import-preview.html",
    localStorageSeed: {
      "textplex.processorBaseUrl": "http://192.168.192.231:8201",
    },
    selectorMap: {
      "[data-processor-action]": [saveButton, refreshButton],
      "button, a": [],
      ".option-row": [],
    },
    idMap: {
      processorBaseUrl: processorInput,
      processorStatus: statusNode,
    },
  });

  await browser.window.TextPlexPreviewRouter.ready;

  assert.equal(processorInput.value, "http://192.168.192.231:8201");
  assert.match(statusNode.textContent, /Processor URL:/);

  processorInput.value = "http://127.0.0.1:8201";
  saveButton.click();

  assert.equal(browser.window.localStorage.getItem("textplex.processorBaseUrl"), "http://127.0.0.1:8201");
  assert.match(statusNode.textContent, /http:\/\/127\.0\.0\.1:8201/);
});

test("import preview processes pasted text and opens the created reader record", async () => {
  const pasteRow = createNode("section");
  const pasteTitleNode = createNode("h3");
  pasteTitleNode.textContent = "Paste Text";
  pasteRow.querySelector = (selector) => (selector === "h3" ? pasteTitleNode : null);

  const pastePanel = createNode("section");
  pastePanel.hidden = true;
  const pasteTitle = createNode("input");
  pasteTitle.value = "Copied article";
  const pasteAuthor = createNode("input");
  pasteAuthor.value = "Web source";
  const pasteLanguage = createNode("select");
  pasteLanguage.value = "en";
  const pasteText = createNode("textarea");
  pasteText.value = "This is copied article text. It should become a real reader record.";
  const pasteStatus = createNode("p");
  const pasteCancel = createNode("button");
  const pasteSubmit = createNode("button");
  const importStatusCard = createNode("section");
  const importStatusBadge = createNode("span");
  const importStatusText = createNode("p");
  const importProgressTrack = createNode("div");
  const importProgressFill = createNode("div");
  const importPageProgressTrack = createNode("div");
  const importPageProgressFill = createNode("div");
  const importPageProgressText = createNode("p");

  const browser = loadPreviewRouter({
    pathname: "/import-preview.html",
    localStorageSeed: {
      "textplex.processorBaseUrl": "http://processor.test:8201",
    },
    fetchImpl: async (url, options = {}) => {
      const href = String(url);
      if (options.method === "POST" && href.endsWith("/texts/import")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "pasted-book", title: "Copied article" }),
        };
      }
      if (href.endsWith("/books")) {
        return { ok: true, status: 200, json: async () => [] };
      }
      if (href.endsWith("/books/pasted-book")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: "pasted-book",
            title: "Copied article",
            author: "Web source",
            language_code: "en",
            total_pages: 1,
            extracted_page_count: 1,
            extraction_status: "complete",
          }),
        };
      }
      if (href.endsWith("/books/pasted-book/pages")) {
        return { ok: true, status: 200, json: async () => ({ pages: [{ page_number: 1 }] }) };
      }
      if (href.endsWith("/books/pasted-book/pages/1")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            extraction: {
              page: {
                sentences: [{
                  order: 1,
                  text: "This is copied article text.",
                  tokens: [{ surface_form: "copied", lemma: "copy", token_kind: "word" }],
                }],
              },
            },
          }),
        };
      }
      if (href.includes("/analysis/")) {
        return { ok: true, status: 200, json: async () => ({ has_extraction: true, sentence_count: 1 }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    },
    selectorMap: {
      ".option-row": [pasteRow],
      ".recent-list": createNode("div"),
      "[data-processor-action]": [],
      "[data-ocr-provider]": [],
      "#importLog [data-step]": [],
      "button, a": [],
    },
    idMap: {
      pastePanel,
      pasteTitle,
      pasteAuthor,
      pasteLanguage,
      pasteText,
      pasteStatus,
      pasteCancel,
      pasteSubmit,
      importStatusCard,
      importStatusBadge,
      importStatusText,
      importProgressTrack,
      importProgressFill,
      importPageProgressTrack,
      importPageProgressFill,
      importPageProgressText,
    },
  });

  await browser.window.TextPlexPreviewRouter.ready;
  pasteRow.click();
  assert.equal(pastePanel.hidden, false);
  pasteSubmit.click();
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(browser.window.location.pathname, "/reader-preview.html");
  assert.equal(new URLSearchParams(browser.window.location.search).get("book"), "pasted-book");
  assert.equal(browser.window.TextPlexPreview.getBook("pasted-book").title, "Copied article");
});

test("import preview upload row opens a PDF chooser instead of synthesizing a record", async () => {
  const uploadRow = createNode("section");
  const uploadTitle = createNode("h3");
  uploadTitle.textContent = "Upload File";
  uploadRow.querySelector = (selector) => (selector === "h3" ? uploadTitle : null);

  let clicked = false;
  const importPdfInput = createNode("input");
  importPdfInput.click = () => {
    clicked = true;
  };

  const browser = loadPreviewRouter({
    pathname: "/import-preview.html",
    selectorMap: {
      ".option-row": [uploadRow],
      ".recent-list": createNode("div"),
      "[data-processor-action]": [],
      "button, a": [],
    },
    idMap: {
      importPdfInput,
      processorStatus: createNode("p"),
      processorBaseUrl: createNode("input"),
    },
  });

  await browser.window.TextPlexPreviewRouter.ready;

  uploadRow.click();

  assert.equal(clicked, true);
});

test("import preview binds controls before live hydration finishes", async () => {
  const uploadRow = createNode("section");
  const uploadTitle = createNode("h3");
  uploadTitle.textContent = "Upload File";
  uploadRow.querySelector = (selector) => (selector === "h3" ? uploadTitle : null);

  let clicked = false;
  const importPdfInput = createNode("input");
  importPdfInput.click = () => {
    clicked = true;
  };

  let resolveBooks;
  const browser = loadPreviewRouter({
    pathname: "/import-preview.html",
    localStorageSeed: {
      "textplex.processorBaseUrl": "http://processor.test:8201",
    },
    fetchImpl: () => new Promise((resolve) => {
      resolveBooks = resolve;
    }),
    selectorMap: {
      ".option-row": [uploadRow],
      ".recent-list": createNode("div"),
      "[data-processor-action]": [],
      "button, a": [],
    },
    idMap: {
      importPdfInput,
      processorStatus: createNode("p"),
      processorBaseUrl: createNode("input"),
    },
  });

  uploadRow.click();
  assert.equal(clicked, true);

  resolveBooks({ ok: true, json: async () => [] });
  await browser.window.TextPlexPreviewRouter.ready;
});

test("import preview shows processor upload progress while a PDF is being imported", async () => {
  const uploadRow = createNode("section");
  const uploadTitle = createNode("h3");
  uploadTitle.textContent = "Upload File";
  uploadRow.querySelector = (selector) => (selector === "h3" ? uploadTitle : null);

  const processorInput = createNode("input");
  const processorStatus = createNode("p");
  const importStatusCard = createNode("section");
  const importStatusBadge = createNode("span");
  const importStatusText = createNode("p");
  const importProgressTrack = createNode("div");
  const importProgressFill = createNode("div");
  const importLogItems = ["selected", "uploading", "processing", "refreshing", "opening"].map((step, index) => {
    const item = createNode("li");
    item.getAttribute = (name) => (name === "data-step" ? step : null);
    item.textContent = `step-${index}`;
    return item;
  });
  const recentList = createNode("div");
  const importPdfInput = createNode("input");
  const uploadCalls = [];
  const waitFor = async (predicate) => {
    for (let index = 0; index < 30; index += 1) {
      if (predicate()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("Timed out waiting for import preview state to settle.");
  };

  const browser = loadPreviewRouter({
    pathname: "/import-preview.html",
    localStorageSeed: {
      "textplex.processorBaseUrl": "http://processor.test:8201",
    },
    fetchImpl: async (url, options) => {
      uploadCalls.push({ url, options });
      await new Promise((resolve) => setTimeout(resolve, 25));
      const href = String(url);
      if (/\/books\/upload$/.test(href)) {
        return {
          ok: true,
          json: async () => ({ id: "uploaded-book", title: "Uploaded PDF Sample" }),
        };
      }

      if (/\/books\/uploaded-book$/.test(href)) {
        return {
          ok: true,
          json: async () => ({
            id: "uploaded-book",
            title: "Uploaded PDF Sample",
            extraction_status: "complete",
            extraction_total_pages: 4,
            extraction_pages_processed: 4,
            extraction_current_page: 4,
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({ id: "uploaded-book", title: "Uploaded PDF Sample" }),
      };
    },
    selectorMap: {
      ".option-row": [uploadRow],
      ".recent-list": recentList,
      "[data-processor-action]": [],
      "#importLog [data-step]": importLogItems,
      "button, a": [],
    },
    idMap: {
      processorBaseUrl: processorInput,
      processorStatus,
      importStatusBadge,
      importStatusText,
      importProgressTrack,
      importProgressFill,
      importPdfInput,
    },
  });

  const originalQuerySelector = browser.document.querySelector.bind(browser.document);
  browser.document.querySelector = (selector) => {
    if (selector === ".import-status-card") {
      return importStatusCard;
    }
    return originalQuerySelector(selector);
  };

  await browser.window.TextPlexPreviewRouter.ready;

  class TestFormData {
    constructor() {
      this.entries = [];
    }

    append(...entry) {
      this.entries.push(entry);
    }
  }

  browser.window.FormData = TestFormData;
  browser.context.FormData = TestFormData;

  const pdfFile = Object.assign(new browser.window.Blob(["fake pdf"], { type: "application/pdf" }), {
    name: "demo-import.pdf",
  });
  importPdfInput.files = [pdfFile];

  uploadRow.click();
  importPdfInput.dispatchEvent({ type: "change", target: importPdfInput });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(importStatusText.textContent, /Uploading demo-import\.pdf/i);
  assert.equal(importStatusBadge.textContent, "Uploading");
  assert.equal(importProgressTrack.getAttribute("aria-valuenow"), "34");

  await new Promise((resolve) => setTimeout(resolve, 75));

  const uploadRequest = uploadCalls.find((entry) => /\/books\/upload$/.test(String(entry.url)));
  assert.ok(uploadRequest, "upload request should be sent to the processor API");
  await waitFor(() => browser.window.location.search === "?book=uploaded-book");
  assert.match(importStatusText.textContent, /Opening Uploaded PDF Sample/i);
  assert.equal(importStatusBadge.textContent, "Done");
  assert.equal(importProgressTrack.getAttribute("aria-valuenow"), "100");

  const store = JSON.parse(browser.window.localStorage.getItem("textplex.preview.store") || "{}");
  assert.ok(Array.isArray(store.books) && store.books.some((book) => book.id === "uploaded-book"));
});

