# Adaptive Generated Reader Articles

This note defines a controlled article-generation flow that uses learner exposure state to produce reader-ready text in the target language.

The idea is not to replace real books. It is to generate synthetic reading material that is calibrated to the learner's current profile and the next step in the program of study.

## Purpose

TextPlex already knows three useful things:

1. which words the learner has already exposed
2. which words are newly seen but not yet stable
3. which words are next in the progression ladder

This feature uses those signals to ask the model for a short article-like passage that sits in the narrow band between comfortable reading and planned novelty.

The intended outcome is a readable passage that:

- reuses known words heavily enough to stay comprehensible
- repeats recently exposed words so they reinforce memory
- introduces a bounded number of upcoming words
- avoids dumping too many truly new words into one passage

## Core Concept

The generation request should be built from a learner-window view of vocabulary, not from a raw prompt that hopes the model guesses the right difficulty.

Recommended word buckets:

- `known_words`: stable items the learner should read without friction
- `recent_words`: items the learner has seen recently but has not fully stabilized
- `upcoming_words`: the next items from the frequency-ranked or curriculum-ranked study path
- `novel_words`: everything else, used sparingly or not at all

The model should be asked to blend `known_words`, `recent_words`, and `upcoming_words` into a single passage. `novel_words` should be minimized and treated as failure risk.

## Input Signals

The generator should receive these inputs from the API or a server-side helper:

- target language
- learner identifier or profile snapshot
- progression anchor for the language
- current learner exposure summary
- target article length in sentences
- target topic or theme
- allowed novelty budget
- desired tone, for example explanatory, narrative, or journalistic
- lexical constraints, such as the maximum number of unknown lemmas

The progression anchor should come from the language program, not from the model.

Examples:

- frequency-ranked vocabulary ladder
- exam ladder such as HSK, JLPT, or TOPIK
- curriculum sequence
- corpus coverage sequence

## Generation Policy

The generator should be constrained before the model is called.

Recommended policy:

- produce around 30 sentences by default
- keep most sentences short and single-purpose
- allow a limited number of target upcoming words per sentence
- avoid requiring a sentence to depend on an unknown term
- keep named entities and idioms under tight control
- prefer clear, concrete language over abstract style

If the passage is meant to be instructional rather than factual, the prompt should say so explicitly. That reduces the risk of hallucinated real-world claims.

The model should not decide the learner window. It should only fill a constrained content frame.

## Validation

Every draft should be tokenized and scored before it is imported.

Minimum validation checks:

- count known, recent, upcoming, and unknown tokens
- verify that the novelty budget is not exceeded
- reject passages where too many sentences depend on unknown words
- confirm that target upcoming words actually appear
- flag passages where morphology or segmentation hides the target words
- ensure the language-specific tokenizer can still process the result

If validation fails, the system should regenerate with tighter constraints rather than silently accepting the draft.

## Import And Processing

Once validated, the passage should enter the reader pipeline as generated content.

The generated article should be processed like any other reading asset:

- store the text as book-like content
- segment it into sentences and tokens
- enrich the lexical entries
- expose it through the reader
- let normal reader events update learner state

Important boundary:

- book truth lives in the generated article content and its processing artifacts
- learner truth lives in the profile database and exposure ledger

The generator must not write mastery state directly.

## Data Model Notes

Useful metadata to preserve for each generated article:

- source type, for example `generated`
- generation timestamp
- target language
- progression anchor or ladder ID
- learner-window hash or snapshot ID
- requested sentence count
- requested novelty budget
- actual validation stats
- model/provider provenance

This metadata helps explain why the article exists and how it was calibrated.

## API Shape

Suggested request fields:

```json
{
  "language_code": "ko",
  "topic": "travel planning",
  "sentence_count": 30,
  "known_word_ids": ["..."],
  "recent_word_ids": ["..."],
  "upcoming_word_ids": ["..."],
  "max_new_lemmas": 8,
  "progression_anchor": "topik",
  "style": "explanatory"
}
```

Suggested response fields:

```json
{
  "article_text": "...",
  "sentence_count": 30,
  "known_token_count": 0,
  "recent_token_count": 0,
  "upcoming_token_count": 0,
  "new_token_count": 0,
  "validation_status": "passed",
  "generated_book_id": "..."
}
```

The exact schema can change, but the request should always expose the learner window and the progression anchor explicitly.

## Failure Modes

Common failure cases to guard against:

- the model ignores the novelty budget
- the model overuses rare synonyms instead of the target words
- the model produces a passage that is grammatically correct but lexically off target
- segmentation or morphology hides the intended words
- the passage drifts into factual claims that are not needed
- the article becomes too easy and stops introducing anything useful

These are reasons to reject or regenerate the draft, not to accept a weak first pass.

## Non-Goals

This feature should not become:

- a general chat tutor
- a freeform summarizer for arbitrary user prompts
- a replacement for authentic books
- a learner-state mutation path outside the profile database
- a content generator that relies on hidden model judgment for progression

## Open Questions

- Should the article be explicitly labeled as generated practice content?
- Should the learner choose topic and tone, or should the system pick from a curated set?
- Should the novelty budget be fixed per level or adjustable by the learner?
- Should the generated passage be stored as a reusable package or as a one-off reader asset?
- Should validation use lemma counts, surface-form counts, or both?

## Acceptance Criteria

- The system can generate a target-language passage from a learner exposure window.
- The passage includes known, recent, and upcoming words in a controlled mix.
- Validation rejects passages that exceed the novelty budget or hide the target words.
- The validated passage can be imported and processed through the normal reader pipeline.
- Reader interaction updates learner state through existing exposure tracking.

## Related Work

- `docs/LANGUAGE_LEARNING_PROGRAM_TEMPLATE.md`
- `docs/ARCHITECTURE.md`
- `docs/PROCESSING_CONTRACT.md`
- Issue #23, `Build AI generation pipeline for tiered texts`
