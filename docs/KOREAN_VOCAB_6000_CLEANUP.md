# Korean Vocabulary Workbook Cleanup

- Source workbook: `C:\Users\Andrew-John\Downloads\Korean vocabulary list 6000 TOPIK final release v1.xlsx`
- Sheet inspected: `list`
- Header cells: hidden numbering, Frequency Rank, Complexity, Word, Romanised, 품사, Classification, Hanja/Ref., English
- Data rows: 5979
- Unique surface forms: 5556
- Surface-form duplicates: 332 groups
- Exact duplicate rows: 0
- Missing romanized: 0
- Missing English gloss: 0
- Missing POS: 14
- Missing classification: 0

## Duplicate Surface Forms
- `이` x5
- `대` x5
- `만` x5
- `달다` x5
- `저` x4
- `쓰다` x4
- `타다` x4
- `치다` x4
- `차` x4
- `배` x4
- `자` x4
- `차다` x4
- `양` x4
- `지다` x4
- `상` x4
- `판` x4
- `있다` x3
- `수` x3
- `그` x3
- `보다` x3
- `등` x3
- `한` x3
- `말` x3
- `일` x3
- `안` x3

## Cleanup Guidance

- Keep the `word` column as the canonical Hangul headword.
- Treat repeated surface forms as separate senses or parts of speech until they are manually merged.
- Use `review_flags` to spot rows that need human review before pack import.
- Do not map `Complexity` to TOPIK yet; keep it as source metadata until the priority scheme is finalized.

## Next Step

Feed the staging CSV into the Korean pack selection pass, then choose which duplicate groups should merge and which should remain separate lexical entries.
