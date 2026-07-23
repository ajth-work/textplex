# Changelog

## 2026-07-23

- Hardened the clean container smoke job so owned-route checks retry until the Next app, API, and legacy shell finish starting instead of failing on a startup reset.

## 2026-07-21

- Phase 4: wired the canonical Next import-to-reader-progress path to the existing API vertical slice and added a configurable `legacy` profile link with inventory coverage.
- Maintenance: made the web lint command invoke ESLint through Node so the required check works with the Windows workspace install.
- Maintenance: included the web ESLint config in the production image so the Node 24 container can run its lint gate directly.
- Upgraded the supported runtime baseline from Node 20 to Node 24 LTS across local versioning, Docker, CI, GitHub Pages, and weekly audit workflows.
- Added a controlled update and repair cycle with read-only drift reporting, explicit in-range npm updates, lockfile repair, dependency reinstall, verification gates, and weekly audit integration.
- Started frontend migration Phase 4: documented the canonical Next.js deployment target on `3000`, API boundary on `8201`, and explicit standalone/GitHub Pages compatibility boundary on `8200`.
- Reconciled the frontend migration tracker so completed Phase 3 work is separated from the Phase 4 deployment and legacy cutover work.
- Implemented the Phase 4 deployment-boundary slice: Compose now runs Next on `3000`, keeps the API on `8201`, scopes the static shell behind the `legacy` profile, and verifies canonical and legacy route reachability.
- Verified Next.js and `eslint-config-next` are already at the latest stable `16.2.11` release, then pinned both declarations exactly to prevent pre-Phase 4 version drift.
- Added a narrowly pinned npm 11 install-script approval for `unrs-resolver@1.12.2` so Node 24 builds remain explicit without allowing arbitrary dependency scripts.
- Began frontend migration Phase 2 in the Next reader with HSK token visualization, definition metadata, stable inventory markers, and removal of stale character-mode fallback copy. Added `docs/FRONTEND_MIGRATION_PHASE_2.md` and synchronized the issue tracker.
- Cleared the Next reader image lint warning, documented the port `3000` build-lock cleanup, and documented the writable npm-cache workaround for restricted local cache logs.
- Added the Node 20 project version marker and route-level `Suspense` boundaries to address local runtime and App Router deoptimization warnings before the next migration phase.
- Upgraded Next.js to `16.2.11`, Supabase to `2.109.0`, and fixed the Next workspace launcher so clean Node 20 Docker builds resolve the root-installed dependency correctly.
- Fixed the web Dockerfile to preserve workspace-local dependencies during clean image builds.
- Updated dynamic route segment exports for Next 16’s static config parser while preserving demo/live component selection.
- Updated the web lint script to invoke ESLint directly, matching Next 16’s removal of the `next lint` command.
- Migrated the web lint configuration to Next 16’s flat ESLint preset and ignored generated build output explicitly.
- Scoped the Next 16 lint exceptions to intentional effect-driven loading state and existing reader memoization.
- Recorded the remaining two moderate upstream PostCSS audit findings in `docs/AUDIT.md`; no unsafe forced downgrade was applied.
- Added the remaining PostCSS audit follow-up to the local issue tracker before the next migration phase.
- Added the Phase 2 Next import slice: real paste-text and PDF-upload submission, validation, background extraction polling, explicit progress/error states, and a reader handoff.
- Stabilized Next import progress polling so each active import uses one bounded refresh loop.
- Completed frontend migration Phase 2 by matching the compact reader definition card, adding local save behavior, explicit extraction/error states, and Next reader route contract tests; opened Phase 3 for analysis and book-detail HSK charts.
- Updated the live reachability checks to assert the current roadmap root and simplified library search copy.
- Completed frontend migration Phase 3 by adding API-backed sentence and page HSK series, responsive Next analysis and book-detail charts, fixed cross-theme HSK colors, explicit loading/empty/error states, and route-contract coverage.

- Added the first versioned Supabase migration for account-owned learner profiles and per-user settings, including ownership RLS, updated-at triggers, and automatic profile creation for new Auth users.
- Documented the detailed Next.js and standalone frontend consolidation issue locally while GitHub reauthentication is pending.

## 2026-07-23

