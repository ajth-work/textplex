# Issue Tracker

This file mirrors the current GitHub issue board state that is visible from this workspace. Keep it updated when a board item changes. If GitHub write access is unavailable, mark the item here as `Local pending` until the remote board can be updated.

Last updated: 2026-07-21

Remote issue state and kanban status are now synchronized for #10, #11, #18, #19, and #43. Issue #19 was added to the TextPlex Feature Board and placed in Done after the Project scope was granted. Issue #43 tracks the move from the anonymous local profile to hosted, authenticated, cross-device learner accounts. GitHub issue creation is currently Local pending because the available GitHub credentials require reauthentication.

## In Progress

| Item | Issue | Notes |
| --- | --- | --- |
| Add reader detail analytics surface | #31 | Reader analytics page work from `docs/READER_DETAIL_ANALYTICS.md`. |
| Add Wikipedia article of the day as reader content | #29 | Source/content ingestion work for article-based reading. |

## Backlog

| Item | Issue | Notes |
| --- | --- | --- |
| Define text difficulty and expected HSK level analytics | #42 | Audit finding: separate the preview `/100` score from extraction progress; derive character, sentence, page, and text HSK summaries from explicit lexicon-backed rules. Proposed ring value: average of sentence-level HSK values across the text. Inventory IDs: `preview.home.recent-analysis-row`, `analysis.difficulty-card`, `analysis.estimated-level-card`, `analysis.vocabulary-distribution-card`, `analysis.estimated-comprehension-card`, and related Analysis cards. |
| Add cross-device accounts and authenticated learner profiles | #43 | Add Supabase Auth email/password accounts, Postgres-backed user-scoped learner data, private book/page storage, protected FastAPI routes, and local-profile migration. |
| Add multi-path insights dashboard | #27 | Support HSK, JLPT, TOPIK, and other assessment families. |
| Add tiered package catalog and access UI | #26 | Browse and open AI-generated reading packages by tier. |
| Store generated package history and completion metrics | #25 | Persist package history and learner completion state. |
| Add learner progression and package unlock rules | #24 | Define unlock thresholds and advancement rules. |
| Build AI generation pipeline for tiered texts | #23 | Generate and persist tiered reading content. |
| Define tiered reading package schema | #22 | Model tier, language, difficulty, and unlock metadata. |
| Add tiered AI-generated reading packages | #21 | Parent feature for the package system. |
| Expanded lexicon coverage for missing pinyin | #13 | Broaden pinyin fallback and rare-character coverage. |
| [011] Add vocabulary and progress insights | #9 | Progress and study surfaces exist; exposure aggregation and vocabulary-state reporting remain incomplete. |
| [008] Build the mobile home dashboard | #12 | Preview mockup exists, but the live home route still needs Continue Reading, Recent Analyses, and Goals data surfaces. |
| Create shared TextPlex contract layer | #20 | TypeScript contracts exist, but API schemas still duplicate rather than wrap the shared shapes. |
| Consolidate standalone preview features into the Next.js app | Ready for Phase 4 exit review | Phase 3 is complete: Next owns the reader HSK visualization/metadata slice, real paste-text/PDF import flow, background extraction progress, compact saved-token definition card, explicit reader loading/error states, sentence-level HSK analysis charts, and book-detail page-level HSK charts. Phase 4 deployment, import-to-reader-progress, legacy navigation, inventory mapping, Docker build/lint, API/static/Next tests, and live route evidence are complete. See `docs/FRONTEND_MIGRATION_PHASE_1.md` through `docs/FRONTEND_MIGRATION_PHASE_4.md` for the exit record and rollback procedure. Affected IDs: `reader.header`, `reader.options-dialog`, `reader.page-card`, `reader.token-inspector`, `reader.sentence-hsk-chart`, `import.form`, `import.progress-card`, `import.recent-books-card`, `import.book-item`, `profile.legacy-link`, `analysis.sentence-hsk-chart`, `analysis.page-hsk-chart`, `book-detail.page-hsk-chart`. |
| Resolve stable Next transitive PostCSS audit findings | Local pending | `npm audit --omit=dev` reports two moderate PostCSS findings nested under stable Next `16.2.11`; npm recommends an unsafe downgrade, so revisit when a stable Next release updates the dependency. |
| Add theme store and commerce entitlements | Local pending | Parent initiative for a production theme catalog, customer checkout, payment fulfillment, and server-authoritative theme ownership. The shop stays on the existing site/API boundary; no separate port is required. Prototype surfaces exist at `/profile/themes` and the standalone preview. See the sub-issue plan below. |

