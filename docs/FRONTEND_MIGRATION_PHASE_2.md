# Frontend Migration Phase 2

Status: Complete  
Started: 2026-07-21  
Completed: 2026-07-21  
Parent: Frontend consolidation issue

## Scope

Phase 2 begins with the reader because it is the highest-risk product surface and the clearest parity boundary between the Next app and the standalone preview. It then moves through import and processor progress so a user can reach the canonical Next reader from real content without switching ports.

## Completed First Slice

- Added stable inventory markers for the Next reader header, options dialog, page card, and token inspector.
- Added the selected sentence HSK-by-token chart using the API token proficiency fields.
- Kept chart colors fixed from HSK 1 dark green through HSK 6 dark red across reader themes.
- Added an HSK metadata pill beside the selected token reading when level data exists.
- Removed the stale character-mode fallback prompt from the Next definition card.
- Preserved the existing API-backed reader loading, lookup, session, and extraction flows.

## Completed Import Slice

- Added real paste-text and PDF-upload forms to the Next import route.
- Connected paste imports to `/texts/import` and PDF uploads to `/books/upload`.
- Added explicit validation, busy, error, completion, and background extraction states.
- Polls the imported book record until extraction progress is complete and exposes an `Open reader` action.
- Added stable inventory markers for the import form and progress card.

## Parity Checklist

- [x] Reader options are available in Next for font, size, theme, and focus controls.
- [x] Token lookup and HSK metadata are rendered from shared API contracts.
- [x] Sentence HSK visualization is present in the Next reader.
- [x] Match static reader definition-card action behavior and compact layout.
- [x] Explicitly defer page/sentence/book HSK analysis charts to Phase 3.
- [x] Reconcile Next loading, empty, and extraction-progress states with the standalone reference.
- [x] Next import can submit pasted text and PDF uploads without opening a demo sample.
- [x] Next import exposes background extraction progress and a reader handoff.
- [x] Add route-level regression coverage for reader loading, lookup, and chart rendering.

## Affected Inventory IDs

- `reader.header`
- `reader.options-dialog`
- `reader.page-card`
- `reader.token-inspector`
- `reader.sentence-hsk-chart`
- `import.form`
- `import.progress-card`

## Exit Criteria

Phase 2 is complete: the Next reader and import route are canonical implementations for the migrated behaviors, their loading and error states are covered, the static reader remains compatibility behavior for GitHub Pages, and the analysis/book-record chart work is explicitly deferred to Phase 3.
