import { DEMO_BOOKS, DEMO_LEXICON, DEMO_PAGE } from "./demo-data.js";

const storageKey = "textplex.processorBaseUrl";
const wakeHelperStorageKey = "textplex.processorWakeHelperUrl";
const themeStorageKey = "textplex.theme";
const localEntriesStorageKey = "textplex.localTextEntries";
const defaultView = "home";
const defaultTheme = "paper";
const defaultEntryKind = "book";
const entryKinds = new Set(["book", "article"]);
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
  bookCount: document.getElementById("bookCount"),
  homeBookCount: document.getElementById("homeBookCount"),
  homePageCount: document.getElementById("homePageCount"),
  homeProcessorState: document.getElementById("homeProcessorState"),
  homeProcessorSummary: document.getElementById("homeProcessorSummary"),
  homeProcessorCheck: document.getElementById("homeProcessorCheck"),
  homeReconnect: document.getElementById("homeReconnect"),
  homeWake: document.getElementById("homeWake"),
  libraryStatus: document.getElementById("libraryStatus"),
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
  extractNow: document.getElementById("extractNow"),
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
  theme: resolveTheme(window.localStorage.getItem(themeStorageKey) ?? defaultTheme),
  books: [],
  localEntries: loadLocalEntries(),
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
  busy: false,
  error: null,
  pageError: null,
  activeView: resolveView(window.location.hash),
  draftEntryKind: defaultEntryKind,
  draftEntryTags: [],
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
  elements.readerBack.addEventListener("click", () => setActiveView("library"));
  elements.extractNow.addEventListener("click", () => void extractSelectedBook());
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
}

async function boot() {
  applyTheme(state.theme);
  renderLibraryComposer();
  setActiveView(state.activeView, { syncHash: false });
  await connectFromCurrentValue();
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

function saveLocalEntries() {
  window.localStorage.setItem(localEntriesStorageKey, JSON.stringify(state.localEntries));
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
  } catch {
    setProcessorConnectionState(false, "Could not reach the remote processor.");
    return false;
  }
}

