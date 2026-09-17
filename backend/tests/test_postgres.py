"""Opt-in real PostgreSQL test. Never falls back to DATABASE_URL."""
import os
from uuid import uuid4

import pytest
import psycopg
from fastapi.testclient import TestClient

from app.database import connect_database
from app.main import create_app
from app.migrate import apply_migrations


def test_postgres_round_trip(monkeypatch):
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to a dedicated disposable PostgreSQL database")
    if url == os.getenv("DATABASE_URL"):
        pytest.fail("TEST_DATABASE_URL must differ from DATABASE_URL")
    monkeypatch.setenv("DATABASE_URL", url)
    exercise = f"test-{uuid4()}"
    with connect_database() as connection:
        apply_migrations(connection)
        apply_migrations(connection)  # Repeat runs are harmless.
    try:
        with TestClient(create_app()) as client:
            assert client.get(f"/api/set-performances/latest?exercise={exercise}").status_code == 404
            for weight in [70, 75]:
                response = client.post("/api/set-performances", json={"exercise": exercise, "weight": weight, "reps": 6, "rir": 2})
                assert response.status_code == 201
            saved = response.json()
        # A fresh application/client must retrieve committed data.
        with TestClient(create_app()) as client:
            assert client.get(f"/api/set-performances/latest?exercise={exercise}").json() == saved
        with connect_database() as connection:
            assert connection.execute("SELECT count(*) AS count FROM app_private.set_performances WHERE exercise = %s", (exercise,)).fetchone()["count"] == 2
            with pytest.raises(psycopg.errors.CheckViolation):
                with connection.transaction():
                    connection.execute("INSERT INTO app_private.set_performances (exercise, weight, reps, rir) VALUES (%s, -1, 6, 2)", (exercise,))
    finally:
        with connect_database() as connection:
            connection.execute("DELETE FROM app_private.set_performances WHERE exercise = %s", (exercise,))
