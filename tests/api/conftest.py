from pathlib import Path

import pytest

from app.schemas.books import BookRecord
from app.services.book_registry import import_book_from_path


SOURCE_PDF = Path(
    r"Z:\FastFoto\Personal\Finished Book Scans\Chinese Books\Three-Body Problem (ZH) (ClearScan).pdf"
)
SAMPLE_PAGE_START = 8
SAMPLE_PAGE_COUNT = 4


@pytest.fixture(scope="module")
def imported_real_scan(tmp_path_factory: pytest.TempPathFactory) -> tuple[Path, BookRecord]:
    if not SOURCE_PDF.exists():
        pytest.skip(f"Missing source fixture: {SOURCE_PDF}")

    data_root = tmp_path_factory.mktemp("textplex-books")
    record = import_book_from_path(
        SOURCE_PDF,
        language_code="zh",
        title="三体",
        author="刘慈欣",
        page_start=SAMPLE_PAGE_START,
        page_count=SAMPLE_PAGE_COUNT,
        data_root=data_root / "books",
    )
    return data_root, record
