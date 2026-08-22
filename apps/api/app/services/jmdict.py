from __future__ import annotations

import gzip
import hashlib
import json
import sqlite3
from collections import defaultdict
from contextlib import closing
from pathlib import Path
from typing import BinaryIO
from xml.etree import ElementTree as ET

from app.schemas.lexicon import JmdictImportSummary
from app.services.lexicon import ensure_lexicon_database

JMdict_E_DOWNLOAD_URL = "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz"
JMdict_LICENSE_URL = "https://kanjixml.sourceforge.net/kanjidicLicense.html"
JMdict_ATTRIBUTION = (
    "Japanese dictionary data derived from JMdict, maintained by the Electronic Dictionary "
    "Research and Development Group (EDRDG), used under the EDRDG dictionary licence."
)

_POS_LABELS = {
    "&adj-f;": "Adjective (na)",
    "&adj-i;": "I-adjective",
    "&adj-ix;": "I-adjective (yoi/ii class)",
    "&adj-kari;": "Adjective (kari)",
    "&adj-ku;": "Adjective (ku)",
    "&adj-na;": "Na-adjective",
    "&adj-nari;": "Adjective (nari)",
    "&adj-no;": "No-adjective",
    "&adj-pn;": "Prenominal adjective",
    "&adj-shiku;": "Adjective (shiku)",
    "&adj-t;": "Taru-adjective",
    "&adv;": "Adverb",
    "&aux;": "Auxiliary",
    "&aux-adj;": "Auxiliary adjective",
    "&aux-v;": "Auxiliary verb",
    "&conj;": "Conjunction",
    "&cop;": "Copula",
    "&ctr;": "Counter",
    "&exp;": "Expression",
    "&int;": "Interjection",
    "&n;": "Noun",
    "&n-adv;": "Noun (adverbial)",
    "&n-pr;": "Proper noun",
    "&n-pref;": "Noun (prefix)",
    "&n-suf;": "Noun (suffix)",
    "&n-t;": "Noun (temporal)",
    "&num;": "Numeric",
    "&pn;": "Pronoun",
    "&pref;": "Prefix",
    "&prt;": "Particle",
    "&suf;": "Suffix",
    "&v1;": "Ichidan verb",
    "&v2a-s;": "Nidan verb",
    "&v4;": "Yodan verb",
    "&v5;": "Godan verb",
    "&v5aru;": "Godan verb - aru special class",
    "&v5b;": "Godan verb - bu ending",
    "&v5g;": "Godan verb - gu ending",
    "&v5k;": "Godan verb - ku ending",
    "&v5k-s;": "Godan verb - iku/yuku special class",
    "&v5m;": "Godan verb - mu ending",
    "&v5n;": "Godan verb - nu ending",
    "&v5r;": "Godan verb - ru ending",
    "&v5r-i;": "Godan verb - iru special class",
    "&v5s;": "Godan verb - su ending",
    "&v5t;": "Godan verb - tsu ending",
    "&v5u;": "Godan verb - u ending",
    "&v5u-s;": "Godan verb - uru special class",
    "&v5z;": "Godan verb - zu ending",
    "&v-unspec;": "Verb (unspecified)",
    "&v-k;": "Kuru verb",
    "&v-s;": "Suru verb",
    "&v zuru;": "Zuru verb",
}


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _children(element: ET.Element, name: str) -> list[ET.Element]:
    return [child for child in list(element) if _local_name(child.tag) == name]


def _child_text(element: ET.Element, name: str) -> str | None:
    for child in _children(element, name):
        text = (child.text or "").strip()
        if text:
            return text
    return None


def _pos_label(value: str) -> str:
    normalized = value.strip()
    if normalized in _POS_LABELS:
        return _POS_LABELS[normalized]
    alias = normalized.lower().removeprefix("&").removesuffix(";")
    return {
        "noun": "Noun",
        "particle": "Particle",
        "adverb": "Adverb",
        "pronoun": "Pronoun",
        "verb": "Verb",
        "adjective": "Adjective",
        "conjunction": "Conjunction",
        "expression": "Expression",
    }.get(alias, normalized.removeprefix("&").removesuffix(";"))


def _open_source(path: Path) -> BinaryIO:
    return gzip.open(path, "rb") if path.suffix.lower() == ".gz" else path.open("rb")


def _entry_projection(entry: ET.Element) -> tuple[int, dict[str, dict[str, set[str]]]]:
    sequence_text = _child_text(entry, "ent_seq")
    if not sequence_text or not sequence_text.isdigit():
        raise ValueError("JMdict entry is missing a numeric ent_seq")
    ent_seq = int(sequence_text)
    kanji_forms = [text for child in _children(entry, "k_ele") if (text := _child_text(child, "keb"))]
    reading_elements = _children(entry, "r_ele")
    reading_values = [text for child in reading_elements if (text := _child_text(child, "reb"))]
    surfaces = list(dict.fromkeys([*kanji_forms, *reading_values]))

    senses = _children(entry, "sense")
    definitions: set[str] = set()
    parts_of_speech: set[str] = set()
    for sense in senses:
        parts_of_speech.update(_pos_label(text) for child in _children(sense, "pos") if (text := (child.text or "").strip()))
        for gloss in _children(sense, "gloss"):
            language = gloss.attrib.get("{http://www.w3.org/XML/1998/namespace}lang", "eng")
            if language in {"eng", "en"} and (text := (gloss.text or "").strip()):
                definitions.add(text)

    projection: dict[str, dict[str, set[str]]] = defaultdict(lambda: {"readings": set(), "definitions": set(), "pos": set(), "external_ids": set()})
    for surface in surfaces:
        allowed_readings = reading_values
        for reading_element in reading_elements:
            restrictions = {child.text.strip() for child in _children(reading_element, "re_restr") if child.text and child.text.strip()}
            reading = _child_text(reading_element, "reb")
            if reading and (not restrictions or surface in restrictions):
                allowed_readings = [reading]
                break
        projection[surface]["readings"].update(allowed_readings)
        projection[surface]["definitions"].update(definitions)
        projection[surface]["pos"].update(parts_of_speech)
        projection[surface]["external_ids"].add(str(ent_seq))
    return ent_seq, projection


