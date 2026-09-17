"""Hosted entry point: reads the platform's PORT without shell interpolation."""
import os

import uvicorn


def configured_port() -> int:
    try:
        port = int(os.getenv("PORT", "8000"))
        if not 1 <= port <= 65535:
            raise ValueError
    except ValueError:
        raise ValueError("PORT must be an integer between 1 and 65535.") from None
    return port


def main() -> None:
    uvicorn.run("app.main:app", host="0.0.0.0", port=configured_port(), reload=False)


if __name__ == "__main__":
    main()
