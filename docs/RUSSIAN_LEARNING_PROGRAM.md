# Russian Learning Program

This note defines the Russian-specific learner model for TextPlex. It sits alongside the Russian text-processing and lexicon notes and captures how the study program and the reader should reinforce the same underlying learner state.

## Purpose

Russian in TextPlex should not be treated as a single weekly schedule. It should be treated as a level-based mastery system that combines:

- a structured Russian study program anchored to the `RU5000` seed list
- reader exposure from imported books, articles, and sample passages
- spaced repetition time bands underneath the mastery model

The goal is for one Russian word to accumulate a single learner history even if it is first learned in the program and later seen in the reader, or first encountered in the reader and later reviewed in the program.

The first Russian level should be introductory and frequency-led:

- start with the highest-value items from the `RU5000` frequency backbone
- keep the initial set small enough to feel like a true on-ramp, not a full frequency dump
- favor everyday, high-utility words that unlock basic reading comprehension before moving into broader coverage

## Core Model

The Russian learner state should answer four questions:

1. Where was this word first introduced?
2. How many times has the learner seen it in the study program?
3. How many times has the learner seen it in the reader?
4. How strong is the learner's current mastery of the word?

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

## Two Exposure Pathways

### 1. Structured Study Program

This is the guided Russian curriculum.

- The study program should start from the Russian vocabulary backbone in `RU5000`.
- It should present words in a level-aware order instead of a pure calendar order.
- Review events in the study program should increase mastery even when the word is already known from the reader.
- If a word is introduced here first, the learner history should record that the study program was the first source.

### 2. Reader Exposure

This is the in-the-wild pathway from imported text.

- Reader exposure should be tracked separately from study-program exposure.
- A reader encounter should update the same learner record as the study program.
- If the learner taps a token for help, the app should mark that exposure as assisted.
- If the learner does not need help, the app should mark that exposure as unassisted.
- Reader exposure should still count even when the word was previously studied in the program.

## Mastery And SRS

Mastery should be level-based first and time-based second.

Suggested interpretation:

- `mastery_level` describes the learner's qualitative stage for the word.
- `mastery_score` describes the numeric confidence behind that stage.
- `srs_stage` describes when the word should recur next.

Time bands should sit under mastery, not replace it. In other words, the app should know both:

- how well the learner knows the word
- when the word should be shown again

## Study Assessment Model

The same study model should be treated as language-agnostic. Russian is just one instance of it.

Replace the old forward/backward framing with four separate checks per item:

1. Russian form -> meaning
2. Russian form -> romanization / pronunciation
3. meaning -> Russian form
4. romanization / pronunciation -> Russian form

These are separate dimensions, not one binary test.

- A learner may recognize the written Russian word but still miss the English meaning.
- A learner may know the meaning but still fail to produce the Russian spelling.
- A learner may read the Russian form correctly but still need practice with transliteration or pronunciation.
- A learner may be able to answer from romanization even when meaning recall is weak, or vice versa.

The second axis should use the most useful reading cue for the language. For Russian, that is romanization or pronunciation.

### Per-item state model

Russian should keep one aggregate learner record per lemma plus four axis records underneath it.

Suggested Russian axis keys:

- `form_to_meaning`
- `form_to_reading`
- `meaning_to_form`
- `reading_to_form`

For Russian, `form_to_reading` and `reading_to_form` should use romanization or pronunciation as the reading cue.

Each axis should keep its own:

- stage
- due time
- last result
- pass count
- fail count

The overall word should not be considered stronger than its weakest active axis. If one axis is still early in the ladder, the word is still early overall.
Stage 0 is the shared introduction gate:

- the learner must get all four Russian axes correct to exit stage 0
- after stage 0, each axis advances independently
- a correct axis moves forward on its own ladder
- an incorrect axis moves back one stage, but never below stage 1 after introduction
- an incorrect axis stays at stage 0 only while it is still in the introduction gate
- a wrong-axis response records a valid alternate form and leaves the prompted axis stage unchanged
- when one axis is due, the item is due

When the learner reviews a Russian word after stage 0, only the axis that was actually prompted should advance or regress.

### Current Russian SRS ladder

The current default schedule is interval-based and should advance only after a successful review.
Each stage is scheduled from the previous successful stage.

