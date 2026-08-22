# Changelog

## 2026-08-22

- Added ESLint 10 compatibility handling for the Next.js flat configuration so web linting remains operational during the major-version upgrade.
- Added reviewed Hebrew pronunciation overrides with transliteration fallback and avoided unsupported Google romanization requests.
- Corrected stale Hebrew page-token readings so reviewed pronunciation overrides update both displayed reading fields.
- Added a provenance-preserving JMdict XML import path with projected Japanese readings, meanings, parts of speech, and source metadata.
- Added explicit reversible completion for page-by-page reading frontiers, reset completion when new pages are appended, and return a useful 400 response for unreadable photo batches.
- Added the 0.1.2 tester build briefing and a shared route-aware page guide with persistent first-visit walkthroughs.

## 2026-08-21

- Corrected Japanese Reader readings for numeric months such as `1月` and city-name `市` context while preserving valid JMdict reading alternatives.

## 2026-08-20

- Simplified book detail pages for learners by replacing processing metadata with language, page, date, and reading-overview details, and shortening actions to open, restart, refresh, and library.
- Simplified library cards around learner-facing page/update context and reading state, with labeled Details, Open, and Archive actions.
- Changed library card headers to separate language/type pills and classify extensionless generated or Wikipedia content as Article instead of exposing slug fragments such as BAR.
- Moved reading status into the library card header, paired authors with page counts, and reordered actions to Archive, Details, Open.
- Renamed the library card's active reading status from In progress to Reading.
- Library cards now show sentence counts for one-page static articles and page counts for other reading items.
- Refined archive card action pills so Open and Restore to library remain readable and separated on narrow screens.
- Added a horizontal Delete action to archived cards with confirmation before permanent removal.
- Renamed the archive restore action to Restore and added language/content-type archive filters.
- Added an active-library/archive workflow: static content can be archived at completion or from book detail, archived items can be restored, and page-by-page sources remain appendable instead of being auto-archived.

## 2026-08-20

- Added a configurable minimum character threshold and bounded retry behavior so random Wikipedia imports skip articles that are too short to support a useful reading session.
- Added a dedicated editable Goals workspace with four period-based targets, progress visuals, completion framing, and a clear home “See All” destination.
- Reframed the Progress page around a plain-language reading insight, in-page evidence jumps, and contextual Study/Activity follow-ups instead of generic hero navigation.
- Reworked book pace comparisons into labeled, mobile-friendly reading-pace panels that explain the current-book and same-language averages.
- Added per-book page/sentence pace comparisons to progress and profile book cards, including same-language averages across the learner's recorded books.
- Formatted book reading time as compact hours/minutes/seconds values instead of raw seconds on live and demo progress/profile rows.

