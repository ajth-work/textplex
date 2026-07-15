from __future__ import annotations

import base64
import json
import logging
import os
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
DEFAULT_OCR_MODEL = "gpt-5.4-mini"
DEFAULT_MAX_OUTPUT_TOKENS = 2048
DEFAULT_OCR_PROVIDER = "local"
OCR_PROMPT_VERSION = "ocr-v2"
PYPDF_TEXT_SIGNATURE = "pypdf-text-v1"
SUPPORTED_OCR_PROVIDERS = {"local", "openai"}

_TRAILING_SENTENCE_CLOSERS = "\"')]}〉》」』】〗〟”’"


class OcrTokenHint(BaseModel):
    surface_form: str
    romanization: str | None = None
    definition_short: str | None = None


class OcrPageResult(BaseModel):
    transcription: str
    sentence_texts: list[str] = Field(default_factory=list)
    page_ends_with_sentence_terminator: bool = False
    token_hints: list[OcrTokenHint] = Field(default_factory=list)
    text_source: str = "pypdf"
    text_source_signature: str = PYPDF_TEXT_SIGNATURE


def normalize_ocr_provider(provider: str | None = None) -> str:
    candidate = (provider or "").strip().lower()
    if candidate in SUPPORTED_OCR_PROVIDERS:
        return candidate

    env_provider = os.getenv("AI_PROVIDER", "").strip().lower()
    if env_provider in SUPPORTED_OCR_PROVIDERS:
        return env_provider

    return DEFAULT_OCR_PROVIDER


def should_use_openai_ocr(provider: str | None = None) -> bool:
    resolved_provider = normalize_ocr_provider(provider)
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    return resolved_provider == "openai" and bool(api_key)


def get_openai_ocr_model() -> str:
    model = os.getenv("OPENAI_OCR_MODEL", DEFAULT_OCR_MODEL).strip()
    return model or DEFAULT_OCR_MODEL


def get_openai_max_output_tokens() -> int:
    raw_value = os.getenv("OPENAI_OCR_MAX_OUTPUT_TOKENS", str(DEFAULT_MAX_OUTPUT_TOKENS)).strip()
    try:
        return max(256, int(raw_value))
    except ValueError:
        return DEFAULT_MAX_OUTPUT_TOKENS


def get_text_source_signature(provider: str | None = None) -> tuple[str, str]:
    if should_use_openai_ocr(provider):
        model = get_openai_ocr_model()
        return "openai", f"openai:{model}:{OCR_PROMPT_VERSION}"
    return "pypdf", PYPDF_TEXT_SIGNATURE


def build_ocr_prompt(*, book_title: str | None, language_code: str, page_number: int) -> str:
    title = book_title.strip() if book_title else "Untitled book"
    return (
        f"Transcribe the visible text from page {page_number} of {title}.\n"
        f"Language code: {language_code}.\n"
        "Preserve the original wording, punctuation, line breaks, and reading order as faithfully as possible.\n"
        "If the page ends mid-sentence, transcribe only the visible fragment and do not add ending punctuation.\n"
        "Split the transcription into sentence_texts using the original punctuation.\n"
        "If you can confidently identify segmented tokens, include token_hints with surface_form, romanization, and a short definition.\n"
        "Keep token_hints focused on the segmented words visible on this page.\n"
        "Do not translate, summarize, explain, or rewrite the content.\n"
        "Return only a JSON object with transcription, sentence_texts, page_ends_with_sentence_terminator, and token_hints."
    )


def _build_page_image_data_url(page_image_path: Path) -> str:
    image_bytes = page_image_path.read_bytes()
    encoded = base64.b64encode(image_bytes).decode("ascii")
    return f"data:image/png;base64,{encoded}"


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

    raise RuntimeError("OpenAI OCR response did not include transcribed text.")


def _parse_json_object(value: str) -> dict[str, Any] | None:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return None
    if isinstance(parsed, dict):
        return parsed
    return None


def _page_terminator(value: str) -> bool:
    stripped = value.rstrip()
    while stripped and stripped[-1] in _TRAILING_SENTENCE_CLOSERS:
        stripped = stripped[:-1].rstrip()
    return bool(stripped) and stripped[-1] in "。！？!?."


def _normalize_sentence_texts(values: object) -> list[str]:
    if isinstance(values, str):
        values = [values]
    if not isinstance(values, list):
        return []

    sentence_texts: list[str] = []
    for item in values:
        if isinstance(item, str):
            text = item.strip()
            if text:
                sentence_texts.append(text)
            continue
        if isinstance(item, dict):
            text = item.get("text")
            if isinstance(text, str):
                text = text.strip()
                if text:
                    sentence_texts.append(text)
    return sentence_texts


