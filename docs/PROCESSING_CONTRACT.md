# Processing Contract

The processor may use OCR, AI vision, local language tools, or a hybrid. All providers must normalize results to this internal contract before writing to the database.

## Page extraction result

```json
{
  "book_id": "book_001",
  "page_number": 1,
  "language_code": "ko",
  "raw_text": "...",
  "clean_text": "...",
  "page_translation": "...",
  "sentences": [
    {
      "order": 1,
      "text": "...",
      "translation": "...",
      "tokens": [
        {
          "order": 1,
          "surface_form": "갔어요",
          "lemma": "가다",
          "part_of_speech": "verb",
          "pronunciation": null,
          "romanization": null,
          "furigana": null,
          "definition_short": "to go",
          "proficiency_system": "internal",
          "proficiency_level": "beginner",
          "entity": null,
          "lexical_identity": {
            "language_code": "ko",
            "lemma": "가다",
            "part_of_speech": "verb",
            "sense_id": null,
            "external_lexicon_id": null,
            "status": "resolved",
            "provenance": "canonical_lexicon",
            "confidence": 0.98,
            "tokenizer_version": "textplex-tokenizer-1",
            "identity_key": "lex:v1:<sha256>"
          },
          "bbox": null
        }
      ],
      "grammar_patterns": []
    }
  ]
}
```

## Persisted artifacts

For each extracted page, store a normalized page artifact that includes:

- `source_page_sha256`
- `processor_version`
- `pipeline_version`
- the validated `PageExtractionResult`

For each extraction run, also store a book-level summary containing:

- the book id
- the page range
- the per-page extraction results
- aggregated lexical entries
- aggregated token occurrences

## Rules

1. Preserve page order.
2. Preserve token surface form exactly as visible after OCR correction.
3. Store lemma separately from surface form.
4. Do not invent dictionary definitions when lookup confidence is low; return null plus a warning.
5. Names must not be merged with dictionary words without explicit entity evidence.
6. A failed page must be retryable independently.
7. Every AI response must be schema-validated before persistence.
8. Save the normalized page artifact so processor changes can be audited.
9. Build lexical identity keys from normalized language, lemma, part of speech, sense id, and external lexicon id. Provenance, confidence, status, and tokenizer version remain auditable metadata rather than key material.
10. A non-punctuation token produced without lexicon or contextual evidence must use `surface_fallback` status and null confidence. Do not invent certainty from successful tokenization alone.

`lexical_identity` is additive and optional so older page artifacts remain readable. Newly tokenized word records receive a `surface_fallback` identity. The learner event ledger continues to use its existing lemma identity until a separately tested migration and reconciliation slice is implemented; do not treat this first contract key as a migrated learner-state identifier.

For Chinese-specific segmentation, token hints, and pinyin fallback behavior, see [Chinese Text Processing Notes](./CHINESE_TEXT_PROCESSING.md).

For a reusable structure that can be adapted to other non-Latin scripts, see [Non-Romanized Language Processing Template](./NON_ROMANIZED_LANGUAGE_PROCESSING_TEMPLATE.md).

For an implementation-order view of which languages to prioritize first, see [Non-Romanized Language Scope](./NON_ROMANIZED_LANGUAGE_SCOPE.md).

For a starter public-domain corpus to use when testing those languages, see [Non-Romanized Language Test Corpus](./NON_ROMANIZED_LANGUAGE_TEST_CORPUS.md).

For the first-wave Japanese-specific processing note, see [Japanese Text Processing Notes](./JAPANESE_TEXT_PROCESSING.md).

For Russian-specific Cyrillic normalization, lemma lookup, and TRKI-aware lexicon behavior, see [Russian Text Processing Notes](./RUSSIAN_TEXT_PROCESSING.md).

## Idempotency

A page processing key should include:

`source_page_sha256 + processor_version + language_pipeline_version`

If the key matches an existing successful artifact, skip the external call unless the user explicitly requests reprocessing.
