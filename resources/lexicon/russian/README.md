# Russian Lexicon Pack

This directory is the starter location for the Russian vocabulary database.

## Intended Sources

The first build should be based on open Russian lexical and learner resources such as:

- Gramota normative dictionaries for spelling, morphology, and usage checks
- the Russian National Corpus for frequency, examples, and word-portrait exports
- Pushkin Institute / TRKI level guidance for learner prioritization

## Sourcing Strategy

Use the following order when assembling entries:

1. Start with headwords that are already present in dictionary and corpus data.
2. Prefer clear lemma forms, part-of-speech labels, and pronunciation or transliteration data.
3. Rank the seed list by TRKI band and corpus frequency, not by a synthetic word-count quota.
4. Add corpus-backed examples only after the headword is represented cleanly in the dictionary layer.
5. Keep the seed pack small enough to validate import, lookup, and reader rendering before expanding to the full corpus.

TRKI should be used as a prioritization anchor, not as a public word-count ladder. When a word is common in the dictionary data but not obviously tied to a TRKI sample, keep it in the pack if it helps basic reading fluency or core school vocabulary.

## Acquisition Workflow

1. Download or assemble a CSV export from the Russian National Corpus search or word-portrait tools.
2. Prefer an export that includes `lemma`, `surface_form`, `pronunciation`, `level`, `part_of_speech`, `definition`, and some frequency signal such as `frequency_rank`, `ipm`, or `count`.
3. Keep the export file local and run the pack builder against it:

```powershell
python scripts/build_russian_lexicon.py --source <path-to-rnc-export.csv>
```

4. Review the generated `lexicon.csv` before importing it into the SQLite pack.
5. Use the TRKI band and corpus frequency to prioritize basic reading vocabulary first.

## Pack Goal

The bundled pack should eventually compile to a `lexicon.sqlite3` file with rows that the TextPlex importer can load directly.

Recommended mapping for the current compatibility schema:

- `surface_form`: Cyrillic lookup form
- `pinyin`: transliteration or pronunciation when available
- `hsk_level`: TRKI or CEFR band when applicable
- `definition`: short English gloss

Keep source conversion scripts alongside this pack once the first generated database exists.

