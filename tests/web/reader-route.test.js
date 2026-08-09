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
  assert.match(readerSource, /if \(!pageData \|\| isSentencePunctuation\(token\.surface_form\)\)/);
  assert.match(readerSource, /disabled=\{isPunctuation\}/);
  assert.match(readerSource, /Punctuation \$\{token\.surface_form\}/);
  assert.match(readerSource, /reader-translation-reveal-heading[\s\S]*reader-translation-reveal-text[\s\S]*reader-translation-reveal-actions/);
  assert.match(stylesheetSource, /\.reader-translation-reveal-part\.is-space\s*\{[\s\S]*display: inline-block;/);
  assert.match(stylesheetSource, /\.reader-translation-reveal-actions \.button\s*\{[\s\S]*width: auto;/);
  assert.match(stylesheetSource, /\.token-inline\.is-punct:hover,[\s\S]*box-shadow: none;/);
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
  assert.match(readerSource, /data-inventory-id="reader\.mode-control"/);
  assert.match(readerSource, /data-inventory-id="reader\.token-audio-toggle"/);
  assert.match(readerSource, /reader\.pronunciation-visibility-section/);
  assert.match(readerSource, /reader\.pronunciation-visibility-toggle/);
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

test("Next reader keeps the compact pager as the primary progress signal", () => {
  assert.match(readerSource, /className="reader-sentence-pager"/);
  assert.match(readerSource, /const pagePillLabel = totalPages/);
  assert.match(readerSource, /reader\.reading-progress-module/);
  assert.match(readerSource, /reader-progress-compact/);
  assert.doesNotMatch(readerSource, /reader-progress-card/);
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
  assert.match(readerSource, /definition_short: selectedTokenEnglishMeaning \?\? token\.definition_short \?\? null/);
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
  assert.match(readerSource, /const lexiconEntry = lexiconResult\?\.entries\[0\] \?\? null/);
  assert.match(readerSource, /const tokenSurfaceParts = languageCode\?\.startsWith\("ko"\) \? splitKoreanParticleChain\(token\.surface_form\) : \[\];/);
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
  assert.match(readerSource, /reader-sentence-tool-button \$\{showSentenceTranslation \? "is-active" : ""\}/);
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
