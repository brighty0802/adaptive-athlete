import os
from urllib.parse import urlsplit

import psycopg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes.health import router as health_router
from app.api.routes.set_performances import router as set_performances_router
from app.api.routes.workouts import router as workouts_router
from app.database import DatabaseNotConfigured

# Development defaults: exact frontend origins, including this laptop's Wi-Fi IP.
DEFAULT_CORS_ORIGINS = (
    "http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.106:3000"
)


def create_app() -> FastAPI:
    app = FastAPI(title="Adaptive Athlete API", version="0.2.0")
    origins = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
        if origin.strip()
    ]
    production = os.getenv("APP_ENV") == "production"
    if production and (not os.getenv("CORS_ORIGINS", "").strip() or not origins or not os.getenv("DATABASE_URL", "").strip()):
        raise ValueError("Production requires DATABASE_URL and an explicit CORS_ORIGINS allowlist.")
    for origin in origins:
        parsed = urlsplit(origin)
        if ("*" in origin or not parsed.hostname or parsed.username or parsed.password
                or parsed.path or parsed.query or parsed.fragment
                or parsed.scheme not in ("http", "https")
                or (production and parsed.scheme != "https")):
            raise ValueError("CORS_ORIGINS must contain exact origins without paths; production requires HTTPS.")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT"],
        allow_headers=["Content-Type"],
    )
    app.include_router(health_router)
    app.include_router(set_performances_router)
    app.include_router(workouts_router)

    @app.exception_handler(DatabaseNotConfigured)
    async def database_not_configured(_request, _error):
        return JSONResponse(status_code=503, content={"detail": "Database is not configured."})

    @app.exception_handler(psycopg.Error)
    async def database_unavailable(_request, _error):
        return JSONResponse(status_code=503, content={"detail": "Database unavailable. Check backend configuration and migrations."})

    return app


app = create_app()
