from __future__ import annotations

import csv
import json
import xml.etree.ElementTree as ET
from collections import OrderedDict
from pathlib import Path
from typing import Any


KOREAN_SUBJECT_PRIORITY = [
    "인사하기",
    "소개하기(자기소개)",
    "소개하기(가족소개)",
    "개인 정보 교환하기",
    "위치 표현하기",
    "길찾기",
    "교통 이용하기",
    "물건 사기",
    "음식 주문하기",
    "요리 설명하기",
    "시간 표현하기",
    "날짜 표현하기",
    "요일 표현하기",
    "날씨와 계절",
    "하루 생활",
    "학교생활",
    "한국 생활",
    "약속하기",
    "전화하기",
    "감사하기",
    "사과하기",
    "여행",
    "주말 및 휴가",
    "취미",
    "가족 행사",
    "건강",
    "병원 이용하기",
    "약국 이용하기",
    "공공 기관 이용하기(도서관)",
    "공공 기관 이용하기(우체국)",
    "공공 기관 이용하기(출입국 관리 사무소)",
    "초대와 방문",
    "집 구하기",
    "집안일",
]

KOREAN_GRADE_PRIORITY = {
    "초급": 0,
    "중급": 1,
    "고급": 2,
}

KOREAN_LEXICAL_UNIT_PRIORITY = {
    "단어": 0,
    "구": 1,
    "문장": 2,
    "접사": 3,
}

KOREAN_PART_OF_SPEECH_PRIORITY = {
    "명사": 0,
    "대명사": 1,
    "수사": 2,
    "동사": 3,
    "형용사": 4,
    "부사": 5,
    "감탄사": 6,
    "관형사": 7,
    "의존 명사": 8,
    "조사": 9,
    "어미": 10,
    "접사": 11,
}

KOREAN_LEXICON_CSV_HEADER = [
    "surface_form",
    "entry_type",
    "pinyin",
    "tone",
    "definition",
    "radical",
    "stroke_count",
    "hsk_level",
    "frequency_rank",
    "note",
]


def _first_text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        text = value.strip()
        return text or None
    return str(value).strip() or None


def _text_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [text for item in value if (text := _first_text(item))]
    text = _first_text(value)
    return [text] if text else []


def _feature_items(value: Any) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    if isinstance(value, dict):
        if isinstance(value.get("feat"), list):
            for item in value["feat"]:
                if isinstance(item, dict):
                    items.append(item)
            return items
        if isinstance(value.get("feat"), dict):
            feat = value["feat"]
            if isinstance(feat, dict):
                items.append(feat)
            return items
        if "att" in value and "val" in value:
            items.append(value)
            return items
        for nested in value.values():
            items.extend(_feature_items(nested))
        return items
    if isinstance(value, list):
        for item in value:
            items.extend(_feature_items(item))
    return items


def _first_feature_value(value: Any, *attributes: str) -> str | None:
    wanted = {attribute for attribute in attributes}
    for item in _feature_items(value):
        attribute = _first_text(item.get("att"))
        if attribute in wanted:
            text = _first_text(item.get("val"))
            if text:
                return text
    return None


def _feature_values(value: Any, *attributes: str) -> list[str]:
    wanted = {attribute for attribute in attributes}
    values: list[str] = []
    for item in _feature_items(value):
        attribute = _first_text(item.get("att"))
        if attribute in wanted:
            text = _first_text(item.get("val"))
            if text and text not in values:
                values.append(text)
    return values


def _parse_krdict_json_entry(entry: dict[str, Any]) -> dict[str, Any] | None:
    lemma = _first_feature_value(entry.get("Lemma"), "writtenForm")
    if not lemma:
        return None

    pronunciation = _first_feature_value(entry.get("WordForm"), "pronunciation")
    word_grade = _first_feature_value(entry, "vocabularyLevel")
    pos = _first_feature_value(entry, "partOfSpeech")
    lexical_unit = _first_feature_value(entry, "lexicalUnit")
    subject_cat = _first_feature_value(entry, "semanticCategory")
    subject_categories = [subject_cat] if subject_cat else []

    definitions: list[str] = []
    sense = entry.get("Sense")
    if isinstance(sense, list):
        for sense_item in sense:
            if not isinstance(sense_item, dict):
                continue
            equivalents = sense_item.get("Equivalent")
            if isinstance(equivalents, list):
                for equivalent_item in equivalents:
                    if not isinstance(equivalent_item, dict):
                        continue
                    if _first_feature_value(equivalent_item, "language") != "영어":
                        continue
                    definition = _first_feature_value(equivalent_item, "definition")
                    if definition and definition not in definitions:
                        definitions.append(definition)
    elif isinstance(sense, dict):
        equivalents = sense.get("Equivalent")
        if isinstance(equivalents, list):
            for equivalent_item in equivalents:
                if not isinstance(equivalent_item, dict):
                    continue
                if _first_feature_value(equivalent_item, "language") != "영어":
                    continue
                definition = _first_feature_value(equivalent_item, "definition")
                if definition and definition not in definitions:
                    definitions.append(definition)

    return {
        "word": lemma,
        "sup_no": _first_feature_value(entry, "homonym_number"),
        "origin": None,
        "pronunciation": pronunciation,
        "word_grade": word_grade,
        "pos": pos,
        "lexical_unit": lexical_unit,
        "definitions": definitions,
        "subject_cat": subject_categories,
    }


