from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.books import BookRecord


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
