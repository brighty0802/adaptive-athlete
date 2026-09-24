"""Transactional workout persistence. Programme and training rules stay separate."""
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from psycopg.types.json import Jsonb

from app.programme import WORKOUTS
from app.progression import enrich_workout, feedback_for_exercise
from app.workout_models import ExerciseLog, Mutation, SaveSession, StartSession, validate_exercises

LONDON = ZoneInfo("Europe/London")


def read_session(connection, session_id: UUID, *, lock=False) -> dict:
    row = connection.execute(
        "SELECT * FROM app_private.workout_sessions WHERE id = %s" + (" FOR UPDATE" if lock else ""),
        (session_id,),
    ).fetchone()
    if row is None:
        raise HTTPException(404, "Workout session not found.")
    logs = connection.execute(
        "SELECT * FROM app_private.exercise_performances WHERE session_id = %s ORDER BY actual_order", (session_id,),
    ).fetchall()
    sets = connection.execute(
        """SELECT s.* FROM app_private.workout_sets s
           JOIN app_private.exercise_performances e ON e.id = s.exercise_performance_id
           WHERE e.session_id = %s ORDER BY s.set_number""", (session_id,),
    ).fetchall()
    return {
        "id": str(row["id"]), "workoutId": row["workout_id"],
        "startedAt": round(row["started_at"].timestamp() * 1000),
        "finishedAt": round(row["finished_at"].timestamp() * 1000) if row["finished_at"] else None,
        "status": row["status"], "revision": row["revision"],
        "lastMutationId": str(row["last_mutation_id"]) if row["last_mutation_id"] else None,
        "workout": row["prescription"], "feedback": row["feedback"],
        "exercises": [{
            "exerciseId": log["exercise_id"], "skipped": log["skipped"],
            "techniqueConfirmed": log["technique_confirmed"],
            "sets": [{**entry["draft"], "completed": entry["completed"]}
                     for entry in sets if entry["exercise_performance_id"] == log["id"]],
        } for log in logs],
    }


def previous_performances(connection) -> dict:
    rows = connection.execute(
        """SELECT e.exercise_id, e.skipped, e.technique_confirmed,
                  w.started_at, w.finished_at, w.prescription,
                  jsonb_agg(s.draft || jsonb_build_object('completed', s.completed)
                            ORDER BY s.set_number) AS sets
           FROM app_private.exercise_performances e
           JOIN app_private.workout_sessions w ON w.id = e.session_id
           JOIN app_private.workout_sets s ON s.exercise_performance_id = e.id
           WHERE w.status IN ('completed', 'partial') AND NOT e.skipped
           GROUP BY e.id, w.id
           HAVING bool_or(s.completed)
           ORDER BY bool_and(s.completed) DESC, w.finished_at DESC, w.id DESC""",
    ).fetchall()
    previous = {}
    for row in rows:
        prescribed = next(exercise for exercise in row["prescription"]["exercises"]
                          if exercise["id"] == row["exercise_id"])
        previous.setdefault(row["exercise_id"], {
            "exerciseId": row["exercise_id"], "skipped": False,
            "techniqueConfirmed": row["technique_confirmed"], "sets": row["sets"],
            "prescribedLoadKg": prescribed["proposedLoadKg"],
            "date": row["started_at"].astimezone(LONDON).date().isoformat(),
        })
    # Preserve useful v2 context, but a standalone set never earns progression.
    legacy = connection.execute(
        """SELECT DISTINCT ON (exercise) exercise, weight, reps, rir, created_at
           FROM app_private.set_performances ORDER BY exercise, created_at DESC, id DESC""",
    ).fetchall()
    for row in legacy:
        previous.setdefault(row["exercise"], {
            "exerciseId": row["exercise"], "skipped": False, "techniqueConfirmed": False,
            "date": row["created_at"].astimezone(LONDON).date().isoformat(),
            "sets": [{"weight": str(row["weight"]), "amount": str(row["reps"]),
                      "rir": str(row["rir"]), "touched": True, "completed": True}],
        })
    return previous


def available_workouts(connection) -> list[dict]:
    previous = previous_performances(connection)
    return [enrich_workout(workout, previous) for workout in WORKOUTS]


