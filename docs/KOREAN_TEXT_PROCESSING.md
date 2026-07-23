# Korean Text Processing Notes

This document captures the current Korean-specific considerations for TextPlex. It is the active-build companion to the shared non-Romanized template.

## Scope

These notes apply to:

- OCR or pasted Korean text that enters the processor
- sentence splitting and tokenization
- lexicon enrichment and reading fallback
- reader payloads derived from Korean text

## Why Korean Comes First

Korean is the active first-wave non-Romanized target for TextPlex because it combines:

- strong learner demand
- a modern reading ecosystem built around webtoons, novels, and news
- clear TOPIK-aligned progression anchors
- Hangul as a stable, left-to-right writing system with manageable display behavior

## Source Strategy

Build the Korean pack from standard dictionary data first, then use TOPIK to decide what enters the active seed set earlier.

- Primary lexical authority: National Institute of Korean Language learner dictionaries, especially the Basic Korean Dictionary / Korean-English Learners' Dictionary.
- Supplemental usage source: `우리말샘` for broader sense coverage, examples, and living vocabulary.
- Prioritization anchor: TOPIK I and TOPIK II level bands, plus common classroom and media frequency.
- Tie-breakers: clear lemma form, stable Hangul spelling, strong definition quality, and reusability in simple reading material.

Do not treat TOPIK as a public word-count ladder. Use it as a proficiency and ordering signal. The pack should still include common dictionary headwords that help with basic reading fluency even when they are not tied to a specific TOPIK practice item.

## Core Principle

Preserve the visible Korean surface form.

The processor should keep the learner-facing text stable after OCR cleanup or paste normalization. Token surfaces, lexical entries, and reader payloads should align with the displayed text instead of silently rewriting Hangul, spacing, or punctuation.

## Normalization

- Trim surrounding whitespace.
- Normalize Windows and mixed newlines.
- Prefer NFC normalization when the pipeline needs a single Unicode form for Hangul lookup.
- Preserve visible spacing between eojeol units.
- Preserve Korean punctuation and script choices.
- Do not transliterate or simplify the text during normalization.

## Sentence Splitting

- Sentence boundaries should recognize Korean terminators such as `.`, `!`, `?`, `…`, and mixed-script punctuation when present.
- A Korean page may contain multiple sentences.
- Dialogue-heavy prose may mix quotes, ellipses, and sentence fragments.
- If a page fragment ends mid-sentence, the processor may carry the final sentence forward when stitching page results.

## Tokenization

Korean tokenization should follow this order:

1. Use a Korean morphological segmenter when it is available.
2. Fall back to conservative whitespace-based eojeol splitting when no segmenter is available.

Practical consequences:

- Keep Hangul words stable at the visible whitespace boundary when fallback segmentation is required.
- Preserve particles, endings, and other suffixes when the segmenter exposes them, but do not invent splits without evidence.
- Treat mixed-script terms, numbers, and punctuation as part of the surrounding token when that is how the text is visibly written.
- Terminal punctuation is preserved in sentence text but should not become a lexical occurrence.

## Lexicon Enrichment

Korean enrichment should prefer exact-match lookup first.

- Lookup should start from the token surface form as visible on the page.
- When available, attach lemma and pronunciation data to the token.
- If a whole-word reading is missing, fall back to a known lemma or dictionary headword.
- Do not invent pronunciations for unknown tokens.
- Keep the reading field null when confidence is too low.

For Korean, the reader should expect:

- Hangul-only tokens in most modern reading material
- optional Hanja or mixed-script forms in more formal or historical sources
- many surface forms that reduce to the same lemma after morphological analysis

## Romanization or Transliteration

Korean can use a romanization layer when it helps learner output.

- Preferred system: Revised Romanization when a romanized field is useful.
- When to attach it: only when the source provides it or the pipeline can derive it confidently.
- When to leave it null: when confidence is low or the UI does not need romanization for the current token.
- Whether it is required for all tokens or only some: only some.
- How to handle ambiguous mappings: prefer source-backed pronunciation data over inferred romanization.

## Token Hints and OCR Guidance

OCR or AI providers can supply token hints.

- Hints should key off the exact visible surface form after trimming.
- Hints may provide lemmas, pronunciations, or short definitions.
- Hints should not rewrite Hangul into romanization.
- Hints may suggest eojeol boundaries, but the final tokenization should stay faithful to the visible text.

## Reader Output Rules

- Keep Korean text visible as written.
- Surface romanization on demand or in a compact token panel, not as a forced rewrite of the page.
- Preserve original punctuation and quote style.
- Reader tokens should stay stable across rereads so exposure tracking remains consistent.

## Data Separation Rules

Keep book truth and learner truth separate.

- Book database stores processed pages, sentences, tokens, and lexical data.
- User profile database stores exposures, reading history, and progress signals.
- Do not store derived learner progress in the book database.

## Verification Checklist

When changing Korean processing, verify:

- visible surface forms stay stable
- Hangul tokens tokenize correctly for whole words and fallback cases
- punctuation is not counted as a lexical occurrence
- lexicon lookup resolves exact matches
- romanization or pronunciation is attached only when expected
- reader payloads still match the source text
- profile/exposure logic stays separate from book data

## Related Tests

Useful regression coverage for Korean should live alongside the processor and reader tests that exercise:

- import and extraction
- sentence splitting
- tokenization
- lexicon lookup
- reader rendering

## Starter Corpus

Use the starter public-domain corpus in [Non-Romanized Language Test Corpus](./NON_ROMANIZED_LANGUAGE_TEST_CORPUS.md) when validating Korean. Start with `창란호연록`, then use `사씨남정기` to stress longer prose and historical orthography.
## Next Steps

- Pull a real KRDICT export and compare it with the starter seed ranking.
- Expand the Korean starter pack only after import, lookup, and reader rendering stay stable.
- Keep the Korean-specific follow-up notes separate from the cross-language acquisition note in [Non-Romanized Lexicon Acquisition](./NON_ROMANIZED_LEXICON_ACQUISITION.md).
