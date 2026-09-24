"""Workout contract and failure-path checks; these never open a database."""
from copy import deepcopy
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock
from uuid import uuid4

import psycopg
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app import workouts
from app.api.routes import workouts as routes
from app.database import DatabaseNotConfigured
from app.main import create_app
from app.workout_models import ExerciseLog, Mutation, SaveSession, numeric, validate_exercises


def prescription(exercise_id="back-squat", **changes):
    return {
        "id": exercise_id, "name": "Back Squat", "sets": 2,
        "measurement": "reps", "range": [4, 6], "quickTarget": 6,
        "targetRir": [1, 2], "quickRir": 2, "proposedLoadKg": 75,
        "loadKind": "total", "restSeconds": 180, "previous": "No previous performance",
        "mockFeedback": "", **changes,
    }


def workout():
    return {
        "id": "session-a", "name": "Session A", "focus": "Strength + Power",
        "estimatedDurationMinutes": 60, "exerciseCount": 2,
        "exercises": [prescription(), prescription(
            "copenhagen-adduction", measurement="seconds", range=[20, 30],
            quickTarget=30, targetRir=None, quickRir=None, proposedLoadKg=None,
            loadKind="none",
        )],
    }


def session():
    definition = workout()
    return {
        "id": str(uuid4()), "workoutId": "session-a", "startedAt": 1_785_000_000_000,
        "finishedAt": None, "status": "in_progress", "revision": 0,
        "lastMutationId": None, "workout": definition, "feedback": {},
        "exercises": [{
            "exerciseId": exercise["id"], "skipped": False, "techniqueConfirmed": False,
            "sets": [{"weight": "75", "amount": "6", "rir": "2",
                      "touched": True, "completed": False} for _ in range(exercise["sets"])],
        } for exercise in definition["exercises"]],
    }


def validated_logs(logs):
    return [ExerciseLog.model_validate(log) for log in logs]


@pytest.fixture
def boundary(monkeypatch):
    connection = MagicMock()
    connection.__enter__.return_value = connection
    connect = MagicMock(return_value=connection)
    monkeypatch.setattr(routes, "connect_database", connect)
    with TestClient(create_app()) as client:
        yield client, connection, connect


@pytest.mark.parametrize("field,value", [
    ("weight", "-1"), ("weight", "2000.01"), ("weight", "75.001"),
    ("weight", "NaN"), ("weight", "Infinity"), ("weight", ""),
    ("amount", "-1"), ("amount", "1001"), ("amount", "6.5"),
    ("amount", "six"), ("amount", ""), ("amount", "NaN"),
    ("rir", "-0.1"), ("rir", "10.1"), ("rir", "2.01"),
    ("rir", ""), ("rir", "NaN"),
])
def test_completed_sets_reject_invalid_numeric_fields(field, value):
    data = session()
    entry = data["exercises"][0]["sets"][0]
    entry.update(completed=True)
    entry[field] = value
    with pytest.raises(HTTPException) as error:
        validate_exercises(validated_logs(data["exercises"]), data["workout"])
    assert error.value.status_code == 422


def test_unfinished_input_preserves_arbitrary_short_drafts():
    data = session()
    data["exercises"][0]["sets"][0].update(weight="7.", amount="", rir="-")
    logs = validated_logs(data["exercises"])
    validate_exercises(logs, data["workout"])
    assert logs[0].sets[0].model_dump() == data["exercises"][0]["sets"][0]


def test_time_and_bodyweight_exercises_do_not_require_weight_or_rir():
    data = session()
    data["exercises"][1]["sets"][0].update(weight="", amount="30", rir="", completed=True)
    validate_exercises(validated_logs(data["exercises"]), data["workout"])
    data["exercises"][1]["sets"][0]["amount"] = "3601"
    with pytest.raises(HTTPException) as error:
        validate_exercises(validated_logs(data["exercises"]), data["workout"])
    assert error.value.status_code == 422


@pytest.mark.parametrize("change", ["missing", "duplicate", "foreign", "extra_set", "missing_set"])
def test_prescription_shape_cannot_be_changed(change):
    data = session()
    logs = data["exercises"]
    if change == "missing":
        logs.pop()
    elif change == "duplicate":
        logs[1]["exerciseId"] = logs[0]["exerciseId"]
    elif change == "foreign":
        logs[1]["exerciseId"] = "not-prescribed"
    elif change == "extra_set":
        logs[0]["sets"].append(deepcopy(logs[0]["sets"][0]))
    else:
        logs[0]["sets"].pop()
    with pytest.raises(HTTPException) as error:
        validate_exercises(validated_logs(logs), data["workout"])
    assert error.value.status_code == 422


