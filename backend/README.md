# Adaptive Athlete backend - persistent gym MVP

The real workout interface now uses FastAPI and PostgreSQL. The original v2
`/persistence-test`, set endpoints and `/health` remain available.

For hosted gym use over 4G, follow the [Vercel + Render deployment guide](../docs/deployment.md).

## Run (PowerShell)

Keep the database URI in ignored `backend/.env`; never place it in frontend config.
The existing Supabase Session pooler connection remains unchanged.

```powershell
cd 'C:\Users\lewis\Documents\Adaptive Athlete\adaptive-athlete\backend'
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m app.migrate
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

In a second terminal:

```powershell
cd 'C:\Users\lewis\Documents\Adaptive Athlete\adaptive-athlete\frontend'
npm.cmd run dev -- --hostname 0.0.0.0
```

Open http://localhost:3000 or, on the same LAN, http://192.168.1.106:3000.
For this local setup, the laptop must remain running and reachable from the
phone. The deployment guide above removes that requirement for hosted use.

For a new Python environment: `py -3.12 -m venv .venv` before installing. Calling
the venv Python directly avoids PowerShell activation-policy issues. Stop servers
with Ctrl+C. Existing servers using `--reload` pick up backend code changes.

## Architecture and database

Browser -> FastAPI validates/commits -> PostgreSQL -> FastAPI -> browser.
React holds editing state. PostgreSQL holds saved progress. A browser draft keeps
pending edits recoverable after a failed request or refresh; it is not a second
training-history database. Saves are debounced and serialized. Revision numbers
reject stale writes; stable mutation UUIDs make ambiguous retries safe.

All tables live in `app_private`, with PUBLIC access revoked and RLS enabled.
The backend uses the existing table-owner connection. No browser policies or
Supabase SDK/service-role key are introduced.

| Table | Purpose |
| --- | --- |
| schema_migrations | Applied SQL filenames/checksums |
| set_performances | Preserved v2 standalone sets, unchanged |
| workout_sessions | UUID, template ID, prescription snapshot, status, start/finish times, revision, last mutation, feedback |
| exercise_performances | UUID, session FK, exercise slug, actual order, skipped flag, technique confirmation |
| workout_sets | UUID, exercise-performance FK, set number, completed flag, actual weight/reps/seconds/RIR, unfinished input draft |

Relationships: session -> many exercise performances -> many sets. Canonical
exercises and planned templates live in `app/programme.py`, a stable backend
configuration. Every started session snapshots its planned prescription, separately
from actual numeric results, so programme edits cannot rewrite past workouts.

Completed weights use numeric(6,2), RIR numeric(3,1), reps/seconds smallint; range
constraints match API validation. Draft inputs do not become zero-rep results.
A unique partial index permits only one in-progress workout. Set positions and
exercise order are unique within their parent. Changes commit atomically.

A schema defines database structure (and `app_private` is a PostgreSQL namespace).
A migration is a numbered change to that structure. `002_workout_sessions.sql`
adds tables without deleting v2 data. Never edit an applied migration: add another
numbered file. The migration runner is explicit, atomic and safe to rerun.

## API

| Method / route | Result |
| --- | --- |
| GET /health | Process health; independent of database |
| GET /api/workouts | Four backend prescriptions, previous results and next loads |
| GET /api/today | Recommendation, real adherence/history summaries and active session |
| POST /api/sessions | Start one session; client UUID makes retries idempotent |
| GET /api/sessions | Finished sessions with snapshots and actual work |
| GET /api/sessions/{id} | Retrieve/resume one session |
| PUT /api/sessions/{id} | Save the ordered exercise/set draft atomically with revision/mutation UUID |
| POST /api/sessions/{id}/finish | Finish as completed, partial or empty/cancelled |
| POST /api/set-performances | Original v2 standalone set creation |
| GET /api/set-performances/latest?exercise=back-squat | Original latest-set retrieval |

Creation returns 201; reads/updates 200. Missing resources 404, invalid input 422,
conflicting active/stale session 409, database/configuration errors a sanitized 503.
FastAPI `/docs` describes the typed request/response models.

## Rotation, previous results and progression

Session A (Lower A) -> B (Upper A) -> C (Lower B) -> D (Upper B) -> repeat.
The next recommendation follows the latest deliberately completed/partial session,
including manual selection. Opening/starting/logging alone never advances it.
Finishing twice has no extra effect. An empty cancelled session does not count.
History/adherence use the workout start date in Europe/London, including DST.

Previous performance prefers the latest fully completed, non-skipped exercise,
including one inside a partial workout. If there is no full performance, available
partial work establishes a baseline; v2 standalone sets are a final fallback.
Partial/skipped work does not automatically reduce the established prescription.

The pure replaceable engine in `app/progression.py` increases load only when all
planned sets are completed at one consistent weight, every set reaches the upper
rep target and minimum RIR, and controlled technique is explicitly confirmed.
Otherwise it maintains the established load. First-use weights are blank rather
than made-up examples; added-weight bodyweight exercises start at zero.

Configurable increments in `app/programme.py`: squat/RDL/bench +2.5 kg, shoulder
press +1 kg, lunges +1 kg per hand, pull-ups/chin-ups/dips +2.5 kg added. For unknown
machine/dumbbell steps the feedback asks for the smallest available increment and
keeps the displayed load until the athlete chooses it. Power/quality/timed exercises
never use automatic weight progression. Equipment increments are assumptions, not
claims about what your gym has; edit the backend profile if needed.

## Configuration and LAN

- Backend `DATABASE_URL`: secret PostgreSQL URI, loaded from backend/.env; existing
  shell variables take precedence. Supabase Session pooler uses port 5432 and
  `sslmode=require`. Password special characters must be percent-encoded.
- Backend `CORS_ORIGINS`: optional comma-separated exact browser origins. Defaults
  include localhost, 127.0.0.1 and 192.168.1.106 on port 3000. GET/POST/PUT allowed.
- Frontend `NEXT_PUBLIC_API_BASE_URL`: optional public API address only. Default
  uses the browser hostname with port 8000. No secrets belong in NEXT_PUBLIC values.
- If laptop IP changes, update CORS_ORIGINS and frontend allowedDevOrigins.

Authentication is intentionally absent. CORS is not access control. Keep this
single-user development service on a trusted network.

## Tests and verification

```powershell
cd 'C:\Users\lewis\Documents\Adaptive Athlete\adaptive-athlete\backend'
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m pip check

