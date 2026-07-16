# Chinese Text Processing Notes

This document captures the current nuances of Chinese text handling in TextPlex. It is a working reference for processing, lexicon enrichment, and reader-facing token data.

## Scope

These notes apply to:

- OCR or pasted Chinese text that enters the processor
- sentence splitting and tokenization
- lexicon enrichment and pinyin fallback
- page artifacts and reader payloads derived from Chinese text

## Core Principle

Keep the visible Chinese surface form stable.

The processor should preserve the text that the learner sees after OCR cleanup or paste normalization. Token surfaces, lexical entries, and reader payloads should stay aligned with the displayed text instead of silently rewriting it into a different form.

## Normalization

- `normalize_text()` trims surrounding whitespace.
- Windows and mixed newlines are normalized.
- Internal whitespace is collapsed.
- Chinese text itself is not transliterated or simplified by normalization.

## Sentence Splitting

- Sentence boundaries are driven by Chinese and Latin sentence terminators.
- A Chinese page can contain multiple sentences.
- If a page fragment does not end in a terminator, the processor may carry the final sentence forward when stitching page results.

## Tokenization

Chinese tokenization currently follows this order:

1. Try `jieba` when it is available.
2. Fall back to character-by-character segmentation when `jieba` is unavailable.

Practical consequences:

- Multi-character words may be emitted as a single token when `jieba` recognizes them.
- The fallback path is intentionally conservative and splits Chinese runs into individual characters.
- Latin words and digits follow the general tokenization path used by the processor.
- Terminal punctuation is preserved as token data when it is part of the sentence text, but punctuation tokens are excluded from stored token occurrences and lexical entries.

## Lexicon Enrichment

Chinese enrichment is exact-match first.

- The processor looks up whole-token entries by surface form.
- If a whole-token entry exists, its pinyin and definition should attach to the token when needed.
- If a whole-token pinyin is missing, the lookup can fall back to per-character pinyin for multi-character Chinese terms.
- Character-level fallback should only produce a romanization when each character can be resolved.

This means a token like `宇宙` may appear as one token with whole-word enrichment, while a missing whole-word entry can still inherit a composite reading from `宇` and `宙` if those characters are known.

## Token Hints

OCR providers can supply token hints.

- Hints are keyed by exact surface form after trimming.
- For Chinese text, hints are not lowercased.
- Hints can add missing romanization or short definitions.
- Hints should stay focused on the segmented words visible on the page.

## Reader and Profile Effects

Chinese pages feed two different downstream surfaces:

- book truth in the book database
- learner truth in the user profile database

Keep those concerns separate:

- the book database stores the processed page, sentence, token, and lexical data
- the learner profile stores exposures, reading history, and progress signals

## What to Watch When Changing This Pipeline

If you change Chinese processing, verify the following:

- multi-character terms still tokenize as expected
- fallback segmentation still works when `jieba` is missing
- punctuation is not counted as a lexical occurrence
- imported lexicon entries still resolve exact surface forms
- pinyin fallback still works for missing whole-word entries
- reader payloads still show the same visible surface form the learner saw in the source text

## Related Tests

Useful regression coverage currently lives in:

- `tests/processor/test_extraction.py`
- `tests/processor/test_chinese_fixture.py`
- `tests/api/test_reader_endpoints.py`
- `tests/api/test_lexicon.py`

When this document and the code diverge, treat the tests and processor behavior as the source of truth, then update this note to match.