- Maintenance: removed the copyrighted three-body PDF test dependency, replaced the extraction tests with a synthetic in-memory PDF fixture, and aligned the import endpoint test with the configured import roots.
- Maintenance: corrected the import test to use a Linux-safe fixture path so CI no longer trips the import-root validator on Windows-style separators.
- Documentation: added a structured non-Romanized test-sample library with three 10-sentence passages per current target language and linked it from the starter corpus note.
- Maintenance: rebuilt the Korean starter pack from the downloaded KRDICT JSON export chunks, tightened the Korean ranking for learner-friendly entries, and updated the Korean lexicon import test to match the export-driven seed.
- Maintenance: added Russian lexicon acquisition notes, a starter pack, a CSV pack builder, and regression coverage so Russian can follow the Korean sourced-pack workflow.
- Maintenance: added a Korean KRDICT export parser and pack builder, plus regression coverage for XML/JSON-style acquisition and TOPIK-prioritized sorting.
- Maintenance: added the Korean lexicon starter pack, Korean processing notes, and a Korean lexicon import/lookup regression test so the active build has a concrete source pack slot.
- Maintenance: switched the implementation tracker and standalone roadmap preview to Korean as the active build, reordered the non-Romanized implementation sequence, and updated the roadmap inventory note.
- Migration: prototyped a denser analysis lexical-entry grid with pronunciation, definition, HSK badge, and clearer page-based exposure context, then updated the tracker and inventory notes for issue #42.
- Maintenance: trimmed the roadmap hero into a compact implementation tracker, moved the preview badge into the top-right corner, and removed the redundant Home, Library, and Progress links plus the long intro copy.

## 2026-07-22

- Maintenance: converted the top shell action row on narrow screens into a 4-column grid so Back, Book, Reader, and Analysis stay compact in one row.
- Maintenance: replaced the primary app navigation's wrapped flex layout with a responsive grid so the route list stays compact instead of consuming so much vertical space on mobile.
- Migration: reshaped the reader page into a single-sentence surface with stacked pinyin token chips, moved the page image and HSK chart into the collapsed tools drawer, and switched the reader default theme back to jade for the dark 8200-style shell.
- Migration: collapsed the Next reader's utility sidebar into a compact tools drawer and shifted the main reading surface toward the standalone 8200 pager/session layout with tighter typography and spacing.
- Migration: trimmed the Next reader header toward the standalone preview pattern by keeping the title/author block, adding bookmark and overflow icons, and removing the extra utility buttons from the main action row.
- Maintenance: pinned the web Turbopack root to the repo workspace root so the Next build stops inheriting the stray parent lockfile path.
- Maintenance: made `test:site` Windows-safe by adding a small Node runner that discovers the site test files before invoking `node --test`.
- Migration: began canonical Next home parity by replacing the generic home scaffold with the compact 8200-style home shell, live book/profile hydration, bottom navigation, and skeleton/error states.
- Phase 7: opened production hardening with API readiness checks, Next security headers, environment-driven Compose CORS, and an operations runbook covering deploy, rollback, backup/restore, and incidents.
- Documentation: added a completed frontend migration report that summarizes all seven phases, their outcomes, and the remaining Phase 7 cutover work.
- Maintenance: switched the Docker web stack to use the same-origin `/api` client path and the container-side API origin so the Next home surface on `3000` can fetch books and profile data reliably from the browser.
- Migration: ported the standalone `8200` library shelf layout into the canonical Next `/library` route with live search, document counts, skeleton loading, and book detail/reader actions.
- Migration: hid the shared Next app shell and bottom navigation on `/library` so the canonical library route renders with the standalone preview-style surface.
- Migration: added the standalone-style `TextPlex` library header and tuned the library card info/read controls to better match the `8200` preview shell.
- Phase 7: added structured API request logs, bounded mutation rate limiting, production configuration readiness validation, disposable backup/restore tooling, and CI container smoke coverage.
- Phase 7: fixed the production web image so Next security configuration is loaded at runtime; live canonical headers now omit the `X-Powered-By` fingerprint.
- Phase 7: added regression coverage for the API mutation limiter and documented the final local verification results and deployment-owned gates.
- Phase 7: hardened disposable backup restores against path traversal and ignored generated backup artifacts by default.
- Phase 6: completed the hosted learner-state and sandbox commerce boundaries with retry/conflict reporting, private book/page ownership, idempotent checkout, signed webhook replay protection, refund revocation, entitlement sync, RLS schema scaffolding, and focused regression coverage. Real payment-provider activation remains Phase 7 work.
- Phase 6: started hosted learner-state synchronization with a local event outbox, Supabase RLS event storage, idempotent upload, remote hydration, authenticated sync API, reader trigger, and focused tests. Commerce fulfillment, private book ownership, and offline retry UX remain open.
- Migration: documented planned Phase 6 for hosted learner-state synchronization and theme-store fulfillment, and Phase 7 for production hardening, canonical cutover, and legacy retirement; added GitHub issues #44 and #45.
- Audit: verified 65 API tests, 34 site tests, migration/web contract suites, lint, Node 24 production build, live `3000`/`8201`/`8200` routes, CORS, auth boundary rejection, and zero production npm vulnerabilities; recorded host-runtime and clean-environment limitations in `docs/AUDIT.md`.
- Removed personal drive references from the TextPlex Codex skill, helper launch scripts, and optional upload fixture test by switching the repo tools to repo-relative paths and environment-based local fixtures.
- Phase 5: completed the hosted identity boundary with account-scoped learner storage, authenticated profile/settings updates, non-destructive local-profile migration, server-authoritative theme catalog/entitlement validation, and explicit hosted/local UI states. Checkout and hosted learner-event replication remain deferred.
- Added `docs/TECHNOLOGY_STACK.md` as the versioned source of truth for the TextPlex runtimes, frameworks, dependencies, infrastructure, external services, and upgrade procedure.
- Phase 5: added the authenticated read-only `/profile/hosted` API contract, Supabase ownership-filtered profile/settings hydration, shared response types, profile-surface account state, inventory coverage, and focused API/web tests. Local learner metrics and mutations remain unchanged pending the ownership migration work.