### Frontend consolidation issue draft

**Objective:** Consolidate the two browser front ends into one primary product surface. Make the Next.js app the long-term canonical application while preserving the working reader and import behavior currently implemented in the standalone site.

**Current state:**

- `3000`: Next.js/React/TypeScript app with typed API access, Supabase authentication, app-wide themes, theme shop, roadmap, and several live route surfaces.
- `8200`: standalone HTML/CSS/JavaScript app and current GitHub Pages shell with the more complete reader, library, import, loading, token lookup, theme, and HSK chart behavior.
- `8201`: FastAPI processor/API service used by the standalone shell.
- The two front ends do not share UI components, state models, or a single route implementation.

**Migration scope:**

- Establish Next.js as the primary browser entry point and Docker service.
- Preserve home, library, book detail, reader, analysis, import, search, progress, study, activity, profile, settings, theme shop, authentication, and roadmap routes.
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
4. Make Next.js the canonical Docker/browser entry point and explicitly scope the standalone shell. In progress; see `docs/FRONTEND_MIGRATION_PHASE_4.md`.
5. Reconcile hosted authentication, profile settings, learner-state migration, and production theme entitlements. Planned after the deployment boundary is stable.

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
| `theme-store.catalog-contract` | Planned | Define theme IDs, metadata, preview assets, availability, product/price references, archive behavior, and topical pack membership. | The client sends a theme or pack ID/SKU; the server owns price, availability, included-theme membership, and entitlement decisions. |
| `theme-store.pack-pricing` | Planned | Add topical theme packs containing at least three aligned themes, with a discounted pack price compared with buying each theme separately. Initial example: three `$1.99` themes for `$4.99` as a pack. | A pack has a stable catalog ID, title, theme list, description, price, discount display, and a server-side rule that grants each included theme after purchase. |
| `theme-store.shop-ui` | Prototype complete | Expand the current theme-shop prototype into catalog, detail, loading, empty, error, accessibility, and responsive states across Next and standalone preview surfaces. | Inventory IDs remain mapped and the shop never exposes payment secrets or trusts client prices. |
| `theme-store.account-entitlements` | Planned | Add the server-side customer/account and entitlement model, keeping the local learner profile as a cache rather than the authority for paid ownership. | A customer can retrieve owned themes, and revoked access is reflected locally. |
| `theme-store.checkout-session` | Planned | Add a backend checkout-session endpoint that validates the selected theme or pack and creates a hosted checkout session. | Secrets remain server-side, amounts come from the catalog/provider, pack purchases cannot be double-counted as individual purchases, and retries use idempotency keys. |
| `theme-store.payment-webhook` | Planned | Add signed webhook verification, duplicate-event protection, fulfillment state, and asynchronous processing. | Successful payment grants the entitlement exactly once even when events retry or arrive out of order. |
| `theme-store.lifecycle` | Planned | Handle refunds, disputes, cancellations, failed payments, and entitlement revocation. | Payment state and entitlement state can be reconciled and audited without trusting browser redirects. |
| `theme-store.entitlement-sync` | Planned | Sync server-owned entitlements into the local-first app with authenticated reads and safe offline caching. | Paid themes work offline after sync but cannot be permanently unlocked by local storage alone. |
| `theme-store.security-operations` | Planned | Add HTTPS, webhook reachability, secret management, exact CORS/CSP rules, rate limits, structured logs, and alerting. | Payment boundaries are covered by security and deployment checks before live mode. |
| `theme-store.sandbox-qa` | Planned | Build provider test fixtures, webhook replay tests, failure-path coverage, and production-readiness checks. | Test-mode purchases, retries, refunds, and missing webhook deliveries are repeatable in CI or a disposable environment. |

## Done

| Item | Issue | Notes |
| --- | --- | --- |
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
