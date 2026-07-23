# Lexicon Sources

This directory contains local source packs for building TextPlex vocabulary databases.

## Pack Format

The API importer now recognizes two pack styles:

1. Canonical pack
   - `lexicon.sqlite3`
   - table: `lexicon_entries`
2. Canonical CSV pack
   - `lexicon.csv`
   - same field names as the `lexicon_entries` table where practical

The current runtime database keeps the compatibility fields used by the Chinese pipeline:

- `pinyin`
- `tone`
- `hsk_level`

For non-Chinese languages, those fields can be used as the closest compatible reading or proficiency labels until the schema grows a fuller language-neutral shape.

## Current Layout

- `chinese-character-recognition/` is the bundled Chinese source pack already used by the app.
- `korean/` is the first non-Chinese source pack slot.
- `russian/` is the next non-Romanized source pack slot being brought to the same starter-pack state.
- `japanese/` follows as the next first-wave source pack slot.
- future language packs should follow the same pattern.