def start_session(connection, request: StartSession) -> dict:
    # Serialise single-user starts, including duplicated requests from two devices.
    connection.execute("SELECT pg_advisory_xact_lock(8172043)")
    existing = connection.execute("SELECT workout_id FROM app_private.workout_sessions WHERE id = %s", (request.id,)).fetchone()
    if existing:
        if existing["workout_id"] != request.workoutId:
            raise HTTPException(409, "Start request ID already belongs to another workout.")
        return read_session(connection, request.id)
    template = next((workout for workout in WORKOUTS if workout["id"] == request.workoutId), None)
    if template is None:
        raise HTTPException(404, "Workout template not found.")
    active = connection.execute("SELECT id FROM app_private.workout_sessions WHERE status = 'in_progress'").fetchone()
    if active:
        raise HTTPException(409, "Another workout is in progress. Resume or finish it first.")
    workout = enrich_workout(template, previous_performances(connection))
    connection.execute(
        "INSERT INTO app_private.workout_sessions (id, workout_id, prescription) VALUES (%s, %s, %s)",
        (request.id, request.workoutId, Jsonb(workout)),
    )
    for order, exercise in enumerate(workout["exercises"]):
        performance = connection.execute(
            """INSERT INTO app_private.exercise_performances (session_id, exercise_id, actual_order)
               VALUES (%s, %s, %s) RETURNING id""", (request.id, exercise["id"], order),
        ).fetchone()
        for number in range(1, exercise["sets"] + 1):
            draft = {"weight": "" if exercise["proposedLoadKg"] is None else str(exercise["proposedLoadKg"]),
                     "amount": "", "rir": "", "touched": False}
            connection.execute(
                "INSERT INTO app_private.workout_sets (exercise_performance_id, set_number, draft) VALUES (%s, %s, %s)",
                (performance["id"], number, Jsonb(draft)),
            )
    return read_session(connection, request.id)


def check_revision(session: dict, request: Mutation) -> bool:
    if session["lastMutationId"] == str(request.mutationId):
        return False
    if session["status"] != "in_progress":
        raise HTTPException(409, "This workout has already finished.")
    if session["revision"] != request.revision:
        raise HTTPException(409, "Workout changed on another device. Reload before saving.")
    return True


def save_session(connection, session_id: UUID, request: SaveSession) -> dict:
    session = read_session(connection, session_id, lock=True)
    if not check_revision(session, request):
        return session
    validate_exercises(request.exercises, session["workout"])
    write_exercises(connection, session_id, request.exercises, session["workout"])
    connection.execute(
        "UPDATE app_private.workout_sessions SET revision = revision + 1, last_mutation_id = %s WHERE id = %s",
        (request.mutationId, session_id),
    )
    return read_session(connection, session_id)


def write_exercises(connection, session_id: UUID, exercises: list[ExerciseLog], workout: dict) -> None:
    """Shared writes after validation; the caller owns the transaction and row lock."""
    prescriptions = {exercise["id"]: exercise for exercise in workout["exercises"]}
    for order, log in enumerate(exercises):
        performance = connection.execute(
            """UPDATE app_private.exercise_performances SET actual_order = %s, skipped = %s,
               technique_confirmed = %s WHERE session_id = %s AND exercise_id = %s RETURNING id""",
            (order, log.skipped, log.techniqueConfirmed, session_id, log.exerciseId),
        ).fetchone()
        prescription = prescriptions[log.exerciseId]
        for number, entry in enumerate(log.sets, 1):
            weight = amount = rir = None
            if entry.completed:
                amount = int(Decimal(entry.amount))
                if prescription["loadKind"] != "none":
                    weight = Decimal(entry.weight)
                if prescription["targetRir"] is not None:
                    rir = Decimal(entry.rir)
            connection.execute(
                """UPDATE app_private.workout_sets SET completed = %s, weight = %s,
                   reps = %s, seconds = %s, rir = %s, draft = %s
                   WHERE exercise_performance_id = %s AND set_number = %s""",
                (entry.completed, weight,
                 amount if prescription["measurement"] == "reps" else None,
                 amount if prescription["measurement"] == "seconds" else None,
                 rir, Jsonb(entry.model_dump(exclude={"completed"})), performance["id"], number),
            )


