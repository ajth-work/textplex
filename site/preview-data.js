(function () {
  const STORAGE_KEY = "textplex.preview.store";
  const SELECTION_KEY = "textplex.preview.selectedBook";
  const PROCESSOR_URL_KEY = "textplex.processorBaseUrl";
  const PENDING_BOOK_KEY = "textplex.preview.pendingBook";
  const DEFAULT_BOOK_ID = "spring-dawn";

  const seedBooks = [
    createRecord({
      id: "spring-dawn",
      contentType: "poetry",
      languageCode: "zh",
      title: "Spring Dawn",
      titleCn: "春晓",
      author: "Meng Haoran",
      authorCn: "孟浩然",
      kindLabel: "P1",
      homePriority: 20,
      analysisPriority: 50,
      lastOpenedAt: "2026-07-12T09:00:00.000Z",
      displayDate: "May 10, 2024",
      home: {
        progress: 72,
        minutesLeft: "3 min left",
        coverClass: "one",
      },
      analysis: {
        tag: "HSK 4",
        score: 78,
        date: "May 10",
        ring: "#3f9b68",
        meta: "232 characters · Poetry",
        analysisDate: "Analyzed May 10, 2024",
        level: "HSK 4",
        levelSub: "Upper Intermediate",
        levelNote: "Suitable for your level ✓",
        recommendation: "A quiet dawn scene that uses nature images to express the poet's gentle realization of spring.",
        sample:
          "这是一个用于演示的短段落，展示 TextPlex 如何分析书籍、记录词汇暴露，并保持内容可测试。",
        artAccent: "#b4c4cb",
        artTop: "#f0ece1",
        artMid: "#cfd8d7",
      },
      library: {
        characters: 232,
        lines: 4,
        estRead: "1m 45s",
        added: "May 10, 2024",
        summary: "A quiet dawn scene that uses nature images to express the poet's gentle realization of spring.",
        profileLabel: "HSK 3-4",
        known: "68%",
        review: "22%",
        fresh: "10%",
        recentReading: [
          { title: "May 11, 2025", subtitle: "Reading session", meta: "72% · 3 min" },
          { title: "May 9, 2025", subtitle: "Vocabulary review", meta: "14 items" },
        ],
      },
      reader: {
        progressPrefix: "P1",
        sentences: [
          {
            phonetics: ["chūn", "mián", "bù", "jué", "xiǎo", "", "chù", "chù", "wén", "tí", "niǎo"],
            tokens: [
              { surface: "春" },
              { surface: "眠" },
              { surface: "不" },
              { surface: "觉" },
              { surface: "晓" },
              { surface: "，" },
              { surface: "处" },
              { surface: "处" },
              { surface: "闻" },
              { surface: "啼" },
              { surface: "鸟" },
              { surface: "。" },
            ],
            translation: [
              "In spring, I sleep and know not the dawn has come.",
              "I hear the birds that sing around;",
            ],
            vocabulary: {
              surface: "觉",
              reading: "jué",
              tag: "HSK 3",
              definition: "v. to feel; to sense; to realize; to wake up",
              exampleCn: "感觉（gǎnjué）— feeling; sensation",
              exampleEn: "我意识到问题了。<br />I realized the problem.",
            },
          },
          {
            phonetics: ["yè", "lái", "fēng", "yǔ", "shēng", "", "huā", "luò", "zhī", "duō", "shǎo"],
            tokens: [
              { surface: "夜" },
              { surface: "来" },
              { surface: "风" },
              { surface: "雨" },
              { surface: "声" },
              { surface: "，" },
              { surface: "花" },
              { surface: "落" },
              { surface: "知" },
              { surface: "多" },
              { surface: "少" },
              { surface: "。" },
            ],
            translation: [
              "Last night, the wind and rain beat down;",
              "How many are the fallen flowers?",
            ],
            vocabulary: {
              surface: "花",
              reading: "huā",
              tag: "HSK 3",
              definition: "n. flower; blossom",
              exampleCn: "花落（huāluò）— falling flowers",
              exampleEn: "花落知多少。<br />How many flowers have fallen?",
            },
          },
        ],
        imageUrl: makePreviewImage({
          title: "春晓",
          subtitle: "孟浩然",
          lines: ["春眠不觉晓", "处处闻啼鸟"],
          accent: "#3f9b68",
        }),
      },
    }),
    createRecord({
      id: "tengwangge",
      contentType: "prose",
      languageCode: "zh",
      title: "滕王阁序",
      titleCn: "滕王阁序",
      author: "Wang Bo",
      authorCn: "王勃",
      kindLabel: "TXT",
      homePriority: 30,
      analysisPriority: 20,
      lastOpenedAt: "2026-07-11T18:30:00.000Z",
      displayDate: "May 8, 2024",
      home: {
        progress: 48,
        minutesLeft: "8 min left",
        coverClass: "two",
      },
      analysis: {
        tag: "HSK 5",
        score: 78,
        date: "May 8",
        ring: "#3f9b68",
        meta: "Synthetic prose sample · Chinese",
        analysisDate: "Analyzed May 8, 2024",
        level: "HSK 5",
        levelSub: "Upper Intermediate",
        levelNote: "Suitable for sustained reading ✓",
        recommendation: "A formal, high-density prose piece with strong literary vocabulary and vivid imagery.",
        sample: "这是一段合成的中文示例文本，包含常见词汇和句子结构，适合测试逐句阅读、词汇定义和进度跟踪。",
        artAccent: "#8db5d7",
        artTop: "#eef1ef",
        artMid: "#c7d7dc",
      },
      library: {
        characters: 312,
        lines: 4,
        estRead: "2m 10s",
        added: "May 8, 2024",
        summary: "A formal prose sample for testing sentence density and progress tracking.",
        profileLabel: "HSK 5",
        known: "61%",
        review: "26%",
        fresh: "13%",
        recentReading: [
          { title: "May 8, 2025", subtitle: "Reading session", meta: "48% · 8 min" },
          { title: "May 6, 2025", subtitle: "Vocabulary review", meta: "18 items" },
        ],
      },
      reader: {
        progressPrefix: "TXT",
        sentences: [
          {
            phonetics: ["zhè", "shì", "yī", "duàn", "hé chéng", "de", "wén", "běn"],
            tokens: [
              { surface: "这" },
              { surface: "是" },
              { surface: "一" },
              { surface: "段" },
              { surface: "合成" },
              { surface: "的" },
              { surface: "文本" },
              { surface: "。" },
            ],
            translation: ["This is a synthetic text sample."],
            vocabulary: {
              surface: "合成",
              reading: "hé chéng",
              tag: "demo",
              definition: "adj. synthetic; composed",
              exampleCn: "合成文本用于测试。",
              exampleEn: "Synthetic text is used for testing.",
            },
          },
          {
            phonetics: ["它", "可", "以", "帮", "助", "测", "试", "词", "汇", "暴", "露"],
            tokens: [
              { surface: "它" },
              { surface: "可" },
              { surface: "以" },
              { surface: "帮" },
              { surface: "助" },
              { surface: "测" },
              { surface: "试" },
              { surface: "词" },
              { surface: "汇" },
              { surface: "暴" },
              { surface: "露" },
              { surface: "。" },
            ],
            translation: ["It can help test vocabulary exposure."],
            vocabulary: {
              surface: "词汇",
              reading: "cí huì",
              tag: "HSK 4",
              definition: "n. vocabulary; word stock",
              exampleCn: "词汇暴露需要记录。",
              exampleEn: "Vocabulary exposure should be tracked.",
            },
          },
        ],
        imageUrl: makePreviewImage({
          title: "滕王阁序",
          subtitle: "王勃",
          lines: ["合成中文示例", "逐句阅读测试"],
          accent: "#5b82e3",
        }),
      },
    }),
    createRecord({
      id: "little-prince",
      contentType: "novel",
      languageCode: "fr",
      title: "The Little Prince",
      titleCn: "The Little Prince",
      author: "Antoine de Saint-Exupéry",
      authorCn: "Antoine de Saint-Exupéry",
      kindLabel: "TXT",
      homePriority: 40,
      analysisPriority: 30,
      lastOpenedAt: "2026-07-11T20:00:00.000Z",
      displayDate: "May 7, 2024",
      home: {
        progress: 65,
        minutesLeft: "5 min left",
        coverClass: "three",
      },
      analysis: {
        tag: "B1",
        score: 85,
        date: "May 7",
        ring: "#3f9b68",
        meta: "Synthetic French sample · Novel",
        analysisDate: "Analyzed May 7, 2024",
        level: "B1",
        levelSub: "Intermediate",
        levelNote: "Good fit for steady reading progress ✓",
        recommendation: "A manageable narrative with clear repetition and strong support for building daily reading stamina.",
        sample: "Ceci est un texte de démonstration en français, écrit pour tester la mise en page, l'analyse et la navigation sans utiliser de contenu protégé.",
        artAccent: "#7698ea",
        artTop: "#e8eff7",
        artMid: "#c7d4e8",
      },
      library: {
        characters: 245,
        lines: 3,
        estRead: "2m 20s",
        added: "May 7, 2024",
        summary: "A synthetic French novel sample for testing navigation and vocabulary lookup.",
        profileLabel: "B1",
        known: "70%",
        review: "20%",
        fresh: "10%",
        recentReading: [
          { title: "May 7, 2025", subtitle: "Reading session", meta: "65% · 5 min" },
          { title: "May 4, 2025", subtitle: "Vocabulary review", meta: "11 items" },
        ],
      },
      reader: {
        progressPrefix: "TXT",
        sentences: [
          {
            tokens: [
              { surface: "Le" },
              { surface: "petit" },
              { surface: "prince" },
              { surface: "regarde" },
              { surface: "la" },
              { surface: "nuit" },
              { surface: "." },
            ],
            translation: ["The little prince looks at the night."],
            vocabulary: {
              surface: "prince",
              reading: "prince",
              tag: "B1",
              definition: "n. prince; central figure",
              exampleCn: "Le petit prince explore le ciel.",
              exampleEn: "The little prince explores the sky.",
            },
          },
          {
            tokens: [
              { surface: "Il" },
              { surface: "écoute" },
              { surface: "le" },
              { surface: "vent" },
              { surface: "calme" },
              { surface: "." },
            ],
            translation: ["He listens to the quiet wind."],
            vocabulary: {
              surface: "écoute",
              reading: "écoute",
              tag: "B1",
              definition: "v. to listen",
              exampleCn: "Il écoute attentivement.",
              exampleEn: "He listens carefully.",
            },
          },
        ],
        imageUrl: makePreviewImage({
          title: "The Little Prince",
          subtitle: "Antoine de Saint-Exupéry",
          lines: ["French sample text", "Dictionary preview"],
          accent: "#7698ea",
        }),
      },
    }),
    createRecord({
      id: "snow-country",
      contentType: "novel",
      languageCode: "ko",
      title: "설국 (雪國)",
      titleCn: "설국 (雪國)",
      author: "가와바타 야스나리",
      authorCn: "가와바타 야스나리",
      kindLabel: "TXT",
      homePriority: 50,
      analysisPriority: 40,
      lastOpenedAt: "2026-07-11T14:10:00.000Z",
      displayDate: "May 1, 2024",
      home: {
        progress: 54,
        minutesLeft: "7 min left",
        coverClass: "four",
      },
      analysis: {
        tag: "TOPIK 5",
        score: 72,
        date: "May 1",
        ring: "#5c7fe6",
        meta: "Synthetic Korean sample · Novel",
        analysisDate: "Analyzed May 1, 2024",
        level: "TOPIK 5",
        levelSub: "Advanced",
        levelNote: "Presenting a solid challenge ✓",
        recommendation: "A more advanced literary text with dense description and a colder, more reflective tone.",
        sample: "이것은 테스트용 합성 한국어 문단입니다. 읽기 화면, 단어 정의, 그리고 진행 추적이 자연스럽게 동작하는지 확인하는 데 사용합니다.",
        artAccent: "#5c7fe6",
        artTop: "#eef1f8",
        artMid: "#c8d0e0",
      },
      library: {
        characters: 198,
        lines: 3,
        estRead: "2m 05s",
        added: "May 1, 2024",
        summary: "A synthetic Korean novel sample for testing navigation and study flows.",
        profileLabel: "TOPIK 5",
        known: "58%",
        review: "27%",
        fresh: "15%",
        recentReading: [
          { title: "May 2, 2025", subtitle: "Reading session", meta: "54% · 7 min" },
          { title: "Apr 29, 2025", subtitle: "Vocabulary review", meta: "9 items" },
        ],
      },
      reader: {
        progressPrefix: "TXT",
        sentences: [
          {
            tokens: [
              { surface: "이것" },
              { surface: "은" },
              { surface: "테스트" },
              { surface: "용" },
              { surface: "합성" },
              { surface: "문단" },
              { surface: "입니다" },
              { surface: "." },
            ],
            translation: ["This is a synthetic paragraph for testing."],
            vocabulary: {
              surface: "합성",
              reading: "hapseong",
              tag: "TOPIK 5",
              definition: "n. synthesis; synthetic",
              exampleCn: "합성 문단은 테스트에 유용합니다.",
              exampleEn: "Synthetic paragraphs are useful for testing.",
            },
          },
          {
            tokens: [
              { surface: "읽기" },
              { surface: "화면" },
              { surface: "과" },
              { surface: "단어" },
              { surface: "추적" },
              { surface: "을" },
              { surface: "확인" },
              { surface: "합니다" },
              { surface: "." },
            ],
            translation: ["It checks the reading screen and word tracking."],
            vocabulary: {
              surface: "추적",
              reading: "chujeok",
              tag: "TOPIK 4",
              definition: "n. tracking; tracing",
              exampleCn: "진행 추적을 확인합니다.",
              exampleEn: "We check progress tracking.",
            },
          },
        ],
        imageUrl: makePreviewImage({
          title: "설국 (雪國)",
          subtitle: "가와바타 야스나리",
          lines: ["Korean sample text", "Study preview"],
          accent: "#5c7fe6",
        }),
      },
    }),
    createRecord({
      id: "article-demo-briefing",
      contentType: "article",
      languageCode: "zh",
      title: "习近平同纳米比亚总统恩代特瓦会谈",
      titleCn: "习近平同纳米比亚总统恩代特瓦会谈",
      author: "新华社",
      authorCn: "新华社",
      kindLabel: "TXT",
      homePriority: 60,
      analysisPriority: 10,
      lastOpenedAt: "2026-07-12T11:10:00.000Z",
      displayDate: "Jul 10, 2026",
      home: {
        progress: 100,
        minutesLeft: "ready now",
        coverClass: "five",
      },
      analysis: {
        tag: "article",
        score: 74,
        date: "Jul 10",
        ring: "#3f9b68",
        meta: "Synthetic article sample · Chinese",
        analysisDate: "Analyzed Jul 10, 2026",
        level: "Article",
        levelSub: "Practical reading",
        levelNote: "Good for sentence extraction and progress tracking ✓",
        recommendation: "Useful for testing sentence extraction, article-level vocabulary, and local reading logs.",
        sample:
          "这是一个用于演示的新闻式段落，展示 TextPlex 如何处理文章、提取句子、并保持词汇与阅读记录可追踪。",
        artAccent: "#d59c4c",
        artTop: "#f4ede2",
        artMid: "#d8c6a8",
      },
      library: {
        characters: 320,
        lines: 5,
        estRead: "3m 05s",
        added: "Jul 10, 2026",
        summary: "Synthetic article content for testing paste-in import and sentence-level tracking.",
        profileLabel: "Article",
        known: "63%",
        review: "24%",
        fresh: "13%",
        recentReading: [
          { title: "Jul 10, 2026", subtitle: "Article review", meta: "59 sentences" },
          { title: "Jul 9, 2026", subtitle: "Vocabulary review", meta: "21 items" },
        ],
      },
      reader: {
        progressPrefix: "TXT",
        sentences: [
          {
            phonetics: ["zhè", "shì", "yī", "gè", "yòng", "yú", "yǎn", "shì", "de", "duǎn", "duàn"],
            tokens: [
              { surface: "这是" },
              { surface: "一个" },
              { surface: "用于" },
              { surface: "演示" },
              { surface: "的" },
              { surface: "短段" },
              { surface: "。" },
            ],
            translation: ["This is a short demonstration passage."],
            vocabulary: {
              surface: "演示",
              reading: "yǎn shì",
              tag: "article",
              definition: "v. to demonstrate; to present",
              exampleCn: "演示文本可以反复测试。",
              exampleEn: "Demonstration text can be tested repeatedly.",
            },
          },
          {
            phonetics: ["wèi", "le", "cè", "shì", "jù", "zi", "chù", "lǐ"],
            tokens: [
              { surface: "为了" },
              { surface: "测试" },
              { surface: "句子" },
              { surface: "处理" },
              { surface: "。" },
            ],
            translation: ["It is used to test sentence handling."],
            vocabulary: {
              surface: "句子",
              reading: "jù zi",
              tag: "article",
              definition: "n. sentence",
              exampleCn: "句子处理应保持稳定。",
              exampleEn: "Sentence handling should stay stable.",
            },
          },
        ],
        imageUrl: makePreviewImage({
          title: "新华社文章",
          subtitle: "Synthetic demo",
          lines: ["Article import sample", "Sentence tracking"],
          accent: "#d59c4c",
        }),
      },
    }),
  ];

  const defaultStore = {
    selectedBookId: DEFAULT_BOOK_ID,
    books: seedBooks,
    archivedBookIds: [],
  };

  const api = {
    storageKey: STORAGE_KEY,
    selectionKey: SELECTION_KEY,
    processorUrlKey: PROCESSOR_URL_KEY,
    ready: hydrateFromApi(),
    refreshFromApi: hydrateFromApi,
    getProcessorBaseUrl,
    setProcessorBaseUrl,
    loadStore,
    saveStore,
    resetStore,
    listBooks,
    getBook,
    getVisibleBooks,
    getSelectedBookId,
    selectBook,
    upsertBook,
    archiveBook,
    getHomePreviewData,
    getAnalysisProfile,
    getLibraryProfile,
    getReaderProfile,
    createImportedRecord,
    resolveBookId,
  };

  window.TextPlexPreview = api;

  function loadStore() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const store = raw ? normalizeStore(JSON.parse(raw)) : clone(defaultStore);
      const pendingBook = consumePendingBook();
      if (pendingBook) {
        store.books = store.books.filter((book) => book.id !== pendingBook.id);
        store.books.unshift(pendingBook);
        store.selectedBookId = pendingBook.id;
      }

      return normalizeStore(store);
    } catch {
      return clone(defaultStore);
    }
  }

  function saveStore(store) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeStore(store)));
  }

  function resetStore() {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(SELECTION_KEY);
    window.sessionStorage.removeItem(PENDING_BOOK_KEY);
    saveStore(clone(defaultStore));
    return loadStore();
  }

  function normalizeStore(value) {
    const store = {
      selectedBookId: DEFAULT_BOOK_ID,
      books: [],
      archivedBookIds: [],
    };

    if (!value || typeof value !== "object") {
      return clone(defaultStore);
    }

    if (typeof value.selectedBookId === "string" && value.selectedBookId.trim()) {
      store.selectedBookId = value.selectedBookId.trim();
    }

    if (Array.isArray(value.archivedBookIds)) {
      store.archivedBookIds = value.archivedBookIds.filter((item) => typeof item === "string" && item.trim());
    }

    const merged = new Map();
    for (const record of seedBooks) {
      merged.set(record.id, clone(record));
    }

    if (Array.isArray(value.books)) {
      for (const item of value.books) {
        const normalized = normalizeRecord(item);
        if (normalized) {
          merged.set(normalized.id, normalized);
        }
      }
    }

    store.books = Array.from(merged.values()).filter((record) => !store.archivedBookIds.includes(record.id));

    if (!store.books.some((book) => book.id === store.selectedBookId)) {
      store.selectedBookId = store.books[0]?.id ?? DEFAULT_BOOK_ID;
    }

    return store;
  }

  function consumePendingBook() {
    try {
      const raw = window.sessionStorage.getItem(PENDING_BOOK_KEY);
      if (!raw) {
        return null;
      }

      window.sessionStorage.removeItem(PENDING_BOOK_KEY);
      return normalizeRecord(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  function normalizeRecord(value) {
    if (!value || typeof value !== "object") {
      return null;
    }

    const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : null;
    if (!id) {
      return null;
    }

    return {
      id,
      contentType: value.contentType ?? "book",
      languageCode: value.languageCode ?? "zh",
      title: value.title ?? value.titleCn ?? id,
      titleCn: value.titleCn ?? value.title ?? id,
      author: value.author ?? value.authorCn ?? "Unknown author",
      authorCn: value.authorCn ?? value.author ?? "Unknown author",
      kindLabel: value.kindLabel ?? "TXT",
      homePriority: Number.isFinite(value.homePriority) ? value.homePriority : 99,
      analysisPriority: Number.isFinite(value.analysisPriority) ? value.analysisPriority : 99,
      lastOpenedAt: value.lastOpenedAt ?? new Date().toISOString(),
      displayDate: value.displayDate ?? formatDate(new Date()),
      home: normalizeObject(value.home),
      analysis: normalizeObject(value.analysis),
      library: normalizeObject(value.library),
      reader: normalizeReader(value.reader),
    };
  }

  function normalizeReader(value) {
    if (!value || typeof value !== "object") {
      return {
        progressPrefix: "TXT",
        pageCount: 0,
        pages: [],
        sentences: [],
        imageUrl: makePreviewImage({
          title: "TextPlex",
          subtitle: "Preview",
          lines: ["No record selected"],
          accent: "#1f335f",
        }),
      };
    }

    const pages = Array.isArray(value.pages) && value.pages.length
      ? value.pages.map((page, index) => normalizeReaderPage(page, index + 1))
      : Array.isArray(value.sentences)
        ? value.sentences.map((sentence, index) =>
            normalizeReaderPage(
              {
                pageNumber: index + 1,
                sentences: [sentence],
              },
              index + 1,
            ),
          )
        : [];

    return {
      progressPrefix: value.progressPrefix ?? "TXT",
      hasExplicitPages: Array.isArray(value.pages) && value.pages.length > 0,
      pageCount: Number.isFinite(value.pageCount) ? value.pageCount : pages.length,
      pages,
      sentences: pages.flatMap((page) => page.sentences),
      imageUrl: value.imageUrl ?? makePreviewImage({
        title: "TextPlex",
        subtitle: "Preview",
        lines: ["No page image available"],
        accent: "#1f335f",
      }),
    };
  }

  function normalizeReaderPage(value, fallbackPageNumber = 1) {
    if (!value || typeof value !== "object") {
      return {
        pageNumber: fallbackPageNumber,
        sentences: [],
        imageUrl: "",
      };
    }

    return {
      pageNumber: Number.isFinite(value.pageNumber)
        ? value.pageNumber
        : Number.isFinite(value.page_number)
          ? value.page_number
          : fallbackPageNumber,
      sentences: Array.isArray(value.sentences) ? value.sentences.map((sentence) => normalizeObject(sentence)) : [],
      imageUrl: value.imageUrl ?? value.image_url ?? "",
    };
  }

  function normalizeObject(value) {
    if (!value || typeof value !== "object") {
      return {};
    }
    return { ...value };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function listBooks() {
    return loadStore().books.slice();
  }

  function getVisibleBooks() {
    const store = loadStore();
    return store.books.filter((book) => !store.archivedBookIds.includes(book.id));
  }

  function getBook(bookId) {
    if (!bookId) {
      return null;
    }
    return getVisibleBooks().find((book) => book.id === bookId) ?? null;
  }

  function getSelectedBookId() {
    const selected = window.localStorage.getItem(SELECTION_KEY);
    if (selected && getBook(selected)) {
      return selected;
    }

    const store = loadStore();
    return getBook(store.selectedBookId)?.id ?? getVisibleBooks()[0]?.id ?? DEFAULT_BOOK_ID;
  }

  function selectBook(bookId) {
    if (!bookId) {
      return;
    }
    const store = loadStore();
    store.selectedBookId = bookId;
    saveStore(store);
    window.localStorage.setItem(SELECTION_KEY, bookId);
  }

  function upsertBook(record) {
    const normalized = normalizeRecord(record);
    if (!normalized) {
      return null;
    }

    const store = loadStore();
    const books = store.books.filter((book) => book.id !== normalized.id);
    books.unshift({
      ...normalized,
      lastOpenedAt: normalized.lastOpenedAt ?? new Date().toISOString(),
    });
    store.books = books;
    if (!store.archivedBookIds.includes(normalized.id)) {
      store.archivedBookIds = store.archivedBookIds.filter((id) => id !== normalized.id);
    }
    store.selectedBookId = normalized.id;
    saveStore(store);
    window.localStorage.setItem(SELECTION_KEY, normalized.id);
    return normalized;
  }

  function archiveBook(bookId) {
    if (!bookId) {
      return;
    }
    const store = loadStore();
    store.books = store.books.filter((book) => book.id !== bookId);
    if (!store.archivedBookIds.includes(bookId)) {
      store.archivedBookIds.unshift(bookId);
    }
    if (store.selectedBookId === bookId) {
      store.selectedBookId = store.books[0]?.id ?? DEFAULT_BOOK_ID;
      window.localStorage.setItem(SELECTION_KEY, store.selectedBookId);
    }
    saveStore(store);
  }

  function getHomePreviewData() {
    const visible = getVisibleBooks();
    const continueItems = visible
      .slice()
      .sort(sortByHomePriority)
      .slice(0, 2)
      .map((record) => ({
        id: record.id,
        titleCn: record.titleCn ?? record.title,
        authorCn: record.authorCn ?? record.author,
        titleEn: record.title,
        author: record.author,
        progress: record.home?.progress ?? 0,
        minutesLeft: record.home?.minutesLeft ?? "ready now",
        coverClass: record.home?.coverClass ?? "one",
      }));

    const analysisItems = visible
      .slice()
      .sort(sortByAnalysisPriority)
      .slice(0, 3)
      .map((record, index) => ({
        id: record.id,
        title: record.titleCn ?? record.title,
        author: record.authorCn ?? record.author,
        tag: record.analysis?.tag ?? record.contentType ?? "TXT",
        score: record.analysis?.score ?? 0,
        date: record.analysis?.date ?? "",
        ring: record.analysis?.ring ?? "#3f9b68",
        thumbClass: ["one", "two", "three", "four"][index] ?? "one",
      }));

    return { continueItems, analysisItems };
  }

  function getAnalysisProfile(bookId) {
    const record = resolveBookRecord(bookId);
    if (!record) {
      return null;
    }

    return {
      id: record.id,
      title: record.titleCn ?? record.title,
      author: record.authorCn ?? record.author,
      meta: record.analysis?.meta ?? "",
      date: record.analysis?.analysisDate ?? "",
      score: record.analysis?.score ?? 0,
      ring: record.analysis?.ring ?? "#3f9b68",
      level: record.analysis?.level ?? "",
      levelSub: record.analysis?.levelSub ?? "",
      levelNote: record.analysis?.levelNote ?? "",
      recommendation: record.analysis?.recommendation ?? "",
      sample: record.analysis?.sample ?? "",
      sampleNote:
        record.analysis?.sampleNote ?? "Synthetic text only. Safe for previewing without copyrighted source passages.",
      art: makeArt(record.analysis),
      tag: record.analysis?.tag ?? record.contentType ?? "TXT",
      contentType: record.contentType,
    };
  }

  function getLibraryProfile(bookId) {
    const record = resolveBookRecord(bookId);
    if (!record) {
      return null;
    }

    return {
      id: record.id,
      title: record.titleCn ?? record.title,
      author: record.authorCn ?? record.author,
      languageLabel: languageLabel(record.languageCode),
      kindLabel: record.kindLabel ?? "TXT",
      summary: record.library?.summary ?? "",
      characters: record.library?.characters ?? 0,
      lines: record.library?.lines ?? 0,
      estRead: record.library?.estRead ?? "",
      added: record.library?.added ?? "",
      profileLabel: record.library?.profileLabel ?? "",
      known: record.library?.known ?? "",
      review: record.library?.review ?? "",
      fresh: record.library?.fresh ?? "",
      recentReading: Array.isArray(record.library?.recentReading) ? record.library.recentReading : [],
      progress: record.home?.progress ?? 0,
      minutesLeft: record.home?.minutesLeft ?? "",
      imageUrl: record.reader?.imageUrl ?? "",
      art: makeArt(record.analysis),
      libraryHref: `./library-detail-preview.html?book=${encodeURIComponent(record.id)}`,
      analysisHref: `./analysis-preview.html?book=${encodeURIComponent(record.id)}`,
      readerHref: `./reader-preview.html?book=${encodeURIComponent(record.id)}`,
      contentType: record.contentType,
    };
  }

  function getReaderProfile(bookId) {
    const record = resolveBookRecord(bookId);
    if (!record) {
      return null;
    }

    const pages = ensureReaderPages(record, 3);
    const sentences = pages.flatMap((page) => page.sentences);

    return {
      id: record.id,
      title: record.titleCn ?? record.title,
      author: record.authorCn ?? record.author,
      kindLabel: record.reader?.progressPrefix ?? record.kindLabel ?? "TXT",
      contentType: record.contentType,
      pageCount: pages.length,
      totalSentences: sentences.length,
      pages,
      sentences,
      imageUrl: pages[0]?.imageUrl ?? record.reader?.imageUrl ?? "",
      languageCode: record.languageCode,
      defaultVocabulary: sentences[0]?.vocabulary ?? null,
      analysisHref: `./analysis-preview.html?book=${encodeURIComponent(record.id)}`,
      libraryHref: `./library-detail-preview.html?book=${encodeURIComponent(record.id)}`,
    };
  }

  function ensureReaderPages(record, minimumPages = 3) {
    const reader = record.reader ?? {};
    if (Array.isArray(reader.pages) && reader.pages.length) {
      const normalizedPages = reader.pages.map((page, index) => normalizeReaderPage(page, index + 1));
      const pageSentenceCounts = normalizedPages.map((page) => (Array.isArray(page.sentences) ? page.sentences.length : 0));
      const shouldExpand = normalizedPages.length < minimumPages && pageSentenceCounts.every((count) => count <= 1);
      if (!shouldExpand) {
        return normalizedPages;
      }

      const expanded = normalizedPages.slice();
      while (expanded.length < minimumPages) {
        expanded.push(createSyntheticReaderPage(record, expanded.length + 1));
      }
      return expanded;
    }

    const basePages = Array.isArray(reader.sentences)
      ? reader.sentences.map((sentence, index) =>
          normalizeReaderPage(
            {
              pageNumber: index + 1,
              sentences: [normalizeSentence(sentence, record.languageCode)],
            },
            index + 1,
          ),
        )
      : [];

    if (basePages.length >= minimumPages) {
      return basePages;
    }

    const expanded = basePages.slice();
    while (expanded.length < minimumPages) {
      expanded.push(createSyntheticReaderPage(record, expanded.length + 1));
    }

    return expanded;
  }

  function createSyntheticReaderPage(record, pageNumber) {
    const sentence = createSyntheticReaderSentence(record, pageNumber);
    return normalizeReaderPage(
      {
        pageNumber,
        sentences: [sentence],
        imageUrl: makePreviewImage({
          title: record.titleCn ?? record.title ?? "Synthetic text",
          subtitle: `${record.authorCn ?? record.author ?? "Local author"} · Page ${pageNumber}`,
          lines: [sentence.translation?.[0] ?? sentence.text ?? "Synthetic page"],
          accent: "#1f335f",
        }),
      },
      pageNumber,
    );
  }

  function normalizeSentence(sentence, languageCode = "zh") {
    const phonetics = Array.isArray(sentence?.phonetics) ? sentence.phonetics.slice() : [];
    const tokens = Array.isArray(sentence?.tokens)
      ? sentence.tokens.map((token) => ({
          ...token,
          surface: String(token?.surface ?? ""),
        }))
      : [];
    return {
      phonetics: alignSentencePhonetics(phonetics, tokens, languageCode),
      tokens,
      translation: Array.isArray(sentence?.translation) ? sentence.translation.slice() : [],
      vocabulary: normalizeObject(sentence?.vocabulary),
    };
  }

  function alignSentencePhonetics(phonetics, tokens, languageCode) {
    const normalized = Array.isArray(phonetics) ? phonetics.map((value) => String(value ?? "").trim()) : [];
    if (languageCode !== "zh" || !Array.isArray(tokens) || tokens.length === 0) {
      return normalized;
    }

    if (normalized.length === tokens.length) {
      return normalized;
    }

    const compact = normalized.filter(Boolean);
    if (compact.length === 0) {
      return tokens.map(() => "");
    }

    let readingIndex = 0;
    return tokens.map((token) => {
      const surface = String(token?.surface ?? "");
      if (isPunctuationSurface(surface)) {
        return "";
      }

      const readableCount = countReadableCharacters(surface);
      if (readableCount <= 1) {
        const reading = compact[readingIndex] ?? "";
        readingIndex = Math.min(readingIndex + 1, compact.length);
        return reading;
      }

      const slice = compact.slice(readingIndex, readingIndex + readableCount).filter(Boolean);
      readingIndex = Math.min(readingIndex + readableCount, compact.length);
      return slice.join(" ");
    });
  }

  function countReadableCharacters(surface) {
    return Array.from(String(surface)).filter((char) => !isPunctuationSurface(char) && !/\s/.test(char)).length;
  }

  function isPunctuationSurface(surface) {
    return /^[\s。，！？；：,.!?;:、，。！？；：…—()（）「」『』《》【】]+$/.test(String(surface ?? ""));
  }

  function createSyntheticReaderSentence(record, index) {
    const languageCode = record.languageCode ?? "zh";
    const title = record.titleCn ?? record.title ?? "Synthetic text";
    const author = record.authorCn ?? record.author ?? "Local author";
    const pageNumber = index;
    let text = "";
    let translation = "";

    if (languageCode === "fr") {
      text =
        pageNumber === 1
          ? `Cette page synthétique teste la lecture du titre ${title}.`
          : pageNumber === 2
            ? "Elle garde le texte compact pour la navigation phrase par phrase."
            : "Chaque page montre une seule phrase et reste facile à relire.";
      translation =
        pageNumber === 1
          ? `Synthetic reading page for ${title}.`
          : pageNumber === 2
            ? "It keeps the text compact for sentence-by-sentence navigation."
            : "Each page shows one sentence and stays easy to review.";
    } else if (languageCode === "ko") {
      text =
        pageNumber === 1
          ? `${title} 을(를) 위한 합성 읽기 페이지입니다.`
          : pageNumber === 2
            ? "문장 단위로 이동하면서 내용을 확인할 수 있습니다."
            : "각 페이지에는 한 문장만 표시되어 읽기 연습에 맞습니다.";
      translation =
        pageNumber === 1
          ? `Synthetic reading page for ${title}.`
          : pageNumber === 2
            ? "You can move sentence by sentence through the text."
            : "Each page shows one sentence for reading practice.";
    } else {
      text =
        pageNumber === 1
          ? `这是一页关于《${title}》的合成阅读内容。`
          : pageNumber === 2
            ? "它用于测试逐句阅读、词汇弹出和翻页导航。"
            : "每一页只显示一个句子，方便快速浏览和复习。";
      translation =
        pageNumber === 1
          ? `Synthetic reading page for ${title}.`
          : pageNumber === 2
            ? "It is used to test sentence-by-sentence reading, vocabulary popups, and page navigation."
            : "Each page shows one sentence for quick scanning and review.";
    }

    const tokenList = tokenizeSyntheticSentence(text, languageCode);
    const vocabularySurface = tokenList.find((token) => token.trim() && token !== "。" && token !== "。") ?? title;

    return {
      phonetics: languageCode === "zh" ? tokenList.map(() => "") : [],
      tokens: tokenList.map((surface) => ({ surface })),
      translation: [translation, `Book: ${title} · ${author}`],
      vocabulary: {
        surface: vocabularySurface,
        reading: languageCode === "fr" ? "" : languageCode === "ko" ? "" : "",
        tag: "demo",
        definition: "Synthetic reading sample",
        exampleCn: text,
        exampleEn: translation,
      },
    };
  }

  function tokenizeSyntheticSentence(text, languageCode) {
    if (languageCode === "zh") {
      return String(text)
        .split("")
        .filter((char) => char.trim() || /[。，！？；：,.!?;]/.test(char));
    }

    return String(text)
      .split(/(\s+|[.,!?;:()])/)
      .filter((part) => part && !/^\s+$/.test(part));
  }

  function createImportedRecord(kind, input = {}) {
    const safeKind = kind === "book" || kind === "article" || kind === "custom" ? kind : "article";
    const now = new Date();
    const id = input.id && String(input.id).trim() ? String(input.id).trim() : `local-${safeKind}-${now.getTime()}`;
    const title = input.title?.trim() || (safeKind === "book" ? "Imported Book" : "Imported Article");
    const author = input.author?.trim() || "Local user";
    const languageCode = input.languageCode || "zh";
    const record = createRecord({
      id,
      contentType: safeKind,
      languageCode,
      title,
      titleCn: input.titleCn?.trim() || title,
      author,
      authorCn: input.authorCn?.trim() || author,
      kindLabel: input.kindLabel || "TXT",
      homePriority: 0,
      analysisPriority: 0,
      lastOpenedAt: now.toISOString(),
      displayDate: formatDate(now),
      home: {
        progress: input.progress ?? 100,
        minutesLeft: input.minutesLeft ?? "ready now",
        coverClass: input.coverClass ?? "one",
      },
      analysis: {
        tag: input.tag ?? safeKind,
        score: input.score ?? 76,
        date: input.date ?? formatShortDate(now),
        ring: input.ring ?? "#3f9b68",
        meta: input.meta ?? `${safeKind === "book" ? "Imported book" : "Imported text"} · ${languageLabel(languageCode)}`,
        analysisDate: input.analysisDate ?? `Analyzed ${formatDate(now)}`,
        level: input.level ?? "Local",
        levelSub: input.levelSub ?? "Preview only",
        levelNote: input.levelNote ?? "Imported content is stored locally in the preview registry.",
        recommendation:
          input.recommendation ?? "This record was added locally so the preview pages can stay dynamic without relying on copyrighted source text.",
        sample:
          input.sample ?? "This synthetic import is meant to exercise the preview registry, not the live processor.",
        artAccent: input.artAccent ?? "#1f335f",
        artTop: input.artTop ?? "#eef1f8",
        artMid: input.artMid ?? "#c8d0e0",
      },
      library: {
        characters: input.characters ?? 0,
        lines: input.lines ?? 1,
        estRead: input.estRead ?? "1 min",
        added: input.added ?? formatDate(now),
        summary: input.summary ?? "Imported preview content.",
        profileLabel: input.profileLabel ?? "Local",
        known: input.known ?? "0%",
        review: input.review ?? "0%",
        fresh: input.fresh ?? "100%",
        recentReading: input.recentReading ?? [],
      },
      reader: {
        progressPrefix: input.progressPrefix ?? "TXT",
        pages: Array.isArray(input.pages) ? input.pages.map((page, index) => normalizeReaderPage(page, index + 1)) : undefined,
        sentences: Array.isArray(input.sentences) ? input.sentences.map((sentence) => normalizeObject(sentence)) : [],
        imageUrl: input.imageUrl ?? makePreviewImage({
          title,
          subtitle: author,
          lines: ["Imported preview content"],
          accent: "#1f335f",
        }),
      },
    });

    return upsertBook(record);
  }

  function resolveBookRecord(bookId) {
    if (typeof bookId === "string" && bookId.trim()) {
      const normalizedId = bookId.trim();
      const storedBook = readStoredBook(normalizedId);
      if (storedBook) {
        return storedBook;
      }
      return getBook(normalizedId);
    }

    const store = loadStore();
    return (
      store.books.find((book) => book.id === getSelectedBookId()) ??
      store.books.find((book) => book.id === DEFAULT_BOOK_ID) ??
      store.books[0] ??
      null
    );
  }

  function readStoredBook(bookId) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const store = JSON.parse(raw);
      const books = Array.isArray(store?.books) ? store.books : [];
      const match = books.find((book) => String(book?.id ?? "").trim() === bookId);
      return match ? normalizeRecord(match) : null;
    } catch {
      return null;
    }
  }

  function sortByHomePriority(a, b) {
    const priorityA = Number.isFinite(a.homePriority) ? a.homePriority : 99;
    const priorityB = Number.isFinite(b.homePriority) ? b.homePriority : 99;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return String(b.lastOpenedAt ?? "").localeCompare(String(a.lastOpenedAt ?? ""));
  }

  function sortByAnalysisPriority(a, b) {
    const priorityA = Number.isFinite(a.analysisPriority) ? a.analysisPriority : 99;
    const priorityB = Number.isFinite(b.analysisPriority) ? b.analysisPriority : 99;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return String(b.lastOpenedAt ?? "").localeCompare(String(a.lastOpenedAt ?? ""));
  }

  function createRecord(value) {
    return normalizeRecord(value);
  }

  function languageLabel(languageCode) {
    switch (languageCode) {
      case "zh":
        return "Chinese";
      case "fr":
        return "French";
      case "ko":
        return "Korean";
      default:
        return "Text";
    }
  }

  function makeArt(analysis) {
    if (!analysis) {
      return "linear-gradient(180deg, #eef1f8 0%, #c8d0e0 44%, #94a2ba 100%)";
    }

    const top = analysis.artTop ?? "#eef1f8";
    const mid = analysis.artMid ?? "#c8d0e0";
    const accent = analysis.artAccent ?? "#3f9b68";
    return `radial-gradient(circle at 72% 24%, rgba(255,255,255,0.9) 0 5px, transparent 6px), radial-gradient(circle at 64% 18%, rgba(255,255,255,0.85) 0 3px, transparent 4px), linear-gradient(180deg, ${top} 0%, ${mid} 44%, ${accent} 100%)`;
  }

  function resolveBookId(locationLike = window.location) {
    const params = new URLSearchParams(locationLike.search ?? "");
    return (
      params.get("book") ||
      params.get("entry") ||
      params.get("record") ||
      params.get("id") ||
      getSelectedBookId()
    );
  }

  function makePreviewImage({ title, subtitle, lines, accent = "#1f335f" }) {
    const safeTitle = escapeXml(title);
    const safeSubtitle = escapeXml(subtitle);
    const safeLines = (lines ?? []).slice(0, 2).map((line, index) => ({
      y: index === 0 ? 380 : 470,
      text: escapeXml(line),
    }));

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
        <defs>
          <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="${accent}14"/>
            <stop offset="100%" stop-color="#e8edf5"/>
          </linearGradient>
        </defs>
        <rect width="900" height="1200" rx="42" fill="url(#bg)"/>
        <rect x="68" y="70" width="764" height="1060" rx="26" fill="none" stroke="${accent}" stroke-opacity="0.22" stroke-width="4" stroke-dasharray="12 14"/>
        <text x="112" y="170" font-size="50" font-family="Georgia, serif" fill="#20242d">${safeTitle}</text>
        <text x="112" y="250" font-size="28" font-family="Arial, sans-serif" fill="#40454f">${safeSubtitle}</text>
        ${safeLines
          .map(
            (line) =>
              `<text x="112" y="${line.y}" font-size="34" font-family="Georgia, serif" fill="#20242d">${line.text}</text>`,
          )
          .join("")}
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function escapeXml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
  }

  function formatShortDate(value) {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(value);
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(value);
  }

  function getProcessorBaseUrl() {
    const stored = window.localStorage.getItem(PROCESSOR_URL_KEY);
    if (stored && isHttpUrl(stored)) {
      return stripTrailingSlash(stored);
    }

    const inferred = inferProcessorBaseUrl();
    return inferred ? stripTrailingSlash(inferred) : "";
  }

  function setProcessorBaseUrl(value) {
    const normalized = isHttpUrl(value) ? stripTrailingSlash(String(value)) : "";
    if (!normalized) {
      window.localStorage.removeItem(PROCESSOR_URL_KEY);
      return;
    }
    window.localStorage.setItem(PROCESSOR_URL_KEY, normalized);
  }

  function inferProcessorBaseUrl() {
    if (window.location.protocol === "file:") {
      return "http://127.0.0.1:8201";
    }

    const host = window.location.hostname || "";
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || isLocalNetworkHost(host)) {
      return `${window.location.protocol}//${host}:8201`;
    }

    return "";
  }

  function isLocalNetworkHost(hostname) {
    return (
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
    );
  }

  function isHttpUrl(value) {
    try {
      const url = new URL(String(value));
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  function stripTrailingSlash(value) {
    return String(value).replace(/\/+$/, "");
  }

  async function hydrateFromApi() {
    const fetchImpl = typeof window.fetch === "function" ? window.fetch.bind(window) : null;
    const baseUrl = getProcessorBaseUrl();
    if (!fetchImpl || !baseUrl) {
      return;
    }

    const previousSelection = getSelectedBookId();

    try {
      const books = await fetchJson(fetchImpl, `${baseUrl}/books`);
      if (!Array.isArray(books) || books.length === 0) {
        return;
      }

      for (const book of books) {
        const record = await mapApiBookToPreviewRecord(fetchImpl, baseUrl, book);
        if (record) {
          upsertBook(record);
        }
      }

      if (previousSelection && getBook(previousSelection)) {
        selectBook(previousSelection);
      }
    } catch (error) {
      console.warn("[TextPlexPreview] Live API hydration skipped:", error);
    }
  }

  async function mapApiBookToPreviewRecord(fetchImpl, baseUrl, book) {
    if (!book || typeof book !== "object" || !book.id) {
      return null;
    }

    const analysis = await fetchJsonMaybe(fetchImpl, `${baseUrl}/analysis/${encodeURIComponent(book.id)}`);
    const manifest = await fetchJsonMaybe(fetchImpl, `${baseUrl}/books/${encodeURIComponent(book.id)}/pages`);
    const pageRecords = Array.isArray(manifest?.pages) ? manifest.pages : [];
    const liveReaderPages = [];
    const lexiconCache = new Map();

    for (const page of pageRecords) {
      const pageNumber = Number(page?.page_number);
      if (!Number.isFinite(pageNumber) || pageNumber < 1) {
        continue;
      }

      const pageResponse = await fetchJsonMaybe(
        fetchImpl,
        `${baseUrl}/books/${encodeURIComponent(book.id)}/pages/${pageNumber}`,
      );
      const sentences = Array.isArray(pageResponse?.extraction?.page?.sentences) ? pageResponse.extraction.page.sentences : [];
      const mappedPageSentences = [];

      for (const sentence of sentences) {
        const mappedSentence = await mapApiSentenceToPreviewSentence(
          fetchImpl,
          baseUrl,
          book,
          sentence,
          lexiconCache,
        );
        if (mappedSentence) {
          mappedPageSentences.push(mappedSentence);
        }
      }

      liveReaderPages.push({
        pageNumber,
        sentences: mappedPageSentences,
        imageUrl: pageResponse?.image_url ? new URL(pageResponse.image_url, baseUrl).href : "",
      });
    }

    const fallbackSentence = createFallbackApiSentence(book, analysis);
    if (!liveReaderPages.length) {
      liveReaderPages.push({
        pageNumber: 1,
        sentences: [fallbackSentence],
        imageUrl: "",
      });
    }

    const readerSentences = liveReaderPages.flatMap((page) => page.sentences);
    const firstPageNumber = Number(pageRecords[0]?.page_number ?? 1);
    const firstPageImage = Number.isFinite(firstPageNumber)
      ? await fetchJsonMaybe(fetchImpl, `${baseUrl}/books/${encodeURIComponent(book.id)}/pages/${firstPageNumber}`)
      : null;
    const processedAt = book.processed_at ?? book.created_at ?? new Date().toISOString();
    const totalPages = Number(book.total_pages ?? analysis?.total_pages ?? liveReaderPages.length ?? 1);
    const extractedPages = Number(book.extracted_page_count ?? analysis?.extracted_page_count ?? liveReaderPages.length ?? 0);
    const progress = totalPages > 0 ? Math.min(100, Math.round((extractedPages / totalPages) * 100)) : 0;
    const hasExtraction = Boolean(analysis?.has_extraction ?? extractedPages > 0);
    const contentType = inferContentType(book);
    const kindLabel = inferKindLabel(book);
    const languageLabelValue = languageLabel(book.language_code ?? "zh");
    const analysisState = hasExtraction ? "Live" : "Queued";
    const analysisSummary = hasExtraction
      ? `${analysis?.sentence_count ?? readerSentences.length} sentences · ${analysis?.token_occurrence_count ?? 0} tokens`
      : `${totalPages} pages · awaiting extraction`;
    const summary = hasExtraction
      ? `Live API record with ${analysis?.sentence_count ?? readerSentences.length} sentences ready in the reader.`
      : `Live API record for ${book.title ?? "Imported text"} is waiting on extraction.`;
    const coverAccent = pickAccent(book.id);
    const firstSentence = readerSentences[0];

    return createRecord({
      id: String(book.id),
      contentType,
      languageCode: book.language_code ?? "zh",
      title: String(book.title ?? book.id),
      titleCn: String(book.title ?? book.id),
      author: book.author?.trim() || "Unknown author",
      authorCn: book.author?.trim() || "Unknown author",
      kindLabel,
      homePriority: 10,
      analysisPriority: 10,
      lastOpenedAt: processedAt,
      displayDate: formatDate(new Date(processedAt)),
      home: {
        progress,
        minutesLeft: progress >= 100 ? "ready now" : `${Math.max(1, totalPages - extractedPages)} pages left`,
        coverClass: pickCoverClass(book.id),
      },
      analysis: {
        tag: analysisState,
        score: progress || (hasExtraction ? 75 : 45),
        date: formatShortDate(new Date(processedAt)),
        ring: hasExtraction ? "#3f9b68" : "#5c7fe6",
        meta: analysisSummary,
        analysisDate: `Updated ${formatDate(new Date(processedAt))}`,
        level: languageLabelValue,
        levelSub: hasExtraction ? "Ready for reading" : "Waiting for extraction",
        levelNote: hasExtraction ? "Live data loaded from the local processor." : "Preview data loaded from the local processor.",
        recommendation: hasExtraction
          ? "Open the reader to continue sentence-by-sentence through the live content."
          : "Import and extract the book to populate the sentence reader.",
        sample: firstSentence?.translation?.[0] ?? firstSentence?.vocabulary?.exampleCn ?? summary,
        sampleNote: hasExtraction ? "Live API content." : "Preview data only.",
        artAccent: coverAccent,
        artTop: hasExtraction ? "#eef1f8" : "#f5efe1",
        artMid: hasExtraction ? "#c8d0e0" : "#d9c8b4",
      },
      library: {
        characters: analysis?.token_occurrence_count ?? countPreviewCharacters(readerSentences),
        lines: analysis?.sentence_count ?? readerSentences.length,
        estRead: estimateMinutes(readerSentences.length),
        added: formatDate(new Date(processedAt)),
        summary,
        profileLabel: hasExtraction ? "Live" : "Queued",
        known: `${Math.min(95, Math.max(0, progress))}%`,
        review: `${Math.max(0, 100 - Math.min(95, Math.max(0, progress)) - 5)}%`,
        fresh: "5%",
        recentReading: [
          {
            title: formatDate(new Date(processedAt)),
            subtitle: hasExtraction ? "Imported and extracted" : "Imported and pending",
            meta: `${readerSentences.length} sentence${readerSentences.length === 1 ? "" : "s"}`,
          },
        ],
      },
      reader: {
        progressPrefix: kindLabel,
        pages: liveReaderPages,
        sentences: readerSentences,
        imageUrl:
          firstPageImage?.image_url ? new URL(firstPageImage.image_url, baseUrl).href : makePreviewImage({
            title: String(book.title ?? book.id),
            subtitle: book.author?.trim() || "Unknown author",
            lines: ["Live API content"],
            accent: coverAccent,
          }),
      },
    });
  }

  async function mapApiSentenceToPreviewSentence(fetchImpl, baseUrl, book, sentence, lexiconCache) {
    const tokens = Array.isArray(sentence?.tokens)
      ? sentence.tokens.map((token) => ({
          surface: String(token?.surface_form ?? token?.surface ?? ""),
        }))
      : [];
    if (!tokens.length) {
      return null;
    }

    const phonetics = Array.isArray(sentence?.tokens)
      ? sentence.tokens.map((token) => String(token?.romanization ?? token?.pronunciation ?? ""))
      : [];
    const surfaceToken = Array.isArray(sentence?.tokens)
      ? sentence.tokens.find((token) => {
      const surface = String(token?.surface_form ?? "").trim();
      return surface && !isPunctuationSurface(surface);
      })
      : null;
    const vocabulary = surfaceToken
      ? await lookupLexiconEntry(fetchImpl, baseUrl, book.language_code ?? "zh", String(surfaceToken.surface_form), lexiconCache)
      : null;

    return {
      phonetics,
      tokens,
      translation: sentence?.text ? [String(sentence.text)] : [],
      vocabulary: vocabulary
        ? {
            surface: vocabulary.surface_form ?? surfaceToken.surface_form ?? "",
            reading: vocabulary.pinyin ?? surfaceToken.romanization ?? surfaceToken.pronunciation ?? "",
            tag: vocabulary.hsk_level ?? book.language_code?.toUpperCase?.() ?? "live",
            definition: vocabulary.definition ?? "Live API lexicon entry",
            exampleCn: sentence?.text ?? "",
            exampleEn: `Loaded from the live API for ${book.title ?? book.id}.`,
          }
        : {
            surface: surfaceToken?.surface_form ?? "",
            reading: String(surfaceToken?.romanization ?? surfaceToken?.pronunciation ?? ""),
            tag: book.language_code?.toUpperCase?.() ?? "live",
            definition: "Live API content",
            exampleCn: sentence?.text ?? "",
            exampleEn: `Loaded from the live API for ${book.title ?? book.id}.`,
          },
    };
  }

  function createFallbackApiSentence(book, analysis) {
    const label = String(book.title ?? "Live content");
    return {
      phonetics: [],
      tokens: [{ surface: label }],
      translation: [],
      vocabulary: {
        surface: label,
        reading: "",
        tag: analysis?.has_extraction ? "Live" : "Queued",
        definition: "Live API content",
        exampleCn: label,
        exampleEn: "Loaded from the local processor.",
      },
    };
  }

  async function lookupLexiconEntry(fetchImpl, baseUrl, languageCode, term, lexiconCache) {
    const normalizedKey = `${languageCode}:${String(term).trim()}`;
    if (lexiconCache.has(normalizedKey)) {
      return lexiconCache.get(normalizedKey);
    }

    const url = new URL(`${baseUrl}/lexicon/lookup`);
    url.searchParams.set("language_code", languageCode);
    url.searchParams.set("term", term);

    const payload = await fetchJsonMaybe(fetchImpl, url.href);
    const entry = Array.isArray(payload?.entries) ? payload.entries[0] ?? null : null;
    lexiconCache.set(normalizedKey, entry);
    return entry;
  }

  async function fetchJson(fetchImpl, url) {
    const response = await fetchImpl(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText} for ${url}`);
    }
    return response.json();
  }

  async function fetchJsonMaybe(fetchImpl, url) {
    try {
      return await fetchJson(fetchImpl, url);
    } catch {
      return null;
    }
  }

  function inferContentType(book) {
    const sourceFilename = String(book?.source_filename ?? "").toLowerCase();
    if (sourceFilename.endsWith(".pdf")) {
      return "book";
    }
    return "article";
  }

  function inferKindLabel(book) {
    return String(book?.source_filename ?? "").toLowerCase().endsWith(".pdf") ? "PDF" : "TXT";
  }

  function pickAccent(seed) {
    const accents = ["#3f9b68", "#5c7fe6", "#d59c4c", "#8e74dd"];
    const value = Array.from(String(seed)).reduce((total, char) => total + char.charCodeAt(0), 0);
    return accents[value % accents.length];
  }

  function pickCoverClass(seed) {
    const classes = ["one", "two", "three", "four"];
    const value = Array.from(String(seed)).reduce((total, char) => total + char.charCodeAt(0), 0);
    return classes[value % classes.length];
  }

  function countPreviewCharacters(sentences) {
    return sentences.reduce((total, sentence) => {
      const surfaces = Array.isArray(sentence?.tokens) ? sentence.tokens.map((token) => token.surface ?? "").join("") : "";
      return total + countReadableCharacters(surfaces);
    }, 0);
  }

  function estimateMinutes(sentenceCount) {
    const minutes = Math.max(1, Math.ceil(Number(sentenceCount ?? 1) / 12));
    return `${minutes}m`;
  }
})();
