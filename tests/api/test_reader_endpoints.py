from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.books import BookRecord
from app.services.lexicon import import_lexicon_from_source


def test_list_books_returns_imported_sample(imported_real_scan: tuple[Path, BookRecord]) -> None:
    data_root, record = imported_real_scan

    app.state.data_root = data_root
    client = TestClient(app)

    response = client.get("/books")

    assert response.status_code == 200
    books = response.json()
    assert any(book["id"] == record.id for book in books)


def test_get_reader_page_returns_page_payload_and_image(imported_real_scan: tuple[Path, BookRecord]) -> None:
    data_root, record = imported_real_scan

    app.state.data_root = data_root
    client = TestClient(app)

    extract_response = client.post(
        f"/books/{record.id}/extract",
        json={"page_start": 1, "page_count": 4},
    )
    assert extract_response.status_code == 200

    page_response = client.get(f"/books/{record.id}/pages/1")
    assert page_response.status_code == 200
    page = page_response.json()
    assert page["book"]["id"] == record.id
    assert page["page"]["page_number"] == 1
    assert page["extraction"]["page"]["page_number"] == 1
    assert page["image_url"] == f"/books/{record.id}/pages/1/image"

    image_response = client.get(f"/books/{record.id}/pages/1/image")
    assert image_response.status_code == 200
    assert image_response.headers["content-type"] == "image/png"


def test_delete_book_removes_registry_entry(imported_real_scan: tuple[Path, BookRecord]) -> None:
    data_root, record = imported_real_scan

    app.state.data_root = data_root
    client = TestClient(app)

    delete_response = client.delete(f"/books/{record.id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "deleted"

    list_response = client.get("/books")
    assert list_response.status_code == 200
    assert all(book["id"] != record.id for book in list_response.json())

    missing_response = client.get(f"/books/{record.id}")
    assert missing_response.status_code == 404


def test_parse_text_endpoint_returns_tokenized_sentences(tmp_path: Path) -> None:
    app.state.data_root = tmp_path
    client = TestClient(app)

    response = client.post(
        "/texts/parse",
        json={
            "text": "我一直觉得宇宙像一张巨大而安静的网。它看不见，却一直在拉扯着所有人。",
            "language_code": "zh",
            "title": "Local article",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["text_source"] == "paste"
    assert payload["page"]["book_id"] == "local-article"
    assert payload["page"]["page_number"] == 1
    assert len(payload["page"]["sentences"]) == 2
    assert len(payload["page"]["sentences"][0]["tokens"]) > 0


def test_parse_text_endpoint_uses_imported_lexicon_pinyin(tmp_path: Path) -> None:
    source_root = tmp_path / "source"
    csv_root = source_root / "CSV Files"
    csv_root.mkdir(parents=True, exist_ok=True)
    (csv_root / "Chinese Character Recognition - Full Vocabulary List.csv").write_text(
        "No,Chinese,Pinyin,English,HSK Level\n"
        "1,宇宙,yǔzhòu,universe,4\n",
        encoding="utf-8",
    )
    (csv_root / "Chinese Character Recognition - Full Characters.csv").write_text(
        "id,Character,HanziDB Character Link,Pinyin,Tone,Definition,Radical,HanziDB Radical Link,Stroke count,HSK level,TGL,TGL #,Frequency rank,Note,#,Length,Radical Order,General Standard #\n"
        "1,宇,http://example.com,yǔ,3,universe,宀,http://example.com,6,4,G1,1,12,note,1,1,1,1\n",
        encoding="utf-8",
    )

    app.state.data_root = tmp_path / "data"
    import_lexicon_from_source(source_root, data_root=app.state.data_root, replace_existing=True)
    client = TestClient(app)

    response = client.post(
        "/texts/parse",
        json={
            "text": "宇宙",
            "language_code": "zh",
            "title": "Lexicon sample",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    token = payload["page"]["sentences"][0]["tokens"][0]
    assert token["surface_form"] == "宇宙"
    assert token["romanization"] == "yǔzhòu"
