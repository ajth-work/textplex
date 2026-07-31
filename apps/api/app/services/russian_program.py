from __future__ import annotations

import csv
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.paths import get_lexicon_source_root
from app.schemas.russian_program import RussianProgramItem, RussianProgramLevel, RussianProgramResponse


def _read_json_file(source_path: Path) -> dict[str, Any]:
    return json.loads(source_path.read_text(encoding="utf-8"))


def _read_russian_lexicon_rows(source_root: Path) -> dict[str, dict[str, str]]:
    rows: dict[str, dict[str, str]] = {}
    for filename in ("lexicon.csv", "lexicon.override.csv"):
        lexicon_path = source_root / filename
        if not lexicon_path.exists():
            continue
        with lexicon_path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            for raw_row in reader:
                surface_form = (raw_row.get("surface_form") or "").strip()
                if not surface_form:
                    continue
                rows.setdefault(surface_form.casefold(), raw_row)
    return rows


@lru_cache(maxsize=1)
def _cached_russian_program_manifest() -> dict[str, Any]:
    program_path = get_lexicon_source_root("ru") / "program.levels.json"
    if not program_path.exists():
        raise FileNotFoundError(f"Russian program manifest not found: {program_path}")
    return _read_json_file(program_path)


@lru_cache(maxsize=1)
def _cached_russian_lexicon_rows() -> dict[str, dict[str, str]]:
    source_root = get_lexicon_source_root("ru")
    return _read_russian_lexicon_rows(source_root)


def _program_item_from_row(row: dict[str, str]) -> RussianProgramItem:
    surface_form = (row.get("surface_form") or "").strip()
    if not surface_form:
        raise ValueError("Russian program items require a surface form.")

    frequency_rank_text = (row.get("frequency_rank") or "").strip()
    frequency_rank = int(frequency_rank_text) if frequency_rank_text.isdigit() else None
    return RussianProgramItem(
        lemma=surface_form,
        surface_form=surface_form,
        transliteration=(row.get("pinyin") or "").strip() or None,
        definition=(row.get("definition") or "").strip() or None,
        frequency_rank=frequency_rank,
        source_name="RU5000 v0.1",
        source_path=str(get_lexicon_source_root("ru") / "lexicon.csv"),
        source_note=(row.get("note") or "").strip() or None,
    )


def get_russian_program() -> RussianProgramResponse:
    manifest = _cached_russian_program_manifest()
    lexicon_rows = _cached_russian_lexicon_rows()

    levels: list[RussianProgramLevel] = []
    for level_data in manifest.get("levels", []):
        if not isinstance(level_data, dict):
            continue

        lemmas = [lemma.strip() for lemma in level_data.get("lemmas", []) if isinstance(lemma, str) and lemma.strip()]
        items: list[RussianProgramItem] = []
        for lemma in lemmas:
            row = lexicon_rows.get(lemma.casefold())
            if row is None:
                raise KeyError(f"Russian program lemma missing from bundled lexicon: {lemma}")
            items.append(_program_item_from_row(row))

        items.sort(key=lambda item: (item.frequency_rank is None, item.frequency_rank or 10**9, item.lemma.casefold()))
        levels.append(
            RussianProgramLevel(
                level=int(level_data.get("level") or 0),
                title=str(level_data.get("title") or f"Level {level_data.get('level') or ''}"),
                focus=str(level_data.get("focus") or ""),
                selection_rule=str(level_data.get("selection_rule") or ""),
                is_active=bool(level_data.get("is_active")),
                item_count=len(items),
                items=items,
            )
        )

    return RussianProgramResponse(
        title=str(manifest.get("title") or "Russian learning program"),
        track_code=str(manifest.get("track_code") or "trki"),
        track_label=str(manifest.get("track_label") or "TRKI"),
        source_pack=str(manifest.get("source_pack") or "RU5000 v0.1"),
        selection_rule=str(manifest.get("selection_rule") or ""),
        levels=levels,
    )
