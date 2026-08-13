# Japanese Lexicon Pack

The bundled `lexicon.csv` contains the two Study starter levels. It is a deliberately small, canonical starter pack; future levels should extend the source pack and program definition rather than add UI-only terms.

This directory is the starter location for the Japanese vocabulary database.

## Intended Sources

The first build should be based on open Japanese lexical resources such as:

- JMdict for vocabulary entries and readings
- KANJIDIC2 for kanji readings, grade information, and character metadata

## Included Starter Pack

`lexicon.csv` now supplies the ten basic terms used by the two Study starter levels. It follows the canonical import layout, including readings, short English glosses, and stable starter ranks. Expand this local pack before adding another program level.

## Pack Goal

The bundled pack should eventually compile to a `lexicon.sqlite3` file with rows that the TextPlex importer can load directly.

Recommended mapping for the current compatibility schema:

- `surface_form`: kanji/kana lookup form
- `pinyin`: reading or kana gloss, used as the current reading field
- `hsk_level`: JLPT band or another proficiency label when applicable
- `definition`: short English gloss

Keep source conversion scripts alongside this pack once the first generated database exists.

## Imported Reference Workbook

`Afterlife - JLPT N1 and Jōyō Kanji (Database).xlsx` is a user-provided reference workbook imported from Google Drive on 2026-08-13. It is preserved as source material for future Japanese lexicon and kanji-pack work; the runtime importer does not consume the workbook directly yet.
