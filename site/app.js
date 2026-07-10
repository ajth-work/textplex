import { DEMO_BOOKS, DEMO_LEXICON, DEMO_PAGE } from "./demo-data.js";

const storageKey = "textplex.processorBaseUrl";
const defaultView = "home";
const viewNames = new Set(["home", "library", "reader", "tools"]);

const elements = {
  navLinks: Array.from(document.querySelectorAll("[data-nav]")),
  viewSections: Array.from(document.querySelectorAll("[data-view]")),
  modeBadge: document.getElementById("modeBadge"),
  connectionState: document.getElementById("connectionState"),
  connectionHint: document.getElementById("connectionHint"),
  processorUrl: document.getElementById("processorUrl"),
  saveProcessorUrl: document.getElementById("saveProcessorUrl"),
  connectProcessor: document.getElementById("connectProcessor"),
  uploadForm: document.getElementById("uploadForm"),
  bookTitle: document.getElementById("bookTitle"),
  pdfFile: document.getElementById("pdfFile"),
  uploadButton: document.getElementById("uploadButton"),
  bookCount: document.getElementById("bookCount"),
  homeBookCount: document.getElementById("homeBookCount"),
  homePageCount: document.getElementById("homePageCount"),
  libraryStatus: document.getElementById("libraryStatus"),
  bookList: document.getElementById("bookList"),
  readerTitle: document.getElementById("readerTitle"),
  readerMeta: document.getElementById("readerMeta"),
  readerEmpty: document.getElementById("readerEmpty"),
  readerBody: document.getElementById("readerBody"),
  readerText: document.getElementById("readerText"),
  readerNotice: document.getElementById("readerNotice"),
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
  books: [],
  selectedBookId: null,
  selectedPageNumber: 1,
  pageData: null,
  selectedToken: null,
  selectedBookEntry: null,
  lexicon: null,
  vocabLookup: null,
  vocabError: null,
  showImage: false,
  busy: false,
  error: null,
  pageError: null,
  activeView: resolveView(window.location.hash),
};

elements.processorUrl.value = state.apiBaseUrl;
bindEvents();
void boot();

function bindEvents() {
  elements.saveProcessorUrl.addEventListener("click", saveProcessorUrl);
  elements.connectProcessor.addEventListener("click", connectProcessor);
  elements.uploadForm.addEventListener("submit", handleUpload);
  elements.vocabForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void lookupVocabulary(elements.vocabTerm.value.trim());
  });
  elements.toggleImage.addEventListener("click", () => {
    state.showImage = !state.showImage;
    renderReader();
  });
  elements.extractNow.addEventListener("click", () => void extractSelectedBook());
  elements.prevPage.addEventListener("click", () => void movePage(-1));
  elements.nextPage.addEventListener("click", () => void movePage(1));
  elements.navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const view = resolveView(link.getAttribute("href") ?? "");
      setActiveView(view);
    });
  });
  window.addEventListener("hashchange", () => {
    setActiveView(resolveView(window.location.hash), { syncHash: false });
  });
}

async function boot() {
  setActiveView(state.activeView, { syncHash: false });
  await connectFromCurrentValue();
}

async function saveProcessorUrl() {
  state.apiBaseUrl = normalizeBaseUrl(elements.processorUrl.value);
  window.localStorage.setItem(storageKey, state.apiBaseUrl);
  await connectFromCurrentValue();
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
  state.selectedToken = null;
  state.selectedBookEntry = null;
  state.lexicon = null;
  state.vocabLookup = null;
  state.vocabError = null;
  state.selectedBookId = null;
  state.selectedPageNumber = 1;

  updateModeChrome();

  if (!state.apiBaseUrl) {
    state.books = DEMO_BOOKS.slice();
    state.selectedBookId = DEMO_BOOKS[0]?.id ?? null;
    state.pageData = DEMO_PAGE;
    elements.connectionState.textContent = "Demo mode";
    elements.connectionState.className = "pill";
    elements.connectionHint.textContent = "Enter a processor URL to switch from the demo book to a live processor.";
    elements.libraryStatus.textContent = "Showing the built-in demo book.";
    renderAll();
    return;
  }

  try {
    await loadBooks();
    elements.connectionState.textContent = "Connected";
    elements.connectionState.className = "pill pill-warn";
    elements.connectionHint.textContent = forceRemote
      ? "Connected to the processor. Uploads and page loads will now hit the remote API."
      : "Processor URL loaded from browser storage.";
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Unable to connect.";
    elements.connectionState.textContent = "Offline";
    elements.connectionState.className = "pill pill-warn";
    elements.connectionHint.textContent = "The remote processor could not be reached. Check the URL and CORS settings.";
  }

  renderAll();
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

async function loadReader(bookId, pageNumber) {
  state.selectedBookId = bookId;
  state.selectedPageNumber = pageNumber;
  state.pageError = null;
  state.selectedToken = null;
  state.selectedBookEntry = null;
  state.lexicon = null;
  try {
    state.pageData = await requestJson(`/books/${encodeURIComponent(bookId)}/pages/${pageNumber}`);
    setActiveView("reader");
    renderAll();
  } catch (error) {
    state.pageError = error instanceof Error ? error.message : "Unable to load reader page.";
    state.pageData = null;
    renderAll();
  }
}

async function movePage(delta) {
  if (!state.pageData?.book) {
    return;
  }
  const nextPage = Math.min(Math.max(1, state.selectedPageNumber + delta), state.pageData.book.total_pages);
  if (nextPage === state.selectedPageNumber) {
    return;
  }
  await loadReader(state.selectedBookId, nextPage);
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
    setActiveView("tools");
    renderReader();
    renderVocabularyPanel();
    return;
  }

  try {
    state.lexicon = await requestJson(
      `/lexicon/lookup?language_code=${encodeURIComponent(book.language_code)}&term=${encodeURIComponent(token.surface_form)}`,
    );
    state.vocabLookup = state.lexicon;
    state.vocabError = null;
  } catch {
    state.lexicon = null;
    state.vocabLookup = null;
    state.vocabError = "No vocabulary match returned.";
  }
  setActiveView("tools");
  renderReader();
  renderVocabularyPanel();
}

