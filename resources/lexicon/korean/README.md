# Korean Lexicon Pack

This directory is the starter location for the Korean vocabulary database.

## Intended Sources

The first build should be based on open Korean lexical resources such as:

- National Institute of Korean Language learner dictionaries, especially the Basic Korean Dictionary / Korean-English Learners' Dictionary
- `우리말샘` for broader usage notes, examples, and community vocabulary coverage
- learner-facing material tied to TOPIK I and TOPIK II level priorities
- curated corpora from public-domain or openly licensed Korean texts

## Sourcing Strategy

Use the following order when assembling entries:

1. Start with headwords that are already present in the learner dictionaries.
2. Prefer clear dictionary definitions, part-of-speech labels, and pronunciation data.
3. Rank the seed list by TOPIK band and common classroom or media frequency, not by a synthetic word-count quota.
4. Add corpus-backed examples only after the headword is represented cleanly in the dictionary layer.
5. Keep the seed pack small enough to validate import, lookup, and reader rendering before expanding to the full corpus.

TOPIK should be used as a prioritization anchor, not as a public word-count ladder. When a word is common in the dictionary data but not obviously TOPIK-bound, keep it in the pack if it helps basic reading fluency or core school vocabulary.

## Acquisition Workflow

1. Download an official KRDICT export in XML or JSON from the dictionary site.
2. Prefer the export options that include `word`, `pos`, `pronunciation`, `word_grade`, and `definition`.
3. Keep the export file local and run the pack builder against it:

```powershell
python scripts/build_korean_lexicon.py --source <path-to-krdict-export.xml-or-json>
```

4. Review the generated `lexicon.csv` before importing it into the SQLite pack.
5. Use the official dictionary grade and subject categories to prioritize basic reading vocabulary first.

## Pack Goal

The bundled pack should eventually compile to a `lexicon.sqlite3` file with rows that the TextPlex importer can load directly.

Recommended mapping for the current compatibility schema:

- `surface_form`: Hangul lookup form
- `pinyin`: romanization or pronunciation when available
- `hsk_level`: TOPIK band or another proficiency label when applicable
- `definition`: short English gloss

Keep source conversion scripts alongside this pack once the first generated database exists.
