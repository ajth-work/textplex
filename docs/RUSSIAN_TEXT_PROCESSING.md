# Russian Text Processing Notes

This document captures the current Russian-specific considerations for TextPlex. It is the active companion to the shared non-Romanized template and the Russian starter lexicon pack.

## Scope

These notes apply to:

- OCR or pasted Russian text that enters the processor
- sentence splitting and tokenization
- lexicon enrichment and reading fallback
- reader payloads derived from Russian text

## Why Russian Matters

Russian is a strong follow-on language for TextPlex because it combines:

- a large corpus of readable prose, genre fiction, and public text
- a clear learner progression ladder through TRKI-style A1-C2 levels
- a straightforward left-to-right script with whitespace-separated words
- strong value for lemma-driven lookup because inflection is rich but regular enough to normalize well

## Source Strategy

Build the Russian pack from dictionary authority first, then use corpus frequency to decide what enters the seed set earlier.

- Primary lexical authority: Gramota normative dictionaries and spelling references.
- Corpus and ordering source: the Russian National Corpus, especially search exports and word-portrait frequency data.
- Progression anchor: Pushkin Institute / TRKI levels.
- Tie-breakers: canonical lemma form, stable Cyrillic spelling, clear gloss quality, and usefulness in basic reading material.

Do not treat TRKI as a public word-count ladder. Use it as a proficiency and ordering signal. The pack should still include common dictionary headwords that help with basic reading fluency even when they are not tied to a single learner-level sample.

## Core Principle

Preserve the visible Russian surface form.

The processor should keep the learner-facing Cyrillic text stable after OCR cleanup or paste normalization. Token surfaces, lexical entries, and reader payloads should align with the displayed text instead of silently rewriting the script or dropping case, punctuation, or spacing.

The canonical lexicon pack may still store lemma or headword forms for lookup, but the rendered reader text must remain the text the learner saw.

## Normalization

- Trim surrounding whitespace.
- Normalize Windows and mixed newlines.
- Prefer NFC normalization when the pipeline needs a single Unicode form for Cyrillic lookup.
- Preserve visible spacing between words.
- Preserve Russian punctuation, quotation marks, and hyphenation.
- Do not transliterate or Latinize the text during normalization.

## Sentence Splitting

- Sentence boundaries should recognize Russian terminators such as `.`, `!`, `?`, and ellipsis forms.
- A Russian page may contain multiple sentences.
- Dialogue-heavy prose may mix em dashes, quotes, and sentence fragments.
- If a page fragment ends mid-sentence, the processor may carry the final sentence forward when stitching page results.

## Tokenization

Russian tokenization should follow this order:

1. Use whitespace and punctuation-aware word splitting.
2. Fall back to conservative token boundaries that keep visible Cyrillic words intact.

Practical consequences:

- Keep Cyrillic words stable at the visible word boundary when fallback segmentation is required.
- Preserve hyphenated compounds when they are written as a visible lexical unit.
- Treat numbers, abbreviations, and punctuation as part of the surrounding token only when the visible form requires it.
- Terminal punctuation is preserved in sentence text but should not become a lexical occurrence.

## Lexicon Enrichment

Russian enrichment should prefer lemma lookup first.

- Lookup should start from the token surface form as visible on the page.
- When available, attach lemma, part of speech, and pronunciation or transliteration data to the token.
- If the inflected surface form is not in the lexicon, fall back to a known lemma or headword.
- Do not invent pronunciations for unknown tokens.
- Keep the reading field null when confidence is too low.

For Russian, the reader should expect:

- a high volume of inflected forms that map back to the same lemma
- common abbreviations and initials in prose and dialogue
- occasional loanwords or proper names that should stay visible as written

## Transliteration or Pronunciation

Russian can use a transliteration layer when it helps learner output.

- Preferred system: source-backed transliteration or a stable Latin transliteration only when the source provides it.
- When to attach it: only when the source provides it or the pipeline can derive it confidently.
- When to leave it null: when confidence is low or the UI does not need transliteration for the current token.
- Whether it is required for all tokens or only some: only some.
- How to handle ambiguous mappings: prefer dictionary-backed readings over inferred transliteration.

## Token Hints and OCR Guidance

OCR or AI providers can supply token hints.

- Hints should key off the exact visible surface form after trimming.
- Hints may provide lemmas, transliterations, or short definitions.
- Hints should not rewrite Cyrillic into Latin text.
- Hints may suggest word boundaries, but the final tokenization should stay faithful to the visible text.

## Reader Output Rules

- Keep Russian text visible as written.
- Surface transliteration on demand or in a compact token panel, not as a forced rewrite of the page.
- Preserve original punctuation and quote style.
- Reader tokens should stay stable across rereads so exposure tracking remains consistent.

## Data Separation Rules

Keep book truth and learner truth separate.

- Book database stores processed pages, sentences, tokens, and lexical data.
- User profile database stores exposures, reading history, and progress signals.
- Do not store derived learner progress in the book database.

## Verification Checklist

When changing Russian processing, verify:

- visible surface forms stay stable
- Cyrillic tokens tokenize correctly for whole words and fallback cases
- punctuation is not counted as a lexical occurrence
- lexicon lookup resolves exact matches
- transliteration or pronunciation is attached only when expected
- reader payloads still match the source text
- profile/exposure logic stays separate from book data

## Related Tests

Useful regression coverage for Russian should live alongside the processor and reader tests that exercise:

- import and extraction
- sentence splitting
- tokenization
- lexicon lookup
- reader rendering

## Starter Corpus

Use a small public-domain Russian prose sample when validating the pipeline. Start with a short, clean excerpt that contains dialogue, punctuation, and a few inflected nouns, then add a longer prose sample once the tokenizer and lemma lookup are stable.

## Next Steps

- Pull a real Russian National Corpus CSV export and compare it with the starter seed ranking.
- Decide whether a separate dictionary override file is needed for pronunciation or definition enrichment.
- Expand the starter pack only after the import, lookup, and reader rendering path stays stable with the seed CSV.
