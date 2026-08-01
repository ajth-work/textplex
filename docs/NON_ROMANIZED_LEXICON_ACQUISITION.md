# Non-Romanized Lexicon Acquisition

This note captures the current repeatable pack-acquisition workflow for Korean and Russian so the next agent can resume without reconstructing the sourcing plan from scratch.

## Current State

- Korean is the active build.
- Russian is being brought to the same sourced-pack state.
- Korean follow-up notes are tracked separately in [Korean Text Processing Notes](./KOREAN_TEXT_PROCESSING.md).
- Russian follow-up notes are tracked separately in [Russian Text Processing Notes](./RUSSIAN_TEXT_PROCESSING.md).
- The repo keeps source packs local only; do not commit downloaded dictionary exports or corpus downloads.

## Korean Workflow

1. Download an official KRDICT export in XML or JSON from the Korean Basic Dictionary site.
2. Prefer an export that includes `word`, `pos`, `pronunciation`, `word_grade`, and `definition`.
3. If you are using the curated TOPIK workbook as a ranking seed, run the workbook normalizer first:

```powershell
python scripts/normalize_korean_vocab_workbook.py --source <path-to-workbook.xlsx> --output-csv resources/lexicon/korean/staging/korean_vocab_6000.cleaned.csv --output-report docs/KOREAN_VOCAB_6000_CLEANUP.md
```

4. Build the canonical Korean pack:

```powershell
python scripts/build_korean_lexicon.py --source <path-to-krdict-export.xml-or-json>
```

5. If you staged workbook data, run the pack builder against the staging CSV to generate `resources/lexicon/korean/lexicon.csv`.
6. Keep `resources/lexicon/korean/lexicon.override.csv` for a small set of sample-text bridge entries and core reader QA gaps.
7. Import the generated pack into the local lexicon database and run the lexicon tests.

## Russian Workflow

1. Use the Russian National Corpus for source acquisition and frequency ordering.
2. Use Gramota normative dictionaries as the dictionary authority for spelling, pronunciation, and meaning checks.
3. Use TRKI levels as the priority anchor, not as a word-count ladder.
4. Download a Russian corpus export from the RNC search or word-portrait tools in CSV format.
5. Run the Russian pack builder against the export:

```powershell
python scripts/build_russian_lexicon.py --source <path-to-rnc-export.csv>
```

6. Review the generated `resources/lexicon/russian/lexicon.csv`.
7. Keep the starter pack small enough to validate import, lookup, and reader rendering before expanding the corpus.
8. Keep the Russian notes in `docs/RUSSIAN_TEXT_PROCESSING.md` and `resources/lexicon/russian/README.md` synchronized with the export format you settle on.

## Russian CSV Seed

If you are ranking or refining the Russian starter list from the curated `RU5000 (v0.1) - RU5000.csv` export, use it as a seed file rather than the final pack:

1. Keep the CSV local and out of Git.
2. Normalize the rows you want before building the pack if you need additional cleanup.
3. Prefer columns or notes that preserve lemma, surface form, pronunciation/transliteration, meaning, and frequency rank.
4. Keep a small `lexicon.override.csv` nearby for bridge entries that cover high-value missing forms such as calendar vocabulary.
5. Treat the CSV as a discovery aid for the first 5,000-word backbone, then let the builder and the lexicon tests confirm the final pack shape.

## Next Resume Checklist

- [ ] Expand the Russian starter pack beyond the smoke-test seed.
- [ ] Decide whether to add a second Russian dictionary override file for pronunciation/definition enrichment.
- [ ] Pull a real RNC CSV export and compare it with the starter seed ranking.
- [ ] Keep the Korean and Russian pack READMEs synchronized with whatever export format proves easiest in practice.

## Official Source Links

- Korean Basic Dictionary open API and download page: https://krdict.korean.go.kr/eng/openApi/openApiInfo
- Korean Basic Dictionary full export page: https://krdict.korean.go.kr/download/downloadPopup
- Russian National Corpus portal and public API notes: https://ruscorpora.ru/
- Pushkin Institute learner levels: https://pushkininstitute.ru/learn
- Gramota portal: https://gramota.ru/
