# Adaptive Athlete frontend

The real Next.js/React workout UI now uses FastAPI and PostgreSQL for Today,
workout details, active/resumable sessions, completion feedback, History and
adherence. Mock data remains only as test fixtures. The home page loads /api/today.

For hosted gym use over 4G, follow the [Vercel + Railway deployment guide](../docs/deployment.md).

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
