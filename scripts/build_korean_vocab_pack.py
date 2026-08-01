from __future__ import annotations

import argparse
import csv
from collections import defaultdict
from pathlib import Path


LEXICON_HEADER = [
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


def clean_text(value: str | None) -> str:
    if value is None:
        return ""
    return str(value).strip()


def parse_int(value: str | None) -> int | None:
    text = clean_text(value)
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def load_staging_rows(source_path: Path) -> list[dict[str, str]]:
    with source_path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = []
        for row in reader:
            rows.append(
                {
                    "source_row": clean_text(row.get("source_row")),
                    "frequency_rank": clean_text(row.get("frequency_rank")),
                    "complexity": clean_text(row.get("complexity")),
                    "word": clean_text(row.get("word")),
                    "romanized": clean_text(row.get("romanized")),
                    "pos_ko": clean_text(row.get("pos_ko")),
                    "classification": clean_text(row.get("classification")),
                    "hanja_ref": clean_text(row.get("hanja_ref")),
                    "english": clean_text(row.get("english")),
                    "note": clean_text(row.get("note")),
                    "word_group_size": clean_text(row.get("word_group_size")),
                    "word_group_index": clean_text(row.get("word_group_index")),
                    "review_flags": clean_text(row.get("review_flags")),
                }
            )
    return rows


def build_pack_rows(staging_rows: list[dict[str, str]]) -> list[dict[str, str]]:
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in staging_rows:
        if row["word"]:
            grouped[row["word"]].append(row)

    pack_rows: list[dict[str, str]] = []
    for word, rows in grouped.items():
        ordered_rows = sorted(
            rows,
            key=lambda row: (
                parse_int(row.get("frequency_rank")) if parse_int(row.get("frequency_rank")) is not None else 10**9,
                parse_int(row.get("source_row")) if parse_int(row.get("source_row")) is not None else 10**9,
            ),
        )
        primary = ordered_rows[0]
        frequency_rank = parse_int(primary.get("frequency_rank"))
        complexity = primary.get("complexity")
        romanized = primary.get("romanized")

        definitions: list[str] = []
        for row in ordered_rows:
            english = row.get("english")
            if english and english not in definitions:
                definitions.append(english)

        source_rows = [row.get("source_row", "") for row in ordered_rows if row.get("source_row")]
        if len(source_rows) > 5:
            source_rows_text = ", ".join(source_rows[:5]) + f" (+{len(source_rows) - 5} more)"
        else:
            source_rows_text = ", ".join(source_rows)

        source_complexities = []
        for row in ordered_rows:
            value = row.get("complexity")
            if value and value not in source_complexities:
                source_complexities.append(value)

        pos_tags = []
        for row in ordered_rows:
            value = row.get("pos_ko")
            if value and value not in pos_tags:
                pos_tags.append(value)

        classification_tags = []
        for row in ordered_rows:
            value = row.get("classification")
            if value and value not in classification_tags:
                classification_tags.append(value)

        hanja_refs = []
        for row in ordered_rows:
            value = row.get("hanja_ref")
            if value and value not in hanja_refs:
                hanja_refs.append(value)

        note_parts = [f"Source: Korean vocabulary list 6000 TOPIK final release v1.xlsx", f"source_rows={source_rows_text}"]
        if source_complexities:
            note_parts.append("source_complexity=" + ", ".join(source_complexities))
        if pos_tags:
            note_parts.append("pos=" + ", ".join(pos_tags))
        if classification_tags:
            note_parts.append("classification=" + ", ".join(classification_tags))
        if hanja_refs:
            note_parts.append("hanja_ref=" + ", ".join(hanja_refs))
        note_parts.append(f"senses={len(definitions)}")

        pack_rows.append(
            {
                "surface_form": word,
                "entry_type": "word",
                "pinyin": romanized,
                "tone": "",
                "definition": "; ".join(definitions),
                "radical": "",
                "stroke_count": "",
                "hsk_level": complexity,
                "frequency_rank": str(frequency_rank) if frequency_rank is not None else "",
                "note": "; ".join(note_parts),
            }
        )

    pack_rows.sort(
        key=lambda row: (
            parse_int(row.get("frequency_rank")) if parse_int(row.get("frequency_rank")) is not None else 10**9,
            row.get("surface_form", ""),
        )
    )
    return pack_rows


def write_pack_csv(rows: list[dict[str, str]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=LEXICON_HEADER)
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the canonical Korean lexicon CSV from the staged workbook extract.")
    parser.add_argument(
        "--source",
        type=Path,
        default=Path("resources/lexicon/korean/staging/korean_vocab_6000.cleaned.csv"),
        help="Path to the staged Korean workbook CSV.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("resources/lexicon/korean/lexicon.csv"),
        help="Path for the canonical Korean lexicon CSV.",
    )
    args = parser.parse_args()

    if not args.source.exists():
        parser.error(f"Staging CSV not found: {args.source}")

    staging_rows = load_staging_rows(args.source)
    pack_rows = build_pack_rows(staging_rows)
    write_pack_csv(pack_rows, args.output)
    print(f"Wrote {len(pack_rows)} Korean lexicon rows to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
