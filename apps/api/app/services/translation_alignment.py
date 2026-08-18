from __future__ import annotations

import json
import logging
import os
import re
import unicodedata
from typing import Any, Literal
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.schemas.books import (
    SentenceTranslationAlignment,
    TranslationAlignmentSegment,
    TranslationAlignmentToken,
)
from app.services.openai_config import get_openai_api_key, get_openai_api_key_env
from processor.contracts import SentenceResult

logger = logging.getLogger(__name__)

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
DEFAULT_ALIGNMENT_MODEL = "gpt-5.6-luna"
DEFAULT_MAX_OUTPUT_TOKENS = 2048
TRANSLATION_ALIGNMENT_PROMPT_VERSION = "translation-alignment-v1"
TOKEN_KIND = Literal["word", "punctuation", "space"]
TOKEN_SPLIT_PATTERN = re.compile(r"\s+|[^\s]+", re.UNICODE)


def _openai_api_key() -> str:
    return get_openai_api_key("translation_alignment")


def _openai_model() -> str:
    model = os.getenv("OPENAI_TRANSLATION_ALIGNMENT_MODEL", DEFAULT_ALIGNMENT_MODEL).strip()
    return model or DEFAULT_ALIGNMENT_MODEL


def _max_output_tokens() -> int:
    raw_value = os.getenv("OPENAI_TRANSLATION_ALIGNMENT_MAX_OUTPUT_TOKENS", str(DEFAULT_MAX_OUTPUT_TOKENS)).strip()
    try:
        return max(256, int(raw_value))
    except ValueError:
        return DEFAULT_MAX_OUTPUT_TOKENS


def _extract_response_text(payload: dict[str, object]) -> str:
    direct_text = payload.get("output_text")
    if isinstance(direct_text, str) and direct_text.strip():
        return direct_text.strip()

    chunks: list[str] = []
    for item in payload.get("output", []):
        if not isinstance(item, dict):
            continue
        if item.get("type") != "message":
            continue
        for content in item.get("content", []):
            if not isinstance(content, dict):
                continue
            if content.get("type") in {"output_text", "text"}:
                text = content.get("text")
                if isinstance(text, str):
                    chunks.append(text)

    text = "".join(chunks).strip()
    if text:
        return text

    raise RuntimeError("OpenAI translation alignment response did not include output text.")


def _json_object_from_text(text: str) -> dict[str, Any] | None:
    candidate = text.strip()
    if candidate.startswith("```"):
        candidate = candidate.strip("`")
        if candidate.startswith("json"):
            candidate = candidate[4:].strip()
    start = candidate.find("{")
    end = candidate.rfind("}")
    if start < 0 or end < 0 or end <= start:
        return None
    fragment = candidate[start : end + 1]
    try:
        loaded = json.loads(fragment)
    except json.JSONDecodeError:
        return None
    return loaded if isinstance(loaded, dict) else None


def _is_punctuation_text(text: str) -> bool:
    trimmed = text.strip()
    if not trimmed:
        return False
    return all(unicodedata.category(character).startswith(("P", "S")) for character in trimmed)


def _token_kind_for_text(text: str, *, default_kind: TOKEN_KIND = "word") -> TOKEN_KIND:
    if not text.strip():
        return "space"
    if _is_punctuation_text(text):
        return "punctuation"
    return default_kind


def _normalize_alignment_tokens(values: object, *, default_kind: TOKEN_KIND = "word") -> list[TranslationAlignmentToken]:
    if isinstance(values, str):
        values = [values]
    if not isinstance(values, list):
        return []

    tokens: list[TranslationAlignmentToken] = []
    for index, value in enumerate(values, start=1):
        if isinstance(value, str):
            text = value
            token_id = index
            token_kind = _token_kind_for_text(text, default_kind=default_kind)
        elif isinstance(value, dict):
            text_value = value.get("text") or value.get("token_text") or value.get("surface_form")
            if not isinstance(text_value, str):
                continue
            text = text_value
            token_id_value = value.get("token_id") or value.get("id") or value.get("order")
            try:
                token_id = int(token_id_value) if token_id_value is not None else index
            except (TypeError, ValueError):
                token_id = index
            token_kind_value = value.get("token_kind") or value.get("kind")
            token_kind = token_kind_value if token_kind_value in {"word", "punctuation", "space"} else _token_kind_for_text(
                text,
                default_kind=default_kind,
            )
        else:
            continue

        cleaned_text = text if token_kind == "space" else text.strip()
        if not cleaned_text:
            continue
        tokens.append(TranslationAlignmentToken(token_id=token_id, text=cleaned_text, token_kind=token_kind))

    return tokens


