const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const routeSource = fs.readFileSync(
  path.join(repoRoot, "apps", "web", "app", "reader", "[bookId]", "[pageNumber]", "page.tsx"),
  "utf8",
);
const readerSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "reader-view.tsx"), "utf8");
const textplexSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "lib", "textplex.ts"), "utf8");
const accountFooterSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "account-footer.tsx"), "utf8");
const layoutSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "app", "layout.tsx"), "utf8");
const appShellSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "app-shell.tsx"), "utf8");
const themeSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "lib", "theme.ts"), "utf8");
const stylesheetSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "app", "globals.css"), "utf8");
const landingSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "landing-page.tsx"), "utf8");
const inventoryToggleStyles = stylesheetSource.match(/\.inventory-inspector-toggle\s*\{[\s\S]*?\n\}/)?.[0] ?? "";

test("Next reader route passes dynamic book and page parameters to the live reader", () => {
  assert.match(routeSource, /<ReaderView bookId=\{resolvedParams\.bookId\} pageNumber=\{Number\(resolvedParams\.pageNumber\)\} \/>/);
  assert.match(routeSource, /export const dynamic = "force-dynamic"/);
});

test("Next reader meaning line preserves spacing, offers a complete reveal escape hatch, and handles punctuation", () => {
  assert.match(readerSource, /readerMeaningLineRevealAllStorageKey/);
  assert.match(readerSource, /reader\.meaning-line-reveal-all-section/);
  assert.match(readerSource, /reader\.meaning-line-reveal-all-toggle/);
  assert.match(readerSource, /reader\.meaning-line-reveal-all-action/);
  assert.match(readerSource, /function addTranslationTokenSpacing\(tokens: TranslationAlignmentToken\[\]\)/);
  assert.match(readerSource, /const sentenceRevealWordSlots/);
  assert.match(readerSource, /new Set\(sentenceRevealWordSlots\)/);
  assert.match(readerSource, /sentenceRevealAllActive/);
  assert.match(readerSource, /Reveal all/);
  assert.match(readerSource, /function splitAttachedTranslationPunctuation\(token: TranslationAlignmentToken\)/);
  assert.match(readerSource, /normalizeTranslationPunctuation/);
  assert.match(readerSource, /function translationAlignmentMatchesText\(/);
  assert.match(readerSource, /activeSentenceTranslationAlignment = translationAlignmentMatchesText\(/);
  assert.match(readerSource, /translation_alignment: translation\.translation_alignment/);
  assert.match(readerSource, /if \(!pageData \|\| isSentencePunctuation\(token\.surface_form\)\)/);
  assert.match(readerSource, /disabled=\{isPunctuation\}/);
  assert.match(readerSource, /Punctuation \$\{token\.surface_form\}/);
  assert.match(readerSource, /reader-translation-reveal-heading[\s\S]*reader-translation-reveal-text[\s\S]*reader-translation-reveal-actions/);
  assert.match(readerSource, /function translationMeaningOverlapsTarget\(/);
  assert.match(readerSource, /alignmentLooksLikeSelectedMeaning/);
  assert.match(readerSource, /selectedTokenMeaningForReveal/);
  assert.match(stylesheetSource, /\.reader-translation-reveal-card > summary\s*\{[\s\S]*display: flex;[\s\S]*align-items: center;/);
  assert.match(stylesheetSource, /\.reader-translation-reveal-summary-copy\s*\{[\s\S]*display: inline-flex;/);
  assert.match(stylesheetSource, /\.reader-translation-reveal-part\.is-space\s*\{[\s\S]*display: inline-block;/);
  assert.match(stylesheetSource, /\.reader-translation-reveal-actions \.button\s*\{[\s\S]*width: auto;/);
  assert.match(stylesheetSource, /\.token-inline\.is-punct:hover,[\s\S]*box-shadow: none;/);
});

test("Next reader keeps CJK token text at normal weight and style", () => {
  assert.match(stylesheetSource, /\.token-inline\.is-cjk\s*\{[\s\S]*font-weight: 400;[\s\S]*font-style: normal;/);
});

test("Next reader contract keeps loading, error, extraction, lookup, and chart states", () => {
  assert.match(readerSource, /ReaderLoadingSkeleton/);
  assert.match(readerSource, /Preparing page text/);
  assert.match(readerSource, /Reader unavailable/);
  assert.match(readerSource, /Try again/);
  assert.match(readerSource, /\/lexicon\/lookup\?/);
  assert.match(readerSource, /allow_google_fallback=/);
  assert.match(readerSource, /reader\.lookup-fallback-section/);
  assert.match(readerSource, /reader-google-translate-usage/);
  assert.match(readerSource, /Google Translate \(cached\)/);
  assert.match(readerSource, /GOOGLE_APPLICATION_CREDENTIALS/);
  assert.match(readerSource, /ReaderHskChart/);
  assert.match(readerSource, /reader-sentence-tools/);
  assert.match(readerSource, /reader-sentence-tool-button/);
  assert.match(readerSource, /injectSentencePunctuation/);
  assert.match(readerSource, /createPunctuationToken/);
  assert.match(readerSource, /sentenceText\?: string \| null/);
  assert.match(readerSource, /readerPronunciationFreshOnlyStorageKey/);
  assert.match(readerSource, /readStoredReaderTokenAudioOnTap/);
  assert.match(readerSource, /persistReaderTokenAudioOnTap/);
  assert.match(readerSource, /reader\.theme-section/);
  assert.match(readerSource, /reader\.theme-grid/);
  assert.match(readerSource, /reader\.theme-more-button/);
  assert.match(readerSource, /readerThemeRecents/);
  assert.match(readerSource, /readerThemeVisibleOptions/);
  assert.match(readerSource, /readerThemeCanExpand/);
  assert.match(readerSource, /More themes/);
  assert.match(readerSource, /Show less/);
  assert.match(readerSource, /readerTokenAudioOnTap/);
  assert.match(readerSource, /readerTokenAudioIntroSeenStorageKey/);
  assert.match(readerSource, /reader\.token-audio-toast/);
  assert.match(readerSource, /Token audio is on by default/);
  assert.match(readerSource, /readerRussianSyllableDisplayModeStorageKey/);
  assert.match(readerSource, /readStoredRussianSyllableDisplayMode/);
  assert.match(readerSource, /persistRussianSyllableDisplayMode/);
  assert.match(readerSource, /readerJapaneseReadingDisplayModeStorageKey/);
  assert.match(readerSource, /resolveJapaneseReadingDisplayMode/);
  assert.match(readerSource, /readerJapaneseReadingDisplayMode/);
  assert.match(readerSource, /data-inventory-id="reader\.mode-control"/);
  assert.match(readerSource, /data-inventory-id="reader\.token-audio-toggle"/);
  assert.match(readerSource, /reader\.pronunciation-visibility-section/);
  assert.match(readerSource, /reader\.pronunciation-visibility-toggle/);
  assert.match(readerSource, /reader\.japanese-reading-display-section/);
  assert.match(readerSource, /reader\.japanese-reading-romaji/);
  assert.match(readerSource, /reader\.japanese-reading-furigana/);
  assert.match(readerSource, /reader\.speech-voice-toggle/);
  assert.match(readerSource, /readerSpeechVoiceGender/);
  assert.match(readerSource, /voice-gender-toggle-group/);
  assert.match(readerSource, /reader\.sentence-audio-button/);
  assert.match(readerSource, /reader\.sentence-audio-speed/);
  assert.match(readerSource, /sentenceAudioRateOptions/);
  assert.match(readerSource, /useState<SentenceAudioRate>\(0\.75\)/);
  assert.match(readerSource, /adjustSentenceAudioRate/);
  assert.match(readerSource, /reader-audio-speed-stepper/);
  assert.match(readerSource, /reader-audio-speed-button/);
  assert.match(readerSource, /reader\.audio-speed-toast/);
  assert.match(readerSource, /Audio speed:/);
  assert.match(readerSource, /utterance\.onboundary/);
  assert.match(readerSource, /sentenceAudioTokenOrder/);
  assert.match(readerSource, /selectedTokenAudioPlaying/);
  assert.match(readerSource, /selectedTokenSegmentAudioPlaying/);
  assert.match(readerSource, /selectedTokenSegmentAudioText/);
  assert.match(readerSource, /handlePlaySelectedTokenAudio/);
  assert.match(readerSource, /playWordAudio/);
  assert.match(readerSource, /playDefinitionSegmentAudio/);
  assert.match(readerSource, /recordWordAudioPlayback/);
  assert.match(readerSource, /window\.speechSynthesis\.cancel\(\);[\s\S]*\}, \[bookId, pageNumber, selectedSentenceOrder\]\)/);
  assert.match(readerSource, /is-audio-active/);
  assert.match(readerSource, /pronunciation_playback/);
  assert.match(readerSource, /speechSynthesis/);
  assert.match(readerSource, /reader-sentence-source-pill/);
  assert.match(readerSource, /reader-source-sentence-card/);
  assert.match(readerSource, /reader-sentence-translation-card/);
  assert.match(readerSource, /match_confidence/);
  assert.match(readerSource, /sentenceRevealSlotByTokenOrder/);
  assert.match(readerSource, /sentenceRevealWordSlots/);
  assert.match(readerSource, /new Set\(sentenceRevealWordSlots\)/);
});

test("Next reader prefetches adjacent lexicon terms and shares requests with token taps", () => {
  assert.match(readerSource, /readerLexiconPrefetchLookahead = 3/);
  assert.match(readerSource, /lexiconCacheRef = useRef\(new Map/);
  assert.match(readerSource, /lexiconPrefetchRequestsRef = useRef\(new Map/);
  assert.match(readerSource, /requestLexiconLookup/);
  assert.match(readerSource, /selectedSentenceIndex \+ readerLexiconPrefetchLookahead \+ 1/);
  assert.match(readerSource, /allowGoogleFallback \? "true" : "false"/);
});

test("Next reader defaults token audio on without overriding an explicit off choice", () => {
  assert.match(readerSource, /useState\(\(\) => readStoredReaderTokenAudioOnTap\(\)\)/);
  const textplexSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "lib", "textplex.ts"), "utf8");
  assert.match(textplexSource, /getItem\(readerTokenAudioOnTapStorageKey\) !== "false"/);
  assert.match(readerSource, /You can turn it off in Reader settings/);
});

test("Next reader keeps settings in the title row while account access lives in the shared footer", () => {
  const readerHeader = readerSource.match(/<header className="reader-topbar"[\s\S]*?<\/header>/)?.[0] ?? "";
  assert.doesNotMatch(readerHeader, /AccountMenu/);
  assert.doesNotMatch(readerSource, /AccountMenu/);
  assert.match(layoutSource, /<AccountFooter \/>/);
  assert.match(accountFooterSource, /data-inventory-id="shell\.footer"/);
  assert.match(accountFooterSource, /data-inventory-id="shell\.account-menu"[\s\S]*AccountMenu/);
  assert.match(stylesheetSource, /\.app-account-footer \.account-menu-panel\s*\{[\s\S]*bottom: calc\(100% \+ 0\.55rem\)/);
  assert.match(stylesheetSource, /\.reader-settings-button\s*\{[\s\S]*grid-area: settings/);
});

test("Next reader exposes independent token size and spacing preferences", () => {
  assert.match(readerSource, /readerTokenScaleStorageKey/);
  assert.match(readerSource, /readerTokenSpacingStorageKey/);
  assert.match(readerSource, /data-inventory-id="reader\.token-display-settings"/);
  assert.match(readerSource, /data-inventory-id="reader\.token-text-size-control"/);
  assert.match(readerSource, /data-inventory-id="reader\.token-spacing-control"/);
  assert.match(readerSource, /id="reader-token-scale-slider"/);
  assert.match(readerSource, /id="reader-token-spacing-slider"/);
  assert.match(stylesheetSource, /--reader-token-scale/);
  assert.match(stylesheetSource, /--reader-token-spacing/);
  assert.match(stylesheetSource, /\.sentence-row\s*\{[\s\S]*column-gap: calc\(1rem \* var\(--reader-token-spacing, 1\)\)/);
});

test("Next reader expands the session summary into book-scoped stats", () => {
  assert.match(readerSource, /bookProgressSummary/);
  assert.match(readerSource, /sessionSummaryItems/);
  assert.match(readerSource, /reader\.session-summary-toggle/);
  assert.match(readerSource, /reader\.session-summary-details/);
  assert.match(readerSource, /readerSessionGlossedCountStorageKey/);
  assert.match(readerSource, /readerSessionGlossedCount/);
  assert.match(readerSource, /average_seconds_per_session/);
  assert.match(readerSource, /lastReaderInteractionAtRef/);
  assert.match(readerSource, /markReaderInteraction/);
  assert.match(readerSource, /onPointerDownCapture=\{markReaderInteraction\}/);
  assert.match(readerSource, /onClickCapture=\{markReaderInteraction\}/);
  assert.match(readerSource, /onTouchStartCapture=\{markReaderInteraction\}/);
  assert.match(readerSource, /document\.hasFocus\(\)/);
  assert.match(readerSource, /currentPageGlossedCount/);
  assert.match(readerSource, /pageUnglossedPercent/);
  assert.match(readerSource, /pageEtaSeconds/);
  assert.match(readerSource, /bookEtaSeconds/);
  assert.match(readerSource, /reader-session-pill-rail/);
    assert.match(readerSource, /reader-session-pill-stat/);
  assert.match(readerSource, /reader-session-pill-badge/);
  assert.match(readerSource, /Avg session/);
  assert.match(readerSource, /New glossed/);
  assert.match(readerSource, /Page glossed/);
  assert.match(readerSource, /Page unglossed/);
  assert.match(readerSource, /Page ETA/);
  assert.match(readerSource, /Book glossed/);
  assert.match(readerSource, /Language glossed/);
  assert.match(readerSource, /Lifetime glossed/);
  assert.match(readerSource, /Book ETA/);
    assert.match(readerSource, /Book time/);
    assert.match(readerSource, /Resume point/);
    assert.match(readerSource, /Progress/);
    assert.match(stylesheetSource, /\.reader-session-stats\s*\{[\s\S]*grid-column: 1 \/ -1;[\s\S]*width: 100%;/);
    assert.match(stylesheetSource, /\.reader-session-pill-rail\s*\{[\s\S]*overflow-x: auto/);
  });

test("Next reader keeps completion summary fallback labels readable", () => {
  assert.match(readerSource, /bookCoveragePercent == null \? "\\u2014"/);
  assert.match(readerSource, /completionSaving \? "Saving\.\.\." : "Mark as read, archive, and return"/);
  assert.match(readerSource, /archiveBook\(bookId\)/);
  assert.doesNotMatch(readerSource, /bookCoveragePercent == null \? "ÃƒÆ’/);
});

test("Next reader makes the desktop session rail discoverable and draggable", () => {
  assert.match(readerSource, /formatReaderEstimatedDuration/);
  assert.match(readerSource, /return "Unavailable"/);
  assert.match(readerSource, /useReaderCarouselInteractions/);
  assert.match(readerSource, /element\.scrollTo\(\{ left: targetItem\.offsetLeft, behavior: "smooth" \}\)/);
  assert.match(readerSource, /event\.preventDefault\(\);\s+element\.scrollLeft = Math\.max\(0, Math\.min\(maxScrollLeft/);
  assert.match(readerSource, /Drag or scroll to explore/);
  assert.match(readerSource, /aria-describedby="reader-session-carousel-hint"/);
  assert.match(stylesheetSource, /\.reader-carousel-hint\s*\{[\s\S]*display: none;/);
  assert.match(stylesheetSource, /@media \(hover: hover\) and \(pointer: fine\)/);
});

test("Next reader exposes sentence, page, and book progress in a draggable visual carousel", () => {
  assert.match(readerSource, /const readerVisualProgressItems = useMemo/);
  assert.match(readerSource, /id: "sentence"[\s\S]*label: "Sentence progress"/);
  assert.match(readerSource, /id: "page"[\s\S]*label: "Page progress"/);
  assert.match(readerSource, /id: "book"[\s\S]*label: "Book progress"/);
  assert.match(readerSource, /useReaderCarouselInteractions\(readingProgressRailRef\)/);
  assert.match(readerSource, /data-inventory-id="reader\.progress-carousel"/);
  assert.match(readerSource, /data-inventory-id="reader\.progress-card"/);
  assert.match(readerSource, /Drag or scroll to compare progress/);
  assert.match(stylesheetSource, /\.reader-progress-rail\s*\{[\s\S]*overflow-x: auto/);
  assert.match(stylesheetSource, /\.reader-progress-card\s*\{[\s\S]*scroll-snap-align: start/);
});

test("Next reader lets learners hide and restore session statistics with keyboard support", () => {
  assert.match(readerSource, /readerSessionSummaryLayoutStorageKey\(bookId\)/);
  assert.match(readerSource, /persistReaderSessionSummaryHiddenItemIds/);
  assert.match(readerSource, /handleHideSessionSummaryItem/);
  assert.match(readerSource, /handleShowSessionSummaryItem/);
  assert.match(readerSource, /aria-label=\{`Hide \$\{item\.label\}`\}/);
  assert.match(readerSource, /aria-label=\{`Restore \$\{item\.label\}`\}/);
  assert.match(readerSource, /aria-keyshortcuts="ArrowLeft ArrowRight"/);
  assert.match(readerSource, /reader-session-pill-action-label/);
  assert.match(stylesheetSource, /\.reader-session-pill-stat-button:focus-visible,[\s\S]*\.reader-session-pill-edit:focus-visible/);
  assert.match(stylesheetSource, /\.reader-session-pill-rail\s*\{[\s\S]*touch-action: pan-x/);
  assert.match(stylesheetSource, /\.reader-session-pill-stat-button\s*\{[\s\S]*scroll-margin-inline/);
});

test("Next reader keeps reading profile statistics legible and selectable", () => {
  assert.match(readerSource, /readerProfileStatisticsViewStorageKey/);
  assert.match(readerSource, /resolveReaderProfileStatisticsView/);
  assert.match(readerSource, /data-inventory-id="reader\.reading-profile-card"/);
  assert.match(readerSource, /data-profile-statistics-view=\{readerProfileStatisticsView\}/);
  assert.match(readerSource, /Statistics view/);
  assert.match(readerSource, /Simple/);
  assert.match(readerSource, /Detailed/);
  assert.match(readerSource, /data-profile-metric-id="seconds-per-word"/);
  assert.match(stylesheetSource, /\.profile-metrics\s*\{[\s\S]*grid-template-columns: repeat\(auto-fit/);
  assert.match(stylesheetSource, /\.profile-metrics \.eyebrow[\s\S]*overflow-wrap: anywhere/);
  assert.match(stylesheetSource, /\[data-profile-statistics-view="simple"\][\s\S]*data-profile-metric-id="seconds-per-word"/);
});

test("Next reader keeps the compact pager alongside the visual progress carousel", () => {
  assert.match(readerSource, /className="reader-sentence-pager"/);
  assert.match(readerSource, /const pagePillLabel = totalPages/);
  assert.match(readerSource, /reader\.reading-progress-module/);
  assert.match(readerSource, /reader-progress-compact/);
  assert.match(readerSource, /reader-progress-card/);
});

test("Next reader gives a later-page opening a visible path back to the beginning", () => {
  assert.match(readerSource, /const beginningPageNumber = 1/);
  assert.match(readerSource, /data-inventory-id="reader\.beginning-action"/);
  assert.match(readerSource, /Start at beginning/);
  assert.match(readerSource, /pageNumber > beginningPageNumber/);
});

test("Next reader definition traces wrap long lookup paths inside the card", () => {
  assert.match(stylesheetSource, /\.definition-popover\s*\{[\s\S]*min-width: 0;[\s\S]*max-width: 100%/);
  assert.match(stylesheetSource, /\.definition-trace-list\s*\{[\s\S]*overflow-wrap: anywhere;[\s\S]*word-break: break-word/);
});

test("Next reader keeps a small themed canvas inset without a full-viewport reader overlay", () => {
  assert.match(stylesheetSource, /\.app-frame:has\(\.reader-shell\) \.app-shell-content\s*\{[\s\S]*gap: 0/);
  assert.match(stylesheetSource, /\.app-frame:has\(\.reader-shell\) \.reader-shell\s*\{[\s\S]*min-height: calc\(100vh - 1\.5rem\);[\s\S]*border-radius/);
  assert.match(stylesheetSource, /body::before\s*\{[\s\S]*position: fixed;[\s\S]*background-image/);
  assert.doesNotMatch(stylesheetSource, /\.reader-canvas::before\s*\{/);
  assert.doesNotMatch(stylesheetSource, /body:has\(\.reader-shell\)::before\s*\{[\s\S]*display: none/);
});

test("Next reader keeps wallpaper out of the transparent title and author header", () => {
  const readerHeader = readerSource.match(/<header className="reader-topbar"[\s\S]*?<\/header>/)?.[0] ?? "";
  assert.match(readerSource, /<div className="reader-canvas">/);
  assert.match(readerSource, /<\/header>\s*\n\s*<div className="reader-canvas">/);
  assert.match(readerHeader, /reader-topbar-copy/);
  assert.match(stylesheetSource, /\.reader-shell\s*\{[\s\S]*background: transparent;[\s\S]*background-color: transparent/);
  assert.doesNotMatch(stylesheetSource, /\.reader-shell::before\s*\{/);
});

test("Next reader definition card stays compact and exposes the save action", () => {
  assert.match(readerSource, /data-inventory-id="reader\.token-inspector"/);
  assert.match(readerSource, /className=\{`definition-save/);
  assert.match(readerSource, /data-inventory-id="reader\.study-save-button"/);
  assert.match(readerSource, /data-inventory-id="reader\.definition-remembered-button"/);
  assert.match(readerSource, /data-inventory-id="reader\.definition-missed-button"/);
  assert.match(readerSource, /\/learning\/study-items/);
  assert.match(readerSource, /\/learning\/word-interactions/);
  assert.match(readerSource, /selectedTokenEnglishMeaning/);
  assert.match(readerSource, /definition_short:/);
  assert.match(readerSource, /selectedTokenEnglishMeaning \?\?/);
  assert.match(readerSource, /token\.definition_short/);
  assert.match(readerSource, /Saved to default list/);
  assert.match(readerSource, /Mark word as remembered/);
  assert.match(readerSource, /Mark word as missed/);
  assert.match(readerSource, /definition-trace/);
  assert.match(readerSource, /Definition trace/);
  assert.doesNotMatch(readerSource, /<dl className="definition-grid">/);
  assert.doesNotMatch(readerSource, />\s*Clear\s*<\/button>/);
  assert.match(stylesheetSource, /\.definition-save,\s*\.definition-audio,\s*\.definition-feedback-button\s*\{[\s\S]*width: auto;[\s\S]*padding-inline: 0\.8rem;[\s\S]*white-space: nowrap;/);
  assert.match(stylesheetSource, /\.definition-segment-toggle\s*\{[\s\S]*text-transform: uppercase;/);
  assert.match(stylesheetSource, /\.definition-segment\.is-audio-active\s*\{/);
  assert.match(stylesheetSource, /\.definition-feedback-remembered\s*\{[\s\S]*color: #117a3c;/);
  assert.match(stylesheetSource, /\.definition-feedback-missed\s*\{[\s\S]*color: #b42318;/);
});

test("Next reader keeps definition load timing admin-only", () => {
  assert.match(readerSource, /type DefinitionLookupTiming/);
  assert.match(readerSource, /definitionLookupTiming/);
  assert.match(readerSource, /isAdmin && definitionLookupTiming/);
  assert.match(readerSource, /Lexicon \{definitionLookupTiming\.lexiconMs\} ms/);
  assert.match(readerSource, /Google Translate \{definitionLookupTiming\.googleTranslateMs\} ms/);
  assert.match(stylesheetSource, /\.definition-load-timing\s*\{/);
});

test("Next reader romanizes Korean token readings instead of falling back to Hangul", () => {
  assert.match(readerSource, /function romanizeHangulText\(text: string\): string/);
  assert.match(readerSource, /function splitKoreanParticleChain\(surface: string\): string\[\]/);
  assert.match(readerSource, /function buildTokenReadingParts\([\s\S]*languageCode\?: string \| null,/);
  assert.match(readerSource, /readingOverride\?\.trim\(\) \|\|[\s\S]*token\.romanization\?\.trim\(\)/);
  assert.match(readerSource, /function getLexiconTraceSource\(/);
  assert.match(readerSource, /function isRussianText\(value: string\): boolean/);
  assert.match(readerSource, /function splitRussianTransliterationIntoParts\(reading: string\): string\[\]/);
  assert.match(readerSource, /resolutionSource\?: LexiconLookupResponse\["resolution_source"\] \| null\): string/);
  assert.match(readerSource, /const lookupTerms = selectedToken/);
  assert.match(readerSource, /selectedToken\.lemma \?\? ""/);
  assert.match(readerSource, /const selectedTokenReadingParts = selectedToken[\s\S]*buildTokenReadingParts/);
  assert.match(readerSource, /const selectedTokenReading = normalizeDisplayReading\(/);
  assert.match(readerSource, /const selectedTokenReadingDisplayParts = selectedToken/);
  assert.match(readerSource, /const lexiconEntry = lexiconSelection\.entry/);
  assert.match(readerSource, /const tokenSurfaceParts = tokenLanguageCode\?\.startsWith\("ko"\) \? splitKoreanParticleChain\(token\.surface_form\) : \[\];/);
  assert.match(readerSource, /const tokenReadingParts = buildTokenReadingParts\(/);
  assert.match(readerSource, /const isTokenPronunciationMuted =/);
  assert.match(readerSource, /<span className="token-surface">[\s\S]*token\.surface_form/);
  assert.match(readerSource, /token-surface-segments/);
  assert.match(readerSource, /token-reading-segments/);
  assert.match(readerSource, /className=\{`token-reading \$\{isTokenPronunciationMuted \? "is-muted" : ""\}\`}/);
  assert.match(readerSource, /definition-meta-reading-line/);
  assert.match(readerSource, /definition-headword-reading/);
  assert.match(readerSource, /definition-segments/);
  assert.match(readerSource, /definition-segment-toggle/);
  assert.match(readerSource, /Show original Cyrillic syllables/);
  assert.match(readerSource, /Show romanized syllables/);
  assert.match(readerSource, /Play syllable audio for/);
  assert.match(readerSource, /Russian reading breakdown/);
  assert.match(readerSource, /reader\.word-audio-button/);
  assert.match(readerSource, /Play word audio/);
  assert.match(readerSource, /Stop word audio/);
  assert.match(readerSource, /readerTokenAudioOnTap && !isSentencePunctuation\(token\.surface_form\)/);
  assert.match(readerSource, /getLexiconTraceSource/);
  assert.match(readerSource, /formatLexiconMatchConfidence/);
  assert.match(readerSource, /Match confidence:/);
  assert.match(readerSource, /Google Translate \(cached\)/);
  assert.match(readerSource, /Google Translate \(live\)/);
  assert.match(readerSource, /reader-sentence-pager/);
  assert.match(readerSource, /reader-session-stats/);
  assert.match(readerSource, /handleToggleSentenceTranslation/);
  assert.match(readerSource, /handleToggleSentenceBookmark/);
  assert.match(readerSource, /readerGoogleTranslateFallback/);
  assert.match(readerSource, /const tokenPinyin = selectedTokenReadingParts\.length/);
  assert.match(readerSource, /const selectedTokenPronunciationLine = selectedTokenReadingParts\.map\(\(part\) => part\.text\)\.join\(" "\);/);
  assert.match(readerSource, /Google Translate \(live\)/);
  assert.match(themeSource, /APP_THEME_RECENT_STORAGE_KEY/);
  assert.match(themeSource, /APP_THEME_RECENTS_CHANGE_EVENT/);
  assert.match(themeSource, /readStoredAppThemeRecents/);
  assert.match(themeSource, /persistAppThemeRecents/);
});

test("Next reader can chain sentence audio by adjacent token language while preserving book-level audio", () => {
  assert.match(readerSource, /readerMixedLanguageSentenceAudioStorageKey/);
  assert.match(readerSource, /data-inventory-id="reader\.mixed-language-audio-toggle"/);
  assert.match(readerSource, /function buildMixedLanguageSpeechSegments\(/);
  assert.match(readerSource, /const mixedLanguageSegments = readerMixedLanguageSentenceAudio/);
  assert.match(readerSource, /applyPreferredSpeechVoice\(utterance, segment\.languageCode, readerSpeechVoiceGender\)/);
  assert.match(readerSource, /speechSegments\.forEach\(\(segment, index\) =>/);
  assert.match(readerSource, /text: activeSentence\.text,\s+tokenRanges: speechTokenRanges/);
});

test("Next reader detects Korean tokens inside another language and routes their lookup and audio correctly", () => {
  assert.match(readerSource, /function resolveTokenLanguageCode\([\s\S]*tokenLanguageCode\?: string \| null,[\s\S]*\): string \| null/);
  assert.match(readerSource, /const normalizedTokenLanguage = tokenLanguageCode\?\.trim\(\)\.toLowerCase\(\);/);
  assert.match(readerSource, /if \(isKoreanText\(surface\)\) \{\s+return "ko";/);
  assert.match(readerSource, /const tokenLanguageCode = resolveTokenLanguageCode\(token\.surface_form, languageCode, token\.language_code\)/);
  assert.match(readerSource, /return "ru";[\s\S]*return "he";[\s\S]*return "ar";/);
  assert.match(readerSource, /return normalizedFallback === "en" \|\| normalizedFallback === "yo" \|\| normalizedFallback === "no" \|\| normalizedFallback === "sv" \|\| normalizedFallback === "fi"/);
  assert.match(readerSource, /lang=\{tokenLanguageCode \|\| undefined\}/);
  assert.match(readerSource, /const languageCode = resolveTokenLanguageCode\([\s\S]*selectedToken\.language_code,[\s\S]*\) \?\? pageData\.book\.language_code;/);
  assert.match(readerSource, /language_code=\$\{encodeURIComponent\(languageCode\)\}/);
  const playWordAudio = readerSource.match(/function playWordAudio\(token: TokenResult\): void \{[\s\S]*?\r?\n  \}\r?\n\r?\n  function playDefinitionSegmentAudio/)?.[0] ?? "";
  assert.match(playWordAudio, /resolveTokenLanguageCode\(token\.surface_form, pageData\.book\.language_code, token\.language_code\)/);
  const playDefinitionSegmentAudio = readerSource.match(/function playDefinitionSegmentAudio\(part: TokenReadingPart\): void \{[\s\S]*?\r?\n  \}\r?\n\r?\n  function handlePlaySelectedTokenAudio/)?.[0] ?? "";
  assert.match(playDefinitionSegmentAudio, /resolveTokenLanguageCode\(selectedToken\.surface_form, pageData\.book\.language_code, selectedToken\.language_code\)/);
});

test("Next reader preserves Nordic fallback language and speech locales", () => {
  assert.match(textplexSource, /if \(languageCode\.startsWith\("no"\)\) \{\s+return "nb-NO";/);
  assert.match(textplexSource, /if \(languageCode\.startsWith\("sv"\)\) \{\s+return "sv-SE";/);
  assert.match(textplexSource, /if \(languageCode\.startsWith\("fi"\)\) \{\s+return "fi-FI";/);
});

test("Next reader keeps Japanese surface, reading, lemma, and meaning aligned", () => {
  assert.match(readerSource, /function selectLexiconEntryForToken\(/);
  assert.match(readerSource, /function splitJapaneseReadingAlternatives\(/);
  assert.match(readerSource, /entryAlternatives\.some\(\(alternative\) => normalizeLexiconComparisonValue\(alternative\) === tokenReading\)/);
  assert.match(readerSource, /const exactSurfaceEntries = entries\.filter\(\(entry\) => entry\.surface_form\.trim\(\) === surface\)/);
  assert.match(readerSource, /A kana-only surface such as は must not inherit a kanji homograph such as 歯/);
  assert.match(readerSource, /selectedToken\.surface_form,[\s\S]*selectedToken\.lemma \?\? ""/);
  assert.match(readerSource, /Meaning withheld: this Japanese form has multiple possible readings or meanings\./);
  assert.match(readerSource, /Meaning withheld: the dictionary result belongs to a different Japanese form\./);
});

test("Next reader shows Japanese furigana for a selected kanji token", () => {
  assert.match(readerSource, /finalizeJapaneseRomaji\(selectedTokenReading\)/);
  assert.match(readerSource, /selectedTokenFurigana/);
  assert.match(readerSource, /className="definition-headword-furigana"/);
  assert.match(readerSource, /aria-label={`Furigana: \$\{selectedTokenFurigana\}`}/);
  assert.match(stylesheetSource, /\.definition-headword-furigana\s*\{/);
});

test("Next reader lets Japanese readers switch token readings between romaji and furigana", () => {
  assert.match(readerSource, /type JapaneseReadingDisplayMode = "romaji" \| "furigana";/);
  assert.match(readerSource, /japaneseReadingDisplayMode: JapaneseReadingDisplayMode = "romaji"/);
  assert.match(readerSource, /languageCode\?\.startsWith\("ja"\) && japaneseReadingDisplayMode === "furigana"/);
  assert.match(readerSource, /const tokenReadingParts = buildTokenReadingParts\([\s\S]*readerJapaneseReadingDisplayMode,/);
  assert.match(readerSource, /selectedTokenReading,[\s\S]*readerJapaneseReadingDisplayMode,/);
  assert.match(readerSource, /readerJapaneseReadingDisplayMode === "furigana" && selectedTokenFurigana/);
  assert.match(readerSource, /Choose romaji or hiragana furigana/);
  assert.match(readerSource, />\s*Romaji\s*</);
  assert.match(readerSource, />\s*Furigana\s*</);
  assert.match(stylesheetSource, /\.reader-reading-mode-toggle\s*\{/);
});

test("Next reader separates page and sentence bookmarks with confirmation feedback", () => {
  assert.match(readerSource, /readerPageBookmarksStorageKey/);
  assert.match(readerSource, /readerSentenceBookmarksStorageKey/);
  assert.match(readerSource, /data-inventory-id="reader\.page-bookmark"/);
  assert.match(readerSource, /data-inventory-id="reader\.sentence-bookmark"/);
  assert.match(readerSource, /Page bookmark saved to your page list\./);
  assert.match(readerSource, /Sentence bookmark saved to your sentence list\./);
  assert.match(readerSource, /data-inventory-id="reader\.bookmark-toast"/);
});

test("Next reader keeps font selection in the options panel", () => {
  assert.doesNotMatch(readerSource, /font-mode-toggle/);
  assert.match(readerSource, /reader-font-option/);
  assert.match(readerSource, /handleSetReaderFont/);
});

test("Next reader supports horizontal sentence swipes without blocking vertical scroll", () => {
  assert.match(readerSource, /handleSentenceTouchStart/);
  assert.match(readerSource, /handleSentenceTouchEnd/);
  assert.match(readerSource, /Math\.abs\(deltaX\) < 48/);
  assert.match(stylesheetSource, /\.reader-page-text[\s\S]*touch-action: pan-y/);
  assert.match(stylesheetSource, /\.reader-sentence-tools[\s\S]*\.reader-source-sentence-card/);
});

test("Next reader groups word mode, translation, source, and speed controls beneath the session summary", () => {
  const sentenceTools = readerSource.match(/<div className=\{`reader-sentence-tools[\s\S]*?<div[\s\S]*?className="sentence-row"/)?.[0] ?? "";
  assert.match(readerSource, /reader_capabilities/);
  assert.match(readerSource, /readerSupportsCharacterMode/);
  assert.match(readerSource, /reader-sentence-tools \$\{readerSupportsCharacterMode \? "has-token-mode" : ""\}/);
  assert.match(sentenceTools, /data-inventory-id="reader\.token-mode-button"/);
  assert.match(sentenceTools, /data-inventory-id="reader\.sentence-audio-button"/);
  assert.match(sentenceTools, /data-inventory-id="reader\.sentence-audio-speed"/);
  assert.match(sentenceTools, /token-mode-toggle/);
  assert.match(stylesheetSource, /\.reader-sentence-tools\s*\{[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) minmax\(5\.2rem, 1\.4fr\)/);
  assert.match(stylesheetSource, /\.reader-sentence-tools\.has-token-mode\s*\{[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) minmax\(5\.2rem, 1\.4fr\)/);
  assert.match(readerSource, /reader-token-mode-glyph/);
  assert.match(readerSource, /reader-tool-label/);
  assert.match(readerSource, /reader-sentence-translation-card[\s\S]*reader-sentence-source-pill/);
  assert.match(stylesheetSource, /\.reader-sentence-translation-meta\s*\{[\s\S]*display: flex;/);
});

test("Next reader illuminates translation and source tools only while their cards are visible", () => {
  assert.match(readerSource, /reader-sentence-tool-button[\s\S]*?\$\{showSentenceTranslation \? "is-active" : ""\}/);
  assert.match(readerSource, /aria-label="Toggle sentence translation"/);
  assert.match(readerSource, /aria-label="Toggle source sentence"/);
  assert.match(readerSource, /sentenceTranslationLoading \? "Loading\.\.\." : "Translation"/);
  assert.match(readerSource, /<span className="reader-tool-label">Source<\/span>/);
  assert.doesNotMatch(readerSource, /Hide translation/);
  assert.doesNotMatch(readerSource, /Hide source/);
  assert.match(stylesheetSource, /\.reader-audio-speed-stepper\s*\{[\s\S]*grid-template-columns: 1\.2rem minmax\(2\.1rem, 1fr\) 1\.2rem/);
  assert.match(stylesheetSource, /\.token-inline\.is-audio-active\s*\{/);
  assert.match(stylesheetSource, /\.reader-shell \.reader-sentence-tool-button:not\(\.is-active\):hover/);
  assert.match(stylesheetSource, /\.reader-sentence-tool-button:not\(\.is-active\):focus-visible[\s\S]*outline-color: var\(--line\)/);
});

test("Next reader applies one bounded tooltip behavior across reader controls", () => {
  assert.match(readerSource, /reader-tooltip-target/);
  assert.match(readerSource, /data-tooltip="Back"/);
  assert.match(readerSource, /data-tooltip="Reader settings"/);
  assert.match(readerSource, /data-tooltip=\{readerPageBookmarked \? "Remove page bookmark"/);
  assert.match(readerSource, /reader-tooltip-target--compact/);
  assert.match(readerSource, /readerTooltipTouchDismissDelayMs = 1400/);
  assert.match(readerSource, /readerTooltipTimersRef/);
  assert.match(readerSource, /data-tooltip-open/);
  assert.match(stylesheetSource, /\.reader-tooltip-target::after[\s\S]*content: attr\(data-tooltip\)/);
  assert.match(stylesheetSource, /\.reader-tooltip-target:hover::after,[\s\S]*\.reader-tooltip-target:focus-visible::after/);
  assert.match(stylesheetSource, /\.reader-tooltip-target\[data-tooltip-open="true"\]::after/);
  assert.match(stylesheetSource, /@media \(hover: none\), \(pointer: coarse\)/);
  assert.match(stylesheetSource, /\.reader-page\s*\{[\s\S]*overflow: visible/);
  assert.doesNotMatch(readerSource, /aria-label="Play sentence audio"[\s\S]{0,260}title=/);
});

test("Next reader adapts long titles to a balanced two-line header", () => {
  assert.match(readerSource, /function resolveReaderTitleScale\(title: string \| null \| undefined\): number/);
  assert.match(readerSource, /--reader-title-scale/);
  assert.match(stylesheetSource, /-webkit-line-clamp: 2/);
  assert.match(stylesheetSource, /text-wrap: balance/);
});

test("Inventory label toggle now lives in settings instead of the landing and shell headers", () => {
  assert.doesNotMatch(landingSource, /InventoryInspectorToggle/);
  assert.doesNotMatch(appShellSource, /InventoryInspectorToggle/);
  assert.doesNotMatch(appShellSource, /isDemoMode/);
  assert.match(inventoryToggleStyles, /position: static;/);
  assert.match(inventoryToggleStyles, /width: max-content;/);
  assert.doesNotMatch(inventoryToggleStyles, /position: fixed;/);
});
