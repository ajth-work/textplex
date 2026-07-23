from fastapi.testclient import TestClient
from pathlib import Path

from app.main import app


def test_health_endpoint_returns_ok() -> None:
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_reports_storage_checks(tmp_path: Path) -> None:
    from app.main import app

    original_data_root = app.state.data_root
    app.state.data_root = tmp_path
    (tmp_path / "books").mkdir()
    (tmp_path / "user").mkdir()
    try:
        response = TestClient(app).get("/ready")
    finally:
        app.state.data_root = original_data_root

    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "checks": {"books_storage": True, "user_storage": True, "configuration": True},
    }


def test_production_readiness_rejects_insecure_or_missing_configuration(tmp_path: Path, monkeypatch) -> None:
    from app.main import app

    original_data_root = app.state.data_root
    app.state.data_root = tmp_path
    (tmp_path / "books").mkdir()
    (tmp_path / "user").mkdir()
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("TEXTPLEX_CORS_ORIGINS", "http://localhost:3000")
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_PUBLISHABLE_KEY", raising=False)
    try:
        response = TestClient(app).get("/ready")
    finally:
        app.state.data_root = original_data_root

    assert response.status_code == 503
    assert response.json()["checks"]["configuration"] is False


def test_mutation_rate_limit_returns_retryable_response(monkeypatch) -> None:
    import app.main as main

    monkeypatch.setenv("TEXTPLEX_RATE_LIMIT_PER_MINUTE", "1")
    main._rate_limit_buckets.clear()
    client = TestClient(app)
    try:
        first_response = client.post("/rate-limit-test")
        second_response = client.post("/rate-limit-test")
    finally:
        main._rate_limit_buckets.clear()

    assert first_response.status_code == 404
    assert second_response.status_code == 429
    assert second_response.headers["Retry-After"] == "60"
    assert second_response.headers["X-Request-ID"]