def test_order_and_skip_are_supported_without_changing_prescription():
    data = session()
    data["exercises"].reverse()
    data["exercises"][0]["skipped"] = True
    validate_exercises(validated_logs(data["exercises"]), data["workout"])


def test_numeric_boundaries_use_decimal_precision():
    assert numeric("0", 2000, 2, "weight") == Decimal(0)
    assert numeric("2000.00", 2000, 2, "weight") == Decimal(2000)
    assert numeric("77.50", 2000, 2, "weight") == Decimal("77.5")
    assert numeric("2.5", 10, 1, "RIR") == Decimal("2.5")


@pytest.mark.parametrize("method,path,body", [
    ("POST", "/api/sessions", {"id": "invalid", "workoutId": "session-a"}),
    ("POST", "/api/sessions", {"id": str(uuid4()), "workoutId": ""}),
    ("POST", "/api/sessions", {"id": str(uuid4()), "workoutId": "session-a", "status": "completed"}),
    ("GET", "/api/sessions/invalid", None),
    ("PUT", "/api/sessions/invalid", {"revision": 0, "mutationId": str(uuid4()), "exercises": []}),
    ("POST", f"/api/sessions/{uuid4()}/finish", {"revision": -1, "mutationId": str(uuid4())}),
    ("POST", f"/api/sessions/{uuid4()}/finish", {"revision": True, "mutationId": str(uuid4())}),
    ("POST", f"/api/sessions/{uuid4()}/finish", {"revision": "0", "mutationId": str(uuid4())}),
    ("POST", f"/api/sessions/{uuid4()}/finish", {"revision": 0, "mutationId": "invalid"}),
])
def test_invalid_request_does_not_open_database(boundary, method, path, body):
    client, _, connect = boundary
    assert client.request(method, path, json=body).status_code == 422
    connect.assert_not_called()


def test_oversized_draft_is_rejected_before_database(boundary):
    client, _, connect = boundary
    data = session()
    data["exercises"][0]["sets"][0]["weight"] = "1" * 33
    response = client.put(f'/api/sessions/{data["id"]}', json={
        "revision": 0, "mutationId": str(uuid4()), "exercises": data["exercises"],
    })
    assert response.status_code == 422
    connect.assert_not_called()


def test_missing_session_returns_404(boundary):
    client, connection, _ = boundary
    connection.execute.return_value.fetchone.return_value = None
    assert client.get(f"/api/sessions/{uuid4()}").status_code == 404


@pytest.mark.parametrize("error_type", [DatabaseNotConfigured, psycopg.OperationalError])
def test_all_database_failures_are_sanitized(monkeypatch, error_type):
    def fail():
        raise error_type("never-print-private-connection-information")
    monkeypatch.setattr(routes, "connect_database", fail)
    data = session()
    mutation = {"revision": 0, "mutationId": str(uuid4())}
    with TestClient(create_app()) as client:
        requests = [
            ("GET", "/api/today", None), ("GET", "/api/workouts", None),
            ("GET", "/api/sessions", None), ("GET", f'/api/sessions/{data["id"]}', None),
            ("POST", "/api/sessions", {"id": data["id"], "workoutId": "session-a"}),
            ("PUT", f'/api/sessions/{data["id"]}', {**mutation, "exercises": data["exercises"]}),
            ("POST", f'/api/sessions/{data["id"]}/finish', mutation),
            ("PUT", f'/api/sessions/{data["id"]}/correction', {**mutation, "exercises": data["exercises"]}),
        ]
        for method, path, body in requests:
            response = client.request(method, path, json=body)
            assert response.status_code == 503
            assert "never-print" not in response.text
        assert client.get("/health").json() == {"status": "ok"}


def test_failed_commit_cannot_report_start_success(boundary, monkeypatch):
    client, connection, _ = boundary
    data = session()
    monkeypatch.setattr(workouts, "start_session", lambda *_: data)
    connection.__exit__.side_effect = psycopg.OperationalError("private details")
    response = client.post("/api/sessions", json={"id": data["id"], "workoutId": "session-a"})
    assert response.status_code == 503
    assert "private details" not in response.text


