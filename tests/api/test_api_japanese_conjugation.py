from app.main import app
from fastapi.testclient import TestClient


def test_japanese_conjugation_endpoint_returns_explainable_forms() -> None:
    response = TestClient(app).post(
        "/lexicon/japanese/conjugate",
        json={"lemma": "書く"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["verb"] == {
        "lemma": "書く",
        "reading": None,
        "conjugation_class": "godan",
        "final_kana": "く",
        "rule_id": "godan-く",
    }
    assert payload["forms"]["polite_present"] == "書きます"
    assert payload["forms"]["plain_past"] == "書いた"
    assert payload["forms"]["te"] == "書いて"


def test_japanese_conjugation_endpoint_accepts_explicit_class_for_ru_verbs() -> None:
    response = TestClient(app).post(
        "/lexicon/japanese/conjugate",
        json={"lemma": "帰る", "conjugation_class": "godan"},
    )

    assert response.status_code == 200
    assert response.json()["forms"]["plain_past"] == "帰った"
