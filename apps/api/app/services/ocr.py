from __future__ import annotations

import base64
import json
import logging
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

logger = logging.getLogger(__name__)

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
DEFAULT_OCR_MODEL = "gpt-5.4-mini"
DEFAULT_MAX_OUTPUT_TOKENS = 2048
DEFAULT_OCR_PROVIDER = "local"
OCR_PROMPT_VERSION = "ocr-v1"
PYPDF_TEXT_SIGNATURE = "pypdf-text-v1"
SUPPORTED_OCR_PROVIDERS = {"local", "openai"}


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
        "Do not translate, summarize, explain, or rewrite the content.\n"
        "Return only the transcription text."
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


def transcribe_page_image(
    *,
    page_image_path: Path,
    book_title: str | None,
    language_code: str,
    page_number: int,
) -> str:
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
                            "Output only the transcription."
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

    return _extract_response_text(response_payload)


def resolve_page_text(
    *,
    fallback_text: str,
    page_image_path: Path,
    book_title: str | None,
    language_code: str,
    page_number: int,
    ocr_provider: str | None = None,
) -> tuple[str, str, str]:
    resolved_provider = normalize_ocr_provider(ocr_provider)
    if should_use_openai_ocr(resolved_provider):
        try:
            text = transcribe_page_image(
                page_image_path=page_image_path,
                book_title=book_title,
                language_code=language_code,
                page_number=page_number,
            )
            return text, "openai", f"openai:{get_openai_ocr_model()}:{OCR_PROMPT_VERSION}"
        except Exception:
            logger.exception("OpenAI OCR failed for page %s; falling back to embedded PDF text.", page_number)
    elif resolved_provider == "openai":
        logger.warning("OpenAI OCR was requested for page %s but OPENAI_API_KEY is missing; falling back to embedded PDF text.", page_number)

    return fallback_text, "pypdf", PYPDF_TEXT_SIGNATURE
