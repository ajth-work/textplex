# TextPlex Components Inventory

This is the canonical map of the user-visible surfaces in `apps/web`. It gives pages and regions stable names that can be used in product notes, issues, design reviews, QA, and agent prompts.

Inventory status: reviewed against the Next app and standalone preview aliases on 2026-07-21. Phase 1 migration decisions are recorded in `docs/FRONTEND_MIGRATION_PHASE_1.md`.

## Naming rules

- Use the stable ID in the first column when referring to a surface or region.
- IDs are lowercase, dot-separated, and scoped by route or shared area: `reader.token-inspector`, `profile.preferences-card`.
- A **page** is a routable screen. A **region** is a meaningful page or shell area. A **card** is a bounded user-facing panel, including cards currently written as inline markup.
- `apps/web/components/mock-route-views.tsx` is the demo data implementation of the corresponding live surface. It uses the same IDs; do not create duplicate `mock.*` IDs unless the layout itself differs.
- Source paths identify the implementation location. The inventory name is the stable product reference and may remain stable if the implementation is later split into smaller files.

## Shared application shell

| ID | Type | Visible name | Source | Purpose |
| --- | --- | --- | --- | --- |
| `shell.root-layout` | region | Root layout | `apps/web/app/layout.tsx` | Global document, theme bootstrap, and page content frame. |
| `shell.theme-provider` | region | Theme provider | `apps/web/components/theme-provider.tsx` | Loads, applies, and persists the app theme. |
| `shell.header` | region | App header | `apps/web/components/app-shell.tsx` (`AppShell`) | Brand, demo/live badge, current book context, and shell actions. |
| `shell.context` | region | Reading context | `apps/web/components/app-shell.tsx` | Shows the active book and page carried through navigation. |
| `shell.actions` | region | Context actions | `apps/web/components/app-shell.tsx` | Back, Book, Reader, and Analysis controls. |
| `shell.primary-nav` | region | Primary navigation | `apps/web/components/app-shell.tsx` | Home, Library, Reader, Analysis, Search, Study, Progress, Roadmap, Profile, Activity, Import, and Settings links. |
| `surface.route-hero` | region | Route hero | `apps/web/components/route-page.tsx` (`RoutePage`) | Shared eyebrow, title, description, badge, route links, and metrics for data-backed surfaces. |
| `surface.metrics` | region | Route metrics | `apps/web/components/route-page.tsx` | Compact metric row rendered by `RoutePage`. |
| `surface.loading-state` | region | Loading state | `apps/web/components/loading-skeleton.tsx` | Shared loading skeleton used by library, book detail, reader, and data-backed surfaces. |
| `surface.reader-loading-state` | region | Reader loading state | `apps/web/components/loading-skeleton.tsx` | Reader-specific loading skeleton. |
| `surface.error-state` | region | Error state | Route surface files | Bounded error card shown when a live request fails. |
| `surface.list` | region | Surface list | Route surface files | Shared list layout used for events, books, search results, settings, and study items. |
| `surface.list-item` | region | Surface list item | Route surface files | Repeated row inside a surface list. |

## Route catalog

| Page ID | Path | Primary source |
| --- | --- | --- |
| `home` | `/` | `apps/web/app/page.tsx` |
| `library` | `/library` | `apps/web/components/library-view.tsx` |
| `book-detail` | `/books/:bookId` | `apps/web/components/book-detail-view.tsx` |
| `reader` | `/reader/:bookId/:pageNumber` | `apps/web/components/reader-view.tsx` |
| `analysis` | `/analysis/:bookId` | `apps/web/components/surface-views.tsx` |
| `activity` | `/activity` | `apps/web/components/surface-views.tsx` |
| `import` | `/import` | `apps/web/components/surface-views.tsx` |
| `progress` | `/progress` | `apps/web/components/surface-views.tsx` |
| `profile` | `/profile` | `apps/web/components/surface-views.tsx` |
| `theme-shop` | `/profile/themes` | `apps/web/components/surface-views.tsx` |
| `search` | `/search` | `apps/web/components/surface-views.tsx` |
| `settings` | `/settings` | `apps/web/components/surface-views.tsx` |
| `study` | `/study` | `apps/web/components/surface-views.tsx` |
| `roadmap` | `/roadmap` | `apps/web/app/roadmap/page.tsx` |

