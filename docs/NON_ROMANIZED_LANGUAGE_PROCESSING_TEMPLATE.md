# Non-Romanized Language Processing Template

Use this template when adding or documenting processing rules for languages that are not primarily written in the Latin alphabet, including languages such as Korean, Japanese, Russian, Hebrew, Arabic, Thai, Greek, and similar scripts.

## How to use this template

- Copy the sections that fit the target language.
- Replace bracketed placeholders with the language-specific rule set.
- Keep the document focused on processor behavior, lexicon behavior, and reader-facing output.
- If a language needs its own exception rules, record them here or in a language-specific note derived from this template.

## Template

### 1. Language Profile

- Language:
- Script(s):
- Directionality:
- Word spacing behavior:
- Segmentation strategy:
- Transliteration or romanization system:
- Dictionary or lexicon source:
- Reader display conventions:

### 2. Core Principle

Preserve the visible surface form that the learner saw.

The processor should avoid silently rewriting the text into a different script, orthography, or normalization form unless that transformation is explicitly part of the contract.

### 3. Normalization Rules

Document what normalization is allowed and what must not change.

- Whitespace normalization:
- Unicode normalization form, if any:
- Punctuation normalization:
- Diacritics or marks:
- Case folding, if applicable:
- Handling of optional writing aids:

### 4. Sentence Splitting

Describe how sentence boundaries are detected.

- Sentence terminators:
- Abbreviation or clitic exceptions:
- Handling of ellipsis or sentence-final particles:
- Behavior when a page ends mid-sentence:

### 5. Tokenization Rules

Describe the tokenization strategy and fallback path.

- Preferred segmenter:
- Fallback segmenter:
- Word boundary expectations:
- Mixed-script handling:
- Numbers, punctuation, and symbols:
- Multi-character word behavior:
- Compound handling:

### 6. Lexicon Enrichment

Describe how token surfaces map to dictionary data.

- Exact-match lookup behavior:
- Lemma mapping:
- Part of speech handling:
- Transliteration or pronunciation lookup:
- Definition lookup:
- Frequency or proficiency metadata:
- Character-level or syllable-level fallback:

### 7. Romanization or Transliteration

If the language uses a transliteration layer, document it here.

- Preferred system:
- When to attach it:
- When to leave it null:
- Whether it is required for all tokens or only some:
- How to handle ambiguous mappings:

### 8. Token Hints and OCR Guidance

Describe how OCR or AI providers should supply hints.

- Hint keying:
- Whether hints are exact surface matches or normalized matches:
- Whether hints may add transliteration:
- Whether hints may add definitions:
- Whether hints may suggest token boundaries:

### 9. Reader Output Rules

Describe how the reader should present the text.

- What should remain visible:
- Whether transliteration appears inline, in a card, or on demand:
- Whether the reader should preserve original punctuation:
- Whether the reader should merge or split tokens for display:

### 10. Data Separation Rules

Keep book truth and learner truth separate.

- Book database stores:
- User profile database stores:
- What must never be persisted in the book database:

### 11. Verification Checklist

When changing the language pipeline, verify:

- visible surface forms stay stable
- tokenization behaves correctly for whole words and fallback cases
- punctuation is not counted as a lexical occurrence
- lexicon lookup resolves exact matches
- transliteration or pronunciation is attached only when expected
- reader payloads still match the source text
- profile/exposure logic stays separate from book data

### 12. Language-Specific Notes

Use this area for edge cases specific to the target language.

#### Example placeholders

- Korean:
  - Hangul syllable handling
  - spacing and particles
  - romanization rules
- Japanese:
  - kanji/kana handling
  - no-space segmentation
  - furigana or reading aids
- Russian:
  - Cyrillic token boundaries
  - inflection and lemma lookup
  - transliteration policy
- Hebrew:
  - right-to-left display handling
  - niqqud handling
  - clitics and affixes

### 13. Related Tests

List the regression coverage that proves the contract.

- processor tokenization tests
- lexicon import and lookup tests
- reader payload tests
- profile/exposure tests

## Suggested Derivatives

When a language needs a dedicated note, copy this template and rename it with the language name, for example:

- `KOREAN_TEXT_PROCESSING.md`
- `JAPANESE_TEXT_PROCESSING.md`
- `RUSSIAN_TEXT_PROCESSING.md`
- `HEBREW_TEXT_PROCESSING.md`

Keep the template current whenever the processor contract changes in a way that affects non-Latin scripts.
