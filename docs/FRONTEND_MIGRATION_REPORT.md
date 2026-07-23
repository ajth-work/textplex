# Frontend Migration Report

Status: Complete report; Phase 7 remains in progress
Date: 2026-07-22
Scope: Migration from the standalone preview shell to the canonical Next.js product surface

## Executive Summary

TextPlex's frontend migration moved the product from a standalone HTML/CSS/JS shell into a canonical Next.js application backed by the API and shared contracts. The migration was organized into seven phases:

1. establish ownership and contract boundaries
2. migrate the reader and import flows
3. migrate analysis and book-detail charts
4. make Next the canonical browser entry point
5. add Supabase auth and hosted learner/profile boundaries
6. add hosted sync and provider-neutral theme-store fulfillment
7. finish production hardening and cutover

Phases 1 through 6 are complete. Phase 7 is the remaining operational readiness and final cutover work.

## Phase-by-Phase Summary

### Phase 1 - Ownership and contract boundaries

- Defined Next.js as the long-term canonical product application.
- Kept the standalone site as the GitHub Pages and compatibility shell until parity is verified.
- Established a route ownership matrix for home, library, reader, analysis, import, search, study, progress, profile, settings, theme shop, activity, roadmap, and auth.
- Declared the API and shared TypeScript contracts as the source of truth for product data.
- Separated book truth, learner truth, and preview/demo state.
- Established browser-state keys and migration rules so the standalone shell could be retired without losing user context.

Outcome:
- The migration had a clear source-of-truth model and a route-by-route ownership map before feature work moved into Next.

### Phase 2 - Reader and import parity

- Added stable inventory markers for the Next reader surfaces.
- Added the selected-sentence HSK-by-token chart in the reader.
- Kept HSK colors fixed across themes from dark green through dark red.
- Added HSK metadata beside selected tokens when level data exists.
- Removed stale character-mode fallback prompt behavior from the Next definition card.
- Added real paste-text and PDF-upload forms to the Next import route.
- Connected imports to the API and added validation, busy, error, completion, and polling states.

Outcome:
- Users could import content and read it in Next without needing the legacy shell for the core reader/import path.

### Phase 3 - Analysis and book-detail parity

- Added canonical HSK aggregation helpers and shared chart series shapes.
- Rendered sentence-level and page/book-level HSK charts in Next analysis and book-detail routes.
- Kept the fixed HSK palette consistent across theme packs.
- Replaced misleading chart placeholders with loading, empty, unavailable, and error states.
- Preserved the standalone chart behavior as compatibility-only output.

Outcome:
- Analysis and book-detail surfaces became API-backed Next routes with meaningful difficulty visualization at the correct aggregation scopes.

### Phase 4 - Canonical browser entry point

- Added the Next web service to the default Docker/browser workflow.
- Made `3000` the canonical browser-facing product port.
- Kept `8201` as the documented API port.
- Scoped the standalone shell behind an explicit `legacy` profile and GitHub Pages compatibility boundary.
- Updated local-development, deployment, inventory, and agent guidance to match the new topology.
- Verified import-to-reader-to-progress without switching ports.

Outcome:
- Next became the primary browser entry point, and the standalone shell became a clearly labeled legacy surface.

### Phase 5 - Auth and hosted learner/profile boundaries

- Integrated Supabase Auth as the identity boundary.
- Added authenticated profile hydration and API ownership filtering.
- Protected learner-state mutations with bearer-token validation.
- Partitioned local learner storage by authenticated subject.
- Added a non-destructive migration path from anonymous local profile data to account-owned state.
- Defined server-authoritative theme catalog, pricing, preview, and entitlement rules.

Outcome:
- User identity, profile state, and theme entitlement data became account-scoped and server-governed.

### Phase 6 - Hosted sync and theme-store fulfillment

- Added hosted learner-state synchronization for sessions, reads, exposures, and related progress data.
- Added idempotent event replay and reconciliation behavior for offline-first use.
- Introduced account-scoped access rules for private books and learner data.
- Defined a provider-neutral sandbox checkout and entitlement fulfillment boundary.
- Added duplicate-safe webhook handling and refund/revocation support for the sandbox lifecycle.

Outcome:
- Learner progress could synchronize across devices, and the theme-store flow gained a safe fulfillment model without depending on a live payment provider.

### Phase 7 - Production hardening and final cutover

- Added readiness and security headers work, structured API logging, bounded mutation limits, and environment-driven CORS.
- Documented deploy, rollback, backup/restore, readiness, and incident procedures.
- Added CI smoke coverage for canonical and compatibility routes.
- Added canonical Next home parity work so the live shell continues to mirror the standalone experience.

Current status:
- Phase 7 is still in progress.
- Remaining work includes clean-clone deployment verification, backup/restore and rollback drills, the legacy deprecation window, and final cutover audit.

Outcome:
- The final production-readiness phase is established, but the migration is not fully closed until the remaining operational gates pass.

## Migration Results

- The Next app is now the primary product surface and the default local development target.
- The standalone shell remains available only as an explicit legacy/compatibility reference.
- The migration preserved book truth in book storage and learner truth in the user/profile boundary.
- Reader, import, analysis, and book-detail flows now have canonical Next implementations backed by the API.
- Auth, hosted sync, and theme entitlements are defined as product boundaries instead of ad hoc browser state.
- Production readiness work is tracked as the remaining open phase.

## Source Documents

- [Frontend Migration Phase 1](FRONTEND_MIGRATION_PHASE_1.md)
- [Frontend Migration Phase 2](FRONTEND_MIGRATION_PHASE_2.md)
- [Frontend Migration Phase 3](FRONTEND_MIGRATION_PHASE_3.md)
- [Frontend Migration Phase 4](FRONTEND_MIGRATION_PHASE_4.md)
- [Frontend Migration Phase 5](FRONTEND_MIGRATION_PHASE_5.md)
- [Frontend Migration Phase 6](FRONTEND_MIGRATION_PHASE_6.md)
- [Frontend Migration Phase 7](FRONTEND_MIGRATION_PHASE_7.md)