def _parse_krdict_json_records(payload: Any) -> list[dict[str, Any]]:
    resource = payload.get("LexicalResource") if isinstance(payload, dict) else None
    if not isinstance(resource, dict):
        return []

    lexicon = resource.get("Lexicon")
    if not isinstance(lexicon, dict):
        return []

    entries = lexicon.get("LexicalEntry")
    if isinstance(entries, dict):
        entries = [entries]
    if not isinstance(entries, list):
        return []

    records: list[dict[str, Any]] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        record = _parse_krdict_json_entry(entry)
        if record:
            records.append(record)
    return records


def _parse_json_items(payload: Any) -> list[dict[str, Any]]:
    krdict_records = _parse_krdict_json_records(payload)
    if krdict_records:
        return krdict_records

    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]

    if not isinstance(payload, dict):
        return []

    if isinstance(payload.get("channel"), dict) and isinstance(payload["channel"].get("item"), list):
        return [item for item in payload["channel"]["item"] if isinstance(item, dict)]

    if isinstance(payload.get("item"), list):
        return [item for item in payload["item"] if isinstance(item, dict)]

    if isinstance(payload.get("items"), list):
        return [item for item in payload["items"] if isinstance(item, dict)]

    return []


def _merge_json_senses(item: dict[str, Any]) -> list[str]:
    definitions: list[str] = []
    sense = item.get("sense")

    if isinstance(sense, list):
        for sense_item in sense:
            if not isinstance(sense_item, dict):
                continue
            for key in ("definition", "trans_dfn"):
                text = _first_text(sense_item.get(key))
                if text and text not in definitions:
                    definitions.append(text)
    elif isinstance(sense, dict):
        for key in ("definition", "trans_dfn"):
            text = _first_text(sense.get(key))
            if text and text not in definitions:
                definitions.append(text)

    for key in ("definition", "trans_dfn"):
        text = _first_text(item.get(key))
        if text and text not in definitions:
            definitions.append(text)

    return definitions


def _merge_xml_senses(item: ET.Element) -> list[str]:
    definitions: list[str] = []
    for sense in item.findall(".//sense"):
        for tag in ("definition", "trans_dfn"):
            text = _first_text(sense.findtext(tag))
            if text and text not in definitions:
                definitions.append(text)
    return definitions


def _parse_xml_items(xml_text: str) -> list[dict[str, Any]]:
    root = ET.fromstring(xml_text)
    records: list[dict[str, Any]] = []

    for item in root.findall(".//item"):
        word = _first_text(item.findtext("word"))
        if not word:
            continue
        subject_categories = [
            text
            for child in item.findall(".//subject_cat")
            if (text := _first_text(child.text))
        ]
        records.append(
            {
                "word": word,
                "sup_no": _first_text(item.findtext("sup_no")),
                "origin": _first_text(item.findtext("origin")),
                "pronunciation": _first_text(item.findtext("pronunciation")),
                "word_grade": _first_text(item.findtext("word_grade")),
                "pos": _first_text(item.findtext("pos")),
                "definitions": _merge_xml_senses(item),
                "subject_cat": subject_categories,
            }
        )

    return records


def parse_korean_dictionary_export(source_path: Path) -> list[dict[str, Any]]:
    if source_path.is_dir():
        records: list[dict[str, Any]] = []
        for child_path in sorted(source_path.iterdir()):
            if child_path.is_file() and child_path.suffix.lower() in {".json", ".xml"}:
                records.extend(parse_korean_dictionary_export(child_path))
        return records

    text = source_path.read_text(encoding="utf-8-sig")
    stripped = text.lstrip()

    if source_path.suffix.lower() in {".json", ".jsonl"} or stripped.startswith("{") or stripped.startswith("["):
        payload = json.loads(text)
        records = []
        krdict_records = _parse_krdict_json_records(payload)
        if krdict_records:
            return krdict_records
        for item in _parse_json_items(payload):
            word = _first_text(item.get("word"))
            if not word:
                continue
            records.append(
                {
                    "word": word,
                    "sup_no": _first_text(item.get("sup_no")),
                    "origin": _first_text(item.get("origin")),
                    "pronunciation": _first_text(item.get("pronunciation")),
                    "word_grade": _first_text(item.get("word_grade")),
                    "pos": _first_text(item.get("pos")),
                    "definitions": _merge_json_senses(item),
                    "subject_cat": _text_list(item.get("subject_cat")),
                }
            )
        return records

    return _parse_xml_items(text)


