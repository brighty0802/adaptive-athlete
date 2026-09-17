import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app import serve


def test_start_uses_railway_port_without_reload(monkeypatch):
    monkeypatch.setenv("PORT", "9123")
    calls = []
    monkeypatch.setattr(serve.uvicorn, "run", lambda *args, **kwargs: calls.append((args, kwargs)))
    serve.main()
    assert calls == [(("app.main:app",), {"host": "0.0.0.0", "port": 9123, "reload": False})]


@pytest.mark.parametrize("value", ["", "zero", "0", "-1", "65536"])
def test_invalid_port_is_rejected(monkeypatch, value):
    monkeypatch.setenv("PORT", value)
    with pytest.raises(ValueError, match="PORT must"):
        serve.configured_port()


def test_local_port_default(monkeypatch):
    monkeypatch.delenv("PORT", raising=False)
    assert serve.configured_port() == 8000


def production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    # Dummy value only: none of these CORS/health requests opens a DB connection.
    monkeypatch.setenv("DATABASE_URL", "unused-in-this-test")
    monkeypatch.setenv("CORS_ORIGINS", "https://athlete.example")


@pytest.mark.parametrize("method", ["GET", "POST", "PUT"])
def test_vercel_origin_allows_workout_methods_and_denies_other_origins(monkeypatch, method):
    production(monkeypatch)
    with TestClient(create_app()) as client:
        headers = {"Origin": "https://athlete.example", "Access-Control-Request-Method": method,
                   "Access-Control-Request-Headers": "content-type"}
        response = client.options("/api/sessions", headers=headers)
        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == "https://athlete.example"
        for origin in ["https://unrelated.example", "http://localhost:3000"]:
            response = client.options("/api/sessions", headers={**headers, "Origin": origin})
            assert response.status_code == 400
            assert "access-control-allow-origin" not in response.headers
        assert client.get("/health").json() == {"status": "ok"}


@pytest.mark.parametrize("origin", ["", "*", "https://*.vercel.app", "http://athlete.example", "https://athlete.example/path", "https://athlete.example/"])
def test_production_rejects_missing_or_unsafe_origin(monkeypatch, origin):
    production(monkeypatch)
    monkeypatch.setenv("CORS_ORIGINS", origin)
    with pytest.raises(ValueError):
        create_app()


def test_production_needs_database_configuration(monkeypatch):
    production(monkeypatch)
    monkeypatch.delenv("DATABASE_URL")
    with pytest.raises(ValueError, match="Production requires"):
        create_app()
