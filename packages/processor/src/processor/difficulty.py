from __future__ import annotations

import math
import re
from collections import Counter
from statistics import mean
from typing import Mapping, Sequence

from .contracts import BookExtractionResult


_HSK_NUMBER_RE = re.compile(r"(?<!\d)(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?(?!\d)")


def parse_hsk_level(value: object) -> float | None:
    """Return a numeric HSK value, including the midpoint of a 7-9 band."""
    if value is None:
        return None
    match = _HSK_NUMBER_RE.search(str(value).strip())
    if not match:
        return None
    first = float(match.group(1))
    second = float(match.group(2)) if match.group(2) else first
    level = (first + second) / 2
    return level if 1 <= level <= 9 and math.isfinite(level) else None


def is_hanzi(character: str) -> bool:
    codepoint = ord(character)
    return (
        0x3400 <= codepoint <= 0x4DBF
        or 0x4E00 <= codepoint <= 0x9FFF
        or 0xF900 <= codepoint <= 0xFAFF
    )


def format_hsk_level(level: float | None) -> str | None:
    if level is None:
        return None
    rounded = round(level, 1)
    return f"HSK {int(rounded)}" if rounded.is_integer() else f"HSK {rounded:.1f}"


def _level_bucket(level: float) -> str:
    if level <= 6:
        return f"HSK {int(round(level))}"
    return "HSK 7-9"


def _empty_metrics(status: str) -> dict[str, object]:
    return {
        "metric_status": status,
        "assessment_system": "HSK" if status != "unsupported" else None,
        "text_expected_level": None,
        "text_expected_level_label": None,
        "sentence_average_level": None,
        "page_average_level": None,
        "character_weighted_average_level": None,
        "eligible_character_count": 0,
        "known_character_count": 0,
        "unknown_character_count": 0,
        "chinese_word_occurrences": 0,
        "unknown_word_occurrences": 0,
        "partial_word_occurrences": 0,
        "sentence_count_with_level": 0,
        "page_count_with_level": 0,
        "distribution": [],
        "comprehension_status": "not_available",
        "estimated_comprehension_percent": None,
        "recommendation": "Import a supported lexicon to calculate an expected reading level.",
    }


def calculate_book_hsk_metrics(
    extraction: BookExtractionResult,
    character_levels: Mapping[str, Sequence[object]],
) -> dict[str, object]:
    """Calculate occurrence-weighted HSK metrics from Chinese character evidence.

    Unknown Hanzi are excluded from numeric averages but remain visible in the
    coverage counts. Character evidence takes precedence over word-level HSK
    labels so multi-character forms cannot hide uneven character difficulty.
    """
    if extraction.language_code.split("-", 1)[0].lower() != "zh":
        return _empty_metrics("unsupported")

    metrics = _empty_metrics("no_evidence")
    all_levels: list[float] = []
    sentence_levels: list[float] = []
    page_levels: list[float] = []
    distribution: Counter[str] = Counter()

    for page in extraction.pages:
        current_page_sentence_levels: list[float] = []
        for sentence in page.sentences:
            current_sentence_levels: list[float] = []
            sentence_has_known = False
            for token in sentence.tokens:
                characters = [character for character in token.surface_form if is_hanzi(character)]
                if not characters:
                    continue
                metrics["chinese_word_occurrences"] = int(metrics["chinese_word_occurrences"]) + 1
                token_levels: list[float] = []
                token_has_unknown = False
                for character in characters:
                    metrics["eligible_character_count"] = int(metrics["eligible_character_count"]) + 1
                    parsed_levels = [
                        parsed
                        for value in character_levels.get(character, [])
                        if (parsed := parse_hsk_level(value)) is not None
                    ]
                    if not parsed_levels:
                        metrics["unknown_character_count"] = int(metrics["unknown_character_count"]) + 1
                        token_has_unknown = True
                        continue
                    level = min(parsed_levels)
                    token_levels.append(level)
                    current_sentence_levels.append(level)
                    all_levels.append(level)
                    distribution[_level_bucket(level)] += 1
                    metrics["known_character_count"] = int(metrics["known_character_count"]) + 1
                    sentence_has_known = True

                if not token_levels:
                    metrics["unknown_word_occurrences"] = int(metrics["unknown_word_occurrences"]) + 1
                elif token_has_unknown:
                    metrics["partial_word_occurrences"] = int(metrics["partial_word_occurrences"]) + 1

            if current_sentence_levels:
                sentence_level = mean(current_sentence_levels)
                sentence_levels.append(sentence_level)
                current_page_sentence_levels.append(sentence_level)
                if sentence_has_known:
                    metrics["sentence_count_with_level"] = int(metrics["sentence_count_with_level"]) + 1

        if current_page_sentence_levels:
            page_levels.append(mean(current_page_sentence_levels))
            metrics["page_count_with_level"] = int(metrics["page_count_with_level"]) + 1

    if not all_levels:
        return metrics

    expected_level = mean(sentence_levels) if sentence_levels else None
    metrics.update(
        {
            "metric_status": "ready",
            "text_expected_level": expected_level,
            "text_expected_level_label": format_hsk_level(expected_level),
            "sentence_average_level": mean(sentence_levels) if sentence_levels else None,
            "page_average_level": mean(page_levels) if page_levels else None,
            "character_weighted_average_level": mean(all_levels),
            "distribution": [
                {
                    "label": label,
                    "character_occurrences": count,
                    "percentage": round(count / len(all_levels) * 100, 1),
                }
                for label, count in sorted(distribution.items())
            ],
            "recommendation": "This expected level is derived from HSK character evidence; comprehension still requires learner data.",
        }
    )
    return metrics


def calculate_hsk_series(
    extraction: BookExtractionResult,
    character_levels: Mapping[str, Sequence[object]],
) -> dict[str, list[dict[str, object]]]:
    """Return ordered sentence and page HSK averages for chart consumers."""
    if extraction.language_code.split("-", 1)[0].lower() != "zh":
        return {"sentence_series": [], "page_series": []}

    sentence_series: list[dict[str, object]] = []
    page_series: list[dict[str, object]] = []
    sentence_index = 0

    for page in extraction.pages:
        page_levels: list[float] = []
        for sentence in page.sentences:
            levels: list[float] = []
            for token in sentence.tokens:
                for character in token.surface_form:
                    if not is_hanzi(character):
                        continue
                    parsed_levels = [
                        parsed
                        for value in character_levels.get(character, [])
                        if (parsed := parse_hsk_level(value)) is not None
                    ]
                    if parsed_levels:
                        levels.append(min(parsed_levels))

            if not levels:
                continue

            sentence_index += 1
            sentence_level = mean(levels)
            page_levels.append(sentence_level)
            sentence_series.append(
                {
                    "index": sentence_index,
                    "label": f"S{sentence_index}",
                    "value": round(sentence_level, 2),
                    "page_number": page.page_number,
                    "sentence_order": sentence.order,
                }
            )

        if page_levels:
            page_series.append(
                {
                    "index": len(page_series) + 1,
                    "label": f"P{page.page_number}",
                    "value": round(mean(page_levels), 2),
                    "page_number": page.page_number,
                    "sentence_order": None,
                }
            )

    return {"sentence_series": sentence_series, "page_series": page_series}
