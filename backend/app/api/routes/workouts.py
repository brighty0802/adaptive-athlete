from uuid import UUID

from fastapi import APIRouter

from app.database import connect_database
from app import workouts
from app.workout_models import Mutation, PersistedSession, SaveSession, StartSession, TodayResponse, WorkoutDefinition

router = APIRouter(prefix="/api", tags=["workouts"])


@router.get("/today", response_model=TodayResponse)
def get_today():
    with connect_database() as connection:
        connection.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        return workouts.today_data(connection)


@router.get("/workouts", response_model=list[WorkoutDefinition])
def get_workouts():
    with connect_database() as connection:
        connection.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        return workouts.available_workouts(connection)


@router.post("/sessions", response_model=PersistedSession, status_code=201)
def start_session(request: StartSession):
    with connect_database() as connection:
        return workouts.start_session(connection, request)


@router.get("/sessions", response_model=list[PersistedSession])
def get_history():
    with connect_database() as connection:
        connection.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        return workouts.history(connection)


@router.get("/sessions/{session_id}", response_model=PersistedSession)
def get_session(session_id: UUID):
    with connect_database() as connection:
        connection.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        return workouts.read_session(connection, session_id)


@router.put("/sessions/{session_id}", response_model=PersistedSession)
def save_session(session_id: UUID, request: SaveSession):
    with connect_database() as connection:
        return workouts.save_session(connection, session_id, request)


@router.post("/sessions/{session_id}/finish", response_model=PersistedSession)
def finish_session(session_id: UUID, request: Mutation):
    with connect_database() as connection:
        return workouts.finish_session(connection, session_id, request)