- Completed the Phase 4 exit review and opened Phase 5 for hosted identity, user-owned learner state, local-profile migration, and server-authoritative theme entitlements.
- Added the Phase 5 baseline contract test for Supabase Auth session handling and profile/settings ownership RLS.
- Completed the Phase 1 frontend migration inventory and contract reconciliation for routes, API ownership, endpoint families, and browser storage keys.
- Marked frontend migration Phase 1 complete and ready for reader/options migration in Phase 2.
- Added the roadmap to the standalone site at `8200`, including `/roadmap` and the root entry-point redirect.
- Added the first web/API authentication slice: Supabase sign-up, sign-in, password reset, session restoration, bearer-token propagation, and a FastAPI `/auth/me` validation boundary.
- Opened issue #43 and added it to the TextPlex Feature Board to track hosted email/password accounts, authenticated learner profiles, cross-device history restoration, user-owned book storage, and migration from the anonymous local profile.
- Expanded the local issue tracker with a parent theme-store commerce initiative and child work for catalog contracts, checkout, payment webhooks, entitlements, lifecycle handling, security, and sandbox QA.
- Added discounted topical theme packs to the theme-store plan, including a three-theme minimum, pack-level pricing, and per-theme entitlement grants.
- Added a Profile theme-shop prototype with a compact featured 2×3 theme grid, an arrow entry tile, and profile-connected live and standalone preview catalogs with live preview and save behavior.
- Restored the selected character's HSK level as a compact pill in the reader definition card.
- Cleared API test-client and site upload-test deprecation warnings, locked patched PostCSS/Sharp dependencies with zero production audit findings, and stabilized the Node 20 TypeScript build configuration.
- Regenerated the npm lockfile without the stale workspace ESLint peer subtree and aligned the web Dockerfile with the clean hoisted workspace install.
- Pinned the web Supabase client to the Node 20-compatible `2.109.0` release to remove the runtime support warning from the production build.

## 2026-07-20

