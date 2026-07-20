# Non-Romanized Language Scope

This document turns the non-Romanized processing template into a practical implementation order for TextPlex.

## Goal

Pick the first non-Latin scripts that deliver the most value to readers while keeping implementation risk reasonable.

## Selection Criteria

Use these signals together:

- learner demand proxy
- notable works and sales or readership
- availability of readable source material
- implementation complexity
- how much the language expands the app’s core reading loop

Public learner data is usually rank-based, not an absolute global learner count. For that reason, this document uses relative priority tiers instead of pretending there is a precise worldwide number for every language.

## Recommended Order

### Tier 1: Add first

#### Japanese

- Learner demand proxy: very high. Duolingo ranked Japanese as the 4th most popular language studied globally in 2025.
- Content signal: extremely strong. Manga, light novels, and literary fiction provide a deep reading corpus.
- Notable work signal: `ONE PIECE` reached 6 billion copies in worldwide cumulative circulation in 2026.
- Why it comes first: the combination of strong learner demand, enormous content availability, and clear reading motivation makes Japanese the strongest first non-Romanized target for TextPlex.
- Implementation note: start from [Japanese Text Processing Notes](./JAPANESE_TEXT_PROCESSING.md) and the starter corpus in [Non-Romanized Language Test Corpus](./NON_ROMANIZED_LANGUAGE_TEST_CORPUS.md).

#### Korean

- Learner demand proxy: very high. Duolingo ranked Korean 6th globally in 2025.
- Content signal: strong and still growing, especially through webtoons, web novels, and translated genre fiction.
- Notable work signal: `Solo Leveling` reached 3.8 million copies for the Japanese print run in 2026, and the franchise was reported at 14.3 billion web views.
- Why it comes first: Korean has clear learner demand and a modern reading ecosystem that maps well to TextPlex’s import-and-read workflow.

#### Chinese

- Learner demand proxy: high and growing. Duolingo ranked Chinese 8th globally in 2025, and also described it as among the fastest-growing languages in several large markets.
- Content signal: very strong, with a deep modern and classical corpus.
- Notable work signal: `The Three-Body Problem` is described by its publisher as having over 1 million copies sold in North America, while another publisher notes 4 million readers in China for the trilogy.
- Why it comes first: Chinese is strategically important and already central to the app’s current design, but it has higher segmentation complexity than Japanese or Korean.

### Tier 2: Add after the first wave

#### Russian

- Learner demand proxy: smaller than the first tier in current global learning rankings, but still meaningful and persistent.
- Content signal: strong literary and genre-fiction depth.
- Notable work signal: Eksmo states that Liya Arden’s `Mara and Morok` trilogy has sold over 1 million copies.
- Why it is second wave: the reading corpus is good, but the learner-demand signal is not as strong as Japanese, Korean, or Chinese.

#### Hebrew

- Learner demand proxy: smaller and more specialized, but with a dedicated audience.
- Content signal: healthy publishing output in Israel and a strong religious, educational, and literary corpus.
- Notable work signal: `Peninei Halakha` says it has sold over 1 million copies.
- Why it is second wave: the corpus is worthwhile, but the learner market is narrower than the East Asian languages and Chinese.

### Watchlist

#### Arabic

- Learner demand proxy: potentially large in the real world, but the public learner-ranking signals are not as strong in the data currently used here.
- Content signal: very large.
- Why it is not in the first wave: Arabic adds right-to-left handling and dialect complexity, so it should follow after the app has a solid non-Latin pipeline.

## Practical Recommendation

If the goal is to expand TextPlex in the most productive order, use this sequence:

1. Japanese
2. Korean
3. Chinese
4. Russian
5. Hebrew
6. Arabic, or another high-demand RTL language when there is a clear product need

That order balances learner demand, corpus depth, and implementation payoff.

## Test Corpus

Once a language is selected for implementation, start with the starter public-domain corpus in [Non-Romanized Language Test Corpus](./NON_ROMANIZED_LANGUAGE_TEST_CORPUS.md). It gives each language one shorter and one longer work so you can validate import, segmentation, rendering, and throughput before expanding the fixture set.

## Progression Benchmarks

For learner progression, align each language to the official test system that best matches the language and the available public vocabulary guidance. See [Non-Romanized Language Progression Benchmarks](./NON_ROMANIZED_LANGUAGE_PROGRESSION.md).

## Domestic Literacy Anchors

To keep vocabulary grounded in what learners actually need, also check the domestic school-literacy path and the resources learners cluster around. See [Non-Romanized Language Learner Ecosystem and Domestic Literacy Anchors](./NON_ROMANIZED_LANGUAGE_LEARNER_ECOSYSTEM.md).

## What Each Tier Should Reuse

Each new language should start from the shared non-Romanized template and then add language-specific rules for:

- normalization
- sentence splitting
- tokenization
- lexicon enrichment
- transliteration or pronunciation
- reader display behavior
- test coverage

Reference template: [Non-Romanized Language Processing Template](./NON_ROMANIZED_LANGUAGE_PROCESSING_TEMPLATE.md)

Japanese-specific starting point: [Japanese Text Processing Notes](./JAPANESE_TEXT_PROCESSING.md)

## Source Notes

- Duolingo 2025 Language Report
- Duolingo 2025 Asian and Pacific language trends report
- ORICON / Shueisha reporting on `ONE PIECE`
- KADOKAWA reporting on `Solo Leveling`
- Macmillan and Penguin Random House reporting on `The Three-Body Problem`
- Eksmo reporting on Liya Arden
- Peninei Halakha project site
