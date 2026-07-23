from __future__ import annotations

from pathlib import Path

from app.services.russian_lexicon_builder import build_russian_lexicon_rows, parse_russian_lexicon_export


def test_parse_russian_lexicon_csv_export(tmp_path: Path) -> None:
    source = tmp_path / "russian-export.csv"
    source.write_text(
        """Lemma,Transcription,TRKI Level,Meaning,Part of Speech,Rank,IPM
привет,privet,A1,hello,interj.,1,120.5
спасибо,spasibo,A1,thank you,noun,2,99.2
город,gorod,B1,city,noun,7,48.0
""",
        encoding="utf-8",
    )

    records = parse_russian_lexicon_export(source)

    assert len(records) == 3
    assert records[0]["surface_form"] == "привет"
    assert records[0]["pronunciation"] == "privet"
    assert records[0]["level"] == "TRKI A1"
    assert records[0]["definitions"] == ["hello"]
    assert records[0]["part_of_speech"] == "interj."
    assert records[0]["frequency_rank"] == 1
    assert records[0]["frequency_score"] == 120.5


def test_build_russian_lexicon_rows_prioritizes_level_and_frequency() -> None:
    rows = build_russian_lexicon_rows(
        [
            {
                "surface_form": "город",
                "pronunciation": "gorod",
                "level": "TRKI B1",
                "definitions": ["city"],
                "part_of_speech": "noun",
                "frequency_rank": 7,
                "frequency_score": 48.0,
            },
            {
                "surface_form": "спасибо",
                "pronunciation": "spasibo",
                "level": "TRKI A1",
                "definitions": ["thank you"],
                "part_of_speech": "noun",
                "frequency_rank": 2,
                "frequency_score": 99.2,
            },
            {
                "surface_form": "спасибо",
                "level": "A1",
                "definitions": ["thanks"],
                "frequency_rank": 4,
                "frequency_score": 88.0,
            },
            {
                "surface_form": "привет",
                "pronunciation": "privet",
                "level": "A1",
                "definitions": ["hello"],
                "part_of_speech": "interj.",
                "frequency_rank": 1,
                "frequency_score": 120.5,
            },
        ],
        source_name="test-export.csv",
        source_path="test-export.csv",
        max_rows=3,
    )

    assert [row["surface_form"] for row in rows] == ["привет", "спасибо", "город"]
    assert rows[1]["definition"] == "thank you; thanks"
    assert rows[1]["hsk_level"] == "TRKI A1"
    assert "pos=noun" in rows[1]["note"]