async function wakeProcessorHelper() {
  if (!state.wakeHelperUrl) {
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

async function loadBooks() {
  elements.libraryStatus.textContent = "Loading library...";
  state.books = await requestJson("/books");
  elements.bookCount.textContent = String(state.books.length);
  elements.libraryStatus.textContent = state.books.length ? "Select a book to open the reader." : "No imported books were returned by the processor.";

  if (state.books[0]) {
    await loadReader(state.books[0].id, 1);
  } else {
    state.pageData = null;
    state.selectedBookId = null;
  }
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

  try {
    setBusy(true);
    elements.libraryStatus.textContent = "Uploading and registering the scan...";
    await requestJson("/books/upload", { method: "POST", body: formData, isFormData: true });
    await loadBooks();
    setActiveView("library");
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Unable to upload the PDF.";
    renderAll();
  } finally {
    setBusy(false);
  }
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

  if (!state.apiBaseUrl) {
    state.lexicon = lookupDemoLexicon(token.surface_form);
    state.vocabLookup = state.lexicon;
    renderReader();
    return;
  }

  try {
    state.lexicon = await requestJson(
      `/lexicon/lookup?language_code=${encodeURIComponent(book.language_code)}&term=${encodeURIComponent(token.surface_form)}`,
    );
    state.vocabError = null;
  } catch {
    state.lexicon = null;
  }
  renderReader();
}

async function inspectLocalToken(token, localEntry) {
  if (!localEntry || !token) {
    return;
  }

  state.selectedToken = token;
  state.selectedBookEntry = null;
  elements.vocabTerm.value = token.surface_form;

  if (!state.apiBaseUrl) {
    state.lexicon = lookupDemoLexicon(token.surface_form);
    state.vocabLookup = state.lexicon;
    renderReader();
    return;
  }

  try {
    state.lexicon = await requestJson(
      `/lexicon/lookup?language_code=${encodeURIComponent(getLocalEntryLanguageCode(localEntry))}&term=${encodeURIComponent(token.surface_form)}`,
    );
    state.vocabError = null;
  } catch {
    state.lexicon = null;
  }
  renderReader();
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
}

function renderBooks() {
  elements.bookCount.textContent = String(state.books.length);
  elements.bookList.replaceChildren();

  for (const book of state.books) {
    const node = elements.bookCardTemplate.content.cloneNode(true);
    node.querySelector(".pill").textContent = book.language_code.toUpperCase();
    node.querySelector(".book-status").textContent = book.status.replaceAll("_", " ");
    node.querySelector(".book-title").textContent = book.title;
    node.querySelector(".book-author").textContent = book.author ?? "Unknown author";
    const bookTags = node.querySelector(".book-tags");
    if (bookTags) {
      bookTags.replaceChildren();
      const chip = document.createElement("span");
      chip.className = "tag-chip tag-chip-primary";
      chip.textContent = "book";
      bookTags.appendChild(chip);
    }
    node.querySelector(".book-pages").textContent = String(book.total_pages);
    node.querySelector(".book-prepared").textContent = String(book.page_image_count);
    node.querySelector(".book-extracted").textContent = String(book.extracted_page_count);

    const openButton = node.querySelector(".book-open");
    openButton.addEventListener("click", () => void loadReader(book.id, 1));

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
    node.querySelector(".text-entry-sentence-count").textContent = `${sentences.length} sentences`;

    const tagsWrap = node.querySelector(".text-entry-tags");
    const primaryTag = tags[0] ?? kind;
    const extraTags = tags.slice(1);

    const primaryChip = document.createElement("span");
    primaryChip.className = "tag-chip tag-chip-primary";
    primaryChip.textContent = primaryTag;
    tagsWrap.appendChild(primaryChip);

    for (const tag of extraTags) {
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
                tags: (item.tags ?? []).filter((currentTag) => currentTag === primaryTag || currentTag !== tag),
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

  elements.readerEmpty.classList.toggle("is-hidden", Boolean(page || localEntry));
  elements.readerBody.classList.toggle("is-hidden", !(page || localEntry));
  elements.readerTitle.textContent = localEntry?.title ?? book?.title ?? "Select a book";
  elements.readerAuthor.textContent = localEntry ? `Local text · ${localEntry.kind}` : book?.author ?? "Pick a book from the library.";
  elements.readerProgress.textContent = page || localEntry ? `${localEntry ? "TXT" : `P${state.selectedPageNumber}`} | S${currentSentence ? currentSentenceNumber : 0}/${currentSentenceCount || 0}` : "P1 | S1/1";
  elements.toggleImage.classList.toggle("is-active", state.showImage);
  elements.toggleImage.setAttribute("aria-label", state.showImage ? "Hide page image" : "Show page image");
  elements.toggleImage.title = state.showImage ? "Hide page image" : "Show page image";
  elements.pageImageWrap.classList.toggle("is-hidden", !state.showImage || !page);
  elements.pageImage.src = resolveResourceUrl(state.pageData?.image_url ?? "");

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

      const localSentenceTokens = getSentenceTokens(currentSentence);
      if (localSentenceTokens.length) {
        const chineseRow = document.createElement("div");
        chineseRow.className = "sentence-chinese";
        for (const token of localSentenceTokens) {
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

      for (const token of currentSentence.tokens) {
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
        <p class="reader-translation-label">Translation</p>
        <p class="reader-translation-text">${escapeHtml(currentSentence.translation ?? "Translation will appear here once the processor returns it.")}</p>
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
          <p class="token-lookup-definition">${escapeHtml(lexiconEntry?.definition ?? token.definition_short ?? "No definition returned yet.")}</p>
        </div>
        <dl class="definition-grid">
          <div><dt>Lemma</dt><dd>${escapeHtml(lexiconEntry?.surface_form ?? token.lemma ?? token.surface_form)}</dd></div>
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
        <p class="token-lookup-definition">${escapeHtml(lexiconEntry?.definition ?? token.definition_short ?? entry?.lemma ?? "No definition returned yet.")}</p>
      </div>
      <dl class="definition-grid">
        <div><dt>Lemma</dt><dd>${escapeHtml(lexiconEntry?.surface_form ?? token.lemma ?? token.surface_form)}</dd></div>
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
}

function updateModeChrome() {
  if (state.apiBaseUrl) {
    elements.modeBadge.textContent = "Live";
  } else {
    elements.modeBadge.textContent = "Demo";
  }

  elements.uploadButton.disabled = Boolean(state.busy || !state.apiBaseUrl);
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
  elements.uploadButton.disabled = value || !state.apiBaseUrl;
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
  const response = await fetch(url.toString(), {
    cache: "no-store",
    ...options,
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

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
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


