import json
import shutil
from pathlib import Path

import fitz
import pytest
from app.main import app
from app.schemas.books import BookRecord
from app.schemas.lexicon import LexiconEntryRecord
from app.services import book_extraction as book_extraction_service
from app.services.book_registry import import_book_from_path
from app.services.lexicon import import_lexicon_from_source
from app.services.ocr import OcrPageResult
from fastapi.testclient import TestClient
from processor import build_page_extraction_result, tokenize_sentence
from processor.contracts import (
    BookExtractionResult,
    PageExtractionResult,
    SentenceResult,
    TokenResult,
)


def build_safe_sample_pdf(tmp_path: Path, *, page_count: int) -> Path:
    pdf_path = tmp_path / f"safe-sample-{page_count}.pdf"
    document = fitz.open()
    sample_pages = [
        "第一页：这是一个安全的测试页。",
        "第二页：我们只需要稳定的中文文本用于提取。",
        "第三页：内容不依赖任何受版权保护的原文。",
        "第四页：用来验证分页和缓存刷新。",
    ]
    for index in range(page_count):
        page = document.new_page(width=595, height=842)
        page.insert_text((72, 96), sample_pages[index % len(sample_pages)], fontsize=18)
        page.insert_text((72, 140), f"测试页 {index + 1}", fontsize=12)
    document.save(pdf_path)
    document.close()
    return pdf_path


