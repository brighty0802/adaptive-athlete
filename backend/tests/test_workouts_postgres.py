"""Opt-in PostgreSQL checks, always in a fresh disposable schema.

Only TEST_DATABASE_URL enables these tests; DATABASE_URL is never selected.
The configured test account must be able to create and drop its own schema.
"""
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from copy import deepcopy
import os
from uuid import uuid4

import psycopg
import pytest

from app import workouts
from app.api.routes import workouts as routes
from scripts.verify_workouts import IsolatedDatabase, verify


@pytest.fixture
def isolated_database():
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to opt into isolated PostgreSQL workout checks")
    database = IsolatedDatabase(url)
    try:
        database.prepare()
        yield database
    finally:
        database.cleanup()


def start(client, workout_id="session-a"):
    response = client.post("/api/sessions", json={"id": str(uuid4()), "workoutId": workout_id})
    assert response.status_code == 201
    return response.json()


def mutation(session, **changes):
    return {"revision": session["revision"], "mutationId": str(uuid4()), **changes}


def test_full_workout_lifecycle_and_progression(isolated_database):
    # Migrations (including second-run safety), v2, retry, reorder, reopen,
    # resume through a new app, partial/full/cancelled, history and progression.
    verify(isolated_database)


def test_invalid_saves_and_database_failure_leave_original_session_intact(isolated_database, monkeypatch):
    with isolated_database.client() as client:
        original = start(client)
        path = f'/api/sessions/{original["id"]}'
        for kind in ("missing", "duplicate", "foreign", "set_count", "invalid_completed_weight"):
            logs = deepcopy(original["exercises"])
            if kind == "missing":
                logs.pop()
            elif kind == "duplicate":
                logs[1]["exerciseId"] = logs[0]["exerciseId"]
            elif kind == "foreign":
                logs[0]["exerciseId"] = "not-prescribed"
            elif kind == "set_count":
                logs[0]["sets"].append(deepcopy(logs[0]["sets"][0]))
            else:
                log = next(log for log in logs if log["exerciseId"] == "back-squat")
                log["sets"][0].update(weight="-1", amount="6", rir="2", completed=True)
            response = client.put(path, json=mutation(original, exercises=logs))
            assert response.status_code == 422
            assert client.get(path).json() == original

        @contextmanager
        def fail_after_first_set_write():
            with isolated_database.connect() as connection:
                execute = connection.execute
                writes = 0

                def fail_second_write(query, params=None):
                    nonlocal writes
                    if "UPDATE app_private.workout_sets" in query:
                        writes += 1
                        if writes == 2:
                            raise psycopg.OperationalError("simulated interrupted write")
                    return execute(query, params)

                connection.execute = fail_second_write
                yield connection

        monkeypatch.setattr(routes, "connect_database", fail_after_first_set_write)
        logs = deepcopy(original["exercises"])
        logs.reverse()
        logs[0]["sets"][0].update(amount="7.", touched=True)
        response = client.put(path, json=mutation(original, exercises=logs))
        assert response.status_code == 503
        assert "simulated" not in response.text
        monkeypatch.setattr(routes, "connect_database", isolated_database.connect)
        assert client.get(path).json() == original
        assert client.get("/api/today").json()["activeSession"] == original


def test_concurrent_starts_and_saves_are_serialized(isolated_database):
    with isolated_database.client() as client:
        request = {"id": str(uuid4()), "workoutId": "session-a"}
        with ThreadPoolExecutor(max_workers=2) as executor:
            responses = list(executor.map(lambda _: client.post("/api/sessions", json=request), range(2)))
        assert [response.status_code for response in responses] == [201, 201]
        assert responses[0].json() == responses[1].json()
        first = responses[0].json()
        assert client.post(f'/api/sessions/{first["id"]}/finish', json=mutation(first)).json()["status"] == "cancelled"

        requests = [{"id": str(uuid4()), "workoutId": "session-a"} for _ in range(2)]
        with ThreadPoolExecutor(max_workers=2) as executor:
            responses = list(executor.map(lambda body: client.post("/api/sessions", json=body), requests))
        assert sorted(response.status_code for response in responses) == [201, 409]
        active = next(response.json() for response in responses if response.status_code == 201)
        path = f'/api/sessions/{active["id"]}'
        bodies = []
        for amount in ("5", "6"):
            logs = deepcopy(active["exercises"])
            logs[0]["sets"][0].update(amount=amount, touched=True)
            bodies.append(mutation(active, exercises=logs))
        with ThreadPoolExecutor(max_workers=2) as executor:
            responses = list(executor.map(lambda body: client.put(path, json=body), bodies))
        assert sorted(response.status_code for response in responses) == [200, 409]
        winner = next(index for index, response in enumerate(responses) if response.status_code == 200)
        saved = responses[winner].json()
        assert saved["revision"] == 1
        assert client.get(path).json() == saved
        assert client.put(path, json=bodies[winner]).json() == saved
        assert client.get("/api/today").json()["activeSession"] == saved
        logs = deepcopy(saved["exercises"])
        squat = next(log for log in logs if log["exerciseId"] == "back-squat")
        squat["sets"][0].update(weight="75", amount="6", rir="2", completed=True, touched=True)
        saved_response = client.put(path, json=mutation(saved, exercises=logs))
        assert saved_response.status_code == 200
        saved = saved_response.json()
        finishes = [mutation(saved), mutation(saved)]
        with ThreadPoolExecutor(max_workers=2) as executor:
            responses = list(executor.map(lambda body: client.post(path + "/finish", json=body), finishes))
        assert [response.status_code for response in responses] == [200, 200]
        assert responses[0].json() == responses[1].json()
        assert responses[0].json()["status"] == "partial"
        today = client.get("/api/today").json()
        assert today["activeSession"] is None
        assert today["today"]["recommendedWorkoutId"] == "session-b"
        assert len(today["today"]["completedWorkouts"]) == 1
        with isolated_database.connect() as connection:
            assert connection.execute("SELECT count(*) AS count FROM app_private.workout_sessions").fetchone()["count"] == 2


