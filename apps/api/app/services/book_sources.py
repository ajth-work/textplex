from __future__ import annotations

import hashlib
import json
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


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
        raise ValueError(f"Invalid text fixture manifest: {source_path}")

    loaded_pages: list[tuple[int, Path, str]] = []
    for index, relative_page_path in enumerate(pages, start=1):
        if not isinstance(relative_page_path, str):
            raise ValueError(f"Invalid page path in text fixture manifest: {source_path}")
        page_path = source_path / relative_page_path
        if not page_path.exists():
            raise FileNotFoundError(f"Text fixture page not found: {page_path}")
        loaded_pages.append((index, page_path, page_path.read_text(encoding="utf-8")))

    return loaded_pages


def hash_text_fixture_source(source_path: Path) -> str:
    manifest = load_text_fixture_manifest(source_path)
    pages = manifest.get("pages")
    if not isinstance(pages, list):
        raise ValueError(f"Invalid text fixture manifest: {source_path}")

    digest = hashlib.sha256()
    digest.update((source_path / "manifest.json").read_bytes())
    for relative_page_path in pages:
        if not isinstance(relative_page_path, str):
            raise ValueError(f"Invalid page path in text fixture manifest: {source_path}")
        page_path = source_path / relative_page_path
        digest.update(relative_page_path.encode("utf-8"))
        digest.update(page_path.read_bytes())
    return digest.hexdigest()


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