def correct_session(connection, session_id: UUID, request: SaveSession) -> dict:
    # Use the same lock as start_session: a new prescription must not be
    # snapshotted halfway through a correction to its previous performance.
    connection.execute("SELECT pg_advisory_xact_lock(8172043)")
    session = read_session(connection, session_id, lock=True)
    if session["status"] not in ("completed", "partial"):
        raise HTTPException(409, "Only finished training sessions can be corrected.")
    if session["lastMutationId"] == str(request.mutationId):
        return session  # A lost-response retry never applies the correction twice.
    if session["revision"] != request.revision:
        raise HTTPException(409, "Workout changed. Reload its saved version before correcting it.")
    latest = connection.execute(
        """SELECT id, finished_at >= clock_timestamp() - interval '7 days' AS recent
           FROM app_private.workout_sessions ORDER BY started_at DESC, id DESC LIMIT 1""",
    ).fetchone()
    if not latest or str(latest["id"]) != str(session_id) or not latest["recent"]:
        raise HTTPException(409, "Correct only the latest finished workout within seven days, before starting another.")
    validate_exercises(request.exercises, session["workout"])
    entries = [entry for log in request.exercises for entry in log.sets]
    completed = sum(entry.completed for entry in entries)
    if completed == 0:
        raise HTTPException(422, "A correction must retain at least one completed set.")
    status = "completed" if completed == len(entries) else "partial"
    logs = {log.exerciseId: log.model_dump() for log in request.exercises}
    feedback = {exercise["id"]: feedback_for_exercise(exercise, logs[exercise["id"]])
                for exercise in session["workout"]["exercises"]}
    write_exercises(connection, session_id, request.exercises, session["workout"])
    # Keep identity, start/finish dates and prescription: history keeps one entry,
    # calendar stays on its original day and rotation stays at the same position.
    connection.execute(
        """UPDATE app_private.workout_sessions SET status = %s, feedback = %s,
           revision = revision + 1, last_mutation_id = %s WHERE id = %s""",
        (status, Jsonb(feedback), request.mutationId, session_id),
    )
    return read_session(connection, session_id)


def finish_session(connection, session_id: UUID, request: Mutation) -> dict:
    session = read_session(connection, session_id, lock=True)
    if session["status"] != "in_progress":
        return session  # Repeated finish never advances rotation a second time.
    if not check_revision(session, request):
        return session
    logs = [ExerciseLog.model_validate(log) for log in session["exercises"]]
    validate_exercises(logs, session["workout"])
    sets = [entry for log in session["exercises"] for entry in log["sets"]]
    count = sum(entry["completed"] for entry in sets)
    status = "cancelled" if count == 0 else "completed" if count == len(sets) else "partial"
    logs_by_id = {log["exerciseId"]: log for log in session["exercises"]}
    feedback = {exercise["id"]: feedback_for_exercise(exercise, logs_by_id[exercise["id"]])
                for exercise in session["workout"]["exercises"]}
    connection.execute(
        """UPDATE app_private.workout_sessions SET status = %s, finished_at = clock_timestamp(),
           revision = revision + 1, last_mutation_id = %s, feedback = %s WHERE id = %s""",
        (status, request.mutationId, Jsonb(feedback), session_id),
    )
    return read_session(connection, session_id)


def history(connection) -> list[dict]:
    rows = connection.execute(
        "SELECT id FROM app_private.workout_sessions WHERE status <> 'in_progress' ORDER BY finished_at DESC, id DESC",
    ).fetchall()
    return [read_session(connection, row["id"]) for row in rows]


def today_data(connection) -> dict:
    workouts = available_workouts(connection)
    rows = connection.execute(
        """SELECT id, workout_id, started_at, finished_at, status FROM app_private.workout_sessions
           WHERE status IN ('completed', 'partial') ORDER BY finished_at DESC, id DESC""",
    ).fetchall()
    completed = [{
        "id": str(row["id"]), "workoutId": row["workout_id"],
        "date": row["started_at"].astimezone(LONDON).date().isoformat(),
        "durationMinutes": max(0, round((row["finished_at"] - row["started_at"]).total_seconds() / 60)),
        "status": row["status"],
    } for row in rows]
    ids = [workout["id"] for workout in WORKOUTS]
    next_id = ids[(ids.index(completed[0]["workoutId"]) + 1) % len(ids)] if completed else ids[0]
    active = connection.execute("SELECT id FROM app_private.workout_sessions WHERE status = 'in_progress'").fetchone()
    return {
        "today": {"athleteName": "Lewis", "today": datetime.now(timezone.utc).astimezone(LONDON).date().isoformat(),
                  "workouts": [{key: value for key, value in workout.items() if key != "exercises"} for workout in workouts],
                  "recommendedWorkoutId": next_id, "lastCompletedWorkout": completed[0] if completed else None,
                  "completedWorkouts": completed},
        "workouts": workouts, "activeSession": read_session(connection, active["id"]) if active else None,
    }
