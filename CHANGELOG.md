# Changelog

## 2026-07-19

- Added GitHub Actions CI for Python tests/Ruff, static site tests, web builds, and non-interactive lint; Pages artifact creation now runs the static site suite first. Added the pinned Next.js ESLint configuration required by the lint job and made private local upload fixtures skip cleanly on hosted runners.
- Added audit guardrails to AGENTS.md for verification gates, test isolation, dependency bootstrapping, API security boundaries, configuration coverage, and issue-tracker discipline.
- Completed audit issues #33-#40: fixed extraction/token regressions, isolated backend tests, hardened import/upload boundaries, honored configurable storage roots, restored preview route reachability, and added CI-safe web validation.
- Added `docs/AUDIT.md` as the reusable audit record and procedure, including parameters, limitations from the 2026-07-19 audit, evidence requirements, cadence, and rules for improving future audits.
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
