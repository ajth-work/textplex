# Frontend Migration Phase 3

Status: Complete  
Started: 2026-07-21  
Completed: 2026-07-21  
Parent: Frontend consolidation issue

## Scope

Phase 3 promotes the remaining analysis and book-record analytics from the standalone preview into the canonical Next.js application. It starts with the HSK aggregation contract already used by the reader and makes the same data legible at sentence, page, and book scopes.

## Objectives

- Add canonical shared shapes for token, sentence, page, and book HSK chart series.
- Render sentence-level and page/book-level HSK charts in the Next analysis and book-detail routes.
- Keep the fixed HSK 1 dark-green through HSK 6 dark-red palette consistent across reader themes.
- Replace misleading chart placeholders with loading, empty, unavailable, and error states.
- Preserve the standalone chart behavior as a GitHub Pages compatibility surface until the Next route is verified.
- Add route-level regression coverage for aggregation, chart rendering contracts, and missing-data states.

## Initial Work Items

- [x] Extract HSK aggregation helpers into the shared contract or a typed Next utility.
- [x] Add sentence-average series to the analysis response and analysis route.
- [x] Add page-average series to the book-detail response and book-detail route.
- [x] Reuse the locked HSK distribution palette and accessible labels.
- [x] Add responsive chart cards for mobile and wide layouts.
- [x] Add Next analysis/book-detail loading, empty, and error-state coverage.

## Affected Inventory IDs

- `analysis.difficulty-card`
- `analysis.vocabulary-distribution-card`
- `analysis.summary-card`
- `analysis.sentence-hsk-chart`
- `analysis.page-hsk-chart`
- `book-detail.extraction-snapshot-card`
- `book-detail.page-hsk-chart`
- `reader.sentence-hsk-chart`

## Exit Criteria

Phase 3 is complete. Analysis and book-detail routes render API-backed HSK series at their appropriate aggregation scopes, chart colors and labels are consistent across themes, loading/empty/error states are covered, and standalone chart surfaces remain only as compatibility views. Verification: 61 Python tests passed, focused Phase 3 route contracts passed, TypeScript and lint passed, the Node 20 production Docker build passed at completion, and live `8200`/`8201` reachability checks passed after service restart. The completed phase was revalidated under Node 24.18.0 with the full Node 24 route test set, lint, production build, audit, and live reachability checks.
