from __future__ import annotations

from pathlib import Path

from app.services.korean_lexicon_builder import build_korean_lexicon_rows, parse_korean_dictionary_export


def test_parse_korean_dictionary_xml_export(tmp_path: Path) -> None:
    source = tmp_path / "korean-export.xml"
    source.write_text(
        """<?xml version="1.0" encoding="UTF-8"?>
<channel>
  <item>
    <word>안녕</word>
    <sup_no>0</sup_no>
    <pronunciation>annyeong</pronunciation>
    <word_grade>초급</word_grade>
    <pos>감탄사</pos>
    <sense>
      <sense_order>1</sense_order>
      <definition>hello</definition>
    </sense>
    <subject_cat>인사하기</subject_cat>
  </item>
</channel>
""",
        encoding="utf-8",
    )

    records = parse_korean_dictionary_export(source)

    assert len(records) == 1
    assert records[0]["word"] == "안녕"
    assert records[0]["pronunciation"] == "annyeong"
    assert records[0]["word_grade"] == "초급"
    assert records[0]["definitions"] == ["hello"]
    assert records[0]["subject_cat"] == ["인사하기"]


def test_build_korean_lexicon_rows_prioritizes_grade_and_subjects() -> None:
    rows = build_korean_lexicon_rows(
        [
            {
                "word": "사과",
                "pronunciation": "sagwa",
                "word_grade": "중급",
                "definitions": ["apple"],
                "subject_cat": ["음식 주문하기"],
            },
            {
                "word": "책",
                "pronunciation": "chaek",
                "word_grade": "초급",
                "definitions": ["book"],
                "subject_cat": ["학교생활"],
            },
            {
                "word": "안녕",
                "pronunciation": "annyeong",
                "word_grade": "초급",
                "definitions": ["hello", "hi"],
                "subject_cat": ["인사하기"],
            },
        ],
        source_name="test-export.xml",
        source_path="test-export.xml",
        max_rows=2,
    )

    assert [row["surface_form"] for row in rows] == ["안녕", "책"]
    assert rows[0]["definition"] == "hello; hi"
    assert rows[0]["hsk_level"] == "초급"
    assert "subjects=인사하기" in rows[0]["note"]


def test_parse_korean_krdict_json_export(tmp_path: Path) -> None:
    source = tmp_path / "korean-export.json"
    source.write_text(
        """{
  "LexicalResource": {
    "Lexicon": {
      "LexicalEntry": [
        {
          "Lemma": {"feat": {"att": "writtenForm", "val": "안녕"}},
          "WordForm": {"feat": [{"att": "type", "val": "발음"}, {"att": "pronunciation", "val": "안녕"}]},
          "Sense": [
            {
              "Equivalent": [
                {"feat": [{"att": "language", "val": "영어"}, {"att": "definition", "val": "hello"}]}
              ]
            }
          ],
          "feat": [
            {"att": "vocabularyLevel", "val": "초급"},
            {"att": "partOfSpeech", "val": "감탄사"},
            {"att": "semanticCategory", "val": "인사하기"}
          ]
        }
      ]
    }
  }
}""",
        encoding="utf-8",
    )

    records = parse_korean_dictionary_export(source)

    assert len(records) == 1
    assert records[0]["word"] == "안녕"
    assert records[0]["pronunciation"] == "안녕"
    assert records[0]["word_grade"] == "초급"
    assert records[0]["pos"] == "감탄사"
    assert records[0]["definitions"] == ["hello"]
    assert records[0]["subject_cat"] == ["인사하기"]
