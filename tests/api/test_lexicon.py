import json
import sqlite3
from contextlib import closing
from pathlib import Path

from app.services import google_translate
from app.services.google_translate_usage import (
    get_google_translate_usage_summary,
    record_google_translate_usage,
)
from app.services.lexicon import (
    import_lexicon_from_source,
    lookup_lexicon_entry,
    lookup_lexicon_entry_map,
    lookup_lexicon_pinyin_map,
)
from typing_extensions import Self


def test_import_and_lookup_lexicon_from_canonical_sqlite_pack(tmp_path: Path) -> None:
    source_root = tmp_path / "source"
    source_root.mkdir()

    with closing(sqlite3.connect(source_root / "lexicon.sqlite3")) as connection:
        connection.executescript(
            """
            CREATE TABLE lexicon_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                language_code TEXT NOT NULL,
                entry_type TEXT NOT NULL,
                surface_form TEXT NOT NULL,
                pinyin TEXT,
                definition TEXT,
                hsk_level TEXT,
                frequency_rank INTEGER,
                note TEXT,
                source_name TEXT,
                source_path TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            INSERT INTO lexicon_entries (
                language_code,
                entry_type,
                surface_form,
                pinyin,
                definition,
                hsk_level,
                frequency_rank,
                note,
                source_name,
                source_path
            ) VALUES (
                'ja',
                'word',
                '坊っちゃん',
                'ぼっちゃん',
                'a boy',
                'N4',
                1,
                'sample entry',
                'lexicon.sqlite3',
                'lexicon.sqlite3'
            );
            """
        )
        connection.commit()

    data_root = tmp_path / "data"
    summary = import_lexicon_from_source(source_root, data_root=data_root, language_code="ja", replace_existing=True)

    assert summary.vocabulary_rows == 1
    assert summary.character_rows == 0
    assert summary.imported_rows == 1

    lookup = lookup_lexicon_entry(data_root=data_root, language_code="ja", term="坊っちゃん")
    assert lookup.query == "坊っちゃん"
    assert lookup.entries[0].definition == "a boy"
    assert lookup.entries[0].pinyin == "ぼっちゃん"


def test_import_and_lookup_lexicon_from_csv_assets(tmp_path: Path) -> None:
    source_root = tmp_path / "source"
    csv_root = source_root / "CSV Files"
    csv_root.mkdir(parents=True)

    (csv_root / "Chinese Character Recognition - Full Vocabulary List.csv").write_text(
        "No,Chinese,Pinyin,English,HSK Level\n"
        "1,三体,san ti,The Three-Body Problem,4\n",
        encoding="utf-8",
    )
    (csv_root / "Chinese Character Recognition - Full Characters.csv").write_text(
        "id,Character,HanziDB Character Link,Pinyin,Tone,Definition,Radical,HanziDB Radical Link,Stroke count,HSK level,TGL,TGL #,Frequency rank,Note,#,Length,Radical Order,General Standard #\n"
        "1,三,http://example.com,shan,1,three,一,http://example.com,3,1,G1,1,12,number,1,1,1,1\n",
        encoding="utf-8",
    )

    data_root = tmp_path / "data"
    summary = import_lexicon_from_source(source_root, data_root=data_root, replace_existing=True)

    assert summary.vocabulary_rows == 1
    assert summary.character_rows == 1
    assert summary.imported_rows == 2

    lookup = lookup_lexicon_entry(data_root=data_root, language_code="zh", term="三体")
    assert lookup.query == "三体"
    assert lookup.entries[0].definition == "The Three-Body Problem"
    assert lookup.entries[0].entry_type == "word"


def test_import_and_lookup_lexicon_from_korean_pack(tmp_path: Path) -> None:
    source_root = Path(__file__).resolve().parents[2] / "resources" / "lexicon" / "korean"
    data_root = tmp_path / "data"

    summary = import_lexicon_from_source(source_root, data_root=data_root, language_code="ko", replace_existing=True)

    assert summary.vocabulary_rows > 5000
    assert summary.character_rows == 0
    assert summary.imported_rows >= summary.vocabulary_rows

    lookup = lookup_lexicon_entry(data_root=data_root, language_code="ko", term="가다")
    assert lookup.query == "가다"
    assert lookup.language_code == "ko"
    assert "to go" in lookup.entries[0].definition
    assert lookup.entries[0].pinyin == "gada"

    lookup = lookup_lexicon_entry(data_root=data_root, language_code="ko", term="아침")
    assert lookup.query == "아침"
    assert lookup.language_code == "ko"
    assert lookup.entries[0].definition == "morning"
    assert lookup.entries[0].pinyin == "achim"


