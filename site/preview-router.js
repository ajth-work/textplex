const currentFile = window.location.pathname.split("/").pop() || "index.html";
const previewData = window.TextPlexPreview ?? null;

const routes = {
  index: "./index.html",
  home: "./home-preview.html",
  library: "./library-preview.html",
  libraryDetail: "./library-detail-preview.html",
  reader: "./reader-preview.html",
  analysis: "./analysis-preview.html",
  import: "./import-preview.html",
  search: "./search-preview.html",
  progress: "./progress-preview.html",
  profile: "./profile-preview.html",
  study: "./study-preview.html",
  activity: "./activity-preview.html",
  vocabulary: "./vocabulary-preview.html",
};
const uploadTimeoutMs = 20 * 60 * 1000;
const importSessionKey = "textplex.preview.importSession";

const toast = createToast();

const ready = boot();

async function boot() {
  const previewReady = previewData?.ready ?? Promise.resolve();
  void previewReady.catch((error) => {
    console.warn("[TextPlexPreviewRouter] Preview hydration skipped:", error);
  });
  bindNavigationButtons();
  bindTextActions();
  bindPageSpecificActions();
}

function bindNavigationButtons() {
  const fallback = resolveBackTarget();

  document.querySelectorAll('button[aria-label="Back"], button[aria-label="Close"]').forEach((button) => {
    button.addEventListener("click", () => {
      navigateTo(fallback);
    });
  });

  document
    .querySelectorAll(
      'button[aria-label="Share"], button[aria-label="More options"], button[aria-label="More actions"], button[aria-label="Favorite"], button[aria-label="Settings"], button[aria-label="Filter"], button[aria-label="Bookmark"], button[aria-label="Text size"], button[aria-label="Calendar"], button[aria-label="Info"], button[aria-label="Add word"], button[aria-label="Add"], button[aria-label="Search"]',
    )
    .forEach((button) => {
      button.addEventListener("click", () => {
        const label = button.getAttribute("aria-label");

        if (currentFile === "reader-preview.html" && (label === "More options" || label === "More actions")) {
          return;
        }

        if (label === "Bookmark") {
          button.classList.toggle("is-active");
          toast(button.classList.contains("is-active") ? "Bookmarked" : "Bookmark cleared");
          return;
        }

        if (label === "Search") {
          navigateTo(resolveTargetUrl(routes.search));
          return;
        }

        if (label === "Add") {
          navigateTo(resolveTargetUrl(routes.import));
          return;
        }

        toast(`${label} is preview-only.`);
      });
    });
}

function bindTextActions() {
  const textButtons = Array.from(document.querySelectorAll("button, a"));
  for (const control of textButtons) {
    const label = normalizeText(control.textContent);
    if (!label) {
      continue;
    }

    const navTarget = {
      home: routes.home,
      library: routes.library,
      reader: routes.reader,
      analysis: routes.analysis,
      import: routes.import,
      add: routes.import,
      insights: routes.vocabulary,
      vocabulary: routes.vocabulary,
      progress: routes.progress,
      profile: routes.profile,
      study: routes.study,
      activity: routes.activity,
      search: routes.search,
    }[label];

    if (navTarget) {
      control.addEventListener("click", (event) => {
        event.preventDefault();
        navigateTo(resolveTargetUrl(navTarget));
      });
    }

    if (label === "open reader" || label === "read") {
      control.addEventListener("click", (event) => {
        event.preventDefault();
        navigateTo(resolveTargetUrl(routes.reader));
      });
    }

    if (label === "view full analysis" || label === "view analysis") {
      control.addEventListener("click", (event) => {
        event.preventDefault();
        navigateTo(resolveTargetUrl(routes.analysis));
      });
    }

    if (label === "study words") {
      control.addEventListener("click", (event) => {
        event.preventDefault();
        navigateTo(resolveTargetUrl(routes.study));
      });
    }

    if (currentFile === "import-preview.html" && (label === "paste text" || label === "upload file" || label === "add from url")) {
      control.addEventListener("click", (event) => {
        event.preventDefault();
        const kind = label === "upload file" ? "book" : "article";
        const record = previewData?.createImportedRecord?.(kind, createImportTemplate(kind, label));
        if (record) {
          navigateTo(`${routes.reader}?book=${encodeURIComponent(record.id)}`);
        }
      });
    }

    if (currentFile === "import-preview.html" && label === "manual vocabulary item") {
      control.addEventListener("click", (event) => {
        event.preventDefault();
        navigateTo(resolveTargetUrl(routes.vocabulary));
      });
    }

    if (label === "open preview") {
      control.addEventListener("click", (event) => {
        event.preventDefault();
        toast("Open the preview from the landing page cards.");
      });
    }

    if (label === "see all") {
      control.addEventListener("click", (event) => {
        event.preventDefault();
        toast("The preview pages are driven by seeded local records.");
      });
    }

    if (label === "set goal") {
      control.addEventListener("click", () => {
        toast("Goal setup is preview-only.");
      });
    }

    if (label === "save to vocabulary") {
      control.addEventListener("click", () => {
        toast("Saved to the preview vocabulary list.");
      });
    }

    if (label === "again" || label === "hard" || label === "good") {
      control.addEventListener("click", () => {
        toast(`${capitalize(label)} logged in the study preview.`);
      });
    }

    if (label === "filter" && currentFile === "activity-preview.html") {
      control.addEventListener("click", () => {
        toast("Filter controls are not wired in the static preview.");
      });
    }

    if (label === "filter" && currentFile === "search-preview.html") {
      control.addEventListener("click", () => {
        toast("Search filters are preview-only.");
      });
    }
  }
}

function bindPageSpecificActions() {
  if (currentFile === "home-preview.html") {
    wireHomePreview();
  }

  if (currentFile === "library-preview.html") {
    wireLibraryPreview();
  }

  if (currentFile === "reader-preview.html") {
    wireReaderPreview();
  }

  if (currentFile === "library-detail-preview.html") {
    wireLibraryDetailPreview();
  }

  if (currentFile === "search-preview.html") {
    wireSearchPreview();
  }

  if (currentFile === "analysis-preview.html") {
    wireAnalysisPreview();
  }

  if (currentFile === "import-preview.html") {
    wireImportPreview();
  }

  if (currentFile === "profile-preview.html") {
    wireProfilePreview();
  }

  if (currentFile === "vocabulary-preview.html") {
    wireVocabularyPreview();
  }
}

function wireHomePreview() {
  const preview = previewData?.getHomePreviewData?.();
  if (!preview) {
    return;
  }

  const continueRail = document.getElementById("continueRail");
  const analysisList = document.getElementById("analysisList");
  const searchInput = document.querySelector('.search input');
  const emptyState = document.querySelector(".empty-state");

  if (continueRail) {
    continueRail.innerHTML = preview.continueItems
      .map(
        (item) => `
            <article class="continue-card interactive-card" tabindex="0" role="link" data-book-id="${escapeHtml(item.id)}" data-href="${escapeHtml(resolveTargetUrl(`${routes.reader}?book=${encodeURIComponent(item.id)}`, item.id))}" data-search="${escapeHtml(`${item.titleCn} ${item.authorCn} ${item.titleEn} ${item.author}`)}">
            <div class="continue-art"></div>
            <div class="continue-body">
              <button class="icon-btn bookmark" aria-label="Bookmark" type="button" data-bookmark="${escapeHtml(item.titleEn)}">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V21l-5.5-3.5L7 21V4.5Z"/>
                </svg>
              </button>
              <div>
                <h3 class="book-title">${escapeHtml(item.titleCn)}</h3>
                <p class="book-author-cn">${escapeHtml(item.authorCn)}</p>
                <p class="book-title-en">${escapeHtml(item.titleEn)}</p>
                <p class="book-author">${escapeHtml(item.author)}</p>
              </div>
              <div>
                <div class="progress-meta">${item.progress}% • ${escapeHtml(item.minutesLeft)}</div>
                <div class="progress-bar"><div class="progress-fill" style="width:${item.progress}%"></div></div>
              </div>
            </div>
          </article>
        `,
      )
      .join("");
  }

  if (analysisList) {
    analysisList.innerHTML = preview.analysisItems
      .map(
        (item) => `
          <article class="analysis-row" tabindex="0" role="link" data-book-id="${escapeHtml(item.id)}" data-href="${escapeHtml(resolveTargetUrl(`${routes.analysis}?book=${encodeURIComponent(item.id)}`, item.id))}" data-search="${escapeHtml(`${item.title} ${item.author} ${item.tag}`)}">
            <div class="thumb ${escapeHtml(item.thumbClass)}"></div>
            <div class="analysis-main">
              <h3 class="analysis-title">${escapeHtml(item.title)}</h3>
              <p class="analysis-sub">${escapeHtml(item.author)}</p>
              <span class="chip">${escapeHtml(item.tag)}</span>
            </div>
            <div>
              <div class="score" style="--pct:${item.score}; --ring:${item.ring}">
                <span>${item.score}</span>
              </div>
              <div class="score-meta">${escapeHtml(item.date)}</div>
            </div>
          </article>
        `,
      )
      .join("");
  }

  document.querySelectorAll("[data-href]").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) {
        return;
      }

      const bookId = card.getAttribute("data-book-id");
      if (bookId && previewData?.selectBook) {
        previewData.selectBook(bookId);
        const fullBook = previewData?.listBooks?.().find((book) => book.id === bookId) ?? previewData?.getBook?.(bookId);
        if (fullBook) {
          window.sessionStorage.setItem("textplex.preview.pendingBook", JSON.stringify(fullBook));
        }
      }
      navigateTo(card.getAttribute("data-href") ?? routes.home);
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const bookId = card.getAttribute("data-book-id");
        if (bookId && previewData?.selectBook) {
          previewData.selectBook(bookId);
          const fullBook = previewData?.listBooks?.().find((book) => book.id === bookId) ?? previewData?.getBook?.(bookId);
          if (fullBook) {
            window.sessionStorage.setItem("textplex.preview.pendingBook", JSON.stringify(fullBook));
          }
        }
        navigateTo(card.getAttribute("data-href") ?? routes.home);
      }
    });
  });

  const bookmarkKey = "textplex:home-bookmarks";
  const bookmarks = new Set(JSON.parse(window.localStorage.getItem(bookmarkKey) || "[]"));
  document.querySelectorAll("[data-bookmark]").forEach((button) => {
    const title = button.getAttribute("data-bookmark") ?? "";
    button.classList.toggle("is-active", bookmarks.has(title));
    button.addEventListener("click", () => {
      if (bookmarks.has(title)) {
        bookmarks.delete(title);
        toast("Removed from bookmarks");
      } else {
        bookmarks.add(title);
        toast("Saved to bookmarks");
      }
      button.classList.toggle("is-active", bookmarks.has(title));
      window.localStorage.setItem(bookmarkKey, JSON.stringify([...bookmarks]));
    });
  });

  searchInput?.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;
    document.querySelectorAll("[data-search]").forEach((card) => {
      const matches = !query || (card.getAttribute("data-search") ?? "").toLowerCase().includes(query);
      card.classList.toggle("is-filtered", !matches);
      if (matches) {
        visibleCount += 1;
      }
    });
    if (emptyState) {
      emptyState.hidden = visibleCount > 0;
    }
  });
}

function wireAnalysisPreview() {
  const profileKey = currentBookId();
  const profile = previewData?.getAnalysisProfile?.(profileKey);
  if (!profile) {
    renderMissingBookState("analysis", profileKey);
    return;
  }

  previewData?.selectBook?.(profileKey);

  const art = document.querySelector(".art");
  const title = document.getElementById("analysisTitle");
  const author = document.getElementById("analysisAuthor");
  const meta = document.getElementById("analysisMeta");
  const date = document.getElementById("analysisDate");
  const ring = document.getElementById("analysisRing");
  const score = document.getElementById("analysisScore");
  const level = document.getElementById("analysisLevel");
  const levelSub = document.getElementById("analysisLevelSub");
  const levelNote = document.getElementById("analysisLevelNote");
  const recommendation = document.getElementById("analysisRecommendation");
  const sample = document.getElementById("analysisSample");
  const sampleNote = document.getElementById("analysisSampleNote");
  const heroTag = document.querySelector(".text-meta .tag");

  if (art) {
    art.style.background = profile.art;
  }
  if (title) {
    title.textContent = profile.title;
  }
  if (author) {
    author.textContent = profile.author;
  }
  if (meta) {
    meta.textContent = profile.meta;
  }
  if (date) {
    date.textContent = profile.date;
  }
  if (ring) {
    ring.style.background = `conic-gradient(${profile.ring} ${profile.score}%, rgba(0, 0, 0, 0.08) 0)`;
  }
  if (score) {
    score.textContent = String(profile.score);
  }
  if (level) {
    level.textContent = profile.level;
  }
  if (levelSub) {
    levelSub.textContent = profile.levelSub;
  }
  if (levelNote) {
    levelNote.textContent = profile.levelNote;
  }
  if (recommendation) {
    recommendation.textContent = profile.recommendation;
  }
  if (heroTag) {
    heroTag.textContent = profile.tag;
  }
  if (sample) {
    sample.textContent = profile.sample;
  }
  if (sampleNote) {
    sampleNote.textContent = profile.sampleNote;
  }

  window.sessionStorage.setItem("textplex:analysis-profile", profileKey);
  document.title = `${profile.title} · TextPlex Analysis Preview`;
}