- Added [`docs/LEXICAL_IDENTITY_AND_MULTILINGUAL_TRUST_ROADMAP.md`](docs/LEXICAL_IDENTITY_AND_MULTILINGUAL_TRUST_ROADMAP.md), documenting the lexical-identity foundation, current usability impact, explicit limitations, data-boundary rules, acceptance criteria, and the sequenced roadmap from book-truth propagation through learner-state reconciliation (#60).
- Strengthened the app-wide visual hierarchy after the initial density pass: shared route heroes now use an editorial content-and-metrics split with a clear primary action, the public landing hero gives Reader and Study previews distinct visual weight, and section headings are more visibly grouped while retaining the existing TextPlex type, theme, and card language.

## 2026-08-19

- Added route-aware first-visit page guides for Home, Library, Reader, and Study, using a dismissible carousel with pagination dots, local visit state, and a persistent reopen trigger.
- Bumped the web build to `0.1.2` and added a tester-only return briefing that shows grouped changes since the tester last acknowledged a previous build, with account-scoped local visit state.
- Corrected the Android tablet browser-chrome investigation: TextPlex emits valid dynamic theme metadata, but Chrome's large-screen tab UI can intentionally reject page-provided colors; retained the standards-compatible metadata without the unnecessary tag-replacement workaround.
- Reinserted the runtime `theme-color` meta tag on theme switches so Android Chrome can observe changes after the page is already open.
- Made the Next viewport emit one active theme-aware browser color so Android Chrome tablet chrome follows the selected TextPlex theme.
- Added spacing between Study metadata labels and values so level, chunk, frequency, saved, and confidence details remain readable (#88).
- Centered the Study pronunciation-guide card contents to match the meaning card layout (#88).
- Added an in-field Japanese Romaji/Hiragana pronunciation toggle (#88).
- Removed the duplicated composed-answer text from the Japanese input helper card (#88).
- Centered and enlarged revealed answers, and clarified that a Japanese reading is not a written-form answer in meaning-to-word practice (#88).
- Added a context-aware written-form candidate button when a Japanese reading matches the current card (#88).
- Made kana-only Japanese word-to-reading cards request the romanized reading instead of repeating the same Hiragana form (#88).
- Added a backward-compatible lexical identity contract for processed tokens, including stable versioned keys, part-of-speech and sense separation, provenance, confidence, ambiguity status, and tokenizer version metadata. Newly tokenized words now carry an explicitly uncertain surface-fallback identity while historical learner events remain unchanged (#60).
- Tightened app-wide spacing and organization across member, tester, and admin surfaces: compact route heroes and card stacks, aligned Library actions, structured Settings/Profile controls, full-width Activity charts, and a shorter split build/feedback footer; updated dynamic route props for Next.js 16.3 production builds.
- Expanded Chinese digit-by-digit romanization to all numeric Reader tokens, including months and days (#142).
- Applied Chinese cardinal-number readings outside year context, so `12月`, `20日`, and `30分` use `shí èr`, `èr shí`, and `sān shí` (#142).

- Preserved precomposed and combining Latin accents during processor tokenization, including automatic recovery of stale Yoruba page artifacts (#147).
- Preserved Chinese personal-name runs before parenthetical glosses, including the reported `李善中` Reader case (#141).

## 2026-08-18

- Guarded the Reader meaning-line reveal against stale or incorrect alignment segments so a tapped word's sentence hint stays compatible with its displayed definition.

- Changed PDF imports to progressive extraction: file metadata and the first readable page are ready before the upload returns, then the API maintains a two-page reader-driven extraction window instead of processing an entire book immediately (`import.form`).
- Added direct reader page jumps with a target-first extraction path and queued previous/next page buffers for non-sequential reading (`reader.page-jump-control`).
- Created issue #153 for the user-facing Japanese conjugation experience and linked it to the lexicon concept and tracker; project-board placement remains pending the `project` GitHub scope.

- Made hosted account-storage failures retryable and diagnosable rather than opaque 502s, and let learners who complete beta onboarding continue to their return route while storage recovers (#123).
- Added a Japanese conjugation engine and read-only API endpoint that model godan, ichidan, する, and 来る families with explainable rule IDs and lexical overrides for exceptions such as 行く and ある.
- Added the user-provided Afterlife JLPT N1/Jōyō reference workbook to the Japanese lexicon source pack with provenance notes; it remains a source workbook pending conversion into the canonical importer format.
- Documented the Japanese lexicon import concept, including the separate Memrise Non-WK source family, source-set lineage, workbook tab selection, metadata model, and implementation phases under `docs/JAPANESE_LEXICON_IMPORT_CONCEPT.md`.

- Cleared PR #150 CI failures by formatting the Python quality lane and restoring the onboarding error contract with updated Wikipedia error handling coverage.

- Fixed mobile feedback screenshot uploads by accepting trusted JPEG MIME aliases or missing MIME metadata, and surfaced API validation details in the feedback dialog.

- Added a billable-services inventory and provider credential-monitoring plan covering OpenAI feature costs, Google Cloud Translation, Supabase, project boundaries, and the next steps for feature-scoped keys.

- Added feature-specific OpenAI key resolution for OCR, translation alignment, practice articles, feedback analysis, and theme generation, with the named development key and legacy shared-key migration fallback.

- Split Google Cloud Translation credentials between `GOOGLE_TEXTPLEX_PROD_TRANSLATION` and `GOOGLE_TEXTPLEX_PROD_ROMANIZATION`, including separate Docker mounts and the legacy shared credential fallback.

- Switched all TextPlex OpenAI runtime defaults and generated-surface fixtures to GPT-5.6 Luna; OCR was already on Luna.

- Fixed photographed page extraction failures caused by OCR responses exhausting the output budget, prevented progress from advertising a page before its artifact was readable, and repaired the affected `兄弟` page 7 locally.

## 2026-08-17

- Increased page-photo OCR output capacity to prevent reasoning-heavy responses from exhausting the transcription budget, and made page artifacts atomic and recoverable when a background extraction fails.

- Streamlined page-by-page reading with an inline plus/arrow upload control, viewport-aware camera or file-picker selection, circular OCR progress, first-page continuation, and background batch completion feedback.

- Made page-by-page extraction recoverable when OpenAI returns an empty response: OCR retries once, API failures return a provider-specific error instead of an unhandled 500, and Reader refresh resumes uncached pages without reprocessing successful pages.

- Made one-tap quick feedback non-blocking: the dialog closes immediately, background submission reports “Feedback sent!” in a brief toast, and failures receive an actionable error toast.

- Made quick feedback submission visibly stateful: the selected option now shows a spinner and “Sending…” state, success stays in the dialog, and the delayed footer toast is removed.

- Warmed the default Lexicon during API startup and serialized first-use initialization so background reader prefetches do not make the first definition lookup wait on concurrent SQLite seeding.

- Portaled feedback dialogs to the document body and locked background scrolling so every feedback action opens as a viewport modal instead of expanding inside the build footer card.

- Added an admin-only definition-card timing pill for Lexicon lookup and Google Translate live/cached fallback latency.

- Prefetched Lexicon lookups for the focused sentence and the next three sentences, sharing cached and in-flight results with token taps while honoring the Google Translate fallback setting.

- Standardized Reader tooltips across navigation, sentence tools, bookmarks, audio controls, and token actions with a shared stacking layer, native-title removal, and a short touch dismissal window for mobile.

- Kept the Reader meaning line aligned with the active translation by rejecting stale translation alignments and repairing mismatched cached alignment data.

- Fixed escaped OCR line breaks being rendered as visible escaped line-break tokens and bumped the extraction pipeline version to rebuild affected page artifacts.

- Tightened the feedback dialog layout and shortened its quick-report copy for faster scanning.

- Added one-tap common issue choices to the Reader word-feedback dialog, including missing or incorrect pinyin/reading, meaning, and segmentation reports with structured feedback reasons and an optional detailed note path.

- Changed the page-by-page reader boundary into a dedicated end-of-content transition state instead of rendering the upload flow below the current sentence; session stats remain visible with explicit continue, previous-page, and exit actions.

- Replaced corrupted completion-summary fallback strings with bounded readable labels so `reader.completion-summary-card` no longer renders mojibake when coverage is unavailable or completion is saving.

- Prevented empty page-by-page imports by resizing large camera images for OpenAI OCR, rejecting image-only pages without usable OCR text, and rebuilding the affected page summary.

- Fixed page-by-page extraction stalls by processing appended page images independently of the original PDF, marking unexpected background errors as failed, and synchronizing completed extraction progress counters.

- Added a paused reader upload state for page-by-page books: session stats remain visible, the timer stops during upload and processing, detailed OCR/local-storage stages are shown, and the right arrow resumes reading only after the next page is ready.

- Changed page-by-page append processing to store new page images and extract only uncached pages; the original source PDF remains unchanged and cached page text/artifacts are reused for book summaries.

- Added a durable page-by-page source role with append-page API and reader/book-detail controls so photographed books can grow as the learner reads.

- Routed local web-to-API traffic through same-origin `/api` and added loopback URL fallback so page-by-page uploads work from phones on the LAN.

- Kept page-by-page photo imports usable from non-secure mobile LAN previews by falling back when `crypto.randomUUID()` is unavailable during gallery selection.

- Added an opt-in Reader Settings prototype for chained mixed-language sentence audio, preserving book-level sentence speech when the toggle is off.

- Added script-aware per-token language metadata during sentence tokenization, with reader fallback support for mixed Russian, English, Korean, Chinese, Japanese, Hebrew, and Arabic text.

## 2026-08-16

- Routed mixed-language reader tokens such as Korean text inside Chinese books through their detected language for HTML labeling, lexicon lookup, and token pronunciation audio.

## 2026-08-15

- Added the proposed TextPlex dynamic-pricing report, mapping hyper-growth pricing principles to a free core reader, usage-aligned hosted assistance, premium generated practice, theme/content commerce, expansion signals, and implementation guardrails; tracked as issue #140 in the TextPlex Feature Board Todo column (`docs/TEXTPLEX_DYNAMIC_PRICING_REPORT.md`).

- Rendered the collapsed-reader navigation reveal as a document-level overlay so transformed mobile reader containers cannot pull it over the title.

- Anchored the collapsed-reader navigation reveal tab to the viewport’s top edge so it no longer covers long book titles.

- Tightened the mobile reader header inset so the book title sits closer to the top of the reading space.

- Kept mobile hamburger navigation rows visually neutral after route selection, while preserving hover, focus, and expanded-menu feedback.

- Clarified the agent workflow to rebuild and reboot Docker web/API services after every runtime-visible change before announcing it is ready for verification.

- Corrected the mobile hamburger panel’s CSS cascade so its centered absolute positioning is not overridden by the shared app-shell card rule.

- Corrected the hamburger alignment follow-up by centering the panel against the full mobile shell action row while preserving click access to the shell controls.

- Contained hamburger-menu feedback notifications within the mobile panel and wrapped long report titles and messages instead of clipping them horizontally.

- Condensed feedback notifications to report titles with Admin Feedback and GitHub actions; GitHub issue generation now shows progress before redirecting to the created issue.

- Made notification-to-Admin Feedback links smoothly scroll to the selected report below the sticky shell instead of opening at the console header.

- Centered the mobile hamburger navigation panel within the app shell instead of aligning it to the menu toggle.

- Refetched the authenticated Library data after account hydration and account switching so each account sees its own books and progress.

- Recovered missing library registry entries from durable per-book metadata so existing account books remain visible after a stale registry file.

## 2026-08-14

- Switched the weekly goal card to current-week page counts and added a short end-of-week reset date.

- Made weekly page goals open-ended and show `100%+` when reading exceeds the configured target.

- Kept the Library filter button right-aligned when its filter panel opens.

- Made Home goal cards share one compact mobile row and added an inline editor that persists the weekly page goal through settings.

- Moved Send feedback into the build card, added the build timestamp, and added a live time-since-build indicator before the account and copyright footer.

- Refined the build card into distinct build, built-at, and time-since-build rows, with Send feedback right-aligned at half width.

- Compressed the mobile home surface so the headline, search, empty states, and goals appear with less vertical padding.

- Tightened the mobile `/import` hero so its capability summary and navigation use less vertical space.

- Right-aligned the Library, Read, and Study chevron markers in the mobile hamburger menu to match Markets and More.

- Closed GitHub issue #135 after verifying the Settings feedback button source renders only the decorative star and `Send feedback` label; synchronized the feedback record and tracker to Done.

- Limited each Theme Shop collection rail to five paired theme cards, added category-specific scrollable grid pages behind the rail arrows, and added inline Day/Night controls for paired themes.

- Split `/themes` into a dedicated Theme Shop storefront with shop-specific navigation, catalog metrics, preview promises, collections, ownership, and pricing, while keeping personal behavior controls under My Themes at `/profile/themes`.

- Corrected the mobile hamburger panel sizing so it opens as a full-width dropdown beneath the sticky shell instead of collapsing inside the transformed action area.

- Kept the mobile hamburger panel below the sticky TextPlex header and added a Markets group above More with Theme Shop plus coming-soon Book, Course, and Translation shops.

- Unified every hamburger navigation group under one inline expansion state so Library, Read, Study, and More share the same row treatment and only one group opens at a time.

- Aligned Library, Read, and Study with the More menu behavior so each navigation row expands below itself without shifting the shell controls.

- Documented Docker Compose as the authoritative local runtime for phone/browser QA, including the required web and API container restart workflow.

- Linked five new actionable feedback reports to GitHub issues #135–#139 and placed them in Todo on the TextPlex Feature Board; issue bodies were sanitized to omit tester identifiers and internal record IDs.

- Replaced the persistent two-row app navigation with a compact hamburger shell menu that keeps Library, Read, Study, and secondary destinations available through expandable chevron groups.

- Raised the feedback notification overlay above shell controls, made its scroll track explicit, and added direct GitHub routing for feedback authors from the notification panel.

## 2026-08-13

- Added member/tester onboarding role selection backed by the server-only Supabase Auth Admin API; tester onboarding refreshes the trusted role and sends one idempotent verification report to the admin feedback console with the authenticated account role attached.

- Added first-class TXT upload support with UTF-8 validation, form-feed page boundaries, deterministic page images, normalized extraction artifacts, API/shared capability metadata, and Import UI coverage.

- Linked four actionable feedback groups to GitHub issues #128–#131, consolidating duplicate percentage and `楽しそう` reports; excluded two feedback-tool test submissions from the issue tracker.

- Reworked the Library hero with an upper-right filter menu for language, reading progress, and book status, and replaced the practice-article generator controls with a single Import action routed to `/import`.

- Removed the heavier CJK token weight in the Reader so Japanese, Chinese, and Korean characters use the same normal text weight as the surrounding sentence.

- Made hosted account-storage failures retryable and diagnosable rather than opaque 502s, and let learners who complete beta onboarding continue to their return route while storage recovers (#123).

- Corrected Japanese `五分` Reader enrichment to use `gofun` for five-minute expressions while preserving contextual `gobu` and `gobun` readings and definitions; added regression coverage (#125).

- Kept the top-shell feedback notification panel within narrow mobile viewports by using safe-area-aware viewport anchoring at 640px and below; added focused 384px responsive contract coverage (#126).

- Kept the top-shell feedback notification panel in a fixed viewport layer at wider phone and tablet widths as well, so opening it never expands or clips the app shell.

- Rendered the top-shell feedback notification panel through a document-level portal so it remains a true viewport overlay above the glass shell on mobile; added responsive contract coverage.

- Enlarged the feedback-dialog close control to a 48px target with a legible icon and stable responsive sizing; added focused contract coverage for `shell.feedback-close-button` (#124).
## 2026-08-12

- Prepared the React 19 dependency upgrades with JSX compatibility fixes; deferred TypeScript 7.0.2 because the current Next ESLint toolchain does not support it yet.

- Added P2 integration evidence workflow: focused local boundary suites cover auth, ownership, Supabase adapters, learner sync, commerce/webhooks, backup/restore, and web contracts; optional hosted probes cover readiness, authenticated profile ownership, learner sync, entitlements, multi-user separation, and deployment routes.

- Added Dependabot coverage for npm, both Python packages, and GitHub Actions, and pinned every third-party workflow action to an immutable commit SHA.

- Centralized CI quality lanes into reusable Python, web, and container workflows; added a checked-in route smoke manifest, workflow/action-pin validation, and an always-running CI gate for scalable branch protection.

- Expanded CI and weekly audit coverage to build and smoke-test the canonical Next routes, accept the documented API readiness payload, fail on high-severity production npm vulnerabilities, and review dependency changes on pull requests.

- Remediated the high-severity PostCSS/nanoid dependency path by updating the root PostCSS range to `^8.5.23`; production npm audit now reports zero vulnerabilities.

- Enabled GitHub vulnerability alerts, verified the dependency-review rerun, and added that check to the required `main` status checks.

- Added a deterministic Next web contract-test runner and wired all `tests/web/*.test.js` coverage into CI and the weekly audit as the first P0 GitHub Actions hardening slice.

- Protected `main` with required pull requests and CI status checks, administrator enforcement, and force-push/deletion safeguards.

- Verified the GitHub Pages repository setting with successful manual `main` build and deployment run 31644287876; recorded the remaining hosted-action Node deprecation warning for follow-up.

- Documented the required GitHub Flow sequence for repository work: branch, commit, push, and draft pull request, with explicit safeguards for `main` and mixed worktrees.

- Restore wallpaper artwork in the public landing-page reader and study previews by preserving their absolute image layers; verified against `landing.hero-previews`, `landing.hero-reader-preview`, and `landing.hero-study-preview`.

- Clarified that image and camera reading imports should begin from the existing Import panel, with annotated image viewing available after processing (`import.form`, `docs/IMAGE_READING_AND_SCENE_IMPORT_CONCEPT.md`).

- Defined the image reading and scene-text import concept for camera batches, multi-page reading items, layout-aware OCR, and linked callouts for street signs, storefronts, menus, and pamphlets; tracked as issue #100 (`docs/IMAGE_READING_AND_SCENE_IMPORT_CONCEPT.md`).

- Fixed CI Ruff import-order failures across the analytics, feedback, and API test modules.

- Resolved the PR #99 merge conflict with the latest `main`, preserving the Reader's Japanese Romaji/Furigana controls, furigana visibility preference, and legacy preference migration.

## 2026-08-11

- Simplified targeted reader feedback labels to star + `Sentence` and star + `Word`, removing the keyboard-letter cue from contextual and global feedback buttons.

- Japanese romaji composition now expands macronized long vowels, so input such as `chō` is composed and validated as `ちょう` alongside `chou`.

- Added targeted reader correction feedback actions for sentences and selected words. Both actions use the existing feedback dialog, show the star/F feedback cue, prefill the relevant reading context, and persist the target type, exact text, and order for review in the admin detail (`reader.sentence-feedback-button`, `reader.definition-correction-button`, `admin-feedback.detail`).

- Fixed glossed-word study saves to resolve fallback meanings from the visible source token before lemma alternatives and preserve an existing meaning when a later save has no definition.

- Added a tester-only build update gate that records each tester's last acknowledged build, presents plain-language changes grouped by area, and blocks the app until the tester acknowledges a new build (`shell.tester-build-update-gate`, `shell.tester-build-update-sections`, `shell.tester-build-update-section`, `shell.tester-build-update-items`, `shell.tester-build-update-acknowledge`).

- Incremented the web build to `0.1.1` so testers with a previously acknowledged `0.1.0` build receive the grouped update review.

- Added a Japanese-only Reader setting to switch sentence and selected-word readings between romaji and hiragana furigana (`reader.japanese-reading-display-section`, `reader.japanese-reading-romaji`, `reader.japanese-reading-furigana`).

- Added an explicit Wikipedia-language selector inside the random article card, separate from paste/upload language, and made random article imports tolerate auxiliary lexicon/analytics failures instead of surfacing an internal server error (`import.wikipedia-random-card`, `import.wikipedia-random-button`).

- Improved import request errors so API-provided guidance, including the random Wikipedia retry message, is shown in the reader instead of only the HTTP status (`import.wikipedia-random-card`).

- Simplified the random Wikipedia import explanation so the action describes adding a random selected-language Wikipedia article to the library without implementation jargon (`import.wikipedia-random-card`).

- Fixed Japanese furigana display for selected readings ending in `n`, such as `sasshin`, so the definition card shows `ん` instead of a trailing Latin `n` (`reader.token-inspector`).

- Fixed primary navigation dropdowns so the Library menu opens beneath the Library control instead of starting at the chevron segment (`shell.primary-nav`, `shell.primary-nav-menu`).

- Fixed the selected Japanese Reader token inspector so kanji tokens show a visible furigana line derived from their stored reading (`reader.token-inspector`).

- Fixed theme-catalog selection so a tester can choose a hosted theme such as Hong Kong City, see the global theme picker update, and save that selection to the account-wide settings (`theme-settings.app-theme-card`, `theme-shop.catalog-card`).

- Added a selected-target-language random Wikipedia article importer that fetches a readable main-namespace article server-side, sends it through the normal book/extraction pipeline, and exposes progress on the Next import surface (`import.wikipedia-random-card`, `import.wikipedia-random-button`). Added API and web contract coverage.

- Prevented the paste-text import form from submitting while Supabase authentication is still resolving or missing, replacing the raw `/texts/import` `401` with a clear sign-in/session message (`import.form`).

- Fixed zoomed-out Home spacing by preventing the desktop home grid's auto-sized rows from stretching across the full viewport (`home.page`, `home.continue-reading`, `home.continue-reading-list`, `home.goals`).

- Clarified the password-reset completion state with a dedicated “Password updated” heading, success message, and primary continuation action (`auth.reset-password-success`).

- Fixed the mobile shell header layout so the feedback notification button keeps a dedicated action slot and no longer overlaps the centered TextPlex brand (`shell.header`, `shell.brand`, `shell.feedback-notifications`).

- Fixed the progress book list to honor account ownership, preventing books imported under another account from appearing in the current learner’s progress (`progress.books-card`, `progress.book-item`).

- Added readable Y-axis values, an optional Points toggle, and theme-colored pill scrollbar styling to the admin reading-activity line chart (`admin.activity-card`).

- Restored consistent responsive padding on the Admin theme console catalog, definition, assisted-design, and visual-system cards.

- Added EPUB book import: spine-ordered XHTML is parsed as readable text, OPF title/author metadata is retained, local reader page images are generated, and PDF/EPUB upload plus import-surface contracts are exposed (`import.form`).

- Added a reproducible generator for a 120-sentence Japanese EPUB sample at `scripts/generate_japanese_epub.py`.

- Reflowed the Japanese EPUB sample from numbered list items into one continuous paragraph per chapter while preserving all 120 sentences.

- Added Japanese Study romaji composition for supported reading answers, preserving direct kana entry and caret movement while showing the composed text; correct answers now display a cancellable 1.8-second auto-advance countdown (`study.practice-input-composition`, `study.practice-auto-advance`, `study.practice-auto-advance-cancel`, issue #88). Added focused composition and route-contract tests.

- Joined each primary navigation destination to its chevron so Library, Read, and Study render as one continuous pill instead of separate button pills (`shell.primary-nav`, `shell.primary-nav-menu`).

- Added role-aware feature-demand analytics and a bottom-of-card audience selector so admins can compare captured feature usage across all users, members, testers, or admins (`admin.analytics-feature-card`, `admin.analytics-feature-filter`).

- Refined the admin reading-activity line chart with a stable wide aspect ratio and more balanced vertical spacing so its curve no longer stretches unnaturally across the panel (`admin.activity-card`).

- Fixed primary navigation dropdowns so their card menus remain floating layers like More instead of expanding the navbar button pill (`shell.primary-nav-menu`).

- Removed import-time full-book Google Translate preloading after a 310-page import generated 965 translation requests. Imports now rely exclusively on the Reader’s bounded current-plus-three-sentence translation buffer.

- Consolidated shell navigation with Library, Read, and Study chevron menus for import/search, analysis, practice, and progress, leaving More focused on overflow and account destinations (`shell.primary-nav`, `shell.primary-nav-menu`, `shell.secondary-nav`).

- Added the authenticated `/tester` console with submitted-feedback history, TextPlex response timelines, verification actions, and summary counts; exposed it in More with an unread red-dot indicator alongside the notification bell (`tester.page`, `tester.summary`, `tester.record-list`, `tester.detail`, `shell.feedback-notifications`).

- Moved the tester feedback notification bell from the footer into the persistent top app-shell actions so feedback updates remain visible while navigating (`shell.feedback-notifications`).

- Enlarged the notification bell icon, anchored the top-shell popover below its button within the viewport, and made the panel opaque for readable feedback updates (`shell.feedback-notifications`).

- Raised the notification action layer above the primary navigation so its open popover remains readable instead of being covered by nav content (`shell.feedback-notifications`).

- Added a shared admin sub-navigation bar across Platform usage, Feedback, Themes, and Roadmap, with active-section highlighting (`admin.nav`).

- Added local feedback-console filters for tester, language, route, category, severity, priority, screenshots, and GitHub state, plus review/resolution timing, backlog, route, category, and language metrics (`admin-feedback.filters`, `admin-feedback.metrics`).

- Added the internal implementation-review loop: always-visible footer build number, `Ready for tester review` status, admin build/instruction fields, notification-bell verification responses, and local tracker to-dos for GitHub/email setup (`shell.build-footer`, `admin-feedback.resolution`, `shell.feedback-notifications`).

- Added the feedback-console admin roadmap and implemented the first triage slice: status summary counts with quick filters plus an explicit resolution-note editor for final decisions (`docs/FEEDBACK_CONSOLE_ADMIN_ROADMAP.md`, `admin-feedback.summary`, `admin-feedback.resolution`).

- Compressed the admin feedback tester directory into expandable rows with inline pencil/check/cancel nickname editing (`admin-feedback.tester-list`).

- Expanded feedback attachments to three local screenshots per report and added an admin-only screenshot gallery with explicit on-demand OpenAI visual analysis, keeping automatic text triage image-free (`shell.feedback-screenshot`, `admin-feedback.screenshots`).

- Added optional screenshot attachments to the shared feedback dialog and multipart feedback API, with client/server image-type validation, a 5 MB limit, local attachment storage, and the `shell.feedback-screenshot` inventory entry.

- Fixed generated-article topic handling so English topic briefs are interpreted as subject matter rather than copied into Japanese quotation marks or treated as vocabulary; added prompt and fallback regression coverage and rebuilt the live Docker services.

- Added a regression test for model responses that report one sentence when the generator requested 30, and rebuilt the local Docker web/API services so the live preview uses the current generator validation.

- Added a generation vocabulary-source toggle so learners can disable profile-term injection and generate from an exam ladder such as JLPT N5–N1; the level-only mode defaults Japanese to JLPT N4 when no level is selected and records the choice in generation metadata.

- Tightened generated practice articles after Japanese learner feedback: the default length is now 10 sentences, Japanese model output must match the requested sentence count and pass basic naturalness checks, and the offline Japanese fallback uses grammatical reading sentences instead of concatenated vocabulary terms.

- Moved admin analytics implementation issue #97 to In Progress and synchronized the concept note, issue tracker, and component inventory with the local analytics surfaces.

## 2026-08-10

- Added the admin analytics and paid-value concept note, verbatim product direction plus the technical plan for event instrumentation, cohort/funnel APIs, retention, paywall intent, and protected admin-console surfaces; tracked in issue #97 and TextPlex Feature Board In Progress (`docs/ADMIN_ANALYTICS_AND_PAID_VALUE.md`).
- Implemented the first local analytics slice: append-only event storage, server-side activation/learning/AI/feedback emitters, protected admin analytics overview API, and admin funnel, value, paywall, feature-demand, retention, and pseudonymous watchlist cards (`admin.analytics-funnel-card`, `admin.analytics-value-card`, `admin.analytics-paywall-card`, `admin.analytics-feature-card`, `admin.analytics-retention-card`, `admin.analytics-user-watchlist`).

- Reoriented the admin reading activity chart into a left-to-right daily bar graph with relative scaling (`admin.activity-card`).

- Restored consistent responsive padding across the admin feedback hero, filters, tester directory, report list, and detail cards (`admin-feedback.page`, `admin-feedback.filters`, `admin-feedback.tester-list`, `admin-feedback.record-list`, `admin-feedback.detail`).
- Added the same responsive card insets to the admin usage hero, summary cards, activity panel, breakdown panel, and loading/error states (`admin.hero`, `admin.profile-summary-card`, `admin.reading-summary-card`, `admin.reading-depth-card`, `admin.exposure-summary-card`, `admin.activity-card`, `admin.breakdown-card`).
- Added a Bars/Line toggle to the admin reading-activity chart, including a smooth day-by-day line with point tooltips (`admin.activity-card`).

- Fixed admin role hydration to re-read the authenticated Supabase user, use the server-resolved role for protected surfaces, and show a permission diagnostic when the account is authenticated without the trusted `admin` role.

- Improved Japanese generated-reading conventions: prompts now require natural `「」` dialogue punctuation and no inserted word spaces, template fallbacks avoid artificial Japanese spacing, and UniDic grouping keeps nominal suffixes such as `私たち` together in the Reader (`reader.token`, `reader.source-sentence-card`).

- Prevented mobile app-resume network hiccups from replacing an already-completed beta onboarding session with the setup error screen; completion is cached per account and revalidated in the background (`onboarding.page`).

- Granted admin accounts explicit all-theme review access in the catalog and settings save path, including a clear `Admin review` status for premium themes.

- Fixed wallpaper loading so the catalog and initial paint use lightweight WebP thumbnails, then promote the active canvas to the full-resolution wallpaper after preload (`theme-shop.selected-preview`).

- Replaced the low-resolution tomato wallpaper with a versioned 1440×2560 v2 asset and matching catalog thumbnail (`theme-shop.selected-preview`).

- Changed the default canvas grid preference to off while preserving explicit user opt-ins (`theme-settings.behavior-card`).

- Fixed six Ruff import-order violations in the API, theme-admin services, and new admin tests so the GitHub Actions Python check can complete after its test step.

- Prepared the current feedback, admin, onboarding, theme, reader, and learner-sync feature batch for pull-request review: aligned web contract tests with the live route boundaries, verified API/processor/site/web/build checks, and renumbered the reconciliation migration to avoid a duplicate local migration version.

- Added a bounded Reader translation buffer: opening or advancing a sentence now resolves that sentence plus the next three in the background, persists the per-sentence cache, and carries the window across page boundaries without preloading an entire book.

- Hardened learner synchronization with a local per-event reconciliation ledger, stable retry scheduling, retained failure details, and explicit local-event-authority documentation. Expanded the hosted `learning_events` contract to accept vocabulary-study and word-interaction events while preserving RLS and idempotent upload keys.

- Added the Cloudflare plugin recommendation record under `docs/plugins/cloudflare/` and established a repository convention for plugin-authored Markdown artifacts in dedicated, plugin-labeled folders.

- Replaced the Japanese script-boundary heuristic with UniDic-backed morphological analysis, then grouped inflection and grammar tails into reader-level words while keeping independent particles separate. Existing Reader artifacts automatically re-tokenize when reopened (`reader.token`, issue #60).

- Added a trusted-device account switcher to the shared TextPlex account menu: saved Supabase sessions can be switched instantly, another account can be added without losing the current login, and inactive sessions can be removed from the device.

- Added an authenticated profile email-change request flow backed by Supabase Auth, with fixed callback routing, current/new inbox confirmation messaging, and inventory coverage; learner databases remain keyed by immutable user IDs.

- Completed the beta tester feedback loop: authenticated tester submissions now have an end-to-end regression path into the admin review queue, `/admin/feedback` uses the shared admin access boundary, and focused web/API coverage protects submission, review, status updates, and tester notifications.

- Added the first admin-only theme console at `/admin/themes`: hosted theme metadata and visual-token editing, native color/brightness controls, draft preview, reference-image upload, and server-side OpenAI concept suggestions that return structured theme tokens for review before saving. Added admin-only Supabase write policies and focused API coverage; live learner rendering from hosted tokens and asset storage remain the next phase.

- Added an admin-only Platform Usage console at `/admin`, with API-enforced aggregate metrics for profiles, reading activity, books, feedback, and translation usage; added admin navigation and inventory coverage.

- Reflowed Reader reading-profile statistics into responsive, wrapped metric cards and added a persisted Simple/Detailed view preference for issue #89 without removing the underlying metrics.

- Clarified Reader session-statistics editing for issue #90 with visible Hide/Restore actions, arrow-key shortcut metadata, and preserved book-scoped layout persistence.

- Preserved Japanese Reader context for issue #92 by prioritizing visible-surface lookup, rejecting mismatched kana/kanji candidates, and adding distinct particle (wa) and tooth (ha) lexicon entries with API and Reader regression coverage.

- Corrected the consolidated Supabase theme-seed artifact after detecting a generated-file truncation marker inside a visual-token JSON value; rebuilt it directly from all 13 source migrations and verified all sections are present.
- Generated a consolidated manual Supabase script for the remaining theme catalog and visual-token seed migrations at `artifacts/textplex-theme-seed-20260810.sql`.
- Added an explicit target-language choice to beta onboarding, including friendly short-code display such as Japanese (JP), and normalized major live language labels so Japanese appears as JP rather than the internal `ja` code.
- Corrected the language display convention: learner-facing labels now retain the canonical lowercase codes, including `Japanese (ja)`, rather than using `JP`.

## 2026-08-09

- Added GitHub issue #95 to the TextPlex Feature Board project #2 in Todo for learner-authored sentence comprehension scoring, structured semantic feedback, server-side evaluation, and a configurable Reader threshold; synchronized the work item into `docs/ISSUE_TRACKER.md`.
- Added independent reader controls for token text size and token spacing, persisted locally so readers can fit annotated sentences more comfortably on narrow screens (`reader.token-display-settings`, `reader.token-text-size-control`, `reader.token-spacing-control`).
- Added a visible Reader “Start at beginning” action for books opened on a later page, exposed the same path from book detail, and prevented unread books from inheriting stale server resume positions (`reader.beginning-action`, issue #93).
- Updated GitHub repository references, feedback links, and authentication checks for the moved private repository `TextPlex/textplex`; the user-owned Feature Board project #2 remains unchanged.
- Clarified Study practice directions for issue #87 with learner-facing word/meaning/reading labels while preserving randomized assessment order and internal axis contracts.
- Accepted Japanese macroned and macronless romaji equivalents in Study answer validation for issue #86 without changing validation rules for other languages.
- Added interaction-only help hints for Reader icon controls in issue #93, with compact sentence-tool hints appearing on hover or keyboard focus only when their text labels are hidden.

- Fixed Japanese reader tokenization so mixed kanji/okurigana words such as 飲み stay together for lookup and romanization instead of rendering as separate 飲 and み readings (`reader.token`). Added processor and API regression coverage.
- Retained the latest book import progress across route changes and reloads, polling it from the shared app shell so the Import page and matching book-detail page keep showing the live percentage until processing completes (`import.progress-card`, `book-detail.import-progress-card`).
- Set GPT-5.6 Luna as the default OpenAI model for page OCR while preserving the `OPENAI_OCR_MODEL` override.
- Scoped the import page's Recent books list to the authenticated account so one user's uploaded content cannot appear in another account's import history, with API regression coverage.
- Accepted the AI triage `usability` category and mapped it to the existing UX GitHub label, with regression coverage for OpenAI Responses parsing.
- Added a required beta tester onboarding step after account creation. It introduces the beta expectations, confirms the selected target language, captures first-use intent, confidence, support preference, and an optional first-week goal, and stores the intake in account-owned settings before protected routes open.
- Added an explicit learning-path choice to beta onboarding so users can review or change their track after signup, with the selected value saved in account-owned onboarding settings.
- Clarified learning paths with explicit signup choices for HSK, JLPT, TOPIK, TRKI, CEFR, general reading, custom paths, and undecided learners; friendly labels now replace the raw `local` track in profile summaries and SQL reporting.
- Made the recently-active Supabase query work without the optional `public.learning_events` table and documented the migration required by event-based queries.
- Added a Supabase schema-readiness check and public-table migration map to the SQL reference so missing hosted tables can be identified and enabled in dependency order.
- Added Dan’s Japanese-focused tester feedback to TextPlex Feature Board Todo as issues #86-#94, covering Study axis terminology, romanization variants, romaji-to-hiragana input and auto-advance, context-aware readings, profile-stat layout, Reader control discoverability, horizontal navigation, session-stat customization, and Japanese Library 404s. Added the related Japanese segmentation reproduction to #60 and synchronized `docs/ISSUE_TRACKER.md`.

## 2026-08-09

- Added GitHub issue #85 to TextPlex Feature Board project #2 in Todo for a first-run tutorial and replayable product tour, and synchronized the work item into `docs/ISSUE_TRACKER.md`.
- Added required target-language selection during registration, an Other-language suggestion field, shared language options across library/import/auth, and Supabase profile storage for the signup choice.
- Centered the reader sentence-audio speed stepper's plus and minus controls within their circular buttons.
- Added Supabase theme visual-token migrations that seed all catalog themes from the current CSS semantic variables into `public.theme_visual_tokens`, including color scheme, component token JSON, and wallpaper paths for the future theme editor.
- Added opt-in automatic GitHub routing for new feedback, a persisted SMTP daily digest with admin/project links, a protected manual digest endpoint, and regression coverage for retry-safe routing and digest deduplication.
- Added `docs/SUPABASE_USEFUL_QUERIES.md` with 20 read-only operational queries covering users, product roles, profiles, learning activity, theme entitlements, commerce, settings, RLS policies, and database health.
- Organized the Supabase query reference into `User Groups`, `Profiles & Preferences`, `Learning Activity`, `Themes & Commerce`, and `Security & Database Operations` sections.
- Separated learner settings from development tooling: admin-role accounts now see the developer controls, implementation roadmap, wallpaper tuning, and reader definition trace while normal profiles get a simpler user-facing settings and profile experience (`settings.developer-tools-card`, `theme-shop.preview-tuning`, `reader.definition-trace-section`).
- Added a tester directory to the admin feedback workspace with stable tester IDs, private nickname labels, saved nickname editing, and clearer access to tester identity beside each report.
- Renamed the internal product role from `qa` to `tester` across API schemas, shared contracts, permissions, tests, and account-role documentation; legacy `qa` metadata now falls back to `member` until migrated.
- Added a token-safe weekly GitHub access routine: a PowerShell `gh`/project check, optional Windows Task Scheduler registration, and a scheduled GitHub Actions App-token smoke test with an operations runbook.
- Confirmed that TextPlex tracking belongs on the user-owned TextPlex Feature Board project #2 and documented the exact board URL, keeping BinoCart project #1 out of the workflow.
- Created and added GitHub issues #57-#78 to TextPlex Feature Board #2 for the production-candidate concept notes, active local tracker items, language-pack work, audit follow-up, commerce direction, and future platform plans; synchronized their Todo/In Progress states into `docs/ISSUE_TRACKER.md`.

- Removed the CI-only dependency on the ignored `three-body-mini` fixture; phase-6 ownership tests now reuse the tracked `alice-mini` sample while preserving the legacy unowned-record case.
- Added feedback lifecycle operations: richer AI implementation plans, server-backed tester notifications with a feedback bell, an admin feedback console at `/admin/feedback`, protected status transitions with resolution notes, optional GitHub issue creation, and GitHub Project status synchronization hooks.
- Synced six local feedback records into GitHub issues #79-#84, applied route/type/tester labels, added each issue to TextPlex Feature Board project #2 in Todo, and wrote the GitHub links back into the local feedback records.
- Organized feedback records under submitting-user and workflow-status folders, added `in_progress`, `completed`, and `acknowledged` workflow states with status history, and added an admin-only status transition endpoint.
- Added a Reader settings slider for the app-shell navigation hide delay, persisted locally from 1 to 15 seconds and applied immediately to the reader shell (`reader.navigation-hide-delay-section`, `reader.navigation-hide-delay-slider`, `shell.reader-nav`).
- Tightened the meaning-line disclosure header by placing the Meaning line label and chevron on the same centered row.

## 2026-08-08

- Replaced the feedback modal’s text Close action with an accessible icon-only X and kept the Help improve TextPlex eyebrow on one line at phone widths (`shell.feedback-dialog`).
- Moved the shared feedback footer above the account footer so `Send feedback` appears immediately before the account control on mobile and desktop (`shell.feedback-footer`, `shell.footer`).
- Added the shared feedback capture flow (`shell.feedback-button`, `shell.feedback-dialog`) with route/build/reading-context metadata, server-side original-text retention, AI-assisted triage with a deterministic fallback, protected admin listing, and API coverage.
- Reworked the book-detail hero so generated practice articles show a content-type pill, topic-first title, concise reading-focus summary, and article-aware page label; PDF books retain their title and local source-data explanation (`book-detail.page-hero`).
- Reordered the meaning-line reveal card so its instruction comes first, the blanks sit beneath it, and the compact progress, Reveal all, and Reset controls share the next row instead of expanding into full-width buttons on mobile.
- Fixed tapped-word pronunciation fallback so an empty dictionary pronunciation no longer hides the token's romanization in the definition card (`reader.token-inspector`).

- Added an explicit concept-document tracking workflow to `AGENTS.md` and `docs/ISSUE_TRACKER.md`, requiring production-candidate notes to map to a local tracker row and a matching TextPlex Feature Board issue, with a `Local pending` fallback when GitHub access is unavailable.

- Normalized the landing-page Reading and Studying previews to the standard card treatment and stopped large core-theme swatches from repeating edge fragments over the pack colors (`landing.hero-reader-preview`, `landing.hero-study-preview`, `landing.theme-card`).

- Kept the reader Audio/Translation/Source/Speed controls on one line at phone widths, matched the speed pill height to the other controls, and added responsive 文/字 word-mode glyphs with icon-only labels when space is tight.
- Collapsed the entire reader app shell after the idle delay, including the TextPlex brand, back control, theme actions, and primary navigation; the reveal tab now restores the full shell (`shell.chrome`, `shell.header`, `shell.reader-nav`, `shell.reader-nav-reveal`).
- Made reader punctuation non-interactive and immediately revealed in meaning lines, including punctuation attached to translated words, so periods and similar marks no longer trigger dictionary lookups or count as revealable tokens.
- Reduced reader pre-content density by removing the redundant progress-card carousel, keeping the compact page/sentence pager as the primary progress signal, hiding the duplicate resume-point stat, and replacing the average-session mojibake fallback with plain `Unavailable` text (`reader.header`, `reader.session-summary-details`).
- Reintroduced page/sentence visual progress as a slim reader strip and tightened pager, session rail, tool row, and audio-speed spacing so essential controls remain visible without pushing the reading body down the page (`reader.header`, `reader.session-summary-details`, `reader.reading-progress-module`).
- Fixed the reader definition card's dictionary loading state so it shows compact animated shimmer lines instead of a tall empty outlined pill (`reader.token-inspector`).
- Simplified the shared footer account pill so it shows the username and dropdown arrow without repeating the `Account` label inside the pill.
- Consolidated the account pill into the shared footer so signed-in pages show Profile, Settings, and Sign out above the authorization/usage note and copyright mark instead of inside individual route headers.
- Moved the reader account pill below the reading surface so profile, settings, and sign-out remain available without competing with the reading header (`reader.account-menu`).
- Set reader audio to start at 0.75x, moved speed into the Audio/Translation/Source tool row, added minus/plus stepping through 0.25x–1x, and added a speed confirmation toast (`reader.sentence-audio-speed`, `reader.audio-speed-toast`).
- Replaced the barren landing-page theme-shop cards with five interactive theme previews using real core, premium, fruit, seasonal, and Hong Kong theme assets; visitors can switch variants and apply a preview to the landing page, while planned prices are shown as crossed-out preview labels.
- Defaulted reader token audio to On for new readers, preserved explicit Off choices, and added a one-time first-tap notice pointing to Reader settings (`reader.token-audio-toggle`, `reader.token-audio-toast`).
- Corrected reader carousel input handling so wheel gestures stay within horizontally scrollable rails and arrow keys advance to the next or previous pill/card instead of moving by individual text pixels.
- Fixed the reader's average-session placeholder mojibake and added desktop hover guidance, mouse-wheel scrolling, keyboard arrow scrolling, and pointer dragging for the session-summary and reading-progress carousels (`reader.session-summary-details`, `reader.reading-progress-details`).
- Fixed reader meaning-line spacing when aligned translation tokens omit explicit whitespace, corrected positional fallback reveals to target word tokens, and added both a current-sentence `Reveal all` action and a persistent reader setting for full meaning-line reveal.
- Updated the Reader progress carousel to show sentence progress for single-page articles instead of the redundant `P1/1` page-progress card, while preserving page progress for multi-page books.
- Added `docs/MULTILINGUAL_SUPPORT_PLAN.md`, defining separate UI, explanation, target, and content languages along with a language registry, localization strategy, language-pair-aware educational output, and phased implementation plan.
- Clarified the change-record workflow: focused Git commits and GitHub work items carry exact technical history, while this changelog remains a growing local journal of completed repository changes.
- Added a guided reader recovery state for missing books, with direct links to the Library, text import, and practice-article generator, and cleared stale reader resume storage so the navbar Read action returns to the Library.
- Added `docs/VERCEL_GITHUB_DEPLOYMENT_PLAN.md`, documenting the recommended private GitHub, GitHub Actions, Vercel, backend-release, maintenance-window, and rollback workflow for commercial TextPlex hosting.
- Added a reader-only navigation focus behavior: the shared nav stays visible briefly when a reader page opens, then folds into a small theme-aware tab that restores the full navigation on demand.
- Updated the public landing page plan language to introduce Open Book, Deep Read, and Immersion Studio, explain beta access and fair-use allowances, and position custom 30-sentence narratives as the premium creative-practice feature.
- Kept the shared shell back button centered on hover and keyboard focus so it no longer shifts vertically.
- Added `docs/PWA_AND_MOBILE_APP_PATH.md`, documenting the recommended progression from mobile-responsive web app to PWA to Capacitor-based iOS and Android apps, including offline reading, synchronization, CI builds, and store-update boundaries.
- Added a public return path for signed-out visitors: the shared TextPlex brand now opens the public start page, and the auth card offers an “Explore TextPlex” option without calling the page a landing page.
- Added trusted TextPlex member, QA, and admin account roles with QA theme-preview permissions, account-scoped Google Translation usage, and a protected service-usage endpoint; documented QA-account bootstrap steps.
- Added `docs/STRIPE_INTEGRATION_PLAN.md` covering Stripe readiness, authenticated theme ownership, test-mode checkout, webhook fulfillment, and launch gates.
- Documented the TextPlex Creator Marketplace concept for community-published written content, reader themes, and hosted language programs, including shared marketplace infrastructure, differentiated creator workflows, wallpaper-assisted theme authoring, translator participation, and a recommended theme-first MVP sequence.
- Aligned the desktop reader viewport with the centered app frame used by the other authenticated pages.
- Documented the production/preview API environment separation concept, including storage isolation, image promotion, maintenance cutover, and rollback requirements.
- Added a Supabase recovery-session password reset page, routed new reset emails to it, and added expired-link guidance for recovery URLs that land with `otp_expired`.
- Added the recovery account email to the password reset screen so learners can confirm which account they are updating.
- Updated the reset confirmation to show the account name followed by its email address.
- Expanded the third-party service documentation to include Cloudflare, GoDaddy, GitHub Pages, and GitHub Actions alongside the existing Supabase, OpenAI, and Google Cloud Translate data flows.
- Fixed authenticated library scoping so new accounts no longer see legacy unowned documents from another account; added API coverage for authenticated and local-mode visibility.
- Fixed the Python API and processor Ruff failures by cleaning up the generated article and translation alignment services, removing stale test lint noise, and revalidating the API test suite.
- Resolved the remaining CI Ruff 0.16.2 merge-check failures by sorting API imports, tightening generated-article and translation-alignment error handling, and fixing the two affected API tests.
- Fixed theme-shop wallpaper framing and preview loading so 9:16 thumbnails no longer reveal theme gradients and selected themes visibly promote to their full-resolution wallpaper.
- Fixed theme-shop wallpaper thumbnails overlapping card copy by keeping each thumbnail in the swatch layout instead of using an absolute fill layer.

## 2026-08-07

- Moved the theme catalog wallpaper thumbnails inside their swatch containers so the images stay clipped instead of bleeding into neighboring foreground cards on mobile.
- Added an optional shared version footer that shows the current web app version and last reboot/rebuild time at the bottom of pages, plus a Settings toggle to turn it on or off.
- Removed the redundant sign-out button from the Home page header so account exit lives only in the shell More menu.
- Moved the landing-page sign-in entry out of the public hero header and into the shell More menu so the auth action lives with the rest of the overflow navigation.
- Raised the shared account menu above the Library hero content and gave the dropdown a stronger floating surface so it no longer reads as buried behind the search area on mobile.
- Fixed the Library account dropdown so it can float above the search and filter content instead of being clipped behind the hero card.
- Added direct sign-out buttons to the authenticated Home header and the signed-in auth card so account exit is easier to reach from the main surfaces.
- Stretched the landing-page app frame so the footer can sit at the bottom edge of the viewport on the public landing route.
- Swapped the landing footer order so the use notice appears above the copyright line and pushed the footer to the bottom edge of the landing shell.
- Removed the landing-page `Explore Home` CTA and centered the copyright footer so it sits cleanly at the bottom of the landing card.
- Polished the landing footer so it now reads `© 2026 TextPlex` with a concise use notice about books and materials you are authorized to study.
- Drafted a signup policy page in `docs/SIGNUP_POLICY_DRAFT.md` covering permitted uploads, fair-use caveats, processing language, and user responsibility.
- Added a third-party data-flow note in `docs/THIRD_PARTY_DATA_NOTE.md` covering Supabase, OpenAI, and Google Cloud Translate usage.
- Added a privacy policy page in `apps/web/app/privacy/page.tsx`, linked it from sign-up, and mirrored the draft in `docs/PRIVACY_POLICY_DRAFT.md`.
- Created GitHub issue #51 for the signup policy page and linked it to the TextPlex Feature Board.
- Created GitHub issue #52 for the third-party data-flow note and linked it to the TextPlex Feature Board.
- Created GitHub issue #53 for the privacy policy page and linked it to the TextPlex Feature Board.
- Added a small copyright footer at the bottom of the landing page so the page ends with a clear TextPlex mark.
- Combined the subscription and theme-shop sections into one swipeable support unit so the landing page can advertise both support paths without stretching the page vertically.
- Reframed the landing theme section as a theme shop pitch so readers can see that styling is optional and separate from the core reading experience.
- Kept the public landing hero CTAs on one row at narrow widths and ordered them `Sign in` then `Start free` for the mobile view.
- Simplified the public landing hero by removing the extra `Open Home` action and badge pills, and rewrote the reader and study preview cards to use the new TextPlex descriptions.
- Replaced the shell navbar labels with a minimal monochrome icon system that inherits theme color and now shows consistent icons in the primary nav and overflow menu.
- Added Chromium DevTools automatic workspace metadata for the `apps/web` Next app so local source edits can persist back to the repo from `localhost`.
- Documented the DevTools workspace hookup in the web README and local-development guide so the editable source files are easy to find.
- Removed the redundant landing brand row now that the shared navbar already carries the TextPlex brand.
- Tightened the landing hero to the "Read languages. Remember words." promise and paired it with a clearer language-learning support line.
- Rewrote the landing-page copy to lead with reading and recall outcomes, sharpened the feature and CTA language, and made the preview tiles describe the reader/study split more directly.
- Reworked the landing hero back into a split layout and added wallpaper-backed reader and study preview tiles so the landing page shows the product's utility at a glance.
- Aligned the shell back button hover lift with the shared shell icon behavior so it keeps its centered position instead of jumping on desktop hover.
- Flattened the session summary subpills into single-line chips so the session active rail stays one horizontal row instead of stacking label/value onto separate lines.
- Removed the old session progress footprint and tightened the reader progress module into a full-width one-card-at-a-time swipe carousel, while forcing the session active subpill rail to stay on one line.
- Reflowed the reading progress carousel into one full-width snap card at a time and compressed each slide to match the footprint of the main progress strip.
- Reworked the reading progress details into swipeable, snap-to-position visual progress bars for page progress, page sentence progress, and whole-book sentence progress.
- Moved sentence swipe handling onto the token row and made the reading progress details a horizontally swipeable rail so those gestures no longer fight each other.
- Moved the session details carousel into the always-visible session active bar so the swipeable subpills, edit pencil, and saved layout live on the main reader status strip.
- Reworked the reader session details into a horizontally swipeable subpill carousel with an edit/save pencil chip that hides and restores individual stats per book.
- Added reader settings toggles for the compact meaning-line reveal card and the token-inspector definition trace, and collapsed both cards into lighter disclosure-style summaries.
- Made the shared app shell render on every route so the global navbar now appears on landing, auth, library, reader, and all secondary pages.
- Updated the component inventory to mark the shell chrome and header as global shared chrome.
- Removed the duplicate TextPlex/back header from the Library page and kept the account menu inside the library hero instead.
- Aligned the Library hero card surface with the shared shell chrome by matching its card overlay to the navbar styling and deleting the retired topbar rules.
- Aligned the Library shelf cards, language pills, and status pills with the shared shell button tokens so the library surface reads as one system with the navbar.
- Reworked the reader definition card so the gloss save remains the default star action, a chevron opens a custom-list picker, and the part-of-speech pill now appears before the meaning line.
- Repacked the reader definition-card actions so the audio button, star, and custom-list chevron now stay together in one horizontal cluster on the top-right row.

## 2026-08-06

- Suppressed the reader's temporary mojibake flash during translation loading by keeping the meaning line in its loading state until the translation request completes.
- Added an alignment-backed translation reveal flow so the reader now persists source-to-target token mapping from the translation endpoint and can fill the blank line from tapped source words instead of only counting translation words.
- Reworked the reader definition card so the term and pronunciation share the first row, the definition reads as the second row, and the definition trace collapses into a compact disclosure pill.
- Reflowed the reader token inspector so the term stays on row 1 with icon-only audio beside it and the save control pinned to the top right, the pronunciation moves to row 2, the definition moves to row 3, the remembered/missed buttons sit below the meaning, and the definition trace summary spans the full width with a centered chevron and collapsed default state.
- Tightened the reader speech voice picker so it prefers the correct browser language first and only uses the male/female preference as a tie-breaker, which keeps Chinese and other non-English audio from drifting into the wrong language.
- Cleaned the reader summary and trace text after a mojibake regression so the session pill and nearby metadata no longer render as garbled characters.
- Replaced the reader meaning-line mask filler so hidden words render as simple blanks instead of mojibake.
- Added a shared male/female speech-voice preference to the reader audio controls and the Settings surface, with browser-voice selection applied best-effort to sentence, token, and pronunciation playback.
- Reconstructed reader token display punctuation from the sentence text so source punctuation stays visible in the token row when the extracted token list omits it.
- Made the reader's slim progress strip tappable so it now expands into page, page-sentence, and whole-book sentence progress details.
- Cached per-book sentence totals in `BookRecord` after extraction and added a persisted `book_progress` snapshot so `/progress` can read last-page/completion state without reopening extraction files on every request.
- Backfilled the current local registry and progress cache so the running stack picks up the faster home/progress path immediately.
- Short-circuited book opening so the reader and book detail surfaces render as soon as the book shell and first page arrive, while extraction, analysis, progress, and prompt details finish in the background.

## 2026-08-05

- Rendered the `/home` route on the server with preloaded books and progress data, and synced a small auth session cookie so authenticated users do not wait on hydration before the home shell appears.
- Kept the protected app frame visible while Supabase auth resolves so the shell no longer blanks out during session checks, and only redirects once the user is confirmed missing.
- Deferred the theme settings sync work until browser idle time so the initial render can finish before the app reads the hosted `/settings` surface.
- Switched the theme catalog to thumbnail-first wallpaper cards and added a live selected-theme preview that loads the full wallpaper only after selection, with a loading shimmer while the image swaps in.
- Moved the active app wallpaper to thumbnail-sized theme assets on the root layout and theme bootstrap so the page no longer starts by fetching the full-size wallpaper file.
- Added a prototype progressive translation reveal card in the reader so tapping different tokens gradually fills a blank meaning line from the existing sentence translation, and tracked it as `reader.translation-reveal-card`.
- Added a thin reader header progress line that shows current book or article completion percent, and tightened the theme behavior card spacing so its controls no longer crowd each other.
- Implemented the adaptive learner-window article generator with the `/articles/generate` API, learner-window selection logic, and template fallback when OpenAI is unavailable.
- Added the Library page practice article button and status copy so users can generate a 30-sentence target-language article from their current learner window.
- Expanded the Library generator into a settings panel with language, sentence-length, curriculum-ceiling, level, genre, tone, vocabulary-balance, and topic controls.
- Persisted generated-article prompt metadata and exposed it on the book detail and analysis routes so users can inspect the exact request payload, model, curriculum settings, and selected term window.
- Added remembered/missed thumbs feedback to the reader token inspector and rolled the new lookup signals into the learner profile and activity feed.
- Moved GitHub issue #47 to Done on the TextPlex Feature Board and mirrored the tracker update in `docs/ISSUE_TRACKER.md`.
- Increased the internal padding on landing-page feature, pricing, and theme cards so longer copy stays clear of the rounded card edges at wider viewports.

## 2026-08-04

- Added a clean Russian reader sample markdown doc for onboarding and beta smoke tests, and linked it from the marketing reference.
- Created GitHub issue #50 for the typing fluency practice concept and placed it on the TextPlex Feature Board in Todo.
- Added a typing fluency practice concept to the issue tracker and documented the unlock-and-personal-best drill for fast, accurate vocabulary production.

## 2026-08-03

- Stabilized full-screen wallpaper layers against mobile browser address-bar collapse by sizing them to the large viewport, preventing the wallpaper from sliding and exposing the theme color while scrolling.
- Moved browser theme initialization into the document head and synchronized the color-scheme metadata with the selected global theme so Chrome can match light and dark toolbar states.
- Set the initial browser scheme to light so daylight themes do not inherit a dark Chrome toolbar before the selected theme bootstrap runs.
- Persisted the selected theme in a preference cookie and generate the initial browser toolbar color server-side so Chrome receives the active theme on navigation instead of waiting for hydration.
- Migrated existing localStorage-only theme selections into the browser theme cookie during the head bootstrap so current users receive the correct toolbar color on their next navigation.
- Added light- and dark-scheme `theme-color` metadata so Android Chrome can apply the active theme even when the browser itself is in dark mode.
- Fixed browser theme startup so an explicitly selected app theme is used for Chrome's initial toolbar color unless device-theme following is explicitly enabled; declared support for both light and dark browser chrome schemes.
- Added a reader completion summary for the final article/page arrow, with a congrats card, article stats, and a mark-read return-to-library action.
- Clarified the reader completion stats so reading time accumulates across sessions and coverage means the non-glossed share of the article read.
- Exposed book read states as `not_read`, `in_progress`, and `finished` in the progress summary so unread titles no longer disappear from the system view.
- Consolidated the app theme and owned-theme controls into the dedicated `/profile/themes` theme settings page, linked it from the shell brush icon and Settings page, and removed the duplicate theme surface from the general profile/settings views.
- Reworked the shell shortcuts so the brush button opens the consolidated theme settings page and the day/night toggle stays separate on the right.
- Simplified the theme settings shell icon to a brush so it reads more clearly beside the day/night toggle.
- Aligned the app-shell back button with the existing day/night toggle sizing and icon treatment, and kept Home neutral in the nav row.
- Neutralized the Home nav pill in the app shell, added a top-left shell back button, and added a palette-style theme shop shortcut to the right of the day/night toggle.
- Raised the More dropdown above the shell cards and page content so the expanded menu stays visibly on top.
- Normalized the primary nav pills so More stretches to the same width as the other route buttons and the labels size down cleanly to fit.
- Moved the day/night toggle into the shell's top row and tightened the primary nav pill sizing so the Home, Library, Read, Study, and More buttons feel lighter on mobile.
- Merged the app shell brand bar and primary nav into one two-row chrome and tightened the mobile nav so the route labels shrink to fit, with the Home label hidden on small screens.
- Added a reader study-stage coloring toggle so tokens can tint from unfamiliar to mastered based on the weakest SRS stage across their assessment axes.
- Added paired Hong Kong Daylight and Night themes to the Next theme shop using the latest versioned wallpapers, accessible city palettes, opposite-mode switching, API catalog entries, and Supabase migration metadata.
- Added issue #49 for a future native TextPlex Android keyboard/IME, covering theme handoff, language-aware input, local-first privacy, and the boundary between a standalone IME and third-party keyboards such as Gboard or Samsung Keyboard; placed it in the project board Todo backlog.
- Promoted the supplied Hong Kong daylight artwork to version `v3` and updated the catalog resolver, active background, checklist, and regression coverage to use it.
- Regenerated the Beijing night wallpaper to match the attached partner style more closely and appended a new Beijing night tracker row without touching the earlier Beijing entries.
- Generated the Hong Kong daylight wallpaper asset and appended a new Hong Kong tracker row without touching the planned Hong Kong entries.
- Regenerated the Hong Kong daylight wallpaper with a stricter architecture-first prompt and background lock, then appended a new Hong Kong daylight tracker row without touching the earlier Hong Kong entries.
- Generated the Hong Kong night wallpaper from the provided day reference and appended a new Hong Kong night tracker row without touching the planned Hong Kong entries.
- Generated the Shanghai daylight wallpaper asset and appended a new Shanghai tracker row without touching the planned Shanghai entries.
- Regenerated the Shanghai daylight wallpaper with an off-center composition and softer East Asian editorial feel, then appended a new Shanghai daylight tracker row without touching the earlier Shanghai entry.
- Regenerated the Shanghai daylight wallpaper with one Bund group balanced against the modern skyline, then appended a new Shanghai daylight tracker row without touching the earlier Shanghai entries.
- Generated the Shanghai night wallpaper asset and appended a new Shanghai night tracker row without touching the planned Shanghai entries.

## 2026-08-03

- Expanded the reader session summary to show page, book, language, and lifetime glossed counts plus page coverage and ETA estimates.
- Added a total glossed count to the reader session summary so the session pill shows both session-new and total glossed vocabulary data.
- Added a reader-session pill that counts new glossed words added to the glossed vocabulary list during the current book session.
- Added average-session-aware pausing to the reader timers so session and sentence time stop counting after prolonged idle time or when the browser loses visibility/focus, and surfaced the average session length in the expanded session summary.

## 2026-08-02
- Added two authored starter levels for Hebrew, Arabic, Japanese, and Chinese, plus accessible Ready Now term-source colors and a Glossed/Program legend.
- Clamped horizontal overflow on the shared shell and home surface so mobile pages stop bleeding past the viewport edge.
- Removed the public landing-page badge from the landing header so the hero stays focused on the product pitch and primary actions.
- Centered the TextPlex brand in the shared shell and landing headers, removed the inline Live/labels badges from the main chrome, and moved the inventory-labels toggle into Settings.
- Renamed the canonical signed-in landing route from `/portal` to `/home`, kept `/portal` as a redirect shim for compatibility, and updated the shell and auth return paths accordingly.
- Added pronunciation and syllable guides to the study practice card with audio playback on the pronunciation line and syllable chips, and kept the guide limited to first-introduction cards so review surfaces do not leak romanization clues.
- Hardened study practice routing so program cards carry explicit language, program, and level codes, and the practice page now prefers the requested program code before falling back by language to avoid cross-language jumps.
- Made the study practice page read the live URL query on the client and render dynamically so Hebrew practice links cannot fall back to the Russian starter program from stale initial state.
- Added the missing meaning line to program and glossed intro cards so first-introduction study shows the term, meaning, and pronunciation together before assessment starts.
- Turned the intro meaning on the practice card into a labeled callout so it is easier to spot during Hebrew and other starter-program introductions.

- Replaced the overt “portal” wording in the signed-in home surfaces with “Home” copy, audited remaining portal references, and switched the primary nav item to a house icon so the entry point feels calmer and more direct.
- Simplified the shared navigation model so the shell owns one focused primary navigation row, secondary destinations live under More, book context appears only on book routes, and the portal no longer repeats the TextPlex brand or renders a competing bottom navigation bar.
- Fixed the More navigation panel so it floats above the shell card without stretching the other navigation pills to its height.
- Fixed mobile edge bleed by restoring intrinsic nav-pill widths after the global mobile button rule and capping portal content to the viewport.
- Constrained nested route surfaces to the shared mobile frame and prevented long hero copy or action rows from exceeding the viewport.
- Matched the narrow-screen More summary to its equal-width navigation slot so it no longer shrinks below the other primary controls.
- Updated library info and open-book actions to use each theme's shared surface and accent colors instead of fixed gray and yellow fills.
- Restyled the library info and open-book icon controls as circular pill buttons to match the shared button system.
- Increased the contrast of the dotted spider-chart rings in light and dark themes.
- Fixed native theme selector options appearing white-on-white when opened from a dark app theme.
- Renamed the study glossed-vocabulary inventory IDs so the section, row, and axis-chart identifiers now match the new glossed vocabulary terminology.
- Renamed the study saved-vocabulary surface to glossed vocabulary and clarified that it captures terms tapped during reading sessions when the reader needs help.
- Added expandable axis charts to study program items and due-term pills so tapping a term now shows its per-axis SRS stages and supporting metadata.
- Switched the non-negative retry outcome to use answer similarity against the expected response, so near-miss submissions at or above the 75% threshold now retry instead of counting as wrong.
- Added a non-negative retry outcome for mostly learned terms so answers on items that are at least 75% complete can be retried without penalizing the axis.
- Regenerated the cucumber wallpaper as a richer painted botanical wallpaper, saved it as `vegetable-cucumber-v2.png`, and wired the app to use the new version while leaving the original asset in place.
- Regenerated cucumber again with a larger containment buffer, saved it as `vegetable-cucumber-v3.png`, and wired the app to the new version.
- Regenerated cucumber again with the reference-photo margin, saved it as `vegetable-cucumber-v4.png`, and wired the app to the new version.
- Relaxed the wallpaper prompt margin guidance to a general 2% to 4% inset for repeat-friendly content, while still preventing any motif from crossing the border line.
- Generated the Beijing daylight wallpaper asset and appended a new Beijing tracker row without touching the planned Beijing entries.
- Generated the Beijing night wallpaper asset and appended a new Beijing night tracker row without touching the planned Beijing entries.

## 2026-08-01

- Versioned all current wallpaper assets as `v1`, preserved Strawberry revisions through `v6`, and added an explicit latest-wallpaper manifest so theme selection never falls back to unversioned or stale artwork.
- Added a private wallpaper replacement checklist covering all current illustrated theme assets and the planned Spring, Winter, and Chinese-city generation queues under Wallpaper Generation Prompt v3.
- Updated the wallpaper-generation prompt with a reusable master template, strict 100% containment language, narrow perimeter buffers, and clearer full-bleed repeat guidance.
- Added the paired `fruit-strawberry` and `fruit-strawberry-night` themes with daylight/night switching, dark palette roles, PNG wallpaper mapping, shop swatches, and server catalog registration.
- Added a density calibration note to the wallpaper prompt and private tracker so repeat-style catalog themes target roughly 15 to 18 visible motifs while keeping the center readable.
- Relaxed the wallpaper prompt so repeat-style themes can use center coverage when the reading UI overlays the wallpaper, and marked the strawberry replacement row as reviewed with a replacement date.
- Refined the strawberry wallpaper again to reduce excess top and bottom whitespace, then saved the new versioned asset and updated the replacement tracker.
- Tightened the strawberry wallpaper once more for tile-test visibility by pulling edge motifs closer to the top and bottom, then saved v6 and updated the tracker.
- Added a dark fruit-strawberry night variant and tracked it as a new wallpaper row with the blackberry-plum palette.
- Generated a fresh blueberry wallpaper asset and appended a new blueberry entry to the repo tracker mirror without touching the existing blueberry row.
- Generated a blueberry night wallpaper asset and added a separate blueberry night entry to the tracker mirror, leaving the daytime blueberry row intact.
- Generated a fresh citrus wallpaper asset and appended a new citrus entry to the repo tracker mirror without touching the existing citrus row.
- Generated a citrus night wallpaper asset and appended a separate citrus night entry to the repo tracker mirror without touching the existing citrus rows.
- Regenerated citrus night with the subdued night palette rule, saved it as a new versioned asset, and appended a fresh tracker row without touching the earlier citrus night asset.
- Regenerated mango night with the subdued night palette rule, saved it as a new versioned asset, and appended a fresh tracker row without touching the earlier mango night asset.
- Generated a fresh mango day wallpaper asset and appended a new mango entry to the repo tracker mirror without touching the existing mango row.
- Generated a mango night wallpaper asset and appended a separate mango night entry to the repo tracker mirror without touching the existing mango rows.
- Tightened the wallpaper prompt for night variants so future assets stay subdued, low-glare, and muted instead of reading as bright or candy-colored.
- Added city-specific architectural anchors for the Russian and Chinese international theme queues, plus an architecture-first rule that rejects generic arches, anonymous towers, and unrelated water scenes.
- Added exact theme-specific wallpaper background colors to the private tracker and made the dynamic generator prompt require each row's assigned background instead of defaulting to cream.
- Updated wallpaper asset resolution to choose the highest recorded version for each theme, so newer files such as `fruit-strawberry-v7` supersede earlier candidates automatically once registered.
- Added the private `PRIVATE_THEME_STORE_WIRING_TRACKER.tsv` to separate final shop integration status from wallpaper generation status across current and planned themes.
- Replaced the local-only Test Wallpaper asset with the supplied apple, pear, blossom, and maple artwork for wallpaper tiling tests.
- Added a local-only Test Wallpaper option and a persisted Settings toggle for tiling wallpaper artwork, allowing fixed-cover and repeat treatments to be compared without changing reader/card surfaces.
- Tightened the landing page hero and carousel card sizing so the cards stop stretching into excess vertical whitespace and the hero title uses more of its available width.
- Simplified the study practice prompt so the instruction only appears inside the answer field, centered the active term in the card, and switched the mobile keyboard hint by requested response type.
- Simplified the study practice header to show only the current level label and made correct review feedback render in green, including the revealed answer text.
- Increased contrast between the green success box and the revealed answer text in study practice so the two states are visually distinct.
- Tuned the study success banner to use a lighter green fill and darker label text so the confirmation message is readable inside the card.
- Removed the redundant revealed answer line on correct study submissions and centered both the success label and the answer input text.
- Added a distinct wrong-axis study outcome for valid answers given on the alternate axis, and left the axis stage unchanged for that response type.
- Added a glossed-vocabulary detail view with an axis-stage radar chart and made wrong-axis practice attempts reset for an immediate retry.


## 2026-08-02

- Added Google Translate-backed fallback meanings for glossed vocabulary so saved reader terms can enter study even when the source row was missing an English gloss, and surfaced those meanings back into the saved-vocabulary list.
- Reworked the Ready Now language cards to offer separate study buttons for program words, glossed words, or both, with empty-state toasts and a practice route that now supports glossed and combined study sessions.
- Reworked the study practice program flow so each five-word chunk introduces its words in level order first, then shuffles the 20 axis questions for that chunk before advancing.
- Made the reader settings icon visually distinct from the day/night toggle and turned the session-active bar into a full-width expandable summary with book-level session stats, reads, resume point, and progress.
- Expanded the home portal into a wider desktop and tablet-landscape two-column layout while keeping the compact mobile stack intact.
- Added an ultrawide home portal breakpoint that promotes the recently-read and goals sections into a fuller right rail on wide desktop displays.
- Tightened the home bottom navigation into a centered floating dock on desktop widths so the portal no longer stretches it into a wide footer strip.

## 2026-07-31

- Preserved study practice attempt state per card so navigating back to a previous term restores its checked status instead of forcing a redo.
- Fixed the Docker Compose smoke job so it no longer fails when `GOOGLE_APPLICATION_CREDENTIALS` is unset in the disposable CI `.env` file.
- Fixed the API and processor Ruff regressions that were breaking GitHub Actions, including export sorting, exception narrowing, and legacy lexicon row handling; verified with `ruff check` and `pytest`.
- Added a Latin-script roadmap lane for French, Spanish, Italian, German, Yoruba, and related languages so they stay planned together before any individual starter packs are built.
- Added Yoruba to the import dropdown, library language filter, and study language labels so the Latin-script lane shows a real language name instead of a generic code, and added a matching Yoruba starter-pack note to the issue tracker.
- Added night variants for Citrus Grove, Sunlit Meadow, and Seaside Garden with supplied fixed wallpaper assets, dark semantic palettes, swatches, browser colors, and separate `$1.99` pricing; expanded the Summer Editions bundle to six themes at `$8.99`.
- Added a global day/night theme toggle in the top-right corner of every page and a settings option to follow the device light/dark scheme.
- Shrunk the global day/night theme toggle to a small fixed icon button so it no longer stretches across the mobile viewport.
- Reworked the reader theme picker to show the eight most recently used themes first and added a compact More button for the full theme list.
- Removed the duplicate reader-canvas wallpaper overlay so the app uses one fixed wallpaper base layer at the root only.
- Added viewport audit reference docs for device coverage, checklist criteria, and a reusable audit prompt.
- Added a Mobile S viewport audit record under `docs/viewport-audits/` with a clean pass across the core routes.
- Added a Mobile M viewport audit record under `docs/viewport-audits/` with a clean pass across the core routes.
- Added a Mobile L viewport audit record under `docs/viewport-audits/` with a clean pass across the core routes.
- Added a Tablet P viewport audit record under `docs/viewport-audits/` with a clean pass across the core routes.
- Added a Tablet L viewport audit record under `docs/viewport-audits/` with a clean pass across the core routes.
- Added a Laptop viewport audit record under `docs/viewport-audits/` with a clean pass across the core routes.
- Fixed the API schema export list so Ruff no longer flags `ReadingHistoryPoint` as an unused import in CI.
- Reordered Python imports across the API, processor, and test tree to satisfy Ruff in GitHub Actions.

## Recovered Git History Before 2026-07-31

The entries below were recovered from the repository's local Git history and earlier changelog snapshots. Current date-grouped entries above are preserved; this appendix restores the commit-level record that was no longer visible in the working changelog.

### 2026-07-23

- `2e55aa5` - Merge pull request #46 from ajth-work/codex-textplex-reader-preview-split
- `3fe8b92` - Tighten smoke retries
- `09b7ede` - Harden smoke route checks
- `179dc2d` - Fix import test path portability
- `e9a0aaa` - Replace copyrighted PDF fixture
- `c83807c` - Add lexicon packs and test samples

### 2026-07-22

- `05dfe08` - Complete Phase 6 sync and sandbox commerce
- `71ceae4` - Complete frontend migration phase 5
- `ffaab1c` - Add Phase 5 hosted profile read path
- `7a6c75d` - Close phase 4 and start phase 5

### 2026-07-21

- `078ad3e` - Advance frontend migration phase 4 exit
- `e53d369` - Add canonical Next deployment boundary
- `e1c308d` - Define frontend migration phase 4 boundary

### 2026-07-20

- `48dd3b2` - Ship reader preview and app updates

### 2026-07-19

- `37548ee` - Merge pull request #41 from ajth-work/codex-textplex-reader-preview-split
- `bd43173` - Complete reader preview and audit hardening

### 2026-07-17

- `cab48c8` - Polish reader options and tracker

### 2026-07-16

- `be60b41` - Add language roadmap tracker
- `62e2f32` - Add non-Romanized language docs
- `3f6d050` - Expand changelog with full history
- `e69b010` - Add changelog for recent commits
- `ce87011` - Merge pull request #32 from ajth-work/codex-textplex-reader-preview-split
- `f5676e7` - Update static site previews and tests
- `7cabb4c` - Add reader profile and live surfaces
- `9de3d6d` - Add processing pipeline contracts

### 2026-07-15

- `4be056d` - Merge pull request #30 from ajth-work/codex-reader-token-spacing
- `7fd7f87` - Update TextPlex previews

### 2026-07-14

- `86de8a4` - Clarify OCR upload options
- `a60ef39` - Tighten reader token layout
- `cbe4ce2` - Add OCR provider toggle

### 2026-07-13

- `d0a339f` - Make reader token selection dynamic
- `23c153d` - Use canonical site and API ports

### 2026-07-12

- `b34dc06` - Remove preview status bars
- `fb7c4da` - Fix home preview search filtering
- `958b169` - Make home preview interactive
- `8097196` - Wire global navigation shell
- `d791541` - Isolate mock route views
- `bd17b77` - Add live product surface routes
- `363f860` - Add route and contract regression coverage
- `3d04174` - Add shared contracts and route scaffolding

### 2026-07-11

- `312179b` - Add activity preview page
- `98fb3a6` - Add study preview page
- `371ec46` - Add progress preview page
- `7fd9382` - Add search preview page
- `1417c39` - Add library detail preview page
- `7d03315` - Add import preview page
- `d54d146` - Add vocabulary preview page
- `6cc05a5` - Add reader preview page
- `4ff3818` - Add text analysis preview page
- `8771b77` - Add mobile home preview page
- `7b3a81c` - Add local sentence and exposure tracking
- `0b5bc92` - Restore pinyin in token panels
- `b82a821` - Expose pasted-text parse endpoint

### 2026-07-10

- `04ec7b9` - Auto-seed lexicon for pasted text pinyin
- `72e3a21` - Add lexicon pinyin enrichment
- `5f71fb0` - Add archive restore actions
- `1e8774e` - Tighten library cards and archive flow
- `36c8281` - Fix Chinese extraction and preview URLs
- `7f91f9b` - Parse pasted text into local sentences
- `648d0ff` - Add pasted text library entries
- `ecefabb` - Give selected reader token more room
- `e276fb1` - Relax reader token highlight shape
- `16dbfef` - Attach pinyin to reader tokens
- `6231fc2` - Fix token pinyin placement
- `262f615` - Tighten reader definition layout
- `88b01c6` - Polish reader spacing and sheet
- `e8ab858` - Tighten reader mockup layout
- `9773390` - Set up annotated reader view
- `4f0491e` - Add options page and themes
- `efb9690` - Simplify token empty state copy
- `bfd2cbd` - Tighten reader and library control rows
- `f4fb987` - Force nav onto one row
- `6e37d1e` - Keep nav on one row
- `ca65435` - Compact mobile controls
- `92e6b68` - Compact token definition grid
- `4ee56d1` - Tighten reader spacing on mobile
- `c4db2fd` - Switch reader to sentence-by-sentence mode
- `f8dab84` - Add close button to token definition card

### 2026-07-09

- `2b28b65` - Fix mobile overflow in Pages shell
- `3b9abc7` - Tighten header badge alignment
- `3985f27` - Tighten TextPlex header layout
- `1846f65` - Wire vocabulary lookup into Pages shell
- `7b9df41` - Trim Pages header to logo and mode badge
- `f9fd69c` - Streamline Pages copy and spacing
- `1f9391e` - Add nav-style multi-page Pages layout
- `080314f` - Add static Pages shell for remote processing
- `2a818e2` - Fix GitHub Pages SWC install
- `76d21dd` - Add demo export and reader stability fixes

### 2026-07-08

- `6d4b605` - Add API dev launcher and local ignores
- `54ccb54` - Add PDF upload for library imports
- `e45fec3` - Add bundled Alice fixture support
- `1dfe9e9` - Add TextPlex learning and reachability checks
- `94e7e85` - Refine reader text mode
- `d20af66` - Add remote-access API proxy
- `033f0a6` - Add Docker preview stack
- `1b99a38` - Add reader vertical slice
- `7ec74a0` - Add page text extraction pipeline
- `4bd053a` - Sample four pages after TOC
- `9941304` - Split imported PDFs into page assets
- `e7bd5c4` - Add PDF import registry and endpoint
- `40d5917` - Complete issue #1 local dev baseline
- `2399849` - Initial TextPlex scaffold
- Added the first page-by-page photo import flow: ordered JPG/PNG batches, thumbnail previews with reorder/remove controls, bounded API packaging into a multi-page reading item, and focused contract coverage.
