from pathlib import Path

import pytest

from app.schemas.books import BookRecord
from app.services.book_registry import import_book_from_path


SOURCE_FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "books" / "alice-mini"
SAMPLE_PAGE_START = 1
SAMPLE_PAGE_COUNT = 4


@pytest.fixture(autouse=True)
def restore_app_data_root():
    from app.main import app

    original_data_root = app.state.data_root
    yield
    app.state.data_root = original_data_root


@pytest.fixture
def imported_real_scan(tmp_path: Path) -> tuple[Path, BookRecord]:
    if not SOURCE_FIXTURE.exists():
        pytest.skip(f"Missing source fixture: {SOURCE_FIXTURE}")

    record = import_book_from_path(
        SOURCE_FIXTURE,
        language_code="en",
        page_start=SAMPLE_PAGE_START,
        page_count=SAMPLE_PAGE_COUNT,
        data_root=tmp_path / "books",
    )
    return tmp_path, record
