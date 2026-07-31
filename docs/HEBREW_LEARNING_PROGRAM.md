# Hebrew Learning Program

This note specializes the shared language-learning program template for Hebrew in TextPlex.

Hebrew should be modeled as a right-to-left, morphology-aware reading program with a proficiency-based progression ladder. YAEL supplies the external anchor, while the reader needs careful handling for directionality, optional niqqud, and clitic-heavy forms.

## Language Profile

- Language: Hebrew
- Script(s): Hebrew script, with optional niqqud and occasional Latin text
- Directionality: right to left
- Word spacing behavior: spaces exist, but prefixes and clitics can attach to words
- Segmentation strategy: clitic-aware tokenization with bidi-safe display
- Pronunciation / transliteration system: optional romanization or reading aid
- Primary lexicon source: Hebrew dictionary and frequency-backed starter lists
- Exam / proficiency anchor: YAEL
- Reader display conventions: preserve Hebrew source text and handle niqqud as an aid, not a requirement

## Program Purpose

The Hebrew program should help the learner move from letter and word recognition into unvoweled reading fluency.

Because YAEL does not publish a public vocabulary ladder, Hebrew should use proficiency bands, learner exposure, and reading difficulty as the progression model.

## Core Model

Hebrew should connect:

- structured study from a frequency or curriculum-backed list
- reader exposure from imported Hebrew text
- mastery progression and SRS timing underneath

The same word should keep one learner record across both pathways.

## Study Pathway

- Use a curated Hebrew backbone as the study source.
- Prioritize common school vocabulary, media vocabulary, and high-value reading words.
- Keep study items linked to a lemma or canonical form, not only a single visible spelling.
- Track whether the learner first met the item in the study program or in the reader.

## Reader Pathway

- Reader exposures should update the same learner state as the study path.
- A tapped token should count as assisted exposure.
- A no-tap encounter should count as unassisted exposure.
- The reader should stay bidi-safe and preserve the original spelling direction.

## Lookup Order

Recommended Hebrew lookup order:

1. exact surface-form lookup
2. lemma or canonical-form lookup
3. clitic-stripped family lookup
4. cached reader lookup
5. external fallback service

This order matters because Hebrew words often carry prefixes or attached function elements that should not create separate learner identities.

## Mastery And SRS

- `mastery_level` should describe reading confidence.
- `mastery_score` should describe the strength of that confidence.
- `srs_stage` should control recurrence timing.

Suggested Hebrew rule:

- use YAEL and reading performance as the public progression frame
- use actual reader encounters to decide whether the learner can handle unvoweled text comfortably

## Identity Rules

The canonical Hebrew identity should usually be the lemma or consonantal base form, while the learner still sees the actual surface token from the source text.

Niqqud should be treated as an optional reading aid, not the only form the learner can understand.

## Reader Output Rules

- Preserve the original Hebrew text exactly.
- Keep right-to-left layout stable.
- Show niqqud or transliteration only when useful.
- Surface source provenance for dictionary lookups and fallback lookups.

## Progression Anchors

- Official exam anchor: YAEL
- Vocabulary ladder: no public official ladder
- Use case in TextPlex: a proficiency-based language with bidi handling and optional reading aids

## Verification Checklist

- bidi layout stays stable
- clitic-aware tokenization preserves source text
- niqqud does not replace the original spelling
- reader and study exposures merge into one learner history
- mastery remains separate from book data