def import_jmdict(
    source_path: str | Path,
    *,
    data_root: Path,
    source_version: str,
    replace_existing: bool = True,
    source_url: str = JMdict_E_DOWNLOAD_URL,
) -> JmdictImportSummary:
    """Import a pinned JMdict XML/XML.GZ snapshot and its attribution metadata."""
    resolved_path = Path(source_path).expanduser().resolve()
    if not resolved_path.is_file():
        raise FileNotFoundError(f"JMdict source file does not exist: {resolved_path}")
    checksum = hashlib.sha256(resolved_path.read_bytes()).hexdigest()
    source_key = f"jmdict:{source_version}"
    db_path = ensure_lexicon_database(data_root)
    projection: dict[str, dict[str, set[str]]] = defaultdict(lambda: {"readings": set(), "definitions": set(), "pos": set(), "external_ids": set()})
    entry_payloads: list[tuple[int, str]] = []
    entry_count = 0
    with _open_source(resolved_path) as source_handle:
        for _event, element in ET.iterparse(source_handle, events=("end",)):
            if _local_name(element.tag) != "entry":
                continue
            ent_seq, entry_projection = _entry_projection(element)
            entry_count += 1
            entry_payloads.append((ent_seq, ET.tostring(element, encoding="unicode")))
            for surface, values in entry_projection.items():
                for key in ("readings", "definitions", "pos", "external_ids"):
                    projection[surface][key].update(values[key])
            element.clear()

    with closing(sqlite3.connect(db_path)) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.row_factory = sqlite3.Row
        connection.execute(
            """
            INSERT INTO lexicon_sources (
                source_key, display_name, version, source_url, license_url,
                checksum_sha256, attribution_text, retrieved_at, source_path
            ) VALUES (?, 'JMdict', ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(source_key) DO UPDATE SET
                version = excluded.version,
                source_url = excluded.source_url,
                license_url = excluded.license_url,
                checksum_sha256 = excluded.checksum_sha256,
                attribution_text = excluded.attribution_text,
                retrieved_at = excluded.retrieved_at,
                source_path = excluded.source_path
            """,
            (source_key, source_version, source_url, JMdict_LICENSE_URL, checksum, JMdict_ATTRIBUTION, _utc_now(), str(resolved_path)),
        )
        source_row = connection.execute("SELECT id FROM lexicon_sources WHERE source_key = ?", (source_key,)).fetchone()
        if source_row is None:
            raise RuntimeError("Could not register the JMdict source provenance record")
        source_id = int(source_row["id"])
        if replace_existing:
            connection.execute("DELETE FROM lexicon_entries WHERE entry_type = 'jmdict'")
            connection.execute("DELETE FROM jmdict_entries WHERE source_id = ?", (source_id,))
        connection.executemany(
            "INSERT OR REPLACE INTO jmdict_entries (source_id, ent_seq, payload_json) VALUES (?, ?, ?)",
            [(source_id, ent_seq, json.dumps({"xml": payload}, ensure_ascii=False)) for ent_seq, payload in entry_payloads],
        )
        connection.executemany(
            """
            INSERT INTO lexicon_entries (
                language_code, entry_type, surface_form, reading, part_of_speech,
                external_id, source_id, source_version, definition, source_name, source_path, created_at
            ) VALUES ('ja', 'jmdict', ?, ?, ?, ?, ?, ?, ?, 'JMdict', ?, ?)
            ON CONFLICT(language_code, entry_type, surface_form) DO UPDATE SET
                reading = excluded.reading,
                part_of_speech = excluded.part_of_speech,
                external_id = excluded.external_id,
                source_id = excluded.source_id,
                source_version = excluded.source_version,
                definition = excluded.definition,
                source_name = excluded.source_name,
                source_path = excluded.source_path
            """,
            [
                (
                    surface,
                    "; ".join(sorted(values["readings"])),
                    "; ".join(sorted(values["pos"])),
                    ",".join(sorted(values["external_ids"], key=int)),
                    source_id,
                    source_version,
                    "; ".join(sorted(values["definitions"])),
                    str(resolved_path),
                    _utc_now(),
                )
                for surface, values in projection.items()
            ],
        )
        connection.commit()

    return JmdictImportSummary(
        database_path=str(db_path),
        source_path=str(resolved_path),
        source_version=source_version,
        source_id=source_id,
        entry_count=entry_count,
        projected_rows=len(projection),
        checksum_sha256=checksum,
    )


def _utc_now() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
