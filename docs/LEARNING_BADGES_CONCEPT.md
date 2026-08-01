# Learning Badges Concept

## Summary

TextPlex could award large, profile-visible badges for meaningful learner progress in a specific language and category, such as nouns, verbs, adjectives, phrases, or characters. The goal is to make hard-earned progress legible on the profile without turning the product into a points game.

The badge system should reflect both breadth and depth:

- breadth: how many unique items the learner has reached
- depth: how stable those items are under spaced repetition and review

That makes a badge more than a count. It becomes a visible proof of accumulated reading and retention work.

## Why This Fits TextPlex

TextPlex already separates learner truth from book truth. Badges should live on top of learner truth, not inside book data.

That means a badge can be derived from:

- the learner profile database
- exposure history
- item-level mastery state
- language and category metadata

The badge should never be awarded because a book happened to contain enough items. It should be awarded because the learner actually retained enough of them.

## Core Idea

Each badge would combine four dimensions:

1. language
2. learning category
3. quantity threshold
4. mastery tier

Example:

- Spanish nouns
- 250-item threshold
- apprentice mastery tier

Possible display label:

- `250 Nouns - Apprentice`

The user could see that badge on their profile as a large tile with distinct styling, not as a tiny inline icon.

## Badge Families

### 1. Quantity Milestones

These badges recognize reaching a count threshold in a category.

Example thresholds:

- 50
- 100
- 250
- 500

Example categories:

- nouns
- verbs
- adjectives
- adverbs
- phrases
- characters

Quantity milestones should answer the question: how much has the learner accumulated?

### 2. Mastery Tiers

These badges recognize how well the learner remembers the items in that bucket.

Example ladder:

- beginner
- apprentice
- proficient
- mastered

Exact labels can be adjusted by language or product tone, but the ladder should always communicate increasing retention quality.

Mastery tiers should answer the question: how stable is the knowledge?

### 3. Category Badges

Some badges should be category-specific because category scope matters to the learner.

Examples:

- noun collection
- verb collection
- phrase collection
- character collection

This is especially useful when a language has different learning difficulty by category, or when a learner wants to show strength in a particular type of item.

### 4. Language Badges

Badges should be scoped per language so that progress is not flattened across the whole account.

Examples:

- Japanese noun badge
- Korean character badge
- Arabic phrase badge

That keeps the badge meaningful in a multi-language profile.

## Award Logic

A badge should only unlock when both conditions are true:

- the learner has reached the count threshold
- the items meet the mastery threshold for the badge tier

Recommended rule:

- counts should use unique canonical learner items
- mastery should use the existing learner-state model, not a separate badge-only score
- review stability should matter more than raw exposure count

This avoids rewarding shallow exposure or repeated lookup alone.

## Suggested Label Strategy

The exact labels should be chosen to match the final tone of TextPlex. The system can support two styles:

### Literal Labels

Examples:

- `250 Nouns - Beginner`
- `250 Nouns - Apprentice`
- `250 Nouns - Proficient`
- `250 Nouns - Mastered`

This is the clearest option and easiest for learners to understand quickly.

### Thematic Labels

Examples:

- `Noun Collector I`
- `Noun Collector II`
- `Noun Collector III`
- `Noun Collector IV`

This is more stylized, but it should still map cleanly to the underlying mastery tier so the meaning stays obvious.

## Visual Treatment

Badges should feel substantial and earned.

Suggested treatment:

- large tile size on the profile page
- language accent color
- clear category icon or glyph
- count and mastery label in the same tile
- earned/locked distinction for near-miss progress
- optional subtle depth treatment for higher tiers

The visual design should signal progress, not celebration noise.

## Data Model Sketch

A practical implementation would likely need three concepts:

### Badge Definition

Stores the rule for a badge.

Possible fields:

- badge id
- language scope
- category
- quantity threshold
- mastery threshold
- label
- display order

### Badge Award

Stores that a learner has earned the badge.

Possible fields:

- learner id
- badge id
- awarded at
- source snapshot or evaluation version

### Derived Badge View

The profile UI can read a derived view of current eligible and already-earned badges.

This keeps the badge display stable even if the underlying thresholds evolve later.

## Profile Placement

The most likely first home for these badges is the profile page.

Good placements:

- a featured badge shelf near the top of `/profile`
- a dedicated achievements section in the profile surface
- a compact summary in the learning summary card

Badges should feel like a profile artifact, not an interruptive reward modal.

## Relationship To SRS

The badge system should use SRS outcomes as a signal for mastery, but not replace SRS itself.

Recommended principle:

- exposure counts track volume
- mastery state tracks retention
- badges are a presentation layer over both

That keeps the visible achievement honest and ties it to real learning behavior.

## What The System Should Not Do

- It should not reward raw lookups as if they were mastery.
- It should not use book-derived counts as the source of truth.
- It should not merge progress across languages unless the product explicitly wants a global achievement layer.
- It should not turn the profile into a gamey badge wall that obscures the actual learning metrics.

## Open Questions

- Which mastery labels should TextPlex use globally: `beginner`, `apprentice`, `proficient`, `mastered`, or a different ladder?
- Should counts be based on all canonical items or only on items that have crossed a mastery floor?
- Should the first version ship with nouns only, or with nouns, verbs, adjectives, and phrases together?
- Should badge art vary by language, category, or mastery tier?
- Should earned badges be fully deterministic from profile data, or cached as award records for history and display stability?

## Risks

- If thresholds are too low, badges will feel cheap.
- If thresholds are too high, badges will never feel attainable.
- If the mastery rule is too loose, the badge will overstate real retention.
- If the badge surface becomes too large, it can crowd out the actual learning summary.

## Related Repo Areas

- `docs/DATA_MODEL.md`
- `docs/ARCHITECTURE.md`
- `docs/COMPONENTS_INVENTORY.md`
- `docs/LANGUAGE_LEARNING_PROGRAM_TEMPLATE.md`
- `docs/CHINESE_LEARNING_PROGRAM.md`
- `docs/KOREAN_LEARNING_PROGRAM.md`
- `docs/JAPANESE_LEARNING_PROGRAM.md`
- `docs/RUSSIAN_LEARNING_PROGRAM.md`
- `docs/HEBREW_LEARNING_PROGRAM.md`
- `docs/ARABIC_LEARNING_PROGRAM.md`
- `apps/web/`
- `apps/api/`

