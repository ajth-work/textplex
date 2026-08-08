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


def test_study_surface_exposes_authored_starter_levels_for_supported_languages(tmp_path: Path) -> None:
    app.state.data_root = tmp_path
    client = TestClient(app)

    expected_programs = {
        "he": ("he-starter", "TextPlex Hebrew starter lexicon"),
        "ar": ("ar-starter", "TextPlex Arabic starter lexicon"),
        "ja": ("ja-starter", "TextPlex Japanese starter lexicon"),
        "zh": ("zh-starter", "Chinese Character Recognition vocabulary database"),
    }

    for language_code, (program_code, program_source_label) in expected_programs.items():
        response = client.get("/study", params={"language_code": language_code})
        assert response.status_code == 200
        study_programs = response.json()["study_programs"]
        assert len(study_programs) == 1

        program = study_programs[0]
        assert program["program_code"] == program_code
        assert program["program_source_label"] == program_source_label
        assert program["level_count"] == 2
        assert all(level["item_count"] > 0 for level in program["levels"])