def test_put_is_allowed_for_phone_origin(boundary):
    client, _, _ = boundary
    response = client.options(f"/api/sessions/{uuid4()}", headers={
        "Origin": "http://localhost:3000", "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": "content-type",
    })
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_retry_is_idempotent_even_after_terminal_transition():
    data = session()
    mutation = Mutation(revision=0, mutationId=uuid4())
    data.update(revision=3, status="partial", lastMutationId=str(mutation.mutationId))
    assert workouts.check_revision(data, mutation) is False


@pytest.mark.parametrize("status,revision", [("in_progress", 1), ("completed", 0), ("partial", 0), ("cancelled", 0)])
def test_stale_and_terminal_mutations_are_conflicts(status, revision):
    data = session()
    data.update(status=status, revision=revision)
    with pytest.raises(HTTPException) as error:
        workouts.check_revision(data, Mutation(revision=0, mutationId=uuid4()))
    assert error.value.status_code == 409


@pytest.mark.parametrize("completed_count,expected", [(0, "cancelled"), (1, "partial"), (4, "completed")])
def test_finish_classifies_actual_completed_sets(monkeypatch, completed_count, expected):
    data = session()
    entries = [entry for log in data["exercises"] for entry in log["sets"]]
    for entry in entries[:completed_count]:
        entry["completed"] = True
    monkeypatch.setattr(workouts, "read_session", lambda *_args, **_kwargs: data)
    monkeypatch.setattr(workouts, "feedback_for_exercise", lambda *_: "Saved")
    connection = MagicMock()
    workouts.finish_session(connection, uuid4(), Mutation(revision=0, mutationId=uuid4()))
    assert connection.execute.call_args.args[1][0] == expected


@pytest.mark.parametrize("status", ["completed", "partial", "cancelled"])
def test_repeated_finish_never_writes_again(monkeypatch, status):
    data = session()
    data["status"] = status
    monkeypatch.setattr(workouts, "read_session", lambda *_args, **_kwargs: data)
    connection = MagicMock()
    assert workouts.finish_session(connection, uuid4(), Mutation(revision=0, mutationId=uuid4())) == data
    connection.execute.assert_not_called()


@pytest.mark.parametrize("last_workout,recommended", [
    (None, "session-a"), ("session-a", "session-b"), ("session-b", "session-c"),
    ("session-c", "session-d"), ("session-d", "session-a"),
])
def test_today_rotation_and_london_adherence_date(monkeypatch, last_workout, recommended):
    definitions = [{**workout(), "id": f"session-{letter}"} for letter in "abcd"]
    monkeypatch.setattr(workouts, "WORKOUTS", definitions)
    monkeypatch.setattr(workouts, "available_workouts", lambda _: definitions)
    connection = MagicMock()
    # During British Summer Time, 23:30 UTC is the following calendar day.
    rows = [] if last_workout is None else [{
        "id": uuid4(), "workout_id": last_workout, "status": "partial",
        "started_at": datetime(2026, 9, 17, 23, 30, tzinfo=timezone.utc),
        "finished_at": datetime(2026, 9, 18, 0, 15, tzinfo=timezone.utc),
    }]
    connection.execute.return_value.fetchall.return_value = rows
    connection.execute.return_value.fetchone.return_value = None
    result = workouts.today_data(connection)
    assert result["today"]["recommendedWorkoutId"] == recommended
    assert result["activeSession"] is None
    if rows:
        latest = result["today"]["lastCompletedWorkout"]
        assert latest["date"] == "2026-09-18"
        assert latest["durationMinutes"] == 45
        assert latest["status"] == "partial"
    else:
        assert result["today"]["completedWorkouts"] == []
        assert result["today"]["lastCompletedWorkout"] is None


def test_previous_mapping_preserves_snapshot_baseline_over_legacy_set():
    connection = MagicMock()
    definition = workout()
    definition["exercises"][0]["proposedLoadKg"] = 77.5
    row = {
        "exercise_id": "back-squat", "skipped": False, "technique_confirmed": True,
        "prescription": definition,
        "started_at": datetime(2026, 7, 1, 23, 30, tzinfo=timezone.utc),
        "sets": [{"weight": "60", "amount": "6", "rir": "2", "completed": True, "touched": True},
                 {"weight": "77.5", "amount": "", "rir": "", "completed": False, "touched": False}],
    }
    legacy = {
        "exercise": "back-squat", "weight": Decimal(50), "reps": 6, "rir": Decimal(2),
        "created_at": datetime(2026, 7, 2, tzinfo=timezone.utc),
    }
    connection.execute.return_value.fetchall.side_effect = [[row], [legacy]]
    previous = workouts.previous_performances(connection)["back-squat"]
    assert previous["prescribedLoadKg"] == 77.5
    assert previous["sets"] == row["sets"]
    assert previous["date"] == "2026-07-02"
    assert previous["techniqueConfirmed"] is True


