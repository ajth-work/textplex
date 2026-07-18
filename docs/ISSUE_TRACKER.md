# Issue Tracker

This file mirrors the current GitHub issue board state that is visible from this workspace. Keep it updated when a board item changes. If GitHub write access is unavailable, mark the item here as `Local pending` until the remote board can be updated.

Last updated: 2026-07-17

## In Progress

| Item | Issue | Notes |
| --- | --- | --- |
| Fix reader endpoint regressions in archive, import, and lexicon parsing | #33 | Current API regression work around extraction, import counts, and lexicon-backed parsing. |
| Restore site reachability contract for the homepage preview | #34 | Keep the homepage preview string visible in the site check. |
| Fix sentence tokenization for Latin text to drop terminal punctuation | #35 | Processor rule fix for Latin token boundaries. |
| Add reader detail analytics surface | #31 | Reader analytics page work from `docs/READER_DETAIL_ANALYTICS.md`. |
| Add Wikipedia article of the day as reader content | #29 | Source/content ingestion work for article-based reading. |

## Backlog

| Item | Issue | Notes |
| --- | --- | --- |
| Add multi-path insights dashboard | #27 | Support HSK, JLPT, TOPIK, and other assessment families. |
| Add tiered package catalog and access UI | #26 | Browse and open AI-generated reading packages by tier. |
| Store generated package history and completion metrics | #25 | Persist package history and learner completion state. |
| Add learner progression and package unlock rules | #24 | Define unlock thresholds and advancement rules. |
| Build AI generation pipeline for tiered texts | #23 | Generate and persist tiered reading content. |
| Define tiered reading package schema | #22 | Model tier, language, difficulty, and unlock metadata. |
| Add tiered AI-generated reading packages | #21 | Parent feature for the package system. |
| Create shared TextPlex contract layer | #20 | Move canonical shapes into `packages/shared`. |
| Implement import-to-reader-to-profile vertical slice | #19 | End-to-end import, processing, reading, and learning loop. |
| Promote preview pages into real app routes | #18 | Real routes for analysis, search, study, progress, activity, import, and settings. |
| Expanded lexicon coverage for missing pinyin | #13 | Broaden pinyin fallback and rare-character coverage. |
| [008] Build the mobile home dashboard | #12 | Mobile landing page work. |
| [009] Add a text analysis summary page | #11 | Book-level analysis surface. |
| [010] Rework the reader into an annotated reading view | #10 | Sentence-by-sentence reader with pinyin and definition sheet. |
| [011] Add vocabulary and progress insights | #9 | Vocabulary and progress dashboards. |
| Add theme store | Local pending | Track this locally until the GitHub issue and project card can be created. |

## Done

| Item | Issue | Notes |
| --- | --- | --- |
| Wire navigation shell to live product state | #17 | Shell and nav preserve context across routes. |
| Replace mock data with live API state | #16 | Preview surfaces now use live API responses. |
| Add backend endpoints for product surfaces | #15 | Analysis, search, study, progress, activity, import, and settings endpoints. |
| Add regression coverage for contracts and routes | #14 | Shared contract and route smoke coverage. |
