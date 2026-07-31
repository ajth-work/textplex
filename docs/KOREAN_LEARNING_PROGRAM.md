# Korean Learning Program

This note specializes the shared language-learning program template for Korean in TextPlex.

Korean should be modeled as a proficiency-led, morphology-aware reading program with a frequency backbone. TOPIK supplies the external progression anchor, while reader exposures and the study path reinforce the same learner history.

## Language Profile

- Language: Korean
- Script(s): Hangul, with occasional Hanja and Latin loanwords
- Directionality: left to right
- Word spacing behavior: spaces exist, but spacing does not align perfectly with lexical units
- Segmentation strategy: Hangul-aware tokenization with particle and suffix handling
- Pronunciation / transliteration system: romanization or pronunciation support when available
- Primary lexicon source: Korean dictionary and frequency-backed starter lists
- Exam / proficiency anchor: TOPIK I / II
- Reader display conventions: keep Hangul visible and surface romanization only where it helps

## Program Purpose

The Korean program should help the learner move from TOPIK-aligned beginner content into real reader fluency.

Because TOPIK does not publish a stable public vocabulary quota, Korean should use proficiency bands, reader performance, and frequency-backed vocab lists as the progression model.

## Core Model

Korean should connect:

- structured study from the Korean vocabulary backbone
- reader exposure from imported Korean content
- mastery progression with SRS timing underneath

The same Korean word should keep one learner record across both pathways.

## Study Pathway

- Use a curated Korean frequency list or TOPIK-oriented list as the study backbone.
- Prioritize high-value everyday vocabulary, school vocabulary, and reader-heavy forms.
- Track whether the learner first met the item in the study program or in the reader.
- Keep particle-rich forms linked to the stem or lemma so repeated inflected forms do not create duplicate learning histories.

## Reader Pathway

- Reader exposures should reinforce the same learner state used by the study program.
- A tapped token should count as assisted exposure.
- A confident no-tap encounter should count as unassisted exposure.
- When a word is already in the study program, the reader should still count it as a new exposure rather than ignoring it.

## Lookup Order

Recommended Korean lookup order:

1. exact surface-form lookup
2. stem or lemma lookup
3. particle-aware decomposition or suffix-aware family lookup
4. cached reader lookup
5. external fallback service

This order matters because Korean surfaces often combine a lexical stem with grammatical particles or endings.

## Mastery And SRS

- `mastery_level` should describe the learner's reading confidence.
- `mastery_score` should describe how stable that confidence is.
- `srs_stage` should handle recurrence timing.

Suggested Korean rule:

- use TOPIK as the public proficiency anchor
- use frequency and reader success to determine when a word has become stable

## Identity Rules

The canonical Korean identity should usually be the stem or lemma, while the learner still sees the full written surface form in the reader.

Particles and suffixes should remain visible on the surface token, but the learner record should not split one lexical item into multiple unrelated entries when a grammatical ending changes.

## Reader Output Rules

- Preserve Hangul exactly as written.
- Show romanization or pronunciation only when it supports the learner.
- Keep particle and stem distinctions visible where useful.
- Surface source provenance for dictionary lookups, cached revisits, and fallback lookups.

## Progression Anchors

- Official exam anchor: TOPIK
- Vocabulary ladder: no public official ladder
- Use case in TextPlex: a proficiency-based language with frequency-driven internal ordering

## Verification Checklist

- Hangul tokens remain stable
- particles and stems stay linked
- romanization does not replace the Korean surface form
- reader and study exposures merge into one learner history
- mastery remains separate from book data

