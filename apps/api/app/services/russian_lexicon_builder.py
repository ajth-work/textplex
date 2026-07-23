from __future__ import annotations

import csv
import json
import re
from collections import OrderedDict
from pathlib import Path
from typing import Any


RUSSIAN_LEVEL_PRIORITY = {
    "A1": 0,
    "A2": 1,
    "B1": 2,
    "B2": 3,
    "C1": 4,
    "C2": 5,
}

RUSSIAN_LEXICON_CSV_HEADER = [
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
    if not text:
        return []
    return [part.strip() for part in re.split(r"[;|]", text) if part.strip()] or [text]


def _safe_int(value: Any) -> int | None:
    text = _first_text(value)
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def _safe_float(value: Any) -> float | None:
    text = _first_text(value)
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _normalize_key(value: str) -> str:
    return re.sub(r"[^0-9a-zA-Z]+", "_", value.strip().lower()).strip("_")


def _normalized_row_map(row: dict[str, Any]) -> dict[str, Any]:
    normalized: dict[str, Any] = {}
    for key, value in row.items():
        if key is None:
            continue
        normalized[_normalize_key(key)] = value
    return normalized


def _pick_text(row: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        text = _first_text(row.get(_normalize_key(key)))
        if text:
            return text
    return None


def _collect_text_values(row: dict[str, Any], *keys: str) -> list[str]:
    values: list[str] = []
    for key in keys:
        for text in _text_list(row.get(_normalize_key(key))):
            if text not in values:
                values.append(text)
    return values


def _normalize_level_label(value: str | None) -> str | None:
    text = _first_text(value)
    if not text:
        return None

    cleaned = re.sub(r"\s+", " ", text.upper()).strip()
    cleaned = cleaned.replace("TRKI", "").strip()

    match = re.search(r"\b([ABC][12])\b", cleaned)
    if match:
        return f"TRKI {match.group(1)}"

    return text


def _level_rank(value: str | None) -> int:
    label = _normalize_level_label(value)
    if not label:
        return len(RUSSIAN_LEVEL_PRIORITY)
    for candidate in RUSSIAN_LEVEL_PRIORITY:
        if candidate in label.upper():
            return RUSSIAN_LEVEL_PRIORITY[candidate]
    return len(RUSSIAN_LEVEL_PRIORITY)


def _parse_json_items(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]

    if not isinstance(payload, dict):
        return []

    for key in ("items", "results", "records", "data", "rows"):
        value = payload.get(key)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]

    if isinstance(payload.get("channel"), dict) and isinstance(payload["channel"].get("item"), list):
        return [item for item in payload["channel"]["item"] if isinstance(item, dict)]

    return []


def _canonical_record_from_map(row: dict[str, Any]) -> dict[str, Any] | None:
    surface_form = _pick_text(row, "lemma", "surface_form", "word", "headword", "term")
    if not surface_form:
        return None

    lemma = _pick_text(row, "lemma", "headword", "word", "surface_form", "term") or surface_form
    pronunciation = _pick_text(row, "pronunciation", "transcription", "romanization", "reading", "stress")
    level = _normalize_level_label(_pick_text(row, "trki_level", "level", "cefr", "word_grade", "proficiency_level"))
    part_of_speech = _pick_text(row, "part_of_speech", "pos", "gramm", "grammar")
    definitions = _collect_text_values(row, "definition", "definitions", "gloss", "meaning", "english")
    frequency_rank = _safe_int(_pick_text(row, "frequency_rank", "rank", "freq_rank", "order"))
    frequency_score = _safe_float(_pick_text(row, "ipm", "frequency", "count", "occurrences"))

    return {
        "surface_form": surface_form,
        "lemma": lemma,
        "pronunciation": pronunciation,
        "level": level,
        "part_of_speech": part_of_speech,
        "definitions": definitions,
        "frequency_rank": frequency_rank,
        "frequency_score": frequency_score,
    }


def _parse_csv_items(csv_text: str) -> list[dict[str, Any]]:
    sample = csv_text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
    except csv.Error:
        dialect = csv.get_dialect("excel")

    reader = csv.DictReader(csv_text.splitlines(), dialect=dialect)
    records: list[dict[str, Any]] = []
    for raw_row in reader:
        record = _canonical_record_from_map(_normalized_row_map(raw_row))
        if record:
            records.append(record)
    return records


def parse_russian_lexicon_export(source_path: Path) -> list[dict[str, Any]]:
    text = source_path.read_text(encoding="utf-8-sig")
    stripped = text.lstrip()

    if source_path.suffix.lower() == ".jsonl":
        records: list[dict[str, Any]] = []
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            payload = json.loads(line)
            for item in _parse_json_items(payload) or ([payload] if isinstance(payload, dict) else []):
                record = _canonical_record_from_map(_normalized_row_map(item))
                if record:
                    records.append(record)
        return records

    if source_path.suffix.lower() == ".json" or stripped.startswith("{") or stripped.startswith("["):
        payload = json.loads(text)
        records = []
        for item in _parse_json_items(payload):
            record = _canonical_record_from_map(_normalized_row_map(item))
            if record:
                records.append(record)
        return records

    return _parse_csv_items(text)


def _priority_key(record: dict[str, Any]) -> tuple[int, int, int, float, int, str]:
    frequency_rank = record.get("frequency_rank")
    frequency_score = record.get("frequency_score")
    definitions = record.get("definitions") or []
    return (
        _level_rank(record.get("level")),
        frequency_rank if frequency_rank is not None else 10**9,
        0 if frequency_score is not None else 1,
        -(frequency_score if frequency_score is not None else 0.0),
        0 if definitions else 1,
        str(record.get("surface_form") or "").casefold(),
    )


def _merge_part_of_speech(existing: str | None, new_value: str | None) -> str | None:
    if not existing:
        return new_value
    if not new_value or new_value == existing:
        return existing
    merged = [item.strip() for item in existing.split(",") if item.strip()]
    if new_value not in merged:
        merged.append(new_value)
    return ", ".join(merged)


def build_russian_lexicon_rows(
    records: list[dict[str, Any]],
    *,
    source_name: str,
    source_path: str,
    max_rows: int | None = None,
) -> list[dict[str, str]]:
    grouped: "OrderedDict[str, dict[str, Any]]" = OrderedDict()

    for record in sorted(records, key=_priority_key):
        surface_form = _first_text(record.get("lemma") or record.get("surface_form"))
        if not surface_form:
            continue

        key = surface_form.casefold()
        existing = grouped.get(key)
        if existing is None:
            grouped[key] = {
                "surface_form": surface_form,
                "lemma": surface_form,
                "pronunciation": _first_text(record.get("pronunciation")),
                "level": _normalize_level_label(_first_text(record.get("level"))),
                "part_of_speech": _first_text(record.get("part_of_speech")),
                "definitions": list(record.get("definitions") or []),
                "frequency_rank": record.get("frequency_rank"),
                "frequency_score": record.get("frequency_score"),
                "source_name": source_name,
                "source_path": source_path,
            }
            continue

        if not existing.get("lemma"):
            existing["lemma"] = surface_form
        if not existing.get("pronunciation"):
            existing["pronunciation"] = _first_text(record.get("pronunciation"))

        incoming_level = _normalize_level_label(_first_text(record.get("level")))
        if incoming_level and _level_rank(incoming_level) < _level_rank(existing.get("level")):
            existing["level"] = incoming_level

        existing["part_of_speech"] = _merge_part_of_speech(existing.get("part_of_speech"), _first_text(record.get("part_of_speech")))

        for definition in record.get("definitions") or []:
            if definition not in existing["definitions"]:
                existing["definitions"].append(definition)

        incoming_frequency_rank = record.get("frequency_rank")
        if incoming_frequency_rank is not None and (
            existing.get("frequency_rank") is None or incoming_frequency_rank < existing["frequency_rank"]
        ):
            existing["frequency_rank"] = incoming_frequency_rank

        incoming_frequency_score = record.get("frequency_score")
        if incoming_frequency_score is not None and (
            existing.get("frequency_score") is None or incoming_frequency_score > existing["frequency_score"]
        ):
            existing["frequency_score"] = incoming_frequency_score

    rows: list[dict[str, str]] = []
    for index, entry in enumerate(grouped.values(), start=1):
        if max_rows is not None and index > max_rows:
            break

        level = _first_text(entry.get("level"))
        note_parts = [f"Source: {entry['source_name']}"]
        if level:
            note_parts.append(f"level={level}")
        if entry.get("part_of_speech"):
            note_parts.append(f"pos={entry['part_of_speech']}")
        if entry.get("frequency_rank") is not None:
            note_parts.append(f"rank={entry['frequency_rank']}")
        if entry.get("frequency_score") is not None:
            note_parts.append(f"score={entry['frequency_score']}")

        rows.append(
            {
                "surface_form": entry["surface_form"],
                "entry_type": "word",
                "pinyin": entry.get("pronunciation") or "",
                "tone": "",
                "definition": "; ".join(entry.get("definitions") or []),
                "radical": "",
                "stroke_count": "",
                "hsk_level": level or "",
                "frequency_rank": str(index),
                "note": "; ".join(note_parts),
            }
        )

    return rows


def write_russian_lexicon_csv(
    source_path: Path,
    output_path: Path,
    *,
    max_rows: int | None = None,
) -> list[dict[str, str]]:
    records = parse_russian_lexicon_export(source_path)
    rows = build_russian_lexicon_rows(
        records,
        source_name=source_path.name,
        source_path=str(source_path),
        max_rows=max_rows,
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=RUSSIAN_LEXICON_CSV_HEADER)
        writer.writeheader()
        writer.writerows(rows)
    return rows
