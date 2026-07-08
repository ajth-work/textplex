# Architecture

## 1. System boundaries

The product has four runtime concerns.

### A. Import and processing

Accepts a PDF or ordered page-image set, creates normalized page assets, extracts text, segments tokens, enriches lexical entries, detects entities/grammar candidates, and writes a self-contained book database.

### B. Book API

Serves library metadata, pages, sentences, vocabulary, word occurrences, entity summaries, and book analytics.

### C. Reader and interaction tracking

Renders book pages and records active reading events, help requests, manual known/unknown decisions, and page completion.

### D. User learning profile

Aggregates exposure across books and computes vocabulary states independently from book data.

## 2. Storage model

### Per-book SQLite database

Each processed book is portable and immutable except for processor migrations/reprocessing.

Suggested path:

```text
data/books/{book_id}/
  book.sqlite3
  metadata.json
  pages/
    0001.jpg
    0002.jpg
  artifacts/
    page_0001.json
```

### User profile SQLite database

Suggested path:

```text
data/user/profile.sqlite3
```

Contains reading sessions, page reads, word interactions, exposure ledger, and aggregate vocabulary progress.

## 3. Service interfaces

### ProcessorService

- create_book_job(source)
- split_pdf(book_id)
- process_page(book_id, page_number)
- finalize_book(book_id)
- reprocess_page(book_id, page_number)

### LexiconService

- normalize_token(language, surface_form, context)
- lookup_lemma(language, lemma)
- proficiency_tags(language, lemma)
- pronunciation(language, lemma)

### LearningService

- record_page_read(...)
- record_word_help(...)
- record_manual_state(...)
- recompute_word_progress(...)
- recompute_language_summary(...)

### RetrievalService

Post-MVP service for book questions. Search relevant sentences/pages/entities, then pass only retrieved context to the AI provider.

## 4. Processing state machine

```text
IMPORTED
  -> PAGES_READY
  -> EXTRACTING
  -> ENRICHING
  -> FINALIZING
  -> READY

Failure path:
  any state -> FAILED
  FAILED -> RETRYING -> prior stage
```

Track status per book and per page. Never restart a 200-page book from page 1 because page 137 failed.

## 5. Reader modes

### MVP: text-first

Render cleaned sentence/token data. It is cheaper to build and easier to make interactive.

### Later: image-overlay

Use OCR bounding boxes to place interactive hit targets on the original scan.

## 6. AI boundary

Keep AI calls behind a provider interface. The rest of the app consumes validated internal schemas, not model-specific response shapes.

AI is appropriate for:

- difficult OCR cleanup
- contextual lemmatization
- ambiguous name/entity classification
- sentence explanation
- later book Q&A

Deterministic local code should handle:

- PDF splitting
- page ordering
- hashes and deduplication
- frequency counts
- database writes
- exposure aggregation
- dashboard calculations

## 7. Spoiler boundary for future book chat

Every retrieval query must accept a maximum readable page. Default AI answers should use only pages the user has completed. Full-book context requires an explicit user action.
