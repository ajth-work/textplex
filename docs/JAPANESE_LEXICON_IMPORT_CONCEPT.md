# Japanese Lexicon Import Concept

Status: concept and implementation plan. The source workbook is preserved, but the importer described here is not implemented yet.

Related tracker item: [#78](https://github.com/ajth-work/textplex/issues/78).

Related implementation ticket: [#153](https://github.com/ajth-work/textplex/issues/153).

## Goal

Turn the Afterlife Japanese workbook and the related Memrise Non-WK kanji source into a reproducible Japanese curriculum pack for TextPlex. The workbook should remain provenance material; the application should consume a normalized source pack rather than read `.xlsx` files at runtime.

## Source inventory

### Afterlife workbook

- Native Google Sheet: [Afterlife: JLPT N1 and Joyo Kanji (Database)](https://docs.google.com/spreadsheets/d/18E9Iy9VycPFdcAg8EUujRkRP46nWHm-thWudPD3yuYU/edit)
- Repository copy: [`resources/lexicon/japanese/Afterlife - JLPT N1 and Joyo Kanji (Database).xlsx`](../resources/lexicon/japanese/Afterlife%20-%20JLPT%20N1%20and%20J%C5%8Dy%C5%8D%20Kanji%20%28Database%29.xlsx)
- Canonical source tabs: `Kanji`, `Nouns`, `Verbs`, `Adjectives`, and `Other (POS)`.
- Supporting documentation: `Notes`.
- Exclude backup, test, results, survey, and unsorted tabs from the canonical import unless they are explicitly promoted after review.

The visible source contains approximately 600 kanji, 541 nouns, 80 verbs, 51 adjectives, and 43 other entries. Its unit labels and mnemonic fields are valuable curriculum data, while its survey and response fields are historical study data and must not become learner state.

### Memrise Non-WK source

Yes, Drive contains separate spreadsheets with this title family:

- [Memrise: Non-WK Common Kanji (PUBLIC)](https://docs.google.com/spreadsheets/d/18WjLh_dvf8JzSVJEVIkPf81U3ju_dWkcelpWfx9phNA/edit)
- [Memrise: Non-WK Common Kanji](https://docs.google.com/spreadsheets/d/1FkOXzV6MWcLHzJl_ej4KMWB5rut38U7QNykWhb6l7c4/edit)
- [Memrise: Non-WK Common Kanji V3](https://docs.google.com/spreadsheets/d/1cZnRNfMaoRwqjRBxjQTP9L2GLkA1RMyOSTssdEJcwBM/edit)
- [Memrise: Non-WK Common Kanji V4](https://docs.google.com/spreadsheets/d/1FEko_OSj2GwXBLm6rXSxkmxjFL2YgikvBS7y93dP5fw/edit)

The public workbook has a `Kanji` tab plus the same vocabulary-oriented tabs as the Afterlife workbook. In the Afterlife workbook, the hidden `Memrise columns` tab is an export template: it defines Memrise-shaped columns for kanji and vocabulary, including meanings, readings, mnemonics, and radicals/compounds. It is not itself the full Non-WK dataset.

The Memrise source should initially be represented as a separate source set, such as `memrise-non-wk`, even when rows overlap with Afterlife. A comparison report can later identify shared kanji and curriculum differences without losing source lineage.

## Recommended data flow

```text
Drive workbooks
    -> read-only, deterministic importer
    -> validation and source comparison report
    -> canonical Japanese source pack
    -> SQLite lexicon import
    -> API lookup, Reader details, Study units, conjugation
```

The importer should be idempotent and local-only. It should normalize Unicode and whitespace, preserve the original source values, validate expected headers, retain source sheet/row locations, and emit counts plus rejected-row diagnostics.

## Normalized model

Keep generic lookup data in `lexicon_entries`, then add Japanese-specific metadata rather than overloading Chinese compatibility fields such as `pinyin` and `hsk_level`.

```text
lexicon_entries
  language_code, entry_type, surface_form, reading, definition, source

japanese_term_metadata
  source_id, unit_label, part_of_speech, transitivity,
  meaning_mnemonic, reading_mnemonic, kanji_meanings, notes,
  source_set, source_sheet, source_row

japanese_kanji_metadata
  character, on_reading, kun_reading, radicals_or_compounds,
  meaning_mnemonic, on_mnemonic, kun_mnemonic,
  unit_label, survey_note, source_set

japanese_verb_metadata
  source_id, conjugation_class, transitivity, expression_type,
  lexical_override, source_set
```

Stable workbook IDs such as `K001`, `N001`, and `V001` should be preserved as source IDs. Dedupe should use normalized language, entry type, and surface form while retaining all source memberships and aliases.

## Verb integration

The imported verb POS labels should provide an explicit conjugation-class hint:

- ichidan
- godan grouped by final kana
- suru verbs
- kuru verbs
- expression-only or transitivity tags such as `EXP`, `TRANS`, and `INTRANS`

The existing Japanese conjugation engine should use this metadata before applying heuristic classification. Generated forms remain derived data; only genuine lexical exceptions or source-approved overrides should be stored.

## API and learner experience

Keep the existing fast lookup endpoint for Reader token enrichment, then add Japanese detail routes such as:

- `GET /lexicon/japanese/entries/{source_id}`
- `GET /lexicon/japanese/kanji/{character}`
- `GET /lexicon/japanese/units`
- `POST /lexicon/japanese/conjugate`

The Reader can show a definition and reading first, with optional kanji mnemonic/detail. For verbs, it can show the source class, transitivity, and a generated conjugation grid. Study can use the source unit and source set as curriculum filters while keeping exposure, mastery, reviews, and responses in the learner database.

## Source precedence and safety

The source sets have different roles:

1. JMdict/KANJIDIC2 should eventually verify dictionary identity and readings.
2. Afterlife supplies course units, mnemonics, ordering, and contextual notes.
3. Memrise Non-WK supplies a separate kanji curriculum/export shape.
4. TextPlex learner data supplies exposure and mastery state.

Do not import `AK%`, `AW%`, response counts, missed-word tabs, or test results into learner state. Treat personal mnemonics as user-provided reference content and keep source attribution attached.

## Delivery phases

1. Add a read-only workbook importer and a validation/comparison report.
2. Produce a normalized Japanese CSV or SQLite source pack with source IDs and metadata.
3. Add Japanese metadata migrations and detail endpoints.
4. Connect verb metadata to conjugation and add Reader/Study presentation.
5. Add separate Memrise Non-WK curriculum filtering after the source comparison is reviewed.

## Acceptance criteria

- Re-running the importer produces the same normalized output.
- Canonical tabs and excluded working tabs are explicit in the importer.
- Missing terms, readings, meanings, malformed POS labels, duplicate IDs, and conflicting source rows are reported.
- Afterlife and Memrise records retain separate source-set lineage.
- Learner review history is never derived from workbook survey/test sheets.
- Japanese conjugation uses imported verb-class metadata where present and reports its rule/override source.