def test_history_retains_snapshot_dates_and_terminal_state(isolated_database, monkeypatch):
    with isolated_database.client() as client:
        original = start(client)
        path = f'/api/sessions/{original["id"]}'
        changed_programme = deepcopy(workouts.WORKOUTS)
        changed_programme[0]["exercises"][0]["sets"] += 1
        monkeypatch.setattr(workouts, "WORKOUTS", changed_programme)
        assert client.get(path).json()["workout"] == original["workout"]

        logs = deepcopy(original["exercises"])
        squat = next(log for log in logs if log["exerciseId"] == "back-squat")
        squat["sets"][0].update(weight="75", amount="6", rir="2", completed=True, touched=True)
        saved_response = client.put(path, json=mutation(original, exercises=logs))
        assert saved_response.status_code == 200
        saved = saved_response.json()
        finished_response = client.post(path + "/finish", json=mutation(saved))
        assert finished_response.status_code == 200
        finished = finished_response.json()
        assert finished["status"] == "partial"
        assert client.put(path, json=mutation(finished, exercises=logs)).status_code == 409
        assert client.post(path + "/finish", json=mutation(finished)).json() == finished
        assert client.post("/api/sessions", json={"id": original["id"], "workoutId": "session-a"}).json() == finished
        assert client.post("/api/sessions", json={"id": original["id"], "workoutId": "session-b"}).status_code == 409

        # Date grouping uses session start in Europe/London, not UTC or finish day.
        with isolated_database.connect() as connection:
            connection.execute(
                """UPDATE app_private.workout_sessions
                   SET started_at = '2026-07-01T23:30:00Z', finished_at = '2026-07-02T00:15:00Z'
                   WHERE id = %s""", (original["id"],),
            )
        today = client.get("/api/today").json()["today"]
        assert today["lastCompletedWorkout"]["date"] == "2026-07-02"
        assert today["lastCompletedWorkout"]["durationMinutes"] == 45
        assert today["recommendedWorkoutId"] == "session-b"
        assert len(today["completedWorkouts"]) == 1
        latest = client.get("/api/sessions").json()
        assert latest[0]["workout"] == original["workout"]
        assert latest[0]["exercises"] == logs
        assert client.get(f"/api/sessions/{uuid4()}").status_code == 404
        assert client.post("/api/sessions", json={"id": str(uuid4()), "workoutId": "unknown"}).status_code == 404


def test_previous_prefers_full_exercise_and_partial_exposures_keep_baseline(isolated_database):
    with isolated_database.client() as client:
        def recommended_squat():
            response = client.get("/api/workouts")
            assert response.status_code == 200
            return next(exercise for exercise in response.json()[0]["exercises"]
                        if exercise["id"] == "back-squat")

        def finish_exposure(weight, *, full=False, skipped=False):
            active = start(client)
            logs = deepcopy(active["exercises"])
            squat = next(log for log in logs if log["exerciseId"] == "back-squat")
            squat.update(techniqueConfirmed=True, skipped=skipped)
            completed = squat["sets"] if full else squat["sets"][:1]
            for entry in completed:
                entry.update(weight=str(weight), amount="6", rir="2", completed=True, touched=True)
            response = client.put(f'/api/sessions/{active["id"]}', json=mutation(active, exercises=logs))
            assert response.status_code == 200
            saved = response.json()
            response = client.post(f'/api/sessions/{active["id"]}/finish', json=mutation(saved))
            assert response.status_code == 200
            assert response.json()["status"] == "partial"

        assert recommended_squat()["proposedLoadKg"] is None
        finish_exposure(75)
        squat = recommended_squat()
        assert squat["proposedLoadKg"] == 75
        assert "75 kg" in squat["previous"]
        assert "partial exercise" in squat["previous"]

        # Until a complete exercise exists, display the latest actual partial
        # exposure while retaining the recommendation captured in its snapshot.
        for actual_load in (60, 90):
            finish_exposure(actual_load)
            squat = recommended_squat()
            assert squat["proposedLoadKg"] == 75
            assert f"{actual_load} kg" in squat["previous"]
            assert squat["progression"]["outcome"] == "maintain"

        finish_exposure(75, full=True)
        squat = recommended_squat()
        assert squat["proposedLoadKg"] == 77.5
        assert "partial exercise" not in squat["previous"]
        established_previous = squat["previous"]

        # A later incomplete or intentionally skipped exposure must not replace
        # the most recent full exercise, erase progress, or earn another increase.
        finish_exposure(50)
        squat = recommended_squat()
        assert squat["proposedLoadKg"] == 77.5
        assert squat["previous"] == established_previous
        finish_exposure(80, skipped=True)
        squat = recommended_squat()
        assert squat["proposedLoadKg"] == 77.5
        assert squat["previous"] == established_previous