function renderAll() {
  updateModeChrome();
  renderBooks();
  renderReader();
  renderState();
  renderNavigation();
  renderViews();
  renderHome();
  renderVocabularyPanel();
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
    node.querySelector(".book-pages").textContent = String(book.total_pages);
    node.querySelector(".book-prepared").textContent = String(book.page_image_count);
    node.querySelector(".book-extracted").textContent = String(book.extracted_page_count);

    const openButton = node.querySelector(".book-open");
    openButton.addEventListener("click", () => void loadReader(book.id, 1));

    elements.bookList.appendChild(node);
  }
}

function renderHome() {
  elements.homeBookCount.textContent = String(state.books.length);
  elements.homePageCount.textContent = String(state.pageData?.book?.total_pages ?? state.books[0]?.total_pages ?? 0);
}

function renderReader() {
  const page = state.pageData?.extraction?.page ?? null;
  const book = state.pageData?.book ?? null;

  elements.readerEmpty.classList.toggle("is-hidden", Boolean(page));
  elements.readerBody.classList.toggle("is-hidden", !page);
  elements.readerTitle.textContent = book?.title ?? "Select a book";
  elements.readerMeta.textContent = "";
  elements.toggleImage.textContent = state.showImage ? "Hide page image" : "Show page image";
  elements.pageImageWrap.classList.toggle("is-hidden", !state.showImage || !page);
  elements.pageImage.src = state.pageData?.image_url ?? "";
  elements.prevPage.disabled = !book || state.selectedPageNumber <= 1;
  elements.nextPage.disabled = !book || state.selectedPageNumber >= (book?.total_pages ?? 1);
  elements.extractNow.disabled = !state.selectedBookId || Boolean(state.busy);

  renderMetrics(book);
  renderTokenPanel(page);

  elements.readerText.replaceChildren();

  if (!page) {
    elements.readerNotice.style.display = "none";
    return;
  }

  if (state.pageError) {
    elements.readerNotice.style.display = "block";
    elements.readerNotice.textContent = state.pageError;
  } else if (!page.sentences?.length) {
    elements.readerNotice.style.display = "block";
    elements.readerNotice.textContent = "This page image is ready, but the structured extraction summary has not been generated yet.";
  } else {
    elements.readerNotice.style.display = "none";
  }

  if (page.sentences?.length) {
    for (const sentence of page.sentences) {
      const block = document.createElement("p");
      block.className = "sentence-block";
      block.setAttribute("aria-label", `Sentence ${sentence.order}`);
      for (const token of sentence.tokens) {
        const span = document.createElement("span");
        span.className = `token-inline ${isCjk(token.surface_form) ? "is-cjk" : "is-word"}`;
        span.textContent = token.surface_form;
        span.role = "button";
        span.tabIndex = 0;
        span.addEventListener("click", () => void inspectToken(token));
        span.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            void inspectToken(token);
          }
        });
        block.appendChild(span);
      }
      elements.readerText.appendChild(block);
    }
  }
}

function renderTokenPanel(page) {
  const token = state.selectedToken;
  const entry = state.selectedBookEntry;
  const lexiconEntry = state.lexicon?.entries?.[0] ?? null;

  if (!token) {
    elements.tokenPanel.innerHTML = `
      <p class="small-copy">Tap a character or word in the reader to load a dictionary-style definition panel here.</p>
      <p class="small-copy">The processor can keep the page visible while the lookup stays in a separate layer.</p>
    `;
  } else {
    elements.tokenPanel.innerHTML = `
      <div class="token-panel-header">
        <span class="eyebrow">Lookup</span>
        <button id="closeTokenPanel" class="icon-button" type="button" aria-label="Close definition">×</button>
      </div>
      <h3>${escapeHtml(token.surface_form)}</h3>
      <p class="small-copy">${escapeHtml(lexiconEntry?.definition ?? token.definition_short ?? entry?.lemma ?? "No definition returned yet.")}</p>
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
      setActiveView("reader");
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

function updateModeChrome() {
  if (state.apiBaseUrl) {
    elements.modeBadge.textContent = "Live";
  } else {
    elements.modeBadge.textContent = "Demo";
  }

  elements.uploadButton.disabled = Boolean(state.busy || !state.apiBaseUrl);
}

function setBusy(value) {
  state.busy = value;
  elements.uploadButton.disabled = value || !state.apiBaseUrl;
  elements.saveProcessorUrl.disabled = value;
  elements.connectProcessor.disabled = value;
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
