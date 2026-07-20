import { DEMO_BOOKS, DEMO_LEXICON, DEMO_PAGE } from "./demo-data.js";

const storageKey = "textplex.processorBaseUrl";
const wakeHelperStorageKey = "textplex.processorWakeHelperUrl";
const ocrProviderStorageKey = "textplex.ocrProvider";
const themeStorageKey = "textplex.theme";
const readerTokenModeStorageKey = "textplex.readerTokenMode";
const localEntriesStorageKey = "textplex.localTextEntries";
const archiveItemsStorageKey = "textplex.archiveItems";
const uploadSessionStorageKey = "textplex.uploadSession";
const defaultView = "home";
const defaultTheme = "paper";
const defaultOcrProvider = "local";
const defaultReaderTokenMode = "word";
const defaultEntryKind = "book";
const entryKinds = new Set(["book", "article"]);
const requestTimeoutMs = 15000;
const uploadTimeoutMs = 20 * 60 * 1000;
const themeNames = new Set(["paper", "slate", "night", "midnight", "sunset", "mint"]);
const viewNames = new Set(["home", "library", "reader", "tools", "options"]);
const processorHealthProbeAttempts = 6;
const processorHealthProbeDelayMs = 1000;

const elements = {
  navLinks: Array.from(document.querySelectorAll("[data-nav]")),
  themeChoices: Array.from(document.querySelectorAll("[data-theme-choice]")),
  themeStatus: document.getElementById("themeStatus"),
  viewSections: Array.from(document.querySelectorAll("[data-view]")),
  modeBadge: document.getElementById("modeBadge"),
  connectionState: document.getElementById("connectionState"),
  connectionHint: document.getElementById("connectionHint"),
  processorUrl: document.getElementById("processorUrl"),
  saveProcessorUrl: document.getElementById("saveProcessorUrl"),
  connectProcessor: document.getElementById("connectProcessor"),
  wakeHelperUrl: document.getElementById("wakeHelperUrl"),
  saveWakeHelperUrl: document.getElementById("saveWakeHelperUrl"),
  wakeProcessor: document.getElementById("wakeProcessor"),
  uploadForm: document.getElementById("uploadForm"),
  bookTitle: document.getElementById("bookTitle"),
  ocrModeToggle: document.getElementById("ocrModeToggle"),
  pdfFile: document.getElementById("pdfFile"),
  uploadButton: document.getElementById("uploadButton"),
  textEntryForm: document.getElementById("textEntryForm"),
  textEntryTitle: document.getElementById("textEntryTitle"),
  textEntryBody: document.getElementById("textEntryBody"),
  textEntryKinds: document.getElementById("textEntryKinds"),
  textEntryTagInput: document.getElementById("textEntryTagInput"),
  addTextEntryTag: document.getElementById("addTextEntryTag"),
  textEntryTagChips: document.getElementById("textEntryTagChips"),
  localEntryCount: document.getElementById("localEntryCount"),
  localEntryList: document.getElementById("localEntryList"),
  archiveCount: document.getElementById("archiveCount"),
  archiveList: document.getElementById("archiveList"),
  bookCount: document.getElementById("bookCount"),
  homeBookCount: document.getElementById("homeBookCount"),
  homePageCount: document.getElementById("homePageCount"),
  homeProcessorState: document.getElementById("homeProcessorState"),
  homeProcessorSummary: document.getElementById("homeProcessorSummary"),
  homeProcessorCheck: document.getElementById("homeProcessorCheck"),
  homeReconnect: document.getElementById("homeReconnect"),
  homeWake: document.getElementById("homeWake"),
  libraryStatus: document.getElementById("libraryStatus"),
  uploadProgressPanel: document.getElementById("uploadProgressPanel"),
  uploadProgressBadge: document.getElementById("uploadProgressBadge"),
  uploadOverallProgressTrack: document.getElementById("uploadOverallProgressTrack"),
  uploadOverallProgressFill: document.getElementById("uploadOverallProgressFill"),
  uploadOverallProgressText: document.getElementById("uploadOverallProgressText"),
  uploadPageProgressTrack: document.getElementById("uploadPageProgressTrack"),
  uploadPageProgressFill: document.getElementById("uploadPageProgressFill"),
  uploadPageProgressText: document.getElementById("uploadPageProgressText"),
  bookList: document.getElementById("bookList"),
  readerTitle: document.getElementById("readerTitle"),
  readerAuthor: document.getElementById("readerAuthor"),
  readerProgress: document.getElementById("readerProgress"),
  readerEmpty: document.getElementById("readerEmpty"),
  readerBody: document.getElementById("readerBody"),
  readerText: document.getElementById("readerText"),
  readerTranslation: document.getElementById("readerTranslation"),
  readerNotice: document.getElementById("readerNotice"),
  readerBack: document.getElementById("readerBack"),
  toggleImage: document.getElementById("toggleImage"),
  readerTokenModeToggle: document.getElementById("readerTokenModeToggle"),
  extractNow: document.getElementById("extractNow"),
  readerOptionsButton: document.getElementById("readerOptionsButton"),
  readerOptionsMenu: document.getElementById("readerOptionsMenu"),
  archiveCurrentItem: document.getElementById("archiveCurrentItem"),
  deleteCurrentItem: document.getElementById("deleteCurrentItem"),
  pageImageWrap: document.getElementById("pageImageWrap"),
  pageImage: document.getElementById("pageImage"),
  tokenPanel: document.getElementById("tokenPanel"),
  bookMetrics: document.getElementById("bookMetrics"),
  statusSummary: document.getElementById("statusSummary"),
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  vocabForm: document.getElementById("vocabForm"),
  vocabTerm: document.getElementById("vocabTerm"),
  vocabSearchButton: document.getElementById("vocabSearchButton"),
  vocabStatus: document.getElementById("vocabStatus"),
  vocabResults: document.getElementById("vocabResults"),
  bookCardTemplate: document.getElementById("bookCardTemplate"),
};

const state = {
  apiBaseUrl: normalizeBaseUrl(window.localStorage.getItem(storageKey) ?? ""),
  wakeHelperUrl: normalizeBaseUrl(window.localStorage.getItem(wakeHelperStorageKey) ?? ""),
  ocrProvider: resolveOcrProvider(window.localStorage.getItem(ocrProviderStorageKey) ?? defaultOcrProvider),
  theme: resolveTheme(window.localStorage.getItem(themeStorageKey) ?? defaultTheme),
  readerTokenMode: resolveReaderTokenMode(window.localStorage.getItem(readerTokenModeStorageKey) ?? defaultReaderTokenMode),
  books: [],
  localEntries: loadLocalEntries(),
  archivedItems: loadArchivedItems(),
  localReaderEntryId: null,
  localReaderSentenceIndex: 0,
  selectedBookId: null,
  selectedPageNumber: 1,
  selectedSentenceIndex: 0,
  pageData: null,
  selectedToken: null,
  selectedBookEntry: null,
  lexicon: null,
  vocabLookup: null,
  vocabError: null,
  processorHealthy: null,
  lastProcessorCheckAt: null,
  processorStatusMessage: "Checking the remote processor.",
  showImage: false,
  readerOptionsOpen: false,
  busy: false,
  error: null,
  pageError: null,
  activeView: resolveView(window.location.hash),
  draftEntryKind: defaultEntryKind,
  draftEntryTags: [],
  uploadProgress: null,
};

elements.processorUrl.value = state.apiBaseUrl;
  elements.wakeHelperUrl.value = state.wakeHelperUrl;
bindEvents();
void boot();

function bindEvents() {
  elements.saveProcessorUrl.addEventListener("click", saveProcessorUrl);
  elements.connectProcessor.addEventListener("click", connectProcessor);
  elements.saveWakeHelperUrl.addEventListener("click", saveWakeHelperUrl);
  elements.wakeProcessor.addEventListener("click", () => void wakeProcessorHelper());
  elements.ocrModeToggle?.addEventListener("click", handleOcrModeToggle);
  elements.homeReconnect.addEventListener("click", () => void refreshProcessorStatus(true));
  elements.homeWake.addEventListener("click", () => void wakeAndRefreshProcessorStatus());
  elements.uploadForm.addEventListener("submit", handleUpload);
  elements.textEntryForm.addEventListener("submit", (event) => {
    void handleTextEntrySubmit(event);
  });
  elements.addTextEntryTag.addEventListener("click", addDraftTagFromInput);
  elements.textEntryTagInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void addDraftTagFromInput();
    }
  });
  elements.textEntryKinds.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const kind = target?.dataset.entryKind;
    if (!kind || !entryKinds.has(kind)) {
      return;
    }
    state.draftEntryKind = kind;
    renderLibraryComposer();
  });
  elements.vocabForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void lookupVocabulary(elements.vocabTerm.value.trim());
  });
  elements.toggleImage.addEventListener("click", () => {
    state.showImage = !state.showImage;
    renderReader();
  });
  elements.readerTokenModeToggle?.addEventListener("click", handleReaderTokenModeToggle);
  elements.readerBack.addEventListener("click", () => setActiveView("library"));
  elements.extractNow.addEventListener("click", () => void extractSelectedBook());
  elements.readerOptionsButton?.addEventListener("click", () => {
    state.readerOptionsOpen = !state.readerOptionsOpen;
    renderReaderOptionsMenu();
  });
  elements.archiveCurrentItem?.addEventListener("click", () => {
    void archiveCurrentReaderItem();
  });
  elements.deleteCurrentItem?.addEventListener("click", () => {
    void deleteCurrentReaderItem();
  });
  elements.prevPage.addEventListener("click", () => void moveSentence(-1));
  elements.nextPage.addEventListener("click", () => void moveSentence(1));
  elements.navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const view = resolveView(link.getAttribute("href") ?? "");
      setActiveView(view);
    });
  });
  elements.themeChoices.forEach((button) => {
    button.addEventListener("click", () => {
      const theme = resolveTheme(button.dataset.themeChoice ?? defaultTheme);
      setTheme(theme);
    });
  });
  window.addEventListener("hashchange", () => {
    setActiveView(resolveView(window.location.hash), { syncHash: false });
  });
  document.addEventListener("click", (event) => {
    if (!state.readerOptionsOpen) {
      return;
    }
    const target = event.target instanceof Node ? event.target : null;
    if (!target) {
      return;
    }
    if (elements.readerOptionsMenu?.contains(target) || elements.readerOptionsButton?.contains(target)) {
      return;
    }
    state.readerOptionsOpen = false;
    renderReaderOptionsMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.readerOptionsOpen) {
      state.readerOptionsOpen = false;
      renderReaderOptionsMenu();
    }
  });
}

async function boot() {
  applyTheme(state.theme);
  renderLibraryComposer();
  setActiveView(state.activeView, { syncHash: false });
  await connectFromCurrentValue();
  restoreUploadProgressSession();
}

