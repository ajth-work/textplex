# Frontend Migration Phase 1

Status: Complete; Phase 2 ready
Issue: Local pending - Consolidate standalone preview features into the Next.js app
Date: 2026-07-21

## Phase Goal

Establish one source of truth for routes, API payloads, browser state, and migration ownership before porting standalone features into Next.js.

## Decision

Next.js is the long-term canonical product application. The standalone site remains the current GitHub Pages and compatibility shell until feature parity is verified.

The API and shared TypeScript contracts are canonical for product data. The standalone preview registry is demo/compatibility state and must not become the source of truth for imported books, extraction progress, reading history, vocabulary progress, or learner settings.

## Route Ownership Matrix

| Product surface | Next route | Standalone surface | Phase 1 owner | Migration note |
| --- | --- | --- | --- | --- |
| Home | `/` | `home-preview.html` | Next | Preserve preview-only continuation and goal rails during parity work. |
| Library | `/library` | `library-preview.html` | Next | Port skeleton cards, count loading, card controls, and live status placement. |
| Book detail | `/books/:bookId` | `library-detail-preview.html` | Next | Use API book, page manifest, and extraction contracts. |
| Reader | `/reader/:bookId/:pageNumber` | `reader-preview.html` | Next | Highest-risk migration: token modes, progressive hydration, options, charts, and learning events. |
| Analysis | `/analysis/:bookId` | `analysis-preview.html` | Next | Preserve HSK ring, distribution, sentence/page charts, and unavailable-data states. |
| Import | `/import` | `import-preview.html` | Next | Port paste, URL, PDF, progress, retry, and processor configuration flows. |
| Search | `/search` | `search-preview.html` | Next | Use `SearchSurfaceResponse`; remove preview-only search registry assumptions. |
| Study | `/study` | `study-preview.html` | Next | Use `StudySurfaceResponse` and learner profile data. |
| Progress | `/progress` | `progress-preview.html` | Next | Use `ProgressSurfaceResponse`; preserve track selection UX. |
| Profile | `/profile` | `profile-preview.html` | Next | Preserve local-first settings and authenticated profile behavior. |
| Settings | `/settings` | `profile-preview.html` settings region | Next | Consolidate processor, OCR, theme, reader, and library settings. |
| Theme shop | `/profile/themes` | `theme-shop-preview.html` | Next | Preserve the prototype while separating catalog state from theme preference state. |
| Activity | `/activity` | `activity-preview.html` | Next | Use `ActivitySurfaceResponse`. |
| Roadmap | `/roadmap` | `roadmap-preview.html` | Next | Both surfaces now expose the same roadmap scope. |
| Authentication | `/auth` and callback | None | Next | No standalone equivalent; do not add auth to the static compatibility shell in this phase. |

Inventory references: `docs/COMPONENTS_INVENTORY.md` and issue inventory IDs `home`, `library`, `book-detail`, `reader`, `analysis`, `import`, `search`, `progress`, `profile`, `study`, `activity`, `roadmap`, `preview.home.continue-rail`, `preview.home.recent-analyses`, and `preview.vocabulary`.

## Canonical Data Contract Rules

1. `packages/shared/src/contracts.ts` is the canonical TypeScript representation of API payloads.
2. `apps/api/app/schemas/` is the runtime validation source and must remain shape-compatible with the shared contracts.
3. `apps/web/lib/textplex.ts` owns Next API access, auth headers, demo-mode branching, and resource URL resolution.
4. The standalone router may adapt API payloads into preview view models, but preview view models are not API contracts.
5. React components should consume typed API data or a typed adapter result; they should not parse raw preview registry objects directly.
6. Book truth remains in book storage and API responses. Learner truth remains in the profile/learning endpoints. UI preferences may be cached locally.

## Endpoint Ownership Matrix