- Added the app-wide components inventory with stable route, region, and card IDs, plus agent-facing update rules for new UI surfaces.
- Made the components inventory workflow an explicit required reference in AGENTS.md for UI changes and agent handoffs.
- Audited the analysis inventory and difficulty path, cataloged missing preview regions, and opened issue #42 for a canonical text-difficulty and expected-HSK metric contract.
- Added bidirectional component-inventory and issue-tracker cross-references for the audited analysis surfaces.
- Captured the proposed character-to-sentence-to-page-to-text HSK aggregation direction for issue #42.
- Added the issue #42 analysis metric contract, separating extraction progress, expected HSK level, character coverage, and learner comprehension availability across API and preview surfaces.
- Moved library book status badges such as `Live` into the bottom action row beside each card's controls.
- Locked the library card dimensions to the current tuned metrics: 82 px artwork, 20 px text padding, and 50 px card height.
- Simplified the Library to a grid-only view, removed redundant shelf copy, and moved saved card-dimension controls to Profile.
- Fixed analysis vocabulary distribution rendering so bar segments and labels use every returned HSK bucket and matching percentages.
- Renamed the analysis chart to HSK Character Level Distribution, aligned level labels above the bar and rounded percentages below it, and applied a green-to-red HSK 1-6 palette.
- Locked the HSK distribution gradient to fixed HSK 1-6 colors across all active themes.
- Documented the fixed cross-theme HSK distribution palette and chart alignment rules in the theme guidelines.
- Added a library hydration skeleton for the first book card and document count, renamed the search section, and centered the TextPlex library header.
- Increased spacing around the library search count, centered it, and simplified the label to the document total.
- Removed the redundant standalone character-weighted-average card from text analysis.
- Simplified text difficulty to a compact HSK score ring with fixed green-to-red HSK range coloring.
- Split the HSK score ring label into separate `HSK` and numeric rows for cleaner fit.
- Rounded the displayed HSK ring score to one decimal place.
- Added theme-aware HSK progression charts: token order on the reader, sentence averages on analysis, and page averages for longer texts.
- Expanded the app-wide theme system beyond the reader so the shared shell, hero cards, lists, inputs, and demo surfaces now pick up the active language pack palette.
- Added a visible global theme picker to the Profile page with live preview and profile-backed save behavior.
- Added the global theme picker and shared palette layer to the standalone site served on port 8200.
- Scoped shared theme overrides so themed shell colors no longer reduce contrast inside Home and other editorial cards.
- Made shared cards, search surfaces, goal cards, and bottom navigation adapt their surfaces and text contrast per theme pack.
- Increased theme-aware muted-text contrast for import metadata, progress labels, search placeholders, and bottom navigation controls.
- Fixed Jade difficulty-score text and raised Crimson shell text and analysis metadata contrast against dark red backgrounds.
- Added the reusable theme guidelines covering semantic tokens, all user-facing screens, card behavior, contrast requirements, and future theme-pack QA.
- Replaced hard-coded blue import controls and progress accents with theme-aware semantic accent tokens.
- Fixed themed library cards with constrained artwork columns, safe title wrapping, and explicit surface-aware contrast for shell copy, metadata, tags, view toggles, and actions.
- Added a persistent library artwork-column testing slider with a live pixel readout for tuning mobile card constraints.
- Added an independent mobile library card text-padding slider with a live pixel readout for tuning the artwork-to-title inset.
- Added a mobile library card-height slider with a live pixel readout for tuning oversized card artwork and card proportions.
- Lowered the library card-height tester minimum from `112 px` to `50 px` for tighter layout experiments.
- Fixed analysis-page theme contrast for hero metadata, sample text, difficulty cards, metrics, distribution labels, and recommendation surfaces.
- Made analysis, library-detail, and reader skeleton cards and shimmer lines follow the active theme palette instead of hard-coded neutral gray.
- Added the shared themed roadmap treatment across the live app and standalone preview, preserved its editorial tracker details in the theme guidelines, and added a direct Vocabulary roadmap card to Settings.
- Added the Classic Consoles theme collection with NES, Famicom, SNES, and Super Famicom palettes, reader-theme support, and a discounted bundle offer in the theme shop.

## 2026-07-22