function loadLocalEntries() {
  try {
    const raw = window.localStorage.getItem(localEntriesStorageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((entry) => normalizeLocalEntry(entry)).filter(Boolean);
  } catch {
    return [];
  }
}

function loadArchivedItems() {
  try {
    const raw = window.localStorage.getItem(archiveItemsStorageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((item) => normalizeArchivedItem(item)).filter(Boolean);
  } catch {
    return [];
  }
}

function saveLocalEntries() {
  window.localStorage.setItem(localEntriesStorageKey, JSON.stringify(state.localEntries));
}

function saveArchivedItems() {
  window.localStorage.setItem(archiveItemsStorageKey, JSON.stringify(state.archivedItems));
}

function loadUploadSession() {
  try {
    const raw = window.localStorage.getItem(uploadSessionStorageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return {
      active: Boolean(parsed.active),
      bookId: typeof parsed.bookId === "string" ? parsed.bookId : null,
      title: typeof parsed.title === "string" ? parsed.title : "",
      fileName: typeof parsed.fileName === "string" ? parsed.fileName : "",
      stage: typeof parsed.stage === "string" ? parsed.stage : "processing",
      badge: typeof parsed.badge === "string" ? parsed.badge : "Processing",
      overallPercent: Number(parsed.overallPercent ?? 0) || 0,
      pagePercent: Number(parsed.pagePercent ?? 0) || 0,
      pagesProcessed: Number(parsed.pagesProcessed ?? 0) || 0,
      totalPages: Number(parsed.totalPages ?? 0) || 0,
      currentPage: Number(parsed.currentPage ?? 0) || 0,
      message: typeof parsed.message === "string" ? parsed.message : "",
    };
  } catch {
    return null;
  }
}

function saveUploadSession(progress) {
  if (!progress) {
    window.localStorage.removeItem(uploadSessionStorageKey);
    return;
  }

  window.localStorage.setItem(
    uploadSessionStorageKey,
    JSON.stringify({
      ...progress,
      updatedAt: new Date().toISOString(),
    }),
  );
}

function clearUploadSession() {
  window.localStorage.removeItem(uploadSessionStorageKey);
}

function restoreUploadProgressSession() {
  const session = loadUploadSession();
  if (!session?.bookId) {
    return;
  }

  state.uploadProgress = {
    active: session.active && session.stage !== "done" && session.stage !== "error",
    bookId: session.bookId,
    title: session.title || session.fileName || "the PDF",
    fileName: session.fileName || "",
    stage: session.stage,
    badge: session.badge,
    overallPercent: session.overallPercent,
    pagePercent: session.pagePercent,
    pagesProcessed: session.pagesProcessed,
    totalPages: session.totalPages,
    currentPage: session.currentPage,
    message: session.message || `Resuming progress for ${session.title || session.fileName || "the PDF"}.`,
  };
  renderUploadProgress();

  if (session.stage === "done" || session.stage === "error") {
    clearUploadSession();
    return;
  }

  void monitorUploadedBook(session.bookId, session.title || session.fileName || "the PDF");
}

async function archiveRemoteBook(book) {
  try {
    if (state.apiBaseUrl) {
      setBusy(true);
      await requestJson(`/books/${encodeURIComponent(book.id)}/archive`, { method: "POST" });
    }

    const archivedItem = normalizeArchivedItem({
      id: `book:${book.id}`,
      sourceType: "book",
      sourceId: book.id,
      title: book.title,
      subtitle: book.author ?? "Unknown author",
      details: `${book.language_code.toUpperCase()} · ${book.total_pages} pages`,
      kind: "book",
      author: book.author ?? null,
      languageCode: book.language_code,
      pageCount: book.total_pages,
      extractedCount: book.extracted_page_count ?? 0,
      sourcePath: book.source_path ?? "",
    });

    state.archivedItems = [archivedItem, ...state.archivedItems.filter((item) => item.sourceId !== book.id)];
    saveArchivedItems();
    state.books = state.books.filter((item) => item.id !== book.id);
    if (state.selectedBookId === book.id) {
      state.selectedBookId = null;
      state.pageData = null;
      state.selectedSentenceIndex = 0;
    }
    renderAll();
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Unable to archive the book.";
    renderAll();
  } finally {
    if (state.apiBaseUrl) {
      setBusy(false);
    }
  }
}

async function deleteRemoteBook(book) {
  try {
    if (!window.confirm(`Delete "${book.title}" forever? This cannot be undone.`)) {
      return;
    }
    if (state.apiBaseUrl) {
      setBusy(true);
      await requestJson(`/books/${encodeURIComponent(book.id)}`, { method: "DELETE" });
    }

    state.archivedItems = state.archivedItems.filter((item) => item.sourceId !== book.id);
    saveArchivedItems();
    state.books = state.books.filter((item) => item.id !== book.id);
    if (state.selectedBookId === book.id) {
      state.selectedBookId = null;
      state.pageData = null;
      state.selectedSentenceIndex = 0;
    }
    renderAll();
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Unable to delete the book.";
    renderAll();
  } finally {
    if (state.apiBaseUrl) {
      setBusy(false);
    }
  }
}

function archiveLocalEntry(entry) {
  const archivedItem = normalizeArchivedItem({
    id: `text:${entry.id}`,
    sourceType: "text",
    sourceId: entry.id,
    title: entry.title,
    subtitle: entry.kind,
    details: summarizeText(entry.body, 120),
    kind: entry.kind,
    body: entry.body,
    tags: entry.tags ?? [],
    languageCode: entry.language_code ?? "zh",
  });

  state.archivedItems = [archivedItem, ...state.archivedItems.filter((item) => item.sourceId !== entry.id)];
  saveArchivedItems();
  state.localEntries = state.localEntries.filter((item) => item.id !== entry.id);
  if (state.localReaderEntryId === entry.id) {
    state.localReaderEntryId = null;
    state.localReaderSentenceIndex = 0;
  }
  saveLocalEntries();
  renderAll();
}

function deleteLocalEntry(entry) {
  state.localEntries = state.localEntries.filter((item) => item.id !== entry.id);
  saveLocalEntries();
  if (state.localReaderEntryId === entry.id) {
    state.localReaderEntryId = null;
    state.localReaderSentenceIndex = 0;
  }
  renderAll();
}

async function deleteArchivedItem(itemId) {
  const item = state.archivedItems.find((entry) => entry.id === itemId);
  if (!item) {
    return;
  }

  try {
    if (!window.confirm(`Delete "${item.title}" forever? This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    if (item.sourceType === "book" && state.apiBaseUrl && item.sourceId) {
      await requestJson(`/books/${encodeURIComponent(item.sourceId)}`, { method: "DELETE" });
    }

    state.archivedItems = state.archivedItems.filter((entry) => entry.id !== itemId);
    saveArchivedItems();
    renderAll();
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Unable to delete the archived item.";
    renderAll();
  } finally {
    setBusy(false);
  }
}

async function restoreArchivedItem(itemId) {
  const item = state.archivedItems.find((entry) => entry.id === itemId);
  if (!item) {
    return;
  }

  try {
    setBusy(true);
    if (item.sourceType === "book") {
      if (state.apiBaseUrl && item.sourceId) {
        await requestJson(`/books/${encodeURIComponent(item.sourceId)}/restore`, {
          method: "POST",
        });
        await loadBooks();
      } else {
        if (!item.sourcePath) {
          throw new Error("This archived book does not include a source path to restore from.");
        }

        await requestJson("/books/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_path: item.sourcePath,
            language_code: item.languageCode ?? "zh",
            title: item.title,
            author: item.author ?? undefined,
          }),
        });
        await loadBooks();
      }
    } else {
      const restoredEntry = normalizeLocalEntry({
        id: item.sourceId ?? crypto.randomUUID(),
        title: item.title,
        body: item.body,
        kind: entryKinds.has(item.kind) ? item.kind : defaultEntryKind,
        language_code: item.languageCode ?? "zh",
        tags: Array.isArray(item.tags) && item.tags.length ? item.tags : [item.kind ?? defaultEntryKind],
        created_at: item.archivedAt ?? new Date().toISOString(),
        extraction: null,
      });
      if (!restoredEntry) {
        throw new Error("This archived text clip could not be restored.");
      }

      state.localEntries = [
        restoredEntry,
        ...state.localEntries.filter((entry) => entry.id !== restoredEntry.id),
      ];
      saveLocalEntries();
    }

    state.archivedItems = state.archivedItems.filter((entry) => entry.id !== itemId);
    saveArchivedItems();
    state.error = null;
    renderAll();
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Unable to restore the archived item.";
    renderAll();
  } finally {
    setBusy(false);
  }
}

function normalizeTag(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeLocalEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const body = typeof entry.body === "string" ? entry.body.trim() : "";
  if (!body) {
    return null;
  }

  const kind = entryKinds.has(entry.kind) ? entry.kind : defaultEntryKind;
  const tags = Array.isArray(entry.tags) ? entry.tags.map((tag) => normalizeTag(String(tag))).filter(Boolean) : [];
  const uniqueTags = [kind, ...tags].filter((tag, index, all) => all.indexOf(tag) === index);
  const title = typeof entry.title === "string" && entry.title.trim() ? entry.title.trim() : summarizeText(body, 42);
  const createdAt = typeof entry.created_at === "string" ? entry.created_at : new Date().toISOString();
  const languageCode = typeof entry.language_code === "string" && entry.language_code.trim() ? entry.language_code.trim() : "zh";
  const extraction = normalizeLocalExtraction(entry.extraction);
  const sentences = normalizeLocalSentences(entry, extraction, languageCode, body);

  return {
    id: typeof entry.id === "string" && entry.id ? entry.id : crypto.randomUUID(),
    title,
    body,
    kind,
    language_code: languageCode,
    tags: uniqueTags,
    created_at: createdAt,
    sentences,
    extraction,
  };
}

function normalizeArchivedItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const sourceType = item.sourceType === "book" ? "book" : "text";
  const id = typeof item.id === "string" && item.id ? item.id : crypto.randomUUID();
  const title = typeof item.title === "string" && item.title.trim() ? item.title.trim() : "Untitled";
  const subtitle = typeof item.subtitle === "string" ? item.subtitle.trim() : "";
  const details = typeof item.details === "string" ? item.details.trim() : "";
  const kind = typeof item.kind === "string" && item.kind.trim() ? item.kind.trim() : sourceType;
  const archivedAt = typeof item.archivedAt === "string" ? item.archivedAt : new Date().toISOString();

  return {
    id,
    sourceType,
    title,
    subtitle,
    details,
    kind,
    archivedAt,
    sourceId: typeof item.sourceId === "string" ? item.sourceId : null,
    body: typeof item.body === "string" ? item.body : "",
    tags: Array.isArray(item.tags) ? item.tags.map((tag) => normalizeTag(String(tag))).filter(Boolean) : [],
    author: typeof item.author === "string" ? item.author : null,
    languageCode: typeof item.languageCode === "string" ? item.languageCode : null,
    pageCount: typeof item.pageCount === "number" ? item.pageCount : null,
    extractedCount: typeof item.extractedCount === "number" ? item.extractedCount : null,
    sourcePath: typeof item.sourcePath === "string" ? item.sourcePath : "",
  };
}

function normalizeLocalExtraction(extraction) {
  if (!extraction || typeof extraction !== "object") {
    return null;
  }

  const page = extraction.page && typeof extraction.page === "object" ? extraction.page : null;
  if (!page) {
    return null;
  }

  return {
    ...extraction,
    page: {
      ...page,
      sentences: Array.isArray(page.sentences) ? page.sentences : [],
      lexical_entries: Array.isArray(page.lexical_entries) ? page.lexical_entries : [],
    },
  };
}

function normalizeLocalSentences(entry, extraction, languageCode, fallbackText) {
  const extractedSentences = extraction?.page?.sentences;
  if (Array.isArray(extractedSentences) && extractedSentences.length) {
    return extractedSentences.map((sentence, index) => normalizeSentenceRecord(sentence, index + 1, languageCode));
  }

  if (Array.isArray(entry.sentences) && entry.sentences.length) {
    return entry.sentences.map((sentence, index) => normalizeSentenceRecord(sentence, index + 1, languageCode));
  }

  return splitTextIntoSentences(fallbackText).map((sentence, index) => normalizeSentenceRecord(sentence, index + 1, languageCode));
}

function normalizeSentenceRecord(sentence, order, languageCode) {
  if (typeof sentence === "string") {
    return {
      order,
      text: sentence,
      translation: null,
      tokens: tokenizeSentenceLocally(sentence, languageCode),
    };
  }

  const text = typeof sentence?.text === "string" ? sentence.text : typeof sentence?.sentence === "string" ? sentence.sentence : "";
  const tokens = Array.isArray(sentence?.tokens) && sentence.tokens.length
    ? sentence.tokens.map((token, index) => normalizeTokenRecord(token, index + 1))
    : tokenizeSentenceLocally(text, languageCode);

  return {
    ...sentence,
    order: typeof sentence?.order === "number" ? sentence.order : order,
    text,
    translation: typeof sentence?.translation === "string" ? sentence.translation : null,
    tokens,
  };
}

function normalizeTokenRecord(token, order) {
  if (typeof token === "string") {
    return {
      order,
      surface_form: token,
      lemma: token,
      romanization: null,
    };
  }

  return {
    ...token,
    order: typeof token?.order === "number" ? token.order : order,
    surface_form: typeof token?.surface_form === "string" ? token.surface_form : typeof token?.text === "string" ? token.text : "",
    lemma: typeof token?.lemma === "string" ? token.lemma : typeof token?.surface_form === "string" ? token.surface_form : typeof token?.text === "string" ? token.text : "",
    romanization: typeof token?.romanization === "string" ? token.romanization : null,
  };
}

function getLocalEntrySentences(entry) {
  if (Array.isArray(entry?.extraction?.page?.sentences) && entry.extraction.page.sentences.length) {
    return entry.extraction.page.sentences;
  }
  if (Array.isArray(entry?.sentences) && entry.sentences.length) {
    return entry.sentences;
  }
  return [];
}

function getSentenceText(sentence) {
  if (typeof sentence === "string") {
    return sentence;
  }
  return typeof sentence?.text === "string" ? sentence.text : "";
}

function getSentenceTokens(sentence) {
  if (typeof sentence === "string") {
    return [];
  }
  return Array.isArray(sentence?.tokens) ? sentence.tokens : [];
}

function resolveReaderTokenMode(value) {
  return value === "character" ? "character" : "word";
}

function getReaderTokenModeLabel(mode) {
  return resolveReaderTokenMode(mode) === "character" ? "Char" : "Word";
}

function shouldExpandTokenIntoCharacters(surface) {
  const text = String(surface ?? "");
  return isCjk(text) && Array.from(text).length > 1;
}

const pinyinSyllablePattern = /^(?:(?:zh|ch|sh)|[bpmfdtnlgkhjqxrzcsyw])?(?:a|ai|an|ang|ao|e|ei|en|eng|er|o|ong|ou|i|ia|ian|iang|iao|ie|in|ing|iong|iu|u|ua|uai|uan|uang|ue|ui|un|uo|v|ve|van|vn)$/;
const pinyinSeparatorPattern = /[\s'’\-.0-9]/u;

function normalizePinyinCharacter(character) {
  switch (character) {
    case "ā":
    case "á":
    case "ǎ":
    case "à":
      return "a";
    case "ē":
    case "é":
    case "ě":
    case "è":
      return "e";
    case "ī":
    case "í":
    case "ǐ":
    case "ì":
      return "i";
    case "ō":
    case "ó":
    case "ǒ":
    case "ò":
      return "o";
    case "ū":
    case "ú":
    case "ǔ":
    case "ù":
      return "u";
    case "ǖ":
    case "ǘ":
    case "ǚ":
    case "ǜ":
    case "ü":
      return "v";
    default:
      return character.toLowerCase();
  }
}

function isValidPinyinChunk(chunk) {
  return pinyinSyllablePattern.test(chunk);
}

function splitConcatenatedPinyin(romanization, characterCount) {
  const sourceCharacters = Array.from(String(romanization ?? "").trim()).filter((character) => !pinyinSeparatorPattern.test(character));
  if (!sourceCharacters.length || characterCount <= 0) {
    return null;
  }

  const normalizedCharacters = sourceCharacters.map((character) => normalizePinyinCharacter(character));
  const maxChunkLength = Math.min(7, normalizedCharacters.length);
  const memo = new Map();

  function splitFrom(startIndex, remainingCount) {
    const memoKey = `${startIndex}:${remainingCount}`;
    if (memo.has(memoKey)) {
      return memo.get(memoKey) ?? null;
    }

    const remainingCharacters = normalizedCharacters.length - startIndex;
    if (remainingCount <= 0 || remainingCharacters < remainingCount) {
      memo.set(memoKey, null);
      return null;
    }

    if (remainingCount === 1) {
      const chunk = normalizedCharacters.slice(startIndex).join("");
      if (!chunk || !isValidPinyinChunk(chunk)) {
        memo.set(memoKey, null);
        return null;
      }

      const tail = sourceCharacters.slice(startIndex).join("");
      memo.set(memoKey, [tail]);
      return [tail];
    }

    const maxEndIndex = Math.min(normalizedCharacters.length - (remainingCount - 1), startIndex + maxChunkLength);
    for (let endIndex = startIndex + 1; endIndex <= maxEndIndex; endIndex += 1) {
      const chunk = normalizedCharacters.slice(startIndex, endIndex).join("");
      if (!isValidPinyinChunk(chunk)) {
        continue;
      }

      const tail = splitFrom(endIndex, remainingCount - 1);
      if (tail) {
        const head = sourceCharacters.slice(startIndex, endIndex).join("");
        const result = [head, ...tail];
        memo.set(memoKey, result);
        return result;
      }
    }

    memo.set(memoKey, null);
    return null;
  }

  return splitFrom(0, characterCount);
}

function splitRomanizationByCharacters(romanization, characterCount) {
  const syllables = String(romanization ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!characterCount) {
    return [];
  }

  if (!syllables.length) {
    return Array.from({ length: characterCount }, () => "");
  }

  if (syllables.length === characterCount) {
    return syllables;
  }

  if (syllables.length > characterCount) {
    const readings = Array.from({ length: characterCount }, () => "");
    const lastIndex = characterCount - 1;
    for (let index = 0; index < syllables.length; index += 1) {
      if (index < lastIndex) {
        readings[index] = syllables[index];
      } else {
        readings[lastIndex] = readings[lastIndex] ? `${readings[lastIndex]} ${syllables[index]}` : syllables[index];
      }
    }
    return readings;
  }

  if (syllables.length === 1 && characterCount > 1) {
    const splitSyllables = splitConcatenatedPinyin(romanization, characterCount);
    if (splitSyllables && splitSyllables.length === characterCount) {
      return splitSyllables;
    }
  }

  const readings = Array.from({ length: characterCount }, () => "");
  for (let index = 0; index < syllables.length; index += 1) {
    readings[index] = syllables[index];
  }
  return readings;
}

function buildReaderDisplayTokens(sentence, mode) {
  const displayMode = resolveReaderTokenMode(mode);
  const tokens = Array.isArray(sentence?.tokens) ? sentence.tokens : [];
  const displayTokens = [];

  for (const token of tokens) {
    const surface = String(token?.surface_form ?? token?.surface ?? token?.text ?? "");
    const romanization = String(token?.romanization ?? token?.pronunciation ?? "");
    if (displayMode === "character" && shouldExpandTokenIntoCharacters(surface)) {
      const characters = Array.from(surface);
      const readings = splitRomanizationByCharacters(romanization, characters.length);
      characters.forEach((character, characterIndex) => {
        displayTokens.push({
          ...token,
          order: (Number(token?.order) || displayTokens.length + 1) * 100 + characterIndex + 1,
          surface_form: character,
          lemma: character,
          romanization: readings[characterIndex] ?? null,
        });
      });
      continue;
    }

    displayTokens.push({
      ...token,
      order: Number.isFinite(Number(token?.order)) ? Number(token.order) : displayTokens.length + 1,
      surface_form: surface,
      lemma: typeof token?.lemma === "string" && token.lemma ? token.lemma : surface,
      romanization: typeof token?.romanization === "string" ? token.romanization : null,
    });
  }

  return displayTokens;
}

function handleReaderTokenModeToggle() {
  state.readerTokenMode = state.readerTokenMode === "character" ? "word" : "character";
  window.localStorage.setItem(readerTokenModeStorageKey, state.readerTokenMode);
  state.selectedToken = null;
  state.selectedBookEntry = null;
  state.lexicon = null;
  state.vocabLookup = null;
  renderReader();
}

function getLocalEntryLanguageCode(entry) {
  return typeof entry?.language_code === "string" && entry.language_code.trim() ? entry.language_code.trim() : "zh";
}

function tokenizeSentenceLocally(sentence, languageCode) {
  const normalizedLanguage = typeof languageCode === "string" ? languageCode.toLowerCase() : "zh";
  const tokens = [];
  const wordPattern = normalizedLanguage.startsWith("zh")
    ? /[\u4e00-\u9fff]+|[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g
    : /[\u4e00-\u9fff]|[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g;

  const chunks = sentence.match(wordPattern) ?? [];
  for (const chunk of chunks) {
    if (normalizedLanguage.startsWith("zh") && /[\u4e00-\u9fff]+/.test(chunk)) {
      for (const character of Array.from(chunk)) {
        tokens.push({
          order: tokens.length + 1,
          surface_form: character,
          lemma: character,
          romanization: null,
        });
      }
      continue;
    }

    tokens.push({
      order: tokens.length + 1,
      surface_form: chunk,
      lemma: normalizedLanguage.startsWith("zh") ? chunk : chunk.toLowerCase(),
      romanization: null,
    });
  }

  return tokens;
}

function splitTextIntoSentences(value) {
  const compact = value.replace(/\r\n/g, "\n").trim();
  if (!compact) {
    return [];
  }

  const segmenter = typeof Intl !== "undefined" && typeof Intl.Segmenter === "function" ? new Intl.Segmenter("zh", { granularity: "sentence" }) : null;
  if (segmenter) {
    const pieces = Array.from(segmenter.segment(compact), (item) => item.segment.trim()).filter(Boolean);
    if (pieces.length) {
      return pieces;
    }
  }

  const normalized = compact.replace(/\s+/g, " ");
  const pieces = normalized.match(/[^。！？!?；;…]+[。！？!?；;…]?/g);
  return (pieces ?? [normalized]).map((item) => item.trim()).filter(Boolean);
}

async function buildLocalPasteExtraction(text, languageCode, title) {
  const cleanText = normalizeLocalPasteText(text);
  const sentences = splitTextIntoSentences(cleanText).map((sentence, index) => ({
    order: index + 1,
    text: sentence,
    translation: null,
    tokens: tokenizeSentenceLocally(sentence, languageCode),
  }));
  const lexicalEntries = buildLocalLexicalEntries(sentences);
  const sourcePageSha256 = await sha256Text(text);

  return {
    source_page_sha256: sourcePageSha256,
    text_source: "paste",
    text_source_signature: "paste-text-v1",
    processor_version: "local-demo",
    pipeline_version: "local-demo",
    page: {
      book_id: normalizeTextTitle(title) || "local-text",
      page_number: 1,
      language_code: languageCode,
      source_page_sha256: sourcePageSha256,
      raw_text: text,
      clean_text: cleanText,
      sentences,
      token_occurrences: buildLocalTokenOccurrences(sentences),
      lexical_entries,
    },
  };
}

function normalizeLocalPasteText(rawText) {
  return rawText.replace(/\u3000/g, " ").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

function normalizeTextTitle(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]+/g, "");
}

function buildLocalTokenOccurrences(sentences) {
  const occurrences = [];
  for (const sentence of sentences) {
    for (const token of sentence.tokens ?? []) {
      occurrences.push({
        page_number: 1,
        sentence_order: sentence.order,
        token_order: token.order,
        surface_form: token.surface_form,
        normalized_form: token.lemma ?? token.surface_form,
      });
    }
  }
  return occurrences;
}

function buildLocalLexicalEntries(sentences) {
  const lexicalEntries = new Map();
  for (const sentence of sentences) {
    for (const token of sentence.tokens ?? []) {
      const lemma = token.lemma ?? token.surface_form;
      const existing = lexicalEntries.get(lemma);
      if (existing) {
        existing.frequency_in_book += 1;
        continue;
      }
      lexicalEntries.set(lemma, {
        lemma,
        display_form: token.surface_form,
        frequency_in_book: 1,
        first_page: 1,
        last_page: 1,
      });
    }
  }
  return Array.from(lexicalEntries.values()).sort((left, right) => right.frequency_in_book - left.frequency_in_book || left.lemma.localeCompare(right.lemma));
}

async function sha256Text(value) {
  if (typeof crypto !== "undefined" && crypto?.subtle) {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  let hash = 0;
  for (const char of value) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }
  return `local-${Math.abs(hash)}`;
}

function summarizeText(value, maxLength = 180) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength - 1)}…`;
}

function formatLocalDate(value) {
  if (!value) {
    return "Local";
  }
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "Local";
  }
}

async function copyTextToClipboard(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = value;
    fallback.setAttribute("readonly", "true");
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    document.body.appendChild(fallback);
    fallback.select();
    document.execCommand("copy");
    fallback.remove();
  }
}

async function addDraftTagFromInput() {
  const raw = elements.textEntryTagInput.value;
  const tag = normalizeTag(raw);
  if (!tag) {
    return;
  }
  if (!state.draftEntryTags.includes(tag) && tag !== state.draftEntryKind) {
    state.draftEntryTags = [...state.draftEntryTags, tag];
  }
  elements.textEntryTagInput.value = "";
  renderLibraryComposer();
}

async function handleTextEntrySubmit(event) {
  event.preventDefault();
  const title = elements.textEntryTitle.value.trim();
  const body = elements.textEntryBody.value.trim();
  if (!body) {
    return;
  }

  const primaryTag = entryKinds.has(state.draftEntryKind) ? state.draftEntryKind : defaultEntryKind;
  const resolvedTitle = title || summarizeText(body, 42) || "Untitled text";
  const uniqueTags = [primaryTag, ...state.draftEntryTags].filter((tag, index, all) => all.indexOf(tag) === index);
  const languageCode = "zh";

  let extraction = null;
  if (state.apiBaseUrl) {
    try {
      extraction = await requestJson("/texts/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: body,
          language_code: languageCode,
          title: resolvedTitle,
        }),
      });
    } catch (error) {
      extraction = await buildLocalPasteExtraction(body, languageCode, resolvedTitle);
    }
  } else {
    extraction = await buildLocalPasteExtraction(body, languageCode, resolvedTitle);
  }

  state.localEntries = [
    normalizeLocalEntry({
      id: crypto.randomUUID(),
      title: resolvedTitle,
      body,
      kind: primaryTag,
      language_code: languageCode,
      tags: uniqueTags,
      created_at: new Date().toISOString(),
      extraction,
    }),
    ...state.localEntries,
  ].filter(Boolean);
  saveLocalEntries();

  elements.textEntryTitle.value = "";
  elements.textEntryBody.value = "";
  elements.textEntryTagInput.value = "";
  state.draftEntryKind = primaryTag;
  state.draftEntryTags = [];
  openLocalEntryReader(state.localEntries[0].id, 0);
}

async function saveProcessorUrl() {
  state.apiBaseUrl = normalizeBaseUrl(elements.processorUrl.value);
  window.localStorage.setItem(storageKey, state.apiBaseUrl);
  await connectFromCurrentValue();
}

async function saveWakeHelperUrl() {
  state.wakeHelperUrl = normalizeBaseUrl(elements.wakeHelperUrl.value);
  window.localStorage.setItem(wakeHelperStorageKey, state.wakeHelperUrl);
  renderState();
}

async function connectProcessor() {
  state.apiBaseUrl = normalizeBaseUrl(elements.processorUrl.value);
  window.localStorage.setItem(storageKey, state.apiBaseUrl);
  await connectFromCurrentValue(true);
}

async function connectFromCurrentValue(forceRemote = false) {
  state.error = null;
  state.pageError = null;
  state.pageData = null;
  state.localReaderEntryId = null;
  state.localReaderSentenceIndex = 0;
  state.selectedToken = null;
  state.selectedBookEntry = null;
  state.lexicon = null;
  state.vocabLookup = null;
  state.vocabError = null;
  state.selectedBookId = null;
  state.selectedPageNumber = 1;
  state.selectedSentenceIndex = 0;

  updateModeChrome();

  if (!state.apiBaseUrl) {
    state.books = DEMO_BOOKS.slice();
    state.selectedBookId = DEMO_BOOKS[0]?.id ?? null;
    state.pageData = DEMO_PAGE;
    state.localReaderEntryId = null;
    setProcessorConnectionState(null, "Demo mode is active. Add a processor URL to connect to the desktop API.");
    elements.connectionState.textContent = "Demo mode";
    elements.connectionState.className = "pill";
    elements.connectionHint.textContent = "Enter a processor URL to switch from the demo book to a live processor.";
    elements.libraryStatus.textContent = "Showing the built-in demo book.";
    renderAll();
    return;
  }

  try {
    await ensureProcessorReady(forceRemote);
    await loadBooks();
    setProcessorConnectionState(true, forceRemote ? "Connected to the processor. Uploads and page loads will now hit the remote API." : "Processor URL loaded from browser storage.");
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Unable to connect.";
    setProcessorConnectionState(false, state.wakeHelperUrl
      ? "The remote processor could not be reached. A wake helper was attempted; check the URL, CORS, and helper endpoint."
      : "The remote processor could not be reached. Check the URL and CORS settings.");
  }

  renderAll();
}

async function refreshProcessorStatus(forceWake = false) {
  state.error = null;
  if (!state.apiBaseUrl) {
    setProcessorConnectionState(null, "Leave blank for demo mode.");
    renderAll();
    return;
  }

  const healthy = await probeProcessorHealth();
  if (healthy) {
    setProcessorConnectionState(true, "The remote processor responded to /health.");
    renderAll();
    return;
  }

  if (forceWake || state.wakeHelperUrl) {
    await wakeProcessorHelper();
    const retryHealthy = await probeProcessorHealth();
    if (retryHealthy) {
      setProcessorConnectionState(true, "The remote processor woke up and responded to /health.");
      renderAll();
      return;
    }
  }

  setProcessorConnectionState(false, "The remote processor is offline right now.");
  renderAll();
}

async function wakeAndRefreshProcessorStatus() {
  await wakeProcessorHelper();
  await refreshProcessorStatus(false);
}

function setProcessorConnectionState(healthy, message) {
  state.processorHealthy = healthy;
  state.processorStatusMessage = message;
  state.lastProcessorCheckAt = new Date().toISOString();
  renderProcessorConnectionUI();
}

async function ensureProcessorReady(forceWake = false) {
  if (!state.apiBaseUrl) {
    return;
  }

  const blockedReason = getProcessorUrlBlockReason(state.apiBaseUrl);
  if (blockedReason) {
    setProcessorConnectionState(false, blockedReason);
    throw new Error(blockedReason);
  }

  for (let attempt = 0; attempt < processorHealthProbeAttempts; attempt += 1) {
    const healthy = await probeProcessorHealth();
    if (healthy) {
      return;
    }

    if ((forceWake || state.wakeHelperUrl) && attempt === 0) {
      await wakeProcessorHelper();
    }

    if (attempt < processorHealthProbeAttempts - 1) {
      await wait(processorHealthProbeDelayMs);
    }
  }

  throw new Error("The remote processor is offline.");
}

async function probeProcessorHealth() {
  if (!state.apiBaseUrl) {
    return false;
  }

  const blockedReason = getProcessorUrlBlockReason(state.apiBaseUrl);
  if (blockedReason) {
    setProcessorConnectionState(false, blockedReason);
    return false;
  }

  try {
    const response = await fetch(new URL("/health", ensureTrailingSlash(state.apiBaseUrl)).toString(), {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });
    if (!response.ok) {
      setProcessorConnectionState(false, `Health check returned HTTP ${response.status}.`);
      return false;
    }
    const payload = await response.json().catch(() => null);
    const healthy = payload?.status === "ok";
    setProcessorConnectionState(healthy, healthy ? "The remote processor responded to /health." : "The remote processor returned an unexpected health payload.");
    return healthy;
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : "Could not reach the remote processor.";
    setProcessorConnectionState(false, message);
    return false;
  }
}

async function wakeProcessorHelper() {
  if (!state.wakeHelperUrl) {
    return false;
  }

  const blockedReason = getProcessorUrlBlockReason(state.wakeHelperUrl);
  if (blockedReason) {
    state.processorStatusMessage = blockedReason;
    elements.connectionHint.textContent = blockedReason;
    renderHome();
    return false;
  }

  try {
    await fetch(state.wakeHelperUrl, {
      method: "POST",
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });
    state.processorStatusMessage = "Wake helper contacted. Rechecking the processor now...";
    elements.connectionHint.textContent = state.processorStatusMessage;
    renderHome();
    return true;
  } catch {
    return false;
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function loadBooks(options = {}) {
  const { openFirstBook = true } = options;
  elements.libraryStatus.textContent = "Loading library...";
  state.books = await requestJson("/books");
  elements.bookCount.textContent = String(state.books.length);
  elements.libraryStatus.textContent = state.books.length ? "Select a book to open the reader." : "No imported books were returned by the processor.";

  if (openFirstBook && state.books[0]) {
    await loadReader(state.books[0].id, 1);
  } else {
    state.pageData = null;
    state.selectedBookId = null;
  }
}

function renderUploadProgress() {
  const progress = state.uploadProgress;
  const panelVisible = Boolean(progress);
  elements.uploadProgressPanel?.classList.toggle("is-hidden", !panelVisible);

  if (!progress) {
    if (elements.uploadProgressBadge) {
      elements.uploadProgressBadge.textContent = "Idle";
    }
    if (elements.uploadOverallProgressTrack) {
      elements.uploadOverallProgressTrack.setAttribute("aria-valuenow", "0");
    }
    if (elements.uploadPageProgressTrack) {
      elements.uploadPageProgressTrack.setAttribute("aria-valuenow", "0");
    }
    if (elements.uploadOverallProgressFill) {
      elements.uploadOverallProgressFill.style.width = "0%";
    }
    if (elements.uploadPageProgressFill) {
      elements.uploadPageProgressFill.style.width = "0%";
    }
    if (elements.uploadOverallProgressText) {
      elements.uploadOverallProgressText.textContent = "Waiting for a PDF.";
    }
    if (elements.uploadPageProgressText) {
      elements.uploadPageProgressText.textContent = "0 pages processed.";
    }
    return;
  }

  const overallPercent = Math.max(0, Math.min(100, Math.round(progress.overallPercent ?? 0)));
  const pagePercent = Math.max(0, Math.min(100, Math.round(progress.pagePercent ?? 0)));
  const totalPages = Number(progress.totalPages ?? 0);
  const pagesProcessed = Number(progress.pagesProcessed ?? 0);
  const currentPage = Number(progress.currentPage ?? 0);
  const stage = String(progress.stage ?? "processing");
  const badge = String(progress.badge ?? "Processing");
  const title = String(progress.title ?? "the PDF");
  const overallText = String(progress.message ?? `Processing ${title}.`);
  const pageText = totalPages > 0
    ? `${pagesProcessed}/${totalPages} pages processed${currentPage > 0 ? ` · page ${currentPage}` : ""}.`
    : `${pagesProcessed} pages processed.`;

  if (elements.uploadProgressBadge) {
    elements.uploadProgressBadge.textContent = badge;
  }
  if (elements.uploadOverallProgressTrack) {
    elements.uploadOverallProgressTrack.setAttribute("aria-valuenow", String(overallPercent));
  }
  if (elements.uploadPageProgressTrack) {
    elements.uploadPageProgressTrack.setAttribute("aria-valuenow", String(pagePercent));
  }
  if (elements.uploadOverallProgressFill) {
    elements.uploadOverallProgressFill.style.width = `${overallPercent}%`;
  }
  if (elements.uploadPageProgressFill) {
    elements.uploadPageProgressFill.style.width = `${pagePercent}%`;
  }
  if (elements.uploadOverallProgressText) {
    elements.uploadOverallProgressText.textContent = overallText;
  }
  if (elements.uploadPageProgressText) {
    elements.uploadPageProgressText.textContent = pageText;
  }

  elements.uploadProgressPanel?.classList.toggle("is-done", stage === "done");
  elements.uploadProgressPanel?.classList.toggle("is-error", stage === "error");

  if (!progress) {
    clearUploadSession();
    return;
  }

  saveUploadSession({
    active: Boolean(progress.active),
    bookId: progress.bookId ?? null,
    title: String(progress.title ?? ""),
    fileName: String(progress.fileName ?? ""),
    stage,
    badge,
    overallPercent,
    pagePercent,
    pagesProcessed,
    totalPages,
    currentPage,
    message: overallText,
  });
}

async function monitorUploadedBook(bookId, filename) {
  const bookLabel = String(filename ?? bookId ?? "the PDF").replace(/\.pdf$/i, "");
  let lastKnownProgress = loadUploadSession() ?? {
    bookId,
    title: bookLabel,
    fileName: filename ?? "",
    stage: "processing",
    badge: "Processing",
    overallPercent: 18,
    pagePercent: 0,
    pagesProcessed: 0,
    totalPages: 0,
    currentPage: 0,
    message: `Watching ${bookLabel} for page progress.`,
  };
  state.uploadProgress = {
    active: true,
    bookId,
    title: bookLabel,
    fileName: filename ?? "",
  };
  renderUploadProgress();

  while (true) {
    try {
      const liveBook = await requestJson(`/books/${encodeURIComponent(bookId)}`);
      state.books = state.books.map((book) => (book.id === bookId ? { ...book, ...liveBook } : book));
      renderBooks();
      renderHome();
      if (liveBook) {
        const totalPages = Number(liveBook.extraction_total_pages ?? liveBook.total_pages ?? 0) || 0;
        const pagesProcessed = Number(liveBook.extraction_pages_processed ?? 0) || 0;
        const currentPage = Number(liveBook.extraction_current_page ?? pagesProcessed ?? 0) || 0;
        const status = String(liveBook.extraction_status ?? liveBook.status ?? "processing").toLowerCase();
        const pagePercent = totalPages > 0 ? Math.min(100, Math.round((pagesProcessed / totalPages) * 100)) : 0;
        const overallPercent =
          status === "complete"
            ? 100
            : status === "failed"
              ? 100
              : Math.min(95, Math.max(18, 18 + Math.round(pagePercent * 0.72)));

        state.uploadProgress = {
          active: status !== "complete" && status !== "failed",
          bookId,
          title: String(liveBook.title ?? bookLabel),
          fileName: filename ?? "",
          stage: status === "failed" ? "error" : status === "complete" ? "done" : "processing",
          badge: status === "failed" ? "Failed" : status === "complete" ? "Done" : "Processing",
          overallPercent,
          pagePercent,
          pagesProcessed,
          totalPages,
          currentPage,
          message:
            status === "complete"
              ? `Finished processing ${liveBook.title ?? bookLabel}.`
              : status === "failed"
                ? `Processor failed while handling ${liveBook.title ?? bookLabel}.`
              : totalPages > 0
                  ? `Processing page ${currentPage || pagesProcessed || 1} of ${totalPages}.`
                  : `Processing ${liveBook.title ?? bookLabel}.`,
        };
        lastKnownProgress = { ...state.uploadProgress };
        renderUploadProgress();
      }

      if (!liveBook || ["complete", "failed"].includes(String(liveBook.extraction_status ?? liveBook.status ?? "").toLowerCase())) {
        break;
      }
    } catch (error) {
      state.uploadProgress = {
        ...lastKnownProgress,
        active: true,
        stage: "processing",
        badge: "Waiting",
        overallPercent: Number(lastKnownProgress.overallPercent ?? 18) || 18,
        pagePercent: Number(lastKnownProgress.pagePercent ?? 0) || 0,
        pagesProcessed: Number(lastKnownProgress.pagesProcessed ?? 0) || 0,
        totalPages: Number(lastKnownProgress.totalPages ?? 0) || 0,
        currentPage: Number(lastKnownProgress.currentPage ?? 0) || 0,
        message: error instanceof Error ? error.message : "Unable to read processor progress. Retrying…",
      };
      renderUploadProgress();
      await wait(2000);
      continue;
    }

    await wait(1000);
  }

  state.uploadProgress = {
    ...(state.uploadProgress ?? lastKnownProgress),
    active: false,
    stage: String(state.uploadProgress?.stage ?? lastKnownProgress.stage ?? "done"),
    badge: String(state.uploadProgress?.badge ?? lastKnownProgress.badge ?? "Done"),
  };
  renderUploadProgress();
  await loadBooks({ openFirstBook: false });
  elements.libraryStatus.textContent = `Processing finished for ${bookLabel}. Open the new book from the library.`;
  renderAll();
}

async function handleUpload(event) {
  event.preventDefault();
  if (!state.apiBaseUrl) {
    elements.libraryStatus.textContent = "Upload is disabled in demo mode.";
    return;
  }

  const file = elements.pdfFile.files?.[0];
  if (!file) {
    elements.libraryStatus.textContent = "Choose a PDF before uploading.";
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("language_code", "zh");
  formData.append("title", elements.bookTitle.value.trim() || file.name.replace(/\.pdf$/i, ""));
  formData.append("ocr_provider", state.ocrProvider);

  try {
    state.uploadProgress = {
      active: true,
      stage: "uploading",
      badge: "Uploading",
      overallPercent: 24,
      pagePercent: 0,
      pagesProcessed: 0,
      totalPages: 0,
      currentPage: 0,
      message: `Uploading ${file.name || "PDF file"} to the processor.`,
      title: elements.bookTitle.value.trim() || file.name.replace(/\.pdf$/i, ""),
      fileName: file.name,
    };
    renderUploadProgress();
    setBusy(true);
    elements.libraryStatus.textContent = "Uploading and registering the scan...";
    const uploadedBook = await uploadFormData("/books/upload", formData, (event) => {
      const loaded = Number(event?.loaded ?? 0) || 0;
      const total = Number(event?.total ?? file.size ?? 0) || 0;
      const uploadPercent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
      const uploadComplete = Boolean(event?.uploadComplete);
      state.uploadProgress = {
        ...(state.uploadProgress ?? {}),
        active: true,
        stage: uploadComplete ? "processing" : "uploading",
        badge: uploadComplete ? "Processing" : "Uploading",
        overallPercent: uploadComplete ? 28 : Math.max(8, uploadPercent),
        pagePercent: Number(state.uploadProgress?.pagePercent ?? 0) || 0,
        pagesProcessed: Number(state.uploadProgress?.pagesProcessed ?? 0) || 0,
        totalPages: Number(state.uploadProgress?.totalPages ?? 0) || 0,
        currentPage: Number(state.uploadProgress?.currentPage ?? 0) || 0,
        message: uploadComplete
          ? "Upload finished. Waiting for the processor to register and split the PDF."
          : `Uploading ${formatBytes(loaded)} of ${formatBytes(total)}.`,
        fileName: file.name,
      };
      renderUploadProgress();
    });
    state.uploadProgress = {
      active: true,
      bookId: uploadedBook?.id ?? null,
      title: uploadedBook?.title ?? file.name.replace(/\.pdf$/i, ""),
      fileName: file.name,
      stage: "processing",
      badge: "Processing",
      overallPercent: 16,
      pagePercent: Number(uploadedBook?.extraction_total_pages ?? uploadedBook?.total_pages ?? 0)
        ? Math.min(
            100,
            Math.round(
              ((Number(uploadedBook?.extraction_pages_processed ?? 0) || 0) /
                Math.max(Number(uploadedBook?.extraction_total_pages ?? uploadedBook?.total_pages ?? 0), 1)) *
                100,
            ),
          )
        : 0,
      pagesProcessed: Number(uploadedBook?.extraction_pages_processed ?? 0) || 0,
      totalPages: Number(uploadedBook?.extraction_total_pages ?? uploadedBook?.total_pages ?? 0) || 0,
      currentPage: Number(uploadedBook?.extraction_current_page ?? 0) || 0,
      message: "Waiting for the processor to finish the book.",
    };
    renderUploadProgress();
    elements.libraryStatus.textContent = "Book accepted. Processing pages in the background...";
    if (uploadedBook?.id) {
      void monitorUploadedBook(uploadedBook.id, file.name);
    }
    await loadBooks({ openFirstBook: false });
    setActiveView("library");
  } catch (error) {
    state.uploadProgress = {
      ...(state.uploadProgress ?? {}),
      active: false,
      stage: "error",
      badge: "Error",
      overallPercent: 100,
      pagePercent: Number(state.uploadProgress?.pagePercent ?? 0) || 0,
      message: error instanceof Error ? error.message : "Unable to upload the PDF.",
    };
    renderUploadProgress();
      state.error = error instanceof Error ? error.message : "Unable to upload the PDF.";
      renderAll();
    } finally {
      setBusy(false);
    }
}

function handleOcrModeToggle(event) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  const provider = resolveOcrProvider(target?.dataset.ocrProvider ?? "");
  if (provider === state.ocrProvider) {
    return;
  }

  state.ocrProvider = provider;
  window.localStorage.setItem(ocrProviderStorageKey, provider);
  renderUploadMode();
}

async function loadReader(bookId, pageNumber, sentenceIndex = 0) {
  state.localReaderEntryId = null;
  state.selectedBookId = bookId;
  state.selectedPageNumber = pageNumber;
  state.pageError = null;
  state.selectedToken = null;
  state.selectedBookEntry = null;
  state.lexicon = null;
  try {
    state.pageData = await requestJson(`/books/${encodeURIComponent(bookId)}/pages/${pageNumber}`);
    const sentences = state.pageData?.extraction?.page?.sentences ?? [];
    state.selectedSentenceIndex =
      sentenceIndex === -1
        ? Math.max(sentences.length - 1, 0)
        : Math.min(Math.max(0, sentenceIndex), Math.max(sentences.length - 1, 0));
    setActiveView("reader");
    renderAll();
  } catch (error) {
    state.pageError = error instanceof Error ? error.message : "Unable to load reader page.";
    state.pageData = null;
    renderAll();
  }
}

async function moveSentence(delta) {
  if (state.localReaderEntryId) {
    moveLocalSentence(delta);
    return;
  }

  const book = state.pageData?.book ?? null;
  const sentences = state.pageData?.extraction?.page?.sentences ?? [];
  if (!book || !sentences.length) {
    return;
  }

  const nextSentence = state.selectedSentenceIndex + delta;
  if (nextSentence >= 0 && nextSentence < sentences.length) {
    state.selectedSentenceIndex = nextSentence;
    state.selectedToken = null;
    renderReader();
    return;
  }

  if (delta > 0 && state.selectedPageNumber < book.total_pages) {
    await loadReader(state.selectedBookId, state.selectedPageNumber + 1, 0);
  } else if (delta < 0 && state.selectedPageNumber > 1) {
    await loadReader(state.selectedBookId, state.selectedPageNumber - 1, -1);
  }
}

async function extractSelectedBook() {
  if (!state.selectedBookId || !state.apiBaseUrl) {
    return;
  }

  try {
    setBusy(true);
    await requestJson(`/books/${encodeURIComponent(state.selectedBookId)}/extract`, {
      method: "POST",
      body: JSON.stringify({
        page_start: 1,
        page_count: null,
        force: true,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    await loadBooks();
    setActiveView("reader");
  } catch (error) {
    state.pageError = error instanceof Error ? error.message : "Unable to trigger extraction.";
  } finally {
    setBusy(false);
    renderAll();
  }
}

async function inspectToken(token) {
  const page = state.pageData?.extraction?.page ?? null;
  const book = state.pageData?.book ?? null;
  if (!book || !token) {
    return;
  }

  state.selectedToken = token;
  state.selectedBookEntry = page?.lexical_entries?.find((item) => item.lemma === (token.lemma ?? token.surface_form)) ?? null;
  elements.vocabTerm.value = token.surface_form;
  state.lexicon = buildLocalLexiconFallback(token, book.language_code, state.selectedBookEntry);
  state.vocabLookup = state.lexicon;
  state.vocabError = null;
  renderReader();

  if (!state.apiBaseUrl) {
    state.lexicon = lookupDemoLexicon(token.surface_form);
    state.vocabLookup = state.lexicon;
    renderReader();
    return;
  }

  void requestJson(`/lexicon/lookup?language_code=${encodeURIComponent(book.language_code)}&term=${encodeURIComponent(token.surface_form)}`)
    .then((lookup) => {
      if (state.selectedToken?.surface_form !== token.surface_form || state.selectedToken?.order !== token.order) {
        return;
      }
      if (lookup?.entries?.length) {
        state.lexicon = lookup;
        state.vocabLookup = lookup;
      }
      state.vocabError = null;
      renderReader();
    })
    .catch(() => {
      if (state.selectedToken?.surface_form !== token.surface_form || state.selectedToken?.order !== token.order) {
        return;
      }
      state.lexicon = buildLocalLexiconFallback(token, book.language_code, state.selectedBookEntry);
      state.vocabLookup = state.lexicon;
      renderReader();
    });
}

async function inspectLocalToken(token, localEntry) {
  if (!localEntry || !token) {
    return;
  }

  state.selectedToken = token;
  state.selectedBookEntry = null;
  elements.vocabTerm.value = token.surface_form;
  state.lexicon = buildLocalLexiconFallback(token, getLocalEntryLanguageCode(localEntry), null);
  state.vocabLookup = state.lexicon;
  state.vocabError = null;
  renderReader();

  if (!state.apiBaseUrl) {
    state.lexicon = lookupDemoLexicon(token.surface_form);
    state.vocabLookup = state.lexicon;
    renderReader();
    return;
  }

  void requestJson(
    `/lexicon/lookup?language_code=${encodeURIComponent(getLocalEntryLanguageCode(localEntry))}&term=${encodeURIComponent(token.surface_form)}`,
  )
    .then((lookup) => {
      if (state.selectedToken?.surface_form !== token.surface_form || state.selectedToken?.order !== token.order) {
        return;
      }
      if (lookup?.entries?.length) {
        state.lexicon = lookup;
        state.vocabLookup = lookup;
      }
      state.vocabError = null;
      renderReader();
    })
    .catch(() => {
      if (state.selectedToken?.surface_form !== token.surface_form || state.selectedToken?.order !== token.order) {
        return;
      }
      state.lexicon = buildLocalLexiconFallback(token, getLocalEntryLanguageCode(localEntry), null);
      state.vocabLookup = state.lexicon;
      renderReader();
    });
}

function openLocalEntryReader(entryId, sentenceIndex = 0) {
  const entry = state.localEntries.find((item) => item.id === entryId);
  if (!entry) {
    return;
  }

  state.localReaderEntryId = entryId;
  const sentences = getLocalEntrySentences(entry);
  state.localReaderSentenceIndex = Math.max(0, Math.min(sentenceIndex, Math.max((sentences.length ?? 1) - 1, 0)));
  state.selectedBookId = null;
  state.pageData = null;
  state.selectedToken = null;
  state.selectedBookEntry = null;
  state.lexicon = null;
  state.pageError = null;
  setActiveView("reader");
  renderAll();
}

function moveLocalSentence(delta) {
  const entry = state.localEntries.find((item) => item.id === state.localReaderEntryId);
  if (!entry) {
    return;
  }

  const sentences = getLocalEntrySentences(entry);
  const next = state.localReaderSentenceIndex + delta;
  if (next >= 0 && next < sentences.length) {
    state.localReaderSentenceIndex = next;
    state.selectedToken = null;
    state.lexicon = null;
    renderReader();
  }
}

function renderAll() {
  updateModeChrome();
  renderBooks();
  renderLocalEntries();
  renderLibraryComposer();
  renderReader();
  renderState();
  renderNavigation();
  renderViews();
  renderHome();
  renderVocabularyPanel();
  renderOptions();
  renderUploadMode();
  renderUploadProgress();
}

function renderUploadMode() {
  if (!elements.ocrModeToggle) {
    return;
  }

  elements.ocrModeToggle.querySelectorAll("[data-ocr-provider]").forEach((button) => {
    const provider = resolveOcrProvider(button.dataset.ocrProvider ?? "");
    button.classList.toggle("is-active", provider === state.ocrProvider);
  });
}

function renderBooks() {
  elements.bookCount.textContent = String(state.books.length);
  elements.bookList.replaceChildren();

  for (const book of state.books) {
    const node = elements.bookCardTemplate.content.cloneNode(true);
    node.querySelector(".pill").textContent = book.language_code.toUpperCase();
    node.querySelector(".book-status").textContent = book.status.replaceAll("_", " ");
    node.querySelector(".book-status").className = "muted book-status";
    node.querySelector(".book-title").textContent = book.title;
    node.querySelector(".book-author").textContent = book.author ?? "Unknown author";
    node.querySelector(".book-kind").textContent = "book";
    node.querySelector(".book-pages").textContent = String(book.total_pages);
    node.querySelector(".book-prepared").textContent = String(book.page_image_count);
    node.querySelector(".book-extracted").textContent = String(book.extracted_page_count);

    const openButton = node.querySelector(".book-open");
    openButton.addEventListener("click", () => void loadReader(book.id, 1));
    node.querySelector(".book-archive")?.addEventListener("click", () => void archiveRemoteBook(book));
    node.querySelector(".book-delete")?.addEventListener("click", () => void deleteRemoteBook(book));

    elements.bookList.appendChild(node);
  }
}

function renderLibraryComposer() {
  if (!elements.textEntryKinds) {
    return;
  }

  elements.textEntryKinds.querySelectorAll("[data-entry-kind]").forEach((button) => {
    const kind = button.dataset.entryKind;
    button.classList.toggle("is-active", kind === state.draftEntryKind);
  });

  elements.textEntryTagChips.replaceChildren();

  const primaryChip = document.createElement("span");
  primaryChip.className = "tag-chip tag-chip-primary";
  primaryChip.textContent = state.draftEntryKind;
  elements.textEntryTagChips.appendChild(primaryChip);

  for (const tag of state.draftEntryTags) {
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    chip.innerHTML = `
      <span>${escapeHtml(tag)}</span>
      <button type="button" class="tag-chip-remove" aria-label="Remove tag ${escapeHtml(tag)}">x</button>
    `;
    chip.querySelector(".tag-chip-remove")?.addEventListener("click", () => {
      state.draftEntryTags = state.draftEntryTags.filter((item) => item !== tag);
      renderLibraryComposer();
    });
    elements.textEntryTagChips.appendChild(chip);
  }
}

function renderLocalEntries() {
  elements.localEntryCount.textContent = String(state.localEntries.length);
  elements.localEntryList.replaceChildren();

  for (const entry of state.localEntries) {
    const node = document.getElementById("textEntryCardTemplate")?.content?.cloneNode(true);
    if (!node) {
      continue;
    }

    const tags = Array.isArray(entry.tags) ? entry.tags : [];
    const kind = entry.kind ?? tags[0] ?? defaultEntryKind;
    const sentences = getLocalEntrySentences(entry);
    node.querySelector(".text-entry-kind").textContent = kind;
    node.querySelector(".text-entry-date").textContent = formatLocalDate(entry.created_at);
    node.querySelector(".text-entry-title").textContent = entry.title;
    node.querySelector(".text-entry-snippet").textContent = summarizeText(entry.body);
    node.querySelector(".text-entry-sentence-count-value").textContent = String(sentences.length);
    node.querySelector(".text-entry-tag-count").textContent = String(tags.length);
    node.querySelector(".text-entry-type").textContent = kind;
    node.querySelector(".text-entry-type-value").textContent = kind;

    const tagsWrap = node.querySelector(".text-entry-tags");
    for (const tag of tags.slice(1)) {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.innerHTML = `
        <span>${escapeHtml(tag)}</span>
        <button type="button" class="tag-chip-remove" aria-label="Remove tag ${escapeHtml(tag)}">x</button>
      `;
      chip.querySelector(".tag-chip-remove")?.addEventListener("click", () => {
        state.localEntries = state.localEntries.map((item) =>
          item.id === entry.id
            ? {
                ...item,
                tags: (item.tags ?? []).filter((currentTag) => currentTag !== tag),
              }
            : item,
        );
        saveLocalEntries();
        renderAll();
      });
      tagsWrap.appendChild(chip);
    }

    node.querySelector(".text-entry-open")?.addEventListener("click", () => {
      openLocalEntryReader(entry.id, 0);
    });

    node.querySelector(".text-entry-copy")?.addEventListener("click", async () => {
      await copyTextToClipboard(entry.body);
    });
    node.querySelector(".text-entry-archive")?.addEventListener("click", () => archiveLocalEntry(entry));

    elements.localEntryList.appendChild(node);
  }
}

function renderHome() {
  elements.homeBookCount.textContent = String(state.books.length);
  elements.homePageCount.textContent = String(state.pageData?.book?.total_pages ?? state.books[0]?.total_pages ?? 0);
  if (elements.homeProcessorState) {
    elements.homeProcessorState.textContent = state.apiBaseUrl ? (state.processorHealthy ? "Online" : "Offline") : "Demo";
    elements.homeProcessorState.className = state.apiBaseUrl ? `pill ${state.processorHealthy ? "pill-primary" : "pill-warn"}` : "pill";
  }
  if (elements.homeProcessorSummary) {
    elements.homeProcessorSummary.textContent = state.processorStatusMessage;
  }
  if (elements.homeProcessorCheck) {
    elements.homeProcessorCheck.textContent = `Last checked: ${formatStatusDate(state.lastProcessorCheckAt)}`;
  }
}

function renderReader() {
  const localEntry = state.localEntries.find((item) => item.id === state.localReaderEntryId) ?? null;
  const page = localEntry ? null : state.pageData?.extraction?.page ?? null;
  const book = localEntry ? null : state.pageData?.book ?? null;
  const localSentences = localEntry ? getLocalEntrySentences(localEntry) : [];
  const remoteSentences = page?.sentences ?? [];
  const currentSentence = localEntry ? localSentences[state.localReaderSentenceIndex] ?? null : remoteSentences[state.selectedSentenceIndex] ?? null;
  const currentSentenceCount = localEntry ? localSentences.length : remoteSentences.length;
  const currentSentenceNumber = localEntry ? state.localReaderSentenceIndex + 1 : state.selectedSentenceIndex + 1;
  const pageTranslation = !localEntry && typeof page?.page_translation === "string" ? page.page_translation.trim() : "";
  const sentenceTranslation = !localEntry && typeof currentSentence?.translation === "string" ? currentSentence.translation.trim() : "";
  const displayedSentenceTokens = currentSentence ? buildReaderDisplayTokens(currentSentence, state.readerTokenMode) : [];
  const readableDisplayedTokens = displayedSentenceTokens.filter((token) => !isSentencePunctuation(token.surface_form));

  elements.readerEmpty.classList.toggle("is-hidden", Boolean(page || localEntry));
  elements.readerBody.classList.toggle("is-hidden", !(page || localEntry));
  elements.readerTitle.textContent = localEntry?.title ?? book?.title ?? "Select a book";
  elements.readerAuthor.textContent = localEntry ? `Local text · ${localEntry.kind}` : book?.author ?? "Pick a book from the library.";
  elements.readerProgress.textContent = page || localEntry
    ? localEntry
      ? `TXT | S${currentSentence ? currentSentenceNumber : 0}/${currentSentenceCount || 0}`
      : `P${state.selectedPageNumber}/${book?.total_pages ?? 1} | S${currentSentence ? currentSentenceNumber : 0}/${currentSentenceCount || 0}`
    : "P1/1 | S1/1";
  elements.toggleImage.classList.toggle("is-active", state.showImage);
  elements.toggleImage.setAttribute("aria-label", state.showImage ? "Hide page image" : "Show page image");
  elements.toggleImage.title = state.showImage ? "Hide page image" : "Show page image";
  if (elements.readerTokenModeToggle) {
    const tokenModeLabel = getReaderTokenModeLabel(state.readerTokenMode);
    elements.readerTokenModeToggle.classList.toggle("is-active", state.readerTokenMode === "character");
    elements.readerTokenModeToggle.textContent = tokenModeLabel;
    elements.readerTokenModeToggle.setAttribute(
      "aria-label",
      state.readerTokenMode === "character" ? "Switch to word mode" : "Switch to character mode",
    );
    elements.readerTokenModeToggle.setAttribute("aria-pressed", String(state.readerTokenMode === "character"));
    elements.readerTokenModeToggle.title = state.readerTokenMode === "character" ? "Character mode" : "Word mode";
  }
  elements.pageImageWrap.classList.toggle("is-hidden", !state.showImage || !page);
  elements.pageImage.src = resolveResourceUrl(state.pageData?.image_url ?? "");
  renderReaderOptionsMenu(page, localEntry);

  const atFirstSentence = localEntry ? state.localReaderSentenceIndex <= 0 : state.selectedSentenceIndex <= 0;
  const atLastSentence = localEntry
    ? state.localReaderSentenceIndex >= Math.max(localSentences.length - 1, 0)
    : state.selectedSentenceIndex >= Math.max(remoteSentences.length - 1, 0);
  elements.prevPage.disabled = Boolean(state.busy) || (!localEntry && !book) || (localEntry ? atFirstSentence : state.selectedPageNumber <= 1 && atFirstSentence);
  elements.nextPage.disabled = Boolean(state.busy) || (!localEntry && !book) || (localEntry ? atLastSentence : state.selectedPageNumber >= (book?.total_pages ?? 1) && atLastSentence);
  elements.extractNow.disabled = !state.selectedBookId || Boolean(state.busy) || Boolean(localEntry);

  renderMetrics(book);
  renderTokenPanel(page, localEntry);

  elements.readerText.replaceChildren();

  if (!(page || localEntry)) {
    elements.readerNotice.style.display = "none";
    elements.readerTranslation.replaceChildren();
    return;
  }

  if (state.pageError) {
    elements.readerNotice.style.display = "block";
    elements.readerNotice.textContent = state.pageError;
  } else if (!currentSentence) {
    elements.readerNotice.style.display = "block";
    elements.readerNotice.textContent = localEntry
      ? "This text is ready, but no sentence was extracted yet."
      : "This page is ready, but no sentence is available yet.";
  } else {
    elements.readerNotice.style.display = "none";
  }

  if (currentSentence) {
    if (localEntry) {
      const block = document.createElement("article");
      block.className = "sentence-card local-sentence-card";
      block.setAttribute("aria-label", `Sentence ${currentSentenceNumber}`);

      const header = document.createElement("div");
      header.className = "local-sentence-meta";
      header.innerHTML = `
        <span class="eyebrow">Sentence</span>
        <strong>${currentSentenceNumber}/${currentSentenceCount || 0}</strong>
      `;

      block.appendChild(header);

      if (displayedSentenceTokens.length) {
        const chineseRow = document.createElement("div");
        chineseRow.className = "sentence-chinese";
        for (const token of displayedSentenceTokens) {
          const tokenButton = document.createElement("button");
          tokenButton.type = "button";
          const isSelected = state.selectedToken && state.selectedToken.surface_form === token.surface_form && state.selectedToken.order === token.order;
          tokenButton.className = `token-inline ${isCjk(token.surface_form) ? "is-cjk" : "is-word"} ${token.romanization ? "" : "is-punct"}${isSelected ? " is-selected" : ""}`.trim();
          tokenButton.innerHTML = `
            <span class="token-romanization">${escapeHtml(token.romanization ?? "")}</span>
            <span class="token-surface">${escapeHtml(token.surface_form)}</span>
          `;
          tokenButton.addEventListener("click", () => void inspectLocalToken(token, localEntry));
          tokenButton.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              void inspectLocalToken(token, localEntry);
            }
          });
          chineseRow.appendChild(tokenButton);
        }
        block.appendChild(chineseRow);
      } else {
        const sentenceText = document.createElement("div");
        sentenceText.className = "local-sentence-text";
        sentenceText.textContent = getSentenceText(currentSentence);
        block.appendChild(sentenceText);
      }
      elements.readerText.appendChild(block);
    } else {
      const block = document.createElement("article");
      block.className = "sentence-card";
      block.setAttribute("aria-label", `Sentence ${currentSentence.order}`);

      const chineseRow = document.createElement("div");
      chineseRow.className = "sentence-chinese";

      for (const token of displayedSentenceTokens) {
        const tokenButton = document.createElement("button");
        tokenButton.type = "button";
        const isSelected = state.selectedToken && state.selectedToken.surface_form === token.surface_form && state.selectedToken.order === token.order;
        tokenButton.className = `token-inline ${isCjk(token.surface_form) ? "is-cjk" : "is-word"} ${token.romanization ? "" : "is-punct"}${isSelected ? " is-selected" : ""}`.trim();
        tokenButton.innerHTML = `
          <span class="token-romanization">${escapeHtml(token.romanization ?? "")}</span>
          <span class="token-surface">${escapeHtml(token.surface_form)}</span>
        `;
        tokenButton.addEventListener("click", () => void inspectToken(token));
        tokenButton.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            void inspectToken(token);
          }
        });
        chineseRow.appendChild(tokenButton);
      }
      block.appendChild(chineseRow);
      elements.readerText.appendChild(block);
    }
  }

  elements.readerTranslation.innerHTML = localEntry
    ? `
      <p class="reader-translation-label">Parsed text</p>
      <p class="reader-translation-text">${escapeHtml(`${currentSentenceCount || 0} sentences extracted from the pasted text.`)}</p>
    `
    : currentSentence
      ? `
        <p class="reader-translation-label">${sentenceTranslation ? "Translation" : pageTranslation ? "Page translation" : "Translation"}</p>
        <p class="reader-translation-text">${escapeHtml(sentenceTranslation || pageTranslation || "Translation will appear here once the processor returns it.")}</p>
      `
      : "";
}

function renderTokenPanel(page, localEntry = null) {
  if (localEntry) {
    const token = state.selectedToken;
    const lexiconEntry = state.lexicon?.entries?.[0] ?? null;

    if (token) {
      elements.tokenPanel.classList.add("has-selection");
      elements.tokenPanel.innerHTML = `
        <div class="token-panel-header">
          <span class="eyebrow">Lookup</span>
          <button id="closeTokenPanel" class="icon-button" type="button" aria-label="Close definition">×</button>
        </div>
        <div class="token-lookup-card">
          <span class="token-lookup-term">${escapeHtml(token.surface_form)}</span>
          <p class="token-lookup-pinyin">${escapeHtml(lexiconEntry?.pinyin ?? token.romanization ?? "-")}</p>
          <p class="token-lookup-definition">${escapeHtml(lexiconEntry?.definition ?? token.definition_short ?? "No definition returned yet.")}</p>
        </div>
        <dl class="definition-grid">
          <div><dt>Lemma</dt><dd>${escapeHtml(lexiconEntry?.surface_form ?? token.lemma ?? token.surface_form)}</dd></div>
          <div><dt>Pinyin</dt><dd>${escapeHtml(lexiconEntry?.pinyin ?? token.romanization ?? "-")}</dd></div>
          <div><dt>HSK</dt><dd>${escapeHtml(lexiconEntry?.hsk_level ?? token.proficiency_level ?? "-")}</dd></div>
          <div><dt>Frequency</dt><dd>${escapeHtml(String(lexiconEntry?.frequency_in_book ?? 1))}</dd></div>
          <div><dt>Radical</dt><dd>${escapeHtml(lexiconEntry?.radical ?? "-")}</dd></div>
          <div><dt>Strokes</dt><dd>${escapeHtml(String(lexiconEntry?.stroke_count ?? "-"))}</dd></div>
        </dl>
      `;
      const closeButton = elements.tokenPanel.querySelector("#closeTokenPanel");
      closeButton?.addEventListener("click", () => {
        state.selectedToken = null;
        state.selectedBookEntry = null;
        state.lexicon = null;
        renderReader();
      });
    } else {
      elements.tokenPanel.classList.remove("has-selection");
      elements.tokenPanel.innerHTML = `
        <div class="token-lookup-card">
          <span class="token-lookup-term">${escapeHtml(localEntry.kind)}</span>
          <p class="token-lookup-pinyin">${escapeHtml(token?.romanization ?? "-")}</p>
          <p class="token-lookup-definition">${escapeHtml(summarizeText(localEntry.body, 220))}</p>
        </div>
        <dl class="definition-grid">
          <div><dt>Sentences</dt><dd>${escapeHtml(String(getLocalEntrySentences(localEntry).length))}</dd></div>
          <div><dt>Tags</dt><dd>${escapeHtml(String(localEntry.tags?.length ?? 0))}</dd></div>
          <div><dt>Type</dt><dd>${escapeHtml(localEntry.kind)}</dd></div>
          <div><dt>Created</dt><dd>${escapeHtml(formatLocalDate(localEntry.created_at))}</dd></div>
          <div><dt>Copy</dt><dd>Available</dd></div>
          <div><dt>Status</dt><dd>Parsed</dd></div>
        </dl>
      `;
    }

    const frequencySource = localEntry.extraction?.page?.lexical_entries ?? [];
    if (frequencySource.length) {
      const frequencyList = document.createElement("div");
      frequencyList.innerHTML = `
        <p class="small-copy"><strong>Book frequency</strong></p>
        <div class="token-panel">
          ${frequencySource
            .slice(0, 5)
            .map((item) => `<p class="small-copy">${escapeHtml(item.display_form)} - ${item.frequency_in_book}x</p>`)
            .join("")}
        </div>
      `;
      elements.tokenPanel.appendChild(frequencyList);
    }
    return;
  }

  const token = state.selectedToken;
  const entry = state.selectedBookEntry;
  const lexiconEntry = state.lexicon?.entries?.[0] ?? null;

  if (!token) {
    elements.tokenPanel.classList.remove("has-selection");
    elements.tokenPanel.innerHTML = `
      <p class="small-copy">Select a word to see its definition.</p>
    `;
  } else {
    elements.tokenPanel.classList.add("has-selection");
    elements.tokenPanel.innerHTML = `
      <div class="token-panel-header">
        <span class="eyebrow">Lookup</span>
        <button id="closeTokenPanel" class="icon-button" type="button" aria-label="Close definition">×</button>
      </div>
      <div class="token-lookup-card">
        <span class="token-lookup-term">${escapeHtml(token.surface_form)}</span>
        <p class="token-lookup-pinyin">${escapeHtml(lexiconEntry?.pinyin ?? token.romanization ?? "-")}</p>
        <p class="token-lookup-definition">${escapeHtml(lexiconEntry?.definition ?? token.definition_short ?? entry?.lemma ?? "No definition returned yet.")}</p>
      </div>
      <dl class="definition-grid">
        <div><dt>Lemma</dt><dd>${escapeHtml(lexiconEntry?.surface_form ?? token.lemma ?? token.surface_form)}</dd></div>
        <div><dt>Pinyin</dt><dd>${escapeHtml(lexiconEntry?.pinyin ?? token.romanization ?? "-")}</dd></div>
        <div><dt>HSK</dt><dd>${escapeHtml(lexiconEntry?.hsk_level ?? token.proficiency_level ?? "-")}</dd></div>
        <div><dt>Frequency</dt><dd>${escapeHtml(String(entry?.frequency_in_book ?? 1))}</dd></div>
        <div><dt>Radical</dt><dd>${escapeHtml(lexiconEntry?.radical ?? "-")}</dd></div>
        <div><dt>Strokes</dt><dd>${escapeHtml(String(lexiconEntry?.stroke_count ?? "-"))}</dd></div>
      </dl>
    `;
    const closeButton = elements.tokenPanel.querySelector("#closeTokenPanel");
    closeButton?.addEventListener("click", () => {
      state.selectedToken = null;
      state.selectedBookEntry = null;
      state.lexicon = null;
      renderReader();
    });
  }

  if (page?.lexical_entries?.length) {
    const frequencyList = document.createElement("div");
    frequencyList.innerHTML = `
      <p class="small-copy"><strong>Book frequency</strong></p>
      <div class="token-panel">
        ${page.lexical_entries
          .slice(0, 5)
          .map((item) => `<p class="small-copy">${escapeHtml(item.display_form)} - ${item.frequency_in_book}x</p>`)
          .join("")}
      </div>
    `;
    elements.tokenPanel.appendChild(frequencyList);
  }
}

function renderVocabularyPanel() {
  const lookup = state.vocabLookup;

  if (state.vocabError) {
    elements.vocabStatus.innerHTML = `<p class="small-copy">${escapeHtml(state.vocabError)}</p>`;
  } else if (!lookup) {
    elements.vocabStatus.innerHTML = `<p class="small-copy">Search the lexicon directly.</p>`;
  } else {
    elements.vocabStatus.innerHTML = `<p class="small-copy">Results for <strong>${escapeHtml(lookup.query)}</strong></p>`;
  }

  elements.vocabResults.replaceChildren();

  if (!lookup?.entries?.length) {
    return;
  }

  for (const entry of lookup.entries.slice(0, 8)) {
    const result = document.createElement("article");
    result.className = "vocab-result";
    result.innerHTML = `
      <div class="book-card-top">
        <span class="pill">${escapeHtml(entry.entry_type)}</span>
        <span class="muted">${escapeHtml(entry.hsk_level ?? "-")}</span>
      </div>
      <h3>${escapeHtml(entry.surface_form)}</h3>
      <p class="small-copy">${escapeHtml(entry.definition ?? "No definition returned.")}</p>
      <dl class="definition-grid vocab-grid">
        <div><dt>Pinyin</dt><dd>${escapeHtml(entry.pinyin ?? "-")}</dd></div>
        <div><dt>Radical</dt><dd>${escapeHtml(entry.radical ?? "-")}</dd></div>
        <div><dt>Strokes</dt><dd>${escapeHtml(String(entry.stroke_count ?? "-"))}</dd></div>
        <div><dt>Rank</dt><dd>${escapeHtml(String(entry.frequency_rank ?? "-"))}</dd></div>
      </dl>
    `;
    elements.vocabResults.appendChild(result);
  }
}

function renderMetrics(book) {
  const totalPages = book?.total_pages ?? 0;
  const prepared = book?.page_image_count ?? 0;
  const extracted = book?.extracted_page_count ?? 0;
  elements.bookMetrics.innerHTML = `
    <div><dt>Pages</dt><dd>${totalPages}</dd></div>
    <div><dt>Prepared</dt><dd>${prepared}</dd></div>
    <div><dt>Extracted</dt><dd>${extracted}</dd></div>
  `;
}

function renderState() {
  if (state.pageError) {
    elements.statusSummary.textContent = state.pageError;
  } else {
    elements.statusSummary.textContent = state.apiBaseUrl
      ? "The browser shell is connected to a remote processor API. Uploads and extraction requests stay outside the Pages host."
      : "The browser shell is in demo mode. Enter a processor URL to switch to live books and remote extraction.";
  }
  if (state.error) {
    elements.libraryStatus.textContent = state.error;
  }
  renderProcessorConnectionUI();
}

function renderProcessorConnectionUI() {
  if (!elements.connectionState || !elements.connectionHint) {
    return;
  }

  if (!state.apiBaseUrl) {
    elements.connectionState.textContent = "Demo mode";
    elements.connectionState.className = "pill";
    elements.connectionHint.textContent = "Enter a processor URL to switch from the demo book to a live processor.";
    return;
  }

  if (state.processorHealthy === true) {
    elements.connectionState.textContent = "Connected";
    elements.connectionState.className = "pill pill-primary";
  } else if (state.processorHealthy === false) {
    elements.connectionState.textContent = "Offline";
    elements.connectionState.className = "pill pill-warn";
  } else {
    elements.connectionState.textContent = "Checking";
    elements.connectionState.className = "pill pill-warn";
  }

  elements.connectionHint.textContent = state.processorStatusMessage;
}

function renderNavigation() {
  for (const link of elements.navLinks) {
    const view = resolveView(link.getAttribute("href") ?? "");
    link.classList.toggle("is-active", view === state.activeView);
  }
}

function renderViews() {
  for (const section of elements.viewSections) {
    const view = section.dataset.view ?? "";
    section.classList.toggle("is-hidden", view !== state.activeView);
  }
}

function renderOptions() {
  elements.themeChoices.forEach((button) => {
    const theme = resolveTheme(button.dataset.themeChoice ?? defaultTheme);
    button.classList.toggle("is-active", theme === state.theme);
    button.setAttribute("aria-pressed", String(theme === state.theme));
  });

  if (elements.themeStatus) {
    elements.themeStatus.textContent = themeLabel(state.theme);
  }

  renderArchivePanel();
}

function renderArchivePanel() {
  if (!elements.archiveList || !elements.archiveCount) {
    return;
  }

  elements.archiveCount.textContent = String(state.archivedItems.length);
  elements.archiveList.replaceChildren();

  if (!state.archivedItems.length) {
    const empty = document.createElement("p");
    empty.className = "small-copy";
    empty.textContent = "No archived items yet.";
    elements.archiveList.appendChild(empty);
    return;
  }

  for (const item of state.archivedItems) {
    const card = document.createElement("article");
    card.className = "archive-item";
    const canRestore = item.sourceType === "text" || (Boolean(state.apiBaseUrl) && Boolean(item.sourcePath));
    const restoreLabel = item.sourceType === "book" ? "Restore book" : "Restore text";
    card.innerHTML = `
      <div class="archive-item-top">
        <span class="pill">${escapeHtml(item.sourceType === "book" ? "Book" : "Text")}</span>
        <span class="muted">${escapeHtml(formatLocalDate(item.archivedAt))}</span>
      </div>
      <div class="archive-item-meta">
        <strong class="archive-item-title">${escapeHtml(item.title)}</strong>
        ${item.subtitle ? `<span class="muted">${escapeHtml(item.subtitle)}</span>` : ""}
      </div>
      ${item.details ? `<p class="archive-item-body">${escapeHtml(item.details)}</p>` : ""}
      <div class="archive-item-actions">
        <span class="small-copy">${escapeHtml(item.kind)}</span>
        <div class="archive-action-row">
          <button class="button button-secondary button-compact archive-restore" type="button"${canRestore ? "" : " disabled"}>${escapeHtml(restoreLabel)}</button>
          <button class="button button-secondary button-compact archive-delete" type="button">Delete forever</button>
        </div>
      </div>
    `;
    card.querySelector(".archive-restore")?.addEventListener("click", () => void restoreArchivedItem(item.id));
    card.querySelector(".archive-delete")?.addEventListener("click", () => deleteArchivedItem(item.id));
    elements.archiveList.appendChild(card);
  }
}

function updateModeChrome() {
  if (state.apiBaseUrl) {
    elements.modeBadge.textContent = "Live";
  } else {
    elements.modeBadge.textContent = "Demo";
  }

  elements.uploadButton.disabled = Boolean(state.busy || state.uploadProgress?.active || !state.apiBaseUrl);
}

function setTheme(theme) {
  const resolved = resolveTheme(theme);
  state.theme = resolved;
  window.localStorage.setItem(themeStorageKey, resolved);
  applyTheme(resolved);
  renderOptions();
}

function applyTheme(theme) {
  document.body.dataset.theme = resolveTheme(theme);
}

function setBusy(value) {
  state.busy = value;
  elements.uploadButton.disabled = value || state.uploadProgress?.active || !state.apiBaseUrl;
  elements.ocrModeToggle?.querySelectorAll("[data-ocr-provider]").forEach((button) => {
    button.disabled = value;
  });
  elements.saveProcessorUrl.disabled = value;
  elements.connectProcessor.disabled = value;
  elements.saveWakeHelperUrl.disabled = value;
  elements.wakeProcessor.disabled = value;
  elements.homeReconnect.disabled = value;
  elements.homeWake.disabled = value;
  elements.extractNow.disabled = value;
  elements.vocabSearchButton.disabled = value;
}

function setActiveView(view, options = {}) {
  const resolved = viewNames.has(view) ? view : defaultView;
  state.activeView = resolved;
  if (resolved !== "reader" && state.readerOptionsOpen) {
    state.readerOptionsOpen = false;
    renderReaderOptionsMenu();
  }
  if (options.syncHash !== false && window.location.hash !== `#${resolved}`) {
    window.location.hash = resolved;
  }
  renderNavigation();
  renderViews();
}

function resolveView(hash) {
  const value = hash.replace(/^#/, "").trim().toLowerCase();
  return viewNames.has(value) ? value : defaultView;
}

function resolveTheme(value) {
  return themeNames.has(value) ? value : defaultTheme;
}

function resolveOcrProvider(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "openai" || normalized === "local") {
    return normalized;
  }
  return defaultOcrProvider;
}

function themeLabel(theme) {
  switch (resolveTheme(theme)) {
    case "slate":
      return "Slate";
    case "night":
      return "Night";
    case "midnight":
      return "Midnight";
    case "sunset":
      return "Sunset";
    case "mint":
      return "Mint";
    case "paper":
    default:
      return "Paper";
  }
}

function formatStatusDate(value) {
  if (!value) {
    return "never";
  }
  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

async function requestJson(pathname, options = {}) {
  if (!state.apiBaseUrl) {
    return demoRequest(pathname, options);
  }

  const url = new URL(pathname, ensureTrailingSlash(state.apiBaseUrl));
  assertProcessorUrlAllowed(url.toString());
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutId = controller ? window.setTimeout(() => controller.abort(), requestTimeoutMs) : null;

  try {
    const response = await fetch(url.toString(), {
      cache: "no-store",
      ...options,
      signal: controller?.signal,
      headers: {
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status}) for ${pathname}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Request timed out after ${requestTimeoutMs / 1000} seconds for ${pathname}`);
    }
    throw error;
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
}

function formatBytes(bytes) {
  const size = Number(bytes) || 0;
  if (size <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  let value = size;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`;
}

function readXhrErrorMessage(xhr, fallbackMessage) {
  const raw = String(xhr?.responseText ?? "").trim();
  if (!raw) {
    return fallbackMessage;
  }

  try {
    const body = JSON.parse(raw);
    if (typeof body === "string" && body.trim()) {
      return body.trim();
    }
    if (body && typeof body === "object") {
      if (typeof body.detail === "string" && body.detail.trim()) {
        return body.detail.trim();
      }
      if (body.detail && typeof body.detail === "object" && typeof body.detail.message === "string" && body.detail.message.trim()) {
        return body.detail.message.trim();
      }
      if (typeof body.message === "string" && body.message.trim()) {
        return body.message.trim();
      }
    }
  } catch {
    if (raw) {
      return raw;
    }
  }

  return fallbackMessage;
}

function uploadFormData(pathname, formData, onProgress) {
  if (!state.apiBaseUrl) {
    return Promise.reject(new Error("Upload is disabled in demo mode."));
  }

  return new Promise((resolve, reject) => {
    const url = new URL(pathname, ensureTrailingSlash(state.apiBaseUrl));
    try {
      assertProcessorUrlAllowed(url.toString());
    } catch (error) {
      reject(error);
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url.toString(), true);
    xhr.responseType = "text";
    xhr.timeout = uploadTimeoutMs;
    xhr.upload.onprogress = (event) => {
      onProgress?.(event);
    };
    xhr.upload.onload = () => {
      onProgress?.({
        lengthComputable: true,
        loaded: 1,
        total: 1,
        uploadComplete: true,
      });
    };
    xhr.onload = () => {
      const responseText = String(xhr.responseText ?? "").trim();
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(readXhrErrorMessage(xhr, `Upload failed (${xhr.status})`)));
        return;
      }

      if (!responseText) {
        resolve(null);
        return;
      }

      try {
        resolve(JSON.parse(responseText));
      } catch {
        resolve(responseText);
      }
    };
    xhr.onerror = () => {
      reject(new Error("Upload failed. Check the processor URL and try again."));
    };
    xhr.ontimeout = () => {
      reject(new Error(`Upload timed out after ${Math.round(uploadTimeoutMs / 60000)} minutes while the processor was still handling the PDF.`));
    };
    xhr.send(formData);
  });
}

async function lookupVocabulary(term) {
  const normalized = term.trim();
  if (!normalized) {
    state.vocabError = "Enter a search term.";
    state.vocabLookup = null;
    renderVocabularyPanel();
    return;
  }

  const book = state.pageData?.book ?? state.books[0] ?? null;
  const languageCode = book?.language_code ?? "zh";

  try {
    setBusy(true);
    state.vocabLookup = await requestJson(
      `/lexicon/lookup?language_code=${encodeURIComponent(languageCode)}&term=${encodeURIComponent(normalized)}`,
    );
    state.vocabError = null;
  } catch (error) {
    state.vocabLookup = null;
    state.vocabError = error instanceof Error ? error.message : "Vocabulary lookup failed.";
  } finally {
    setBusy(false);
    renderVocabularyPanel();
  }
}

function demoRequest(pathname, options = {}) {
  const method = (options.method ?? "GET").toUpperCase();
  const demoBookId = DEMO_BOOKS[0].id;
  const pageMatch = pathname.match(new RegExp(`^/books/${demoBookId}/pages/(\\d+)$`));

  if (method === "GET" && pathname === "/books") {
    return Promise.resolve(DEMO_BOOKS.slice());
  }
  if (method === "GET" && pageMatch) {
    const pageNumber = Number(pageMatch[1]);
    return Promise.resolve(cloneDemoPage(pageNumber));
  }
  if (method === "GET" && pathname === `/books/${demoBookId}/extractions`) {
    return Promise.resolve(DEMO_PAGE.extraction.page);
  }
  if (method === "GET" && pathname.startsWith("/lexicon/lookup")) {
    const url = new URL(`https://demo.local${pathname}`);
    const term = url.searchParams.get("term") ?? "";
    return Promise.resolve({
      query: term,
      language_code: url.searchParams.get("language_code") ?? "zh",
      entries: DEMO_LEXICON[term] ?? [],
    });
  }
  if (method === "POST" && pathname.endsWith("/extract")) {
    return Promise.resolve({
      status: "queued",
      extraction_path: "/demo/extractions/demo-three-body.json",
    });
  }
  if (method === "POST" && pathname === "/books/upload") {
    return Promise.resolve(DEMO_BOOKS[0]);
  }

  throw new Error(`Demo mode does not provide ${pathname}`);
}

function normalizeBaseUrl(value) {
  return value.trim().replace(/\/+$/, "");
}

function renderReaderOptionsMenu(page = undefined, localEntry = undefined) {
  if (!elements.readerOptionsButton || !elements.readerOptionsMenu || !elements.archiveCurrentItem || !elements.deleteCurrentItem) {
    return;
  }

  const activeLocalEntry = localEntry === undefined
    ? (state.localEntries.find((item) => item.id === state.localReaderEntryId) ?? null)
    : localEntry;
  const activePage = page === undefined
    ? (activeLocalEntry ? null : state.pageData?.extraction?.page ?? null)
    : page;
  const hasCurrentItem = Boolean(activePage || activeLocalEntry);

  const archiveLabel = activeLocalEntry ? "Archive text" : "Archive book";
  const deleteLabel = activeLocalEntry ? "Delete text" : "Delete book";
  elements.readerOptionsButton.disabled = !hasCurrentItem || Boolean(state.busy);
  elements.readerOptionsButton.setAttribute("aria-expanded", String(state.readerOptionsOpen && hasCurrentItem));
  elements.readerOptionsMenu.classList.toggle("is-hidden", !state.readerOptionsOpen || !hasCurrentItem);
  elements.archiveCurrentItem.textContent = archiveLabel;
  elements.deleteCurrentItem.textContent = deleteLabel;
  elements.archiveCurrentItem.disabled = !hasCurrentItem || Boolean(state.busy);
  elements.deleteCurrentItem.disabled = !hasCurrentItem || Boolean(state.busy);
}

async function archiveCurrentReaderItem() {
  const localEntry = state.localEntries.find((item) => item.id === state.localReaderEntryId) ?? null;
  const book = localEntry ? null : state.pageData?.book ?? null;

  state.readerOptionsOpen = false;
  renderReaderOptionsMenu(book ? state.pageData?.extraction?.page ?? null : null, localEntry);

  if (localEntry) {
    archiveLocalEntry(localEntry);
    return;
  }

  if (book) {
    await archiveRemoteBook(book);
  }
}

async function deleteCurrentReaderItem() {
  const localEntry = state.localEntries.find((item) => item.id === state.localReaderEntryId) ?? null;
  const book = localEntry ? null : state.pageData?.book ?? null;
  const label = localEntry?.title ?? book?.title ?? "this item";

  if (!window.confirm(`Delete "${label}" forever? This cannot be undone.`)) {
    return;
  }

  state.readerOptionsOpen = false;
  renderReaderOptionsMenu(book ? state.pageData?.extraction?.page ?? null : null, localEntry);

  if (localEntry) {
    deleteLocalEntry(localEntry);
    return;
  }

  if (book) {
    await deleteRemoteBook(book);
  }
}

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function parseUrl(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
}

function getProcessorUrlBlockReason(baseUrl) {
  const resolved = parseUrl(baseUrl);
  if (!resolved) {
    return "";
  }

  if (window.location.protocol === "https:" && resolved.protocol === "http:") {
    return "GitHub Pages is served over HTTPS, so this browser blocks HTTP processor URLs. Use an HTTPS API or test from the local site host.";
  }

  return "";
}

function assertProcessorUrlAllowed(baseUrl) {
  const reason = getProcessorUrlBlockReason(baseUrl);
  if (reason) {
    throw new Error(reason);
  }
}

function resolveResourceUrl(resourceUrl) {
  const value = String(resourceUrl ?? "").trim();
  if (!value) {
    return "";
  }
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }
  if (!state.apiBaseUrl) {
    return value;
  }
  try {
    return new URL(value, ensureTrailingSlash(state.apiBaseUrl)).toString();
  } catch {
    return value;
  }
}

function isCjk(value) {
  return /[\u3400-\u4dbf\u4e00-\u9fff]/.test(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function lookupDemoLexicon(term) {
  return {
    query: term,
    language_code: "zh",
    entries: DEMO_LEXICON[term] ?? [],
  };
}

function buildLocalLexiconFallback(token, languageCode, entry = null) {
  const surfaceForm = String(token?.surface_form ?? "").trim();
  const pinyin = String(token?.romanization ?? token?.pronunciation ?? "").trim();
  const definition =
    String(token?.definition_short ?? "").trim() ||
    (entry ? `Seen ${entry.frequency_in_book} times in this book.` : "") ||
    "No dictionary entry found in imported lexicon.";
  const hskLevel = token?.proficiency_level ?? token?.hsk_level ?? null;

  return {
    query: surfaceForm,
    language_code: String(languageCode ?? "zh"),
    entries: [
      {
        id: 0,
        language_code: String(languageCode ?? "zh"),
        entry_type: "word",
        surface_form: surfaceForm,
        pinyin: pinyin || null,
        tone: null,
        definition,
        radical: null,
        stroke_count: null,
        hsk_level: hskLevel ?? null,
        frequency_rank: null,
        note: null,
        source_name: "local-book",
        source_path: "local-book",
      },
    ],
  };
}

function cloneDemoPage(pageNumber) {
  return {
    ...DEMO_PAGE,
    page: {
      ...DEMO_PAGE.page,
      page_number: pageNumber,
    },
    extraction: {
      ...DEMO_PAGE.extraction,
      page: {
        ...DEMO_PAGE.extraction.page,
        page_number: pageNumber,
      },
    },
  };
}


