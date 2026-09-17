"""Explicit real-PostgreSQL smoke test in a disposable, isolated schema.

Normal pytest never uses DATABASE_URL. This manual check can use it only with
--configured-database; no existing tables or training records are modified.
"""
import argparse
import os
import re
import traceback
from pathlib import Path
from contextlib import contextmanager
from uuid import uuid4
from unittest.mock import patch

import psycopg
from psycopg.rows import dict_row
from fastapi.testclient import TestClient

from app.api.routes import set_performances, workouts as routes
from app.main import create_app
from app.migrate import apply_migrations


class SchemaConnection:
    def __init__(self, connection, schema):
        self.connection, self.schema = connection, schema

    def execute(self, query, params=None):
        return self.connection.execute(re.sub(r"\bapp_private\b", self.schema, query), params)

    def transaction(self):
        return self.connection.transaction()

    def __enter__(self):
        self.connection.__enter__()
        return self

    def __exit__(self, *args):
        return self.connection.__exit__(*args)


class IsolatedDatabase:
    def __init__(self, url):
        self.url = url
        self.schema = "aa_verify_" + uuid4().hex

    def connect(self):
        return SchemaConnection(psycopg.connect(
            self.url, row_factory=dict_row, connect_timeout=5,
            options="-c statement_timeout=10000", prepare_threshold=None,
        ), self.schema)

    def prepare(self):
        with self.connect() as connection:
            apply_migrations(connection)
        with self.connect() as connection:
            apply_migrations(connection)

    def cleanup(self):
        # Only this randomly generated test namespace can ever be removed.
        assert re.fullmatch(r"aa_verify_[0-9a-f]{32}", self.schema)
        with self.connect() as connection:
            connection.execute(f'DROP SCHEMA IF EXISTS "{self.schema}" CASCADE')

    @contextmanager
    def client(self):
        with patch.object(routes, "connect_database", self.connect), patch.object(set_performances, "connect_database", self.connect):
            with TestClient(create_app()) as client:
                yield client


