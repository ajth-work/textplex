from __future__ import annotations

import argparse
import csv
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path


NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

SOURCE_FIELDS = {
    "frequency_rank": "B",
    "complexity": "C",
    "word": "D",
    "romanized": "E",
    "pos_ko": "F",
    "classification": "G",
    "hanja_ref": "H",
    "english": "I",
    "note": "N",
}

OUTPUT_FIELDS = [
    "source_row",
    "frequency_rank",
    "complexity",
    "word",
    "romanized",
    "pos_ko",
    "classification",
    "hanja_ref",
    "english",
    "note",
    "word_group_size",
    "word_group_index",
    "review_flags",
]


def clean_text(value: str | None) -> str:
    if value is None:
        return ""
    return str(value).replace("\u00a0", " ").strip()


def column_letters(cell_ref: str) -> str:
    match = re.match(r"([A-Z]+)", cell_ref)
    return match.group(1) if match else ""


def load_shared_strings(zip_file: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in zip_file.namelist():
        return []

    root = ET.fromstring(zip_file.read("xl/sharedStrings.xml"))
    shared_strings: list[str] = []
    for si in root.findall("main:si", NS):
        texts = [text_node.text or "" for text_node in si.findall(".//main:t", NS)]
        shared_strings.append("".join(texts))
    return shared_strings


def read_sheet_rows(zip_file: zipfile.ZipFile, sheet_name: str) -> tuple[list[str], list[dict[str, str]]]:
    workbook = ET.fromstring(zip_file.read("xl/workbook.xml"))
    relationships = ET.fromstring(zip_file.read("xl/_rels/workbook.xml.rels"))
    rel_map = {rel.attrib["Id"]: rel.attrib["Target"] for rel in relationships}
    shared_strings = load_shared_strings(zip_file)

    sheet_target = None
    for sheet in workbook.find("main:sheets", NS) or []:
        if sheet.attrib.get("name") == sheet_name:
            rel_id = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
            sheet_target = rel_map.get(rel_id)
            break

    if not sheet_target:
        raise ValueError(f"Sheet not found: {sheet_name}")

    root = ET.fromstring(zip_file.read(f"xl/{sheet_target}"))
    header_row: dict[str, str] = {}
    rows: list[dict[str, str]] = []

    for row in root.findall(".//main:row", NS):
        row_number = int(row.attrib.get("r", "0"))
        cells: dict[str, str] = {}
        for cell in row.findall("main:c", NS):
            ref = cell.attrib.get("r", "")
            column = column_letters(ref)
            cell_type = cell.attrib.get("t")
            value_node = cell.find("main:v", NS)
            inline_node = cell.find("main:is", NS)
            text = ""
            if cell_type == "s" and value_node is not None and value_node.text is not None:
                shared_index = int(value_node.text)
                text = shared_strings[shared_index] if 0 <= shared_index < len(shared_strings) else ""
            elif cell_type == "inlineStr" and inline_node is not None:
                text = "".join(text_node.text or "" for text_node in inline_node.findall(".//main:t", NS))
            elif value_node is not None and value_node.text is not None:
                text = value_node.text
            cells[column] = clean_text(text)

        if row_number == 1:
            header_row = cells
            continue

        if not cells.get("D"):
            continue

        rows.append(
            {
                "source_row": str(row_number),
                **{field: cells.get(column, "") for field, column in SOURCE_FIELDS.items()},
            }
        )

    return [header_row.get(column, "") for column in sorted(header_row)], rows


def build_review_flags(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    word_counts = Counter(row["word"] for row in rows)
    grouped_indices: dict[str, int] = defaultdict(int)

    for row in rows:
        word = row["word"]
        grouped_indices[word] += 1
        flags: list[str] = []

        if word_counts[word] > 1:
            flags.append("surface_duplicate")
        if not row["romanized"]:
            flags.append("missing_romanized")
        if not row["english"]:
            flags.append("missing_english")
        if not row["pos_ko"]:
            flags.append("missing_pos")
        if not row["classification"]:
            flags.append("missing_classification")

        row["word_group_size"] = str(word_counts[word])
        row["word_group_index"] = str(grouped_indices[word])
        row["review_flags"] = ";".join(flags)

    return rows


def write_csv(rows: list[dict[str, str]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def write_report(
    *,
    workbook_path: Path,
    sheet_name: str,
    header_values: list[str],
    rows: list[dict[str, str]],
    report_path: Path,
) -> None:
    word_counts = Counter(row["word"] for row in rows)
    duplicates = [(word, count) for word, count in word_counts.most_common() if count > 1]
    missing_romanized = sum(1 for row in rows if not row["romanized"])
    missing_english = sum(1 for row in rows if not row["english"])
    missing_pos = sum(1 for row in rows if not row["pos_ko"])
    missing_classification = sum(1 for row in rows if not row["classification"])
    exact_rows = Counter(
        (
            row["word"],
            row["romanized"],
            row["pos_ko"],
            row["classification"],
            row["hanja_ref"],
            row["english"],
        )
        for row in rows
    )
    exact_duplicates = sum(1 for count in exact_rows.values() if count > 1)

    lines = [
        "# Korean Vocabulary Workbook Cleanup",
        "",
        f"- Source workbook: `{workbook_path}`",
        f"- Sheet inspected: `{sheet_name}`",
        f"- Header cells: {', '.join(filter(None, header_values[:10]))}",
        f"- Data rows: {len(rows)}",
        f"- Unique surface forms: {len(word_counts)}",
        f"- Surface-form duplicates: {len(duplicates)} groups",
        f"- Exact duplicate rows: {exact_duplicates}",
        f"- Missing romanized: {missing_romanized}",
        f"- Missing English gloss: {missing_english}",
        f"- Missing POS: {missing_pos}",
        f"- Missing classification: {missing_classification}",
        "",
        "## Duplicate Surface Forms",
    ]

    for word, count in duplicates[:25]:
        lines.append(f"- `{word}` x{count}")

    lines.extend(
        [
            "",
            "## Cleanup Guidance",
            "",
            "- Keep the `word` column as the canonical Hangul headword.",
            "- Treat repeated surface forms as separate senses or parts of speech until they are manually merged.",
            "- Use `review_flags` to spot rows that need human review before pack import.",
            "- Do not map `Complexity` to TOPIK yet; keep it as source metadata until the priority scheme is finalized.",
            "",
            "## Next Step",
            "",
            "Feed the staging CSV into the Korean pack selection pass, then choose which duplicate groups should merge and which should remain separate lexical entries.",
            "",
        ]
    )

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalize the Korean vocabulary workbook into reviewable staging files.")
    parser.add_argument("--source", type=Path, required=True, help="Path to the source .xlsx workbook.")
    parser.add_argument("--sheet", default="list", help="Workbook sheet to inspect.")
    parser.add_argument("--output-csv", type=Path, required=True, help="Path for the normalized staging CSV.")
    parser.add_argument("--output-report", type=Path, required=True, help="Path for the cleanup markdown report.")
    args = parser.parse_args()

    if not args.source.exists():
        parser.error(f"Source workbook not found: {args.source}")

    with zipfile.ZipFile(args.source) as zip_file:
        header_values, rows = read_sheet_rows(zip_file, args.sheet)

    rows = build_review_flags(rows)
    write_csv(rows, args.output_csv)
    write_report(
        workbook_path=args.source,
        sheet_name=args.sheet,
        header_values=header_values,
        rows=rows,
        report_path=args.output_report,
    )

    print(f"Wrote {len(rows)} staging rows to {args.output_csv}")
    print(f"Wrote cleanup report to {args.output_report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
