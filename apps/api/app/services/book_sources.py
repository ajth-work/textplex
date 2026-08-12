from __future__ import annotations

import hashlib
import json
import posixpath
import textwrap
import zipfile
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import ClassVar
from urllib.parse import unquote
from xml.etree import ElementTree

from PIL import Image, ImageDraw, ImageFont
from processor import normalize_text

EPUB_TEXT_SOURCE = "epub"
EPUB_TEXT_SOURCE_SIGNATURE = "epub-text-v1"


@dataclass(frozen=True)
class EpubPage:
    href: str
    text: str


@dataclass(frozen=True)
class EpubDocument:
    title: str | None
    author: str | None
    pages: tuple[EpubPage, ...]


class _EpubTextParser(HTMLParser):
    _BLOCK_TAGS: ClassVar[set[str]] = {
        "article",
        "blockquote",
        "br",
        "dd",
        "div",
        "dt",
        "figcaption",
        "figure",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "header",
        "li",
        "p",
        "pre",
        "section",
        "td",
        "th",
        "tr",
    }
    _SKIP_TAGS: ClassVar[set[str]] = {"head", "nav", "script", "style", "svg"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._parts: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        normalized_tag = tag.lower()
        if normalized_tag in self._SKIP_TAGS:
            self._skip_depth += 1
            return
        if self._skip_depth == 0 and normalized_tag in self._BLOCK_TAGS:
            self._parts.append("\n")

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        normalized_tag = tag.lower()
        if normalized_tag in self._SKIP_TAGS:
            self._skip_depth = max(0, self._skip_depth - 1)
            return
        if self._skip_depth == 0 and normalized_tag in self._BLOCK_TAGS:
            self._parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self._skip_depth == 0:
            self._parts.append(data)

    def text(self) -> str:
        lines = [" ".join(line.split()) for line in "".join(self._parts).splitlines()]
        return normalize_text("\n".join(line for line in lines if line))


def is_epub_source(source_path: Path) -> bool:
    return source_path.is_file() and source_path.suffix.lower() == ".epub"


def _xml_local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def _epub_path(base_path: str, relative_path: str) -> str:
    decoded_path = unquote(relative_path.split("#", 1)[0]).replace("\\", "/")
    return posixpath.normpath(posixpath.join(posixpath.dirname(base_path), decoded_path)).lstrip("/")


def _epub_metadata(rootfile_path: str, opf_root: ElementTree.Element) -> tuple[str | None, str | None, list[str]]:
    title: str | None = None
    author: str | None = None
    manifest: dict[str, tuple[str, str]] = {}
    spine_ids: list[str] = []

    for element in opf_root.iter():
        local_name = _xml_local_name(element.tag)
        if local_name == "title" and title is None and element.text:
            title = element.text.strip() or None
        elif local_name == "creator" and author is None and element.text:
            author = element.text.strip() or None
        elif local_name == "item":
            item_id = element.attrib.get("id")
            href = element.attrib.get("href")
            media_type = element.attrib.get("media-type", "")
            if item_id and href:
                manifest[item_id] = (href, media_type)
        elif local_name == "itemref":
            item_id = element.attrib.get("idref")
            if item_id:
                spine_ids.append(item_id)

    spine_paths = [
        _epub_path(rootfile_path, manifest[item_id][0])
        for item_id in spine_ids
        if item_id in manifest and manifest[item_id][1].lower() in {"application/xhtml+xml", "text/html", "application/x-dtbook+xml"}
    ]
    if not spine_paths:
        spine_paths = [
            _epub_path(rootfile_path, href)
            for href, media_type in manifest.values()
            if media_type.lower() in {"application/xhtml+xml", "text/html", "application/x-dtbook+xml"}
        ]
    return title, author, spine_paths


def load_epub_document(source_path: Path) -> EpubDocument:
    try:
        with zipfile.ZipFile(source_path) as archive:
            total_uncompressed = sum(info.file_size for info in archive.infolist())
            if total_uncompressed > 64 * 1024 * 1024:
                raise ValueError("The EPUB exceeds the configured uncompressed size limit.")

            container_root = ElementTree.fromstring(archive.read("META-INF/container.xml"))
            rootfile_path = next(
                (
                    element.attrib.get("full-path")
                    for element in container_root.iter()
                    if _xml_local_name(element.tag) == "rootfile" and element.attrib.get("full-path")
                ),
                None,
            )
            if not rootfile_path:
                raise ValueError("The EPUB container does not declare a package document.")
            rootfile_path = unquote(rootfile_path).replace("\\", "/").lstrip("/")
            opf_root = ElementTree.fromstring(archive.read(rootfile_path))
            title, author, spine_paths = _epub_metadata(rootfile_path, opf_root)

            pages: list[EpubPage] = []
            archive_names = set(archive.namelist())
            for page_path in spine_paths:
                if page_path not in archive_names:
                    continue
                parser = _EpubTextParser()
                parser.feed(archive.read(page_path).decode("utf-8", errors="replace"))
                parser.close()
                page_text = parser.text()
                if page_text:
                    pages.append(EpubPage(href=page_path, text=page_text))

            if not pages:
                raise ValueError("The EPUB does not contain readable text in its spine.")
            return EpubDocument(title=title, author=author, pages=tuple(pages))
    except (KeyError, zipfile.BadZipFile, ElementTree.ParseError, UnicodeDecodeError) as exc:
        raise ValueError("The EPUB is not a valid readable EPUB file.") from exc


def load_epub_pages(source_path: Path) -> list[tuple[int, str, str]]:
    document = load_epub_document(source_path)
    return [(index, page.href, page.text) for index, page in enumerate(document.pages, start=1)]


def hash_epub_source(source_path: Path) -> str:
    return hashlib.sha256(source_path.read_bytes()).hexdigest()


def is_text_fixture_source(source_path: Path) -> bool:
    return source_path.is_dir() and (source_path / "manifest.json").exists() and (source_path / "pages").is_dir()


def load_text_fixture_manifest(source_path: Path) -> dict[str, object]:
    manifest_path = source_path / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"Text fixture manifest not found: {manifest_path}")
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def load_text_fixture_pages(source_path: Path) -> list[tuple[int, Path, str]]:
    manifest = load_text_fixture_manifest(source_path)
    pages = manifest.get("pages")
    if not isinstance(pages, list):
        raise TypeError(f"Invalid text fixture manifest: {source_path}")

    loaded_pages: list[tuple[int, Path, str]] = []
    for index, relative_page_path in enumerate(pages, start=1):
        if not isinstance(relative_page_path, str):
            raise TypeError(f"Invalid page path in text fixture manifest: {source_path}")
        page_path = source_path / relative_page_path
        if not page_path.exists():
            raise FileNotFoundError(f"Text fixture page not found: {page_path}")
        loaded_pages.append((index, page_path, page_path.read_text(encoding="utf-8")))

    return loaded_pages