function wireReaderPreview() {
  const bookId = currentBookId();
  const profile = previewData?.getReaderProfile?.(bookId);
  if (!profile) {
    renderMissingReaderState(bookId);
    return;
  }

  previewData?.selectBook?.(bookId);

  const title = document.querySelector(".poem-title");
  const author = document.querySelector(".poet");
  const pager = document.getElementById("readerPager");
  const sessionPill = document.getElementById("readerSessionPill");
  const lines = Array.from(document.querySelectorAll(".annotated-line"));
  const translation = document.querySelector(".translation");
  const vocabChar = document.querySelector(".vocab-char");
  const vocabPinyin = document.querySelector(".vocab-pinyin");
  const vocabDefinition = document.querySelector(".vocab-definition");
  const exampleCn = document.querySelector(".example-cn");
  const exampleEn = document.querySelector(".example-en");
  const saveButton = document.querySelector(".button-primary");
  const moreButton = document.getElementById("readerMoreActions");
  const readerOptionButtons = Array.from(document.querySelectorAll('button[aria-label="More options"], button[aria-label="More actions"]'));
  const readerOptionsBackdrop = document.getElementById("readerOptionsBackdrop");
  const readerThemePanel = document.getElementById("readerOptionsPanel");
  const readerThemeStatus = document.getElementById("readerThemeStatus");
  const readerTextSizeChoices = Array.from(document.querySelectorAll("[data-text-size-choice]"));
  const readerThemeChoices = Array.from(document.querySelectorAll("[data-theme-choice]"));
  const tokenModeToggle = document.getElementById("readerTokenModeToggle");
  const fontToggle = document.getElementById("readerFontToggle");
  const fallbackModeToggle = document.getElementById("readerFallbackModeToggle");
  const fallbackModeWrap = document.getElementById("readerDefinitionFallback");
  const readerApp = document.querySelector(".app");
  const processorBaseUrl = previewData?.getProcessorBaseUrl?.() ?? "";
  const readerTokenModeStorageKey = "textplex.readerTokenMode";
  const readerFontStorageKey = "textplex.readerFont";
  const readerThemeStorageKey = "textplex.readerTheme";
  const readerTextSizeStorageKey = "textplex.readerTextSize";
  const missingLookupMessage = "No dictionary entry found in imported lexicon.";
  const pageStateKey = `textplex:reader-page:${bookId}`;
  const sentenceStateKey = `textplex:reader-sentence:${bookId}`;
  const tokenStateKey = (page, sentence, mode) => `textplex:reader-token:${bookId}:${page}:${sentence}:${mode}`;
  const tokenLookupCache = new Map();
  const tokenLookupPending = new Map();
  let activeTokenLookupKey = "";
  let readerTokenMode = resolveReaderTokenMode(window.localStorage.getItem(readerTokenModeStorageKey) ?? "word");
  let readerFont = resolveReaderFont(window.localStorage.getItem(readerFontStorageKey) ?? "mixed");
  let readerTheme = resolveReaderTheme(window.localStorage.getItem(readerThemeStorageKey) ?? "neutral");
  let readerTextSize = resolveReaderTextSize(window.localStorage.getItem(readerTextSizeStorageKey) ?? "medium");
  let readerOptionsOpen = false;

  function setReaderTokenMode(nextMode) {
    const normalizedMode = resolveReaderTokenMode(nextMode);
    if (normalizedMode === readerTokenMode) {
      return;
    }

    const previousMode = readerTokenMode;
    readerTokenMode = normalizedMode;
    window.localStorage.setItem(readerTokenModeStorageKey, readerTokenMode);
    window.sessionStorage.removeItem(tokenStateKey(pageIndex, sentenceIndex, previousMode));
    render();
  }

  function setReaderFont(nextMode) {
    const normalizedMode = resolveReaderFont(nextMode);
    if (normalizedMode === readerFont) {
      return;
    }

    readerFont = normalizedMode;
    window.localStorage.setItem(readerFontStorageKey, readerFont);
    render();
  }

  function setReaderTheme(nextTheme) {
    const normalizedTheme = resolveReaderTheme(nextTheme);
    if (normalizedTheme === readerTheme) {
      return;
    }

    readerTheme = normalizedTheme;
    window.localStorage.setItem(readerThemeStorageKey, readerTheme);
    syncReaderOptionsState();
  }

  function setReaderTextSize(nextSize) {
    const normalizedSize = resolveReaderTextSize(nextSize);
    if (normalizedSize === readerTextSize) {
      return;
    }

    readerTextSize = normalizedSize;
    window.localStorage.setItem(readerTextSizeStorageKey, readerTextSize);
    syncReaderOptionsState();
  }

  function resolveReaderTheme(value) {
    return value === "sepia" || value === "ink" || value === "black" ? value : "neutral";
  }

  function resolveReaderTextSize(value) {
    return value === "small" || value === "large" || value === "medium" ? value : "medium";
  }

  function formatReaderThemeLabel(value) {
    switch (resolveReaderTheme(value)) {
      case "sepia":
        return "Warm Sepia";
      case "ink":
        return "Dark Ink";
      case "black":
        return "Pitch Black";
      default:
        return "Neutral";
    }
  }

  function formatReaderTextSizeLabel(value) {
    switch (resolveReaderTextSize(value)) {
      case "small":
        return "Small";
      case "large":
        return "Large";
      default:
        return "Medium";
    }
  }

  function syncReaderOptionsState() {
    const normalizedTheme = resolveReaderTheme(readerTheme);
    const normalizedTextSize = resolveReaderTextSize(readerTextSize);
    readerTheme = normalizedTheme;
    readerTextSize = normalizedTextSize;
    if (readerApp) {
      readerApp.dataset.readerTheme = normalizedTheme;
      readerApp.dataset.readerTextSize = normalizedTextSize;
    }
    document.body.dataset.readerTheme = normalizedTheme;
    if (readerThemeStatus) {
      readerThemeStatus.textContent = formatReaderThemeLabel(normalizedTheme);
    }
    if (readerThemePanel) {
      readerThemePanel.hidden = !readerOptionsOpen;
    }
    if (readerOptionsBackdrop) {
      readerOptionsBackdrop.hidden = !readerOptionsOpen;
    }
    readerOptionButtons.forEach((button) => {
      button.setAttribute("aria-expanded", String(readerOptionsOpen));
    });
    readerThemeChoices.forEach((button) => {
      const theme = resolveReaderTheme(button.getAttribute("data-theme-choice"));
      const selected = theme === normalizedTheme;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    readerTextSizeChoices.forEach((button) => {
      const textSize = resolveReaderTextSize(button.getAttribute("data-text-size-choice"));
      const selected = textSize === normalizedTextSize;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute("aria-label", `Text size ${formatReaderTextSizeLabel(textSize)}`);
    });
  }

  function toggleReaderOptions(forceOpen = null) {
    readerOptionsOpen = typeof forceOpen === "boolean" ? forceOpen : !readerOptionsOpen;
    syncReaderOptionsState();
  }

  const pages = Array.isArray(profile.pages) && profile.pages.length
    ? profile.pages
    : Array.isArray(profile.sentences)
      ? profile.sentences.map((sentence, index) => ({
          pageNumber: index + 1,
          sentences: [sentence],
          imageUrl: "",
        }))
      : [];
  const pageCount = Math.max(pages.length, 1);
  const params = new URL(window.location.href).searchParams;
  const legacyQueryPage = Number.parseInt(params.get("sentence") ?? "", 10);
  const queryPage = Number.parseInt(params.get("page") ?? "", 10);
  const querySentence = Number.parseInt(params.get("sentenceIndex") ?? "", 10);
  const storedPage = Number.parseInt(window.sessionStorage.getItem(pageStateKey) ?? "", 10);
  const storedSentence = Number.parseInt(window.sessionStorage.getItem(sentenceStateKey) ?? "", 10);
  let pageIndex = Number.isFinite(queryPage)
    ? queryPage
    : Number.isFinite(storedPage)
      ? storedPage
      : Number.isFinite(legacyQueryPage)
        ? legacyQueryPage
      : 0;
  let sentenceIndex = Number.isFinite(querySentence)
    ? querySentence
    : Number.isFinite(storedSentence)
      ? storedSentence
      : 0;

  pageIndex = clamp(pageIndex, 0, pageCount - 1);
  const completedPages = clamp(Number.parseInt(profile.reading?.completedPages ?? 0, 10) || 0, 0, pageCount);
  if (pageIndex < completedPages) {
    pageIndex = Math.min(completedPages, pageCount - 1);
    sentenceIndex = 0;
  }

  function render() {
    const currentPage = pages[pageIndex] ?? pages[0] ?? { pageNumber: 1, sentences: [] };
    const pageSentences = Array.isArray(currentPage.sentences) ? currentPage.sentences : [];
    const currentSentenceCount = Math.max(pageSentences.length, 1);
    sentenceIndex = clamp(sentenceIndex, 0, currentSentenceCount - 1);
    const sentence = pageSentences[sentenceIndex] ?? pageSentences[0] ?? {
      phonetics: [],
      tokens: [],
      translation: [],
      vocabulary: null,
    };
    const selectedTokenIndex = resolveSelectedTokenIndex(sentence, pageIndex, sentenceIndex, readerTokenMode);
    const selectedTokenLookupKey = buildTokenLookupKey(sentence, selectedTokenIndex);
    activeTokenLookupKey = selectedTokenLookupKey;
    void ensureSelectedTokenLookup(sentence, selectedTokenIndex);
    const selectedTokenState = buildSelectedTokenState(sentence, selectedTokenIndex);
    const reading = previewData?.recordReadingProgress?.(bookId, {
      pageIndex,
      sentenceIndex,
    }) ?? profile.reading ?? null;

    if (title) {
      title.textContent = profile.title;
    }
    if (author) {
      author.textContent = profile.author;
    }
    if (readerApp) {
      readerApp.dataset.readerFont = readerFont;
      readerApp.dataset.readerTheme = readerTheme;
      readerApp.dataset.readerTextSize = readerTextSize;
    }
    document.body.dataset.readerTheme = readerTheme;
    if (tokenModeToggle) {
      tokenModeToggle.textContent = readerTokenMode === "character" ? "Char" : "Word";
      tokenModeToggle.classList.toggle("is-active", readerTokenMode === "character");
      tokenModeToggle.setAttribute("aria-pressed", String(readerTokenMode === "character"));
      tokenModeToggle.setAttribute(
        "aria-label",
        readerTokenMode === "character" ? "Switch to word mode" : "Switch to character mode",
      );
      tokenModeToggle.title = readerTokenMode === "character" ? "Character mode" : "Word mode";
      tokenModeToggle.disabled = !sentence;
    }
    if (fontToggle) {
      const fontLabel = formatReaderFontLabel(readerFont);
      fontToggle.textContent = fontLabel;
      fontToggle.setAttribute("aria-label", `Cycle reader font. Current: ${fontLabel}`);
      fontToggle.title = `Reader font: ${fontLabel}`;
      fontToggle.disabled = !sentence;
    }
    const tokenLookupMissing = selectedTokenState.definition === missingLookupMessage;
    if (fallbackModeToggle) {
      fallbackModeToggle.textContent = readerTokenMode === "character" ? "Word mode" : "Try Char mode";
      fallbackModeToggle.setAttribute("aria-label", readerTokenMode === "character" ? "Switch to word mode" : "Try character mode");
      fallbackModeToggle.title = readerTokenMode === "character" ? "Switch back to word mode" : "Switch to character mode";
      fallbackModeToggle.hidden = !tokenLookupMissing || readerTokenMode === "character";
    }
    if (fallbackModeWrap) {
      fallbackModeWrap.hidden = !tokenLookupMissing || readerTokenMode === "character";
    }
    if (lines[0]) {
      const tokenMarkup = buildSentenceTokenMarkup(sentence, readerTokenMode, selectedTokenIndex);

      lines[0].style.display = "";
      lines[0].innerHTML = `<div class="sentence-row" aria-label="${escapeHtml(profile.title)} page ${pageIndex + 1} sentence ${sentenceIndex + 1}">${tokenMarkup}</div>`;
      const tokenButtons = Array.from(lines[0].querySelectorAll(".token"));
      tokenButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          const nextIndex = Number.parseInt(button.getAttribute("data-token-index") ?? "", 10);
          if (!Number.isFinite(nextIndex)) {
            return;
          }
          if (button.getAttribute("data-token-punctuation") === "true") {
            return;
          }
          window.sessionStorage.setItem(tokenStateKey(pageIndex, sentenceIndex, readerTokenMode), String(nextIndex));
          render();
        });
      });
    }

    if (lines[1]) {
      lines[1].style.display = "none";
    }

    if (translation) {
      const sentenceTranslation = Array.isArray(sentence.translation) ? sentence.translation : [];
      const pageTranslation = Array.isArray(currentPage.translation)
        ? currentPage.translation
        : typeof currentPage.page_translation === "string" && currentPage.page_translation.trim()
          ? [currentPage.page_translation.trim()]
          : [];
      const translationLines = sentenceTranslation.length ? sentenceTranslation : pageTranslation;
      translation.innerHTML = translationLines.length
        ? translationLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")
        : `<p>Sentence ${sentenceIndex + 1} of ${currentSentenceCount}.</p>`;
    }

    if (vocabChar) {
      vocabChar.textContent = selectedTokenState.surface || sentence.vocabulary?.surface || "?";
    }
    if (vocabPinyin) {
      const parts = vocabPinyin.querySelectorAll("span");
      if (parts[0]) {
        parts[0].textContent = selectedTokenState.reading ?? "";
        parts[0].hidden = !selectedTokenState.reading;
      }
      if (parts[1]) {
        parts[1].hidden = false;
      }
      if (parts[2]) {
        parts[2].textContent = formatLevelTag(selectedTokenState.tag ?? profile.kindLabel ?? "demo");
      }
    }
    if (vocabDefinition) {
      vocabDefinition.textContent = selectedTokenState.definition ?? "Synthetic sentence preview.";
    }
    if (exampleCn) {
      exampleCn.textContent = selectedTokenState.exampleCn ?? "";
    }
    if (exampleEn) {
      exampleEn.innerHTML = selectedTokenState.exampleEn ?? "";
    }
    if (saveButton) {
      saveButton.textContent = "Save to Vocabulary";
    }
    if (moreButton) {
      moreButton.setAttribute("aria-label", "More actions");
    }
    syncReaderOptionsState();
    if (sessionPill) {
      const activeSession = reading?.activeSession ?? null;
      if (activeSession) {
        const startLabel = formatSessionClock(activeSession.startedAt);
        const endLabel = formatSessionClock(activeSession.lastSeenAt ?? activeSession.startedAt);
        const durationLabel = formatSessionDuration(Date.parse(activeSession.lastSeenAt ?? activeSession.startedAt) - Date.parse(activeSession.startedAt));
        const charCount = Math.max(0, Number(reading?.completedCharacters ?? activeSession.completedCharacters ?? 0) || 0);
        const averageLabel = formatCharacterRate(
          Date.parse(activeSession.lastSeenAt ?? activeSession.startedAt) - Date.parse(activeSession.startedAt),
          charCount,
        );
        sessionPill.hidden = false;
        sessionPill.innerHTML = `
          <strong>${escapeHtml(startLabel)}</strong>
          <span>to ${escapeHtml(endLabel)}</span>
          <span>· ${escapeHtml(durationLabel)}</span>
          <span>· ${escapeHtml(formatNumber(charCount))} chars</span>
          <span>· ${escapeHtml(averageLabel)}/char</span>
        `;
      } else {
        sessionPill.hidden = true;
        sessionPill.innerHTML = "";
      }
    }

    if (pager) {
      pager.innerHTML = `
        <button class="pager-btn" type="button" aria-label="Previous sentence"${pageIndex === 0 && sentenceIndex === 0 ? " disabled" : ""}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span class="page-pill">P${pageIndex + 1}/${pageCount} | S${sentenceIndex + 1}/${currentSentenceCount}</span>
        <button class="pager-btn" type="button" aria-label="Next sentence"${pageIndex === pageCount - 1 && sentenceIndex === currentSentenceCount - 1 ? " disabled" : ""}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      `;

      pager.querySelector('[aria-label="Previous sentence"]')?.addEventListener("click", () => goTo(-1));
      pager.querySelector('[aria-label="Next sentence"]')?.addEventListener("click", () => goTo(1));
    }

    const url = new URL(window.location.href);
    url.searchParams.set("book", bookId);
    url.searchParams.set("page", String(pageIndex));
    url.searchParams.set("sentence", String(sentenceIndex));
    window.history.replaceState({}, "", url);
    window.sessionStorage.setItem(pageStateKey, String(pageIndex));
    window.sessionStorage.setItem(sentenceStateKey, String(sentenceIndex));
    window.sessionStorage.setItem(tokenStateKey(pageIndex, sentenceIndex, readerTokenMode), String(selectedTokenIndex));
    document.title = `${profile.title} ? P${pageIndex + 1}/${pageCount} ? S${sentenceIndex + 1}/${currentSentenceCount} ? TextPlex Reader Preview`;
  }

  function countSentenceCharacters(sentence) {
    const tokens = Array.isArray(sentence?.tokens) ? sentence.tokens : [];
    return tokens.reduce((total, token) => {
      const surface = String(token?.surface ?? "");
      if (!surface || isTokenPunctuation(surface)) {
        return total;
      }
      return total + Array.from(surface).filter((character) => !/\s/.test(character) && !isTokenPunctuation(character)).length;
    }, 0);
  }

  function countPageCharacters(page) {
    const sentencesForPage = Array.isArray(page?.sentences) ? page.sentences : [];
    return sentencesForPage.reduce((total, sentence) => total + countSentenceCharacters(sentence), 0);
  }

  function completeCurrentPage() {
    const completedPages = clamp(pageIndex + 1, 0, pageCount);
    const completedCharacters = pages.slice(0, completedPages).reduce((total, page) => total + countPageCharacters(page), 0);
    return previewData?.recordReadingProgress?.(bookId, {
      pageIndex,
      sentenceIndex,
      completedPages,
      completedCharacters,
    });
  }

  function resolveReaderFont(value) {
    return value === "serif" || value === "sans" || value === "mixed" ? value : "mixed";
  }

  function nextReaderFontMode(currentMode) {
    const mode = resolveReaderFont(currentMode);
    if (mode === "mixed") {
      return "serif";
    }
    if (mode === "serif") {
      return "sans";
    }
    return "mixed";
  }

  function formatReaderFontLabel(mode) {
    switch (resolveReaderFont(mode)) {
      case "serif":
        return "Serif";
      case "sans":
        return "Sans";
      default:
        return "Mixed";
    }
  }

  function finalizeCurrentSession() {
    const completedPages = clamp(pageIndex + 1, 0, pageCount);
    const completedCharacters = pages.slice(0, completedPages).reduce((total, page) => total + countPageCharacters(page), 0);
    return previewData?.finalizeReadingProgress?.(bookId, {
      pageIndex,
      sentenceIndex,
      completedPages,
      completedCharacters,
    });
  }

  function goTo(delta) {
    const currentPage = pages[pageIndex] ?? pages[0] ?? { sentences: [] };
    const currentPageSentenceCount = Math.max(Array.isArray(currentPage.sentences) ? currentPage.sentences.length : 0, 1);
    const nextSentenceIndex = sentenceIndex + delta;
    if (nextSentenceIndex >= 0 && nextSentenceIndex < currentPageSentenceCount) {
      sentenceIndex = nextSentenceIndex;
      render();
      return;
    }

    const nextPageIndex = pageIndex + (delta > 0 ? 1 : -1);
    if (nextPageIndex < 0 || nextPageIndex >= pageCount) {
      return;
    }

    completeCurrentPage();
    pageIndex = nextPageIndex;
    const nextPage = pages[pageIndex] ?? pages[0] ?? { sentences: [] };
    const nextPageSentenceCount = Math.max(Array.isArray(nextPage.sentences) ? nextPage.sentences.length : 0, 1);
    sentenceIndex = delta > 0 ? 0 : Math.max(nextPageSentenceCount - 1, 0);
    render();
  }

  render();
  if (tokenModeToggle) {
    tokenModeToggle.addEventListener("click", () => {
      setReaderTokenMode(readerTokenMode === "character" ? "word" : "character");
    });
  }
  if (fontToggle) {
    fontToggle.addEventListener("click", () => {
      setReaderFont(nextReaderFontMode(readerFont));
    });
  }
  if (fallbackModeToggle) {
    fallbackModeToggle.addEventListener("click", () => {
      setReaderTokenMode("character");
    });
  }
  readerOptionButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      toggleReaderOptions();
    });
  });
  readerOptionsBackdrop?.addEventListener("click", () => {
    toggleReaderOptions(false);
  });
  readerThemeChoices.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      setReaderTheme(button.getAttribute("data-theme-choice") ?? "neutral");
    });
  });
  readerTextSizeChoices.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      setReaderTextSize(button.getAttribute("data-text-size-choice") ?? "medium");
    });
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && readerOptionsOpen) {
      toggleReaderOptions(false);
    }
  });
  window.addEventListener("pagehide", finalizeCurrentSession);
  window.addEventListener("beforeunload", finalizeCurrentSession);

  function resolveSelectedTokenIndex(sentence, page, sentenceNumber, mode) {
    const tokens = buildReaderDisplayTokens(sentence, mode);
    if (!tokens.length) {
      return 0;
    }

    const storedIndex = Number.parseInt(window.sessionStorage.getItem(tokenStateKey(page, sentenceNumber, mode)) ?? "", 10);
    if (Number.isFinite(storedIndex)) {
      const storedToken = tokens[storedIndex];
      if (storedToken && !isTokenPunctuation(storedToken.surface_form ?? storedToken.surface)) {
        return storedIndex;
      }
    }

    const matchedIndex = tokens.findIndex(
      (token) => normalizeText(token?.surface_form ?? token?.surface ?? "") === normalizeText(sentence.vocabulary?.surface ?? ""),
    );
    if (matchedIndex >= 0 && !isTokenPunctuation(tokens[matchedIndex]?.surface_form ?? tokens[matchedIndex]?.surface)) {
      return matchedIndex;
    }

    const firstReadableIndex = tokens.findIndex((token) => !isTokenPunctuation(token?.surface_form ?? token?.surface ?? ""));
    return firstReadableIndex >= 0 ? firstReadableIndex : 0;
  }

  function buildSelectedTokenState(sentence, index) {
    const tokens = buildReaderDisplayTokens(sentence, readerTokenMode);
    const token = tokens[index] ?? tokens.find((candidate) => !isTokenPunctuation(candidate?.surface_form ?? candidate?.surface ?? "")) ?? tokens[0] ?? {};
    const surface = String(token?.surface_form ?? token?.surface ?? sentence.vocabulary?.surface ?? "");
    const reading = String(token?.romanization ?? token?.pronunciation ?? sentence.vocabulary?.reading ?? "");
    const matchedVocabulary = normalizeText(surface) && normalizeText(surface) === normalizeText(sentence.vocabulary?.surface ?? "");

    if (matchedVocabulary && sentence.vocabulary) {
      return {
        ...sentence.vocabulary,
        surface: sentence.vocabulary.surface ?? surface,
        reading: sentence.vocabulary.reading ?? reading,
        tag: formatLevelTag(sentence.vocabulary.tag ?? profile.kindLabel ?? "demo"),
        definition: sentence.vocabulary.definition ?? "Synthetic sentence preview.",
        exampleCn: sentence.vocabulary.exampleCn ?? "",
        exampleEn: sentence.vocabulary.exampleEn ?? "",
      };
    }

    const tokenDefinition = String(token?.definition_short ?? token?.definition ?? "");
    const tokenTag = formatLevelTag(token?.proficiency_level ?? token?.hsk_level ?? profile.kindLabel ?? "Selected");
    if (tokenDefinition) {
      return {
        surface,
        reading,
        tag: tokenTag,
        definition: tokenDefinition,
        exampleCn: String(token?.example_cn ?? token?.exampleCn ?? ""),
        exampleEn: String(token?.example_en ?? token?.exampleEn ?? ""),
        lemma: String(token?.lemma ?? token?.surface_form ?? surface ?? ""),
        radical: token?.radical ?? null,
        strokeCount: token?.stroke_count ?? token?.strokeCount ?? null,
      };
    }

    const lookupKey = buildTokenLookupKey(sentence, index);
    const lexiconEntry = lookupKey ? tokenLookupCache.get(lookupKey) ?? null : null;
    if (lexiconEntry) {
      return buildLexiconTokenState(lexiconEntry, surface, reading);
    }

    if (token?.romanization || token?.pronunciation || token?.lemma) {
      return {
        surface,
        reading,
        tag: tokenTag,
        definition: lookupKey && tokenLookupPending.has(lookupKey) ? "Looking up dictionary entry..." : "No dictionary entry found in imported lexicon.",
        exampleCn: "",
        exampleEn: "",
        lemma: String(token?.lemma ?? token?.surface_form ?? surface ?? ""),
        radical: token?.radical ?? null,
        strokeCount: token?.stroke_count ?? token?.strokeCount ?? null,
      };
    }

    return {
      surface,
      reading,
      tag: profile.kindLabel ?? "Selected",
      definition: lookupKey && tokenLookupPending.has(lookupKey) ? "Looking up dictionary entry..." : "No dictionary entry found in imported lexicon.",
      exampleCn: "",
      exampleEn: "",
    };
  }

  function buildTokenLookupKey(sentence, index) {
    const tokens = buildReaderDisplayTokens(sentence, readerTokenMode);
    const token = tokens[index] ?? tokens.find((candidate) => !isTokenPunctuation(candidate?.surface_form ?? candidate?.surface ?? "")) ?? tokens[0] ?? {};
    const surface = String(token?.surface_form ?? token?.surface ?? "").trim();
    if (!surface || isTokenPunctuation(surface)) {
      return "";
    }

    return `${String(profile.languageCode ?? "zh")}:${normalizeText(surface)}`;
  }

  function buildLexiconTokenState(entry, surface, reading) {
    return {
      surface: String(entry?.surface_form ?? surface ?? ""),
      reading: String(entry?.pinyin ?? reading ?? ""),
      tag: formatLevelTag(entry?.hsk_level ?? profile.kindLabel ?? "demo"),
      definition: String(entry?.definition ?? `Dictionary entry for ${surface}.`),
      exampleCn: String(entry?.example_cn ?? entry?.exampleCn ?? ""),
      exampleEn: String(entry?.example_en ?? entry?.exampleEn ?? ""),
      radical: entry?.radical ?? null,
      strokeCount: entry?.stroke_count ?? entry?.strokeCount ?? null,
    };
  }

  function ensureSelectedTokenLookup(sentence, index) {
    const lookupKey = buildTokenLookupKey(sentence, index);
    if (!lookupKey || tokenLookupCache.has(lookupKey) || tokenLookupPending.has(lookupKey) || !processorBaseUrl || typeof window.fetch !== "function") {
      return;
    }

    if (isBlockedProcessorUrl(processorBaseUrl)) {
      return;
    }

    const tokens = buildReaderDisplayTokens(sentence, readerTokenMode);
    const token = tokens[index] ?? tokens.find((candidate) => !isTokenPunctuation(candidate?.surface_form ?? candidate?.surface ?? "")) ?? tokens[0] ?? {};
    const surface = String(token?.surface_form ?? token?.surface ?? "").trim();
    if (!surface) {
      return;
    }

    const request = fetchJsonMaybeWithTimeout(
      () =>
        window.fetch(buildLexiconLookupUrl(processorBaseUrl, profile.languageCode ?? "zh", surface), {
          headers: { Accept: "application/json" },
        }),
      2500,
    )
      .then((payload) => {
        const entry = Array.isArray(payload?.entries) ? payload.entries[0] ?? null : null;
        tokenLookupCache.set(lookupKey, entry);
        return entry;
      })
      .finally(() => {
        tokenLookupPending.delete(lookupKey);
        if (activeTokenLookupKey === lookupKey) {
          render();
        }
      });

    tokenLookupPending.set(lookupKey, request);
  }

  function fetchJsonMaybeWithTimeout(fetchFactory, timeoutMs = 2500) {
    let settled = false;
    let timeoutId = null;

    return new Promise((resolve) => {
      const complete = (value) => {
        if (settled) {
          return;
        }
        settled = true;
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
        resolve(value);
      };

      timeoutId = window.setTimeout(() => complete(null), timeoutMs);

      Promise.resolve()
        .then(fetchFactory)
        .then((response) => (response && response.ok ? response.json() : null))
        .then((payload) => complete(payload))
        .catch(() => complete(null));
    });
  }

  function buildLexiconLookupUrl(baseUrl, languageCode, term) {
    const url = new URL("/lexicon/lookup", baseUrl);
    url.searchParams.set("language_code", String(languageCode ?? "zh"));
    url.searchParams.set("term", String(term ?? ""));
    return url.href;
  }

  function formatLevelTag(value) {
    const text = String(value ?? "").trim();
    if (!text) {
      return "demo";
    }

    const normalized = text.replace(/^HSK\s*/i, "").trim();
    if (/^\d+(?:\.\d+)?$/.test(normalized)) {
      return `HSK ${normalized}`;
    }

    if (/^HSK\s+\d+(?:\.\d+)?$/i.test(text)) {
      return text.replace(/\s+/g, " ").replace(/^hsk/i, "HSK");
    }

    return text;
  }
}