def _normalize_alignment_segments(values: object) -> list[TranslationAlignmentSegment]:
    if not isinstance(values, list):
        return []

    def _coerce_ids(raw_values: object) -> list[int]:
        if not isinstance(raw_values, list):
            return []
        ids: list[int] = []
        for item in raw_values:
            try:
                if isinstance(item, str):
                    item = item.strip()
                    if not item:
                        continue
                ids.append(int(item))
            except (TypeError, ValueError):
                continue
        return ids

    segments: list[TranslationAlignmentSegment] = []
    for value in values:
        if not isinstance(value, dict):
            continue

        source_ids = _coerce_ids(value.get("source_token_ids") or value.get("source_ids") or value.get("source"))
        target_ids = _coerce_ids(value.get("target_token_ids") or value.get("target_ids") or value.get("target"))

        confidence_value = value.get("confidence")
        try:
            confidence = float(confidence_value) if confidence_value is not None else None
        except (TypeError, ValueError):
            confidence = None

        segments.append(
            TranslationAlignmentSegment(
                source_token_ids=sorted({int(item) for item in source_ids}),
                target_token_ids=sorted({int(item) for item in target_ids}),
                confidence=confidence,
            )
        )

    return segments


def _source_alignment_tokens(sentence: SentenceResult) -> list[TranslationAlignmentToken]:
    tokens: list[TranslationAlignmentToken] = []
    for token in sentence.tokens:
        text = token.surface_form.strip()
        if not text:
            continue
        token_kind = "punctuation" if _is_punctuation_text(text) else "word"
        tokens.append(TranslationAlignmentToken(token_id=token.order, text=text, token_kind=token_kind))
    if tokens:
        return tokens

    fallback_tokens: list[TranslationAlignmentToken] = []
    token_id = 1
    for part in TOKEN_SPLIT_PATTERN.findall(sentence.text):
        token_kind = _token_kind_for_text(part)
        text = part if token_kind == "space" else part.strip()
        if not text:
            continue
        fallback_tokens.append(TranslationAlignmentToken(token_id=token_id, text=text, token_kind=token_kind))
        token_id += 1
    return fallback_tokens


def _target_tokens_from_translation(translation: str) -> list[TranslationAlignmentToken]:
    tokens: list[TranslationAlignmentToken] = []
    token_id = 1
    for part in TOKEN_SPLIT_PATTERN.findall(translation):
        token_kind = _token_kind_for_text(part)
        text = part if token_kind == "space" else part.strip()
        if not text:
            continue
        tokens.append(TranslationAlignmentToken(token_id=token_id, text=text, token_kind=token_kind))
        token_id += 1
    return tokens


def translation_alignment_matches_text(
    alignment: SentenceTranslationAlignment | None,
    translation: str | None,
) -> bool:
    if alignment is None or not isinstance(translation, str) or not translation.strip():
        return False

    def normalize(value: str) -> str:
        return re.sub(r"\s+", "", unicodedata.normalize("NFKC", value)).casefold()

    aligned_text = "".join(token.text for token in alignment.target_tokens)
    return bool(aligned_text) and normalize(aligned_text) == normalize(translation)


def _heuristic_alignment_segments(
    *,
    source_tokens: list[TranslationAlignmentToken],
    target_tokens: list[TranslationAlignmentToken],
) -> list[TranslationAlignmentSegment]:
    source_words = [token for token in source_tokens if token.token_kind == "word"]
    target_words = [token for token in target_tokens if token.token_kind == "word"]
    target_selection = target_words or [token for token in target_tokens if token.token_kind != "space"]
    if not source_words or not target_selection:
        return []

    segments: list[TranslationAlignmentSegment] = []
    source_count = len(source_words)
    target_count = len(target_selection)

    for index, source_token in enumerate(source_words):
        start = round(index * target_count / source_count)
        end = round((index + 1) * target_count / source_count)
        if end <= start:
            end = min(target_count, start + 1)
        if start >= target_count:
            start = target_count - 1
            end = target_count

        selected_target_tokens = target_selection[start:end] or [target_selection[min(start, target_count - 1)]]
        segments.append(
            TranslationAlignmentSegment(
                source_token_ids=[source_token.token_id],
                target_token_ids=sorted({token.token_id for token in selected_target_tokens}),
                confidence=0.5,
            )
        )

    return segments


def _heuristic_alignment(
    *,
    source_language_code: str,
    target_language_code: str,
    translation_text: str,
    source_tokens: list[TranslationAlignmentToken],
) -> SentenceTranslationAlignment:
    target_tokens = _target_tokens_from_translation(translation_text)
    return SentenceTranslationAlignment(
        alignment_source="heuristic",
        source_language_code=source_language_code,
        target_language_code=target_language_code,
        source_tokens=source_tokens,
        target_tokens=target_tokens,
        segments=_heuristic_alignment_segments(source_tokens=source_tokens, target_tokens=target_tokens),
    )


