# Arabic Learning Program

This note specializes the shared language-learning program template for Arabic in TextPlex.

Arabic should be modeled as a right-to-left, morphology-rich reading program with proficiency-based progression. ACTFL-style Arabic proficiency anchors guide the learning bands, while the reader needs strong support for script shaping, diacritics, and derivational families.

## Language Profile

- Language: Arabic
- Script(s): Arabic script, with optional Latin text and transliteration
- Directionality: right to left
- Word spacing behavior: spaces exist, but morphology and attached particles can complicate token boundaries
- Segmentation strategy: morphology-aware tokenization with bidi-safe display
- Pronunciation / transliteration system: optional transliteration or reading aid
- Primary lexicon source: Arabic dictionary and frequency-backed starter lists
- Exam / proficiency anchor: ACTFL-based Arabic proficiency bands
- Reader display conventions: preserve Arabic source text and show reading aids only when useful

## Program Purpose

The Arabic program should help the learner move from script familiarity into broad reading comprehension across Modern Standard Arabic.

Because the target ecosystem does not provide one public vocabulary ladder, Arabic should use proficiency bands, corpus coverage, and reader performance as the progression model.

## Core Model

Arabic should connect:

- structured study from a frequency or curriculum-backed list
- reader exposure from imported Arabic text
- mastery progression and SRS timing underneath

The same word should keep one learner record across both pathways.

## Study Pathway

- Use Modern Standard Arabic as the default study base.
- Prioritize high-frequency words, common derivational families, and school/media vocabulary.
- Keep study items linked to canonical forms and derivational families when relevant.
- Track whether the learner first met the item in study or in the reader.

## Reader Pathway

- Reader exposures should update the same learner state as the study path.
- A tapped token should count as assisted exposure.
- A no-tap encounter should count as unassisted exposure.
- The reader should keep the original right-to-left sentence visible and support source-sentence toggles when needed.

## Lookup Order

Recommended Arabic lookup order:

1. exact surface-form lookup
2. lemma or canonical-form lookup
3. root or derivational-family lookup
4. cached reader lookup
5. external fallback service

This order matters because Arabic words may share roots and patterns even when the visible surface form changes.

## Mastery And SRS

- `mastery_level` should describe reading confidence.
- `mastery_score` should describe the strength of that confidence.
- `srs_stage` should control recurrence timing.

Suggested Arabic rule:

- use ACTFL-style proficiency bands for the public progression frame
- use reader exposures to determine whether the learner can handle unvoweled reading and morphology with less support

## Identity Rules

The canonical Arabic identity should usually be the lemma or root-linked canonical form, while the learner still sees the actual surface token from the source text.

The program should preserve the relationship between a word, its derivational family, and the specific inflected or attached form the learner encountered.

## Reader Output Rules

- Preserve the original Arabic text exactly.
- Keep right-to-left layout stable.
- Show transliteration or pronunciation only when it helps the learner.
- Surface source provenance for dictionary lookups, cached revisits, and fallback lookups.

## Progression Anchors

- Official exam anchor: ACTFL Proficiency Guidelines 2024 for Arabic
- Working progression ladder:
  - Novice Low
  - Novice Mid
  - Novice High
  - Intermediate Low
  - Intermediate Mid
  - Intermediate High
  - Advanced Low
  - Advanced Mid
  - Advanced High
  - Superior
  - Distinguished
- Vocabulary ladder: no public official ladder
- Use case in TextPlex: a proficiency-based language with morphology-aware lookup and bidi rendering

## Verification Checklist

- bidi layout stays stable
- morphology-aware tokenization preserves source text
- transliteration does not replace the original script
- reader and study exposures merge into one learner history
- mastery remains separate from book data
