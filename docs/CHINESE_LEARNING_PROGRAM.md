# Chinese Learning Program

This note specializes the shared language-learning program template for Chinese in TextPlex.

Chinese is the strongest fit for a frequency-based learner program because the official HSK ladder publishes an explicit public vocabulary progression.

## Language Profile

- Language: Chinese
- Script(s): Chinese characters, with pinyin as a reading aid
- Directionality: left to right
- Word spacing behavior: no fixed spacing between characters; word segmentation is a processing aid
- Segmentation strategy: character- and word-aware segmentation
- Pronunciation / transliteration system: pinyin
- Primary lexicon source: HSK-aligned vocabulary and dictionary-backed Chinese lexicon data
- Exam / proficiency anchor: HSK 1-6
- Reader display conventions: preserve the original characters and show pinyin only when useful

## Program Purpose

The Chinese program should help a learner move from HSK-aligned beginner reading into independent reading with growing corpus coverage.

Because HSK publishes a public vocabulary ladder, Chinese can use an explicit level-to-word model instead of inferring progression entirely from corpus behavior.

## Core Model

Chinese should connect:

- structured HSK study
- reader exposure from imported Chinese text
- spaced repetition and mastery progression

The same learner record should accumulate exposure from both pathways.

## Study Pathway

- Use HSK as the visible study ladder.
- Seed the study path with the HSK vocabulary backbone.
- Prefer words and characters that support everyday reading, textbooks, and graded readers.
- Allow the study program to record whether an item was first introduced in HSK study or later encountered in the reader.

## Reader Pathway

- Reader exposures should update the same learner record used by the study program.
- A tap on a token should mark the exposure as assisted.
- A successful no-tap encounter should mark the exposure as unassisted.
- The reader should keep the original characters visible and treat pinyin as an aid rather than a replacement.

## Lookup Order

Recommended Chinese lookup order:

1. exact surface-form lookup
2. normalized word lookup
3. lemma or dictionary headword lookup
4. cached reader lookup
5. external fallback service

For Chinese, segmentation quality matters because dictionary entries may be word-based even when the visible script is character-based.

## Mastery And SRS

- `mastery_level` should describe the learner's reading confidence.
- `mastery_score` should describe the confidence behind that level.
- `srs_stage` should control review timing underneath the mastery model.

Suggested Chinese rule:

- use HSK as the public progression ladder
- use mastery and reader behavior to decide how well the learner can transfer that level into real reading

## Identity Rules

Chinese learner identity should usually center on the dictionary word or headword, while still preserving the visible character sequence the learner saw.

When a token is a compound or multi-character word, keep the surface form and the headword linked together.

## Reader Output Rules

- Preserve the source Chinese text exactly.
- Show pinyin inline only when it helps the learner.
- Keep character visibility primary.
- Surface source provenance for dictionary lookups and cached revisits.

## Progression Anchors

- Official exam anchor: HSK
- Vocabulary ladder: yes, public and explicit
- Use case in TextPlex: the primary language for frequency-based progression with a visible level ladder

## Verification Checklist

- HSK level ordering remains stable
- character and word segmentation preserve source text
- pinyin does not replace the original script
- reader and study exposures merge into one learner history
- mastery remains separate from the book database