function wireLibraryDetailPreview() {

  const bookId = currentBookId();
  const profile = previewData?.getLibraryProfile?.(bookId);
  if (!profile) {
    renderMissingBookState("library", bookId);
    return;
  }

  previewData?.selectBook?.(bookId);

  const title = document.querySelector(".meta h1");
  const author = document.querySelector(".meta .author");
  const tagRow = document.querySelector(".tag-row");
  const progressTop = document.querySelector(".progress-top");
  const progressFill = document.querySelector(".progress-fill");
  const summary = document.querySelector(".summary");
  const summaryLink = document.querySelector(".summary-link");
  const profileHead = document.querySelector(".profile-head .sub");
  const profileLabels = Array.from(document.querySelectorAll(".profile-labels > div"));
  const stats = Array.from(document.querySelectorAll(".stats-grid .stat"));
  const readingItems = Array.from(document.querySelectorAll(".reading-list .reading-item"));
  const buttons = Array.from(document.querySelectorAll(".button-row .button"));
  const topbarButtons = Array.from(document.querySelectorAll(".topbar .icon-btn"));

  if (title) {
    title.textContent = profile.title;
  }
  if (author) {
    author.textContent = profile.author;
  }
  if (tagRow) {
    tagRow.innerHTML = `<span>${escapeHtml(profile.languageLabel)} • ${escapeHtml(profile.kindLabel)}</span><span class="tag">${escapeHtml(profile.profileLabel)}</span>`;
  }
  if (progressTop) {
    progressTop.firstElementChild && (progressTop.firstElementChild.textContent = `${profile.progress}% · ${profile.minutesLeft}`);
  }
  if (progressFill) {
    progressFill.style.width = `${profile.progress}%`;
  }
  if (summary) {
    summary.textContent = profile.summary;
  }
  if (summaryLink) {
    summaryLink.setAttribute("href", profile.analysisHref);
  }
  if (profileHead) {
    profileHead.textContent = profile.profileLabel;
  }

  if (stats.length >= 4) {
    setStat(stats[0], profile.characters, "Characters");
    setStat(stats[1], profile.lines, "Lines");
    setStat(stats[2], profile.estRead, "Est. Read");
    setStat(stats[3], profile.added, "Added");
  }

  if (profileLabels.length >= 3) {
    setProfileLabel(profileLabels[0], "Known", profile.known);
    setProfileLabel(profileLabels[1], "Review", profile.review);
    setProfileLabel(profileLabels[2], "New", profile.fresh);
  }

  if (readingItems.length >= 2) {
    setReadingItem(readingItems[0], profile.recentReading[0]);
    setReadingItem(readingItems[1], profile.recentReading[1]);
  }

  if (buttons[0]) {
    buttons[0].textContent = "Read";
    buttons[0].addEventListener("click", () => navigateTo(profile.readerHref));
  }
  if (buttons[1]) {
    buttons[1].textContent = "View Analysis";
    buttons[1].addEventListener("click", () => navigateTo(profile.analysisHref));
  }
  if (buttons[2]) {
    buttons[2].textContent = "Study Words";
    buttons[2].addEventListener("click", () => navigateTo(resolveTargetUrl(routes.study)));
  }

  topbarButtons.forEach((button) => {
    const label = button.getAttribute("aria-label");
    if (label === "Back") {
      button.addEventListener("click", () => navigateTo(resolveTargetUrl(routes.library, bookId)));
    }
  });
}

