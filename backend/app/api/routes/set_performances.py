from datetime import datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from app.database import connect_database

ExerciseSlug = Annotated[str, Field(min_length=1, max_length=80, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")]


class SetPerformanceCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    exercise: ExerciseSlug
    weight: Decimal = Field(ge=0, le=2000, max_digits=6, decimal_places=2)
    reps: int = Field(ge=0, le=1000, strict=True)
    rir: Decimal = Field(ge=0, le=10, max_digits=3, decimal_places=1)


class SetPerformance(SetPerformanceCreate):
    id: UUID
    created_at: datetime


router = APIRouter(prefix="/api/set-performances", tags=["set performances"])


@router.post("", response_model=SetPerformance, status_code=201)
def create_set(performance: SetPerformanceCreate) -> SetPerformance:
    # A synchronous route runs in FastAPI's thread pool. Keep blocking SQL off
    # the event loop. The context commits before returning, or rolls back on error.
    with connect_database() as connection:
        row = connection.execute(
            """INSERT INTO app_private.set_performances (exercise, weight, reps, rir)
               VALUES (%s, %s, %s, %s)
               RETURNING id, exercise, weight, reps, rir, created_at""",
            (performance.exercise, performance.weight, performance.reps, performance.rir),
        ).fetchone()
        result = SetPerformance.model_validate(row)
    return result


@router.get("/latest", response_model=SetPerformance)
def latest_set(exercise: Annotated[ExerciseSlug, Query()]) -> SetPerformance:
    with connect_database() as connection:
        row = connection.execute(
            """SELECT id, exercise, weight, reps, rir, created_at
               FROM app_private.set_performances
               WHERE exercise = %s
               ORDER BY created_at DESC, id DESC LIMIT 1""",
            (exercise,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="No saved set for this exercise.")
    return SetPerformance.model_validate(row)