### `home` — `/`

Source: `apps/web/app/page.tsx` (`HomePage`)

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `home.hero` | region | Home hero | Product promise, mode status, explanatory copy, and entry actions. |
| `home.actions` | region | Home actions | Open library, analysis, progress, study, and roadmap links. |
| `home.feature-grid` | region | Feature overview | Overview grid for the main reading and learning surfaces. |
| `home.library-card` | card | Library | Explains the imported-book surface. |
| `home.book-detail-card` | card | Book detail | Explains the book metadata and extraction surface. |
| `home.reader-card` | card | Reader | Explains page reading and token interaction. |
| `home.analysis-card` | card | Analysis | Explains difficulty and vocabulary analysis. |
| `home.study-card` | card | Study | Explains due-item review. |
| `home.progress-card` | card | Progress | Explains exposure-driven progress. |

### `library` — `/library`

Source: `apps/web/components/library-view.tsx` (`LibraryView`)

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `library.page-hero` | region | Library hero | Intro copy, demo status, upload entry point, and library count. |
| `library.upload-controls` | region | Upload controls | PDF upload button, hidden file input, status, and upload messaging. |
| `library.book-count` | region | Imported book count | Hero metadata showing the current registry count. |
| `library.book-grid` | region | Book grid | Collection layout for imported books. |
| `library.book-card` | card | Book card | Language, status, title, author, page metrics, timestamp, and open action for one book. |
| `library.empty-state` | card | No books imported | Guidance shown when the library is empty. |
| `library.error-state` | card | Library error | Book loading or upload error message. |

### `book-detail` — `/books/:bookId`

Source: `apps/web/components/book-detail-view.tsx` (`BookDetailView`)

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `book-detail.page-hero` | region | Book detail hero | Book title, context, demo status, and total-page metadata. |
| `book-detail.detail-card` | card | Book detail | Book metadata, page/extraction metrics, reader link, library link, and extraction action. |
| `book-detail.extraction-snapshot-card` | card | Extraction snapshot | Extraction source and top lexical-entry frequency summary. |
| `book-detail.page-hsk-chart` | card | Book page HSK chart | Ordered page-level HSK averages for the selected book. |
| `book-detail.prepared-pages-card` | card | Prepared pages | Page manifest grid linking to individual reader pages. |
| `book-detail.page-tile` | region | Prepared page tile | One page-manifest link showing page number and image filename. |
| `book-detail.error-state` | card | Book detail error | Load or extraction error message. |

### `reader` — `/reader/:bookId/:pageNumber`

Source: `apps/web/components/reader-view.tsx` (`ReaderView`)

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `reader.header` | region | Reader header | Book/page identity, compact controls, page navigation, and reading-session summary. |
| `reader.options-dialog` | region | Reader options | Font, text size, reading theme, token mode, and focus-mode controls. |
| `reader.page-card` | card | Reader page | Page image/reflowed text reading surface and sentence content. |
| `reader.sentence` | region | Reader sentence | One readable sentence with sentence-level timing and interaction state. |
| `reader.token` | region | Reader token | Clickable word/character unit with lookup and exposure behavior. |
| `reader.token-inspector` | card | Token inspector | Selected token, pronunciation, level, definitions, and action state. |
| `reader.sentence-hsk-chart` | card | Sentence HSK chart | HSK level plotted across the readable tokens in the selected sentence. |
| `reader.book-frequency-card` | card | Book frequency | Selected token frequency in the current book. |
| `reader.dictionary-card` | card | Dictionary wiring | Dictionary/lexical-entry lookup status and source details. |
| `reader.reading-profile-card` | card | Reading profile | Learner exposure and progress details for the selected token. |
| `reader.navigation-card` | card | Reader navigation | Previous/next page and related navigation controls. |
| `reader.unavailable-state` | card | Reader unavailable | Missing page or unavailable extraction state. |

### `analysis` — `/analysis/:bookId`

