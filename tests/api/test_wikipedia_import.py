from __future__ import annotations

import json
import sqlite3
from typing import Self

from app.main import app
from app.services import wikipedia
from app.services.wikipedia import WikipediaArticle
from fastapi.testclient import TestClient


class _FakeResponse:
    def __enter__(self) -> Self:
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def read(self, _limit: int) -> bytes:
        return json.dumps(
            {
                "query": {
                    "pages": [
                        {
                            "title": "测试文章",
                            "extract": "第一段。\n\n\n第二段。",
                        }
                    ]
                }
            }
        ).encode("utf-8")


def test_fetch_random_article_uses_selected_wikipedia_language(monkeypatch) -> None:
    captured = {}
    monkeypatch.setenv("TEXTPLEX_WIKIPEDIA_MIN_ARTICLE_CHARACTERS", "1")

    def fake_urlopen(request, timeout):
        captured["url"] = request.full_url
        captured["timeout"] = timeout
        return _FakeResponse()

    monkeypatch.setattr(wikipedia, "urlopen", fake_urlopen)

    article = wikipedia.fetch_random_article("ZH")

    assert article.language_code == "zh"
    assert article.title == "测试文章"
    assert article.text == "第一段。\n\n第二段。"
    assert "zh.wikipedia.org" in captured["url"]
    assert "generator=random" in captured["url"]
    assert "grnnamespace=0" in captured["url"]
    assert captured["timeout"] == 12


def test_fetch_random_article_retries_short_articles(monkeypatch) -> None:
    extracts = iter(["太短。", "这是一个足够长的维基百科文章内容。"])
    calls = 0

    def fake_urlopen(_request, timeout):
        nonlocal calls
        calls += 1
        response = _FakeResponse()
        response.extract = next(extracts)
        assert timeout == 12
        return response

    monkeypatch.setenv("TEXTPLEX_WIKIPEDIA_MIN_ARTICLE_CHARACTERS", "10")
    monkeypatch.setattr(wikipedia, "urlopen", fake_urlopen)
    monkeypatch.setattr(_FakeResponse, "read", lambda self, _limit: json.dumps({"query": {"pages": [{"title": "测试文章", "extract": self.extract}]}}).encode("utf-8"))

    article = wikipedia.fetch_random_article("zh")

    assert article.text == "这是一个足够长的维基百科文章内容。"
    assert calls == 2


def test_fetch_random_article_rejects_only_short_articles(monkeypatch) -> None:
    monkeypatch.setenv("TEXTPLEX_WIKIPEDIA_MIN_ARTICLE_CHARACTERS", "100")
    monkeypatch.setenv("TEXTPLEX_WIKIPEDIA_MAX_ARTICLE_ATTEMPTS", "2")
    monkeypatch.setattr(wikipedia, "urlopen", lambda _request, timeout: _FakeResponse())

    try:
        wikipedia.fetch_random_article("zh")
    except wikipedia.WikipediaImportError as exc:
        assert "short articles" in str(exc)
    else:
        raise AssertionError("Expected short Wikipedia articles to be rejected")


def test_fetch_random_article_rejects_unsupported_language() -> None:
    try:
        wikipedia.fetch_random_article("en")
    except ValueError as exc:
        assert "not available" in str(exc)
    else:
        raise AssertionError("Expected unsupported language to be rejected")


def test_random_wikipedia_import_reuses_text_import_pipeline(tmp_path, monkeypatch) -> None:
    original_data_root = app.state.data_root
    app.state.data_root = tmp_path
    monkeypatch.setattr(
        "app.main.fetch_random_article",
        lambda _language_code: WikipediaArticle(language_code="zh", title="随机文章", text="这是第一句。\n这是第二句。"),
    )
    try:
        response = TestClient(app).post("/wikipedia/random-import", json={"language_code": "zh"})
    finally:
        app.state.data_root = original_data_root

    assert response.status_code == 200
    payload = response.json()
    assert payload["title"] == "随机文章"
    assert payload["author"] == "Wikipedia"
    assert payload["language_code"] == "zh"


def test_random_wikipedia_import_supports_russian_articles(tmp_path, monkeypatch) -> None:
    original_data_root = app.state.data_root
    app.state.data_root = tmp_path
    monkeypatch.setattr(
        "app.main.fetch_random_article",
        lambda _language_code: WikipediaArticle(language_code="ru", title="Русская статья", text="Это русская статья. Здесь есть второй текстовый абзац."),
    )

    def fail_lexicon_lookup(**_kwargs):
        raise sqlite3.OperationalError("simulated lexicon schema failure")

    monkeypatch.setattr("app.services.book_extraction.lookup_lexicon_entry_map", fail_lexicon_lookup)
    monkeypatch.setattr("app.services.book_extraction.lookup_lexicon_pinyin_map", fail_lexicon_lookup)
    try:
        response = TestClient(app).post("/wikipedia/random-import", json={"language_code": "ru"})
    finally:
        app.state.data_root = original_data_root

    assert response.status_code == 200
    assert response.json()["language_code"] == "ru"
