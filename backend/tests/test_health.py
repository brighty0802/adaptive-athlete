import pytest
from fastapi.testclient import TestClient

from app.main import app, create_app


def test_health() -> None:
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["content-type"] == "application/json"


@pytest.mark.parametrize("origin", [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.106:3000",
])
def test_development_origins(monkeypatch: pytest.MonkeyPatch, origin: str) -> None:
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    with TestClient(create_app()) as client:
        response = client.get("/health", headers={"Origin": origin})
        preflight = client.options("/health", headers={
            "Origin": origin, "Access-Control-Request-Method": "GET",
        })
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert "access-control-allow-credentials" not in response.headers
    assert preflight.status_code == 200
    assert preflight.headers["access-control-allow-origin"] == origin


def test_unlisted_origin_is_not_allowed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    with TestClient(create_app()) as client:
        response = client.get("/health", headers={"Origin": "https://unrelated.example"})
        preflight = client.options("/health", headers={
            "Origin": "https://unrelated.example", "Access-Control-Request-Method": "GET",
        })
    assert "access-control-allow-origin" not in response.headers
    assert preflight.status_code == 400


def test_configured_origins_replace_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", " http://192.168.1.200:3000, ")
    with TestClient(create_app()) as client:
        allowed = client.get("/health", headers={"Origin": "http://192.168.1.200:3000"})
        removed = client.get("/health", headers={"Origin": "http://localhost:3000"})
    assert allowed.headers["access-control-allow-origin"] == "http://192.168.1.200:3000"
    assert "access-control-allow-origin" not in removed.headers