Live source: `apps/web/components/surface-views.tsx` (`AnalysisSurfaceView`); demo source: `apps/web/components/mock-route-views.tsx` (`MockAnalysisSurfaceView`).

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `analysis.route-hero` | region | Analysis hero | Shared route hero with analysis-specific title, links, and page/token metrics. |
| `analysis.lexical-entries-card` | card | Top lexical entries | Highest-frequency lexical entries with first/last page context. |
| `analysis.summary-card` | card | Analysis summary | Book, language, and extraction availability summary. |
| `analysis.sentence-hsk-chart` | card | Sentence HSK chart | Ordered sentence-level HSK averages across the extracted text. |
| `analysis.page-hsk-chart` | card | Page HSK chart | Ordered page-level HSK averages across the extracted text. |
| `analysis.loading-state` | region | Analysis loading | Loading skeleton while the book analysis is fetched. |
| `analysis.error-state` | card | Analysis error | Analysis request error. |

The standalone analysis preview currently contains additional analysis regions that are not yet present in the live Next analysis route. They remain named here so the preview is auditable and the planned promotion does not lose component identity:

| ID | Type | Visible name | Source | Purpose |
| --- | --- | --- | --- | --- |
| `analysis.sample-card` | card | Sample text | `site/analysis-preview.html` | Text excerpt and provenance note used as the analysis input preview. |
| `analysis.difficulty-card` | card | Overall difficulty | `site/analysis-preview.html` | `/100` dial currently presented as a text difficulty score. |
| `analysis.estimated-level-card` | card | Estimated level | `site/analysis-preview.html` | HSK/CEFR/TOPIK-style level label and fit note. |
| `analysis.vocabulary-distribution-card` | card | Vocabulary level distribution | `site/analysis-preview.html` | Level-band distribution bar and labels. |
| `analysis.average-vocabulary-level-card` | card | Average vocabulary level | `site/analysis-preview.html` | Average level metric. |
| `analysis.unknown-words-card` | card | Unknown words | `site/analysis-preview.html` | Unknown-word count and ratio metric. |
| `analysis.estimated-comprehension-card` | card | Estimated comprehension | `site/analysis-preview.html` | Comprehension estimate; must remain distinct from book difficulty. |
| `analysis.recommendation-card` | card | Recommended for you | `site/analysis-preview.html` | Reading recommendation derived from analysis and learner context. |

### `activity` — `/activity`

Live source: `apps/web/components/surface-views.tsx` (`ActivitySurfaceView`); demo source: `apps/web/components/mock-route-views.tsx` (`MockActivitySurfaceView`).

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `activity.route-hero` | region | Activity hero | Shared hero with event-count and state metrics. |
| `activity.recent-events-card` | card | Recent events | Time-ordered page, sentence, token, and session events. |
| `activity.event-item` | region | Activity event | One event row with kind, timestamp, title, and detail. |
| `activity.loading-state` | region | Activity loading | Loading skeleton for the activity request. |
| `activity.error-state` | card | Activity error | Activity request error. |

### `import` — `/import`

Live source: `apps/web/components/surface-views.tsx` (`ImportSurfaceView`); demo source: `apps/web/components/mock-route-views.tsx` (`MockImportSurfaceView`).

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `import.route-hero` | region | Import hero | Supported-input, upload, and paste capability summary. |
| `import.form` | card | Import form | Switches between paste-text and PDF-upload flows and submits real API imports. |
| `import.progress-card` | card | Import progress | Shows the submitted book status and polls background extraction progress. |
| `import.recent-books-card` | card | Recent books | Recently imported book records and processing status. |
| `import.book-item` | region | Recent book item | One recent-book row with language, status, and timestamp. |
| `import.loading-state` | region | Import loading | Loading skeleton for import metadata. |
| `import.error-state` | card | Import error | Import metadata request error. |

### `progress` — `/progress`

Live source: `apps/web/components/surface-views.tsx` (`ProgressSurfaceView`); demo source: `apps/web/components/mock-route-views.tsx` (`MockProgressSurfaceView`).

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `progress.route-hero` | region | Progress hero | Session, sentence, and vocabulary-row metrics. |
| `progress.profile-summary-card` | card | Profile summary | Unique words, characters, and reading-speed metrics. |
| `progress.learning-track-card` | card | Learning track | Selected learning track and next step. |
| `progress.books-card` | card | Books | Per-book page, sentence, and active-time progress. |
| `progress.book-item` | region | Progress book item | One book’s progress row. |
| `progress.loading-state` | region | Progress loading | Loading skeleton for progress data. |
| `progress.error-state` | card | Progress error | Progress request error. |

