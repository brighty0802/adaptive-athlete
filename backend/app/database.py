"""Small PostgreSQL connection boundary; no global connection or ORM."""

import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)


class DatabaseNotConfigured(RuntimeError):
    pass


def connect_database() -> psycopg.Connection:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise DatabaseNotConfigured("Set DATABASE_URL in backend/.env")
    return psycopg.connect(
        url,
        row_factory=dict_row,
        connect_timeout=5,
        options="-c statement_timeout=5000",
        prepare_threshold=None,
    )