def test_import_and_lookup_lexicon_from_russian_pack(tmp_path: Path) -> None:
    source_root = Path(__file__).resolve().parents[2] / "resources" / "lexicon" / "russian"
    data_root = tmp_path / "data"

    summary = import_lexicon_from_source(source_root, data_root=data_root, language_code="ru", replace_existing=True)

    assert summary.vocabulary_rows > 3000
    assert summary.character_rows == 0
    assert summary.imported_rows >= summary.vocabulary_rows

    lookup = lookup_lexicon_entry(data_root=data_root, language_code="ru", term="и")
    assert lookup.query == "и"
    assert lookup.language_code == "ru"
    assert lookup.entries[0].definition == "and"
    assert lookup.entries[0].pinyin == "i"

    lookup = lookup_lexicon_entry(data_root=data_root, language_code="ru", term="дом")
    assert lookup.query == "дом"
    assert lookup.language_code == "ru"
    assert lookup.entries[0].definition == "house"
    assert lookup.entries[0].pinyin == "dom"

    lookup = lookup_lexicon_entry(data_root=data_root, language_code="ru", term="сентября")
    assert lookup.query == "сентября"
    assert lookup.language_code == "ru"
    assert lookup.entries[0].surface_form == "сентябрь"
    assert lookup.entries[0].pinyin == "sentyabr"
    assert lookup.resolution_source == "local"
    assert lookup.match_confidence == 0.95
    assert lookup.matched_term == "сентябрь"

    entry_map = lookup_lexicon_entry_map(data_root=data_root, language_code="ru", terms=["сентября"])
    assert entry_map["сентября"].surface_form == "сентябрь"
    assert entry_map["сентября"].definition == "september"

    pinyin_map = lookup_lexicon_pinyin_map(data_root=data_root, language_code="ru", terms=["сентября"])
    assert pinyin_map["сентября"] == "sentyabr"


def test_lookup_lexicon_entry_falls_back_without_seed_pack(tmp_path: Path, monkeypatch) -> None:
    data_root = tmp_path / "data"

    monkeypatch.setattr("app.services.lexicon.is_google_translate_configured", lambda: True)
    monkeypatch.setattr("app.services.lexicon.translate_text", lambda source_text, *, source_language_code, target_language_code="en": "good morning")

    lookup = lookup_lexicon_entry(
        data_root=data_root,
        language_code="ja",
        term="\u4eca\u65e5",
        allow_google_fallback=True,
    )

    assert lookup.entries
    assert lookup.entries[0].definition == "good morning"
    assert lookup.resolution_source == "google_translate_live"


def test_lookup_seeds_missing_language_into_existing_database(tmp_path: Path) -> None:
    source_root = tmp_path / "source"
    source_root.mkdir()

    with closing(sqlite3.connect(source_root / "lexicon.sqlite3")) as connection:
        connection.executescript(
            """
            CREATE TABLE lexicon_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                language_code TEXT NOT NULL,
                entry_type TEXT NOT NULL,
                surface_form TEXT NOT NULL,
                pinyin TEXT,
                definition TEXT,
                hsk_level TEXT,
                frequency_rank INTEGER,
                note TEXT,
                source_name TEXT,
                source_path TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            INSERT INTO lexicon_entries (
                language_code,
                entry_type,
                surface_form,
                pinyin,
                definition,
                hsk_level,
                frequency_rank,
                note,
                source_name,
                source_path
            ) VALUES (
                'zh',
                'word',
                '三体',
                'san ti',
                'The Three-Body Problem',
                '4',
                1,
                'sample entry',
                'lexicon.sqlite3',
                'lexicon.sqlite3'
            );
            """
        )
        connection.commit()

    data_root = tmp_path / "data"
    import_lexicon_from_source(source_root, data_root=data_root, language_code="zh", replace_existing=True)

    lookup = lookup_lexicon_entry(data_root=data_root, language_code="ko", term="가게")
    assert lookup.language_code == "ko"
    assert lookup.entries
    assert lookup.entries[0].definition == "store; shop"