function wireLibraryPreview() {
  const shelf = document.getElementById("libraryShelf");
  const emptyState = document.getElementById("libraryEmpty");
  const countLabel = document.getElementById("libraryCount");
  const searchInput = document.getElementById("librarySearch");
  const modeButtons = Array.from(document.querySelectorAll("[data-library-mode]"));
  const storageKey = "textplex:library-view-mode";
  const selectedBookId = currentBookId();
  const books = (previewData?.listBooks?.() ?? [])
    .slice()
    .sort((a, b) => {
      const dateA = String(a.lastOpenedAt ?? "");
      const dateB = String(b.lastOpenedAt ?? "");
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      return String(a.title ?? "").localeCompare(String(b.title ?? ""));
    });

  if (!shelf) {
    return;
  }

  const initialMode = window.localStorage.getItem(storageKey) === "list" ? "list" : "grid";
  let mode = initialMode;
  const totalBooks = books.length;

  if (searchInput) {
    searchInput.value = "";
  }

  function render() {
    const query = normalizeText(searchInput?.value ?? "");
    const visible = books.filter((book) => {
      const profile = previewData?.getLibraryProfile?.(book.id);
      const haystack = normalizeText(
        [
          profile?.title,
          profile?.author,
          profile?.languageLabel,
          profile?.kindLabel,
          profile?.profileLabel,
          profile?.summary,
        ]
          .filter(Boolean)
          .join(" "),
      );
      return !query || haystack.includes(query);
    });

    if (countLabel) {
      countLabel.textContent = `${visible.length} document${visible.length === 1 ? "" : "s"} in the local collection`;
    }

    shelf.classList.toggle("is-grid", mode === "grid");
    shelf.classList.toggle("is-list", mode === "list");
    shelf.innerHTML = visible
      .map((book) => {
        const profile = previewData?.getLibraryProfile?.(book.id);
        if (!profile) {
          return "";
        }

        return mode === "grid"
          ? renderLibraryGridCard(profile, selectedBookId)
          : renderLibraryListRow(profile, selectedBookId);
      })
      .join("");

    if (emptyState) {
      if (visible.length > 0) {
        emptyState.hidden = true;
        emptyState.innerHTML = "";
      } else {
        emptyState.hidden = false;
        emptyState.innerHTML =
          totalBooks === 0
            ? `
              <p style="margin:0 0 10px;">The preview library is empty because the seeded records were cleared from this browser profile.</p>
              <button type="button" class="button button-primary" data-reset-library style="width:auto; padding:10px 14px; border-radius:999px;">Restore sample library</button>
            `
            : `
              <p style="margin:0;">No visible library items match this search.</p>
            `;
      }
    }

    shelf.querySelectorAll("[data-open-library]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const bookId = button.getAttribute("data-book-id");
        const href = button.getAttribute("data-href");
        if (bookId) {
          previewData?.selectBook?.(bookId);
          navigateTo(href || resolveTargetUrl(`${routes.libraryDetail}?book=${encodeURIComponent(bookId)}`, bookId));
        }
      });
    });

    shelf.querySelectorAll("[data-open-reader]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const bookId = button.getAttribute("data-book-id");
        const href = button.getAttribute("data-href");
        if (bookId) {
          previewData?.selectBook?.(bookId);
          navigateTo(href || resolveTargetUrl(`${routes.reader}?book=${encodeURIComponent(bookId)}`, bookId));
        }
      });
    });

    shelf.querySelectorAll("[data-library-card]").forEach((card) => {
      card.addEventListener("click", () => {
        const bookId = card.getAttribute("data-book-id");
        const href = card.getAttribute("data-library-href");
        if (bookId) {
          previewData?.selectBook?.(bookId);
          navigateTo(href || resolveTargetUrl(`${routes.libraryDetail}?book=${encodeURIComponent(bookId)}`, bookId));
        }
      });

      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          card.click();
        }
      });
    });

    modeButtons.forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute("data-library-mode") === mode);
      button.setAttribute("aria-pressed", button.getAttribute("data-library-mode") === mode ? "true" : "false");
    });

    emptyState?.querySelector("[data-reset-library]")?.addEventListener("click", () => {
      previewData?.resetStore?.();
      window.location.reload();
    });
  }

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      mode = button.getAttribute("data-library-mode") === "list" ? "list" : "grid";
      window.localStorage.setItem(storageKey, mode);
      render();
    });
  });

  searchInput?.addEventListener("input", render);
  render();
}

function wireSearchPreview() {
  const bookId = currentBookId();
  document.querySelectorAll(".result").forEach((result) => {
    result.addEventListener("click", () => {
      navigateTo(resolveTargetUrl(routes.library, bookId));
    });
  });

  document.querySelectorAll(".vocab-row").forEach((row) => {
    row.addEventListener("click", () => {
      navigateTo(resolveTargetUrl(routes.vocabulary, bookId));
    });
  });

  document.querySelectorAll(".author-row, .topic-row").forEach((row) => {
    row.addEventListener("click", () => {
      navigateTo(resolveTargetUrl(routes.analysis, bookId));
    });
  });
}