### `profile` — `/profile`

Live source: `apps/web/components/surface-views.tsx` (`ProfileSurfaceView`); demo source: `apps/web/components/mock-route-views.tsx` (`MockProfileSurfaceView`).

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `profile.route-hero` | region | Profile hero | Learner-history summary and profile metrics. |
| `profile.learning-summary-card` | card | Learning summary | Learner exposure and reading-speed summary. |
| `profile.selected-track-card` | card | Selected track | Current benchmark/learning-track details. |
| `profile.theme-picker` | card | Global theme | Live app theme preview and profile-backed theme save. |
| `profile.theme-shop-entry` | region | Theme shop entry | Featured 2×3 theme grid and navigation tile for the full theme collection. |
| `profile.legacy-link` | region | Legacy compatibility link | Explicit profile entry point to the standalone legacy reader shell. |
| `profile.hosted-account-card` | card | Hosted account | Authenticated hosted profile identity and hosted settings count; demo uses a clearly labeled packaged account. |
| `profile.migration-card` | card | Local profile migration | Preview and non-destructive merge state for anonymous local learner data. |
| `profile.preferences-card` | card | Preferences | Saved settings and current reader mode/theme values. |
| `profile.book-activity-card` | card | Book activity | Per-book reading activity history. |
| `profile.loading-state` | region | Profile loading | Loading skeleton for profile data. |
| `profile.error-state` | card | Profile error | Profile request error. |

### `theme-shop` — `/profile/themes`

Live and demo source: `apps/web/components/surface-views.tsx` (`ThemeShopSurfaceView`); standalone preview source: `site/theme-shop-preview.html` and `site/preview-router.js`.

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `theme-shop.route-hero` | region | Theme shop hero | Collection description, profile navigation, and theme metrics. |
| `theme-shop.catalog-card` | card | Theme catalog | Complete theme collection with live previews. |
| `theme-shop.theme-option` | region | Theme option | One selectable visual theme with swatch, name, and description. |
| `theme-shop.bundle-card` | card | Theme bundle | A discounted topical collection showing included themes, individual total, bundle price, and savings. |
| `theme-shop.save-action` | region | Save theme action | Persists the selected theme to the learner profile. |
| `theme-shop.loading-state` | region | Theme shop loading | Loading skeleton for settings-backed theme state. |
| `theme-shop.error-state` | card | Theme shop error | Theme shop load/save error. |

### `search` — `/search`

Live source: `apps/web/components/surface-views.tsx` (`SearchSurfaceView`); demo source: `apps/web/components/mock-route-views.tsx` (`MockSearchSurfaceView`).

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `search.route-hero` | region | Search hero | Search scope, query, and state metrics. |
| `search.query-card` | card | Search controls | Query input and search action. |
| `search.results-card` | card | Search results | Book, sentence, and lexical-entry results. |
| `search.result-item` | region | Search result | One result row with type, score, snippet, book, and page. |
| `search.loading-state` | region | Search loading | Loading skeleton while a query runs. |
| `search.error-state` | card | Search error | Search request error. |

### `settings` — `/settings`

Live source: `apps/web/components/surface-views.tsx` (`SettingsSurfaceView`); demo source: `apps/web/components/mock-route-views.tsx` (`MockSettingsSurfaceView`).

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `settings.route-hero` | region | Settings hero | Profile-storage, theme, and reader-mode metrics. |
| `settings.preferences-card` | card | Preferences form | App theme, reader mode, and save action. |
| `settings.roadmap-card` | card | Vocabulary roadmap | Direct Settings entry to the language-pack implementation roadmap. |
| `settings.loading-state` | region | Settings loading | Loading skeleton for settings. |
| `settings.error-state` | card | Settings error | Settings load/save error. |

### `study` — `/study`

Live source: `apps/web/components/surface-views.tsx` (`StudySurfaceView`); demo source: `apps/web/components/mock-route-views.tsx` (`MockStudySurfaceView`).

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `study.route-hero` | region | Study hero | Queue size and learner-state metrics. |
| `study.queue-card` | card | Queued items | Due vocabulary items ordered for review. |
| `study.queue-item` | region | Queued item | One lemma’s state, raw/weighted exposure, page, and book counts. |
| `study.loading-state` | region | Study loading | Loading skeleton for the study queue. |
| `study.error-state` | card | Study error | Study queue request error. |

