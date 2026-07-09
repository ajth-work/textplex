from pathlib import Path

from app.services.lexicon import import_lexicon_from_source, lookup_lexicon_entry


def test_import_and_lookup_lexicon_from_csv_assets(tmp_path: Path) -> None:
    source_root = tmp_path / "source"
    csv_root = source_root / "CSV Files"
    csv_root.mkdir(parents=True)

    (csv_root / "Chinese Character Recognition - Full Vocabulary List.csv").write_text(
        "No,Chinese,Pinyin,English,HSK Level\n"
        "1,三体,san ti,The Three-Body Problem,4\n",
        encoding="utf-8",
    )
    (csv_root / "Chinese Character Recognition - Full Characters.csv").write_text(
        "id,Character,HanziDB Character Link,Pinyin,Tone,Definition,Radical,HanziDB Radical Link,Stroke count,HSK level,TGL,TGL #,Frequency rank,Note,#,Length,Radical Order,General Standard #\n"
        "1,三,http://example.com,shan,1,three,一,http://example.com,3,1,G1,1,12,number,1,1,1,1\n",
        encoding="utf-8",
    )

    data_root = tmp_path / "data"
    summary = import_lexicon_from_source(source_root, data_root=data_root, replace_existing=True)

    assert summary.vocabulary_rows == 1
    assert summary.character_rows == 1
    assert summary.imported_rows == 2

    lookup = lookup_lexicon_entry(data_root=data_root, language_code="zh", term="三体")
    assert lookup.query == "三体"
    assert lookup.entries[0].definition == "The Three-Body Problem"
    assert lookup.entries[0].entry_type == "word"
