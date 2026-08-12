from __future__ import annotations

from pathlib import Path
from zipfile import ZIP_STORED, ZipFile

import pytest
from app.main import app
from app.services.book_extraction import extract_book_pages
from app.services.book_registry import import_book_from_path
from fastapi.testclient import TestClient


def _write_epub(path: Path) -> Path:
    with ZipFile(path, "w") as archive:
        archive.writestr("mimetype", "application/epub+zip", compress_type=ZIP_STORED)
        archive.writestr(
            "META-INF/container.xml",
            """<?xml version="1.0" encoding="UTF-8"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles><rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml" /></rootfiles>
</container>""",
        )
        archive.writestr(
            "OEBPS/package.opf",
            """<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>EPUB Sample</dc:title><dc:creator>Example Author</dc:creator>
  </metadata>
  <manifest>
    <item id="chapter-two" href="chapter-two.xhtml" media-type="application/xhtml+xml" />
    <item id="chapter-one" href="chapter-one.xhtml" media-type="application/xhtml+xml" />
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
  </manifest>
  <spine><itemref idref="chapter-one" /><itemref idref="chapter-two" /></spine>
</package>""",
        )
        archive.writestr(
            "OEBPS/chapter-one.xhtml",
            """<html><head><title>Hidden title</title><style>.hidden{display:none}</style></head>
<body><nav>Skip navigation</nav><h1>Chapter One</h1><p>Hello &amp; welcome.</p><p>First chapter.</p></body></html>""",
        )
        archive.writestr(
            "OEBPS/chapter-two.xhtml",
            """<html><body><h1>Chapter Two</h1><p>The second chapter follows.</p></body></html>""",
        )
    return path


@pytest.fixture(autouse=True)
def restore_app_data_root():
    original_data_root = app.state.data_root
    yield
    app.state.data_root = original_data_root


def test_import_epub_reads_metadata_in_spine_order_and_extracts_text(tmp_path: Path) -> None:
    epub_path = _write_epub(tmp_path / "sample.epub")
    data_root = tmp_path / "books"

    book = import_book_from_path(epub_path, language_code="en", data_root=data_root)
    artifacts = extract_book_pages(book=book, data_root=data_root, force=True)

    assert book.title == "EPUB Sample"
    assert book.author == "Example Author"
    assert book.source_filename == "sample.epub"
    assert book.total_pages == 2
    assert book.page_image_count == 2
    assert [artifact.text_source for artifact in artifacts] == ["epub", "epub"]
    assert artifacts[0].page.raw_text == "Chapter One Hello & welcome. First chapter."
    assert artifacts[1].page.raw_text == "Chapter Two The second chapter follows."
    assert (data_root / book.id / "pages" / "page-0001.png").exists()
    assert (data_root / book.id / "pages" / "page-0002.png").exists()


def test_upload_epub_endpoint_registers_epub_and_metadata(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    epub_path = _write_epub(tmp_path / "upload.epub")
    app.state.data_root = tmp_path / "data"
    monkeypatch.setattr("app.main._start_background_extraction", lambda *_args, **_kwargs: None)

    client = TestClient(app)
    with epub_path.open("rb") as file_handle:
        response = client.post(
            "/books/upload",
            data={"language_code": "en"},
            files={"file": ("upload.epub", file_handle, "application/epub+zip")},
        )

    assert response.status_code == 200
    record = response.json()
    assert record["source_filename"] == "upload.epub"
    assert record["title"] == "EPUB Sample"
    assert record["author"] == "Example Author"
    assert record["total_pages"] == 2
    assert record["page_image_count"] == 2


def test_upload_endpoint_rejects_unsupported_file_format(tmp_path: Path) -> None:
    app.state.data_root = tmp_path / "data"
    client = TestClient(app)

    response = client.post(
        "/books/upload",
        data={"language_code": "en"},
        files={"file": ("notes.txt", b"plain text", "text/plain")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "TextPlex import currently accepts PDF or EPUB files only."