### `roadmap` — `/roadmap`

Source: `apps/web/app/roadmap/page.tsx` (`RoadmapPage`)

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `roadmap.route-hero` | region | Roadmap hero | Language-pack tracker title, links, and status metrics. |
| `roadmap.implementation-plan-card` | card | Implementation plan | Ordered language-pack implementation steps. |
| `roadmap.plan-step` | region | Plan step | One implementation step with status and description. |
| `roadmap.current-focus-card` | card | Current focus | Explanation of the active Japanese language-pack work. |
| `roadmap.language-tracker-card` | card | Per-language tracker | Container for language-pack progress cards. |
| `roadmap.language-card` | card | Language track | One language’s status, progress meter, pack, benchmark, and next step. |

## Standalone preview aliases

The active `site/` HTML previews are alternate implementations of the product surfaces above. They use the same inventory IDs, so a card added to a preview should update the corresponding route section rather than creating a second name. `site/legacy/` is excluded because it is an archived implementation.

| Preview page | File | Inventory mapping |
| --- | --- | --- |
| Home | `site/home-preview.html` | `home` |
| Library | `site/library-preview.html` | `library` |
| Library detail | `site/library-detail-preview.html` | `book-detail` |
| Reader | `site/reader-preview.html` | `reader` |
| Analysis | `site/analysis-preview.html` | `analysis` |
| Import | `site/import-preview.html` | `import` |
| Search | `site/search-preview.html` | `search` |
| Progress | `site/progress-preview.html` | `progress` |
| Profile | `site/profile-preview.html` | `profile` |
| Study | `site/study-preview.html` | `study` |
| Activity | `site/activity-preview.html` | `activity` |
| Vocabulary | `site/vocabulary-preview.html` | `preview.vocabulary` (preview-only page) |
| Roadmap | `site/roadmap-preview.html` | `roadmap` |

The Home preview also has preview-only regions that are not in the current Next Home route:

| ID | Type | Visible name | Source | Purpose |
| --- | --- | --- | --- | --- |
| `preview.home.continue-rail` | region | Continue reading | `site/home-preview.html` | Current reading items and progress bars. |
| `preview.home.recent-analyses` | region | Recent analyses | `site/home-preview.html` | Recent analysis rows linking to the analysis preview. |
| `preview.home.recent-analysis-row` | region | Recent analysis row | `site/preview-router.js` | One analysis row with title, level tag, date, and score dial. |
| `preview.home.goals` | region | Goals | `site/home-preview.html` | Weekly reading goal and streak summary. |
| `preview.home.weekly-reading-goal-card` | card | Weekly reading goal | `site/home-preview.html` | Reading target progress. |
| `preview.home.streak-card` | card | Streak | `site/home-preview.html` | Consecutive reading streak. |

### `preview.vocabulary` — preview-only Vocabulary page

Source: `site/vocabulary-preview.html`

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `preview.vocabulary.summary` | region | Vocabulary summary | New, review, and mastered vocabulary counts. |
| `preview.vocabulary.new-card` | card | New | Count of newly encountered vocabulary. |
| `preview.vocabulary.review-card` | card | Review | Count of vocabulary items due for review. |
| `preview.vocabulary.mastered-card` | card | Mastered | Count of mastered vocabulary items. |
| `preview.vocabulary.insights-card` | card | Insights | Time-filtered vocabulary learning insights. |
| `preview.vocabulary.growth-card` | card | Growth | Vocabulary growth trend visualization. |
| `preview.vocabulary.suggested-card` | card | Suggested for you | Recommended vocabulary items. |

## Cross-cutting implementation notes

- `RoutePage` owns the shared hero and metrics structure for Analysis, Activity, Import, Progress, Profile, Search, Settings, Study, and Roadmap.
- Live and demo implementations intentionally share route and card IDs. If their layouts diverge, document the divergence in the route section before adding a new ID.
- `GlobalThemePicker` is currently rendered on Profile as `profile.theme-picker`; the theme provider remains a shell-level region because it affects every route.
- `GlobalThemePicker` renders the featured catalog and `profile.theme-shop-entry`; the complete collection lives at `/profile/themes` as `theme-shop.*`.
- The standalone `site/` preview mirrors these product surfaces. Its active HTML aliases and preview-only Vocabulary surface are listed above.

