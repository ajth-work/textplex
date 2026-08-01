from pathlib import Path

from app.main import app
from fastapi.testclient import TestClient


def test_russian_learning_program_surfaces_a_curated_level_one_slice(tmp_path: Path) -> None:
    app.state.data_root = tmp_path
    client = TestClient(app)

    response = client.get("/learning/programs/russian")
    assert response.status_code == 200
    payload = response.json()

    assert payload["track_code"] == "trki"
    assert payload["track_label"] == "TRKI"
    assert payload["source_pack"] == "RU5000 v0.1"
    assert payload["selection_rule"]
    assert len(payload["levels"]) == 5

    level_one = payload["levels"][0]
    assert level_one["level"] == 1
    assert level_one["is_active"] is True
    assert level_one["item_count"] == len(level_one["items"])
    assert level_one["items"][0]["lemma"] == "а"
    assert [item["frequency_rank"] for item in level_one["items"]] == sorted(
        item["frequency_rank"] for item in level_one["items"]
    )
    assert all(item["lemma"] == item["surface_form"] for item in level_one["items"])
    assert all(item["source_name"] == "RU5000 v0.1" for item in level_one["items"])
    assert level_one["items"][-1]["lemma"] == "этот"

    level_two = payload["levels"][1]
    assert level_two["level"] == 2
    assert level_two["is_active"] is False
    assert level_two["item_count"] == 0
    assert level_two["items"] == []
