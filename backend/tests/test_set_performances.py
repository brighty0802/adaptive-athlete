from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock
from uuid import uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.api.routes import set_performances as routes
from app.database import DatabaseNotConfigured
from app.main import create_app

PAYLOAD = {"exercise": "back-squat", "weight": 75, "reps": 6, "rir": 2}


@pytest.fixture
def boundary(monkeypatch):
    connection = MagicMock()
    connection.__enter__.return_value = connection
    monkeypatch.setattr(routes, "connect_database", lambda: connection)
    with TestClient(create_app()) as client:
        yield client, connection


@pytest.mark.parametrize("field,value", [
    ("weight", -1), ("weight", 2001), ("weight", "1.001"),
    ("weight", "NaN"), ("reps", -1), ("reps", 1001), ("reps", 1.5),
    ("reps", True), ("rir", -1), ("rir", 11), ("rir", "1.01"),
    ("exercise", ""), ("exercise", "Back Squat"), ("exercise", "x" * 81),
])
def test_invalid_input(boundary, field, value):
    client, connection = boundary
    assert client.post("/api/set-performances", json={**PAYLOAD, field: value}).status_code == 422
    connection.execute.assert_not_called()


def test_create_and_latest_response(boundary):
    client, connection = boundary
    row = {**PAYLOAD, "id": uuid4(), "weight": Decimal("75.00"),
           "rir": Decimal("2.0"), "created_at": datetime.now(timezone.utc)}
    connection.execute.return_value.fetchone.return_value = row
    saved = client.post("/api/set-performances", json=PAYLOAD)
    assert saved.status_code == 201
    assert saved.json()["weight"] == "75.00"
    assert saved.json()["reps"] == 6
    assert saved.json()["rir"] == "2.0"
    assert saved.json()["id"] == str(row["id"])
    assert connection.execute.call_args.args[1] == ("back-squat", Decimal(75), 6, Decimal(2))
    assert client.get("/api/set-performances/latest?exercise=back-squat").json() == saved.json()


def test_missing_and_invalid_query(boundary):
    client, connection = boundary
    connection.execute.return_value.fetchone.return_value = None
    assert client.get("/api/set-performances/latest?exercise=unknown").status_code == 404
    assert client.get("/api/set-performances/latest").status_code == 422
    assert client.get("/api/set-performances/latest?exercise=Bad%20Slug").status_code == 422
    assert client.post("/api/set-performances", json={}).status_code == 422


@pytest.mark.parametrize("error", [DatabaseNotConfigured("secret"), psycopg.OperationalError("secret")])
def test_database_error_is_sanitized(monkeypatch, error):
    def fail():
        raise error
    monkeypatch.setattr(routes, "connect_database", fail)
    with TestClient(create_app()) as client:
        for response in [client.post("/api/set-performances", json=PAYLOAD), client.get("/api/set-performances/latest?exercise=back-squat")]:
            assert response.status_code == 503
            assert "secret" not in response.text
        assert client.get("/health").status_code == 200


def test_post_preflight(boundary):
    client, _ = boundary
    response = client.options("/api/set-performances", headers={
        "Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    })
    assert response.status_code == 200


def test_commit_failure_does_not_report_success(boundary):
    client, connection = boundary
    connection.execute.return_value.fetchone.return_value = {
        **PAYLOAD, "id": uuid4(), "created_at": datetime.now(timezone.utc),
    }
    connection.__exit__.side_effect = psycopg.OperationalError("private connection details")
    assert client.post("/api/set-performances", json=PAYLOAD).status_code == 503
