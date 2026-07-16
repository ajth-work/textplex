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
          "definition_short": "to go",
          "proficiency_system": "internal",
          "proficiency_level": "beginner",
          "entity": null,
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

## Idempotency

A page processing key should include:

`source_page_sha256 + processor_version + language_pipeline_version`

If the key matches an existing successful artifact, skip the external call unless the user explicitly requests reprocessing.