def test_page_by_page_extraction_does_not_read_appended_pages_from_source_pdf(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source_pdf = build_safe_sample_pdf(tmp_path, page_count=1)
    data_root = tmp_path / "books"
    book = import_book_from_path(
        source_pdf,
        language_code="en",
        source_type="page-by-page",
        data_root=data_root,
    )
    shutil.copy2(Path(book.pages_path) / "page-0001.png", Path(book.pages_path) / "page-0002.png")
    book.total_pages = 2
    book.page_image_count = 2

    processed_pages: list[int] = []

    def fake_ocr(**kwargs: object) -> OcrPageResult:
        processed_pages.append(int(kwargs["page_number"]))
        return OcrPageResult(transcription=f"Page {kwargs['page_number']}.", text_source="openai", text_source_signature="openai:test")

    monkeypatch.setattr(book_extraction_service, "resolve_page_ocr", fake_ocr)

    extraction_path, extracted_page_count = book_extraction_service.extract_book_text(
        book=book,
        page_start=1,
        page_count=book.total_pages,
        force=True,
        data_root=data_root,
    )

    assert processed_pages == [1, 2]
    assert extracted_page_count == 2
    assert Path(extraction_path).exists()


def test_extraction_persists_page_artifact_before_progress_callback(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source_pdf = build_safe_sample_pdf(tmp_path, page_count=1)
    data_root = tmp_path / "books"
    book = import_book_from_path(
        source_pdf,
        language_code="en",
        source_type="page-by-page",
        data_root=data_root,
    )

    seen_artifacts: list[bool] = []

    def fake_ocr(**kwargs: object) -> OcrPageResult:
        return OcrPageResult(transcription=f"Page {kwargs['page_number']}.", text_source="openai", text_source_signature="openai:test")

    def progress_callback(current_page: int, _pages_processed: int, _total_pages: int) -> None:
        seen_artifacts.append(
            book_extraction_service.load_page_artifact(
                book_id=book.id,
                page_number=current_page,
                data_root=data_root,
                owner_id=book.owner_id,
            )
            is not None
        )

    monkeypatch.setattr(book_extraction_service, "resolve_page_ocr", fake_ocr)
    book_extraction_service.extract_book_text(
        book=book,
        page_start=1,
        page_count=1,
        force=True,
        data_root=data_root,
        progress_callback=progress_callback,
    )

    assert seen_artifacts == [True]


def test_extract_book_text_persists_structured_page_artifacts(imported_real_scan: tuple[Path, BookRecord]) -> None:
    data_root, record = imported_real_scan

    app.state.data_root = data_root
    client = TestClient(app)

    response = client.post(
        f"/books/{record.id}/extract",
        json={
            "page_start": 1,
            "page_count": 4,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "complete"
    assert Path(payload["extraction_path"]).exists()

    book_path = data_root / "books" / record.id / "book.json"
    updated_book = BookRecord.model_validate_json(book_path.read_text(encoding="utf-8"))
    assert updated_book.extraction_status == "complete"
    assert updated_book.extracted_page_count == 3
    assert updated_book.status == "extracted"
    assert updated_book.total_sentences > 0

    summary_response = client.get(f"/books/{record.id}/extractions")
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["page_start"] == 1
    assert summary["page_end"] == 3
    assert summary["pages"]
    assert len(summary["lexical_entries"]) > 0
    assert len(summary["token_occurrences"]) > 0
    assert len(summary["pages"]) == 3

    page_artifact = data_root / "books" / record.id / "extractions" / "pages" / "page-0001.json"
    assert page_artifact.exists()
    page_json = json.loads(page_artifact.read_text(encoding="utf-8"))
    assert page_json["page"]["page_number"] == 1
    assert len(page_json["page"]["sentences"]) > 0
    assert len(page_json["page"]["token_occurrences"]) > 0


def test_extract_book_endpoint_is_idempotent_for_same_sample(imported_real_scan: tuple[Path, BookRecord]) -> None:
    data_root, record = imported_real_scan

    app.state.data_root = data_root
    client = TestClient(app)

    first = client.post(
        f"/books/{record.id}/extract",
        json={"page_start": 1, "page_count": 4},
    )
    second = client.post(
        f"/books/{record.id}/extract",
        json={"page_start": 1, "page_count": 4},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["status"] == "complete"
    assert second.json()["status"] == "complete"


def test_extract_book_text_records_openai_ocr_metadata(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    source_pdf = build_safe_sample_pdf(tmp_path, page_count=4)
    data_root = tmp_path
    record = import_book_from_path(
        source_pdf,
        language_code="zh",
        title="三体",
        author="刘慈欣",
        page_start=1,
        page_count=4,
        data_root=data_root / "books",
    )

    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_OCR_MODEL", "gpt-5.6-luna")
    monkeypatch.setattr(
        book_extraction_service,
        "resolve_page_ocr",
        lambda **_: OcrPageResult(
            transcription="这是第一句。",
            sentence_texts=["这是第一句。"],
            sentence_translations=["This is the first sentence."],
            page_translation="This is page one.",
            page_ends_with_sentence_terminator=True,
            token_hints=[],
            text_source="openai",
            text_source_signature="openai:gpt-5.6-luna:ocr-v2",
        ),
    )

    app.state.data_root = data_root
    client = TestClient(app)

    response = client.post(
        f"/books/{record.id}/extract",
        json={
            "page_start": 1,
            "page_count": 1,
        },
    )

    assert response.status_code == 200
    page_artifact = data_root / "books" / record.id / "extractions" / "pages" / "page-0001.json"
    assert page_artifact.exists()
    page_json = json.loads(page_artifact.read_text(encoding="utf-8"))
    assert page_json["text_source"] == "openai"
    assert page_json["text_source_signature"] == "openai:gpt-5.6-luna:ocr-v2"
    assert page_json["page"]["raw_text"] == "这是第一句。"
    assert page_json["page"]["sentences"][0]["text"] == "这是第一句。"
    assert page_json["page"]["page_translation"] == "This is page one."
    assert page_json["page"]["sentences"][0]["translation"] == "This is the first sentence."


def test_parse_text_into_page_artifact_enriches_korean_pronunciation(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    def fake_entry_map(*, terms, **_kwargs):
        return {
            term: LexiconEntryRecord(
                id=index + 1,
                language_code="ko",
                entry_type="word",
                surface_form=term,
                pinyin=term,
                definition=f"definition for {term}",
            )
            for index, term in enumerate(terms)
        }

    def fake_pinyin_map(*, terms, **_kwargs):
        return {term: term for term in terms}

    monkeypatch.setattr(book_extraction_service, "lookup_lexicon_entry_map", fake_entry_map)
    monkeypatch.setattr(book_extraction_service, "lookup_lexicon_pinyin_map", fake_pinyin_map)

    artifact = book_extraction_service.parse_text_into_page_artifact(
        text="아침에 가게에 갔어요.",
        language_code="ko",
        title="한국어",
        data_root=tmp_path,
    )

    token_readings = [token.romanization for token in artifact.page.sentences[0].tokens]

    assert token_readings == ["아침에", "가게에", "갔어요"]
    assert artifact.page.sentences[0].tokens[0].definition_short == "definition for 아침에"


def test_parse_text_into_page_artifact_enriches_japanese_reading(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    def fake_entry_map(*, terms, **_kwargs):
        return {
            term: LexiconEntryRecord(
                id=index + 1,
                language_code="ja",
                entry_type="word",
                surface_form=term,
                pinyin=f"reading-{term}",
                definition=f"definition for {term}",
            )
            for index, term in enumerate(terms)
        }

    def fake_pinyin_map(*, terms, **_kwargs):
        return {term: f"reading-{term}" for term in terms}

    monkeypatch.setattr(book_extraction_service, "lookup_lexicon_entry_map", fake_entry_map)
    monkeypatch.setattr(book_extraction_service, "lookup_lexicon_pinyin_map", fake_pinyin_map)

    artifact = book_extraction_service.parse_text_into_page_artifact(
        text="\u4eca\u65e5\u306f\u56f3\u66f8\u9928\u3067\u52c9\u5f37\u3057\u307e\u3057\u305f\u3002",
        language_code="ja",
        title="\u65e5\u672c\u8a9e",
        data_root=tmp_path,
    )

    token_surfaces = [token.surface_form for token in artifact.page.sentences[0].tokens]

    assert token_surfaces == ["\u4eca\u65e5", "\u306f", "\u56f3\u66f8\u9928", "\u3067", "\u52c9\u5f37\u3057\u307e\u3057\u305f"]
    assert artifact.page.sentences[0].tokens[0].romanization == "reading-\u4eca\u65e5"
    assert artifact.page.sentences[0].tokens[2].definition_short == "definition for \u56f3\u66f8\u9928"


def test_parse_text_into_page_artifact_keeps_japanese_homographs_context_safe(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    entries = {
        "\u306f": ("wa", "topic or subject marker"),
        "\u6b6f": ("ha", "tooth; teeth"),
    }

    monkeypatch.setattr(
        book_extraction_service,
        "lookup_lexicon_entry_map",
        lambda *, terms, **_kwargs: {
            term: LexiconEntryRecord(
                id=index + 1,
                language_code="ja",
                entry_type="particle" if term == "\u306f" else "word",
                surface_form=term,
                pinyin=reading,
                definition=definition,
            )
            for index, (term, (reading, definition)) in enumerate(entries.items())
            if term in terms
        },
    )
    monkeypatch.setattr(
        book_extraction_service,
        "lookup_lexicon_pinyin_map",
        lambda *, terms, **_kwargs: {term: entries[term][0] for term in entries if term in terms},
    )

    artifact = book_extraction_service.parse_text_into_page_artifact(
        text="\u4eca\u65e5\u306f\u6b6f\u304c\u75db\u3044\u3002",
        language_code="ja",
        title="\u65e5\u672c\u8a9e\u6587\u8108",
        data_root=tmp_path,
    )

    tokens = {token.surface_form: token for token in artifact.page.sentences[0].tokens}
    assert tokens["\u306f"].romanization == "wa"
    assert tokens["\u306f"].definition_short == "topic or subject marker"
    assert tokens["\u6b6f"].romanization == "ha"
    assert tokens["\u6b6f"].definition_short == "tooth; teeth"


def test_parse_text_into_page_artifact_keeps_japanese_okurigana_reading_together(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(
        book_extraction_service,
        "lookup_lexicon_entry_map",
        lambda *, terms, **_kwargs: {
            term: LexiconEntryRecord(
                id=index + 1,
                language_code="ja",
                entry_type="word",
                surface_form=term,
                pinyin=f"reading-{term}",
                definition=f"definition for {term}",
            )
            for index, term in enumerate(terms)
        },
    )
    monkeypatch.setattr(book_extraction_service, "lookup_lexicon_pinyin_map", lambda *, terms, **_kwargs: {})

    artifact = book_extraction_service.parse_text_into_page_artifact(
        text="\u98f2\u307f\u307e\u3059\u3002",
        language_code="ja",
        data_root=tmp_path,
    )

    tokens = artifact.page.sentences[0].tokens
    assert [token.surface_form for token in tokens] == ["\u98f2\u307f\u307e\u3059"]
    assert tokens[0].romanization == "reading-\u98f2\u307f\u307e\u3059"


def test_parse_text_into_page_artifact_resolves_japanese_gofun_by_context(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(
        book_extraction_service,
        "lookup_lexicon_entry_map",
        lambda *, terms, **_kwargs: {
            "\u4e94\u5206": LexiconEntryRecord(
                id=1,
                language_code="ja",
                entry_type="word",
                surface_form="\u4e94\u5206",
                pinyin="gofun",
                definition="five minutes",
            )
        }
        if "\u4e94\u5206" in terms
        else {},
    )
    monkeypatch.setattr(
        book_extraction_service,
        "lookup_lexicon_pinyin_map",
        lambda *, terms, **_kwargs: {"\u4e94\u5206": "gofun"} if "\u4e94\u5206" in terms else {},
    )

    artifact = book_extraction_service.parse_text_into_page_artifact(
        text="\u99c5\u307e\u3067\u6b69\u304f\u3068\u3001\u5341\u4e94\u5206\u3050\u3089\u3044\u304b\u304b\u308a\u307e\u3059\u3002\u4e94\u5206\u4e94\u5206\u306e\u52dd\u8ca0\u3067\u3059\u3002\u4e94\u5206\u306e\u4e00\u3067\u3059\u3002",
        language_code="ja",
        title="\u65e5\u672c\u8a9e\u306e\u5206",
        data_root=tmp_path,
    )

    sentences = artifact.page.sentences
    time_token = next(token for token in sentences[0].tokens if token.surface_form == "\u4e94\u5206")
    assert time_token.romanization == "gofun"
    assert time_token.definition_short == "five minutes"
    assert [token.romanization for token in sentences[1].tokens[:2]] == ["gobu", "gobu"]
    assert [token.definition_short for token in sentences[1].tokens[:2]] == [
        "evenly matched; fifty-fifty",
        "evenly matched; fifty-fifty",
    ]
    assert sentences[2].tokens[0].romanization == "gobun"
    assert sentences[2].tokens[0].definition_short == "a fifth; one fifth"

    stale_page = artifact.page.model_copy(
        update={
            "sentences": [
                sentences[0].model_copy(
                    update={
                        "tokens": [
                            token.model_copy(update={"romanization": "Gobu", "pronunciation": "Gobu"})
                            if token.surface_form == "五分"
                            else token
                            for token in sentences[0].tokens
                        ]
                    }
                ),
                *sentences[1:],
            ]
        }
    )
    refreshed_page = book_extraction_service._enrich_page_lexicon_metadata(stale_page, data_root=tmp_path)
    refreshed_time_token = next(token for token in refreshed_page.sentences[0].tokens if token.surface_form == "五分")
    assert refreshed_time_token.romanization == "gofun"
    assert refreshed_time_token.pronunciation == "gofun"


@pytest.mark.parametrize(
    ("text", "expected_reading"),
    [
        ("一分かかります。", "ippun"),
        ("二分かかります。", "nifun"),
        ("三分かかります。", "sanpun"),
        ("四分かかります。", "yonpun"),
        ("五分かかります。", "gofun"),
        ("六分かかります。", "roppun"),
        ("七分かかります。", "nanafun"),
        ("八分かかります。", "happun"),
        ("九分かかります。", "kyūfun"),
        ("十分かかります。", "juppun"),
        ("十五分かかります。", "gofun"),
        ("二十分かかります。", "nijuppun"),
    ],
)
def test_parse_text_into_page_artifact_resolves_japanese_minute_counter_variants(
    text: str,
    expected_reading: str,
    tmp_path: Path,
) -> None:
    artifact = book_extraction_service.parse_text_into_page_artifact(
        text=text,
        language_code="ja",
        title="日本語の分の数え方",
        data_root=tmp_path,
    )

    counter_tokens = [token for token in artifact.page.sentences[0].tokens if "分" in token.surface_form]
    assert counter_tokens
    assert counter_tokens[-1].romanization == expected_reading


@pytest.mark.parametrize(
    ("text", "counter", "expected_reading"),
    [
        ("\u4e00\u672c\u3042\u308a\u307e\u3059\u3002", "\u672c", "ippon"),
        ("\u4e09\u672c\u3042\u308a\u307e\u3059\u3002", "\u672c", "sanbon"),
        ("\u516d\u672c\u3042\u308a\u307e\u3059\u3002", "\u672c", "roppon"),
        ("\u4e00\u5339\u3044\u307e\u3059\u3002", "\u5339", "ippiki"),
        ("\u4e09\u5339\u3044\u307e\u3059\u3002", "\u5339", "sanbiki"),
        ("\u516d\u5339\u3044\u307e\u3059\u3002", "\u5339", "roppiki"),
        ("\u4e00\u676f\u98f2\u307f\u307e\u3059\u3002", "\u676f", "ippai"),
        ("\u4e09\u676f\u98f2\u307f\u307e\u3059\u3002", "\u676f", "sanbai"),
        ("\u516d\u676f\u98f2\u307f\u307e\u3059\u3002", "\u676f", "roppai"),
    ],
)
def test_parse_text_into_page_artifact_applies_japanese_h_counter_sound_changes(
    text: str,
    counter: str,
    expected_reading: str,
    tmp_path: Path,
) -> None:
    artifact = book_extraction_service.parse_text_into_page_artifact(
        text=text,
        language_code="ja",
        title="Japanese counter sound changes",
        data_root=tmp_path,
    )

    counter_token = next(token for token in artifact.page.sentences[0].tokens if counter in token.surface_form)
    assert counter_token.romanization == expected_reading


def test_parse_text_into_page_artifact_keeps_fractional_bun_distinct_from_minute_fun(
    tmp_path: Path,
) -> None:
    artifact = book_extraction_service.parse_text_into_page_artifact(
        text="四分の一です。五分の一です。",
        language_code="ja",
        title="日本語の分数",
        data_root=tmp_path,
    )

    first_fraction = artifact.page.sentences[0].tokens[0]
    second_fraction = artifact.page.sentences[1].tokens[0]
    assert first_fraction.romanization == "yonbun"
    assert second_fraction.romanization == "gobun"


def test_parse_text_into_page_artifact_uses_google_romanization_when_local_readings_are_missing(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(book_extraction_service, "lookup_lexicon_entry_map", lambda **_kwargs: {})
    monkeypatch.setattr(book_extraction_service, "lookup_lexicon_pinyin_map", lambda **_kwargs: {})
    monkeypatch.setattr(book_extraction_service, "is_google_translate_configured", lambda _feature="translation": True)
    monkeypatch.setattr(
        book_extraction_service,
        "romanize_texts",
        lambda texts, **_kwargs: [f"romanized-{text}" for text in texts],
    )

    artifact = book_extraction_service.parse_text_into_page_artifact(
        text="сегодня я занимался в библиотеке.",
        language_code="ru",
        title="Русский",
        data_root=tmp_path,
    )

    token_readings = [token.romanization for token in artifact.page.sentences[0].tokens]

    assert token_readings == [
        "romanized-сегодня",
        "romanized-я",
        "romanized-занимался",
        "romanized-в",
        "romanized-библиотеке",
    ]
    assert artifact.page.sentences[0].tokens[0].pronunciation == "romanized-сегодня"


def test_parse_text_into_page_artifact_uses_hebrew_readings_without_google_romanization(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    def raise_missing_pack(*_args, **_kwargs):
        raise FileNotFoundError

    monkeypatch.setattr(book_extraction_service, "lookup_lexicon_entry_map", raise_missing_pack)
    monkeypatch.setattr(book_extraction_service, "lookup_lexicon_pinyin_map", raise_missing_pack)
    monkeypatch.setattr(book_extraction_service, "is_google_translate_configured", lambda _feature="translation": True)
    monkeypatch.setattr(
        book_extraction_service,
        "romanize_texts",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("Hebrew must not use Google romanization")),
    )

    artifact = book_extraction_service.parse_text_into_page_artifact(
        text="\u05d9\u05e9 \u05d0\u05ea.",
        language_code="he",
        title="\u05e2\u05d1\u05e8\u05d9\u05ea",
        data_root=tmp_path,
    )

    token_readings = [token.romanization for token in artifact.page.sentences[0].tokens]

    assert token_readings == ["yesh", "at"]
    assert artifact.page.sentences[0].tokens[0].pronunciation == "yesh"


def test_parse_text_into_page_artifact_uses_hebrew_transliteration_when_google_is_unavailable(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    def raise_missing_pack(*_args, **_kwargs):
        raise FileNotFoundError

    monkeypatch.setattr(book_extraction_service, "lookup_lexicon_entry_map", raise_missing_pack)
    monkeypatch.setattr(book_extraction_service, "lookup_lexicon_pinyin_map", raise_missing_pack)
    monkeypatch.setattr(book_extraction_service, "is_google_translate_configured", lambda _feature="translation": False)

    artifact = book_extraction_service.parse_text_into_page_artifact(
        text="\u05e9\u05dc\u05d5\u05dd \u05d0\u05e0\u05d9.",
        language_code="he",
        title="\u05e2\u05d1\u05e8\u05d9\u05ea",
        data_root=tmp_path,
    )

    token_readings = [token.romanization for token in artifact.page.sentences[0].tokens]

    assert token_readings == ["shlom", "ani"]
    assert artifact.page.sentences[0].tokens[0].pronunciation == "shlom"


def test_load_page_artifact_skips_empty_interrupted_artifact(tmp_path: Path) -> None:
    data_root = tmp_path / "books"
    book_id = "book-empty-artifact"
    artifact_path = data_root / book_id / "extractions" / "pages" / "page-0001.json"
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text("", encoding="utf-8")

    assert book_extraction_service.load_page_artifact(book_id=book_id, page_number=1, data_root=data_root) is None


def test_load_page_artifact_recovers_malformed_jsonish_transcription(tmp_path: Path) -> None:
    data_root = tmp_path / "books"
    book_id = "book-recovery-malformed"
    artifact_path = data_root / book_id / "extractions" / "pages" / "page-0001.json"
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text(
        json.dumps(
            {
                "source_page_sha256": "sha",
                "text_source": "openai",
                "text_source_signature": "openai:gpt-5.6-luna:ocr-v2",
                "processor_version": "0.1.0",
                "pipeline_version": "textplex-1",
                "page": {
                    "book_id": book_id,
                    "page_number": 1,
                    "language_code": "zh",
                    "source_page_sha256": "sha",
                    "processor_version": "0.1.0",
                    "pipeline_version": "textplex-1",
                    "raw_text": '{"transcription":"\\u79d1\\u5b66\\u8fb9\\u754c\\u3002","page_translation":"Science frontier.","page_ends_with_sentence_terminator":true,"token_hints":[{"surface_form":"\\u79d1\\u5b66\\u8fb9\\u754c","romanization":"k\\u0113xu\\xe9 bi\\u0101nji\\xe8","definition":"Science Boundary"}',
                    "clean_text": '{"transcription":"\\u79d1\\u5b66\\u8fb9\\u754c\\u3002","page_translation":"Science frontier.","page_ends_with_sentence_terminator":true,"token_hints":[{"surface_form":"\\u79d1\\u5b66\\u8fb9\\u754c","romanization":"k\\u0113xu\\xe9 bi\\u0101nji\\xe8","definition":"Science Boundary"}',
                    "page_translation": None,
                    "sentences": [
                        {
                            "order": 1,
                            "text": '{"transcription":"\\u79d1\\u5b66\\u8fb9\\u754c\\u3002","page_translation":"Science frontier.","page_ends_with_sentence_terminator":true,"token_hints":[{"surface_form":"\\u79d1\\u5b66\\u8fb9\\u754c","romanization":"k\\u0113xu\\xe9 bi\\u0101nji\\xe8","definition":"Science Boundary"}',
                            "translation": None,
                            "tokens": [],
                            "grammar_patterns": [],
                            "ends_with_sentence_terminator": False,
                        }
                    ],
                    "page_ends_with_sentence_terminator": False,
                    "token_occurrences": [],
                    "lexical_entries": [],
                },
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    recovered = book_extraction_service.load_page_artifact(book_id=book_id, page_number=1, data_root=data_root)

    assert recovered is not None
    assert recovered.page.raw_text == "科学边界。"
    assert recovered.page.clean_text == "科学边界。"
    assert recovered.page.page_translation == "Science frontier."
    assert recovered.page.page_ends_with_sentence_terminator is True
    assert recovered.page.sentences[0].text == "科学边界。"
    assert any(token.romanization for token in recovered.page.sentences[0].tokens)


def test_recover_page_result_rebuilds_accented_tokens_from_stale_artifact() -> None:
    page = build_page_extraction_result(
        book_id="book-yoruba",
        page_number=1,
        language_code="yo",
        raw_text="11853 Runge jẹ́ plánẹ́tì.",
    )
    stale_sentence = page.sentences[0].model_copy(update={"tokens": tokenize_sentence("11853 Runge j pl n t.", "yo")})
    stale_page = page.model_copy(
        update={
            "pipeline_version": "textplex-4",
            "sentences": [stale_sentence],
        }
    )

    recovered = book_extraction_service._recover_page_result(stale_page)

    assert [token.surface_form for token in recovered.sentences[0].tokens] == ["11853", "Runge", "jẹ́", "plánẹ́tì"]
    assert recovered.pipeline_version == "textplex-5"


def test_recover_page_result_keeps_chinese_name_before_parenthetical_gloss() -> None:
    page = build_page_extraction_result(
        book_id="book-chinese-name",
        page_number=1,
        language_code="zh",
        raw_text="李善中（韓語：이선중）。",
    )
    stale_sentence = page.sentences[0].model_copy(update={"tokens": tokenize_sentence("李善 中（韓語：이선중）。", "zh")})
    stale_page = page.model_copy(
        update={
            "pipeline_version": "textplex-4",
            "sentences": [stale_sentence],
        }
    )

    recovered = book_extraction_service._recover_page_result(stale_page)

    assert [token.surface_form for token in recovered.sentences[0].tokens] == ["李善中", "（", "韓語", "：", "이선중", "）", "。"]


def test_enrich_page_metadata_romanizes_all_chinese_numbers_digit_by_digit(tmp_path: Path) -> None:
    page = build_page_extraction_result(
        book_id="book-chinese-year",
        page_number=1,
        language_code="zh",
        raw_text="李善中（韓語：이선중，1924年1月20日—2020年1月6日）。",
    )

    enriched = book_extraction_service._enrich_page_lexicon_metadata(page, data_root=tmp_path)
    number_tokens = [token for token in enriched.sentences[0].tokens if token.surface_form in {"1924", "1", "20", "2020", "6"}]

    assert [token.romanization for token in number_tokens] == [
        "yī jiǔ èr sì",
        "yī",
        "èr shí",
        "èr líng èr líng",
        "yī",
        "liù",
    ]


def test_enrich_page_metadata_uses_cardinal_readings_for_non_year_numbers(tmp_path: Path) -> None:
    page = build_page_extraction_result(
        book_id="book-chinese-cardinal",
        page_number=1,
        language_code="zh",
        raw_text="12月20日5时30分。",
    )

    enriched = book_extraction_service._enrich_page_lexicon_metadata(page, data_root=tmp_path)
    number_tokens = [token for token in enriched.sentences[0].tokens if token.surface_form.isdigit()]

    assert [token.romanization for token in number_tokens] == ["shí èr", "èr shí", "wǔ", "sān shí"]


def test_enrich_page_metadata_resolves_numeric_japanese_month_and_city_name_readings(tmp_path: Path) -> None:
    source_root = tmp_path / "japanese-source"
    source_root.mkdir()
    (source_root / "lexicon.csv").write_text(
        "surface_form,entry_type,pinyin,tone,definition,radical,stroke_count,hsk_level,frequency_rank,note\n"
        "市,word,ichi;shi,,city; town,,,,1,JMdict reading alternatives\n"
        "1月,word,ichigatsu;hitotsuki,,January,,,,2,JMdict reading alternatives\n"
        "一月,word,hitotsuki;ichigatsu,,one month; January,,,,3,JMdict reading alternatives\n",
        encoding="utf-8",
    )
    data_root = tmp_path / "data"
    import_lexicon_from_source(
        source_root,
        data_root=data_root,
        language_code="ja",
        replace_existing=True,
    )

    page = PageExtractionResult(
        book_id="japanese-reading-context",
        page_number=1,
        language_code="ja",
        raw_text="京都市は1月です。",
        clean_text="京都市は1月です。",
        sentences=[
            SentenceResult(
                order=1,
                text="京都市は1月です。",
                tokens=[
                    TokenResult(order=1, surface_form="京都"),
                    TokenResult(order=2, surface_form="市"),
                    TokenResult(order=3, surface_form="は"),
                    TokenResult(order=4, surface_form="1月"),
                ],
            )
        ],
    )

    enriched = book_extraction_service._enrich_page_lexicon_metadata(page, data_root=data_root)
    city_token = enriched.sentences[0].tokens[1]
    month_token = enriched.sentences[0].tokens[3]

    assert city_token.romanization == "shi"
    assert month_token.romanization == "ichigatsu"

    standalone_city = page.model_copy(
        update={
            "sentences": [
                page.sentences[0].model_copy(
                    update={"tokens": [TokenResult(order=1, surface_form="市")]}
                )
            ]
        }
    )
    standalone_enriched = book_extraction_service._enrich_page_lexicon_metadata(standalone_city, data_root=data_root)
    assert standalone_enriched.sentences[0].tokens[0].romanization == "ichi;shi"

    kanji_month = page.model_copy(
        update={
            "sentences": [
                page.sentences[0].model_copy(
                    update={"tokens": [TokenResult(order=1, surface_form="一月")]}
                )
            ]
        }
    )
    kanji_month_enriched = book_extraction_service._enrich_page_lexicon_metadata(kanji_month, data_root=data_root)
    assert kanji_month_enriched.sentences[0].tokens[0].romanization == "hitotsuki;ichigatsu"


def test_load_page_artifact_recovers_jsonish_transcription(tmp_path: Path) -> None:
    data_root = tmp_path / "books"
    book_id = "book-recovery"
    artifact_path = data_root / book_id / "extractions" / "pages" / "page-0001.json"
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text(
        json.dumps(
            {
                "source_page_sha256": "sha",
                "text_source": "openai",
                "text_source_signature": "openai:gpt-5.6-luna:ocr-v2",
                "processor_version": "0.1.0",
                "pipeline_version": "textplex-1",
                "page": {
                    "book_id": book_id,
                    "page_number": 1,
                    "language_code": "zh",
                    "source_page_sha256": "sha",
                    "processor_version": "0.1.0",
                    "pipeline_version": "textplex-1",
                    "raw_text": '{"transcription":"科学边界。","sentence_texts":["科学边界。"],"sentence_translations":["Science frontier."],"page_translation":"Science frontier.","page_ends_with_sentence_terminator":true}',
                    "clean_text": '{"transcription":"科学边界。","sentence_texts":["科学边界。"],"sentence_translations":["Science frontier."],"page_translation":"Science frontier.","page_ends_with_sentence_terminator":true}',
                    "page_translation": None,
                    "sentences": [
                        {
                            "order": 1,
                            "text": '{"transcription":"科学边界。","sentence_texts":["科学边界。"],"sentence_translations":["Science frontier."],"page_translation":"Science frontier.","page_ends_with_sentence_terminator":true}',
                            "translation": None,
                            "tokens": [],
                            "grammar_patterns": [],
                            "ends_with_sentence_terminator": False,
                        }
                    ],
                    "page_ends_with_sentence_terminator": False,
                    "token_occurrences": [],
                    "lexical_entries": [],
                },
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    recovered = book_extraction_service.load_page_artifact(book_id=book_id, page_number=1, data_root=data_root)

    assert recovered is not None
    assert recovered.page.raw_text == "科学边界。"
    assert recovered.page.clean_text == "科学边界。"
    assert recovered.page.page_translation == "Science frontier."
    assert recovered.page.sentences[0].text == "科学边界。"
    assert recovered.page.sentences[0].translation == "Science frontier."
    assert any(token.romanization for token in recovered.page.sentences[0].tokens)


def test_extract_book_text_uses_book_level_ocr_provider(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    source_pdf = build_safe_sample_pdf(tmp_path, page_count=1)
    data_root = tmp_path
    record = import_book_from_path(
        source_pdf,
        language_code="zh",
        title="三体",
        author="刘慈欣",
        page_start=1,
        page_count=1,
        ocr_provider="openai",
        data_root=data_root / "books",
    )

    assert record.ocr_provider == "openai"

    app.state.data_root = data_root
    client = TestClient(app)

    captured = {}

    def fake_resolve_page_ocr(**kwargs):
        captured.update(kwargs)
        return OcrPageResult(
            transcription="通过设置继续使用 OpenAI。",
            sentence_texts=["通过设置继续使用 OpenAI。"],
            page_ends_with_sentence_terminator=True,
            token_hints=[],
            text_source="openai",
            text_source_signature="openai:gpt-5.6-luna:ocr-v2",
        )

    monkeypatch.setattr(book_extraction_service, "resolve_page_ocr", fake_resolve_page_ocr)
    monkeypatch.setenv("AI_PROVIDER", "local")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    response = client.post(
        f"/books/{record.id}/extract",
        json={
            "page_start": 1,
            "page_count": 1,
        },
    )

    assert response.status_code == 200
    assert captured["ocr_provider"] == "openai"
    page_artifact = data_root / "books" / record.id / "extractions" / "pages" / "page-0001.json"
    page_json = json.loads(page_artifact.read_text(encoding="utf-8"))
    assert page_json["text_source"] == "openai"
    assert page_json["text_source_signature"] == "openai:gpt-5.6-luna:ocr-v2"


def test_force_extraction_refreshes_cached_artifacts(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    source_pdf = build_safe_sample_pdf(tmp_path, page_count=1)
    data_root = tmp_path
    record = import_book_from_path(
        source_pdf,
        language_code="zh",
        title="三体",
        author="刘慈欣",
        page_start=1,
        page_count=1,
        data_root=data_root / "books",
    )

    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_OCR_MODEL", "gpt-5.6-luna")

    app.state.data_root = data_root
    client = TestClient(app)

    monkeypatch.setattr(
        book_extraction_service,
        "resolve_page_ocr",
        lambda **_: OcrPageResult(
            transcription="旧句子。",
            sentence_texts=["旧句子。"],
            page_ends_with_sentence_terminator=True,
            token_hints=[],
            text_source="openai",
            text_source_signature="openai:gpt-5.6-luna:ocr-v2",
        ),
    )
    first = client.post(
        f"/books/{record.id}/extract",
        json={
            "page_start": 1,
            "page_count": 1,
        },
    )
    assert first.status_code == 200

    monkeypatch.setattr(
        book_extraction_service,
        "resolve_page_ocr",
        lambda **_: OcrPageResult(
            transcription="新句子。",
            sentence_texts=["新句子。"],
            page_ends_with_sentence_terminator=True,
            token_hints=[],
            text_source="openai",
            text_source_signature="openai:gpt-5.6-luna:ocr-v2",
        ),
    )
    second = client.post(
        f"/books/{record.id}/extract",
        json={
            "page_start": 1,
            "page_count": 1,
            "force": True,
        },
    )

    assert second.status_code == 200
    page_artifact = data_root / "books" / record.id / "extractions" / "pages" / "page-0001.json"
    page_json = json.loads(page_artifact.read_text(encoding="utf-8"))
    assert page_json["page"]["raw_text"] == "新句子。"
def test_load_book_extraction_recovers_jsonish_transcription(tmp_path: Path) -> None:
    data_root = tmp_path / "books"
    book_id = "book-recovery-summary"
    artifact_path = data_root / book_id / "extractions" / "book-extraction.json"
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text(
        json.dumps(
            {
                "book_id": book_id,
                "source_path": "/workspace/data/uploads/example.pdf",
                "page_start": 1,
                "page_end": 1,
                "language_code": "zh",
                "pages": [
                    {
                        "book_id": book_id,
                        "page_number": 1,
                        "language_code": "zh",
                        "source_page_sha256": "sha",
                        "processor_version": "0.1.0",
                        "pipeline_version": "textplex-1",
                        "raw_text": '{"transcription":"科学边界。","sentence_texts":["科学边界。"],"sentence_translations":["Science frontier."],"page_translation":"Science frontier.","page_ends_with_sentence_terminator":true}',
                        "clean_text": '{"transcription":"科学边界。","sentence_texts":["科学边界。"],"sentence_translations":["Science frontier."],"page_translation":"Science frontier.","page_ends_with_sentence_terminator":true}',
                        "page_translation": None,
                        "sentences": [
                            {
                                "order": 1,
                                "text": '{"transcription":"科学边界。","sentence_texts":["科学边界。"],"sentence_translations":["Science frontier."],"page_translation":"Science frontier.","page_ends_with_sentence_terminator":true}',
                                "translation": None,
                                "tokens": [],
                                "grammar_patterns": [],
                                "ends_with_sentence_terminator": False,
                            }
                        ],
                        "page_ends_with_sentence_terminator": False,
                        "token_occurrences": [],
                        "lexical_entries": [],
                    }
                ],
                "lexical_entries": [],
                "token_occurrences": [],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    recovered = book_extraction_service.recover_book_extraction_result(
        BookExtractionResult.model_validate_json(artifact_path.read_text(encoding="utf-8")),
        data_root=data_root,
    )

    assert recovered.pages[0].raw_text == "科学边界。"
    assert recovered.pages[0].clean_text == "科学边界。"
    assert recovered.pages[0].page_translation == "Science frontier."
    assert recovered.pages[0].sentences[0].text == "科学边界。"
    assert recovered.pages[0].sentences[0].translation == "Science frontier."
    assert any(token.romanization for token in recovered.pages[0].sentences[0].tokens)


def test_get_book_extraction_route_recovers_jsonish_transcription(tmp_path: Path) -> None:
    source_pdf = build_safe_sample_pdf(tmp_path, page_count=1)
    data_root = tmp_path
    record = import_book_from_path(
        source_pdf,
        language_code="zh",
        title="三体",
        author="刘慈欣",
        page_start=1,
        page_count=1,
        data_root=data_root / "books",
    )

    artifact_path = data_root / "books" / record.id / "extractions" / "book-extraction.json"
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text(
        json.dumps(
            {
                "book_id": record.id,
                "source_path": record.source_path,
                "page_start": 1,
                "page_end": 1,
                "language_code": "zh",
                "pages": [
                    {
                        "book_id": record.id,
                        "page_number": 1,
                        "language_code": "zh",
                        "source_page_sha256": "sha",
                        "processor_version": "0.1.0",
                        "pipeline_version": "textplex-1",
                        "raw_text": '{"transcription":"科学边界。","sentence_texts":["科学边界。"],"sentence_translations":["Science frontier."],"page_translation":"Science frontier.","page_ends_with_sentence_terminator":true}',
                        "clean_text": '{"transcription":"科学边界。","sentence_texts":["科学边界。"],"sentence_translations":["Science frontier."],"page_translation":"Science frontier.","page_ends_with_sentence_terminator":true}',
                        "page_translation": None,
                        "sentences": [
                            {
                                "order": 1,
                                "text": '{"transcription":"科学边界。","sentence_texts":["科学边界。"],"sentence_translations":["Science frontier."],"page_translation":"Science frontier.","page_ends_with_sentence_terminator":true}',
                                "translation": None,
                                "tokens": [],
                                "grammar_patterns": [],
                                "ends_with_sentence_terminator": False,
                            }
                        ],
                        "page_ends_with_sentence_terminator": False,
                        "token_occurrences": [],
                        "lexical_entries": [],
                    }
                ],
                "lexical_entries": [],
                "token_occurrences": [],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    app.state.data_root = data_root
    client = TestClient(app)
    response = client.get(f"/books/{record.id}/extractions")

    assert response.status_code == 200
    payload = response.json()
    assert payload["pages"][0]["raw_text"] == "科学边界。"
    assert payload["pages"][0]["clean_text"] == "科学边界。"
    assert payload["pages"][0]["page_translation"] == "Science frontier."