- Migration: resolved dynamic Next route params defensively so book, analysis, and reader pages keep their `bookId` and `pageNumber` values during the 3000 app cutover.
- Moved the Next app's ambient theme gradients from the centered `.app-frame` to the full viewport so mobile Home no longer shows an unthemed strip at the screen edge.
- Fixed Home canvas text contrast for recent analysis metadata and section links in saturated themes such as Crimson Gold.
- Added a bounded `360 ms` minimum skeleton display window so fast local hydration still produces a visible loading flash before content replaces it.
- Added an explicit shared `1.35s` shimmer animation for themed skeleton lines and blocks so loading states visibly animate while hydration is pending.
- Matched the Library route search/count hero background to the themed library shell card surface.
- Increased skeleton placeholder contrast across themes, with stronger Crimson tones and an inset edge for clearer loading shapes.
- Matched the analysis hero treatment to library detail by removing its separate themed panel background, border, and shadow.
- Replaced the Add Content Paste Text sample shortcut with a real paste form that submits article text to `/texts/import`, hydrates the processed reader record, and opens the new book.
- Added a regression test covering pasted text submission and navigation to the created reader record.
- Documented the Codex scheduled-task companion for the Sunday repository audit, including worktree isolation and report-only boundaries.
- Added page-by-page reader hydration progress and a visible retry/error state so imported readers do not remain indefinitely on “Preparing”.
- Modeled pasted text as one logical reader page containing parsed sentences, and grouped older pasted records the same way so sentence counts are not presented as physical pages.
- Published the first hydrated sentence immediately in the reader, continued sentence hydration in the background, and preserved reader markup while processing so loaded content replaces skeletons instead of leaving the page blank.
- Added a compact mobile reader header with a two-line title limit, tighter controls and navigation, and a single-line session summary to give the reading surface more viewport space.
- Made the compact reader header an optional persisted Focus mode toggle in the reader settings panel.
- Added an explicit X close button to the reader options panel.
- Centered the standalone preview bottom navigation controls vertically and removed the raised import-button offset.

## 2026-07-20

- Added GitHub Actions CI for Python tests/Ruff, static site tests, web builds, and non-interactive lint; Pages artifact creation now runs the static site suite first. Added the pinned Next.js ESLint configuration required by the lint job and made private local upload fixtures skip cleanly on hosted runners.
- Added audit guardrails to AGENTS.md for verification gates, test isolation, dependency bootstrapping, API security boundaries, configuration coverage, and issue-tracker discipline.
- Completed audit issues #33-#40: fixed extraction/token regressions, isolated backend tests, hardened import/upload boundaries, honored configurable storage roots, restored preview route reachability, and added CI-safe web validation.
- Added `docs/AUDIT.md` as the reusable audit record and procedure, including parameters, limitations from the 2026-07-19 audit, evidence requirements, cadence, and rules for improving future audits.
- Added a Sunday GitHub Actions workflow that runs the full automated audit with fresh Python/Node dependencies, API health, live preview routes, tests, build, lint, and formatting checks.
- Filed audit follow-up issues #36-#40 for API boundaries, upload limits, configurable storage, backend test bootstrap, and CI/deployment validation; added verification notes to #33 and #35 and mirrored the tracker state locally.
- Replaced reader loading fallbacks with skeleton states, delayed preview rendering until live hydration completes, and removed fabricated reader sentences for books awaiting extraction.
- Added matching skeleton treatment to live web surface loading states and updated reader fallback coverage.
- Added skeleton hydration and processing states to analysis previews, and preserved the selected article ID when opening analysis from the home page.
- Bound Add Content controls before slow live-book hydration completes so paste, upload, URL, vocabulary, and OCR actions remain usable immediately.
- Persisted inferred local API URLs and ensured refreshed API books are removed from archived filters so completed uploads reappear in the library.
- Split live hydration into fast metadata loading and reader-specific page hydration so reader and analysis skeletons resolve instead of waiting on the entire library.
- Added a library-detail skeleton gate so seeded book details do not flash before the clicked book record loads.
- Removed literal Spring Dawn content from reader, analysis, and library-detail shells; record routes now require an explicit book ID and show a missing/loading state instead of silently selecting seeded data.
- Updated the reader-options regression test to inspect the legacy reader where its archive menu now lives instead of the redirect entry point.
- Reconciled the local issue tracker with issue acceptance criteria: #10, #11, #18, and #19 are implemented; #9, #12, and #20 remain open with their current gaps documented.
- Closed GitHub issues #10, #11, #18, and #19 with verification comments and synchronized #19 to the Done column on the TextPlex Feature Board.
- Completed the import-to-reader-to-profile learning projection by materializing sentence exposures into the user exposure ledger and vocabulary progress, adding an end-to-end import/read/profile test, and resetting reader page timers between pages.
- Marked issue #19 complete after import, reader, profile, progress, and study verification passed.
- Made the web build and lint runner resolve workspace-local Next dependencies consistently.