cd '..\frontend'
npm.cmd run lint
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Normal tests do not depend on Supabase. Optional PostgreSQL tests require
TEST_DATABASE_URL. The workout tests create fresh isolated schemas, verify
transactions/concurrent requests, and remove only those generated schemas. The
older standalone-set test expects a separate test database.

An explicit manual smoke test can safely exercise the configured PostgreSQL
connection using disposable schema isolation (requires schema-create permissions):

```powershell
cd 'C:\Users\lewis\Documents\Adaptive Athlete\adaptive-athlete\backend'
.\.venv\Scripts\python.exe -m scripts.verify_workouts --configured-database
```

This verifies migration repeatability, v2, save/reopen/resume through fresh app/DB
connections, duplicate/stale requests, partial/full/cancelled finish, progression,
history, adherence and persistent rotation. It never changes app_private records.

## Tonight's phone check

1. Keep both servers running on the same network as the phone. Open Today.
2. Start Session A; refresh; resume the same workout.
3. Complete Back Squat 75 kg x 6 @ 2 RIR. Wait for Saved; refresh and check it.
4. Reopen/edit a set, reorder an exercise and skip another; refresh and verify.
5. Finish partially. Today should recommend B once; History and calendar show A.
6. Restart FastAPI and refresh: history and rotation remain.
7. Stop FastAPI during an edit: confirm pending/failed-save feedback and Retry;
   restart and retry, waiting for Saved before leaving.

Until a save is acknowledged, do not clear browser storage or use another device
to replace that draft. A stale-tab conflict preserves the draft for explicit
recovery. This is simple failure recovery, not a complete offline-sync system.

## Implementation verification

Verified in this implementation session: 123 normal backend tests passed, with
6 opt-in database tests skipped. Separately, all 5 isolated workout PostgreSQL
integration tests passed against Supabase. Frontend: 26 tests, lint, TypeScript
and production build passed. pip check passed. Live /health returned ok,
/api/today returned four templates, and the frontend returned HTTP 200.
Physical-phone/browser interaction was not verified because no browser automation
surface was connected; complete the phone checklist before relying on it at the gym.

## Files changed for the workout expansion

| File (relative to repository root) | Purpose |
| --- | --- |
| backend/migrations/002_workout_sessions.sql | Add session, exercise and set tables |
| backend/app/programme.py | Canonical prescriptions and configurable increments |
| backend/app/progression.py | Pure previous-performance formatting and progression |
| backend/app/workout_models.py | Typed API models and completed-set validation |
| backend/app/workouts.py | Transactional lifecycle, history, rotation and prior lookup |
| backend/app/api/routes/workouts.py | Real workout HTTP endpoints |
| backend/app/main.py | Register routes and permit PUT through existing CORS |
| backend/requirements.txt | Windows timezone data |
| backend/scripts/verify_workouts.py | Explicit isolated PostgreSQL smoke check |
| backend/tests/test_progression.py | Training-rule regressions |
| backend/tests/test_workouts.py | Validation and API/service boundary tests |
| backend/tests/test_workouts_postgres.py | Optional real DB lifecycle/concurrency/rollback tests |
| backend/README.md | Runbook, schema and assumptions |
| frontend/src/app/page.tsx | Load real workout flow |
| frontend/src/app/layout.tsx | Remove preview metadata |
| frontend/src/app/globals.css | Minimal save/history/reorder styles |
| frontend/src/types/workout.ts | Persisted session/history contracts |
| frontend/src/lib/workout-api.ts | LAN-aware API helpers and UUID generation |
| frontend/src/lib/session-save-queue.ts | Debounce, serialized writes, draft/retry recovery |
| frontend/src/lib/workout-session.ts | Preserve edits, add order/technique actions |
| frontend/src/components/workout-flow.tsx | Start/save/resume/finish integration |
| frontend/src/components/active-workout.tsx | Reorder, technique, pending-save controls |
| frontend/src/components/set-input-row.tsx | Distinguish pending and acknowledged completion |
| frontend/src/components/exercise-prescription.tsx | Honest first-use load prompt |
| frontend/src/components/workout-detail.tsx | Real prescription/previous-result wording |
| frontend/src/components/workout-complete.tsx | Persisted summary and backend feedback |
| frontend/src/components/workout-history.tsx | Saved session list and detail selection |
| frontend/src/components/today-screen.tsx | Real recommendation/history and empty state |
| frontend/src/components/adherence-preview.tsx | Persisted calendar wording |
| frontend/src/components/bottom-navigation.tsx | Enable History |
| frontend/src/components/backend-status.tsx | Honest outage wording |
| frontend/tests/persistence.test.mjs | Save queue and API request regression tests |
| frontend/tests/workout-session.test.mjs | Updated and expanded UI/state regressions |
| frontend/README.md | Frontend run/recovery instructions |

Earlier uncommitted v2 files remain in the working tree; the expansion preserves
the v2 migration, connection, standalone-set routes and persistence test page.