def correction_fixture(monkeypatch):
    data = session()
    data.update(status="partial", finishedAt=data["startedAt"] + 3600000, revision=4)
    data["exercises"][0]["sets"][0]["completed"] = True
    monkeypatch.setattr(workouts, "read_session", lambda *_args, **_kwargs: data)
    connection = MagicMock()
    connection.execute.return_value.fetchone.return_value = {"id": data["id"], "recent": True}
    return data, connection


@pytest.mark.parametrize("complete_all,expected", [(False, "partial"), (True, "completed")])
def test_correction_recomputes_feedback_preserves_dates_and_writes_existing_rows(monkeypatch, complete_all, expected):
    data, connection = correction_fixture(monkeypatch)
    logs = deepcopy(data["exercises"])
    for log in logs:
        log["techniqueConfirmed"] = True
        for entry in log["sets"]:
            entry.update(amount="30" if log["exerciseId"] == "copenhagen-adduction" else "6")
            if complete_all:
                entry["completed"] = True
    request = SaveSession(revision=4, mutationId=uuid4(), exercises=logs)
    workouts.correct_session(connection, data["id"], request)
    calls = connection.execute.call_args_list
    assert "pg_advisory_xact_lock(8172043)" in calls[0].args[0]
    assert "interval '7 days'" in calls[1].args[0]
    sql, params = calls[-1].args
    assert params[0] == expected
    assert params[1].obj["back-squat"] == workouts.feedback_for_exercise(data["workout"]["exercises"][0], logs[0])
    assert params[2:] == (request.mutationId, data["id"])
    assert "finished_at" not in sql and "started_at" not in sql and "prescription" not in sql
    assert all("INSERT" not in call.args[0] and "DELETE" not in call.args[0] for call in calls)
    set_writes = [call for call in calls if "UPDATE app_private.workout_sets" in call.args[0]]
    assert len(set_writes) == 4
    if not complete_all:
        # Uncompleted drafts stay drafts rather than becoming false zero results.
        assert set_writes[1].args[1][1:5] == (None, None, None, None)


@pytest.mark.parametrize("reason", ["old", "newer_session", "revision", "active", "cancelled", "empty", "invalid", "missing_set"])
def test_ineligible_or_invalid_correction_never_writes(monkeypatch, reason):
    data, connection = correction_fixture(monkeypatch)
    logs = deepcopy(data["exercises"])
    revision = 4
    if reason == "old":
        connection.execute.return_value.fetchone.return_value["recent"] = False
    elif reason == "newer_session":
        connection.execute.return_value.fetchone.return_value["id"] = uuid4()
    elif reason == "revision":
        revision = 3
    elif reason in ("active", "cancelled"):
        data["status"] = "in_progress" if reason == "active" else "cancelled"
    elif reason == "empty":
        logs[0]["sets"][0]["completed"] = False
    elif reason == "invalid":
        logs[0]["sets"][0]["weight"] = "-1"
    else:
        logs[0]["sets"].pop()
    with pytest.raises(HTTPException) as failure:
        workouts.correct_session(connection, data["id"], SaveSession(revision=revision, mutationId=uuid4(), exercises=logs))
    assert failure.value.status_code == (422 if reason in ("empty", "invalid", "missing_set") else 409)
    assert all("UPDATE" not in call.args[0] for call in connection.execute.call_args_list)


def test_correction_retry_is_acknowledged_without_another_write(monkeypatch):
    data, connection = correction_fixture(monkeypatch)
    request = SaveSession(revision=3, mutationId=uuid4(), exercises=data["exercises"])
    data["lastMutationId"] = str(request.mutationId)
    assert workouts.correct_session(connection, data["id"], request) == data
    assert connection.execute.call_count == 1  # Only the shared start/correction lock.


def test_correction_endpoint_cannot_report_success_when_commit_fails(boundary, monkeypatch):
    client, connection, _ = boundary
    data = session()
    data.update(status="partial", finishedAt=data["startedAt"] + 1000)
    monkeypatch.setattr(workouts, "correct_session", lambda *_: data)
    connection.__exit__.side_effect = psycopg.OperationalError("private details")
    response = client.put(f'/api/sessions/{data["id"]}/correction', json={
        "revision": 0, "mutationId": str(uuid4()), "exercises": data["exercises"],
    })
    assert response.status_code == 503
    assert "private details" not in response.text