## Tracker cross-reference

Use this section to move from a component ID to the issue that owns its pending work. When an issue changes scope, update both the issue and this table.

| Inventory IDs | Tracker item | Relationship |
| --- | --- | --- |
| `preview.home.recent-analyses`, `preview.home.recent-analysis-row`, `analysis.difficulty-card`, `analysis.estimated-level-card`, `analysis.vocabulary-distribution-card`, `analysis.average-vocabulary-level-card`, `analysis.unknown-words-card`, `analysis.estimated-comprehension-card`, `analysis.recommendation-card` | [#42](https://github.com/ajth-work/textplex/issues/42) | Define the canonical difficulty/expected-HSK metric and wire the live and preview consumers. |
| `analysis.*`, `reader.*` analytics regions | [#31](https://github.com/ajth-work/textplex/issues/31) | Broader reader-detail analytics work; #42 owns the difficulty/HSK metric contract. |
| `progress.*`, `study.*`, `preview.vocabulary.*` | [#27](https://github.com/ajth-work/textplex/issues/27) | Multi-path insights dashboard and assessment-family progression. |
| `profile.theme-picker`, `profile.theme-shop-entry`, `theme-shop.*` | Add theme store and commerce entitlements (Local pending) | Prototype theme browsing, bundle offers, live preview, and profile-backed save behavior; the parent initiative owns future catalog, checkout, fulfillment, and entitlement work. |
| `reader.header`, `reader.options-dialog`, `reader.page-card`, `reader.token-inspector`, `reader.sentence-hsk-chart` | Consolidate standalone preview features into the Next.js app (Local pending) | Phase 2 reader parity slice; Next now owns the reader metadata and selected-sentence HSK visualization while standalone remains the compatibility reference. |
| `import.form`, `import.progress-card`, `import.recent-books-card`, `import.book-item` | Consolidate standalone preview features into the Next.js app (Local pending) | Phase 2 import slice; Next now submits pasted text and PDF uploads to the API and tracks background extraction. |
| `analysis.difficulty-card`, `analysis.vocabulary-distribution-card`, `analysis.summary-card`, `analysis.sentence-hsk-chart`, `analysis.page-hsk-chart`, `book-detail.extraction-snapshot-card`, `book-detail.page-hsk-chart`, `reader.sentence-hsk-chart` | Frontend migration Phase 3 (Local complete) | API-backed sentence/page/book HSK analytics now render in Next analysis and book-detail routes with compatibility previews retained. |
| `settings.roadmap-card` | Untracked | Settings discovery entry for the existing Roadmap route; create a dedicated tracker item if roadmap navigation becomes a larger product initiative. |
| `profile.legacy-link` | Frontend migration Phase 4 (Complete) | Explicit rollback/compatibility entry from the canonical Next profile surface to the standalone legacy shell. |
| `profile.hosted-account-card` | Frontend migration Phase 5 (In Progress) | Authenticated read-only hosted profile hydration; local learner metrics remain the default profile source. |
| `profile.migration-card` | Frontend migration Phase 5 (In Progress) | Explicit preview, ready, completed, empty, and error states for account migration. |

## Update rule for new UI

Update this file in the same change whenever a feature:

1. adds, removes, or renames a route;
2. adds a user-visible page region, card, modal, drawer, panel, list, or repeated item type; or
3. changes which route owns an existing region.

For a new card, choose a route-scoped ID such as `library.import-progress-card`, add it to that route’s table, and include its source path and purpose. If the same card is reused on multiple routes, give it a shared ID under `surface.*` and list each route that uses it. Do not reuse a retired ID for a different purpose.

The implementation handoff should name the inventory ID in the change summary, issue, or review note. A visual QA pass should use the IDs to identify the exact region being checked.

If a new UI item is created to satisfy an existing tracker issue, add its inventory ID to that issue's cross-reference row. If a new UI item has no issue yet, record `Untracked` during the same change and create or identify the appropriate tracker item before handoff.