def _normalize_token_hints(values: object) -> list[OcrTokenHint]:
    if not isinstance(values, list):
        return []

    hints: list[OcrTokenHint] = []
    for item in values:
        if not isinstance(item, dict):
            continue

        surface_form = item.get("surface_form")
        if not isinstance(surface_form, str) or not surface_form.strip():
            continue

        romanization = item.get("romanization")
        definition_short = item.get("definition_short")
        hints.append(
            OcrTokenHint(
                surface_form=surface_form.strip(),
                romanization=romanization if isinstance(romanization, str) else None,
                definition_short=definition_short if isinstance(definition_short, str) else None,
            )
        )

    return hints


def _extract_structured_ocr_result(response_text: str, *, fallback_text: str) -> OcrPageResult:
    structured = _parse_json_object(response_text)
    if structured is None:
        transcription = response_text.strip() or fallback_text
        return OcrPageResult(
            transcription=transcription,
            sentence_texts=[],
            page_ends_with_sentence_terminator=_page_terminator(transcription),
            token_hints=[],
            text_source="openai",
            text_source_signature=f"openai:{get_openai_ocr_model()}:{OCR_PROMPT_VERSION}",
        )

    transcription = ""
    if isinstance(structured.get("transcription"), str):
        transcription = structured["transcription"].strip()
    elif isinstance(structured.get("raw_text"), str):
        transcription = structured["raw_text"].strip()
    if not transcription:
        transcription = response_text.strip() or fallback_text

    sentence_texts = _normalize_sentence_texts(structured.get("sentence_texts"))
    if not sentence_texts:
        sentence_texts = _normalize_sentence_texts(structured.get("sentences"))

    page_ends = structured.get("page_ends_with_sentence_terminator")
    if not isinstance(page_ends, bool):
        page_ends = _page_terminator(transcription)

    return OcrPageResult(
        transcription=transcription,
        sentence_texts=sentence_texts,
        page_ends_with_sentence_terminator=page_ends,
        token_hints=_normalize_token_hints(structured.get("token_hints")),
        text_source="openai",
        text_source_signature=f"openai:{get_openai_ocr_model()}:{OCR_PROMPT_VERSION}",
    )


def transcribe_page_image(
    *,
    page_image_path: Path,
    book_title: str | None,
    language_code: str,
    page_number: int,
) -> OcrPageResult:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    model = get_openai_ocr_model()
    payload = {
        "model": model,
        "max_output_tokens": get_openai_max_output_tokens(),
        "input": [
            {
                "role": "system",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            "You transcribe scanned book pages for downstream sentence parsing. "
                            "Preserve the visible text exactly, including punctuation and line breaks. "
                            "Do not invent missing text or punctuation at the page boundary. "
                            "Do not translate, summarize, or explain. "
                            "Return only valid JSON."
                        ),
                    }
                ],
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": build_ocr_prompt(
                            book_title=book_title,
                            language_code=language_code,
                            page_number=page_number,
                        ),
                    },
                    {
                        "type": "input_image",
                        "image_url": _build_page_image_data_url(page_image_path),
                        "detail": "high",
                    },
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
        raise RuntimeError(f"OpenAI OCR request failed with HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"OpenAI OCR request failed: {exc.reason}") from exc

    if not isinstance(response_payload, dict):
        raise RuntimeError("OpenAI OCR response was not a JSON object.")

    response_text = _extract_response_text(response_payload)
    return _extract_structured_ocr_result(response_text, fallback_text=response_text)


def resolve_page_ocr(
    *,
    fallback_text: str,
    page_image_path: Path,
    book_title: str | None,
    language_code: str,
    page_number: int,
    ocr_provider: str | None = None,
) -> OcrPageResult:
    resolved_provider = normalize_ocr_provider(ocr_provider)
    if should_use_openai_ocr(resolved_provider):
        try:
            result = transcribe_page_image(
                page_image_path=page_image_path,
                book_title=book_title,
                language_code=language_code,
                page_number=page_number,
            )
            return result.model_copy(update={"transcription": result.transcription.strip() or fallback_text})
        except Exception:
            logger.exception("OpenAI OCR failed for page %s; falling back to embedded PDF text.", page_number)
    elif resolved_provider == "openai":
        logger.warning(
            "OpenAI OCR was requested for page %s but OPENAI_API_KEY is missing; falling back to embedded PDF text.",
            page_number,
        )

    return OcrPageResult(
        transcription=fallback_text,
        sentence_texts=[],
        page_ends_with_sentence_terminator=_page_terminator(fallback_text),
        token_hints=[],
        text_source="pypdf",
        text_source_signature=PYPDF_TEXT_SIGNATURE,
    )


def resolve_page_text(
    *,
    fallback_text: str,
    page_image_path: Path,
    book_title: str | None,
    language_code: str,
    page_number: int,
    ocr_provider: str | None = None,
) -> tuple[str, str, str]:
    result = resolve_page_ocr(
        fallback_text=fallback_text,
        page_image_path=page_image_path,
        book_title=book_title,
        language_code=language_code,
        page_number=page_number,
        ocr_provider=ocr_provider,
    )
    return result.transcription, result.text_source, result.text_source_signature
