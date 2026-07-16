# Non-Romanized Language Progression Benchmarks

This document maps the current target languages to the most useful official proficiency tests and notes whether those tests publish a public vocabulary requirement.

Use this as a planning aid for learner progression in TextPlex, not as a substitute for the full exam handbooks.

## Summary

| Language | Official benchmark | Public vocabulary requirement? | How to use it in TextPlex |
|---|---|---|---|
| Chinese | HSK | Yes for HSK 1-6; 150 / 300 / 600 / 1,200 / 2,500 / 5,000+ words are published on the official HSK materials. | Best language for direct level-to-vocabulary progression. |
| Japanese | JLPT | No public official word-count ladder found in the official materials reviewed. JLPT measures language knowledge, including vocabulary and grammar. | Use JLPT bands as reading difficulty tiers, then derive internal vocab bands from corpus coverage. |
| Korean | TOPIK | No public official word-count ladder found in the official materials reviewed. TOPIK is proficiency-based. | Use TOPIK I/II and level descriptors as progression anchors, not word counts. |
| Russian | TRKI / Pushkin Institute certification | No public official word-count ladder found in the official materials reviewed. | Use A1-C2 certification levels and test section difficulty for staging. |
| Hebrew | YAEL | No public official word-count ladder found in the official materials reviewed. YAEL tests vocabulary, grammar, syntax, reading, and writing. | Use YAEL as a placement-style benchmark, but not as a vocabulary quota system. |
| Arabic | ACTFL OPI / AAPPL in Arabic | No public official vocabulary ladder is published in the official materials reviewed. | Use ACTFL proficiency bands for speaking/reading/writing milestones. |

## Chinese

Chinese is the only target language in this set where the official exam system gives a clean public vocabulary ladder that can be used almost directly.

- HSK 1: 150 words
- HSK 2: 300 words
- HSK 3: 600 words
- HSK 4: 1,200 words
- HSK 5: 2,500 words
- HSK 6: 5,000+ words

For TextPlex, that makes Chinese the easiest language to align with explicit vocabulary progression. It is also the most natural place to show a learner-facing "you know about X words" model.

## Japanese

Official JLPT materials describe the levels in terms of reading and listening competence, while vocabulary and grammar are part of the underlying language knowledge.

What that means for TextPlex:

- use JLPT N5 and N4 for early reading corpora
- use N3 as a bridge level
- use N2 and N1 for broader, native-facing reading material
- do not treat JLPT as a public word-count test

The practical implementation should track internal vocabulary coverage by corpus, because the official test materials do not provide a simple public count ladder.

## Korean

TOPIK is also proficiency-based.

What that means for TextPlex:

- use TOPIK I as the beginner path
- use TOPIK II as the intermediate and advanced path
- do not expect a public official vocabulary quota from the test body

For app progression, it is better to stage Korean by text complexity, sentence length, and reading burden than by a fixed vocab threshold.

## Russian

The Pushkin Institute's TRKI system and related certification pages describe a full A1-C2 ladder and include reading, writing, listening, speaking, and vocabulary/grammar components.

What that means for TextPlex:

- use A1/A2 for entry corpora
- use B1 for general reading material
- use B2+ for fuller literary and argumentative prose
- do not depend on a public official vocabulary count

Russian is a good fit for staged reading difficulty, but the official test system is not published as a simple word-count ladder.

## Hebrew

YAEL is a Hebrew proficiency test used by Israeli higher-education institutions.

The official materials reviewed say it tests:

- vocabulary
- grammar
- syntax
- reading comprehension
- writing

What that means for TextPlex:

- use YAEL as a placement benchmark
- use difficulty bands rather than word-count thresholds
- expect the app to infer learner progression from reading performance and exposure, not from a public official vocabulary list

## Arabic

For Arabic, the most portable official proficiency path is ACTFL-based:

- AAPPL is available in Arabic
- ACTFL OPI is available in Arabic varieties, including MSA and several regional options

What that means for TextPlex:

- use ACTFL proficiency bands for milestone planning
- use reading difficulty and script-handling complexity as primary progression signals
- do not expect a public official vocabulary quota from these tests

## Recommendation For TextPlex

If we want the app to feel aligned with real learner goals, the best approach is:

1. Use Chinese HSK as the only explicit public vocabulary ladder.
2. Use JLPT, TOPIK, TRKI, YAEL, and ACTFL as proficiency anchors.
3. Derive internal vocabulary bands from corpus coverage and reader behavior for the languages that do not publish a stable word-count ladder.

That gives us a clean app model:

- official public vocab targets where they exist
- official proficiency levels where they do not
- internal corpus-based exposure tracking everywhere

## Domestic Literacy And Learner Ecosystems

Vocabulary should also be filtered through domestic school literacy and the resources learners actually gather around. See [Non-Romanized Language Learner Ecosystem and Domestic Literacy Anchors](./NON_ROMANIZED_LANGUAGE_LEARNER_ECOSYSTEM.md).

## Source Notes

- HSK official levels and vocabulary thresholds from Chinese Testing Service / HSK materials
- JLPT official level and section descriptions
- TOPIK official test pages and sample materials
- Pushkin Institute TRKI and certification pages
- NITE YAEL official format and test pages
- ACTFL proficiency and assessment pages
