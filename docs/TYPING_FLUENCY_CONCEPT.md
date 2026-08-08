# Typing Fluency Practice Concept

## Summary

TextPlex could add a speed-typing practice mode for vocabulary items after they reach a familiarity threshold. The goal is to help learners turn recognized words into fast, usable production by practicing how quickly they can type a word correctly.

This is not a generic typing game. It is a language-production exercise that sits on top of the learner model and rewards fluent recall of real vocabulary.

## Why This Fits TextPlex

TextPlex already tracks vocabulary familiarity, exposure history, and learner progress. That makes it a good place to unlock a typing drill only when a word is ready.

The exercise would reinforce:

- faster word recall
- more fluent sentence construction
- spelling confidence in the target language
- typed production alongside reading comprehension

## Core Idea

Once a word reaches a defined familiarity level, the app could unlock a practice card that asks the learner to type the word as quickly and accurately as possible.

The practice card could show:

- the target word
- the meaning
- optional pronunciation or transliteration
- a prompt to type the word once, then try again to improve the time

The learner would get a personal best for each word and could repeat attempts until they beat their record.

## Suggested Flow

1. A word reaches the unlock threshold.
2. The learner opens typing practice from the word detail, study surface, or reader context.
3. The app shows the word and its support clues.
4. The learner types the word once in a timed trial.
5. The learner retries and tries to improve speed without losing accuracy.
6. The app records the best correct time and any relevant consistency data.

## Scoring Rules

The scoring should favor correct typing over raw speed.

Recommended rules:

- only count a timed attempt as a record if the word is typed correctly
- track best time per word per language
- optionally track characters per second for comparison across word lengths
- store accuracy and retry count alongside the best time

That keeps the drill useful rather than noisy.

## Unlock Logic

A word should only become eligible once it is familiar enough that the learner is no longer just guessing.

Possible unlock signals:

- a minimum familiarity stage
- a minimum number of successful exposures
- a mastery or review stability threshold

The exact rule should align with the existing learner-state model rather than introducing a separate typing-only score.

## Visual Treatment

The practice surface should feel focused and minimal.

Suggested elements:

- target word
- meaning
- pronunciation line when helpful
- input field or typing lane
- timed feedback after submit
- personal best comparison
- retry / beat-your-record action

The design should emphasize production speed and accuracy, not points or streak noise.

## Data Model Sketch

A practical implementation would likely need:

- typing-practice unlock state
- per-word best time
- per-word best accuracy or clean-run count
- attempt history for review and progress charts

The record should be tied to learner truth, not book truth, so the same word can be practiced across sources without duplicating meaning.

## Open Questions

- Should the drill be word-only first, or should it later expand to phrases and sentence chunks?
- Should pronunciation be shown by default or only for harder scripts?
- Should the best score be global per word, or language- and script-specific?
- Should the practice be launched from reader lookups, study cards, or a dedicated vocabulary surface?

## Related Repo Areas

- `docs/DATA_MODEL.md`
- `docs/PROCESSING_CONTRACT.md`
- `docs/COMPONENTS_INVENTORY.md`
- `apps/web/`
- `apps/api/`
- `packages/processor/`
