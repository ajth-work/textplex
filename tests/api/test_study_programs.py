from __future__ import annotations

from pathlib import Path

from app.main import app
from app.services.lexicon import import_lexicon_from_source
from fastapi.testclient import TestClient


def test_study_surface_exposes_language_program_levels(tmp_path: Path) -> None:
    app.state.data_root = tmp_path
    client = TestClient(app)

    source_root = Path(__file__).resolve().parents[2] / "resources" / "lexicon" / "russian"
    summary = import_lexicon_from_source(source_root, data_root=tmp_path, language_code="ru", replace_existing=True)
    assert summary.vocabulary_rows > 0

    study_response = client.get("/study", params={"language_code": "ru"})
    assert study_response.status_code == 200
    study = study_response.json()

    assert study["study_programs"]
    russian_program = next(program for program in study["study_programs"] if program["language_code"] == "ru")
    assert russian_program["program_code"] == "ru-core"
    assert russian_program["program_source_label"] == "RU5000"
    assert russian_program["level_count"] >= 1

    first_level = russian_program["levels"][0]
    assert first_level["level_code"] == "level-1"
    assert first_level["item_count"] > 0
    assert first_level["items"][0]["progress_state"] in {"new", "learning", "review", "mastered"}
    assert first_level["items"][0]["language_code"] == "ru"