All notable changes to TextPlex are recorded here.

## Full Commit History

### 2026-07-08

- `2399849` - Initial TextPlex scaffold
- `40d5917` - Complete issue #1 local dev baseline
- `e7bd5c4` - Add PDF import registry and endpoint
- `9941304` - Split imported PDFs into page assets
- `4bd053a` - Sample four pages after TOC
- `7ec74a0` - Add page text extraction pipeline
- `1b99a38` - Add reader vertical slice
- `033f0a6` - Add Docker preview stack
- `d20af66` - Add remote-access API proxy
- `94e7e85` - Refine reader text mode
- `1dfe9e9` - Add TextPlex learning and reachability checks
- `e45fec3` - Add bundled Alice fixture support
- `54ccb54` - Add PDF upload for library imports
- `6d4b605` - Add API dev launcher and local ignores

### 2026-07-09

- `76d21dd` - Add demo export and reader stability fixes
- `2a818e2` - Fix GitHub Pages SWC install
- `080314f` - Add static Pages shell for remote processing
- `1f9391e` - Add nav-style multi-page Pages layout
- `f9fd69c` - Streamline Pages copy and spacing
- `7b9df41` - Trim Pages header to logo and mode badge
- `1846f65` - Wire vocabulary lookup into Pages shell
- `3985f27` - Tighten TextPlex header layout
- `3b9abc7` - Tighten header badge alignment
- `2b28b65` - Fix mobile overflow in Pages shell

### 2026-07-10

- `f8dab84` - Add close button to token definition card
- `c4db2fd` - Switch reader to sentence-by-sentence mode
- `4ee56d1` - Tighten reader spacing on mobile
- `92e6b68` - Compact token definition grid
- `ca65435` - Compact mobile controls
- `6e37d1e` - Keep nav on one row
- `f4fb987` - Force nav onto one row
- `bfd2cbd` - Tighten reader and library control rows
- `efb9690` - Simplify token empty state copy
- `4f0491e` - Add options page and themes
- `9773390` - Set up annotated reader view
- `e8ab858` - Tighten reader mockup layout
- `88b01c6` - Polish reader spacing and sheet
- `262f615` - Tighten reader definition layout
- `6231fc2` - Fix token pinyin placement
- `16dbfef` - Attach pinyin to reader tokens
- `e276fb1` - Relax reader token highlight shape
- `ecefabb` - Give selected reader token more room
- `648d0ff` - Add pasted text library entries
- `7f91f9b` - Parse pasted text into local sentences
- `36c8281` - Fix Chinese extraction and preview URLs
- `1e8774e` - Tighten library cards and archive flow
- `5f71fb0` - Add archive restore actions
- `72e3a21` - Add lexicon pinyin enrichment
- `04ec7b9` - Auto-seed lexicon for pasted text pinyin

### 2026-07-11

- `b82a821` - Expose pasted-text parse endpoint
- `0b5bc92` - Restore pinyin in token panels
- `7b3a81c` - Add local sentence and exposure tracking
- `8771b77` - Add mobile home preview page
- `4ff3818` - Add text analysis preview page
- `6cc05a5` - Add reader preview page
- `d54d146` - Add vocabulary preview page
- `7d03315` - Add import preview page
- `1417c39` - Add library detail preview page
- `7fd9382` - Add search preview page
- `371ec46` - Add progress preview page
- `98fb3a6` - Add study preview page
- `312179b` - Add activity preview page

### 2026-07-17

- Reader preview now opens a real options panel with neutral, warm sepia, and dark ink themes instead of showing a preview-only toast.
- Added a pitch black reader theme option to the app reader and static preview reader.
- Reader theme selections now tint their labels and status pill with the active accent color.
- Reader preview title text can now use the full available header width instead of shrinking into a narrow column.
- Added a repo agent note to reboot the API and site after code changes before QA.
- Reader headers now stack the title above the settings row so the title can span the available viewport width.
- Reader theme options now open as a centered overlay panel with a backdrop instead of a bottom section.
- Reader theme options are now compact one-row tiles with the selected tile outlined in accent color.
- Reader theme tiles now drop the extra copy and use taller swatches for a cleaner compact picker.
- Reader theme picker heading now says `Themes` and the picker spacing is tighter.
- Reader theme picker bottom padding is trimmed so the tiles sit closer to the panel edge.

