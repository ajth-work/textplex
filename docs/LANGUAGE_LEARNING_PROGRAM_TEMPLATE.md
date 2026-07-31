# Language Learning Program Template

Use this template when defining the learner program for a target language in TextPlex.

It is designed to be copied and specialized for languages such as Chinese, Korean, Japanese, Russian, Hebrew, and Arabic.

The goal is to keep the program model consistent across languages while still allowing each language to define its own script handling, lexicon source, progression ladder, and reader behavior.

## 1. Language Profile

- Language:
- Script(s):
- Directionality:
- Word spacing behavior:
- Segmentation strategy:
- Pronunciation / transliteration system:
- Primary lexicon source:
- Exam / proficiency anchor:
- Reader display conventions:

## 2. Program Purpose

Describe what this language program is trying to accomplish in TextPlex.

- What kind of learner is this for?
- Is the program anchored to a frequency list, an exam ladder, a school curriculum, or a corpus?
- What does "mastery" mean for this language?
- What counts as a successful transition from study into independent reading?

## 3. Core Model

The language program should connect three things:

1. structured study
2. reader exposure
3. spaced repetition or mastery progression

The same word should keep one learner history even if it is first learned in the study program and later seen in the reader, or first encountered in the reader and later reviewed in the study program.

## 4. Shared Learner State

Recommended learner-state fields:

- `first_introduced_source`
- `study_exposures`
- `reader_exposures`
- `helped_reader_exposures`
- `unassisted_reader_exposures`
- `last_study_seen_at`
- `last_reader_seen_at`
- `mastery_score`
- `mastery_level`
- `srs_stage`

Document any language-specific additions here.

### Per-item axis state

Each vocabulary item should keep one aggregate learner record plus one record per active assessment axis.

The default axis set is:

- `form_to_meaning`
- `form_to_reading`
- `meaning_to_form`
- `reading_to_form`

Each axis record should track:

- `axis_key`
- `stage`
- `due_at`
- `last_seen_at`
- `last_result`
- `pass_count`
- `fail_count`

The aggregate item state should be derived from the axis records, not stored as a separate guessing layer.
As a practical rule, the item is only as strong as its weakest active axis.

Stage 0 should behave as the shared introduction gate:

- the learner must clear all active axes for the item to exit stage 0
- once stage 0 is cleared, each axis advances independently
- a correct axis moves forward on its own ladder
- a failed axis moves back one step, but never below stage 1 after introduction
- a failed axis stays at stage 0 only while it is still in the introduction gate
- the item is considered due whenever any active axis is due

## 5. Study Pathway

Describe the structured program for the language.

- What list or corpus starts the program?
- What order should the learner see items in?
- Is the program organized by frequency, exam level, school grade, or thematic units?
- How should study review affect mastery?
- How should the app mark an item as already introduced in the study path?

### Study assessment model

Use a language-agnostic assessment matrix instead of a single forward/backward test.

Each item can be checked along up to four axes:

1. source form -> meaning
2. source form -> pronunciation / transliteration
3. meaning -> source form
4. pronunciation / transliteration -> source form

The second axis should use the language's canonical reading cue:

- pronunciation for languages with a stable spoken form
- transliteration or romanization for languages that need a written bridge
- omit the axis if the language has no useful equivalent

These axes may advance independently. A learner can know how to read a word, but still fail to produce its spelling or translate it from meaning back into the source form.
Use the same SRS ladder per axis, and treat the next review as the earliest due axis among the active records.

## 6. Reader Pathway

Describe how the reader reinforces the same learner state.

- How should reader exposures be counted?
- How should the app record a tap or help event?
- How should the app record a no-tap / no-help event?
- How should previously studied words be shown in the reader?
- How should the reader treat repeated exposures across different books or passages?

## 7. Lookup Order

Document the preferred lookup order for tokens in this language.

Recommended structure:

1. exact surface-form lookup
2. lemma / headword lookup
3. inflection-family or derivation-family lookup
4. cached reader lookup
5. external fallback service

Replace this order if the language needs a different priority.

## 8. Mastery And SRS

Describe the relationship between mastery and scheduling.

- `mastery_level` should represent the qualitative stage.
- `mastery_score` should represent the numeric confidence behind that stage.
- `srs_stage` should describe the next review band or interval.

Suggested rule:

- mastery first
- timing second

Document the language-specific thresholds, if any.

## 9. Exposure Weighting

Define how exposures should contribute to learner progress.

Suggested starting points:

- study introduction
- study review passed
- reader exposure with help
- reader exposure without help
- recent-study reinforcement
- same-day repeated exposure with diminishing returns

Replace the default weights with language-specific values if needed.

## 10. Identity Rules

State what the learner record should treat as the canonical identity for a word.

- surface form
- lemma or headword
- inflection family
- derivation family
- pronunciation or transliteration, if relevant

For morphologically rich languages, the canonical record should usually be lemma-based rather than surface-form-only.

## 11. Reader Output Rules

Describe what the reader should show to the learner.

- What must remain visible from the source text?
- Should pronunciation appear inline, in a token card, or on demand?
- Should the app show source provenance for a definition or transliteration?
- Should the app show whether the lookup came from the study program, the local lexicon, cached reader state, or an external fallback?

## 12. Data Separation

Keep book truth and learner truth separate.

- Book database stores:
  - processed pages
  - sentences
  - tokens
  - lexical annotations tied to the source text
- User profile database stores:
  - exposures
  - mastery state
  - SRS progress
  - reading history

Do not persist learner progress in the book database.

## 13. Progression Anchors

Describe the proficiency ladder or progression model for this language.

- Official exam or proficiency anchor:
- Whether the exam publishes a public vocabulary ladder:
- Whether to use frequency rank, proficiency band, curriculum grade, or corpus coverage:
- Whether the app should prefer level-based mastery over calendar-based pacing:

For languages with no public vocabulary ladder, use corpus coverage and reader performance as the progression signal.

## 14. Verification Checklist

When changing this language program, verify:

- visible surface forms stay stable
- tokenization behaves correctly for the language
- lookup resolves exact matches before fallback
- pronunciation or transliteration appears only when expected
- exposure tracking counts study and reader pathways separately
- learner progress stays separate from book data
- reader payloads still match the source text

## 15. Language-Specific Notes

Use this section for edge cases that do not fit the generic template.

Examples:

- script-specific segmentation behavior
- romanization or transliteration edge cases
- clitics, particles, or affixes
- punctuation rules
- bidi or shaping rules
- pronunciation source priority

## 16. Suggested Derivatives

When you are ready to specialize this template, create a language-specific note such as:

- `CHINESE_LEARNING_PROGRAM.md`
- `KOREAN_LEARNING_PROGRAM.md`
- `JAPANESE_LEARNING_PROGRAM.md`
- `RUSSIAN_LEARNING_PROGRAM.md`
- `HEBREW_LEARNING_PROGRAM.md`
- `ARABIC_LEARNING_PROGRAM.md`

## 17. Related Notes

This template should stay aligned with:

- `docs/NON_ROMANIZED_LANGUAGE_PROCESSING_TEMPLATE.md`
- `docs/NON_ROMANIZED_LANGUAGE_PROGRESSION.md`
- language-specific text-processing notes
- language-specific lexicon acquisition notes
