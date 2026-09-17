"""Small wire models matching the existing workout UI; no ORM."""
from decimal import Decimal, InvalidOperation
from typing import Literal
from uuid import UUID

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field


class WireModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SetEntry(WireModel):
    weight: str = Field(max_length=32)
    amount: str = Field(max_length=32)
    rir: str = Field(max_length=32)
    touched: bool
    completed: bool


class ExerciseLog(WireModel):
    exerciseId: str = Field(min_length=1, max_length=80)
    skipped: bool
    techniqueConfirmed: bool = False
    sets: list[SetEntry] = Field(min_length=1, max_length=20)


class StartSession(WireModel):
    id: UUID
    workoutId: str = Field(min_length=1, max_length=80)


class Mutation(WireModel):
    revision: int = Field(ge=0, strict=True)
    mutationId: UUID


class SaveSession(Mutation):
    exercises: list[ExerciseLog] = Field(min_length=1, max_length=30)


class Prescription(BaseModel):
    # Progression profile metadata can evolve independently of the UI contract.
    model_config = ConfigDict(extra="allow")
    id: str
    name: str
    sets: int
    measurement: Literal["reps", "seconds"]
    range: tuple[int, int]
    quickTarget: int
    targetRir: tuple[float, float] | None
    quickRir: float | None
    proposedLoadKg: float | None
    loadKind: Literal["total", "per-hand", "added", "none"]
    restSeconds: int
    previous: str
    mockFeedback: str = ""
    perSide: bool = False
    notes: str | None = None


class WorkoutSummary(BaseModel):
    id: str
    name: str
    focus: str
    estimatedDurationMinutes: int
    exerciseCount: int


class WorkoutDefinition(WorkoutSummary):
    exercises: list[Prescription]


class CompletedWorkout(WireModel):
    id: UUID
    workoutId: str
    date: str
    durationMinutes: int
    status: Literal["completed", "partial"]


class TodayData(WireModel):
    athleteName: str
    today: str
    workouts: list[WorkoutSummary]
    recommendedWorkoutId: str
    lastCompletedWorkout: CompletedWorkout | None
    completedWorkouts: list[CompletedWorkout]


class PersistedSession(WireModel):
    id: UUID
    workoutId: str
    startedAt: int
    finishedAt: int | None
    status: Literal["in_progress", "completed", "partial", "cancelled"]
    revision: int
    lastMutationId: UUID | None
    workout: WorkoutDefinition
    exercises: list[ExerciseLog]
    feedback: dict[str, str]


class TodayResponse(WireModel):
    today: TodayData
    workouts: list[WorkoutDefinition]
    activeSession: PersistedSession | None


def numeric(value: str, maximum: int, places: int, label: str) -> Decimal:
    try:
        result = Decimal(value)
        if not result.is_finite() or result < 0 or result > maximum:
            raise ValueError
        if result != result.quantize(Decimal(1).scaleb(-places)):
            raise ValueError
    except (InvalidOperation, ValueError):
        raise HTTPException(422, f"Invalid completed set {label}.") from None
    return result


def validate_exercises(exercises: list[ExerciseLog], workout: dict) -> None:
    prescriptions = {exercise["id"]: exercise for exercise in workout["exercises"]}
    ids = [exercise.exerciseId for exercise in exercises]
    if len(ids) != len(set(ids)) or set(ids) != set(prescriptions):
        raise HTTPException(422, "Session must contain each prescribed exercise exactly once.")
    for log in exercises:
        prescription = prescriptions[log.exerciseId]
        if len(log.sets) != prescription["sets"]:
            raise HTTPException(422, "Set count must match the session prescription.")
        for entry in log.sets:
            if not entry.completed:
                continue
            if prescription["loadKind"] != "none":
                numeric(entry.weight, 2000, 2, "weight")
            numeric(entry.amount, 3600 if prescription["measurement"] == "seconds" else 1000, 0, "reps/seconds")
            if prescription["targetRir"] is not None:
                numeric(entry.rir, 10, 1, "RIR")
