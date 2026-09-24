# Vercel + Render Free Web Service deployment

The deployment target is:

```text
Phone on 4G -> Vercel (Next.js over HTTPS)
Browser    -> Render (FastAPI over HTTPS) -> existing Supabase PostgreSQL
```

The browser calls FastAPI directly. Vercel serves the frontend; it does not proxy
the API or connect to PostgreSQL. The laptop is not part of the production path.

**Status:** the persistent MVP is on GitHub. The switch to Render is prepared
locally and has not been committed or pushed. Hosted acceptance is still pending.

**Public API limitation:** authentication is deferred. Anyone who discovers the
API URL can potentially read workout data and invoke write endpoints. CORS limits
browser origins; it is not authentication and cannot prevent direct API calls.

## 1. Publish the reviewed code

The repository remote is `https://github.com/brighty0802/adaptive-athlete.git`,
branch `main`. Review the local Render deployment changes and explicitly approve
a commit and push before publishing those changes. Do not
commit `.env`, database credentials, virtual environments or build output.

## 2. Create the Render backend

1. Sign into Render and select **New > Web Service**. Connect the GitHub
   repository above and authorize access if prompted. Select branch `main`.
2. Enter these dashboard settings. Select the **Free** instance type; do not
   create a Render database because persistence stays in existing Supabase.

   | Setting | Value |
   | --- | --- |
   | Root Directory | `backend` |
   | Runtime / Language | `Python 3` |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `python -m app.migrate && python -m app.serve` |
   | Health Check Path | `/health` |
   | Instance Type | `Free` |

   `backend/.python-version` retains Python 3.12 (latest matching patch).
   Commands run from the service root, so do not add another `cd backend`.
   `app.serve` binds `0.0.0.0` to Render's supplied `PORT` without reload;
   the local fallback remains port 8000. Leave `PORT` and `PYTHON_VERSION`
   unset in the dashboard to use platform/file configuration.
3. Add these variables in Render's private **Environment** editor:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Copy the working Supabase Session pooler URI from local `backend/.env` privately, retaining password encoding and `sslmode=require`. Do not paste it into chat, Git or Vercel. |
   | `APP_ENV` | `production` |
   | `CORS_ORIGINS` | The exact Vercel HTTPS origin, without a trailing slash. Before that domain exists, use `https://example.invalid` temporarily, then replace it in step 4. |

   Render supplies `PORT`; do not hard-code it. The temporary CORS origin is
   deliberately unusable and prevents browser access until the real frontend
   origin is configured. It is not a generated production URL.
4. Leave **Pre-deploy Command** empty: it is unavailable on Free web services.
   The start command instead runs the existing migration check before the server.
   Its `&&` prevents startup if migration fails. This check also runs on restarts
   and wake-ups. Applied files are checksum-checked and skipped; only pending
   migrations run, inside a transaction with an advisory lock. The existing
   schema is not reset or recreated. Do not run migrations in the build command
   or on requests. Future migrations must remain safe alongside the old version
   during a deploy; do not bypass a failed migration to bring the server up.
5. Select **Deploy Web Service**. Wait for the service to become live and copy
   the actual public `https://...onrender.com` URL shown on its service page.
   Render assigns the public URL; no separate domain generation is needed.
   Confirm `<actual Render URL>/health` returns `{"status":"ok"}`.
   Also open `<actual Render URL>/api/today` to verify database access: health
   alone does not prove PostgreSQL connectivity. Do not post returned workout
   data or credentials publicly.

Dashboard configuration is sufficient for this single native Python service;
no Dockerfile or `render.yaml` is needed. The obsolete `backend/railpack.json`
has been removed. See [Render FastAPI deployment](https://render.com/docs/deploy-fastapi),
[monorepo roots](https://render.com/docs/monorepo-support),
[Python version selection](https://render.com/docs/python-version),
[health checks](https://render.com/docs/health-checks) and
[pre-deploy availability](https://render.com/docs/deploys#pre-deploy-command).

### Free service behaviour during a gym session

Render Free sleeps after 15 minutes without inbound traffic and takes about a
minute to wake. The v1.1 frontend allows up to 90 seconds per API request and
shows **Waking backend...** after four seconds. Reads retry temporary gateway
errors within that deadline. If it still cannot connect, use the displayed retry
controls; writes are not blindly replayed. Before training you can also open
Render's `/health` and wait for JSON. Keep pending entries open until **Saved**
appears. Do not clear browser drafts. Deploy the v1.1 backend before its frontend
to make the new finished-workout correction endpoint available.

Saved records stay in Supabase across sleeps/restarts. Render's local filesystem
is ephemeral. Free services have shared monthly instance-hour, bandwidth and
build limits and may be suspended when allowances are exhausted; heavy outbound
traffic to an external database can also trigger suspension. This is a personal
MVP hosting choice, not an always-on guarantee. No keep-alive workaround is
configured. See [Render Free limits](https://render.com/docs/free).

## 3. Create the Vercel frontend

1. Open your existing Vercel project, or import the same GitHub repository and select `main` as the
   production branch. Set **Root Directory** to `frontend`.
2. Use the **Next.js** preset, install command `npm ci`, build command
   `npm run build` and the preset's default output directory. Use Node.js 24.x.
   No custom `vercel.json` or FastAPI/Vercel functions are needed.
3. Add the following variable with **Production** scope before building:

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_BASE_URL` | The actual Render HTTPS origin from step 2, without `/api` or `/health`. |

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

1. Replace Render's temporary `CORS_ORIGINS` with the exact Vercel production
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