def verify(database):
    with database.client() as client:
        assert client.get("/health").json() == {"status": "ok"}
        today = client.get("/api/today").json()
        assert today["activeSession"] is None
        assert today["today"]["completedWorkouts"] == []
        assert len(today["workouts"]) == 4
        assert today["today"]["recommendedWorkoutId"] == "session-a"
        legacy = client.post("/api/set-performances", json={"exercise": "back-squat", "weight": 75, "reps": 6, "rir": 2})
        assert legacy.status_code == 201
        assert client.get("/api/set-performances/latest?exercise=back-squat").json()["id"] == legacy.json()["id"]
        start = {"id": str(uuid4()), "workoutId": "session-a"}
        response = client.post("/api/sessions", json=start)
        assert response.status_code == 201
        session = response.json()
        assert client.post("/api/sessions", json=start).json()["id"] == session["id"]
        assert client.post("/api/sessions", json={"id": str(uuid4()), "workoutId": "session-b"}).status_code == 409
        assert client.get("/api/today").json()["activeSession"]["id"] == session["id"]

        def save(current):
            body = {"revision": current["revision"], "mutationId": str(uuid4()), "exercises": current["exercises"]}
            saved = client.put(f'/api/sessions/{current["id"]}', json=body)
            assert saved.status_code == 200, saved.text
            retried = client.put(f'/api/sessions/{current["id"]}', json=body)
            assert retried.json()["revision"] == saved.json()["revision"]
            body["mutationId"] = str(uuid4())
            assert client.put(f'/api/sessions/{current["id"]}', json=body).status_code == 409
            return saved.json()

        squat = next(log for log in session["exercises"] if log["exerciseId"] == "back-squat")
        squat["techniqueConfirmed"] = True
        for entry in squat["sets"]:
            entry.update(weight="75", amount="6", rir="2", completed=True, touched=True)
        session["exercises"][0]["skipped"] = True
        session["exercises"].reverse()
        session = save(session)
        squat = next(log for log in session["exercises"] if log["exerciseId"] == "back-squat")
        squat["sets"][0]["completed"] = False
        squat["sets"][0]["amount"] = "5"
        session = save(session)
        # A fresh application and fresh DB connection reproduce unfinished state.
        with database.client() as fresh:
            recovered = fresh.get(f'/api/sessions/{session["id"]}').json()
            assert recovered == session
        squat = next(log for log in session["exercises"] if log["exerciseId"] == "back-squat")
        squat["sets"][0]["completed"] = True
        session = save(session)
        finish = {"revision": session["revision"], "mutationId": str(uuid4())}
        response = client.post(f'/api/sessions/{session["id"]}/finish', json=finish)
        assert response.status_code == 200
        assert response.json()["status"] == "partial"
        assert client.post(f'/api/sessions/{session["id"]}/finish', json=finish).json() == response.json()
        today = client.get("/api/today").json()
        assert today["activeSession"] is None
        assert today["today"]["recommendedWorkoutId"] == "session-b"
        assert len(today["today"]["completedWorkouts"]) == 1
        squat = next(ex for ex in today["workouts"][0]["exercises"] if ex["id"] == "back-squat")
        assert squat["proposedLoadKg"] == 75
        assert len(client.get("/api/sessions").json()) == 1

        # Next exposure earns progression; unrelated skipped work has no penalty.
        session = client.post("/api/sessions", json={"id": str(uuid4()), "workoutId": "session-a"}).json()
        for log in session["exercises"]:
            if log["exerciseId"] == "back-squat":
                log["techniqueConfirmed"] = True
                for entry in log["sets"]:
                    entry.update(weight="75", amount="6", rir="2", completed=True, touched=True)
            else:
                log["skipped"] = True
        session = save(session)
        assert client.post(f'/api/sessions/{session["id"]}/finish', json={"revision": session["revision"], "mutationId": str(uuid4())}).status_code == 200
        squat = next(ex for ex in client.get("/api/workouts").json()[0]["exercises"] if ex["id"] == "back-squat")
        assert squat["proposedLoadKg"] == 77.5

        # Complete a whole workout, then cancel an empty one without advancing.
        session = client.post("/api/sessions", json={"id": str(uuid4()), "workoutId": "session-c"}).json()
        for log, prescription in zip(session["exercises"], session["workout"]["exercises"]):
            for entry in log["sets"]:
                entry.update(weight="20" if prescription["loadKind"] != "none" else "",
                             amount=str(prescription["quickTarget"]),
                             rir="2" if prescription["targetRir"] is not None else "", completed=True, touched=True)
        session = save(session)
        assert client.post(f'/api/sessions/{session["id"]}/finish', json={"revision": session["revision"], "mutationId": str(uuid4())}).json()["status"] == "completed"
        session = client.post("/api/sessions", json={"id": str(uuid4()), "workoutId": "session-b"}).json()
        assert client.post(f'/api/sessions/{session["id"]}/finish', json={"revision": 0, "mutationId": str(uuid4())}).json()["status"] == "cancelled"
        today = client.get("/api/today").json()
        assert today["today"]["recommendedWorkoutId"] == "session-d"
        assert len(today["today"]["completedWorkouts"]) == 3
    with database.client() as restarted:
        assert len(restarted.get("/api/sessions").json()) == 4
        assert restarted.get("/api/today").json()["today"]["recommendedWorkoutId"] == "session-d"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--configured-database", action="store_true")
    args = parser.parse_args()
    url = os.getenv("DATABASE_URL" if args.configured_database else "TEST_DATABASE_URL")
    if not url:
        raise SystemExit("Required database environment variable is not configured.")
    database = IsolatedDatabase(url)
    try:
        database.prepare()
        verify(database)
        print("PASS: real PostgreSQL migrations, v2, save/reopen/resume, retry/conflict, finish, progression, history and rotation.")
    except Exception as error:
        # Never emit connection exception strings or local variables.
        print(f"Verification failed: {type(error).__name__}; SQLSTATE={getattr(error, 'sqlstate', None)}")
        for frame in traceback.extract_tb(error.__traceback__):
            print(f"  {Path(frame.filename).name}:{frame.lineno} in {frame.name}")
        raise SystemExit(1) from None
    finally:
        try:
            database.cleanup()
        except Exception as error:
            print(f"Temporary verification schema cleanup failed: {type(error).__name__}")
            raise SystemExit(1) from None
