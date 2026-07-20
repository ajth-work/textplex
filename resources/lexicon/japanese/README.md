# Japanese Lexicon Pack

This directory is the starter location for the Japanese vocabulary database.

## Intended Sources

The first build should be based on open Japanese lexical resources such as:

- JMdict for vocabulary entries and readings
- KANJIDIC2 for kanji readings, grade information, and character metadata

## Pack Goal

The bundled pack should eventually compile to a `lexicon.sqlite3` file with rows that the TextPlex importer can load directly.

Recommended mapping for the current compatibility schema:

- `surface_form`: kanji/kana lookup form
- `pinyin`: reading or kana gloss, used as the current reading field
- `hsk_level`: JLPT band or another proficiency label when applicable
- `definition`: short English gloss

Keep source conversion scripts alongside this pack once the first generated database exists.