### 2026-07-18

- Replaced the matrix reader theme with a ceramic / porcelain glaze theme and softer white-shine text treatment in both reader surfaces.
- Added a jade theme pack with gold text treatment and a subtle shine layer to both reader surfaces.
- Added a reader text-size scaler row above the theme tiles in both the app reader and static preview, with local persistence and live scaling of the reading text.
- Suppressed the character-mode "try character mode" fallback copy once a character lookup resolves successfully.
- Tightened the agent guidance so changelog updates also prompt a brief matching note in the related issue, kanban item, or PR.
- Moved the original static Pages shell into `/legacy` and made the preview-style home the default entry point.
- Moved the legacy link off the home preview and into the profile preview as a single-word shortcut.
- Split reader font controls into a dedicated font section with font style buttons and a true size slider, and made token text inherit the selected size.
- Hid the reader's "try character mode" prompt whenever the word-mode definition card already has content.
- Fixed the legacy home and test panel preview links so they point back to the current root preview pages after moving the shell under `/legacy`.
- Hid the reader's word-mode fallback prompt when the definition card already has loaded content.
- Made the static reader preview hide the fallback prompt based on the rendered definition text, not just the lookup placeholder.

### 2026-07-19

- Added a crimson and gold reader theme inspired by the Chinese flag, with warm gold sheen on the selected text and controls.
- Tightened crimson theme contrast so the reader title, timer chips, and page/session pills stay readable against the red shell.
- Made token highlights follow each theme accent and aligned the reader card and definition card to the same surface color.
- Simplified the reader definition card by moving the pronunciation row into the header and turning the star into the save-to-vocabulary control.

### 2026-07-12

- `3d04174` - Add shared contracts and route scaffolding
- `363f860` - Add route and contract regression coverage
- `bd17b77` - Add live product surface routes
- `d791541` - Isolate mock route views
- `8097196` - Wire global navigation shell
- `958b169` - Make home preview interactive
- `fb7c4da` - Fix home preview search filtering
- `b34dc06` - Remove preview status bars

### 2026-07-13

- `23c153d` - Use canonical site and API ports
- `d0a339f` - Make reader token selection dynamic

### 2026-07-14

- `cbe4ce2` - Add OCR provider toggle
- `a60ef39` - Tighten reader token layout
- `86de8a4` - Clarify OCR upload options

### 2026-07-15

- `7fd7f87` - Update TextPlex previews
- `4be056d` - Merge pull request #30 from ajth-work/codex-reader-token-spacing

### 2026-07-16

- `9de3d6d` - Add processing pipeline contracts
- `7cabb4c` - Add reader profile and live surfaces
- `f5676e7` - Update static site previews and tests
- `e69b010` - Add changelog for recent commits
- `working tree` - Update agent guidance to record brief changelog notes for repo and GitHub changes
- `working tree` - Tighten the split between repo policy in AGENTS and reusable workflow guidance in SKILLS
- `working tree` - Add Chinese text processing notes and link them from the processing contract
- `working tree` - Add a reusable non-Romanized language processing template
- `working tree` - Add a non-Romanized language scope doc with implementation priorities
- `working tree` - Add a public-domain test corpus for non-Romanized language smoke tests
- `working tree` - Add Japanese-specific processing notes for the first-wave language pass
- `working tree` - Add a vocabulary roadmap preview page and per-language implementation tracker
- `working tree` - Add progression benchmarks for official language tests and vocabulary ladders
- `working tree` - Add learner ecosystem and domestic literacy anchors for vocabulary planning
- `working tree` - Add a canonical lexicon pack format and Japanese starter pack scaffold
- `working tree` - Add a repo-local issue tracker mirror and theme store backlog item
- `working tree` - Require mirrored updates between the issue tracker markdown and the GitHub kanban
- `working tree` - Resync the repo issue tracker with the current GitHub issue set and mark theme store as local pending
- `working tree` - Add reader theme variations to the options panel with local persistence