function wireImportPreview() {
  const rows = Array.from(document.querySelectorAll(".option-row"));
  const recentList = document.querySelector(".recent-list");
  const processorInput = document.getElementById("processorBaseUrl");
  const processorStatus = document.getElementById("processorStatus");
  const ocrModeButtons = Array.from(document.querySelectorAll("[data-ocr-provider]"));
  const importStatusCard = document.querySelector(".import-status-card");
  const importStatusBadge = document.getElementById("importStatusBadge");
  const importStatusText = document.getElementById("importStatusText");
  const importProgressTrack = document.getElementById("importProgressTrack");
  const importProgressFill = document.getElementById("importProgressFill");
  const importPageProgressTrack = document.getElementById("importPageProgressTrack");
  const importPageProgressFill = document.getElementById("importPageProgressFill");
  const importPageProgressText = document.getElementById("importPageProgressText");
  const importLogItems = Array.from(document.querySelectorAll("#importLog [data-step]"));
  const importPdfInput = document.getElementById("importPdfInput");
  const processorButtons = Array.from(document.querySelectorAll("[data-processor-action]"));
  const importStepIndex = new Map(importLogItems.map((item, index) => [item.getAttribute("data-step") ?? "", index]));

  if (processorInput && previewData?.getProcessorBaseUrl) {
    processorInput.value = previewData.getProcessorBaseUrl();
    updateProcessorStatus(processorStatus, processorInput.value);
  }
  if (ocrModeButtons.length && previewData?.getOcrProvider) {
    syncOcrModeToggle(previewData.getOcrProvider());
  }

  const restoredSession = loadImportSession();
  if (restoredSession?.bookId) {
    restoreImportSession(restoredSession);
    if (restoredSession.stage === "uploading" || restoredSession.stage === "processing" || restoredSession.stage === "opening") {
      void monitorUploadedBook(restoredSession.bookId, restoredSession.fileName, { resume: true });
    }
  } else {
    setImportActivity("selected", "Select a PDF to start the processor upload.", {
      badge: "Idle",
      state: "idle",
      percent: 0,
    });
    setImportPageProgress(0, "0 pages processed.");
  }

  function applyProcessorUrl() {
    if (!processorInput || !previewData?.setProcessorBaseUrl) {
      return;
    }

    previewData.setProcessorBaseUrl(processorInput.value.trim());
    updateProcessorStatus(processorStatus, processorInput.value);
  }

  function syncOcrModeToggle(provider) {
    const resolved = resolveOcrProvider(provider);
    ocrModeButtons.forEach((button) => {
      const next = resolveOcrProvider(button.getAttribute("data-ocr-provider"));
      button.classList.toggle("is-active", next === resolved);
    });
  }

  async function refreshProcessorData() {
    applyProcessorUrl();
    if (processorStatus) {
      processorStatus.textContent = "Refreshing processor data...";
    }
    await (previewData?.refreshFromApi?.() ?? Promise.resolve());
    if (processorStatus) {
      processorStatus.textContent = `Processor URL: ${previewData?.getProcessorBaseUrl?.() || "not set"}`;
    }
    if (typeof window.location.reload === "function") {
      window.location.reload();
    } else {
      navigateTo(window.location.href);
    }
  }

  function setImportActivity(step, message, options = {}) {
    const { badge = "Busy", state = "busy", percent = 0 } = options;
    const activeIndex = importStepIndex.get(step) ?? -1;
    const widthByStep = {
      selected: 18,
      uploading: 34,
      processing: 58,
      refreshing: 78,
      opening: 92,
    };
    const width = Math.max(0, Math.min(100, percent || widthByStep[step] || 0));

    if (importStatusCard) {
      importStatusCard.classList.remove("is-busy", "is-done", "is-error");
      if (state === "busy") {
        importStatusCard.classList.add("is-busy");
      } else if (state === "done") {
        importStatusCard.classList.add("is-done");
      } else if (state === "error") {
        importStatusCard.classList.add("is-error");
      }
    }

    if (importStatusBadge) {
      importStatusBadge.textContent = badge;
    }

    if (importStatusText) {
      importStatusText.textContent = message;
    }

    if (importProgressTrack) {
      importProgressTrack.setAttribute("aria-valuenow", String(Math.round(width)));
    }

    if (importProgressFill) {
      importProgressFill.style.width = `${width}%`;
    }

    importLogItems.forEach((item, index) => {
      item.classList.toggle("is-active", index === activeIndex);
      item.classList.toggle("is-done", index < activeIndex || state === "done");
      item.classList.toggle("is-error", state === "error" && index === activeIndex);
    });
  }

  function setImportPageProgress(percent, message, options = {}) {
    const { totalPages = 0, processedPages = 0, currentPage = 0 } = options;
    const width = Math.max(0, Math.min(100, Math.round(percent || 0)));
    if (importPageProgressTrack) {
      importPageProgressTrack.setAttribute("aria-valuenow", String(width));
    }
    if (importPageProgressFill) {
      importPageProgressFill.style.width = `${width}%`;
    }
    if (importPageProgressText) {
      importPageProgressText.textContent =
        message || (totalPages > 0 ? `${processedPages}/${totalPages} pages processed${currentPage > 0 ? ` · page ${currentPage}` : ""}.` : `${processedPages} pages processed.`);
    }
  }

  function setImportError(message) {
    setImportActivity("selected", message, {
      badge: "Error",
      state: "error",
      percent: 100,
    });
  }

  function loadImportSession() {
    try {
      const raw = window.localStorage.getItem(importSessionKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return null;
      }

      return {
        bookId: typeof parsed.bookId === "string" ? parsed.bookId : "",
        fileName: typeof parsed.fileName === "string" ? parsed.fileName : "",
        title: typeof parsed.title === "string" ? parsed.title : "",
        stage: typeof parsed.stage === "string" ? parsed.stage : "processing",
        badge: typeof parsed.badge === "string" ? parsed.badge : "Processing",
        state: typeof parsed.state === "string" ? parsed.state : "busy",
        message: typeof parsed.message === "string" ? parsed.message : "",
        overallPercent: Number(parsed.overallPercent ?? 0) || 0,
        pagePercent: Number(parsed.pagePercent ?? 0) || 0,
        pagesProcessed: Number(parsed.pagesProcessed ?? 0) || 0,
        totalPages: Number(parsed.totalPages ?? 0) || 0,
        currentPage: Number(parsed.currentPage ?? 0) || 0,
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
      };
    } catch {
      return null;
    }
  }

  function saveImportSession(session) {
    if (!session || typeof session !== "object") {
      return;
    }

    window.localStorage.setItem(
      importSessionKey,
      JSON.stringify({
        ...session,
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  function clearImportSession() {
    window.localStorage.removeItem(importSessionKey);
  }

  function restoreImportSession(session) {
    setImportActivity(
      session.stage === "error" ? "selected" : session.stage === "opening" ? "opening" : "processing",
      session.message || `Resuming ${stripPdfExtension(session.fileName || "Imported PDF")}.`,
      {
        badge: session.badge || (session.stage === "error" ? "Error" : session.stage === "opening" ? "Done" : "Processing"),
        state: session.state || (session.stage === "error" ? "error" : session.stage === "opening" ? "done" : "busy"),
        percent: Number(session.overallPercent ?? 0) || 0,
      },
    );
    setImportPageProgress(Number(session.pagePercent ?? 0) || 0, session.message || "Resuming page processing.", {
      totalPages: Number(session.totalPages ?? 0) || 0,
      processedPages: Number(session.pagesProcessed ?? 0) || 0,
      currentPage: Number(session.currentPage ?? 0) || 0,
    });
  }

  async function fetchUploadedBook(bookId) {
    const baseUrl = previewData?.getProcessorBaseUrl?.();
    if (!baseUrl) {
      throw new Error("Set the processor API URL before checking progress.");
    }

    const response = await window.fetch(`${baseUrl}/books/${encodeURIComponent(bookId)}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Progress check failed: ${response.status}`);
    }
    return response.json();
  }

  async function monitorUploadedBook(bookId, fileName, options = {}) {
    const bookLabel = stripPdfExtension(fileName || "Imported PDF");
    let consecutiveFailures = 0;
    let lastSnapshot = loadImportSession() ?? {};
    saveImportSession({
      bookId,
      fileName,
      title: bookLabel,
      stage: "processing",
      badge: "Processing",
      state: "busy",
      overallPercent: 18,
      pagePercent: 0,
      pagesProcessed: 0,
      totalPages: 0,
      currentPage: 0,
      message: options.resume ? `Resuming processor progress for ${bookLabel}.` : `Watching ${bookLabel} for page progress.`,
    });

    while (true) {
      let liveBook = null;
      try {
        liveBook = await fetchUploadedBook(bookId);
        consecutiveFailures = 0;
      } catch (error) {
        consecutiveFailures += 1;
        const preservedPagesProcessed = Number(lastSnapshot.pagesProcessed ?? 0) || 0;
        const preservedTotalPages = Number(lastSnapshot.totalPages ?? 0) || 0;
        const preservedCurrentPage = Number(lastSnapshot.currentPage ?? 0) || 0;
        const preservedPagePercent = Number(lastSnapshot.pagePercent ?? 0) || 0;
        const retryMessage =
          consecutiveFailures === 1
            ? `Lost connection to the processor while checking ${bookLabel}. Retrying…`
            : `Still waiting to reconnect to the processor for ${bookLabel}.`;
        setImportActivity("processing", retryMessage, {
          badge: "Waiting",
          state: "busy",
          percent: 18,
        });
        setImportPageProgress(preservedPagePercent, retryMessage, {
          totalPages: preservedTotalPages,
          processedPages: preservedPagesProcessed,
          currentPage: preservedCurrentPage,
        });
        saveImportSession({
          bookId,
          fileName,
          title: bookLabel,
          stage: "processing",
          badge: "Waiting",
          state: "busy",
          overallPercent: 18,
          pagePercent: preservedPagePercent,
          pagesProcessed: preservedPagesProcessed,
          totalPages: preservedTotalPages,
          currentPage: preservedCurrentPage,
          message: retryMessage,
          lastError: error instanceof Error ? error.message : String(error ?? "Unknown error"),
        });
        await pauseForPaint();
        await new Promise((resolve) => window.setTimeout(resolve, Math.min(5000, 1000 * Math.max(1, consecutiveFailures))));
        continue;
      }

      const totalPages = Number(liveBook?.extraction_total_pages ?? liveBook?.total_pages ?? 0) || 0;
      const processedPages = Number(liveBook?.extraction_pages_processed ?? 0) || 0;
      const currentPage = Number(liveBook?.extraction_current_page ?? processedPages ?? 0) || 0;
      const status = String(liveBook?.extraction_status ?? liveBook?.status ?? "processing").toLowerCase();
      const pagePercent = totalPages > 0 ? Math.min(100, Math.round((processedPages / totalPages) * 100)) : 0;
      const overallPercent =
        status === "complete"
          ? 100
          : status === "failed"
            ? 100
            : Math.min(95, Math.max(18, 18 + Math.round(pagePercent * 0.72)));
      const nextMessage =
        status === "complete"
          ? `Finished processing ${bookLabel}.`
          : status === "failed"
            ? `Processor failed while handling ${bookLabel}.`
            : totalPages > 0
              ? `Processing page ${currentPage || processedPages || 1} of ${totalPages}.`
              : `Processing ${bookLabel}.`;

      setImportActivity(
        "processing",
        nextMessage,
        {
          badge: status === "failed" ? "Error" : status === "complete" ? "Done" : "Processing",
          state: status === "failed" ? "error" : status === "complete" ? "done" : "busy",
          percent: overallPercent,
        },
      );
      setImportPageProgress(
        pagePercent,
        totalPages > 0
          ? `${processedPages}/${totalPages} pages processed${currentPage > 0 ? ` · page ${currentPage}` : ""}.`
          : `${processedPages} pages processed.`,
        {
          totalPages,
          processedPages,
          currentPage,
        },
      );
      saveImportSession({
        bookId,
        fileName,
        title: bookLabel,
        stage: status === "failed" ? "error" : status === "complete" ? "opening" : "processing",
        badge: status === "failed" ? "Error" : status === "complete" ? "Done" : "Processing",
        state: status === "failed" ? "error" : status === "complete" ? "done" : "busy",
        overallPercent,
        pagePercent,
        pagesProcessed: processedPages,
        totalPages,
        currentPage,
        message: nextMessage,
      });
      lastSnapshot = {
        bookId,
        fileName,
        title: bookLabel,
        stage: status === "failed" ? "error" : status === "complete" ? "opening" : "processing",
        badge: status === "failed" ? "Error" : status === "complete" ? "Done" : "Processing",
        state: status === "failed" ? "error" : status === "complete" ? "done" : "busy",
        overallPercent,
        pagePercent,
        pagesProcessed: processedPages,
        totalPages,
        currentPage,
        message: nextMessage,
      };

      if (status === "complete") {
        setImportActivity("opening", `Opening ${bookLabel}.`, {
          badge: "Done",
          state: "done",
          percent: 100,
        });
        await pauseForPaint();
        await (previewData?.refreshFromApi?.() ?? Promise.resolve());
        const hydratedBook =
          previewData?.getBook?.(bookId) ??
          previewData?.listBooks?.().find((book) => book.id === bookId) ??
          liveBook;
        if (hydratedBook) {
          window.sessionStorage.setItem("textplex.preview.pendingBook", JSON.stringify(hydratedBook));
          previewData?.selectBook?.(bookId);
          clearImportSession();
          navigateTo(`${routes.reader}?book=${encodeURIComponent(bookId)}`);
        }
        return liveBook;
      }

      if (status === "failed") {
        setImportError(`The processor could not finish ${bookLabel}.`);
        saveImportSession({
          ...lastSnapshot,
          stage: "error",
          badge: "Error",
          state: "error",
          overallPercent: 100,
          message: `The processor could not finish ${bookLabel}.`,
        });
        return liveBook;
      }

      await pauseForPaint();
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }
  }

  function pauseForPaint() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  rows.forEach((row) => {
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    row.classList.add("interactive-card");

    const label = normalizeText(row.querySelector("h3")?.textContent ?? row.textContent);
    const importKind = label === "upload file" ? "book" : label === "manual vocabulary item" ? "custom" : "article";

    row.addEventListener("click", () => {
      if (label === "upload file") {
        if (importPdfInput && typeof importPdfInput.click === "function") {
          setImportActivity("selected", "Choose a PDF file to upload.", {
            badge: "Queued",
            state: "busy",
            percent: 18,
          });
          importPdfInput.click();
        } else {
          toast("PDF import is unavailable in this preview.");
        }
        return;
      }

      if (label === "manual vocabulary item") {
        navigateTo(resolveTargetUrl(routes.vocabulary));
        return;
      }

      const record = previewData?.createImportedRecord?.(importKind, createImportTemplate(importKind, label));
      if (record) {
        navigateTo(`${routes.reader}?book=${encodeURIComponent(record.id)}`);
      }
    });

    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        row.click();
      }
    });
  });

  importPdfInput?.addEventListener("change", async () => {
    const file = importPdfInput.files?.[0];
    if (!file) {
      return;
    }

    setImportActivity("selected", `Selected ${file.name || "PDF file"}.`, {
      badge: "Queued",
      state: "busy",
      percent: 18,
    });
    await pauseForPaint();

    if (!String(file.name ?? "").toLowerCase().endsWith(".pdf")) {
      toast("Select a PDF file to import.");
      setImportError("Select a PDF file to continue.");
      importPdfInput.value = "";
      return;
    }

    setImportActivity("uploading", `Uploading ${file.name || "PDF file"} to the processor API.`, {
      badge: "Uploading",
      state: "busy",
      percent: 34,
    });
    await pauseForPaint();

    const uploadResult = await uploadPdfToProcessor(file, (progress) => {
      const loaded = Number(progress?.loaded ?? 0) || 0;
      const total = Number(progress?.total ?? file.size ?? 0) || 0;
      const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
      if (progress?.uploadComplete) {
        setImportActivity("processing", "Upload finished. Waiting for the processor to register and split the PDF.", {
          badge: "Processing",
          state: "busy",
          percent: 42,
        });
        return;
      }
      setImportActivity("uploading", `Uploading ${formatBytes(loaded)} of ${formatBytes(total)}.`, {
        badge: "Uploading",
        state: "busy",
        percent: Math.max(34, percent),
      });
    });
    importPdfInput.value = "";
    if (!uploadResult || uploadResult.error) {
      setImportError(uploadResult?.error || "The processor rejected the upload.");
      return;
    }

    if (uploadResult.id) {
      const uploadedTitle = stripPdfExtension(uploadResult.title ?? file.name);
      saveImportSession({
        bookId: uploadResult.id,
        fileName: file.name,
        title: uploadedTitle,
        stage: "processing",
        badge: "Processing",
        state: "busy",
        overallPercent: 18,
        pagePercent: Number(uploadResult?.extraction_pages_processed ?? 0) || 0,
        pagesProcessed: Number(uploadResult?.extraction_pages_processed ?? 0) || 0,
        totalPages: Number(uploadResult?.extraction_total_pages ?? uploadResult?.total_pages ?? 0) || 0,
        currentPage: Number(uploadResult?.extraction_current_page ?? 0) || 0,
        message: `Waiting for the processor to finish ${uploadedTitle}.`,
      });
      void monitorUploadedBook(uploadResult.id, uploadedTitle);
    }
  });

  processorInput?.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await refreshProcessorData();
    }
  });

  processorInput?.addEventListener("blur", () => {
    applyProcessorUrl();
  });

  processorButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.getAttribute("data-processor-action") === "refresh") {
        await refreshProcessorData();
        return;
      }

      applyProcessorUrl();
      if (processorStatus) {
        processorStatus.textContent = `Processor URL saved: ${previewData?.getProcessorBaseUrl?.() || "not set"}`;
      }
    });
  });

  ocrModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const provider = resolveOcrProvider(button.getAttribute("data-ocr-provider"));
      previewData?.setOcrProvider?.(provider);
      syncOcrModeToggle(provider);
    });
  });

  if (!recentList || !previewData?.listBooks) {
    return;
  }

  const recentBooks = previewData
    .listBooks()
    .slice()
    .sort((a, b) => String(b.lastOpenedAt ?? "").localeCompare(String(a.lastOpenedAt ?? "")))
    .slice(0, 2);

  recentList.innerHTML = recentBooks
    .map(
      (book) => `
        <article class="card recent-row" data-book-id="${escapeHtml(book.id)}">
          <div class="recent-icon ${book.contentType === "book" ? "green" : "red"}">${escapeHtml((book.contentType ?? "TXT").toUpperCase().slice(0, 3))}</div>
          <div class="recent-main">
            <h4>${escapeHtml(book.title ?? "")}</h4>
            <p>${escapeHtml(book.contentType ?? "text")} · ${escapeHtml(book.languageCode?.toUpperCase?.() ?? "ZH")}</p>
          </div>
          <div class="recent-meta">${escapeHtml(book.displayDate ?? "")}</div>
        </article>
      `,
    )
    .join("");

  recentList.querySelectorAll("[data-book-id]").forEach((row) => {
    row.addEventListener("click", () => {
      const bookId = row.getAttribute("data-book-id");
      if (bookId) {
        const fullBook = previewData?.listBooks?.().find((book) => book.id === bookId) ?? previewData?.getBook?.(bookId);
        if (fullBook) {
          window.sessionStorage.setItem("textplex.preview.pendingBook", JSON.stringify(fullBook));
        }
        previewData.selectBook(bookId);
        navigateTo(`${routes.reader}?book=${encodeURIComponent(bookId)}`);
      }
    });
  });
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

