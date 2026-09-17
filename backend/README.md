# Adaptive Athlete backend — v1

Small FastAPI foundation. `GET /health` returns HTTP 200 and `{"status":"ok"}`.
This confirms the API process responds; it does not check a database or save workouts.

## Setup (Windows PowerShell)

Requires Python 3.12 or newer (verified with 3.12.10). In a terminal:

```powershell
cd 'C:\Users\lewis\Documents\Adaptive Athlete\adaptive-athlete\backend'
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
```

The virtual environment keeps these dependencies separate from global Python.
Calling its Python directly avoids PowerShell activation/execution-policy issues.
Setup is needed once; rerun the install when requirements change.

## Run

From `backend/`, for laptop-only development:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

For laptop **and phone** on the same Wi-Fi:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

`app.main:app` means the `app` object inside `app/main.py`. Uvicorn runs the HTTP
server; `--reload` restarts it after Python changes. Stop with Ctrl+C.
Use `http://localhost:8000/health` on the laptop or
`http://192.168.1.106:8000/health` on the phone. `0.0.0.0` is a listening address,
not a browser URL. Interactive API documentation is at `/docs`.

In a second terminal:

```powershell
cd 'C:\Users\lewis\Documents\Adaptive Athlete\adaptive-athlete\frontend'
npm.cmd run dev -- --hostname 0.0.0.0
```

Open `http://localhost:3000` on the laptop or `http://192.168.1.106:3000` on either
device. Near the bottom of the page, the connection indicator should become
**Backend connected**. The browser calls FastAPI directly on port 8000; the Next.js
server does not proxy the request. See DevTools Network for `/health` and its JSON.
Stop FastAPI, press **Check again**, and confirm the unavailable message appears
within five seconds while mock workouts still work. Restart FastAPI and retry.

If the phone cannot load `/health` directly, check both devices are on the same
Wi-Fi and that Windows Firewall permits Python on your private network. Do not
disable the firewall or expose these development servers to the public internet.

## Development CORS configuration

An origin includes scheme, host **and port**. `app/main.py` defaults to these exact
frontend origins:

- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://192.168.1.106:3000`

Only GET is allowed by the CORS policy; cross-origin credentials are disabled.
Unlisted origins do not receive permission to read responses in a browser.
CORS is a browser rule, not authentication or a firewall.

To replace the allowlist, set this in the backend terminal **before** starting
Uvicorn (no `.env` loader or configuration package is needed):

```powershell
$env:CORS_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.200:3000'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Use actual origins, with no path or trailing slash. Restart after changes. The
example `.200` address is a placeholder for a changed laptop IP. Also update
`frontend/next.config.ts`'s `allowedDevOrigins` if the laptop IP changes; that
separate Next.js setting permits its development JavaScript requests.

The frontend defaults to the page's scheme and hostname with port 8000, so a phone
does not accidentally call its own localhost. Optionally set
`NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local` (see its `.env.example`). This
public value is embedded by Next.js: restart development/rebuild production after
changing it. Never put secrets in a `NEXT_PUBLIC_` variable. The local HTTP defaults
are not deployment configuration; deployment will need explicit HTTPS URLs and
an appropriate origin allowlist.

## Checks

From `backend/`:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m pip check
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://192.168.1.106:8000/health
```

Tests use FastAPI's `TestClient`: they import/start the application, verify the
health response, permitted and denied CORS requests, and an overridden allowlist.
No running server is required for pytest; the last two commands need Uvicorn.

The tested Starlette 1.6.0/AnyIO 4.15.1 stack currently emits two upstream
deprecation warnings about TestClient's HTTPX support and a BlockingPortal alias.
Tests pass; these warnings are not hidden or application errors.

From `frontend/`: `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run typecheck`, and
`npm.cmd run build` verify the existing app and the health-request helper.

## Files and dependencies

- `app/main.py`: app creation, small environment-based CORS setup and router registration.
- `app/api/routes/health.py`: typed Pydantic response and the health route.
- `app/**/__init__.py`: mark the directories as Python packages.
- `tests/test_health.py`: health and CORS tests.
- `requirements.txt`: FastAPI (routing/OpenAPI), Pydantic (typed response validation),
  Uvicorn (HTTP server). No optional framework extras are needed.
- `requirements-dev.txt`: adds pytest (test runner) and HTTPX (TestClient's HTTP
  transport). Their own dependencies are installed automatically by pip.
- `.gitignore`: excludes the virtual environment, caches, logs and local secrets.

New route modules can later be registered beside the health router. No speculative
service/repository layers, database, auth, workout API, progression engine, analytics,
Docker or deployment have been added. React still owns all mock workout state.

## Next iteration

Persist **one Back Squat set** (weight, reps and RIR): add a validated FastAPI POST,
store it in PostgreSQL/Supabase, retrieve it through a GET, and display the saved
values in the frontend after refresh. Establish that complete path before expanding
to full sessions or progression rules.