def hash_text_fixture_source(source_path: Path) -> str:
    manifest = load_text_fixture_manifest(source_path)
    pages = manifest.get("pages")
    if not isinstance(pages, list):
        raise TypeError(f"Invalid text fixture manifest: {source_path}")

    digest = hashlib.sha256()
    digest.update((source_path / "manifest.json").read_bytes())
    for relative_page_path in pages:
        if not isinstance(relative_page_path, str):
            raise TypeError(f"Invalid page path in text fixture manifest: {source_path}")
        page_path = source_path / relative_page_path
        digest.update(relative_page_path.encode("utf-8"))
        digest.update(page_path.read_bytes())
    return digest.hexdigest()


def write_text_fixture_source(
    source_path: Path,
    *,
    text: str,
    language_code: str,
    title: str = "Pasted text",
    source_work: str = "Pasted text input",
    author: str | None = None,
) -> Path:
    clean_text = normalize_text(text)
    if not clean_text:
        raise ValueError("TextPlex text import requires non-empty text.")

    source_path.mkdir(parents=True, exist_ok=True)
    pages_dir = source_path / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)

    page_filename = "001.txt"
    page_path = pages_dir / page_filename
    page_path.write_text(clean_text, encoding="utf-8")
    page_paths = [f"pages/{page_filename}"]

    manifest = {
        "fixture_id": source_path.name,
        "title": title,
        "source_work": source_work,
        "author": author,
        "language_code": language_code,
        "license": "TextPlex local pasted text",
        "page_count": len(page_paths),
        "source_page_start": 1,
        "source_page_end": len(page_paths),
        "pages": page_paths,
    }
    (source_path / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    return source_path


def render_text_page_image(page_text: str, image_path: Path, *, book_title: str, page_number: int) -> None:
    image = Image.new("RGB", (1240, 1754), color="white")
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()

    x = 80
    y = 80
    line_height = 16

    def draw_line(text: str, *, gap_after: int = 0) -> None:
        nonlocal y
        draw.text((x, y), text, fill="black", font=font)
        y += line_height + gap_after

    draw_line(book_title, gap_after=8)
    draw_line(f"Page {page_number}", gap_after=16)

    for paragraph in page_text.splitlines():
        stripped = paragraph.strip()
        if not stripped:
            y += line_height
            continue
        for wrapped_line in textwrap.wrap(stripped, width=90):
            draw_line(wrapped_line)
        y += 8

    image_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(image_path)
