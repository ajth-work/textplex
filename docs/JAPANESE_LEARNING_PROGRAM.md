# Japanese Learning Program

This note specializes the shared language-learning program template for Japanese in TextPlex.

Japanese should be modeled as a no-public-vocabulary-ladder language with a strong reading-first progression. JLPT supplies the external proficiency anchor, while the reader needs to preserve kanji, hiragana, and katakana as visible forms.

## Language Profile

- Language: Japanese
- Script(s): kanji, hiragana, katakana, and limited Latin text
- Directionality: left to right
- Word spacing behavior: no native spacing between most words
- Segmentation strategy: mixed-script tokenization with kana preservation
- Pronunciation / transliteration system: reading support, kana, or romanization when needed
- Primary lexicon source: Japanese dictionary and frequency-backed starter lists
- Exam / proficiency anchor: JLPT N5-N1
- Reader display conventions: preserve the original script mix and avoid flattening kana into generic romanization

## Program Purpose

The Japanese program should help the learner move from kana-aware beginner reading into broader mixed-script fluency.

Because JLPT does not publish a simple public word-count ladder, Japanese should use JLPT levels, corpus coverage, and reader behavior to stage the program.

## Core Model

Japanese should connect:

- structured study from frequency or level-based lists
- reader exposure from imported Japanese text
- mastery progression and SRS timing underneath

The same Japanese word should keep one learner history whether it first appears in study or in the reader.

## Study Pathway

- Use JLPT bands as the study-level anchor.
- Prioritize common school, media, and everyday vocabulary.
- Keep kana-only vocabulary, kanji compounds, and mixed-script forms in the same progression model.
- Record whether the learner first met the item in study or in the reader.

## Reader Pathway

- Reader exposures should update the same learner state as the study path.
- A token tap should mark assisted exposure.
- A no-tap encounter should mark unassisted exposure.
- Hiragana and katakana runs should remain visible, not collapsed away by segmentation.

## Lookup Order

Recommended Japanese lookup order:

1. exact surface-form lookup
2. dictionary form or lemma lookup
3. mixed-script family or inflection-family lookup
4. cached reader lookup
5. external fallback service

Japanese lookup should respect kana and kanji together instead of treating either script as expendable.

## Mastery And SRS

- `mastery_level` should describe reading confidence.
- `mastery_score` should describe the strength of that confidence.
- `srs_stage` should set review timing.

Suggested Japanese rule:

- use JLPT for the public progression frame
- use actual reader encounters to determine whether the learner can transfer that level into real text

## Identity Rules

The canonical Japanese identity should usually be the dictionary form, while the learner still sees the actual surface token from the source text.

Kana readings, inflected endings, and compounds should all remain linked to the same learner history when they belong to the same lexical item.

## Reader Output Rules

- Preserve the original Japanese text exactly.
- Keep kanji, hiragana, and katakana visible.
- Show reading support on demand or in a compact token card.
- Surface source provenance for dictionary lookups and fallback lookups.

## Progression Anchors

- Official exam anchor: JLPT
- Vocabulary ladder: no public official ladder
- Use case in TextPlex: a proficiency-based language with mixed-script tokenization and reading-first mastery

## Verification Checklist

- kana runs remain visible
- kanji/kana segmentation preserves source text
- romanization does not replace the original script
- reader and study exposures merge into one learner history
- mastery remains separate from book data

