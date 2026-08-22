# Page Guide Coverage

The `?` button is available in the shared build card on every route. Pages with a dedicated guide show route-specific content; every other route uses the shared two-slide **TextPlex** guide.

Source of truth: `apps/web/components/page-guide.tsx` (`resolveGuide`). Review this file whenever a route is added or a dedicated walkthrough is introduced.

## Dedicated Guides

| Route | Guide |
| --- | --- |
| `/home` | Home |
| `/library` | Library |
| `/reader/[bookId]/[pageNumber]` | Reader |
| `/study` | Study |
| `/study/practice` | Study |
| `/import` | Import |

## Routes Using the General TextPlex Guide

| Route | Source page |
| --- | --- |
| `/` | `apps/web/app/page.tsx` |
| `/activity` | `apps/web/app/activity/page.tsx` |
| `/admin` | `apps/web/app/admin/page.tsx` |
| `/admin/feedback` | `apps/web/app/admin/feedback/page.tsx` |
| `/admin/themes` | `apps/web/app/admin/themes/page.tsx` |
| `/analysis/[bookId]` | `apps/web/app/analysis/[bookId]/page.tsx` |
| `/archive` | `apps/web/app/archive/page.tsx` |
| `/auth` | `apps/web/app/auth/page.tsx` |
| `/auth/callback` | `apps/web/app/auth/callback/page.tsx` |
| `/auth/reset-password` | `apps/web/app/auth/reset-password/page.tsx` |
| `/books/[bookId]` | `apps/web/app/books/[bookId]/page.tsx` |
| `/goals` | `apps/web/app/goals/page.tsx` |
| `/onboarding` | `apps/web/app/onboarding/page.tsx` |
| `/portal` | `apps/web/app/portal/page.tsx` |
| `/privacy` | `apps/web/app/privacy/page.tsx` |
| `/profile` | `apps/web/app/profile/page.tsx` |
| `/profile/themes` | `apps/web/app/profile/themes/page.tsx` |
| `/progress` | `apps/web/app/progress/page.tsx` |
| `/roadmap` | `apps/web/app/roadmap/page.tsx` |
| `/search` | `apps/web/app/search/page.tsx` |
| `/settings` | `apps/web/app/settings/page.tsx` |
| `/tester` | `apps/web/app/tester/page.tsx` |
| `/themes` | `apps/web/app/themes/page.tsx` |
| `/themes/[category]` | `apps/web/app/themes/[category]/page.tsx` |

Unmatched and not-found routes also use the general guide through the resolver fallback.

## Good Candidates for Dedicated Guides

The general guide is sufficient for simple informational pages. Dedicated walkthroughs would add the most value on routes with multi-step workflows, unfamiliar data, or decisions that affect reading progress.

| Priority | Route | Why it is a good candidate | Suggested guide topics |
| --- | --- | --- | --- |
| High | `/import` | Importing is a primary entry point and has several possible content sources and processing states. | Choose a source, paste or upload content, understand processing, and open the finished reading item. |
| High | `/books/[bookId]` | Book details connect processing status, reading state, and the actions that change a book. | Read the overview, understand status, open or restart reading, refresh content, and return to the library. |
| High | `/analysis/[bookId]` | Analysis presents unfamiliar language-learning evidence that benefits from interpretation. | Read page-level evidence, understand HSK levels and averages, and use analysis to choose what to study next. |
| High | `/study/practice` | Practice is an active learning flow with controls and feedback that differ from the Study overview. | Start a practice session, answer or reveal meaning, use pronunciation support, and finish or revisit items. |
| Medium | `/progress` | Progress combines several metrics and comparisons that may not be self-explanatory. | Read the main insight, compare pace and exposure, jump to supporting evidence, and choose a follow-up action. |
| Medium | `/goals` | Goals require learners to understand periods, targets, and completion states. | Set a useful target, read progress visuals, adjust a goal, and connect goals to reading or study. |
| Medium | `/archive` | Archived and finished items have different actions from the active library. | Find finished reading, restore an item, reopen details, and permanently delete when appropriate. |
| Medium | `/settings` | Settings contains learner preferences whose effects may not be visible immediately. | Change reading display, pronunciation, theme, and local or hosted preference behavior. |
| Medium | `/themes` and `/themes/[category]` | The theme catalog has browsing, preview, category, and device-mode behavior. | Browse collections, preview variants, select a theme, and understand device-following behavior. |
| Later | `/profile` | Profile is useful once learners have enough reading history to interpret its summaries. | Read profile totals, history, pace, and language-specific progress. |
| Later | `/activity` | Activity is primarily a history surface and may need a guide as event types grow. | Interpret event entries, filters, and links back to the related reading or study action. |

Recommended next additions: `/books/[bookId]`, `/analysis/[bookId]`, and `/study/practice`.

## Adding a Dedicated Guide

Add the content to `PAGE_GUIDES`, map its route in `resolveGuide`, and move that route from the general-guide table to the dedicated-guide table in this document. Keep the `shell.page-guide-trigger` entry in `docs/COMPONENTS_INVENTORY.md` current if the trigger’s user-visible behavior changes.
