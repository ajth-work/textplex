# Arabic Lexicon Pack

The bundled `lexicon.csv` contains the two Study starter levels. It is a deliberately small, canonical MSA on-ramp; future levels should extend the source pack and program definition rather than add UI-only terms.

This directory is the starter location for the Arabic vocabulary database. The first pass should stay focused on a Modern Standard Arabic starter pack that supports the reader before any dialect expansion.

## Intended Sources

The first build should be based on open Arabic lexical and learner resources such as:

- modern standard Arabic dictionary data with lemma, part-of-speech, pronunciation, and gloss fields
- frequency-ranked Arabic word lists or corpus exports that can be normalized into lemma order
- ACTFL AAPPL topic areas and the ACTFL Can-Do Statements as curriculum-shaping guides
- public-domain or openly licensed Arabic reading corpora for example sentences and coverage checks
- optional transliteration or romanization fields when the source pack provides them

Priority should stay on sources that already expose:

- a stable lemma or headword
- a short English gloss
- a pronunciation or transliteration column
- enough metadata to tell apart inflected forms from the headword

## Sourcing Strategy

Use the following order when assembling entries:

1. Start with dictionary-backed headwords in Modern Standard Arabic.
2. Prefer entries with clear lemma forms, part-of-speech labels, transliteration or pronunciation, and short English glosses.
3. Rank the seed list by ACTFL bands and practical reading frequency, not by a synthetic word-count quota.
4. Group the first-wave vocabulary by AAPPL-style topic buckets so the pack matches learner tasks:
   - identity and personal information
   - family and home
   - daily routine
   - school and work
   - food and shopping
   - travel and directions
   - community and services
   - media and simple opinion
5. Add corpus-backed examples only after the headword is represented cleanly in the dictionary layer.
6. Keep the starter pack small enough to validate import, RTL rendering, transliteration, and fallback lookup before expanding to a larger corpus.

ACTFL proficiency bands should be used as the prioritization anchor, not as a public word-count ladder. When a word is common in the dictionary data but not obviously tied to one AAPPL topic, keep it in the pack if it helps basic reading fluency or core school vocabulary.

## Acquisition Workflow

1. Collect a frequency-ranked Arabic export from the source you choose and keep it local.
2. Normalize the export into the canonical `lexicon.csv` pack layout or a SQLite pack once the source data is stable.
3. Keep a small `lexicon.override.csv` beside the generated pack for bridge entries that the starter list misses.
4. Review the generated pack before importing it into TextPlex so the early reader surfaces stay stable.
5. Use AAPPL topic buckets to decide which vocabulary belongs in the first wave:
   - identity and personal information
   - family and home
   - daily routine
   - school and work
   - food and shopping
   - travel and directions
   - community and services
   - media and simple opinion
6. Record whether each entry came from a dictionary export, a frequency list, or a corpus pass so the reader can distinguish canonical lookup coverage from later enrichment.
7. Keep transliteration in sync with the reader pronunciation guide so romanization and source-script display stay aligned.

## Included Starter Pack

`lexicon.csv` now supplies the ten Modern Standard Arabic terms used by the two Study starter levels. It follows the canonical import layout, including transliteration, short English glosses, and a stable starter rank. Expand this local pack before adding another program level.

## Pack Goal

The bundled pack should eventually compile to a `lexicon.sqlite3` file with rows that the TextPlex importer can load directly.

### Starter-pack checklist

- `lexicon.csv` or `lexicon.sqlite3`
- lemma/headword
- part of speech
- pronunciation or transliteration
- short English gloss
- source tag
- ACTFL band or stage label
- optional example sentence
- optional override row for irregular but common forms

Recommended mapping for the current compatibility schema:

- `surface_form`: Arabic lookup form
- `pinyin`: transliteration or pronunciation when available
- `hsk_level`: ACTFL band or another proficiency label when applicable
- `definition`: short English gloss

Keep source conversion scripts alongside this pack once the first generated database exists.