def test_translate_text_uses_google_service_account_and_returns_translation(tmp_path: Path, monkeypatch) -> None:
    seen: dict[str, object] = {}
    credentials_path = tmp_path / "google-service-account.json"
    credentials_path.write_text("{}", encoding="utf-8")

    class FakeResponse:
        def __enter__(self) -> Self:
            return self

        def __exit__(self, exc_type, exc, tb) -> bool:
            return False

        @property
        def status(self) -> int:
            return 200

        @property
        def headers(self):
            return {}

        def read(self) -> bytes:
            return json.dumps({"data": {"translations": [{"translatedText": "morning"}]}}).encode("utf-8")

    class FakeCredentials:
        def __init__(self) -> None:
            self.valid = False
            self.token = None
            self.refresh_calls = 0

        def refresh(self, request) -> None:
            self.refresh_calls += 1
            seen["refresh_request_type"] = type(request).__name__
            self.token = "test-token"
            self.valid = True

    def fake_urlopen(request, timeout=10):
        seen["url"] = request.full_url
        seen["timeout"] = timeout
        if request.full_url == "https://oauth2.googleapis.com/token":
            seen["token_request_body"] = request.data.decode("utf-8")

            class FakeTokenResponse:
                def __enter__(self) -> Self:
                    return self

                def __exit__(self, exc_type, exc, tb) -> bool:
                    return False

                @property
                def status(self) -> int:
                    return 200

                @property
                def headers(self):
                    return {}

                def read(self) -> bytes:
                    return json.dumps(
                        {
                            "access_token": "test-token",
                            "expires_in": 3600,
                            "token_type": "Bearer",
                        }
                    ).encode("utf-8")

            return FakeTokenResponse()

        seen["body"] = json.loads(request.data.decode("utf-8"))
        seen["authorization"] = request.get_header("Authorization")
        return FakeResponse()

    monkeypatch.setenv("GOOGLE_APPLICATION_CREDENTIALS", str(credentials_path))
    google_translate._load_google_credentials.cache_clear()
    google_translate._load_google_project_id.cache_clear()
    monkeypatch.setattr(google_translate, "google_auth_default", lambda scopes: (FakeCredentials(), "test-project"))
    monkeypatch.setattr(google_translate.urllib.request, "urlopen", fake_urlopen)

    assert google_translate.translate_text("아침", source_language_code="ko") == "morning"
    assert seen["url"] == "https://translation.googleapis.com/language/translate/v2"
    assert seen["body"] == {
        "q": "아침",
        "source": "ko",
        "target": "en",
        "format": "text",
        "model": "nmt",
    }
    assert seen["authorization"] == "Bearer test-token"
    assert seen["refresh_request_type"] == "_UrlLibRequest"
    assert seen["timeout"] == 10


def test_romanize_text_uses_google_service_account_and_returns_romanized_text(tmp_path: Path, monkeypatch) -> None:
    seen: dict[str, object] = {}
    credentials_path = tmp_path / "google-service-account.json"
    credentials_path.write_text('{"project_id":"test-project"}', encoding="utf-8")

    class FakeCredentials:
        def __init__(self) -> None:
            self.valid = False
            self.token = None
            self.refresh_calls = 0

        def refresh(self, request) -> None:
            self.refresh_calls += 1
            seen["refresh_request_type"] = type(request).__name__
            self.token = "test-token"
            self.valid = True

    def fake_urlopen(request, timeout=10):
        seen["url"] = request.full_url
        seen["timeout"] = timeout
        if request.full_url == "https://oauth2.googleapis.com/token":
            seen["token_request_body"] = request.data.decode("utf-8")

            class FakeTokenResponse:
                def __enter__(self) -> Self:
                    return self

                def __exit__(self, exc_type, exc, tb) -> bool:
                    return False

                @property
                def status(self) -> int:
                    return 200

                @property
                def headers(self):
                    return {}

                def read(self) -> bytes:
                    return json.dumps(
                        {
                            "access_token": "test-token",
                            "expires_in": 3600,
                            "token_type": "Bearer",
                        }
                    ).encode("utf-8")

            return FakeTokenResponse()

        seen["body"] = json.loads(request.data.decode("utf-8"))
        seen["authorization"] = request.get_header("Authorization")
        class FakeRomanizeResponse:
            def __enter__(self) -> Self:
                return self

            def __exit__(self, exc_type, exc, tb) -> bool:
                return False

            @property
            def status(self) -> int:
                return 200

            @property
            def headers(self):
                return {}

            def read(self) -> bytes:
                return json.dumps({"romanizations": [{"romanizedText": "privet"}]}).encode("utf-8")

        return FakeRomanizeResponse()

    monkeypatch.setenv("GOOGLE_APPLICATION_CREDENTIALS", str(credentials_path))
    google_translate._load_google_credentials.cache_clear()
    google_translate._load_google_project_id.cache_clear()
    monkeypatch.setattr(google_translate, "google_auth_default", lambda scopes: (FakeCredentials(), "test-project"))
    monkeypatch.setattr(google_translate.urllib.request, "urlopen", fake_urlopen)

    assert google_translate.romanize_text("привет", source_language_code="ru") == "privet"
    assert seen["url"] == "https://translation.googleapis.com/v3/projects/test-project/locations/global:romanizeText"
    assert seen["body"] == {
        "source_language_code": "ru",
        "contents": ["привет"],
    }
    assert seen["authorization"] == "Bearer test-token"
    assert seen["refresh_request_type"] == "_UrlLibRequest"
    assert seen["timeout"] == 10