function readUploadErrorMessage(xhr, fallbackMessage) {
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

  async function uploadPdfToProcessor(file, onProgress) {
  const baseUrl = previewData?.getProcessorBaseUrl?.();
  if (!baseUrl) {
    toast("Set the processor API URL before uploading.");
    return null;
  }

  if (isBlockedProcessorUrl(baseUrl)) {
    const message = "GitHub Pages is served over HTTPS, so this browser blocks HTTP processor URLs. Use an HTTPS API or test from the local site host.";
    toast(message);
    return { error: message };
  }

  if (typeof window.fetch !== "function" || typeof window.FormData !== "function") {
    toast("File uploads are not available in this browser.");
    return null;
  }

  const formData = new FormData();
  formData.append("file", file, file.name || "import.pdf");
  formData.append("language_code", "zh");
  formData.append("title", stripPdfExtension(file.name || "Imported PDF"));
  formData.append("author", "Local import");
  formData.append("ocr_provider", previewData?.getOcrProvider?.() || "local");

  try {
    const response = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${baseUrl}/books/upload`, true);
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
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          statusText: xhr.statusText,
          text: async () => String(xhr.responseText ?? ""),
          json: async () => JSON.parse(String(xhr.responseText ?? "{}")),
          raw: String(xhr.responseText ?? ""),
        });
      };
      xhr.onerror = () => {
        reject(new Error("Upload failed. Check the processor URL and try again."));
      };
      xhr.ontimeout = () => {
        reject(new Error(`Upload timed out after ${Math.round(uploadTimeoutMs / 60000)} minutes while the processor was still handling the PDF.`));
      };
      xhr.send(formData);
    });

    if (!response.ok) {
      const failure = readUploadErrorMessage(response, `${response.status} ${response.statusText || "Upload failed"}`.trim());
      toast(`Upload failed: ${failure}`);
      return { error: failure, status: response.status };
    }

    toast("PDF uploaded.");
    return response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed. Check the processor URL and try again.";
    toast(message);
    return { error: message };
  }
}

function updateProcessorStatus(node, value) {
  if (!node) {
    return;
  }

  const resolved = String(value ?? "").trim();
  node.textContent = resolved
    ? isBlockedProcessorUrl(resolved)
      ? `Processor URL: ${resolved} (blocked from GitHub Pages over HTTPS)`
      : `Processor URL: ${resolved}`
    : "No processor URL set.";
}

function wireProfilePreview() {
  const profile = previewData?.getProfilePreviewData?.();
  if (!profile) {
    return;
  }

  wireTrackPreview({
    prefix: "profile",
    tracks: profile.profile.learning_tracks || [],
    selectedTrackCode: profile.profile.selected_track_code || "local",
    titleFallback: "Track overview",
    subtitleFallback: "Select a track to inspect progress.",
    nextStepFallback: "Track guidance appears here.",
  });

  const title = document.getElementById("profileTitle");
  const subtitle = document.getElementById("profileSubtitle");
  const badge = document.getElementById("profileBadge");
  const sessionCount = document.getElementById("profileSessionCount");
  const pageReadCount = document.getElementById("profilePageReadCount");
  const sentenceReadCount = document.getElementById("profileSentenceReadCount");
  const activeBookCount = document.getElementById("profileActiveBookCount");
  const uniqueWordCount = document.getElementById("profileUniqueWordCount");
  const uniqueCharacterCount = document.getElementById("profileUniqueCharacterCount");
  const todaySentenceCount = document.getElementById("profileTodaySentenceCount");
  const todayTokenCount = document.getElementById("profileTodayTokenCount");
  const avgSentence = document.getElementById("profileAvgSentence");
  const avgWord = document.getElementById("profileAvgWord");
  const avgCharacter = document.getElementById("profileAvgCharacter");
  const settingsTheme = document.getElementById("profileTheme");
  const settingsReaderMode = document.getElementById("profileReaderMode");
  const settingsOcr = document.getElementById("profileOcrProvider");
  const settingsProcessor = document.getElementById("profileProcessorUrl");
  const activityList = document.getElementById("profileBookActivity");
  const emptyState = document.getElementById("profileActivityEmpty");

  if (title) {
    title.textContent = "User profile and reading history";
  }
  if (subtitle) {
    subtitle.textContent = "Sessions, page reads, exposure data, and stored preferences from the local profile store.";
  }
  if (badge) {
    badge.textContent = `${profile.profile.active_books} active books`;
  }
  if (sessionCount) {
    sessionCount.textContent = String(profile.profile.reading_sessions);
  }
  if (pageReadCount) {
    pageReadCount.textContent = String(profile.profile.page_reads);
  }
  if (sentenceReadCount) {
    sentenceReadCount.textContent = String(profile.profile.sentence_reads);
  }
  if (activeBookCount) {
    activeBookCount.textContent = String(profile.profile.active_books);
  }
  if (uniqueWordCount) {
    uniqueWordCount.textContent = String(profile.profile.unique_words_seen);
  }
  if (uniqueCharacterCount) {
    uniqueCharacterCount.textContent = String(profile.profile.unique_characters_seen);
  }
  if (todaySentenceCount) {
    todaySentenceCount.textContent = String(profile.profile.today_sentence_reads);
  }
  if (todayTokenCount) {
    todayTokenCount.textContent = String(profile.profile.today_token_exposures);
  }
  if (avgSentence) {
    avgSentence.textContent = profile.profile.average_seconds_per_sentence == null ? "—" : `${profile.profile.average_seconds_per_sentence.toFixed(2)} sec`;
  }
  if (avgWord) {
    avgWord.textContent = profile.profile.average_seconds_per_word == null ? "—" : `${profile.profile.average_seconds_per_word.toFixed(2)} sec`;
  }
  if (avgCharacter) {
    avgCharacter.textContent = profile.profile.average_seconds_per_character == null ? "—" : `${profile.profile.average_seconds_per_character.toFixed(2)} sec`;
  }

  const settingsMap = new Map(profile.settings.entries.map((entry) => [entry.key, entry.value]));
  if (settingsTheme) {
    settingsTheme.textContent = settingsMap.get("theme") ?? "paper";
  }
  if (settingsReaderMode) {
    settingsReaderMode.textContent = settingsMap.get("readerMode") ?? "sentence";
  }
  if (settingsOcr) {
    settingsOcr.textContent = settingsMap.get("ocrProvider") ?? "local";
  }
  if (settingsProcessor) {
    settingsProcessor.textContent = settingsMap.get("processorUrl") ?? "not set";
  }

  if (activityList) {
    activityList.innerHTML = profile.books
      .map(
        (book) => `
          <article class="profile-book" data-profile-book data-book-id="${escapeHtml(book.book_id)}" data-library-href="${escapeHtml(resolveTargetUrl(`${routes.libraryDetail}?book=${encodeURIComponent(book.book_id)}`, book.book_id))}" data-reader-href="${escapeHtml(resolveTargetUrl(`${routes.reader}?book=${encodeURIComponent(book.book_id)}`, book.book_id))}">
            <div class="profile-book-head">
              <div>
                <p class="profile-book-kicker">${escapeHtml(book.book_id)}</p>
                <h3>${escapeHtml(book.title)}</h3>
                <p class="profile-book-meta">${escapeHtml(book.page_reads)} page reads · ${escapeHtml(book.sentence_reads)} sentence reads</p>
              </div>
              <span class="pill">${escapeHtml(book.active_seconds)}s</span>
            </div>
            <div class="button-row button-row-tight">
              <button class="button button-secondary" type="button" data-open-library data-book-id="${escapeHtml(book.book_id)}" data-href="${escapeHtml(resolveTargetUrl(`${routes.libraryDetail}?book=${encodeURIComponent(book.book_id)}`, book.book_id))}" aria-label="Open book info">Info</button>
              <button class="button button-primary" type="button" data-open-reader data-book-id="${escapeHtml(book.book_id)}" data-href="${escapeHtml(resolveTargetUrl(`${routes.reader}?book=${encodeURIComponent(book.book_id)}`, book.book_id))}" aria-label="Open book">Open</button>
            </div>
          </article>
        `,
      )
      .join("");
  }

  if (emptyState) {
    emptyState.hidden = profile.books.length > 0;
  }

  activityList?.querySelectorAll?.("[data-open-library]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const href = button.getAttribute("data-href");
      navigateTo(href || routes.library);
    });
  });

  activityList?.querySelectorAll?.("[data-open-reader]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const href = button.getAttribute("data-href");
      navigateTo(href || routes.reader);
    });
  });
}

function wireVocabularyPreview() {
  const profile = previewData?.getProfilePreviewData?.();
  if (!profile) {
    return;
  }

  ensureTrackPreviewMarkup("insights", ".stats-grid");

  wireTrackPreview({
    prefix: "insights",
    tracks: profile.profile.learning_tracks || [],
    selectedTrackCode: profile.profile.selected_track_code || "local",
    titleFallback: "Learning track",
    subtitleFallback: "Select a learning path to review progress and pace.",
    nextStepFallback: "Track guidance appears here.",
  });
}

function ensureTrackPreviewMarkup(prefix, anchorSelector) {
  if (document.getElementById(`${prefix}TrackList`)) {
    return;
  }

  const anchor = document.querySelector(anchorSelector);
  if (!anchor) {
    return;
  }

  const section = document.createElement("section");
  section.className = "track-section surface";
  section.setAttribute("aria-label", "Learning track summary");
  section.innerHTML = `
    <div class="section-head">
      <div>
        <p class="eyebrow">Learning track</p>
        <h2 id="${prefix}TrackTitle">Track overview</h2>
      </div>
      <span class="pill" id="${prefix}TrackLevel">Track</span>
    </div>
    <div id="${prefix}TrackList" class="track-selector" aria-label="Learning tracks"></div>
    <article class="track-panel" aria-live="polite">
      <p id="${prefix}TrackSubtitle" class="track-copy">Select a track to inspect progress.</p>
      <div class="track-progress">
        <div class="track-progress-bar">
          <span id="${prefix}TrackProgress" style="--track-progress: 0%;"></span>
        </div>
      </div>
      <p id="${prefix}TrackNextStep" class="track-copy">Track guidance appears here.</p>
      <div id="${prefix}TrackJourney" class="track-journey"></div>
    </article>
  `;
  anchor.insertAdjacentElement("afterend", section);
}

function wireTrackPreview({ prefix, tracks, selectedTrackCode, titleFallback, subtitleFallback, nextStepFallback }) {
  const titleNode = document.getElementById(`${prefix}TrackTitle`);
  const levelNode = document.getElementById(`${prefix}TrackLevel`);
  const listNode = document.getElementById(`${prefix}TrackList`);
  const subtitleNode = document.getElementById(`${prefix}TrackSubtitle`);
  const progressNode = document.getElementById(`${prefix}TrackProgress`);
  const nextStepNode = document.getElementById(`${prefix}TrackNextStep`);
  const journeyNode = document.getElementById(`${prefix}TrackJourney`);

  const selectedTrack = tracks.find((track) => track.code === selectedTrackCode) ?? tracks[0] ?? null;

  if (listNode) {
    listNode.innerHTML = tracks
      .map(
        (track) => `
          <button
            class="track-chip ${track.code === selectedTrack?.code ? "is-active" : ""}"
            type="button"
            data-track-code="${escapeHtml(track.code)}"
            aria-pressed="${track.code === selectedTrack?.code ? "true" : "false"}"
          >
            ${escapeHtml(track.label)}
          </button>
        `,
      )
      .join("");

    listNode.querySelectorAll?.("[data-track-code]").forEach((button) => {
      button.addEventListener("click", () => {
        const trackCode = button.getAttribute("data-track-code");
        if (!trackCode) {
          return;
        }
        previewData?.setSelectedTrackCode?.(trackCode);
        navigateTo(resolveTargetUrl(routeForCurrentFile(), currentBookId()));
      });
    });
  }

  if (titleNode) {
    titleNode.textContent = selectedTrack?.label ? `${selectedTrack.label} track` : titleFallback;
  }
  if (levelNode) {
    levelNode.textContent = selectedTrack?.level || "Track";
  }
  if (subtitleNode) {
    subtitleNode.textContent = selectedTrack?.subtitle || subtitleFallback;
  }
  if (progressNode) {
    const trackProgress = `${Math.max(0, Math.min(100, Number(selectedTrack?.progress ?? 0)))}%`;
    if (typeof progressNode.style?.setProperty === "function") {
      progressNode.style.setProperty("--track-progress", trackProgress);
    } else if (progressNode.style) {
      progressNode.style["--track-progress"] = trackProgress;
    }
  }
  if (nextStepNode) {
    nextStepNode.textContent = selectedTrack?.next_step || nextStepFallback;
  }
  if (journeyNode) {
    journeyNode.innerHTML = Array.isArray(selectedTrack?.journey)
      ? selectedTrack.journey
          .map(
            (step) => `
              <article class="track-step track-step-${escapeHtml(step.status)}">
                <strong>${escapeHtml(step.label)}</strong>
                <p>${escapeHtml(step.detail)}</p>
                <span>${escapeHtml(Math.round(Number(step.progress ?? 0)))}% · ${escapeHtml(step.status)}</span>
              </article>
            `,
          )
          .join("")
      : "";
  }
}

function stripPdfExtension(value) {
  return String(value ?? "").replace(/\.pdf$/i, "").trim() || "Imported PDF";
}

function resolveOcrProvider(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "openai" ? "openai" : "local";
}

function isBlockedProcessorUrl(value) {
  const resolved = String(value ?? "").trim();
  if (!resolved) {
    return false;
  }

  try {
    const url = new URL(resolved);
    return window.location.protocol === "https:" && url.protocol === "http:";
  } catch {
    return false;
  }
}

function setStat(node, value, label) {
  if (!node) {
    return;
  }
  const strong = node.querySelector("strong");
  const span = node.querySelector("span");
  if (strong) {
    strong.textContent = String(value);
  }
  if (span) {
    span.textContent = label;
  }
}

function renderMissingReaderState(bookId) {
  const title = document.querySelector(".poem-title");
  const author = document.querySelector(".poet");
  const pager = document.getElementById("readerPager");
  const readingBody = document.querySelector(".reading-body");
  const vocabSheet = document.querySelector(".vocab-sheet");

  if (title) {
    title.textContent = "Book not found";
  }
  if (author) {
    author.textContent = bookId ? `Missing book: ${bookId}` : "Open a book from the library.";
  }
  if (pager) {
    pager.textContent = "—";
  }
  if (readingBody) {
    readingBody.innerHTML = `
      <div class="empty-state" style="padding: 28px 22px; text-align: center;">
        The selected book is not available in this preview store.
      </div>
    `;
  }
  if (vocabSheet) {
    vocabSheet.innerHTML = `
      <div class="sheet-handle" aria-hidden="true"></div>
      <div class="empty-state" style="padding: 24px 22px;">
        Open a valid book to view the definition panel.
      </div>
    `;
  }
  document.title = "Book not found · TextPlex Reader Preview";
}

function setProfileLabel(node, label, value) {
  if (!node) {
    return;
  }
  node.innerHTML = `${escapeHtml(label)}<br /><strong style="font-size: 16px; color: var(--text);">${escapeHtml(value)}</strong>`;
}

function setReadingItem(node, item) {
  if (!node || !item) {
    return;
  }
  const [left, right] = node.querySelectorAll("div > *");
  const textBlock = node.querySelector("div");
  const meta = node.querySelector("span");
  if (textBlock) {
    textBlock.innerHTML = `<strong>${escapeHtml(item.title ?? "")}</strong><br /><span>${escapeHtml(item.subtitle ?? "")}</span>`;
  }
  if (meta) {
    meta.textContent = item.meta ?? "";
  }
}

function renderMissingBookState(kind, bookId) {
  const app = document.querySelector(".app");
  if (!app) {
    return;
  }

  const heading = kind === "analysis" ? "Analysis record not found" : "Library record not found";
  const detail =
    bookId && String(bookId).trim()
      ? `Missing book: ${bookId}`
      : "Open a book from the library.";
  const backHref = kind === "analysis" ? resolveTargetUrl(routes.library, bookId) : resolveTargetUrl(routes.library, bookId);

  app.innerHTML = `
    <div style="min-height: calc(100vh - 48px); display: grid; align-content: start; gap: 16px;">
      <header class="topbar">
        <button class="icon-btn" type="button" aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 class="title">TextPlex</h1>
        <button class="icon-btn" type="button" aria-label="Share">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.6 13.5l6.8 3.9" />
            <path d="M15.4 6.6L8.6 10.5" />
          </svg>
        </button>
      </header>
      <section class="card" style="padding: 28px 22px;">
        <p class="subhead" style="margin-bottom: 10px;">${escapeHtml(kind === "analysis" ? "ANALYSIS" : "LIBRARY")}</p>
        <h2 style="margin: 0 0 12px; font-size: 30px; line-height: 1; letter-spacing: -0.05em;">${escapeHtml(heading)}</h2>
        <p class="meta-line" style="font-size: 15px; margin-bottom: 18px;">${escapeHtml(detail)}</p>
        <p class="meta-line" style="font-size: 15px; margin-bottom: 20px;">This preview only renders books that exist in the active local store.</p>
        <button class="button button-primary" type="button" data-back-to-library style="width: 100%;">Back to library</button>
      </section>
    </div>
  `;

  app.querySelector('[aria-label="Back"]')?.addEventListener("click", () => {
    navigateTo(backHref);
  });
  app.querySelector("[data-back-to-library]")?.addEventListener("click", () => {
    navigateTo(backHref);
  });

  document.title = `${heading} · TextPlex`;
}

function resolveTargetUrl(target, bookId = currentBookId()) {
  const url = new URL(target, window.location.href);
  const file = url.pathname.split("/").pop() || "";
  if (["reader-preview.html", "analysis-preview.html", "library-preview.html", "library-detail-preview.html", "study-preview.html", "progress-preview.html", "profile-preview.html", "vocabulary-preview.html"].includes(file) && bookId) {
    url.searchParams.set("book", bookId);
  }
  if (["reader-preview.html", "analysis-preview.html", "library-preview.html", "library-detail-preview.html", "study-preview.html", "progress-preview.html", "profile-preview.html", "vocabulary-preview.html"].includes(file)) {
    const trackCode = currentTrackCode();
    if (trackCode) {
      url.searchParams.set("track", trackCode);
    }
  }
  return url.href;
}

function resolveBackTarget() {
  const bookId = currentBookId();
  if (currentFile === "reader-preview.html") {
    return resolveTargetUrl(routes.library, bookId);
  }
  if (currentFile === "library-detail-preview.html") {
    return resolveTargetUrl(routes.library, bookId);
  }
  if (currentFile === "library-preview.html") {
    return routes.home;
  }
  if (currentFile === "analysis-preview.html") {
    return resolveTargetUrl(routes.libraryDetail, bookId);
  }
  if (currentFile === "import-preview.html") {
    return routes.home;
  }
  if (currentFile === "profile-preview.html") {
    return routes.home;
  }
  if (currentFile === "search-preview.html" || currentFile === "progress-preview.html" || currentFile === "study-preview.html" || currentFile === "activity-preview.html" || currentFile === "vocabulary-preview.html") {
    return routes.home;
  }
  return routes.index;
}

function renderLibraryGridCard(profile, selectedBookId) {
  const isSelected = profile.id === selectedBookId;
  return `
    <article class="library-card grid-card ${isSelected ? "is-selected" : ""}" tabindex="0" role="link" data-library-card data-book-id="${escapeHtml(profile.id)}" data-library-href="${escapeHtml(profile.libraryHref)}">
      <div class="library-art" style="background: ${profile.art};"></div>
      <div class="library-card-body">
        <div class="library-card-head">
          <div>
            <p class="library-kicker">${escapeHtml(profile.languageLabel)} · ${escapeHtml(profile.kindLabel)}</p>
            <h3>${escapeHtml(profile.title)}</h3>
            <p class="library-author">${escapeHtml(profile.author)}</p>
          </div>
          <span class="library-tag">${escapeHtml(profile.profileLabel || profile.contentType || "TXT")}</span>
        </div>
        <p class="library-summary">${escapeHtml(profile.summary)}</p>
        <div class="library-meta">
          <span>${escapeHtml(profile.characters)} chars</span>
          <span>${escapeHtml(profile.lines)} lines</span>
          <span>${escapeHtml(profile.estRead)}</span>
        </div>
        <div class="library-actions">
          <button class="button button-secondary action-icon action-icon-info" type="button" data-open-library data-book-id="${escapeHtml(profile.id)}" data-href="${escapeHtml(profile.libraryHref)}" aria-label="Open book info" title="Info">
            ${infoIcon()}
          </button>
          <button class="button button-primary action-icon action-icon-open" type="button" data-open-reader data-book-id="${escapeHtml(profile.id)}" data-href="${escapeHtml(profile.readerHref)}" aria-label="Open book" title="Open">
            ${bookIcon()}
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderLibraryListRow(profile, selectedBookId) {
  const isSelected = profile.id === selectedBookId;
  return `
    <article class="library-row ${isSelected ? "is-selected" : ""}" tabindex="0" role="link" data-library-card data-book-id="${escapeHtml(profile.id)}" data-library-href="${escapeHtml(profile.libraryHref)}">
      <div class="library-art library-art-small" style="background: ${profile.art};"></div>
      <div class="library-row-main">
        <p class="library-kicker">${escapeHtml(profile.languageLabel)} · ${escapeHtml(profile.kindLabel)}</p>
        <h3>${escapeHtml(profile.title)}</h3>
        <p class="library-author">${escapeHtml(profile.author)}</p>
        <p class="library-summary">${escapeHtml(profile.summary)}</p>
        <div class="library-meta">
          <span>${escapeHtml(profile.profileLabel || profile.contentType || "TXT")}</span>
          <span>${escapeHtml(profile.characters)} chars</span>
          <span>${escapeHtml(profile.estRead)}</span>
        </div>
      </div>
      <div class="library-row-actions">
        <button class="button button-secondary action-icon action-icon-info" type="button" data-open-library data-book-id="${escapeHtml(profile.id)}" data-href="${escapeHtml(profile.libraryHref)}" aria-label="Open book info" title="Info">
          ${infoIcon()}
        </button>
        <button class="button button-primary action-icon action-icon-open" type="button" data-open-reader data-book-id="${escapeHtml(profile.id)}" data-href="${escapeHtml(profile.readerHref)}" aria-label="Open book" title="Open">
          ${bookIcon()}
        </button>
      </div>
    </article>
  `;
}

function infoIcon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10.5v6" />
      <path d="M12 7.5h.01" />
    </svg>
  `;
}

function bookIcon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h9A2.5 2.5 0 0 1 20 4.5V19a1 1 0 0 1-1.5.86L16 18.3l-2.5 1.56a1 1 0 0 1-1 0L10 18.3l-2.5 1.56A1 1 0 0 1 6 19V4.5Z" />
      <path d="M8 6.5h7.5" />
      <path d="M8 10h7.5" />
    </svg>
  `;
}

function currentBookId() {
  return previewData?.resolveBookId?.(window.location) || previewData?.getSelectedBookId?.() || "spring-dawn";
}

function currentTrackCode() {
  const code = previewData?.getSelectedTrackCode?.() || window.localStorage.getItem(previewData?.trackKey || "textplex.preview.selectedTrack") || "local";
  return String(code).trim().toLowerCase() || "local";
}

function routeForCurrentFile() {
  if (currentFile === "home-preview.html") return routes.home;
  if (currentFile === "library-preview.html") return routes.library;
  if (currentFile === "library-detail-preview.html") return routes.libraryDetail;
  if (currentFile === "reader-preview.html") return routes.reader;
  if (currentFile === "analysis-preview.html") return routes.analysis;
  if (currentFile === "import-preview.html") return routes.import;
  if (currentFile === "search-preview.html") return routes.search;
  if (currentFile === "progress-preview.html") return routes.progress;
  if (currentFile === "profile-preview.html") return routes.profile;
  if (currentFile === "study-preview.html") return routes.study;
  if (currentFile === "activity-preview.html") return routes.activity;
  if (currentFile === "vocabulary-preview.html") return routes.vocabulary;
  return routes.index;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isTokenPunctuation(value) {
  return /^[\s.,!?;:，。！？；：、…（）()「」『』【】《》〈〉“”‘’—-]+$/.test(String(value ?? ""));
}

function createImportTemplate(kind, label) {
  const now = new Date();
  if (kind === "book") {
    return {
      title: "Imported PDF Sample",
      author: "Local import",
      languageCode: "zh",
      tag: "book",
      score: 77,
      summary: "A synthetic uploaded book record stored in the preview registry.",
      recentReading: [
        { title: formatDate(now), subtitle: "Imported book", meta: "ready now" },
      ],
      sentences: [
        {
          phonetics: ["shēn", "rù", "xū", "nǐ", "shū", "jì"],
          tokens: [{ surface: "示例" }, { surface: "书籍" }, { surface: "。" }],
          translation: ["A synthetic book sample."],
          vocabulary: {
            surface: "书籍",
            reading: "shū jí",
            tag: "book",
            definition: "n. book; volume",
            exampleCn: "这是一本示例书籍。",
            exampleEn: "This is a sample book.",
          },
        },
      ],
      progressPrefix: "PDF",
    };
  }

  if (label === "paste text" || label === "add from url") {
    return {
      title: "Imported Article Sample",
      author: "Local import",
      languageCode: "zh",
      tag: "article",
      score: 74,
      summary: "A synthetic pasted article record stored in the preview registry.",
      recentReading: [
        { title: formatDate(now), subtitle: "Imported text", meta: "59 sentences" },
      ],
      sentences: [
        {
          phonetics: ["zhè", "shì", "yī", "duàn", "dào", "rù", "de", "shì", "lì"],
          tokens: [{ surface: "这是" }, { surface: "一段" }, { surface: "导入" }, { surface: "的" }, { surface: "示例" }, { surface: "。" }],
          translation: ["This is an imported sample."],
          vocabulary: {
            surface: "导入",
            reading: "dǎo rù",
            tag: "article",
            definition: "v. to import; to bring in",
            exampleCn: "导入文本可以立即阅读。",
            exampleEn: "Imported text can be read immediately.",
          },
        },
      ],
      progressPrefix: "TXT",
    };
  }

  return {
    title: "Imported Text",
    author: "Local import",
    languageCode: "zh",
    tag: "custom",
    score: 72,
    summary: "A synthetic preview record stored in the local registry.",
    recentReading: [],
    sentences: [],
    progressPrefix: "TXT",
  };
}

function navigateTo(target) {
  window.location.href = new URL(target, window.location.href).href;
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(value);
}

function formatNumber(value) {
  try {
    return new Intl.NumberFormat("en-US").format(Number(value ?? 0) || 0);
  } catch {
    return String(value ?? 0);
  }
}

function formatSessionClock(value) {
  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
      .format(new Date(value))
      .replace(/\s+/g, " ")
      .toLowerCase();
  } catch {
    return String(value);
  }
}

function formatSessionDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.round(Number(durationMs ?? 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatCharacterRate(durationMs, characterCount) {
  const safeCharacters = Math.max(0, Number(characterCount ?? 0) || 0);
  if (!safeCharacters) {
    return "0ms";
  }

  const averageMs = Math.max(0, Math.round(Number(durationMs ?? 0) / safeCharacters));
  if (averageMs >= 1000) {
    return `${(averageMs / 1000).toFixed(1)}s`;
  }
  return `${averageMs}ms`;
}

function capitalize(value) {
  return String(value ?? "").charAt(0).toUpperCase() + String(value ?? "").slice(1);
}

function resolveReaderTokenMode(value) {
  return value === "character" ? "character" : "word";
}

function isCjk(value) {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(String(value ?? ""));
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
    const surface = String(token?.surface ?? token?.surface_form ?? token?.text ?? "");
    const romanization = String(token?.romanization ?? token?.pronunciation ?? "");
    const punctuation = isTokenPunctuation(surface);

    if (displayMode === "character" && shouldExpandTokenIntoCharacters(surface) && !punctuation) {
      const characters = Array.from(surface);
      const readings = splitRomanizationByCharacters(romanization, characters.length);
      characters.forEach((character, characterIndex) => {
        displayTokens.push({
          ...token,
          order: (Number(token?.order) || displayTokens.length + 1) * 100 + characterIndex + 1,
          surface,
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
      surface,
      surface_form: surface,
      lemma: typeof token?.lemma === "string" && token.lemma ? token.lemma : surface,
      romanization: romanization || null,
    });
  }

  return displayTokens;
}

function buildSentenceTokenMarkup(sentence, mode, selectedTokenIndex) {
  const tokens = buildReaderDisplayTokens(sentence, mode);
  const text = String(sentence?.text ?? "");
  let cursor = 0;
  const chunks = [];

  tokens.forEach((token, index) => {
    const surface = String(token?.surface_form ?? token?.surface ?? "");
    const phonetic = String(token?.romanization ?? "");
    const punctuation = isTokenPunctuation(surface);
    const highlighted = index === selectedTokenIndex;
    const matchIndex = surface ? text.indexOf(surface, cursor) : -1;

    if (matchIndex > cursor) {
      chunks.push(renderPunctuationChunk(text.slice(cursor, matchIndex)));
    }

    chunks.push(`
      <button
        class="token${highlighted ? " is-selected" : ""}${punctuation ? " punctuation" : ""}"
        type="button"
        data-token-index="${index}"
        data-token-surface="${escapeHtml(surface)}"
        data-token-reading="${escapeHtml(phonetic)}"
        data-token-punctuation="${punctuation ? "true" : "false"}"
        aria-pressed="${highlighted ? "true" : "false"}"
        ${punctuation ? 'disabled aria-disabled="true"' : ""}
      >
        <span class="token-reading">${escapeHtml(phonetic)}</span>
        <span class="token-surface">${escapeHtml(surface)}</span>
      </button>
    `);

    if (matchIndex >= 0) {
      cursor = matchIndex + surface.length;
    }
  });

  if (cursor < text.length) {
    chunks.push(renderPunctuationChunk(text.slice(cursor)));
  }

  return chunks.join("");
}

function renderPunctuationChunk(value) {
  const text = String(value ?? "");
  if (!text) {
    return "";
  }

  return Array.from(text)
    .map((character) => {
      if (/^\s+$/.test(character)) {
        return "";
      }

      return `
        <span class="token punctuation" aria-hidden="true">
          <span class="token-reading"></span>
          <span class="token-surface">${escapeHtml(character)}</span>
        </span>
      `;
    })
    .join("");
}

function createToast() {
  let toastElement = null;
  let timer = null;

  return (message) => {
    if (!toastElement) {
      toastElement = document.createElement("div");
      toastElement.className = "preview-toast";
      toastElement.style.position = "fixed";
      toastElement.style.left = "50%";
      toastElement.style.bottom = "18px";
      toastElement.style.zIndex = "50";
      toastElement.style.maxWidth = "min(360px, calc(100vw - 32px))";
      toastElement.style.padding = "12px 16px";
      toastElement.style.borderRadius = "999px";
      toastElement.style.background = "#1f335f";
      toastElement.style.color = "#ffffff";
      toastElement.style.boxShadow = "0 16px 36px rgba(31, 51, 95, 0.28)";
      toastElement.style.fontSize = "14px";
      toastElement.style.fontWeight = "700";
      toastElement.style.opacity = "0";
      toastElement.style.pointerEvents = "none";
      toastElement.style.transform = "translate(-50%, 12px)";
      toastElement.style.transition = "opacity 160ms ease, transform 160ms ease";
      document.body.appendChild(toastElement);
    }

    toastElement.textContent = message;
    toastElement.style.opacity = "1";
    toastElement.style.transform = "translate(-50%, 0)";

    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (!toastElement) {
        return;
      }
      toastElement.style.opacity = "0";
      toastElement.style.transform = "translate(-50%, 12px)";
    }, 1400);
  };
}

window.TextPlexPreviewRouter = {
  routes,
  resolveTargetUrl,
  resolveBackTarget,
  currentBookId,
  ready,
  clamp,
  renderLibraryGridCard,
  renderLibraryListRow,
  infoIcon,
  bookIcon,
  wireHomePreview,
  wireLibraryPreview,
  wireReaderPreview,
  wireLibraryDetailPreview,
  wireSearchPreview,
  wireAnalysisPreview,
  wireImportPreview,
  wireProfilePreview,
  wireVocabularyPreview,
};