| Contract family | API endpoints | Shared contract | Next consumer | Standalone parity work |
| --- | --- | --- | --- | --- |
| Books and pages | `/books`, `/books/:id`, `/books/:id/pages`, `/books/:id/pages/:page` | `BookRecord`, `BookPageManifest`, `BookReaderPageResponse` | Library, book detail, reader | Replace preview registry hydration with API adapters. |
| Extraction | `/books/:id/extractions`, `/books/:id/extract` | `BookExtractionResult`, extraction trigger types | Reader, book detail, analysis | Preserve progress polling and processing states. |
| Import | `/texts/import`, `/books/import`, `/books/upload` | `BookRecord`, `ImportSurfaceResponse` | Import, library | Port upload progress and pasted-text flow into typed React actions. |
| Lexicon | `/lexicon/lookup`, `/lexicon/import` | `LexiconLookupResponse`, lexicon types | Reader and future pack tooling | Port selected-token lookup behavior and HSK mapping. |
| Learning events | `/learning/sessions`, `/learning/page-reads`, `/learning/sentence-reads` | Reading/session/read request and record types | Reader | Preserve idempotency and session cache behavior. |
| Analysis | `/analysis/:id` | `BookAnalysisSurfaceResponse`, `AnalysisMetrics` | Analysis | Port HSK aggregation and chart view models. |
| Learning surfaces | `/profile`, `/progress`, `/study`, `/activity` | Corresponding surface response types | Dashboard routes | Replace preview-derived profile statistics with API state. |
| Search | `/search` | `SearchSurfaceResponse` | Search | Port query loading, empty, and error states. |
| Settings | `/settings` | `SettingsSurfaceResponse`, `SettingsUpdateRequest` | Theme, profile, settings | Move standalone processor/OCR preferences into the same settings boundary. |
| Auth | `/auth/me` plus Supabase session | `AuthMeResponse` | Auth provider and API client | Keep static shell unauthenticated until it is retired or separately secured. |

## Browser State Reconciliation

### Shared keys to preserve

| Key | Value | Canonical use |
| --- | --- | --- |
| `textplex.theme` | Theme ID | Global theme preference. |
| `textplex.readerTheme` | Theme ID | Backward-compatible reader theme alias. |
| `textplex.readerFont` | `mixed`, `serif`, or `sans` | Reader font preference. |
| `textplex.readerTextSize` | `small`, `medium`, or `large` | Reader text-size preference. |
| `textplex.readerTokenMode` | `word` or `character` | Reader token-mode preference. |
| `textplex:last-book-id` | Book ID | Navigation context cache. |
| `textplex:last-page-number` | Page number | Navigation context cache. |
| `textplex:last-search-query` | Search text | Navigation context cache. |
| `textplex-reading-session:<bookId>` | Session ID | Temporary learning-session resume cache. |

### Standalone-only keys to migrate or retire

| Key family | Decision |
| --- | --- |
| `textplex.preview.store`, `textplex.preview.selectedBook`, `textplex.preview.readingState` | Keep only for standalone compatibility; never use as Next product truth. |
| `textplex.preview.pendingBook`, `textplex.preview.importSession` | Replace with API-backed import state and route state after parity. |
| `textplex.processorBaseUrl`, `textplex.ocrProvider` | Migrate into the typed settings surface; retain local fallback only for unauthenticated local development. |
| `textplex.preview.selectedTrack` and `textplex.readerDensity` | Add to the canonical settings contract if product behavior remains; otherwise retire after parity review. |
| `textplex.preview.savedVocabulary` | Replace with authenticated/local learner vocabulary state; do not merge preview JSON into profile truth. |
| `textplex:library-art-constraint`, `textplex:library-card-padding`, `textplex:library-card-height` | Keep as temporary tuning preferences; move to settings only if users should control them in the product. |

## Phase 1 Exit Criteria

- Route ownership is explicit and the Next route is the target for every product surface.
- API/shared contracts are identified as canonical and the preview registry is explicitly compatibility-only.
- Endpoint families map to existing shared contracts and Next consumers.
- Shared browser keys are documented, including the legacy reader-theme alias.
- Standalone-only state has a migration or retirement decision.
- Phase 2 can start with reader migration without inventing new route or storage conventions.

## Phase 2 Entry Risks

- `BookReaderPageResponse` and standalone reader profiles expose different nested shapes and require an adapter.
- Static import progress includes browser-specific polling/session details not represented in the current shared contracts.
- The Next reader currently has typed API access but does not yet include every standalone chart and compact definition-card behavior.
- Authenticated profile state and anonymous local-first state need an explicit precedence rule before settings are migrated.
