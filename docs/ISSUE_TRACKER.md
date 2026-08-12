# Issue Tracker

This file mirrors the current GitHub issue board state that is visible from this workspace. Keep it updated when a board item changes. Production-candidate concept, plan, roadmap, and product-direction notes in `docs/` must have a corresponding row here and a matching issue on the `TextPlex Feature Board` (user project #2: <https://github.com/users/ajth-work/projects/2>); never use the separate BinoCart project #1. If GitHub write access is unavailable, mark the row as `Local pending` and record the synchronization limitation until the remote board can be updated.

Last updated: 2026-08-12

Issue #95 defines learner-authored sentence comprehension scoring with structured semantic feedback, server-side evaluation, and a configurable Reader threshold; it is open and placed in Todo on TextPlex Feature Board project #2.

Remote issue state and kanban status are now synchronized for #10, #11, #18, #19, #43, #47, #49, #50, and #51-#94 on TextPlex Feature Board project #2. Issue #19 was added to the board and placed in Done after the Project scope was granted. Issue #43 tracks the move from the anonymous local profile to hosted, authenticated, cross-device learner accounts. The live app now redirects unauthenticated users back to sign-in, the shell and route headers expose a shared account menu with profile/settings/sign-out actions, and the landing page now reads like a signed-in account surface instead of a public marketing page once the user is authenticated; the profile surface still spells out the active hosted identity plus the user-zero migration path. Issue #47 now has a configurable learner-window article generator in the API and Library surface, and remains linked to issue #23 for the parent AI reading pipeline work. Issue #49 tracks a future native Android TextPlex keyboard and explicitly separates that product from web control of Gboard or Samsung Keyboard. Issue #50 tracks the typing fluency practice concept and is placed on the TextPlex Feature Board in Todo. Issues #57-#62 cover active local work and are In Progress; issues #63-#78 cover backlog concepts, plans, audits, and language-pack work and are Todo. Issues #79-#94 are tester feedback and product work in Todo; the feedback UI surfaces remain linked to their local records under `data/feedback/`, while Dan’s Japanese QA reports from chat and screenshots are recorded directly on #86-#94 and the related #60 segmentation issue. #85 tracks a first-run tutorial plus replayable product tour using the existing Home, Library, Reader, and Settings inventory surfaces.

## In Progress

| Item | Issue | Notes |
| --- | --- | --- |
| Add adaptive learner-window article generation | #47 | Implemented the `/articles/generate` endpoint, template fallback, Library generator panel with length, language, curriculum ceiling, genre, tone, and vocabulary-balance controls, plus saved prompt-details cards on book detail and analysis routes. Related to #23. |
| Add reader detail analytics surface | #31 | Reader analytics page work from `docs/READER_DETAIL_ANALYTICS.md`, including remembered/missed definition feedback and tracker counts. |
| Add Wikipedia article of the day as reader content | #29 | Source/content ingestion work for article-based reading. |
| Add Google Cloud Translation planning, provenance, and language filtering | #57 | Import estimates translation usage/cost, prompts for large-text confirmation, exposes fixed target-language and library filters, and adds reader sentence/source translation controls with cached revisit provenance plus pronunciation backfill. Inventory IDs: `import.translation-confirmation-card`, `reader.sentence-tools`, `reader.source-sentence-card`, `reader.sentence-translation-card`, `reader.translation-reveal-card`, `reader.meaning-line-reveal-all-toggle`, `reader.meaning-line-reveal-all-action`. |
| Add pronunciation freshness controls and sentence audio playback | #58 | Reader pronunciation freshness, sentence audio, playback speed, speech-boundary highlighting, token audio, and Russian syllable label behavior. Inventory IDs: `reader.options-dialog`, `reader.pronunciation-visibility-section`, `reader.pronunciation-visibility-toggle`, `reader.sentence-tools`, `reader.sentence-audio-button`, `reader.sentence-audio-speed`, `reader.token`, `reader.token-inspector`, `reader.word-audio-button`, `reader.definition-segment`, `reader.russian-syllable-toggle`, `reader.token-audio-toggle`. |
| Add pronunciation and syllable guides to the study tool | #59 | Study practice cards now surface an intro-only pronunciation guide with syllable breakdowns and audio buttons while later review cards stay uncluttered. Inventory IDs: `study.practice-card`, `study.practice-pronunciation-guide`. |
| Add language-specific tokenization and lexicon routing | #60 | Import routes Chinese, Japanese, Korean, Russian, Hebrew, and Arabic through explicit tokenizer branches, while lexicon enrichment/fallback fails soft when a starter pack is missing. Dan’s Japanese QA comment adds mixed kana/kanji segmentation and context-sensitive homograph cases to the regression scope. |
| Refine landing page copy and carousel differentiation | #61 | Audit follow-up for explicit product explanation, signed-in redirect, reduced repetition, tighter feature/theme descriptions, and differentiated carousels. Inventory IDs: `landing.page`, `landing.hero`, `landing.features`, `landing.feature-card`, `landing.pricing`, `landing.pricing-tier`, `landing.themes`, `landing.theme-card`, `landing.cta`. |
| Developer inventory inspector toggle | #62 | Dev-only top-of-page toggle overlays stable inventory IDs on tracked regions, cards, and controls. Inventory ID: `shell.inventory-label-toggle`. |

## Backlog

| Item | Issue | Notes |
| --- | --- | --- |
| Add learning badges concept | #63 | Concept note for large profile-visible language progress badges that combine category counts with mastery tiers. See `docs/LEARNING_BADGES_CONCEPT.md`. |
| Add video platform subtitle reader support concept | #64 | Concept note for a Reader subtitle Chrome extension that pre-reads subtitle tracks from major target-language video platforms, reuses learner-profile state, and applies TextPlex-style reading support. See `docs/YOUTUBE_SUBTITLE_READER_EXTENSION_CONCEPT.md`. |
| Add typing fluency practice concept | #50 | Concept note for an unlocked speed-typing drill that asks learners to type a familiar word quickly and correctly, tracks personal bests, and can grow into phrase or sentence production practice. See `docs/TYPING_FLUENCY_CONCEPT.md`. |
| Add Korean lexicon sourcing and starter pack | #65 | Korean is now the active build. Starter notes, source-pack slot, KRDICT export builder, CSV seed, and lookup coverage are in progress locally. |
| Add Hebrew lexicon sourcing and starter pack | #66 | Hebrew now has two authored Study starter levels with introductory terms, RTL tokenization, transliteration fallback, and reader pronunciation support; the remaining work is to source a canonical Hebrew lexicon pack and encode common clitic and lemma forms. |
| Add Russian lexicon sourcing and starter pack | #67 | Russian is now being brought to the same starter-pack state. Source notes, source-pack slot, Russian export builder, CSV seed, and lookup coverage are in progress locally. |
| Add Arabic lexicon sourcing and starter pack | #68 | Arabic now has two authored Study starter levels alongside ACTFL-anchored progression notes; the remaining work is a canonical Modern Standard Arabic lexicon pack, transliteration-aware seed list, and first-wave AAPPL topic buckets. |
| Add Yoruba lexicon sourcing and starter pack | #69 | Yoruba is a Latin-script language candidate for the same learner-facing pack workflow; the remaining work is to choose source lists, romanization coverage, and a starter vocabulary slice. |
| Add Latin-script language roadmap | #70 | Group French, Spanish, Italian, German, Yoruba, and similar Roman-alphabet languages into one roadmap lane first so they can share common lookup defaults before individual starter packs are built. |
| Add study review reminder delivery channels | #71 | The Study queue exposes a `Notify me` reminder stub for future-due language groups. Add app, browser, email, and text delivery channels tied to saved settings and registration preferences. |
| Document third-party service provider data flows | #52 | Draft note in `docs/THIRD_PARTY_DATA_NOTE.md` lists the current outbound providers and the data each one receives; the signup policy draft now links to it. |
| Add privacy policy page and signup link | #53 | Public privacy policy route in the Next app, sign-up reminder note, mirrored draft copy, and cross-link to the third-party data note. |
| Add signup policy page and content-use guidance | #51 | Draft policy copy now lives in `docs/SIGNUP_POLICY_DRAFT.md`. The signup flow should link to a dedicated policy page that explains permitted uploads, fair-use caveats, and user responsibility. |
| Define text difficulty and expected HSK level analytics | #42 | Audit finding: separate the preview `/100` score from extraction progress; derive character, sentence, page, and text HSK summaries from explicit lexicon-backed rules. Current prototype revision is compacting `analysis.lexical-entries-card` into a richer grid with pronunciation, meaning, HSK, and page exposure context. Proposed ring value: average of sentence-level HSK values across the text. Inventory IDs: `preview.home.recent-analysis-row`, `analysis.difficulty-card`, `analysis.estimated-level-card`, `analysis.vocabulary-distribution-card`, `analysis.estimated-comprehension-card`, and related Analysis cards. |
| Add cross-device accounts and authenticated learner profiles | #43 | Add Supabase Auth email/password accounts, Postgres-backed user-scoped learner data, private book/page storage, protected FastAPI routes, and local-profile migration. Auth callback/session restoration now has explicit failure states, the Next app now gates protected routes behind sign-in and the required beta onboarding flow, the shell and route headers expose a shared account menu, the profile surface calls out the active hosted identity plus the user-zero migration path, and recovery sessions now have a dedicated password update page with expired-link guidance. Signed-out users can return to the public start page from the shared TextPlex brand or auth card; live account confirmation and recovery still depend on Supabase URL Configuration. Inventory IDs: `shell.brand`, `auth.page`, `auth.public-return`, `auth.callback-state`, `auth.reset-password-page`, `auth.reset-password-card`, `auth.reset-password-form`, `auth.reset-password-success`, `auth.reset-password-error`, `onboarding.page`, `onboarding.expectations-card`, `onboarding.form`, `onboarding.target-language-question`, `onboarding.learning-track-question`, `onboarding.intent-question`, `onboarding.confidence-question`, `onboarding.support-question`, `onboarding.first-goal-question`, `onboarding.beta-acknowledgement`, `onboarding.continue-action`. |
| Add multi-path insights dashboard | #27 | Support HSK, JLPT, TOPIK, and other assessment families. Study now includes `study.queue-language-term-origin-legend`, which explains the distinct Glossed and Program Ready Now term origins. |
| Add Supabase recovery password page | #43 | Recovery sessions now land on `/auth/reset-password`, where learners can update their password; expired-link guidance includes a path to request a fresh email. Inventory IDs: `auth.reset-password-page`, `auth.reset-password-card`, `auth.reset-password-form`, `auth.reset-password-success`, `auth.reset-password-error`. |
| Add tiered package catalog and access UI | #26 | Browse and open AI-generated reading packages by tier. |
| Store generated package history and completion metrics | #25 | Persist package history and learner completion state. |
| Add learner progression and package unlock rules | #24 | Define unlock thresholds and advancement rules. |
| Build AI generation pipeline for tiered texts | #23 | Generate and persist tiered reading content. |
| Define tiered reading package schema | #22 | Model tier, language, difficulty, and unlock metadata. |
| Add tiered AI-generated reading packages | #21 | Parent feature for the package system. |
| Explore native TextPlex Android keyboard (IME) | #49 | Future standalone Android `InputMethodService` with theme handoff, language-aware layouts, transliteration helpers, and local-first privacy controls. It cannot recolor or control Gboard or Samsung Keyboard from the web app; define secure-field, logging, accessibility, install/enable/select, and opt-in sync behavior before implementation. |
| Expanded lexicon coverage for missing pinyin | #13 | Broaden pinyin fallback and rare-character coverage. |
| [011] Add vocabulary and progress insights | #9 | Progress and study surfaces exist; exposure aggregation and vocabulary-state reporting remain incomplete. |
| [008] Build the mobile home dashboard | #12 | Preview mockup exists, but the live home route still needs Continue Reading, Recent Analyses, and Goals data surfaces. |
| Create shared TextPlex contract layer | #20 | TypeScript contracts exist, but API schemas still duplicate rather than wrap the shared shapes. |
| Consolidate standalone preview features into the Next.js app | Phase 4 complete | Phase 4 exit review passed: Next is canonical on `3000`, API on `8201`, legacy is explicit on `8200`, import-to-reader-progress works without a port switch, and deployment/test/rollback evidence is recorded in `docs/FRONTEND_MIGRATION_PHASE_4.md`. Affected IDs: `reader.header`, `reader.options-dialog`, `reader.page-card`, `reader.token-display-settings`, `reader.token-text-size-control`, `reader.token-spacing-control`, `reader.token-inspector`, `reader.sentence-hsk-chart`, `import.form`, `import.progress-card`, `import.recent-books-card`, `import.book-item`, `profile.legacy-link`, `analysis.sentence-hsk-chart`, `analysis.page-hsk-chart`, `book-detail.page-hsk-chart`. Reader options now include the Japanese romaji/furigana preference via `reader.japanese-reading-display-section`, `reader.japanese-reading-romaji`, and `reader.japanese-reading-furigana`. |
| Resolve stable Next transitive PostCSS audit findings | #72 | `npm audit --omit=dev` reports two moderate PostCSS findings nested under stable Next `16.2.11`; revisit when a stable Next release updates the dependency rather than applying npm's unsafe downgrade recommendation. |
| Add theme store and commerce entitlements | #73 | Parent initiative for a production theme catalog, customer checkout, payment fulfillment, and server-authoritative theme ownership. The shop stays on the existing site/API boundary; prototype surfaces exist at `/profile/themes` and the standalone preview. See `docs/STRIPE_INTEGRATION_PLAN.md`. |
| Define production and preview API environment separation | #74 | Separate production and preview API deployments with isolated credentials, writable data, storage, image promotion, maintenance cutover, and rollback. See `docs/API_ENVIRONMENT_SEPARATION_CONCEPT.md`; coordinate with #45. |
| Explore TextPlex creator marketplace direction | #75 | Future marketplace for creator-published written content, reader themes, and hosted language programs. See `docs/CREATOR_MARKETPLACE_CONCEPT.md`. |
| Define multilingual interface and explanation support | #76 | Separate UI, explanation, learner-target, and content languages with language-pair-aware educational output. See `docs/MULTILINGUAL_SUPPORT_PLAN.md`. |
| Define PWA and mobile app path | #77 | Web-first progression from responsive Next.js product to installable PWA and Capacitor iOS/Android shells, including offline reading and synchronization. See `docs/PWA_AND_MOBILE_APP_PATH.md`. |
| Define language-learning program framework and progression benchmarks | #78 | Shared language-learning program framework covering script handling, proficiency anchors, lexicon sourcing, learner-facing study progression, and non-Romanized language ecosystem benchmarks. See the language program and non-Romanized planning notes. |
| Add first-run tutorial and replayable product tour | #85 | Todo. Add a route-aware, accessible onboarding tour for Home, Library, Reader, word lookup, and reader help controls; branch for an empty library, persist resumable versioned state, and add a Settings replay action. Initial inventory targets: `home.continue-reading`, `home.empty-state`, `library.search-hero`, `library.book-card`, `reader.page-card`, `reader.sentence-tools`, `reader.token-inspector`, and future `settings.tutorial-card`. |
| Define learner-authored sentence comprehension scoring | #95 | Todo. Define a Reader free-response check that hides the translation until submission, evaluates semantic understanding through a server-side OpenAI call, returns a normalized score plus missed/misunderstood meaning elements, and supports a configurable minimum-understanding threshold. Related to #42; keep learner comprehension separate from book difficulty and mastery. |
| Define admin analytics funnel and paid-value signals | #97 | In Progress. Local implementation covers append-only event storage, legacy backfill, protected analytics APIs, and admin-console funnel, value, paywall, feature-demand, retention, and pseudonymous watchlist surfaces. Hosted billing/conversion adapters remain future scope; see `docs/ADMIN_ANALYTICS_AND_PAID_VALUE.md`. |
| Define image reading and scene-text import | #100 | Todo. Define an image-import entry point in the Import panel, bounded camera/upload batches, ordered multi-page reading imports, layout-aware OCR, document-versus-scene classification, and interactive callouts for multiple horizontal or vertical signs. See `docs/IMAGE_READING_AND_SCENE_IMPORT_CONCEPT.md`. |

### Frontend consolidation issue draft

**Objective:** Consolidate the two browser front ends into one primary product surface. Make the Next.js app the long-term canonical application while preserving the working reader and import behavior currently implemented in the standalone site.

**Current state:**

- `3000`: Next.js/React/TypeScript app with typed API access, Supabase authentication, app-wide themes, theme settings, roadmap, and several live route surfaces.
- `8200`: standalone HTML/CSS/JavaScript app and current GitHub Pages shell with the more complete reader, library, import, loading, token lookup, theme, and HSK chart behavior.
- `8201`: FastAPI processor/API service used by the standalone shell.
- The two front ends do not share UI components, state models, or a single route implementation.

**Migration scope:**

- Establish Next.js as the primary browser entry point and Docker service.
- Preserve home, library, book detail, reader, analysis, import, search, progress, study, activity, profile, settings, theme settings, authentication, and roadmap routes.
- Port standalone reader options, font and text-size controls, focus mode, reader themes, token modes, pinyin/pronunciation, definition-card HSK pills, token highlights, and sentence/token/page HSK charts.
- Port progressive reader hydration and skeleton states that resolve to the first available sentence rather than remaining on misleading fallback content.
- Port paste-text import, URL import, PDF upload, upload/extraction progress, retry/error states, and processor URL configuration.
- Port library hydration, skeleton cards, document-count loading, card sizing controls, search behavior, and live status placement.
- Port analysis HSK ring, fixed HSK 1-6 distribution palette, sentence/page progression charts, and unavailable-data states.
- Preserve Next.js Supabase authentication, authenticated learner profiles, app-wide theme provider, typed API client, loading/error boundaries, roadmap, and settings/profile surfaces.

**Technical requirements:**

- Define canonical shared contracts for books, pages, sentences, tokens, vocabulary entries, reader settings, themes, loading states, and learner progress.
- Normalize storage keys and migrate existing `localStorage` values from both applications.
- Keep book truth in book data and learner truth in the user profile.
- Keep processor/API credentials server-side where applicable; use explicit CORS and authenticated boundaries.
- Extract reusable domain/state helpers instead of copying standalone router logic directly into React components.
- Add route and contract tests for migrated surfaces.
- Keep the standalone shell functional until Next.js reaches feature parity.

**Migration phases:**

1. Inventory and contract reconciliation. Complete; see `docs/FRONTEND_MIGRATION_PHASE_1.md`.
2. Migrate reader, reader options, import, and processor progress flows. Complete; see `docs/FRONTEND_MIGRATION_PHASE_2.md`.
3. Migrate analysis, charts, book-detail analytics, and resolved loading/error states. Complete; see `docs/FRONTEND_MIGRATION_PHASE_3.md`.
4. Make Next.js the canonical Docker/browser entry point and explicitly scope the standalone shell. Complete; see `docs/FRONTEND_MIGRATION_PHASE_4.md`.
5. Reconcile hosted authentication, profile settings, learner-state migration, and production theme entitlements. Complete; see `docs/FRONTEND_MIGRATION_PHASE_5.md`.
6. Complete hosted learner-state synchronization and theme-store fulfillment. Planned; see #44 and `docs/FRONTEND_MIGRATION_PHASE_6.md`.
7. Harden production operations, complete the canonical cutover, and retire the standalone dependency. Planned; see #45 and `docs/FRONTEND_MIGRATION_PHASE_7.md`.

**Acceptance criteria:**

- A user can complete import-to-reader-to-progress in Next.js without switching ports.
- Reader behavior matches the standalone implementation for token modes, options, themes, definitions, HSK labels, and charts.
- Pasted text and PDF imports expose clear progress, error, and completion states.
- Library and analysis pages resolve real API data without seeded fallback content during hydration.
- Existing authenticated and local-first profile behavior remains intact.
- Standalone tests and new Next route/component tests pass.
- Docker exposes one documented browser-facing product port, with API configuration and CORS updated accordingly.
- README, local-development, and component-inventory documentation describe the final deployment path.

**Phase 4 exit criteria:**

- Default Docker/browser use starts Next on `3000` and the API on `8201`; the standalone site is not a second undocumented canonical product port.
- Import-to-reader-to-progress completes in Next without switching to `8200`.
- GitHub Pages continues to deploy the standalone site, which is labeled and documented as a legacy/preview compatibility surface.
- Route, API, Docker, CORS, environment, and documentation checks agree on the same topology.

**Inventory IDs:** `home`, `library`, `book-detail`, `reader`, `analysis`, `import`, `search`, `progress`, `profile`, `study`, `activity`, `roadmap`, `preview.home.continue-rail`, `preview.home.recent-analyses`, and `preview.vocabulary`.

**Non-goals:** Rewriting the FastAPI processor; removing the standalone shell before parity and deployment checks; or adding commerce checkout beyond preserving the theme-store prototype.

**Related issues:** #18, #19, #20, #42, and #43.

### Theme store sub-issues

These local IDs are the planned child issues for the `Add theme store and commerce entitlements` parent. Create remote GitHub sub-issues when the commerce work is ready to begin.

| ID | Status | Scope | Acceptance direction |
| --- | --- | --- | --- |
| `theme-store.provider-decision` | Planned | Select the payment provider and integration mode; start with hosted checkout to keep card data out of TextPlex servers. | Provider, tax/refund assumptions, test-mode plan, and PCI responsibility are documented. |
| `theme-store.catalog-contract` | Complete | Theme IDs, metadata, preview availability, product prices, and pack membership are server-defined in the local and Supabase catalogs. | The client sends a theme or pack ID; the server owns price, availability, included-theme membership, and entitlement decisions. |
| `theme-store.pack-pricing` | Complete | Added the `classic-consoles` four-theme pack with catalog-owned discounted pricing and per-theme grants. | A pack has a stable catalog ID, theme list, description, price, and server-side included-theme fulfillment. |
| `theme-store.produce-collections` | Complete | Added the six-theme `Fruit Stand` and `Garden Harvest` collections, with stable IDs, semantic palettes, individual previews, server catalog entries, and discounted six-theme bundle offers. | Each theme has a complete semantic token block and accessible swatch; each bundle shows six included themes, `$11.94` individual total, `$8.99` bundle price, and `$2.95` savings. |
| `theme-store.fruit-strawberry-night` | Complete | Added the paired `Strawberry` and `Strawberry - Night` theme listings, opposite-theme behavior, dark semantic palette, PNG wallpaper mapping, swatches, and server catalog migration. | `fruit-strawberry` remains the daylight-compatible stable ID; `fruit-strawberry-night` is a separate `$1.99` product and both variants are available through the global theme and theme-settings flows. |
| `theme-store.summer-editions` | Complete | Added six Summer Editions variants with Citrus Grove, Sunlit Meadow, and Seaside Garden daylight/night artwork, semantic palettes, server catalog entries, and a discounted bundle offer. | Each theme is priced at `$1.99`; the six-theme bundle is `$8.99` instead of `$11.94`, saving `$2.95`. |
| `theme-store.fall-maple` | Complete | Added the Maple Walk — Daylight and Maple Walk — Night seasonal variants with supplied wallpaper artwork, semantic palettes, swatches, browser colors, and server catalog entries. | Both variants use stable IDs, remain separate `$1.99` products, preserve the free foundation themes, and keep fall artwork subordinate to readable cards and reader content. |
| `theme-store.fall-pumpkin` | Complete | Added the Pumpkin Patch — Daylight and Pumpkin Patch — Night seasonal variants with supplied wallpaper artwork, semantic palettes, swatches, browser colors, and server catalog entries. | Both variants use stable IDs, remain separate `$1.99` products, preserve the free foundation themes, and keep harvest artwork subordinate to readable cards and reader content. The six-theme Fall Editions bundle is cataloged at `$8.99`. |
| `theme-store.international-moscow` | Complete | Added the Moscow — Daylight and Moscow — Night city-theme variants with supplied wallpaper artwork, semantic palettes, swatches, browser colors, and server catalog entries. | Both variants use stable IDs, remain separate `$1.99` products, preserve the free foundation themes, and keep reading/card contrast roles explicit. |
| `theme-store.international-st-petersburg` | Complete | Added the St. Petersburg — Daylight and St. Petersburg — Night city-theme variants with supplied wallpaper artwork, semantic palettes, swatches, browser colors, and server catalog entries. | Both variants use stable IDs, remain separate `$1.99` products, preserve the free foundation themes, and keep canal, bridge, façade, lamp, and floral motifs readable behind the suite. |
| `theme-store.international-kazan` | Complete | Added the Kazan — Daylight and Kazan — Night city-theme variants with supplied wallpaper artwork, semantic palettes, swatches, browser colors, and server catalog entries. | Both variants use stable IDs, remain separate `$1.99` products, preserve the free foundation themes, and keep architectural, botanical, ornamental, and night-sky motifs readable behind the suite. |
| `theme-store.international-hong-kong` | Complete | Added the Hong Kong — Daylight and Hong Kong — Night city-theme variants with the latest supplied wallpaper artwork, semantic palettes, swatches, browser colors, and server catalog entries. | Both variants use stable IDs, remain separate `$1.99` products, pair through daylight/night switching, and keep harbor, hillside, ferry, and skyline motifs subordinate to readable suite surfaces. |
| `theme-store.fall-harvest` | Complete | Added the Harvest Orchard - Daylight and Harvest Orchard - Night seasonal variants with supplied wallpaper artwork, semantic palettes, swatches, browser colors, and server catalog entries. | Both variants use stable IDs, remain separate `$1.99` products, preserve the free foundation themes, and keep orchard artwork subordinate to readable cards and reader content. The six-theme Fall Editions bundle is cataloged at `$8.99`. |
| `theme-store.shop-ui` | In progress | Expand the theme-settings prototype into a scalable Next catalog with server-backed bundle rendering, search, collection filters, Daylight/Night filters, ownership states, empty/error/accessibility/responsive states, and live preview. | Inventory IDs remain mapped and the catalog never exposes payment secrets or trusts client prices; detail pages and checkout remain follow-up work. |
| `theme-store.admin-editor` | In progress | Add an admin-only theme console for creating and editing catalog metadata and visual tokens, previewing drafts, and asking the server-side AI assistant for structured suggestions from a concept prompt and optional reference image. | The first slice edits hosted theme records and previews draft tokens; live learner rendering from `theme_visual_tokens`, asset storage, audit history, creator publishing, and compensation remain follow-up work. |
| `theme-store.account-entitlements` | Complete | Added account-scoped local grants plus Supabase entitlement/RLS schema and authenticated entitlement reads. | Revoked access is reflected locally and local storage cannot grant ownership by itself. |
| `theme-store.checkout-session` | Complete | Added sandbox checkout-session creation with catalog-owned prices and per-account idempotency keys. | Pack purchases cannot be double-counted and retries return the existing session. |
| `theme-store.payment-webhook` | Complete | Added HMAC-signed sandbox webhook verification, duplicate-event protection, and exactly-once grant fulfillment. | Replayed successful events do not duplicate grants. |
| `theme-store.lifecycle` | Complete | Added sandbox refund handling and session-scoped entitlement revocation. | Payment and entitlement state remain auditable without trusting browser redirects. Provider disputes and live operations remain Phase 7. |
| `theme-store.entitlement-sync` | Complete | Added authenticated entitlement reads and shared client contracts for local-first synchronization. | Paid themes can be used after entitlement sync without treating browser state as authority. |
| `theme-store.security-operations` | In progress | Phase 7 now has overridable CORS configuration, CSP/security headers, readiness checks, structured JSON request logs, bounded in-process mutation limits, and an operations runbook. Distributed ingress limits, HTTPS, and alerting remain deployment-owned work. | Payment boundaries are covered by security and deployment checks before live mode. |
| `theme-store.sandbox-qa` | Complete | Added disposable sandbox checkout, signed webhook, replay, refund, and entitlement tests. | Test-mode purchases, retries, refunds, and invalid signatures are repeatable in the API suite. |

## Tester feedback

| Item | Issue | Notes |
| --- | --- | --- |
| Hide prepared-pages section for single-page articles | #79 | Todo. Local record: `data/feedback/99c1bd98-f16b-4ad1-9d31-cecebe532dd3/needs_review/4420f574c03a4c428fd409c30d832f06.json`. Labels: `feedback`, `feedback:book-detail`, `bug`, `tester:99c1bd98`. |
| Use TOPIK metadata for Korean articles | #80 | Todo. Local record: `data/feedback/99c1bd98-f16b-4ad1-9d31-cecebe532dd3/needs_review/84c15421618040078492c166b10a6fef.json`. Labels: `feedback`, `feedback:book-detail`, `bug`, `tester:99c1bd98`. |
| Keep sentence navigation visible with translation panel on mobile | #81 | Todo. Local record: `data/feedback/99c1bd98-f16b-4ad1-9d31-cecebe532dd3/needs_review/9145ec58b62c4f34aea6d70032926a7d.json`. Labels: `feedback`, `feedback:reader`, `feedback:ux`, `enhancement`, `tester:99c1bd98`. |
| Improve selected-word highlight in the Korean Reader | #82 | Todo. Local record: `data/feedback/99c1bd98-f16b-4ad1-9d31-cecebe532dd3/needs_review/bfe8874168f64e8ea4a6315631294d3e.json`. Labels: `feedback`, `feedback:reader`, `bug`, `tester:99c1bd98`. |
| Remove duplicate sentence progress and navigation indicators | #83 | Todo. Local record: `data/feedback/da49a3e9-3732-4f1a-980d-a8309f138110/needs_review/f09ac9501d2b403c883aac33838aaf44.json`. Labels: `feedback`, `feedback:reader`, `bug`, `tester:da49a3e9`. |
| Limit profile activity to the current account's reading history | #84 | Todo. Local record: `data/feedback/da49a3e9-3732-4f1a-980d-a8309f138110/needs_review/ae30fe15592e45ddae9f1d3a0372fe81.json`. Labels: `feedback`, `feedback:profile`, `enhancement`, `tester:da49a3e9`. |
| Accept common Japanese romanization variants in Study answers | #86 | Todo. Dan tester feedback and screenshot `1786305814523.jpg`; accept equivalent macronless/macron forms such as `arigato` and `arigatō` without weakening language-specific validation. Labels: `feedback`, `feedback:needs-review`, `feedback:ux`, `bug`. |
| Clarify randomized axis checks in Study | #87 | Todo. Dan tester feedback and screenshot `1786305706138.jpg`; replace internal-sounding axis terminology with learner-facing directions while keeping question order randomized. Labels: `feedback`, `feedback:needs-review`, `feedback:ux`, `enhancement`. |
| Add Japanese romaji-to-hiragana input and correct-answer advance | #88 | Todo. Japanese Study now supports WaniKani-style romaji composition with direct kana fallback plus a visible, cancellable correct-answer auto-advance. Inventory IDs: `study.practice-input-composition`, `study.practice-auto-advance`, `study.practice-auto-advance-cancel`. Labels: `feedback`, `feedback:needs-review`, `feedback:ux`, `enhancement`. |
| Reflow reading-profile statistics and add simple/detailed views | #89 | Todo. Dan tester feedback and screenshot `1786307422587.jpg`; prevent stat-pill clipping and add concise versus detailed metric views. Labels: `feedback`, `feedback:needs-review`, `feedback:ux`, `enhancement`. |
| Let learners trim the Reader session-detail statistics | #90 | Todo. Dan tester feedback; make the session-summary edit control keyboard reachable and allow individual stats to be hidden and restored. Inventory ID: `reader.session-summary-details`. Labels: `feedback`, `feedback:needs-review`, `feedback:reader`, `feedback:ux`, `enhancement`. |
| Restore reliable horizontal reader navigation and drag behavior | #91 | Todo. Dan tester feedback; repair the intended horizontal scroll/drag interaction and preserve vertical scrolling and non-pointer fallbacks. Labels: `feedback`, `feedback:needs-review`, `feedback:reader`, `bug`. |
| Preserve Japanese context for readings and meanings | #92 | Todo. Dan tester feedback and screenshot `1786305417510.jpg`; keep `は` as the contextual particle/reading `wa` distinct from `歯` and its “teeth” meaning. Related to #57 and #60. Labels: `feedback`, `feedback:needs-review`, `feedback:reader`, `bug`. |
| Make reader controls discoverable without adding more visual noise | #93 | Todo. Dan tester feedback; add focusable tooltips/help labels for icon-only controls, provide a visible `reader.beginning-action` escape hatch for books opened away from page one, and review control density. Related to #85. Labels: `feedback`, `feedback:needs-review`, `feedback:reader`, `feedback:ux`, `enhancement`. |
| Keep tester-owned Japanese books visible and resolve library 404s | #94 | Todo. Dan tester feedback; preserve account-scoped Japanese books across reloads and provide clear recovery for stale or processing items. Related to #43. Labels: `feedback`, `feedback:needs-review`, `feedback:ux`, `bug`. |
| Configure GitHub feedback routing and project synchronization | Local pending | Local issue creation/status-sync code exists, but live routing remains disabled until the repository, token, Project ID, status field ID, and option mapping are intentionally configured. See `docs/FEEDBACK_CONSOLE_ADMIN_ROADMAP.md`. |
| Enable daily feedback digest delivery | Local pending | Local digest generation and SMTP adapter exist, but delivery requires an email provider, sender/recipient configuration, and domain authentication. See `docs/FEEDBACK_CONSOLE_ADMIN_ROADMAP.md`. |
| Define production feedback screenshot retention and access policy | Local pending | Local attachment review is implemented; production storage, retention, deletion, and access rules remain deployment/privacy decisions. See `docs/FEEDBACK_CONSOLE_ADMIN_ROADMAP.md`. |

## Done

| Item | Issue | Notes |
| --- | --- | --- |
| Frontend migration Phase 5: hosted identity and learner state | Phase 5 | Complete. Authenticated profile/settings reads and writes, account-scoped learner storage, non-destructive local-profile migration, server-authoritative theme catalog/entitlement validation, UI states, and focused ownership tests are implemented. Checkout and hosted learner-event replication remain future work. See `docs/FRONTEND_MIGRATION_PHASE_5.md`. |
| Frontend migration Phase 6: hosted learner state and commerce fulfillment | #44 | Complete. Added account-scoped event outbox/receipts, RLS-protected sync and remote hydration, client retry/conflict reporting, private book/page ownership, provider-neutral sandbox checkout, signed webhook replay protection, refund revocation, and local entitlement synchronization. Real payment-provider activation remains a Phase 7 gate. See `docs/FRONTEND_MIGRATION_PHASE_6.md`. |
| Frontend migration Phase 7: production hardening and final cutover | #45 | In progress. Added readiness, security headers, environment-driven CORS, structured request logs, bounded mutation limits, disposable backup/restore tooling, CI container smoke coverage, the operations/rollback runbook, canonical Next home/library parity slices, grouped shell navigation menus, and guided reader recovery when no valid last-read book exists. Production-owned recovery drills, monitoring, HTTPS/auth callback verification, and legacy retirement remain. See `docs/FRONTEND_MIGRATION_PHASE_7.md`, `docs/VERCEL_GITHUB_DEPLOYMENT_PLAN.md`, and `docs/OPERATIONS_RUNBOOK.md`; shell IDs: `shell.primary-nav`, `shell.primary-nav-menu`, `shell.secondary-nav`. |
| Fix reader endpoint regressions in archive, import, and lexicon parsing | #33 | Fixed pasted-text extraction counts, isolated mutable API fixtures, and verified lexicon-backed parsing with declared dependencies installed. |
| Restore site reachability contract for the homepage preview | #34 | Added the homepage contract text, clean preview route mappings, and live route checks. |
| Fix sentence tokenization for Latin text to drop terminal punctuation | #35 | Latin token output now excludes punctuation-only matches while preserving sentence text. |
| Harden API access and filesystem import boundaries | #36 | Removed permissive default CORS patterns, added explicit method/header limits, and restricted path imports to configured roots. |
| Bound PDF uploads and clean failed imports | #37 | Streamed uploads, enforced byte/page limits, and removed failed temporary upload directories. |
| Honor configurable book and user data directories | #38 | BOOK_DATA_DIR and USER_DATA_DIR now drive production storage while temporary test roots remain isolated. |
| Make backend test isolation and dependency bootstrap reliable | #39 | Function-scoped fixtures, app-state restoration, declared processor dependencies, and CI installation now produce a clean suite. |
| Make web linting and Pages deployment checks CI-safe | #40 | Added committed ESLint config/dependencies and CI checks for site tests, preview reachability, build, and lint. |
| Wire navigation shell to live product state | #17 | Shell and nav preserve context across routes. |
| Replace mock data with live API state | #16 | Preview surfaces now use live API responses. |
| Add backend endpoints for product surfaces | #15 | Analysis, search, study, progress, activity, import, and settings endpoints. |
| Add regression coverage for contracts and routes | #14 | Shared contract and route smoke coverage. |
| Implement import-to-reader-to-profile vertical slice | #19 | Imported text reaches reader routes, sentence reads project idempotently into `exposure_ledger` and `vocabulary_progress`, and the end-to-end API test verifies profile, progress, and study updates. |
| Promote preview pages into real app routes | #18 | Added live Next.js routes for analysis, search, study, progress, activity, import, settings, library, reader, and book detail. |
| [009] Add a text analysis summary page | #11 | Implemented the analysis route, API surface, loading/error states, and coverage. |
| [010] Rework the reader into an annotated reading view | #10 | Implemented sentence navigation, token interaction, pinyin, and definition presentation. |
