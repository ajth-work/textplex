# Japanese Text Processing Notes

This document captures the current Japanese-specific considerations for TextPlex. It is meant to be the follow-up companion to the shared non-Romanized template.

## Scope

These notes apply to:

- OCR or pasted Japanese text that enters the processor
- sentence splitting and tokenization
- lexicon enrichment and reading fallback
- reader payloads derived from Japanese text

## Why Japanese Comes First

Japanese is the strongest first non-Romanized target for TextPlex because it combines:

- high learner demand
- a very large reading corpus
- strong reader motivation through novels, manga, and light fiction
- manageable left-to-right display behavior compared with RTL scripts

## Core Principle

Preserve the visible Japanese surface form.

The processor should keep the learner-facing text stable after OCR cleanup or paste normalization. Token surfaces, lexical entries, and reader payloads should align with the displayed text instead of silently rewriting kana, kanji, or punctuation.

## Normalization

- Trim surrounding whitespace.
- Normalize Windows and mixed newlines.
- Collapse internal whitespace only where it is structural noise.
- Preserve Japanese punctuation and script choices.
- Do not transliterate or simplify the text during normalization.

## Sentence Splitting

- Sentence boundaries should recognize Japanese terminators such as `。`, `！`, and `？`.
- A Japanese page may contain multiple sentences.
- Dialogue-heavy prose may mix quotes, ellipses, and sentence fragments.
- If a page fragment ends mid-sentence, the processor may carry the final sentence forward when stitching page results.

## Tokenization

Japanese tokenization should follow this order:

1. Use a Japanese segmenter when it is available.
2. Fall back to conservative character or orthographic-unit splitting when no segmenter is available.

Practical consequences:

- Kanji-kana mixed words should be emitted as whole tokens when the segmenter recognizes them.
- Kana-only tokens should remain stable and not be merged across visible boundaries without evidence.
- Full-width Latin letters, numbers, and punctuation should stay aligned with the surrounding Japanese text.
- Terminal punctuation is preserved in sentence text but should not become a lexical occurrence.

## Lexicon Enrichment

Japanese enrichment should prefer exact-match lookup first.

- Lookup should start from the token surface form as visible on the page.
- When available, attach lemma and reading data to the token.
- If a whole-word reading is missing, fall back to a known reading for the lemma or dictionary headword.
- Do not invent readings for unknown tokens.
- Keep the reading field null when confidence is too low.

For Japanese, the reader should expect mixed kanji and kana tokens, so lexicon data should support both orthographic forms and readings without collapsing the display text.

## Token Hints and OCR Guidance

OCR or AI providers can supply token hints.

- Hints should key off the exact visible surface form after trimming.
- Hints may provide readings, lemmas, or short definitions.
- Hints should not rewrite kana into romanization.
- Hints should stay focused on the segment boundaries visible in the text.

## Reader Output Rules

- Keep Japanese text visible as written.
- Surface readings on demand or in a compact token panel, not as a forced rewrite of the page.
- Preserve original punctuation and quote style.
- Reader tokens should stay stable across rereads so exposure tracking remains consistent.

## Data Separation Rules

Keep book truth and learner truth separate.

- Book database stores processed pages, sentences, tokens, and lexical data.
- User profile database stores exposures, reading history, and progress signals.
- Do not store derived learner progress in the book database.

## Verification Checklist

When changing Japanese processing, verify:

- visible surface forms stay stable
- mixed kanji/kana words tokenize correctly
- fallback segmentation still behaves when no Japanese segmenter is available
- punctuation is not counted as a lexical occurrence
- readings attach only when lookup confidence is strong enough
- reader payloads still match the source text
- profile/exposure logic stays separate from book data

## Related Tests

Useful regression coverage for Japanese should live alongside the processor and reader tests that exercise:

- import and extraction
- sentence splitting
- tokenization
- lexicon lookup
- reader rendering

## Starter Corpus

Use the starter public-domain corpus in [Non-Romanized Language Test Corpus](./NON_ROMANIZED_LANGUAGE_TEST_CORPUS.md) when validating Japanese. Start after the Korean-specific corpus, then use `坊っちゃん` and `こころ` to stress longer prose and dialogue density.