def test_lookup_lexicon_entry_uses_google_translation_fallback_and_cache(tmp_path: Path, monkeypatch) -> None:
    data_root = tmp_path / "data"
    calls: list[tuple[str, str, str]] = []
    credentials_path = tmp_path / "google-service-account.json"
    credentials_path.write_text("{}", encoding="utf-8")

    monkeypatch.setenv("GOOGLE_APPLICATION_CREDENTIALS", str(credentials_path))
    google_translate._load_google_credentials.cache_clear()
    google_translate._load_google_project_id.cache_clear()

    def fake_translate_text(source_text: str, *, source_language_code: str, target_language_code: str = "en") -> str:
        calls.append((source_text, source_language_code, target_language_code))
        return "fake meaning"

    def fake_romanize_text(source_text: str, *, source_language_code: str) -> str:
        calls.append((source_text, source_language_code, "romanize"))
        return "fake reading"

    monkeypatch.setattr("app.services.lexicon.translate_text", fake_translate_text)
    monkeypatch.setattr("app.services.lexicon.romanize_text", fake_romanize_text)

    lookup = lookup_lexicon_entry(
        data_root=data_root,
        language_code="ko",
        term="가짜단어",
        allow_google_fallback=True,
    )

    assert lookup.entries
    assert lookup.entries[0].definition == "fake meaning"
    assert lookup.entries[0].pronunciation == "fake reading"
    assert lookup.entries[0].source_name == "Google Cloud Translation"
    assert lookup.resolution_source == "google_translate_live"
    assert calls == [("가짜단어", "ko", "en"), ("가짜단어", "ko", "romanize")]

    def fail_translate_text(*args, **kwargs) -> str:
        raise AssertionError("cache should satisfy the second lookup")

    monkeypatch.setattr("app.services.lexicon.translate_text", fail_translate_text)
    cached_lookup = lookup_lexicon_entry(
        data_root=data_root,
        language_code="ko",
        term="가짜단어",
        allow_google_fallback=True,
    )

    assert cached_lookup.entries
    assert cached_lookup.entries[0].definition == "fake meaning"
    assert cached_lookup.entries[0].pronunciation == "fake reading"
    assert cached_lookup.resolution_source == "google_translate_cache"
    usage_summary = get_google_translate_usage_summary(data_root)
    assert usage_summary.request_count == 2
    assert usage_summary.character_count == len("가짜단어") * 2
    assert usage_summary.free_remaining_characters == usage_summary.free_tier_limit - len("가짜단어") * 2


def test_google_translate_usage_is_account_scoped_without_losing_service_total(tmp_path: Path) -> None:
    data_root = tmp_path / "data"
    record_google_translate_usage(data_root=data_root, characters=10, owner_id="user-a")
    record_google_translate_usage(data_root=data_root, characters=4, owner_id="user-b")

    first = get_google_translate_usage_summary(data_root, owner_id="user-a")
    second = get_google_translate_usage_summary(data_root, owner_id="user-b")
    service = get_google_translate_usage_summary(data_root)

    assert first.scope == "account"
    assert first.character_count == 10
    assert second.character_count == 4
    assert service.scope == "service"
    assert service.character_count == 14
