import sqlite3
from contextlib import closing
from pathlib import Path

from app.services.lexicon import import_lexicon_from_source, lookup_lexicon_entry


def test_import_and_lookup_lexicon_from_canonical_sqlite_pack(tmp_path: Path) -> None:
    source_root = tmp_path / "source"
    source_root.mkdir()

    with closing(sqlite3.connect(source_root / "lexicon.sqlite3")) as connection:
        connection.executescript(
            """
            CREATE TABLE lexicon_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                language_code TEXT NOT NULL,
                entry_type TEXT NOT NULL,
                surface_form TEXT NOT NULL,
                pinyin TEXT,
                definition TEXT,
                hsk_level TEXT,
                frequency_rank INTEGER,
                note TEXT,
                source_name TEXT,
                source_path TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            INSERT INTO lexicon_entries (
                language_code,
                entry_type,
                surface_form,
                pinyin,
                definition,
                hsk_level,
                frequency_rank,
                note,
                source_name,
                source_path
            ) VALUES (
                'ja',
                'word',
                '坊っちゃん',
                'ぼっちゃん',
                'a boy',
                'N4',
                1,
                'sample entry',
                'lexicon.sqlite3',
                'lexicon.sqlite3'
            );
            """
        )
        connection.commit()

    data_root = tmp_path / "data"
    summary = import_lexicon_from_source(source_root, data_root=data_root, language_code="ja", replace_existing=True)

    assert summary.vocabulary_rows == 1
    assert summary.character_rows == 0
    assert summary.imported_rows == 1

    lookup = lookup_lexicon_entry(data_root=data_root, language_code="ja", term="坊っちゃん")
    assert lookup.query == "坊っちゃん"
    assert lookup.entries[0].definition == "a boy"
    assert lookup.entries[0].pinyin == "ぼっちゃん"


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