def _grade_rank(grade: str | None) -> int:
    if not grade:
        return len(KOREAN_GRADE_PRIORITY)
    return KOREAN_GRADE_PRIORITY.get(grade, len(KOREAN_GRADE_PRIORITY))


def _subject_rank(subjects: list[str]) -> int:
    if not subjects:
        return len(KOREAN_SUBJECT_PRIORITY)
    priority_map = {subject: index for index, subject in enumerate(KOREAN_SUBJECT_PRIORITY)}
    return min((priority_map.get(subject, len(KOREAN_SUBJECT_PRIORITY)) for subject in subjects), default=len(KOREAN_SUBJECT_PRIORITY))


def _lexical_unit_rank(lexical_unit: str | None) -> int:
    if not lexical_unit:
        return len(KOREAN_LEXICAL_UNIT_PRIORITY)
    return KOREAN_LEXICAL_UNIT_PRIORITY.get(lexical_unit, len(KOREAN_LEXICAL_UNIT_PRIORITY))


def _part_of_speech_rank(part_of_speech: str | None) -> int:
    if not part_of_speech:
        return len(KOREAN_PART_OF_SPEECH_PRIORITY)
    for key, rank in KOREAN_PART_OF_SPEECH_PRIORITY.items():
        if key in part_of_speech:
            return rank
    return len(KOREAN_PART_OF_SPEECH_PRIORITY)


def _priority_key(record: dict[str, Any]) -> tuple[int, int, int, int, int, str]:
    lexical_unit_rank = _lexical_unit_rank(record.get("lexical_unit"))
    pos_rank = _part_of_speech_rank(record.get("pos"))
    subject_rank = _subject_rank(record.get("subject_cat") or [])
    grade_rank = _grade_rank(record.get("word_grade"))
    definition_count = len(record.get("definitions") or [])
    return (
        lexical_unit_rank,
        pos_rank,
        grade_rank,
        subject_rank,
        0 if definition_count else 1,
        str(record.get("word") or ""),
    )


def build_korean_lexicon_rows(
    records: list[dict[str, Any]],
    *,
    source_name: str,
    source_path: str,
    max_rows: int | None = None,
) -> list[dict[str, str]]:
    grouped: "OrderedDict[str, dict[str, Any]]" = OrderedDict()

    for record in sorted(records, key=_priority_key):
        word = _first_text(record.get("word"))
        if not word:
            continue

        key = word
        existing = grouped.get(key)
        if existing is None:
            grouped[key] = {
                "word": word,
                "pronunciation": _first_text(record.get("pronunciation")),
                "word_grade": _first_text(record.get("word_grade")),
                "definitions": list(record.get("definitions") or []),
                "subject_cat": list(record.get("subject_cat") or []),
                "lexical_unit": _first_text(record.get("lexical_unit")),
                "source_name": source_name,
                "source_path": source_path,
            }
            continue

        if not existing.get("pronunciation"):
            existing["pronunciation"] = _first_text(record.get("pronunciation"))
        if not existing.get("word_grade"):
            existing["word_grade"] = _first_text(record.get("word_grade"))
        if not existing.get("lexical_unit"):
            existing["lexical_unit"] = _first_text(record.get("lexical_unit"))
        for definition in record.get("definitions") or []:
            if definition not in existing["definitions"]:
                existing["definitions"].append(definition)
        for subject in record.get("subject_cat") or []:
            if subject not in existing["subject_cat"]:
                existing["subject_cat"].append(subject)

    rows: list[dict[str, str]] = []
    for index, entry in enumerate(grouped.values(), start=1):
        if max_rows is not None and index > max_rows:
            break
        grade = _first_text(entry.get("word_grade"))
        pos = _first_text(entry.get("pos"))
        lexical_unit = _first_text(entry.get("lexical_unit"))
        subjects = entry.get("subject_cat") or []
        note_parts = [f"Source: {entry['source_name']}"]
        if grade:
            note_parts.append(f"grade={grade}")
        if pos:
            note_parts.append(f"pos={pos}")
        if lexical_unit:
            note_parts.append(f"unit={lexical_unit}")
        if subjects:
            note_parts.append("subjects=" + ", ".join(subjects[:3]))

        rows.append(
            {
                "surface_form": entry["word"],
                "entry_type": "word",
                "pinyin": entry.get("pronunciation") or "",
                "tone": "",
                "definition": "; ".join(entry.get("definitions") or []),
                "radical": "",
                "stroke_count": "",
                "hsk_level": grade or "",
                "frequency_rank": str(index),
                "note": "; ".join(note_parts),
            }
        )

    return rows


def write_korean_lexicon_csv(
    source_path: Path,
    output_path: Path,
    *,
    max_rows: int | None = None,
) -> list[dict[str, str]]:
    records = parse_korean_dictionary_export(source_path)
    rows = build_korean_lexicon_rows(
        records,
        source_name=source_path.name,
        source_path=str(source_path),
        max_rows=max_rows,
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=KOREAN_LEXICON_CSV_HEADER)
        writer.writeheader()
        writer.writerows(rows)
    return rows