| Stage | Delay after previous success |
| --- | --- |
| `0` | initial introduction / same-session learning |
| `1` | `3 hours` |
| `2` | `6 hours` |
| `3` | `12 hours` |
| `4` | `1 day` |
| `5` | `2 days` |
| `6` | `4 days` |
| `7` | `1 week` |
| `8` | `2 weeks` |
| `9` | `1 month` |
| `10` | `3 months` |
| `11` | `6 months` |
| `12` | `12 months` |

Implementation rules for this ladder:

- `stage 0` is the introduction stage, not a spaced review stage.
- successful completion advances the item to the next stage and sets the next due time from that stage's delay
- failed reviews should be handled by the study engine, but they should not advance the stage
- the program should keep the ladder explicit even if the UI later collapses some review states into one surface

### Suggested exposure weighting

These weights are a starting point, not a fixed rule:

- study introduction: `+1.0`
- study review passed: `+1.5`
- reader exposure with tap/help: `+0.5`
- reader exposure without tap/help: `+1.25`
- no-tap after recent study: `+1.5`
- repeated same-day exposures: diminishing return

This lets the app distinguish between:

- a word the learner just saw in a lesson
- a word the learner recognized in the wild
- a word the learner still needed help with

## Russian Identity Rules

Russian lookup should center on the lemma or headword, not only the surface form.

### Identity priority

1. visible surface form in the reader
2. lemma or dictionary headword
3. inflection family / related forms
4. fallback transliteration or Google translation only when necessary

This matters because Russian is morphologically rich. The learner should not end up with duplicate learning records for the same word just because the reader saw a different inflection.

### Reader-facing rule

The reader should keep the original Russian text visible, while the token panel can show:

- lemma
- pronunciation or transliteration when available
- gloss or definition
- source of the lookup
- whether the lookup came from the study program, the reader cache, or Google fallback

## Lookup Order

For Russian text, lookup should try the Russian lexicon path first and only fall back later.

Recommended order:

1. exact surface-form lookup in the Russian lexicon
2. lemma/headword lookup
3. inflection-family lookup
4. cached prior reader lookup
5. Google Translate or another fallback service

That keeps the Russian reader fast, stable, and less dependent on repeated external calls.

## Reader Behavior

The Russian reader should support both reading and learning at the same time.

- If the word is known, the reader should still reinforce it gently.
- If the word is new, the reader should surface a clear token panel.
- If the user has seen the word in the study program, the reader should show that as prior introduction.
- If the user learned the word in the reader first, the study program should pick up that history later instead of duplicating it.

## Program Structure

The Russian program should be organized around mastery bands rather than calendar weeks.

Suggested banding:

- level 1: introductory frequency core from `RU5000`
- level 2: early recognition and retrieval
- level 3: guided recall
- level 4: independent recognition in reader text
- level 5: stable production / strong retention

The current implementation exposes these bands as a read-only Russian program surface at `GET /learning/programs/russian`.

Level 1 is currently the only populated band. It is backed by the manifest in `resources/lexicon/russian/program.levels.json` and contains a curated 60-item slice of RU5000. The items are returned in frequency order after the curated inclusion set is chosen.

Level 1 should be reviewed for:

- highest frequency rank
- strongest basic reading utility
- clean lemma or headword coverage
- clear pronunciation or transliteration when available
- simple, everyday meanings that help the learner start reading immediately

The current slice combines:

- function words and core connectives that unlock sentence parsing
- common pronouns, copulas, and adverbs that make short texts legible
- concrete starter nouns and verbs that give the learner immediate reading anchors

Later bands can stay empty until the learner experience needs them. That keeps the program structure explicit without forcing speculative content into the opening level.

## Implementation Notes

- Keep book truth and learner truth separate.
- Record every Russian exposure event against the same learner word record.
- Preserve whether the exposure came from the program or the reader.
- Preserve whether the exposure was assisted or unassisted.
- Use the Russian lexicon pack as the source of truth for canonical lookup before external translation fallback.
- Do not require every Russian token to have a pronunciation before the reader can function.

## Practical Goal

The end state should let TextPlex answer questions like:

- Was this word first learned in the Russian program or in the reader?
- How many times has the learner seen it in each pathway?
- Did the learner need help this time?
- Is the word due for SRS review?
- Is the word strong enough to count as mastered at the current band?

That gives Russian a learner model that matches how reading fluency actually grows: repeated exposure, mixed contexts, and gradual transfer from study into real reading.
