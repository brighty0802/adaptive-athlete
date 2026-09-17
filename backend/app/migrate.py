"""Apply numbered SQL files once, atomically. Run: python -m app.migrate."""

import hashlib
from pathlib import Path

import psycopg

from app.database import DatabaseNotConfigured, connect_database

MIGRATIONS = Path(__file__).resolve().parents[1] / "migrations"


def apply_migrations(connection: psycopg.Connection) -> None:
    with connection.transaction():
        # Serialise simultaneous migration commands, not normal API requests.
        connection.execute("SELECT pg_advisory_xact_lock(8172042)")
        connection.execute("CREATE SCHEMA IF NOT EXISTS app_private")
        connection.execute("REVOKE ALL ON SCHEMA app_private FROM PUBLIC")
        connection.execute("""CREATE TABLE IF NOT EXISTS app_private.schema_migrations (
            name text PRIMARY KEY,
            checksum text NOT NULL,
            applied_at timestamptz NOT NULL DEFAULT now()
        )""")
        for path in sorted(MIGRATIONS.glob("*.sql")):
            sql = path.read_text(encoding="utf-8")
            checksum = hashlib.sha256(sql.encode()).hexdigest()
            previous = connection.execute(
                "SELECT checksum FROM app_private.schema_migrations WHERE name = %s",
                (path.name,),
            ).fetchone()
            if previous:
                if previous["checksum"] != checksum:
                    raise RuntimeError(f"Applied migration changed: {path.name}. Add a new migration instead.")
                continue
            connection.execute(sql)
            connection.execute(
                "INSERT INTO app_private.schema_migrations (name, checksum) VALUES (%s, %s)",
                (path.name, checksum),
            )


if __name__ == "__main__":
    try:
        with connect_database() as connection:
            apply_migrations(connection)
    except (DatabaseNotConfigured, psycopg.Error):
        # Connection exceptions can contain infrastructure details; don't print the URI.
        raise SystemExit("Migration failed. Check backend/.env, database connectivity and owner permissions.") from None
    print("Database migrations are up to date.")
