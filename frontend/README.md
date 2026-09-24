# Adaptive Athlete frontend

The real Next.js/React workout UI now uses FastAPI and PostgreSQL for Today,
workout details, active/resumable sessions, completion feedback, History and
adherence. Mock data remains only as test fixtures. The home page loads /api/today.

For hosted gym use over 4G, follow the [Vercel + Render deployment guide](../docs/deployment.md).

## Run

```powershell
cd 'C:\Users\lewis\Documents\Adaptive Athlete\adaptive-athlete\frontend'
npm.cmd run dev -- --hostname 0.0.0.0
```

Start FastAPI and apply migrations using [backend instructions](../backend/README.md).
Open http://localhost:3000 or http://192.168.1.106:3000 from the same Wi-Fi.
If the laptop IP changes, update next.config.ts allowedDevOrigins and backend
CORS_ORIGINS. The browser uses its page hostname with backend port 8000.
NEXT_PUBLIC_API_BASE_URL can override the public API address; never put database
credentials there. Restart/rebuild after changing frontend environment variables.
Production requires this variable to contain an HTTPS backend URL; hostname/port
fallback is available only for local HTTP development. Vercel validates the
production URL before building.

## Saving and recovery

Edits enter a browser draft immediately and autosave after a short pause. Writes
are serialized. Completion, reopening, skipping, order and technique confirmation
persist. Wait for **Saved** before closing. Pending completion is visibly labelled;
Finish is disabled until every change is acknowledged.

Failed saves preserve values and offer Retry Save. Ambiguous retries reuse their
mutation ID. Stale revisions show a conflict with draft download and explicit
server-version recovery. Use one editing tab: browser draft storage is shared
between tabs. Sync before switching devices. This is not a full offline app.

Templates, previous performance, load recommendations, final status and rotation
come from the backend. History and adherence use saved records, never mock data.
The original /persistence-test remains available for v2 debugging.

## v1.1 field-test improvements

- Out-of-range reps or seconds show an advisory warning, including on completed
  sets. Valid unusual values can still be completed and saved.
- Exercise cards and the finish area explicitly list unfinished sets by name.
  Finishing partial work preserves draft inputs without counting them as results.
- First exposures explain choosing a starting load; current recommendations and
  previous results remain separately labelled.
- From the latest finished workout summary/history, choose **Edit saved workout**.
  Corrections are allowed within seven days, before starting another workout.
  Edit values, mark intended sets complete, then **Save corrections**. Dates and
  rotation stay unchanged; feedback/history are recalculated. Keep at least one
  completed set. This editor saves explicitly and keeps unsaved edits only on
  the current page; leaving prompts before discarding them. Ambiguous failures
  lock further edits until an exact retry is acknowledged or you return to history.
- API requests allow up to 90 seconds, with **Waking backend...** after four
  seconds. GET requests retry temporary 502/503/504 responses within that limit;
  writes retain explicit retry/mutation-ID handling. No keep-alive polling is added.

Deploy the updated backend before the frontend so the correction endpoint exists.
No schema changes or changes to existing real workout records are needed to ship.

## Checks

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Tests cover logging transitions/rendered screens, request helpers, draft recovery,
serialized writes, failed-save retries, revision conflicts and empty history.
No production database is needed. The backend README includes the phone checklist.