def _build_alignment_prompt(
    *,
    source_language_code: str,
    target_language_code: str,
    sentence_text: str,
    translation_text: str,
    source_tokens: list[TranslationAlignmentToken],
) -> str:
    token_payload = json.dumps([token.model_dump() for token in source_tokens], ensure_ascii=False, indent=2)
    return (
        "You align a source sentence to its existing translation for a learner reader.\n"
        "Return only a JSON object with these keys:\n"
        '{ "alignment_source": "openai", "source_language_code": "...", "target_language_code": "...", '
        '"source_tokens": [{"token_id": 1, "text": "...", "token_kind": "word"}], '
        '"target_tokens": [{"token_id": 1, "text": "...", "token_kind": "word"}], '
        '"segments": [{"source_token_ids": [1], "target_token_ids": [1, 3, 5], "confidence": 0.91}] }\n'
        "Rules:\n"
        "- Use the provided source token ids exactly.\n"
        "- Tokenize the translation into readable display tokens and keep whitespace as separate tokens when useful.\n"
        "- Include punctuation as separate tokens when useful.\n"
        "- Every meaningful source token should map to at least one target token id, directly or via a segment.\n"
        "- A source token may map to multiple target token ids, and a target token may appear in multiple segments if necessary.\n"
        "- Prefer phrase-level alignment over literal word-by-word translation.\n"
        "- Do not invent or change the translation text.\n"
        "- If the translation order differs, keep the target token ids in translation order.\n"
        "- Confidence must be a number from 0 to 1 when present.\n"
        f"Source language: {source_language_code}\n"
        f"Target language: {target_language_code}\n"
        f"Source sentence: {sentence_text}\n"
        f"Translation: {translation_text}\n"
        f"Source tokens: {token_payload}\n"
        f"Prompt version: {TRANSLATION_ALIGNMENT_PROMPT_VERSION}\n"
    )


def _call_openai(prompt: str) -> dict[str, Any]:
    api_key = _openai_api_key()
    if not api_key:
        raise RuntimeError(f"{get_openai_api_key_env('translation_alignment')} is not configured.")

    payload = {
        "model": _openai_model(),
        "max_output_tokens": _max_output_tokens(),
        "input": [
            {
                "role": "system",
                "content": [
                    {
                        "type": "input_text",
                        "text": "You return only valid JSON objects for translation alignment.",
                    }
                ],
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": prompt,
                    }
                ],
            },
        ],
    }

    request = Request(
        OPENAI_RESPONSES_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=120) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI translation alignment failed with HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"OpenAI translation alignment failed: {exc.reason}") from exc

    if not isinstance(response_payload, dict):
        raise TypeError("OpenAI translation alignment response was not a JSON object.")
    return response_payload


def build_sentence_translation_alignment(
    sentence: SentenceResult,
    *,
    source_language_code: str,
    target_language_code: str = "en",
) -> SentenceTranslationAlignment | None:
    translation_text = sentence.translation.strip() if isinstance(sentence.translation, str) else ""
    if not translation_text:
        return None

    source_tokens = _source_alignment_tokens(sentence)
    if not source_tokens:
        return None

    heuristic_alignment = _heuristic_alignment(
        source_language_code=source_language_code,
        target_language_code=target_language_code,
        translation_text=translation_text,
        source_tokens=source_tokens,
    )

    if not _openai_api_key():
        return heuristic_alignment

    prompt = _build_alignment_prompt(
        source_language_code=source_language_code,
        target_language_code=target_language_code,
        sentence_text=sentence.text,
        translation_text=translation_text,
        source_tokens=source_tokens,
    )

    try:
        response_payload = _call_openai(prompt)
        response_text = _extract_response_text(response_payload)
    except (RuntimeError, TypeError, json.JSONDecodeError) as exc:  # pragma: no cover - network and model failures are best-effort
        logger.warning("OpenAI translation alignment failed: %s", exc)
        return heuristic_alignment

    parsed = _json_object_from_text(response_text)
    if parsed is None:
        logger.warning("OpenAI translation alignment returned non-JSON output.")
        return heuristic_alignment

    source_tokens_payload = parsed.get("source_tokens") or [token.model_dump() for token in source_tokens]
    target_tokens_payload = parsed.get("target_tokens") or [token.model_dump() for token in _target_tokens_from_translation(translation_text)]
    segments_payload = parsed.get("segments") or []

    alignment_payload = {
        "alignment_source": "openai",
        "model": parsed.get("model") if isinstance(parsed.get("model"), str) and parsed.get("model").strip() else _openai_model(),
        "source_language_code": str(parsed.get("source_language_code") or source_language_code).strip() or source_language_code,
        "target_language_code": str(parsed.get("target_language_code") or target_language_code).strip() or target_language_code,
        "source_tokens": [token.model_dump() for token in _normalize_alignment_tokens(source_tokens_payload, default_kind="word")],
        "target_tokens": [token.model_dump() for token in _normalize_alignment_tokens(target_tokens_payload)],
        "segments": [segment.model_dump() for segment in _normalize_alignment_segments(segments_payload)],
    }

    alignment = SentenceTranslationAlignment.model_validate(alignment_payload)
    if not alignment.target_tokens or not alignment.segments:
        return heuristic_alignment
    return alignment
