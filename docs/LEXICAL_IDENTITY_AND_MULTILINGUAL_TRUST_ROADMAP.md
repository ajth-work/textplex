# Lexical Identity and Multilingual Trust Roadmap

Status: foundation implemented; integration and learner-state work remain.

Related tracker item: [#60](https://github.com/ajth-work/textplex/issues/60).

Current implementation branch: `agent/lexical-identity-foundation`.

Current implementation commit: `07046d8` (`Add lexical identity foundation`).

## Why this matters

TextPlex is only as trustworthy as its interpretation of the text a learner is reading. A segmentation or lemma error can travel through the whole product:

```text
OCR and text extraction
    -> token boundaries and lemma
    -> Reader lookup and definition
    -> saved vocabulary and Study queue
    -> exposure and mastery calculations
    -> cross-device learner synchronization
```

This is difficult because the meaning of a learnable item is language-specific. Japanese conjugations and okurigana, Chinese segmentation, Korean morphology, Cyrillic normalization, Hebrew and Arabic clitics, names, homographs, mixed scripts, and OCR defects cannot be handled safely by one universal word-splitting rule.

The goal is not to make every token look precise. The goal is to make the system explicit about what it knows, what it inferred, and what remains uncertain.

## What has been implemented

### 1. A structured lexical identity contract

`TokenResult` now accepts an optional `lexical_identity` object. The object can carry:

- normalized language code;
- normalized lemma;
- part of speech;
- sense identifier;
- external lexicon identifier;
- analysis status: `resolved`, `ambiguous`, or `surface_fallback`;
- provenance, such as tokenizer, lexicon, AI, or manual review;
- confidence from `0.0` to `1.0` when a provider can justify one;
- tokenizer version;
- a computed, versioned `lex:v1` identity key.

The implementation lives in [`packages/processor/src/processor/contracts.py`](../packages/processor/src/processor/contracts.py).

### 2. Stable identity keys

Identity keys are derived from canonical language, lemma, part of speech, sense, and external lexicon fields. They are not derived from display text, confidence, or provenance.

This means that:

- equivalent Unicode forms can resolve to the same identity;
- a noun and verb with the same spelling do not have to share an identity;
- different senses can remain separate;
- improving the explanation or confidence does not itself change the identity;
- the key format has an explicit version so a future key change can be migrated deliberately.

The key is intentionally not yet the learner's permanent database identifier. That boundary requires a separate migration and reconciliation design.

### 3. Conservative tokenizer behavior

Newly tokenized non-punctuation words receive a `surface_fallback` identity with:

- the normalized surface-derived lemma;
- provenance `tokenizer_surface`;
- no invented confidence score;
- the current tokenizer version.

This makes the uncertainty visible to downstream code without making extraction fail or hiding a usable reading surface.

### 4. Backward compatibility

The field is optional. Existing page artifacts, API payloads, and manually constructed `TokenResult` objects remain readable. Historical learner events and their existing lemma-based behavior were not rewritten by this first slice.

### 5. Regression coverage and verification

The implementation includes tests for:

- Unicode and language-code normalization;
- stable keys across equivalent inputs;
- separation by part of speech and sense;
- explicit ambiguity and low confidence;
- invalid confidence and blank canonical fields;
- tokenizer-emitted surface fallback identities;
- legacy token payload compatibility.

The completed verification for commit `07046d8` was:

- API and processor suite: `253 passed, 2 skipped`;
- focused Ruff checks: passed;
- `git diff --check`: passed;
- Docker API and web images: rebuilt and restarted;
- live API readiness: `ready`;
- live web route: HTTP `200`;
- deployed processor: emitted the expected `lex:v1` identity payload.

## What this means for usability today

There is no disruptive user-facing change yet. Reader, Study, saved vocabulary, and learner progress continue to work as before.

The immediate product value is safety and future readiness:

- the system can now carry uncertainty instead of silently losing it;
- later language-specific analyzers have a stable place to publish their result;
- future Reader and Study surfaces can distinguish reliable analysis from a fallback;
- existing learner data is protected from an unreviewed identity migration.

The following are deliberately not implemented yet:

- visible confidence or ambiguity indicators in the Reader;
- confidence-aware Study or mastery gating;
- automatic reprocessing of existing books;
- learner-event remapping;
- a reviewed multilingual accuracy benchmark;
- fully resolved part-of-speech and sense data for every supported language.

## Roadmap

### Phase 0 — Contract foundation (complete)

Deliver the additive identity model and make uncertainty representable.

Acceptance criteria:

- identity keys are deterministic and versioned;
- part of speech and sense can separate otherwise identical lemmas;
- fallback analysis carries no fabricated confidence;
- old artifacts remain readable;
- focused and full regression suites pass.

### Phase 1 — Propagate identity through book truth (next)

Carry the identity key and analysis metadata into token occurrences and lexical-entry summaries without changing learner state.

Work:

1. Add optional identity metadata to `TokenOccurrenceResult` and `LexicalEntryResult`.
2. Aggregate lexical entries by identity key when one exists, with a safe lemma fallback for old artifacts.
3. Preserve the original surface form and page locations for every occurrence.
4. Add artifact round-trip tests and mixed old/new artifact fixtures.
5. Keep API and web contracts additive so older clients can ignore the fields.

Definition of done:

- a book can contain two same-spelling entries with different POS or senses without being silently merged;
- search and analysis still work for old artifacts;
- no learner profile tables are changed in this phase.

### Phase 2 — Produce resolved evidence

Give language-specific analyzers a controlled way to promote a fallback identity.

Work:

1. Extend enrichment inputs to accept lemma, part of speech, sense, source, and confidence where the provider actually supplies them.
2. Use canonical lexicon IDs when available; retain source lineage and lookup version.
3. Mark homographs as `ambiguous` when context does not justify one sense.
4. Keep names and entities separate unless explicit evidence supports a dictionary match.
5. Make low-confidence definitions nullable and explainable rather than generated as facts.

Definition of done:

- every promoted identity has provenance;
- every confidence value has a defined interpretation;
- ambiguous terms remain usable in Reader without entering mastery as a false certainty.

### Phase 3 — Build a measured language benchmark

Create a small, reviewed gold corpus before expanding claims of language support.

The first benchmark should include:

- OCR-like errors and line-break artifacts;
- punctuation and sentence-boundary edge cases;
- names and parenthetical glosses;
- mixed scripts;
- inflections and conjugations;
- homographs and clitics;
- expected surface boundaries, lemma, POS, and ambiguity labels.

Measure at minimum:

- token-boundary precision, recall, and F1;
- lemma accuracy;
- false-merge rate;
- dictionary or lexicon hit rate;
- percentage of tokens correctly marked uncertain;
- stable replay results across processor versions.

Japanese is the best first vertical slice because the current repository already contains UniDic-based segmentation, conjugation work, and tester evidence for mixed kana/kanji cases. Chinese should follow with explicit segmentation and fallback measurements. Korean, Russian, Hebrew, and Arabic should use the same harness but should not be declared equivalent until their evidence meets the same standard.

### Phase 4 — Versioned reprocessing

Make improvements safe for existing books.

Work:

1. Keep source text and prior normalized artifacts immutable and auditable.
2. Record tokenizer, lexicon, and enrichment versions separately.
3. Rebuild derived book truth idempotently from the source artifact.
4. Produce an identity mapping report between old and new extraction results.
5. Route uncertain or one-to-many mappings to reconciliation instead of guessing.

Definition of done:

- a processor upgrade can be previewed before replacing a book artifact;
- a failed page can be retried independently;
- no learner event disappears because a tokenization algorithm improved.

### Phase 5 — Learner-state migration and reconciliation

Only after Phases 1–4 should identity become part of learner truth.

Work:

1. Define the learner identity boundary separately from book identity.
2. Add migration tables for old lemma-based events and new lexical identities.
3. Preserve the original event, source book, page, and migration decision.
4. Support one-to-one, one-to-many, many-to-one, and unresolved mappings.
5. Rebuild derived exposure and mastery aggregates from the event ledger.
6. Sync identities and reconciliation outcomes across devices without allowing a hosted aggregate to replace the local event authority.

Definition of done:

- migration is repeatable and auditable;
- unresolved mappings remain visible and do not silently change mastery;
- local-first learner history remains recoverable;
- cross-device sync is idempotent for migrated and new events.

### Phase 6 — User-facing trust controls

Expose the result only when the underlying evidence is meaningful.

Potential Reader behavior:

- show a compact uncertainty indicator only when analysis is ambiguous or fallback-based;
- let the learner inspect the surface form even when lemma resolution fails;
- allow a learner to correct or select an interpretation without overwriting book truth;
- record corrections as learner preference or review evidence with provenance.

Potential Study behavior:

- exclude unresolved fallback items from mastery promotion by default;
- offer an explicit “study this uncertain item” action;
- show whether a card came from a lexicon, contextual analysis, or surface fallback;
- keep remembered/missed feedback separate from dictionary certainty.

Definition of done:

- uncertainty helps the learner make a decision instead of adding visual noise;
- the Reader remains usable when analysis is incomplete;
- no UI label implies a level, definition, or mastery state that the evidence cannot support.

## Data-boundary rules

The system must keep two truths separate:

| Book truth | Learner truth |
| --- | --- |
| Surface text, sentence boundaries, tokenization, lemma candidates, POS, senses, provenance, and confidence | Taps, saves, remembered/missed feedback, exposure, study results, corrections, and mastery |
| Rebuildable when the processor improves | Append-only and recoverable |
| Shared by readers of the same book artifact | Scoped to one learner and synchronized separately |
| Must retain source and processor versions | Must retain event IDs and reconciliation decisions |

The current implementation changes only the book-processing contract. It intentionally does not claim to have completed the learner-state side of the problem.

## Prioritized next work

The next implementation slice should be:

1. propagate `identity_key` into token occurrences and lexical entries;
2. add old/new artifact round-trip fixtures;
3. create the first reviewed Japanese benchmark cases;
4. add an evaluation command with segmentation, lemma, false-merge, and uncertainty metrics;
5. use those results to define the first confidence gates before changing Study or mastery.

This ordering keeps the current reading loop usable while making every future improvement measurable and reversible.
