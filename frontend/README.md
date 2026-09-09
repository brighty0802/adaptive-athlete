# Adaptive Athlete frontend

The core frontend workout flow: Today → Workout Detail → Active Workout → Workout Complete. Uses Next.js App Router, React, TypeScript and plain CSS, with typed mock data and in-memory React state.

## Run locally

Requires Node.js 20.9 or newer and npm. From this directory:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. In Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

## Test over Wi-Fi

From `frontend/`, start the development server on all local interfaces:

```sh
npm run dev -- --hostname 0.0.0.0
```

On the laptop, open either http://localhost:3000 or http://192.168.1.106:3000.
On a phone connected to the same Wi-Fi, open http://192.168.1.106:3000.

`next.config.ts` explicitly permits `192.168.1.106` in `allowedDevOrigins`.
Next.js 16.3.4 otherwise rejects dev JavaScript and other internal requests
carrying that Origin with HTTP 403, even though the HTML page returns HTTP 200.
Binding to `0.0.0.0` controls which network interfaces listen; it does not allow
every browser origin. Next.js continues to allow localhost automatically.
This setting applies only in development and uses no wildcard or global CORS override.

If the laptop's Wi-Fi address changes, replace the exact IP in `allowedDevOrigins`
and restart the dev server. Hard-refresh each browser after restarting.
Exercise the flow on both devices: open a session, start it, complete a set,
return to Today and resume, then finish partially. On the laptop, check DevTools
Network for successful `/_next/` JavaScript requests and Console for hydration errors.
Each tab has its own in-memory workout; entries do not synchronise between devices.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`dev` provides live updates while editing. `build` creates the production app; `start` serves that build.

## Where to work

- `src/app/layout.tsx`: shared HTML shell, metadata and global CSS import.
- `src/app/page.tsx`: the `/` route. Creates the demo data and passes it to WorkoutFlow. Rendering per request keeps the date current when loading or refreshing, rather than fixing it at build time.
- `src/components/workout-flow.tsx`: owns navigation, the active session and Today activity in React state. Provides the shared header and navigation. Moving between screens does not unmount this state owner.
- `src/components/today-screen.tsx`: displays Today and opens the chosen workout's details.
- `src/components/workout-card.tsx`: reusable button opening a workout's details.
- `src/components/workout-detail.tsx`: shows the full prescription and starts or resumes a workout.
- `src/components/active-workout.tsx`: independent exercise panels, skips, quick completion and finishing.
- `src/components/set-input-row.tsx`: labelled, controlled inputs and validation for a working set.
- `src/components/exercise-prescription.tsx`: shared target and load presentation.
- `src/components/workout-complete.tsx`: actual completed set records, summary counts and explicitly mocked feedback.
- `src/components/adherence-preview.tsx`: Monday-first calendar combining sample activity with sessions completed in this tab. Day labels include every session and distinguish partial completion.
- `src/components/bottom-navigation.tsx`: returns to Today without losing local state; other destinations remain disabled.
- `src/components/icon.tsx`: small inline SVG icons without an icon package.
- `src/data/mock-workouts.ts`: programme prescriptions for all four sessions; illustrative proposed loads, previous performances and feedback. This is the source for workout summaries too.
- `src/data/mock-today.ts`: relative sample activity. The initial recommendation is explicitly mocked as Session A after Session D.
- `src/types/workout.ts`: display-data contracts, separate from the future persistence schema.
- `src/lib/workout-session.ts`: immutable logging transitions, validation, counts and completion status. Contains no training progression decisions.
- `src/lib/dates.ts`: calendar-date parsing and formatting.
- `src/app/globals.css`: responsive layout and visual styles.
- `tests/workout-session.test.mjs`: Node test-runner checks for actual logging behaviour and server rendering. Uses the existing TypeScript compiler without additional dependencies.

App Router components are Server Components by default. `WorkoutFlow` uses `"use client"` because navigation and logging need browser state. Its child screens receive values and callbacks as props. The server page passes plain serializable fixtures into that client boundary. The page's server rendering is a Next.js rendering feature; there is no application backend or API integration here.

The four screens currently share the `/` route. Navigation uses React state, with focus and scroll reset on screen changes. These are not separate bookmarkable URLs; browser Back does not step through them. Use the in-app navigation for this prototype.

Dates use Europe/London for this initial personal prototype. Sample history is relative to today, crosses month boundaries correctly, and never records future activity. Refresh after midnight to update the displayed date.

## Logging behaviour

- Cards and View Workout open Workout Detail. Start Workout creates one in-memory session. You can inspect other workouts while it is open, but must finish it before starting another. Today shows a Resume Workout action.
- Exercises can be opened in any order. Complete Set validates the entry; Edit Set reopens it without discarding its values. Empty fields are not silently converted to zero. Zero reps/RIR are allowed to record an attempted set accurately.
- Weight uses total kg, kg per hand or added kg as labelled. Bodyweight pull-ups/dips use 0 added kg. Quality work has no required load or RIR input. Copenhagen holds record seconds; per-side entries describe the same amount on each side, not their sum. Independent left/right results are not modelled in this slice.
- Completed as Prescribed confirms the displayed quick target: the bottom of the programmed range, proposed load and RIR 2 where applicable. It fills untouched sets only. Draft entries and already-completed sets are preserved, so the shortcut may leave an exercise partially logged. These defaults are mock UI choices, not a progression rule.
- Skip Exercise / Skip Remaining Sets retains all completed sets and drafts. Resume Exercise restores editing. An exercise is completed when all its prescribed sets are marked complete, even if actual reps differ from the target.
- Finish Workout asks you to confirm the completed-set count. All sets completed produces a full session; some produces a partial session; none produces a cancelled session. Uncompleted drafts are excluded from the summary.
- Full and partial workouts update the in-memory last session, calendar and A → B → C → D rotation. Cancellation and an unfinished session do not advance it. Repeated completion does not duplicate set counts.
- The complete screen shows recorded work and sample progression feedback for fully completed exercises. Feedback is explicitly illustrative, is not calculated from inputs, and never changes proposed loads.
- History, Progress and More remain placeholders. Reloading or closing the tab clears new entries. No localStorage, sessionStorage, cookies, IndexedDB or remote persistence is used.

No database, authentication, progression engine, API calls or PWA installation features are included. Framework runtime dependencies are Next.js, React and React DOM; development dependencies provide TypeScript and ESLint checks. Generated output, local environment files and installed packages are ignored by Git.

ESLint is pinned to 9.39.5 because the React/import/accessibility plugins bundled by `eslint-config-next` 16.3.4 do not support ESLint 10 yet. npm reports the ESLint 9 deprecation; upgrade the lint stack together when those plugins support ESLint 10. Do not update ESLint alone.
