# Vercel + Railway deployment

The deployment target is:

```text
Phone on 4G -> Vercel (Next.js over HTTPS)
Browser    -> Railway (FastAPI over HTTPS) -> existing Supabase PostgreSQL
```

The browser calls FastAPI directly. Vercel serves the frontend; it does not proxy
the API or connect to PostgreSQL. The laptop is not part of the production path.

**Status:** prepared and tested locally; cloud projects and public URLs still
need to be created. Nothing has been committed or pushed for this deployment.

**Public API limitation:** authentication is deferred. Anyone who discovers the
API URL can potentially read workout data and invoke write endpoints. CORS limits
browser origins; it is not authentication and cannot prevent direct API calls.

## 1. Publish the reviewed code

The repository remote is `https://github.com/brighty0802/adaptive-athlete.git`,
branch `main`. The persistent MVP and deployment changes are currently local.
Review them and explicitly approve a commit and push before proceeding. Do not
commit `.env`, database credentials, virtual environments or build output.

## 2. Create the Railway backend

1. Sign into Railway and create a service from the GitHub repository above.
   Connect GitHub/authorize repository access if prompted. Select branch `main`.
2. Set the service **Root Directory** to `/backend` and use **Railpack**.
   `backend/.python-version` selects Python 3.12; `requirements.txt` supplies
   runtime dependencies. `backend/railpack.json` sets the start command to
   `python -m app.serve`, which binds `0.0.0.0` to Railway's supplied `PORT`
   without development reload.
3. Add these variables in Railway's private variables editor:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Copy the working Supabase Session pooler URI from local `backend/.env` privately, retaining password encoding and `sslmode=require`. Do not paste it into chat, Git or Vercel. |
   | `APP_ENV` | `production` |
   | `CORS_ORIGINS` | The exact Vercel HTTPS origin, without a trailing slash. Before that domain exists, use `https://example.invalid` temporarily, then replace it in step 4. |

   Railway supplies `PORT`; do not hard-code it. The temporary CORS origin is
   deliberately unusable and prevents browser access until the real frontend
   origin is configured. It is not a generated production URL.
4. In service deployment settings, set **Pre-deploy Command** to
   `python -m app.migrate`. Set **Healthcheck Path** to `/health` and the
   healthcheck timeout to 60 seconds. Use one replica and restart on failure.
   Keep the service running during gym use.
5. Deploy. The migration command checks the existing migration tracking table
   and applies only pending migrations in a transaction. The current database
   already has the migrations; it is not reset or recreated. If migration fails,
   fix the cause before deploying rather than bypassing the command.
6. Generate a public domain in Railway's networking settings. Copy its actual
   HTTPS URL. Confirm `<actual Railway URL>/health` returns `{"status":"ok"}`.
   Also open `<actual Railway URL>/api/today` to verify database access: health
   alone does not prove PostgreSQL connectivity. Do not post returned workout
   data or credentials publicly.

The native Railpack configuration is intentional: new Railway services no
longer support the deprecated `railway.toml`/`railway.json` configuration flow.
Pre-deploy and healthcheck settings above are configured in the dashboard.
See [Railway configuration guidance](https://docs.railway.com/config-as-code),
[Railpack Python detection](https://railpack.com/languages/python),
[Railpack start-command guidance](https://railpack.com/config/procfile) and
[Railway pre-deploy commands](https://docs.railway.com/deployments/pre-deploy-command).

## 3. Create the Vercel frontend

1. Sign into Vercel, import the same GitHub repository and select `main` as the
   production branch. Set **Root Directory** to `frontend`.
2. Use the **Next.js** preset, install command `npm ci`, build command
   `npm run build` and the preset's default output directory. Use Node.js 24.x.
   No custom `vercel.json` or FastAPI/Vercel functions are needed.
3. Add the following variable with **Production** scope before building:

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_BASE_URL` | The actual Railway HTTPS origin from step 2, without `/api` or `/health`. |

   This address is public by design. Never add `DATABASE_URL`, the database
   password or Supabase service credentials to the frontend environment.
4. Deploy, then copy the actual stable production URL assigned by Vercel.
   The build rejects missing or non-HTTPS backend configuration on Vercel.
   Changing `NEXT_PUBLIC_API_BASE_URL` requires a new frontend build/deployment.

Vercel supports the Next.js framework directly and separate monorepo project
roots; see [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs),
[monorepo setup](https://vercel.com/docs/monorepos) and
[environment variables](https://vercel.com/docs/environment-variables).

## 4. Connect the production browser origin

1. Replace Railway's temporary `CORS_ORIGINS` with the exact Vercel production
   origin, for example the actual `https://...vercel.app` origin shown in your
   project. No trailing slash or path. Apply the variables/redeploy the backend.
2. Open the Vercel production URL and confirm Today loads a real workout.
3. If using a custom frontend domain, add its exact HTTPS origin too, separated
   by a comma. Do not allow `*` or all Vercel preview domains. A preview deployment
   needs its own public API variable and an explicitly allowed origin if it is
   intended to use this database; preview writes would affect real data.

Production startup requires a database variable and an explicit HTTPS CORS
allowlist. Development retains its separate localhost/LAN defaults.

## 5. Phone acceptance test

Use the actual Vercel production URL with phone Wi-Fi **off**:

- Load Today and open the recommended workout.
- Start or resume the workout, enter a set and wait for **Saved**.
- Refresh; confirm the same workout and set remain.
- Reopen/edit/complete a set, change exercise order and skip an exercise; wait
  for Saved and refresh to check those changes.
- Finish the workout (partial completion is supported). Confirm the next
  recommendation, history and adherence calendar update.
- Turn the laptop completely off and repeat loading and saving over 4G.

These operations create real workout records. Keep test data intentional.
Database-saved sessions can be resumed from the hosted frontend, but unsaved
local browser drafts do not transfer between origins/devices. Save before
switching from LAN to Vercel. If the backend is temporarily unavailable, existing
draft/retry handling remains in place; do not close with unsaved edits. This is
not a full offline-first app.

## Local development remains available

Keep the existing ignored backend `.env`. Leave `APP_ENV` unset locally, and
leave `NEXT_PUBLIC_API_BASE_URL` unset to use the page hostname on port 8000.

```powershell
cd 'C:\Users\lewis\Documents\Adaptive Athlete\adaptive-athlete\backend'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

In another terminal:

```powershell
cd 'C:\Users\lewis\Documents\Adaptive Athlete\adaptive-athlete\frontend'
npm.cmd run dev -- --hostname 0.0.0.0
```

Local HTTP and LAN behaviour is unchanged. If the laptop IP changes, update
`allowedDevOrigins` in `next.config.ts` and the backend's local `CORS_ORIGINS`.
Production does not depend on `allowedDevOrigins`. A local `npm run build` can
run without hosted configuration; using `npm start` requires a public HTTPS API
URL supplied at build time because it runs in production mode.

## Verification commands

```powershell
# From backend
.\.venv\Scripts\python.exe -m pytest
# From frontend
npm.cmd run lint
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run build
```

Optional PostgreSQL integration tests remain opt-in; see the backend README.
Cloud build, public reachability, real-domain CORS and 4G acceptance must be
verified after the account steps above. Local tests cannot establish those.
